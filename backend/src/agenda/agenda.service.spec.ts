import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException, ForbiddenException } from '@nestjs/common';
import { AgendaService } from './agenda.service';
import { EventoAgenda } from './entities/evento-agenda.entity';
import { Usuario } from '../usuarios/entities/usuario.entity';

function createQueryBuilderMock(overrides: Record<string, any> = {}) {
  return {
    leftJoin: jest.fn().mockReturnThis(),
    addSelect: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    getMany: jest.fn(),
    getOne: jest.fn(),
    ...overrides,
  };
}

const repoMockFactory = () => ({
  find: jest.fn(),
  findOne: jest.fn(),
  create: jest.fn((data) => data),
  save: jest.fn((data) => Promise.resolve({ id: 1, ...data })),
  remove: jest.fn((data) => Promise.resolve(data)),
  createQueryBuilder: jest.fn(),
});

const adminUser = { id: 1, despachoId: 1, rol: { nombre: 'Administrador' } };
const colaboradorUser = { id: 2, despachoId: 1, rol: { nombre: 'Abogado' } };

describe('AgendaService', () => {
  let service: AgendaService;
  let repo: ReturnType<typeof repoMockFactory>;
  let usuarioRepo: ReturnType<typeof repoMockFactory>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AgendaService,
        { provide: getRepositoryToken(EventoAgenda), useFactory: repoMockFactory },
        { provide: getRepositoryToken(Usuario), useFactory: repoMockFactory },
      ],
    }).compile();

    service = module.get(AgendaService);
    repo = module.get(getRepositoryToken(EventoAgenda));
    usuarioRepo = module.get(getRepositoryToken(Usuario));
  });

  describe('findAll', () => {
    it('restricts non-admins to events where they are creador or participante', async () => {
      const qb = createQueryBuilderMock({ getMany: jest.fn().mockResolvedValue([]) });
      repo.createQueryBuilder.mockReturnValue(qb);
      await service.findAll(colaboradorUser, {});
      expect(qb.andWhere).toHaveBeenCalledWith('(e.creadorId = :uid OR p.id = :uid)', { uid: colaboradorUser.id });
    });

    it('lets admins see every event in the despacho', async () => {
      const qb = createQueryBuilderMock({ getMany: jest.fn().mockResolvedValue([]) });
      repo.createQueryBuilder.mockReturnValue(qb);
      await service.findAll(adminUser, {});
      expect(qb.andWhere).toHaveBeenCalledWith('1=1', { uid: adminUser.id });
    });

    it('never selects participantes password/2FA columns (regression guard for a real leak)', async () => {
      const qb = createQueryBuilderMock({ getMany: jest.fn().mockResolvedValue([]) });
      repo.createQueryBuilder.mockReturnValue(qb);
      await service.findAll(adminUser, {});
      expect(qb.addSelect).toHaveBeenCalledWith(['p.id', 'p.nombre', 'p.apellido', 'p.avatar']);
    });
  });

  describe('findOne', () => {
    it('throws NotFoundException when the event does not exist or the user has no access', async () => {
      const qb = createQueryBuilderMock({ getOne: jest.fn().mockResolvedValue(null) });
      repo.createQueryBuilder.mockReturnValue(qb);
      await expect(service.findOne(1, colaboradorUser)).rejects.toThrow(NotFoundException);
    });

    it('never selects participantes password/2FA columns (regression guard for a real leak)', async () => {
      const qb = createQueryBuilderMock({ getOne: jest.fn().mockResolvedValue({ id: 1 }) });
      repo.createQueryBuilder.mockReturnValue(qb);
      await service.findOne(1, adminUser);
      expect(qb.addSelect).toHaveBeenCalledWith(['p.id', 'p.nombre', 'p.apellido', 'p.avatar']);
    });
  });

  describe('create', () => {
    it('always includes the creador as a participante', async () => {
      usuarioRepo.find.mockResolvedValue([{ id: 1, nombre: 'Ana', apellido: 'Ruiz' }]);
      const result = await service.create({ titulo: 'Audiencia' }, adminUser);
      const [options] = usuarioRepo.find.mock.calls[0];
      expect(options.where.id.value).toEqual([1]);
      expect(result.despachoId).toBe(1);
      expect(result.creadorId).toBe(1);
    });

    it('never fetches participantes with password/2FA columns (regression guard for a real leak)', async () => {
      usuarioRepo.find.mockResolvedValue([{ id: 1 }, { id: 5 }]);
      await service.create({ titulo: 'Audiencia', participanteIds: [5] }, adminUser);
      const [options] = usuarioRepo.find.mock.calls[0];
      expect(options.select).toEqual({ id: true, nombre: true, apellido: true, avatar: true });
      expect(options.select.password).toBeUndefined();
      expect(options.select.twoFactorSecret).toBeUndefined();
      expect(options.select.twoFactorBackupCodes).toBeUndefined();
    });
  });

  describe('update', () => {
    it('rejects when a non-admin, non-creador tries to edit', async () => {
      const qb = createQueryBuilderMock({ getOne: jest.fn().mockResolvedValue({ id: 1, despachoId: 1, creadorId: 1 }) });
      repo.createQueryBuilder.mockReturnValue(qb);
      await expect(service.update(1, { titulo: 'Nuevo' }, colaboradorUser)).rejects.toThrow(ForbiddenException);
    });

    it('lets the creador edit and keeps them in participantes when the list changes', async () => {
      const qb = createQueryBuilderMock({ getOne: jest.fn().mockResolvedValue({ id: 1, despachoId: 1, creadorId: 2 }) });
      repo.createQueryBuilder.mockReturnValue(qb);
      usuarioRepo.find.mockResolvedValue([{ id: 2 }, { id: 3 }]);
      await service.update(1, { titulo: 'Nuevo', participanteIds: [3] }, colaboradorUser);
      const [options] = usuarioRepo.find.mock.calls[0];
      expect(options.where.id.value).toEqual(expect.arrayContaining([2, 3]));
      expect(options.select).toEqual({ id: true, nombre: true, apellido: true, avatar: true });
    });

    it('lets an admin edit an event created by someone else', async () => {
      const qb = createQueryBuilderMock({ getOne: jest.fn().mockResolvedValue({ id: 1, despachoId: 1, creadorId: 2 }) });
      repo.createQueryBuilder.mockReturnValue(qb);
      const result = await service.update(1, { titulo: 'Nuevo' }, adminUser);
      expect(result.titulo).toBe('Nuevo');
    });
  });

  describe('remove', () => {
    it('rejects when a non-admin, non-creador tries to delete', async () => {
      const qb = createQueryBuilderMock({ getOne: jest.fn().mockResolvedValue({ id: 1, despachoId: 1, creadorId: 1 }) });
      repo.createQueryBuilder.mockReturnValue(qb);
      await expect(service.remove(1, colaboradorUser)).rejects.toThrow(ForbiddenException);
      expect(repo.remove).not.toHaveBeenCalled();
    });

    it('lets the creador delete their own event', async () => {
      const evento = { id: 1, despachoId: 1, creadorId: 2 };
      const qb = createQueryBuilderMock({ getOne: jest.fn().mockResolvedValue(evento) });
      repo.createQueryBuilder.mockReturnValue(qb);
      await service.remove(1, colaboradorUser);
      expect(repo.remove).toHaveBeenCalledWith(evento);
    });
  });

  describe('getProximos', () => {
    it('never selects participantes password/2FA columns (regression guard for a real leak)', async () => {
      const qb = createQueryBuilderMock({ getMany: jest.fn().mockResolvedValue([]) });
      repo.createQueryBuilder.mockReturnValue(qb);
      await service.getProximos(adminUser);
      expect(qb.addSelect).toHaveBeenCalledWith(['p.id', 'p.nombre', 'p.apellido', 'p.avatar']);
    });

    it('restricts non-admins to their own events', async () => {
      const qb = createQueryBuilderMock({ getMany: jest.fn().mockResolvedValue([]) });
      repo.createQueryBuilder.mockReturnValue(qb);
      await service.getProximos(colaboradorUser);
      expect(qb.andWhere).toHaveBeenCalledWith('(e.creadorId = :uid OR p.id = :uid)', { uid: colaboradorUser.id });
    });
  });
});
