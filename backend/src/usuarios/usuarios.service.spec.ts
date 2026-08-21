import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConflictException, HttpException, NotFoundException } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import * as bcrypt from 'bcryptjs';
import { UsuariosService } from './usuarios.service';
import { Usuario } from './entities/usuario.entity';
import { Rol } from './entities/rol.entity';
import { Despacho } from '../despachos/entities/despacho.entity';
import { Mensualidad } from '../root/entities/mensualidad.entity';
import { CreateUsuarioDto } from './dto/create-usuario.dto';

const repoMockFactory = () => ({
  find: jest.fn(),
  findOne: jest.fn(),
  create: jest.fn((data) => data),
  save: jest.fn((data) => Promise.resolve({ id: 1, ...data })),
  update: jest.fn(),
  count: jest.fn(),
});

describe('UsuariosService', () => {
  let service: UsuariosService;
  let usuarioRepo: ReturnType<typeof repoMockFactory>;
  let rolRepo: ReturnType<typeof repoMockFactory>;
  let despachoRepo: ReturnType<typeof repoMockFactory>;
  let mensualidadRepo: ReturnType<typeof repoMockFactory>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsuariosService,
        { provide: getRepositoryToken(Usuario), useFactory: repoMockFactory },
        { provide: getRepositoryToken(Rol), useFactory: repoMockFactory },
        { provide: getRepositoryToken(Despacho), useFactory: repoMockFactory },
        { provide: getRepositoryToken(Mensualidad), useFactory: repoMockFactory },
      ],
    }).compile();

    service = module.get(UsuariosService);
    usuarioRepo = module.get(getRepositoryToken(Usuario));
    rolRepo = module.get(getRepositoryToken(Rol));
    despachoRepo = module.get(getRepositoryToken(Despacho));
    mensualidadRepo = module.get(getRepositoryToken(Mensualidad));
  });

  describe('create', () => {
    it('rejects assigning the root role', async () => {
      rolRepo.findOne.mockResolvedValue({ id: 99, nombre: 'root' });

      await expect(
        service.create({ email: 'a@a.com', password: 'Str0ng!Passw0rd', rolId: 99 } as any, 1),
      ).rejects.toThrow(ConflictException);
      expect(usuarioRepo.findOne).not.toHaveBeenCalled();
    });

    it('rejects a duplicate email', async () => {
      rolRepo.findOne.mockResolvedValue({ id: 2, nombre: 'abogado' });
      usuarioRepo.findOne.mockResolvedValue({ id: 5 });

      await expect(
        service.create({ email: 'dup@a.com', password: 'Str0ng!Passw0rd', rolId: 2 } as any, 1),
      ).rejects.toThrow(ConflictException);
    });

    it('throws 402 when the plan user limit is reached without confirmExtra', async () => {
      rolRepo.findOne.mockResolvedValue({ id: 2, nombre: 'abogado' });
      usuarioRepo.findOne.mockResolvedValue(null);
      despachoRepo.findOne.mockResolvedValue({
        id: 1,
        plan: { numeroUsuarios: 1, precioUsuarioExtra: 100 },
      });
      usuarioRepo.count.mockResolvedValue(1);

      await expect(
        service.create({ email: 'nuevo@a.com', password: 'Str0ng!Passw0rd', rolId: 2 } as any, 1),
      ).rejects.toThrow(HttpException);
    });

    it('creates the user with debeCambiarPassword=true and strips sensitive fields from the response', async () => {
      rolRepo.findOne.mockResolvedValue({ id: 2, nombre: 'abogado' });
      usuarioRepo.findOne.mockResolvedValue(null);
      despachoRepo.findOne.mockResolvedValue({ id: 1, plan: null });

      const result = await service.create(
        { nombre: 'Ana', apellido: 'Ruiz', email: 'ANA@a.com', password: 'Str0ng!Passw0rd', rolId: 2 } as any,
        1,
      );

      expect(usuarioRepo.save).toHaveBeenCalled();
      const createdArg = usuarioRepo.create.mock.calls[0][0];
      expect(createdArg.debeCambiarPassword).toBe(true);
      expect(createdArg.email).toBe('ana@a.com');
      expect(await bcrypt.compare('Str0ng!Passw0rd', createdArg.password)).toBe(true);
      expect(result.password).toBeUndefined();
      expect(result.intentosFallidos).toBeUndefined();
      expect(result.bloqueadoHasta).toBeUndefined();
    });
  });

  describe('update', () => {
    it('rejects assigning the root role', async () => {
      rolRepo.findOne.mockResolvedValue({ id: 99, nombre: 'root' });
      await expect(service.update(1, { rolId: 99 } as any, 1)).rejects.toThrow(ConflictException);
    });

    it('rehashes the password when provided', async () => {
      usuarioRepo.findOne.mockResolvedValue({ id: 1, despachoId: 1, password: 'old-hash' });
      const result = await service.update(1, { password: 'Str0ng!Passw0rd' } as any, 1);
      expect(await bcrypt.compare('Str0ng!Passw0rd', usuarioRepo.save.mock.calls[0][0].password)).toBe(true);
      expect(result.password).toBeUndefined();
    });
  });

  describe('resetPassword', () => {
    it('generates a new temporary password, forces a change, and clears lockout counters', async () => {
      usuarioRepo.findOne.mockResolvedValue({ id: 1, despachoId: 1, email: 'ana@a.com' });

      const result = await service.resetPassword(1, 1);

      expect(result.email).toBe('ana@a.com');
      expect(result.password).toBeDefined();
      const updateArg = usuarioRepo.update.mock.calls[0][1];
      expect(updateArg.debeCambiarPassword).toBe(true);
      expect(updateArg.intentosFallidos).toBe(0);
      expect(updateArg.bloqueadoHasta).toBeNull();
      expect(await bcrypt.compare(result.password, updateArg.password)).toBe(true);
    });

    it('throws when the user does not belong to the despacho', async () => {
      usuarioRepo.findOne.mockResolvedValue(null);
      await expect(service.resetPassword(1, 1)).rejects.toThrow(NotFoundException);
    });
  });

  describe('toggleActivo — reactivación', () => {
    it('deactivating never checks the plan limit', async () => {
      usuarioRepo.findOne.mockResolvedValue({ id: 1, despachoId: 1, activo: true, password: 'hash' });
      await service.toggleActivo(1, 1);
      expect(despachoRepo.findOne).not.toHaveBeenCalled();
    });

    it('reactivating a user that would exceed the plan limit requires confirmation (402)', async () => {
      usuarioRepo.findOne.mockResolvedValue({ id: 1, despachoId: 1, activo: false, password: 'hash' });
      despachoRepo.findOne.mockResolvedValue({
        id: 1, fechaVencimientoPago: null,
        plan: { numeroUsuarios: 1, precioUsuarioExtra: 100 },
      });
      usuarioRepo.count.mockResolvedValue(1); // ya hay 1 activo (p.ej. el usuario nuevo creado mientras este estaba inactivo)

      await expect(service.toggleActivo(1, 1)).rejects.toThrow(HttpException);
      expect(usuarioRepo.save).not.toHaveBeenCalled();
    });

    it('reactivating with confirmExtra registers the extra-user mensualidad and proceeds', async () => {
      usuarioRepo.findOne.mockResolvedValue({ id: 1, despachoId: 1, activo: false, password: 'hash' });
      despachoRepo.findOne.mockResolvedValue({
        id: 1, fechaVencimientoPago: null,
        plan: { numeroUsuarios: 1, precioUsuarioExtra: 100 },
      });
      usuarioRepo.count.mockResolvedValue(1);

      const result = await service.toggleActivo(1, 1, true);

      expect(mensualidadRepo.save).toHaveBeenCalled();
      expect(usuarioRepo.save).toHaveBeenCalledWith(expect.objectContaining({ activo: true }));
      expect(result.password).toBeUndefined();
    });

    it('reactivating within the plan limit does not require confirmation', async () => {
      usuarioRepo.findOne.mockResolvedValue({ id: 1, despachoId: 1, activo: false, password: 'hash' });
      despachoRepo.findOne.mockResolvedValue({
        id: 1, fechaVencimientoPago: null,
        plan: { numeroUsuarios: 5, precioUsuarioExtra: 100 },
      });
      usuarioRepo.count.mockResolvedValue(1);

      await service.toggleActivo(1, 1);

      expect(mensualidadRepo.save).not.toHaveBeenCalled();
      expect(usuarioRepo.save).toHaveBeenCalledWith(expect.objectContaining({ activo: true }));
    });
  });

  describe('getRoles', () => {
    it('excludes the root role from the assignable list', async () => {
      rolRepo.find.mockResolvedValue([{ nombre: 'abogado' }]);
      await service.getRoles();
      expect(rolRepo.find).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.anything() }),
      );
    });
  });
});

describe('CreateUsuarioDto password policy', () => {
  it('rejects a weak password', async () => {
    const dto = plainToInstance(CreateUsuarioDto, {
      nombre: 'Ana', apellido: 'Ruiz', email: 'ana@a.com', password: '12345', rolId: 2,
    });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'password')).toBe(true);
  });

  it('accepts a password meeting the policy', async () => {
    const dto = plainToInstance(CreateUsuarioDto, {
      nombre: 'Ana', apellido: 'Ruiz', email: 'ana@a.com', password: 'Str0ng!Passw0rd', rolId: 2,
    });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'password')).toBe(false);
  });
});
