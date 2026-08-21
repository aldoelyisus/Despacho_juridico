import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { ExpedientesService } from './expedientes.service';
import { Expediente, EstadoExpediente } from './entities/expediente.entity';
import { Documento } from './entities/documento.entity';
import { Observacion } from './entities/observacion.entity';
import { EventoExpediente } from './entities/evento-expediente.entity';
import { Cliente } from '../clientes/entities/cliente.entity';
import { Usuario } from '../usuarios/entities/usuario.entity';
import { Despacho } from '../despachos/entities/despacho.entity';
import { CreateExpedienteDto } from './dto/create-expediente.dto';
import { CreateEventoDto } from './dto/create-evento.dto';
import { AuditoriaService } from '../auditoria/auditoria.service';
import { S3Service } from '../common/services/s3.service';

function createQueryBuilderMock(overrides: Record<string, any> = {}) {
  return {
    leftJoinAndSelect: jest.fn().mockReturnThis(),
    leftJoin: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    addSelect: jest.fn().mockReturnThis(),
    groupBy: jest.fn().mockReturnThis(),
    getOne: jest.fn(),
    getManyAndCount: jest.fn(),
    getRawMany: jest.fn(),
    ...overrides,
  };
}

const repoMockFactory = () => ({
  find: jest.fn(),
  findOne: jest.fn(),
  findBy: jest.fn(),
  count: jest.fn(),
  create: jest.fn((data) => data),
  save: jest.fn((data) => Promise.resolve({ id: 1, ...data })),
  update: jest.fn(),
  createQueryBuilder: jest.fn(),
});

const adminUser = { id: 1, despachoId: 1, nombre: 'Ana', apellido: 'Ruiz', rol: { nombre: 'Administrador' } };
const colaboradorUser = { id: 2, despachoId: 1, nombre: 'Luis', apellido: 'Diaz', rol: { nombre: 'Abogado' } };

describe('ExpedientesService', () => {
  let service: ExpedientesService;
  let repo: ReturnType<typeof repoMockFactory>;
  let docRepo: ReturnType<typeof repoMockFactory>;
  let obsRepo: ReturnType<typeof repoMockFactory>;
  let eventoRepo: ReturnType<typeof repoMockFactory>;
  let clienteRepo: ReturnType<typeof repoMockFactory>;
  let usuarioRepo: ReturnType<typeof repoMockFactory>;
  let despachoRepo: ReturnType<typeof repoMockFactory>;
  let auditoriaService: { log: jest.Mock };
  let s3Service: { uploadFile: jest.Mock; getPresignedUrl: jest.Mock; deleteFile: jest.Mock };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ExpedientesService,
        { provide: getRepositoryToken(Expediente), useFactory: repoMockFactory },
        { provide: getRepositoryToken(Documento), useFactory: repoMockFactory },
        { provide: getRepositoryToken(Observacion), useFactory: repoMockFactory },
        { provide: getRepositoryToken(EventoExpediente), useFactory: repoMockFactory },
        { provide: getRepositoryToken(Cliente), useFactory: repoMockFactory },
        { provide: getRepositoryToken(Usuario), useFactory: repoMockFactory },
        { provide: getRepositoryToken(Despacho), useFactory: repoMockFactory },
        { provide: AuditoriaService, useValue: { log: jest.fn().mockResolvedValue(undefined) } },
        {
          provide: S3Service,
          useValue: {
            uploadFile: jest.fn().mockResolvedValue(undefined),
            getPresignedUrl: jest.fn().mockResolvedValue('https://signed-url.example.com/archivo'),
            deleteFile: jest.fn().mockResolvedValue(undefined),
          },
        },
      ],
    }).compile();

    service = module.get(ExpedientesService);
    repo = module.get(getRepositoryToken(Expediente));
    docRepo = module.get(getRepositoryToken(Documento));
    obsRepo = module.get(getRepositoryToken(Observacion));
    eventoRepo = module.get(getRepositoryToken(EventoExpediente));
    clienteRepo = module.get(getRepositoryToken(Cliente));
    usuarioRepo = module.get(getRepositoryToken(Usuario));
    despachoRepo = module.get(getRepositoryToken(Despacho));
    auditoriaService = module.get(AuditoriaService) as any;
    s3Service = module.get(S3Service) as any;
    despachoRepo.findOne.mockResolvedValue({ id: 1, nombre: 'Bufete García Núñez' });
  });

  describe('findAll', () => {
    it('caps limite at 100 and floors pagina at 1', async () => {
      const qb = createQueryBuilderMock({ getManyAndCount: jest.fn().mockResolvedValue([[], 0]) });
      repo.createQueryBuilder.mockReturnValue(qb);
      const result = await service.findAll(adminUser, { pagina: -3, limite: 500 });
      expect(result.pagina).toBe(1);
      expect(result.limite).toBe(100);
    });

    it('restricts non-admins to expedientes where they collaborate', async () => {
      const qb = createQueryBuilderMock({ getManyAndCount: jest.fn().mockResolvedValue([[], 0]) });
      repo.createQueryBuilder.mockReturnValue(qb);
      await service.findAll(colaboradorUser, {});
      expect(qb.andWhere).toHaveBeenCalledWith('col.id = :usuarioId', { usuarioId: colaboradorUser.id });
    });

    it('does not restrict admins by collaborator', async () => {
      const qb = createQueryBuilderMock({ getManyAndCount: jest.fn().mockResolvedValue([[], 0]) });
      repo.createQueryBuilder.mockReturnValue(qb);
      await service.findAll(adminUser, {});
      expect(qb.andWhere).not.toHaveBeenCalledWith('col.id = :usuarioId', expect.anything());
    });

    it('never selects colaboradores password/2FA columns (regression guard for a real leak)', async () => {
      const qb = createQueryBuilderMock({ getManyAndCount: jest.fn().mockResolvedValue([[], 0]) });
      repo.createQueryBuilder.mockReturnValue(qb);
      await service.findAll(adminUser, {});
      expect(qb.addSelect).toHaveBeenCalledWith(['col.id', 'col.nombre', 'col.apellido', 'col.avatar']);
    });
  });

  describe('findOne', () => {
    it('throws NotFoundException when the expediente does not exist or the user has no access', async () => {
      const qb = createQueryBuilderMock({ getOne: jest.fn().mockResolvedValue(null) });
      repo.createQueryBuilder.mockReturnValue(qb);
      await expect(service.findOne(1, colaboradorUser)).rejects.toThrow(NotFoundException);
    });

    it('never selects colaboradores password/2FA columns (regression guard for a real leak)', async () => {
      const qb = createQueryBuilderMock({ getOne: jest.fn().mockResolvedValue({ id: 1 }) });
      repo.createQueryBuilder.mockReturnValue(qb);
      await service.findOne(1, adminUser);
      expect(qb.addSelect).toHaveBeenCalledWith(['col.id', 'col.nombre', 'col.apellido', 'col.avatar']);
    });

    it('returns the expediente when found', async () => {
      const qb = createQueryBuilderMock({ getOne: jest.fn().mockResolvedValue({ id: 1, titulo: 'Caso X' }) });
      repo.createQueryBuilder.mockReturnValue(qb);
      const result = await service.findOne(1, adminUser);
      expect(result).toMatchObject({ id: 1, titulo: 'Caso X' });
    });
  });

  describe('create', () => {
    it('rejects creation without at least one cliente', async () => {
      await expect(service.create({ titulo: 'Caso' } as any, 1)).rejects.toThrow(BadRequestException);
      expect(repo.save).not.toHaveBeenCalled();
    });

    it('rejects clientes that do not belong to the despacho', async () => {
      repo.count.mockResolvedValue(0);
      clienteRepo.findBy.mockResolvedValue([{ id: 4 }]); // solo se resolvió uno de los dos ids
      await expect(
        service.create({ titulo: 'Caso', clienteIds: [4, 99] } as any, 1),
      ).rejects.toThrow(BadRequestException);
    });

    it('generates a sequential numero and saves with despachoId scoping', async () => {
      repo.count.mockResolvedValue(3);
      clienteRepo.findBy.mockResolvedValue([{ id: 4, despachoId: 1 }]);
      const result = await service.create({ titulo: 'Caso', clienteIds: [4] } as any, 1);
      expect(result.numero).toMatch(/^EXP-\d{4}-0004$/);
      expect(result.despachoId).toBe(1);
      expect(result.montoTotal).toBe(0);
    });

    it('never fetches colaboradores with password/2FA columns (regression guard for a real leak)', async () => {
      repo.count.mockResolvedValue(0);
      clienteRepo.findBy.mockResolvedValue([{ id: 4, despachoId: 1 }]);
      usuarioRepo.find.mockResolvedValue([{ id: 2, despachoId: 1, nombre: 'Luis', apellido: 'Diaz' }]);
      await service.create({ titulo: 'Caso', clienteIds: [4], colaboradorIds: [2] } as any, 1);
      const [options] = usuarioRepo.find.mock.calls[0];
      expect(options.select).toEqual({ id: true, nombre: true, apellido: true, avatar: true });
      expect(options.select.password).toBeUndefined();
      expect(options.select.twoFactorSecret).toBeUndefined();
      expect(options.select.twoFactorBackupCodes).toBeUndefined();
    });

    it('ignores a client-supplied montoTotal and always starts at 0', async () => {
      repo.count.mockResolvedValue(0);
      clienteRepo.findBy.mockResolvedValue([{ id: 4, despachoId: 1 }]);
      const result = await service.create({ titulo: 'Caso', clienteIds: [4], montoTotal: 99999 } as any, 1);
      expect(result.montoTotal).toBe(0);
    });

    it('always starts in estado CONSULTA regardless of a client-supplied estado', async () => {
      repo.count.mockResolvedValue(0);
      clienteRepo.findBy.mockResolvedValue([{ id: 4, despachoId: 1 }]);
      const result = await service.create({ titulo: 'Caso', clienteIds: [4], estado: EstadoExpediente.GANADO } as any, 1);
      expect(result.estado).toBe(EstadoExpediente.CONSULTA);
    });
  });

  describe('update', () => {
    it('throws NotFoundException when the expediente is not accessible to the user', async () => {
      const qb = createQueryBuilderMock({ getOne: jest.fn().mockResolvedValue(null) });
      repo.createQueryBuilder.mockReturnValue(qb);
      await expect(service.update(1, { titulo: 'Nuevo' } as any, colaboradorUser)).rejects.toThrow(NotFoundException);
    });

    it('rejects colaboradores that do not belong to the despacho', async () => {
      const qb = createQueryBuilderMock({ getOne: jest.fn().mockResolvedValue({ id: 1, despachoId: 1, clientes: [], colaboradores: [] }) });
      repo.createQueryBuilder.mockReturnValue(qb);
      usuarioRepo.find.mockResolvedValue([]);
      await expect(
        service.update(1, { colaboradorIds: [55] } as any, adminUser),
      ).rejects.toThrow(BadRequestException);
    });

    it('updates fields and replaces clientes/colaboradores when provided', async () => {
      const exp = { id: 1, despachoId: 1, titulo: 'Viejo', clientes: [{ id: 4 }], colaboradores: [] };
      const qb = createQueryBuilderMock({ getOne: jest.fn().mockResolvedValue(exp) });
      repo.createQueryBuilder.mockReturnValue(qb);
      clienteRepo.findBy.mockResolvedValue([{ id: 9, despachoId: 1 }]);
      const result = await service.update(1, { titulo: 'Nuevo', clienteIds: [9] } as any, adminUser);
      expect(result.titulo).toBe('Nuevo');
      expect(result.clientes).toEqual([{ id: 9, despachoId: 1 }]);
    });

    it('leaves clientes untouched when clienteIds is not provided', async () => {
      const exp = { id: 1, despachoId: 1, titulo: 'Viejo', clientes: [{ id: 4 }], colaboradores: [] };
      const qb = createQueryBuilderMock({ getOne: jest.fn().mockResolvedValue(exp) });
      repo.createQueryBuilder.mockReturnValue(qb);
      const result = await service.update(1, { titulo: 'Nuevo' } as any, adminUser);
      expect(result.clientes).toEqual([{ id: 4 }]);
    });
  });

  describe('cambiarEstado', () => {
    it('throws NotFoundException when the expediente is not accessible', async () => {
      const qb = createQueryBuilderMock({ getOne: jest.fn().mockResolvedValue(null) });
      repo.createQueryBuilder.mockReturnValue(qb);
      await expect(service.cambiarEstado(1, EstadoExpediente.ACTIVO, colaboradorUser)).rejects.toThrow(NotFoundException);
      expect(repo.update).not.toHaveBeenCalled();
    });

    it('rejects setting the same estado the expediente already has', async () => {
      const qb = createQueryBuilderMock({ getOne: jest.fn().mockResolvedValue({ id: 1, despachoId: 1, estado: EstadoExpediente.ACTIVO }) });
      repo.createQueryBuilder.mockReturnValue(qb);
      await expect(service.cambiarEstado(1, EstadoExpediente.ACTIVO, adminUser)).rejects.toThrow(BadRequestException);
      expect(repo.update).not.toHaveBeenCalled();
    });

    it('rejects a transition that skips the workflow (consulta directo a ganado)', async () => {
      const qb = createQueryBuilderMock({ getOne: jest.fn().mockResolvedValue({ id: 1, despachoId: 1, estado: EstadoExpediente.CONSULTA }) });
      repo.createQueryBuilder.mockReturnValue(qb);
      await expect(service.cambiarEstado(1, EstadoExpediente.GANADO, adminUser)).rejects.toThrow(BadRequestException);
      expect(repo.update).not.toHaveBeenCalled();
    });

    it('rejects any transition out of a final estado', async () => {
      const qb = createQueryBuilderMock({ getOne: jest.fn().mockResolvedValue({ id: 1, despachoId: 1, estado: EstadoExpediente.GANADO }) });
      repo.createQueryBuilder.mockReturnValue(qb);
      await expect(service.cambiarEstado(1, EstadoExpediente.ACTIVO, adminUser)).rejects.toThrow(BadRequestException);
    });

    it('allows consulta → activo and does not touch fechaCierre', async () => {
      const qb = createQueryBuilderMock({ getOne: jest.fn().mockResolvedValue({ id: 1, despachoId: 1, estado: EstadoExpediente.CONSULTA, fechaCierre: null }) });
      repo.createQueryBuilder.mockReturnValue(qb);
      await service.cambiarEstado(1, EstadoExpediente.ACTIVO, adminUser);
      expect(repo.update).toHaveBeenCalledWith({ id: 1, despachoId: 1 }, { estado: EstadoExpediente.ACTIVO });
    });

    it('allows suspendido → activo (reactivación)', async () => {
      const qb = createQueryBuilderMock({ getOne: jest.fn().mockResolvedValue({ id: 1, despachoId: 1, estado: EstadoExpediente.SUSPENDIDO, fechaCierre: null }) });
      repo.createQueryBuilder.mockReturnValue(qb);
      await service.cambiarEstado(1, EstadoExpediente.ACTIVO, adminUser);
      expect(repo.update).toHaveBeenCalledWith({ id: 1, despachoId: 1 }, { estado: EstadoExpediente.ACTIVO });
    });

    it('sets fechaCierre automatically when reaching ganado, if it was not already set', async () => {
      const qb = createQueryBuilderMock({ getOne: jest.fn().mockResolvedValue({ id: 1, despachoId: 1, estado: EstadoExpediente.ACTIVO, fechaCierre: null }) });
      repo.createQueryBuilder.mockReturnValue(qb);
      await service.cambiarEstado(1, EstadoExpediente.GANADO, adminUser);
      const [, cambios] = repo.update.mock.calls[0];
      expect(cambios.estado).toBe(EstadoExpediente.GANADO);
      expect(cambios.fechaCierre).toBeInstanceOf(Date);
    });

    it('does not overwrite an existing fechaCierre when closing', async () => {
      const fechaExistente = new Date('2026-01-01');
      const qb = createQueryBuilderMock({ getOne: jest.fn().mockResolvedValue({ id: 1, despachoId: 1, estado: EstadoExpediente.ACTIVO, fechaCierre: fechaExistente }) });
      repo.createQueryBuilder.mockReturnValue(qb);
      await service.cambiarEstado(1, EstadoExpediente.PERDIDO, adminUser);
      expect(repo.update).toHaveBeenCalledWith({ id: 1, despachoId: 1 }, { estado: EstadoExpediente.PERDIDO });
    });

    it('logs who changed the estado, and the before/after transition', async () => {
      const qb = createQueryBuilderMock({ getOne: jest.fn().mockResolvedValue({ id: 1, despachoId: 1, numero: 'EXP-2026-0001', estado: EstadoExpediente.CONSULTA, fechaCierre: null }) });
      repo.createQueryBuilder.mockReturnValue(qb);
      await service.cambiarEstado(1, EstadoExpediente.ACTIVO, adminUser, '127.0.0.1');
      expect(auditoriaService.log).toHaveBeenCalledWith(expect.objectContaining({
        despachoId: 1, usuarioId: adminUser.id, usuarioNombre: 'Ana Ruiz',
        accion: 'CAMBIO_ESTADO', modulo: 'EXPEDIENTES', ip: '127.0.0.1',
        descripcion: 'Expediente EXP-2026-0001 cambió de "Consulta" a "Activo"',
      }));
    });

    it('does not log when the transition is rejected', async () => {
      const qb = createQueryBuilderMock({ getOne: jest.fn().mockResolvedValue({ id: 1, despachoId: 1, numero: 'EXP-2026-0001', estado: EstadoExpediente.CONSULTA, fechaCierre: null }) });
      repo.createQueryBuilder.mockReturnValue(qb);
      await expect(service.cambiarEstado(1, EstadoExpediente.GANADO, adminUser)).rejects.toThrow(BadRequestException);
      expect(auditoriaService.log).not.toHaveBeenCalled();
    });

    it('never lets a failed audit log break the estado change', async () => {
      const qb = createQueryBuilderMock({ getOne: jest.fn().mockResolvedValue({ id: 1, despachoId: 1, numero: 'EXP-2026-0001', estado: EstadoExpediente.CONSULTA, fechaCierre: null }) });
      repo.createQueryBuilder.mockReturnValue(qb);
      auditoriaService.log.mockRejectedValueOnce(new Error('db down'));
      await expect(service.cambiarEstado(1, EstadoExpediente.ACTIVO, adminUser)).resolves.toBeDefined();
    });
  });

  describe('addDocumento', () => {
    it('rejects when no file is provided', async () => {
      await expect(
        service.addDocumento(1, undefined as any, {}, adminUser),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws NotFoundException when the expediente is not accessible', async () => {
      const qb = createQueryBuilderMock({ getOne: jest.fn().mockResolvedValue(null) });
      repo.createQueryBuilder.mockReturnValue(qb);
      const file = { originalname: 'a.pdf', buffer: Buffer.from('x'), mimetype: 'application/pdf', size: 100 } as any;
      await expect(service.addDocumento(1, file, {}, colaboradorUser)).rejects.toThrow(NotFoundException);
    });

    it('uploads the file buffer to S3 under despacho/cliente/expediente and saves the returned key as ruta', async () => {
      const qb = createQueryBuilderMock({
        getOne: jest.fn().mockResolvedValue({
          id: 1, despachoId: 1, numero: 'EXP-2026-0001',
          clientes: [{ id: 4, nombre: 'José', apellido: 'Pérez' }],
        }),
      });
      repo.createQueryBuilder.mockReturnValue(qb);
      const file = { originalname: 'contrato.pdf', buffer: Buffer.from('contenido'), mimetype: 'application/pdf', size: 2048 } as any;
      const result = await service.addDocumento(1, file, { descripcion: 'Firmado' }, adminUser);

      expect(s3Service.uploadFile).toHaveBeenCalledTimes(1);
      const [key, buffer, contentType] = s3Service.uploadFile.mock.calls[0];
      expect(key).toMatch(/^despachos\/1-bufete-garcia-nunez\/4-jose-perez\/EXP-2026-0001\/\d+-contrato\.pdf$/);
      expect(buffer).toBe(file.buffer);
      expect(contentType).toBe('application/pdf');

      expect(result).toMatchObject({
        expedienteId: 1, despachoId: 1, usuarioId: adminUser.id,
        nombre: 'contrato.pdf', ruta: key, descripcion: 'Firmado',
      });
    });

    it('falls back to a "sin-cliente" folder when the expediente has no clientes', async () => {
      const qb = createQueryBuilderMock({
        getOne: jest.fn().mockResolvedValue({ id: 1, despachoId: 1, numero: 'EXP-2026-0002', clientes: [] }),
      });
      repo.createQueryBuilder.mockReturnValue(qb);
      const file = { originalname: 'foto.jpg', buffer: Buffer.from('x'), mimetype: 'image/jpeg', size: 10 } as any;
      await service.addDocumento(1, file, {}, adminUser);
      const [key] = s3Service.uploadFile.mock.calls[0];
      expect(key).toMatch(/^despachos\/1-bufete-garcia-nunez\/sin-cliente\/EXP-2026-0002\//);
    });

    it('uses the provided nombre override instead of the original filename', async () => {
      const qb = createQueryBuilderMock({
        getOne: jest.fn().mockResolvedValue({ id: 1, despachoId: 1, numero: 'EXP-2026-0001', clientes: [] }),
      });
      repo.createQueryBuilder.mockReturnValue(qb);
      const file = { originalname: 'contrato.pdf', buffer: Buffer.from('x'), mimetype: 'application/pdf', size: 2048 } as any;
      const result = await service.addDocumento(1, file, { nombre: 'Contrato final' }, adminUser);
      expect(result.nombre).toBe('Contrato final');
    });
  });

  describe('getDocumentoUrl', () => {
    it('throws NotFoundException when the expediente is not accessible', async () => {
      const qb = createQueryBuilderMock({ getOne: jest.fn().mockResolvedValue(null) });
      repo.createQueryBuilder.mockReturnValue(qb);
      await expect(service.getDocumentoUrl(1, 1, colaboradorUser)).rejects.toThrow(NotFoundException);
    });

    it('throws NotFoundException when the documento does not belong to the expediente', async () => {
      const qb = createQueryBuilderMock({
        getOne: jest.fn().mockResolvedValue({ id: 1, despachoId: 1, documentos: [{ id: 5, ruta: 'x' }] }),
      });
      repo.createQueryBuilder.mockReturnValue(qb);
      await expect(service.getDocumentoUrl(1, 999, adminUser)).rejects.toThrow(NotFoundException);
    });

    it('returns a presigned URL valid for 5 minutes for the stored S3 key', async () => {
      const qb = createQueryBuilderMock({
        getOne: jest.fn().mockResolvedValue({
          id: 1, despachoId: 1,
          documentos: [{ id: 5, ruta: 'despachos/1-bufete/4-jose/EXP-2026-0001/archivo.pdf' }],
        }),
      });
      repo.createQueryBuilder.mockReturnValue(qb);
      const result = await service.getDocumentoUrl(1, 5, adminUser);
      expect(s3Service.getPresignedUrl).toHaveBeenCalledWith('despachos/1-bufete/4-jose/EXP-2026-0001/archivo.pdf', 300);
      expect(result).toEqual({ url: 'https://signed-url.example.com/archivo', expiraEnSegundos: 300 });
    });
  });

  describe('addObservacion', () => {
    it('throws NotFoundException when the expediente is not accessible', async () => {
      const qb = createQueryBuilderMock({ getOne: jest.fn().mockResolvedValue(null) });
      repo.createQueryBuilder.mockReturnValue(qb);
      await expect(service.addObservacion(1, 'Nota', colaboradorUser)).rejects.toThrow(NotFoundException);
    });

    it('stamps the author name and despacho', async () => {
      const qb = createQueryBuilderMock({ getOne: jest.fn().mockResolvedValue({ id: 1, despachoId: 1 }) });
      repo.createQueryBuilder.mockReturnValue(qb);
      const result = await service.addObservacion(1, 'Se presentó la demanda', adminUser);
      expect(result).toMatchObject({
        expedienteId: 1, despachoId: 1, usuarioId: adminUser.id,
        usuarioNombre: 'Ana Ruiz', contenido: 'Se presentó la demanda',
      });
    });
  });

  describe('addEvento', () => {
    it('rejects when fechaFin is earlier than fechaInicio', async () => {
      await expect(
        service.addEvento(
          1,
          { titulo: 'Audiencia', fechaInicio: '2026-03-10T10:00:00', fechaFin: '2026-03-10T09:00:00' } as CreateEventoDto,
          adminUser,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws NotFoundException when the expediente is not accessible', async () => {
      const qb = createQueryBuilderMock({ getOne: jest.fn().mockResolvedValue(null) });
      repo.createQueryBuilder.mockReturnValue(qb);
      await expect(
        service.addEvento(1, { titulo: 'Audiencia', fechaInicio: '2026-03-10T10:00:00' } as CreateEventoDto, colaboradorUser),
      ).rejects.toThrow(NotFoundException);
    });

    it('saves the evento scoped to the despacho', async () => {
      const qb = createQueryBuilderMock({ getOne: jest.fn().mockResolvedValue({ id: 1, despachoId: 1 }) });
      repo.createQueryBuilder.mockReturnValue(qb);
      const result = await service.addEvento(1, { titulo: 'Audiencia', fechaInicio: '2026-03-10T10:00:00' } as CreateEventoDto, adminUser);
      expect(result).toMatchObject({ expedienteId: 1, despachoId: 1, titulo: 'Audiencia' });
    });
  });

  describe('getStats', () => {
    it('computes tasaExito from cancelado/ganado/perdido counts', async () => {
      const qb = createQueryBuilderMock({
        getRawMany: jest.fn().mockResolvedValue([
          { estado: 'ganado', total: '3' },
          { estado: 'perdido', total: '1' },
          { estado: 'activo', total: '5' },
        ]),
      });
      repo.createQueryBuilder.mockReturnValue(qb);
      const result = await service.getStats(adminUser);
      expect(result.tasaExito).toBe(75); // 3 ganados / 4 resueltos
    });
  });
});

describe('CreateExpedienteDto validation', () => {
  it('rejects an empty titulo', async () => {
    const dto = plainToInstance(CreateExpedienteDto, { titulo: '' });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'titulo')).toBe(true);
  });

  it('rejects a non-numeric clienteIds entry', async () => {
    const dto = plainToInstance(CreateExpedienteDto, { titulo: 'Caso', clienteIds: ['a'] });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'clienteIds')).toBe(true);
  });

  it('accepts valid input', async () => {
    const dto = plainToInstance(CreateExpedienteDto, { titulo: 'Caso', clienteIds: [1, 2] });
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });
});

describe('CreateEventoDto validation', () => {
  it('rejects a missing fechaInicio', async () => {
    const dto = plainToInstance(CreateEventoDto, { titulo: 'Audiencia' });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'fechaInicio')).toBe(true);
  });

  it('accepts valid input', async () => {
    const dto = plainToInstance(CreateEventoDto, { titulo: 'Audiencia', fechaInicio: '2026-03-10T10:00:00' });
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });
});
