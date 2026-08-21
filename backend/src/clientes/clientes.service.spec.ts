import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Not } from 'typeorm';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { ClientesService } from './clientes.service';
import { Cliente } from './entities/cliente.entity';
import { AuditoriaService } from '../auditoria/auditoria.service';
import { CreateClienteDto } from './dto/create-cliente.dto';

const repoMockFactory = () => ({
  find: jest.fn(),
  findOne: jest.fn(),
  findAndCount: jest.fn(),
  create: jest.fn((data) => data),
  save: jest.fn((data) => Promise.resolve({ id: 1, ...data })),
  count: jest.fn(),
});

const clienteValido = {
  nombre: 'Ana', apellido: 'Ruiz', celular: '555-123-4567',
};

describe('ClientesService', () => {
  let service: ClientesService;
  let repo: ReturnType<typeof repoMockFactory>;
  let auditoriaService: { log: jest.Mock };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ClientesService,
        { provide: getRepositoryToken(Cliente), useFactory: repoMockFactory },
        { provide: AuditoriaService, useValue: { log: jest.fn().mockResolvedValue(undefined) } },
      ],
    }).compile();

    service = module.get(ClientesService);
    repo = module.get(getRepositoryToken(Cliente));
    auditoriaService = module.get(AuditoriaService) as any;
  });

  describe('findAll', () => {
    it('keeps the activo filter even when a search term is present', async () => {
      repo.findAndCount.mockResolvedValue([[], 0]);
      await service.findAll(1, { busqueda: 'ana', activo: 'true' });
      const options = repo.findAndCount.mock.calls[0][0];
      expect(Array.isArray(options.where)).toBe(true);
      options.where.forEach((clause: any) => expect(clause.activo).toBe(true));
    });

    it('caps limite at 100 and floors pagina at 1', async () => {
      repo.findAndCount.mockResolvedValue([[], 0]);
      const result = await service.findAll(1, { pagina: -5, limite: 99999 });
      expect(result.pagina).toBe(1);
      expect(result.limite).toBe(100);
      const options = repo.findAndCount.mock.calls[0][0];
      expect(options.take).toBe(100);
      expect(options.skip).toBe(0);
    });

    it('logs a BUSCAR audit entry only when a search term is provided', async () => {
      repo.findAndCount.mockResolvedValue([[], 3]);
      await service.findAll(1, { busqueda: 'lopez' }, { id: 9, nombre: 'Ana', apellido: 'Ruiz' }, '127.0.0.1');
      expect(auditoriaService.log).toHaveBeenCalledWith(expect.objectContaining({
        despachoId: 1, usuarioId: 9, accion: 'BUSCAR', modulo: 'CLIENTES',
      }));
    });

    it('does not log anything when there is no search term', async () => {
      repo.findAndCount.mockResolvedValue([[], 0]);
      await service.findAll(1, {}, { id: 9, nombre: 'Ana', apellido: 'Ruiz' }, '127.0.0.1');
      expect(auditoriaService.log).not.toHaveBeenCalled();
    });
  });

  describe('findOne', () => {
    it('throws NotFoundException when the client does not belong to the despacho', async () => {
      repo.findOne.mockResolvedValue(null);
      await expect(service.findOne(1, 1)).rejects.toThrow(NotFoundException);
    });
  });

  describe('create', () => {
    it('rejects a duplicate email within the same despacho', async () => {
      repo.findOne.mockResolvedValueOnce({ id: 5 }); // email match
      await expect(
        service.create({ ...clienteValido, email: 'dup@a.com' } as any, 1),
      ).rejects.toThrow(ConflictException);
    });

    it('rejects a duplicate RFC within the same despacho', async () => {
      // clienteValido no trae email, así que sólo se ejecuta el chequeo de RFC
      repo.findOne.mockResolvedValueOnce({ id: 5 }); // rfc match
      await expect(
        service.create({ ...clienteValido, rfc: 'XAXX010101000' } as any, 1),
      ).rejects.toThrow(ConflictException);
    });

    it('trims whitespace and lowercases email before saving', async () => {
      repo.findOne.mockResolvedValue(null);
      await service.create({ ...clienteValido, nombre: '  Ana  ', email: 'ANA@A.COM ' } as any, 1);
      const created = repo.create.mock.calls[0][0];
      expect(created.nombre).toBe('Ana');
      expect(created.email).toBe('ana@a.com');
      expect(created.despachoId).toBe(1);
    });

    it('creates successfully when there are no duplicates', async () => {
      repo.findOne.mockResolvedValue(null);
      const result = await service.create(clienteValido as any, 1);
      expect(result).toMatchObject({ nombre: 'Ana', apellido: 'Ruiz' });
    });
  });

  describe('update', () => {
    it('excludes the record itself when checking for duplicates', async () => {
      repo.findOne
        .mockResolvedValueOnce({ id: 7, despachoId: 1, nombre: 'Ana', apellido: 'Ruiz' }) // findOne(id, despachoId)
        .mockResolvedValueOnce(null); // email dup check
      await service.update(7, { email: 'ana@a.com' } as any, 1);
      const dupCheckArgs = repo.findOne.mock.calls[1][0];
      expect(dupCheckArgs.where.id).toEqual(Not(7));
    });

    it('throws NotFoundException for a client in another despacho', async () => {
      repo.findOne.mockResolvedValue(null);
      await expect(service.update(1, {} as any, 1)).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove', () => {
    it('soft-deletes by setting activo to false', async () => {
      repo.findOne.mockResolvedValue({ id: 1, despachoId: 1, activo: true });
      const result = await service.remove(1, 1);
      expect(result.activo).toBe(false);
    });
  });

  describe('getStats', () => {
    it('computes inactivos as total minus activos', async () => {
      repo.count.mockResolvedValueOnce(10).mockResolvedValueOnce(7);
      const stats = await service.getStats(1);
      expect(stats).toEqual({ total: 10, activos: 7, inactivos: 3 });
    });
  });
});

describe('CreateClienteDto validation', () => {
  const base = { nombre: 'Ana', apellido: 'Ruiz', celular: '555-123-4567' };

  it('rejects empty required fields', async () => {
    const dto = plainToInstance(CreateClienteDto, { ...base, nombre: '' });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'nombre')).toBe(true);
  });

  it('rejects an invalid email format', async () => {
    const dto = plainToInstance(CreateClienteDto, { ...base, email: 'not-an-email' });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'email')).toBe(true);
  });

  it('accepts an absent optional email without error', async () => {
    const dto = plainToInstance(CreateClienteDto, base);
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('rejects a malformed RFC', async () => {
    const dto = plainToInstance(CreateClienteDto, { ...base, rfc: '123' });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'rfc')).toBe(true);
  });

  it('accepts a well-formed RFC', async () => {
    const dto = plainToInstance(CreateClienteDto, { ...base, rfc: 'XAXX010101000' });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'rfc')).toBe(false);
  });

  it('rejects a malformed CURP', async () => {
    const dto = plainToInstance(CreateClienteDto, { ...base, curp: 'demasiado-corto' });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'curp')).toBe(true);
  });

  it('rejects a missing celular', async () => {
    const dto = plainToInstance(CreateClienteDto, { ...base, celular: '' });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'celular')).toBe(true);
  });
});
