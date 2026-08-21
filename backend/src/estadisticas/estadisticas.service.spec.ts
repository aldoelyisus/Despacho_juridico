import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { EstadisticasService } from './estadisticas.service';
import { IngresoDiarioDespacho } from './entities/ingreso-diario-despacho.entity';
import { IngresoMensualDespacho } from './entities/ingreso-mensual-despacho.entity';
import { ExpedienteEstadoSnapshot } from './entities/expediente-estado-snapshot.entity';
import { PagoDetalle } from '../pagos/entities/pago-detalle.entity';
import { Expediente, EstadoExpediente } from '../expedientes/entities/expediente.entity';

function createQueryBuilderMock(overrides: Record<string, any> = {}) {
  return {
    select: jest.fn().mockReturnThis(),
    addSelect: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    groupBy: jest.fn().mockReturnThis(),
    addGroupBy: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    getRawMany: jest.fn().mockResolvedValue([]),
    getRawOne: jest.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

const repoMockFactory = () => ({
  find: jest.fn(),
  findOne: jest.fn(),
  count: jest.fn(),
  create: jest.fn((data) => data),
  save: jest.fn((data) => Promise.resolve({ id: 1, ...data })),
  update: jest.fn(),
  createQueryBuilder: jest.fn(),
});

describe('EstadisticasService', () => {
  let service: EstadisticasService;
  let ingresoDiarioRepo: ReturnType<typeof repoMockFactory>;
  let ingresoMensualRepo: ReturnType<typeof repoMockFactory>;
  let snapshotRepo: ReturnType<typeof repoMockFactory>;
  let pagoDetalleRepo: ReturnType<typeof repoMockFactory>;
  let expedienteRepo: ReturnType<typeof repoMockFactory>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EstadisticasService,
        { provide: getRepositoryToken(IngresoDiarioDespacho), useFactory: repoMockFactory },
        { provide: getRepositoryToken(IngresoMensualDespacho), useFactory: repoMockFactory },
        { provide: getRepositoryToken(ExpedienteEstadoSnapshot), useFactory: repoMockFactory },
        { provide: getRepositoryToken(PagoDetalle), useFactory: repoMockFactory },
        { provide: getRepositoryToken(Expediente), useFactory: repoMockFactory },
      ],
    }).compile();

    service = module.get(EstadisticasService);
    ingresoDiarioRepo = module.get(getRepositoryToken(IngresoDiarioDespacho));
    ingresoMensualRepo = module.get(getRepositoryToken(IngresoMensualDespacho));
    snapshotRepo = module.get(getRepositoryToken(ExpedienteEstadoSnapshot));
    pagoDetalleRepo = module.get(getRepositoryToken(PagoDetalle));
    expedienteRepo = module.get(getRepositoryToken(Expediente));
  });

  describe('rollupIngresosDia', () => {
    it('sums PagoDetalle by despacho for the given date and creates a new row when none exists', async () => {
      const qb = createQueryBuilderMock({
        getRawMany: jest.fn().mockResolvedValue([{ despachoId: '1', montoTotal: '900.00', numTickets: '3' }]),
      });
      pagoDetalleRepo.createQueryBuilder.mockReturnValue(qb);
      ingresoDiarioRepo.findOne.mockResolvedValue(null);

      const result = await service.rollupIngresosDia(new Date('2026-08-20'));

      expect(qb.where).toHaveBeenCalledWith('d.fechaPago = :fecha', { fecha: '2026-08-20' });
      expect(ingresoDiarioRepo.create).toHaveBeenCalledWith({ despachoId: 1, fecha: '2026-08-20', montoTotal: 900, numTickets: 3 });
      expect(result).toEqual({ despachos: 1, fecha: '2026-08-20' });
    });

    it('updates the existing row instead of creating a duplicate (idempotent re-run)', async () => {
      const qb = createQueryBuilderMock({
        getRawMany: jest.fn().mockResolvedValue([{ despachoId: '1', montoTotal: '900.00', numTickets: '3' }]),
      });
      pagoDetalleRepo.createQueryBuilder.mockReturnValue(qb);
      ingresoDiarioRepo.findOne.mockResolvedValue({ id: 7, despachoId: 1, fecha: '2026-08-20' });

      await service.rollupIngresosDia(new Date('2026-08-20'));

      expect(ingresoDiarioRepo.update).toHaveBeenCalledWith(7, { montoTotal: 900, numTickets: 3 });
      expect(ingresoDiarioRepo.create).not.toHaveBeenCalled();
    });

    it('writes nothing for a day with no abonos', async () => {
      pagoDetalleRepo.createQueryBuilder.mockReturnValue(createQueryBuilderMock());
      const result = await service.rollupIngresosDia(new Date('2026-08-20'));
      expect(result.despachos).toBe(0);
      expect(ingresoDiarioRepo.save).not.toHaveBeenCalled();
      expect(ingresoDiarioRepo.update).not.toHaveBeenCalled();
    });
  });

  describe('rollupIngresosMes', () => {
    it('sums the daily rows of the month and upserts the monthly row', async () => {
      const qb = createQueryBuilderMock({
        getRawMany: jest.fn().mockResolvedValue([{ despachoId: '1', montoTotal: '5000.00', numTickets: '20' }]),
      });
      ingresoDiarioRepo.createQueryBuilder.mockReturnValue(qb);
      ingresoMensualRepo.findOne.mockResolvedValue(null);

      const result = await service.rollupIngresosMes(2026, 8);

      expect(qb.where).toHaveBeenCalledWith('d.fecha BETWEEN :inicio AND :fin', { inicio: '2026-08-01', fin: '2026-08-31' });
      expect(ingresoMensualRepo.create).toHaveBeenCalledWith({ despachoId: 1, anio: 2026, mes: 8, montoTotal: 5000, numTickets: 20 });
      expect(result).toEqual({ despachos: 1, periodo: '8/2026' });
    });

    it('updates the existing monthly row instead of duplicating it', async () => {
      const qb = createQueryBuilderMock({
        getRawMany: jest.fn().mockResolvedValue([{ despachoId: '1', montoTotal: '5000.00', numTickets: '20' }]),
      });
      ingresoDiarioRepo.createQueryBuilder.mockReturnValue(qb);
      ingresoMensualRepo.findOne.mockResolvedValue({ id: 3, despachoId: 1, anio: 2026, mes: 8 });

      await service.rollupIngresosMes(2026, 8);

      expect(ingresoMensualRepo.update).toHaveBeenCalledWith(3, { montoTotal: 5000, numTickets: 20 });
    });
  });

  describe('snapshotExpedientesHoy', () => {
    it('stores one row per despacho+estado combination found today', async () => {
      const qb = createQueryBuilderMock({
        getRawMany: jest.fn().mockResolvedValue([
          { despachoId: '1', estado: EstadoExpediente.ACTIVO, cantidad: '2' },
          { despachoId: '1', estado: EstadoExpediente.GANADO, cantidad: '5' },
        ]),
      });
      expedienteRepo.createQueryBuilder.mockReturnValue(qb);
      snapshotRepo.findOne.mockResolvedValue(null);

      const result = await service.snapshotExpedientesHoy();

      expect(snapshotRepo.create).toHaveBeenCalledWith(expect.objectContaining({ despachoId: 1, estado: EstadoExpediente.ACTIVO, cantidad: 2 }));
      expect(snapshotRepo.create).toHaveBeenCalledWith(expect.objectContaining({ despachoId: 1, estado: EstadoExpediente.GANADO, cantidad: 5 }));
      expect(result.filas).toBe(2);
    });

    it('overwrites the count in place — never accumulates across runs on the same day', async () => {
      const qb = createQueryBuilderMock({
        getRawMany: jest.fn().mockResolvedValue([{ despachoId: '1', estado: EstadoExpediente.ACTIVO, cantidad: '2' }]),
      });
      expedienteRepo.createQueryBuilder.mockReturnValue(qb);
      snapshotRepo.findOne.mockResolvedValue({ id: 9, despachoId: 1, estado: EstadoExpediente.ACTIVO, cantidad: 2 });

      await service.snapshotExpedientesHoy();

      expect(snapshotRepo.update).toHaveBeenCalledWith(9, { cantidad: 2 });
      expect(snapshotRepo.create).not.toHaveBeenCalled();
    });
  });

  describe('getIngresoRango — combina rollup cerrado + hoy en vivo', () => {
    it('sums only the rollup when the range ends before today', async () => {
      const qb = createQueryBuilderMock({ getRawOne: jest.fn().mockResolvedValue({ total: '1000' }) });
      ingresoDiarioRepo.createQueryBuilder.mockReturnValue(qb);

      const total = await service.getIngresoRango(1, new Date('2020-01-01'), new Date('2020-01-31'));
      expect(total).toBe(1000);
      expect(pagoDetalleRepo.createQueryBuilder).not.toHaveBeenCalled();
    });

    it('adds the live sum for today when the range includes it', async () => {
      const rollupQb = createQueryBuilderMock({ getRawOne: jest.fn().mockResolvedValue({ total: '1000' }) });
      const liveQb = createQueryBuilderMock({ getRawOne: jest.fn().mockResolvedValue({ total: '250' }) });
      ingresoDiarioRepo.createQueryBuilder.mockReturnValue(rollupQb);
      pagoDetalleRepo.createQueryBuilder.mockReturnValue(liveQb);

      const hoy = new Date();
      const inicioMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
      const total = await service.getIngresoRango(1, inicioMes, hoy);

      expect(total).toBe(1250);
    });
  });

  describe('getIngresoMes', () => {
    it('reads the consolidated row for a past month without touching the daily tables', async () => {
      ingresoMensualRepo.findOne.mockResolvedValue({ id: 1, despachoId: 1, anio: 2020, mes: 1, montoTotal: 4200 });
      const total = await service.getIngresoMes(1, 2020, 1);
      expect(total).toBe(4200);
      expect(ingresoDiarioRepo.createQueryBuilder).not.toHaveBeenCalled();
    });

    it('returns 0 for a past month with no recorded income instead of throwing', async () => {
      ingresoMensualRepo.findOne.mockResolvedValue(null);
      const total = await service.getIngresoMes(1, 2020, 1);
      expect(total).toBe(0);
    });

    it('computes the current month live instead of reading the (not yet closed) monthly rollup', async () => {
      const hoy = new Date();
      const rollupQb = createQueryBuilderMock({ getRawOne: jest.fn().mockResolvedValue({ total: '300' }) });
      const liveQb = createQueryBuilderMock({ getRawOne: jest.fn().mockResolvedValue({ total: '50' }) });
      ingresoDiarioRepo.createQueryBuilder.mockReturnValue(rollupQb);
      pagoDetalleRepo.createQueryBuilder.mockReturnValue(liveQb);

      const total = await service.getIngresoMes(1, hoy.getFullYear(), hoy.getMonth() + 1);

      expect(total).toBe(350);
      expect(ingresoMensualRepo.findOne).not.toHaveBeenCalled();
    });
  });

  describe('getExpedientesHistorico', () => {
    it('reads snapshot rows from the last N days, ordered chronologically', async () => {
      snapshotRepo.find.mockResolvedValue([{ fecha: '2026-08-18' }, { fecha: '2026-08-19' }]);
      const result = await service.getExpedientesHistorico(1, 30);
      expect(snapshotRepo.find).toHaveBeenCalledWith(expect.objectContaining({
        where: expect.objectContaining({ despachoId: 1 }),
        order: { fecha: 'ASC' },
      }));
      expect(result).toHaveLength(2);
    });
  });

  describe('ensureBackfillIngresos', () => {
    it('skips the backfill when rollup data already exists', async () => {
      ingresoDiarioRepo.count.mockResolvedValue(5);
      const result = await service.ensureBackfillIngresos();
      expect(result).toEqual({ ejecutado: false });
      expect(pagoDetalleRepo.createQueryBuilder).not.toHaveBeenCalled();
    });

    it('runs the backfill exactly once when the table is empty', async () => {
      ingresoDiarioRepo.count.mockResolvedValue(0);
      const diasQb = createQueryBuilderMock({ getRawMany: jest.fn().mockResolvedValue([{ fecha: '2026-01-15' }, { fecha: '2026-02-03' }]) });
      pagoDetalleRepo.createQueryBuilder.mockReturnValue(diasQb);
      const rollupDiaSpy = jest.spyOn(service, 'rollupIngresosDia').mockResolvedValue({ despachos: 1, fecha: 'x' } as any);
      const rollupMesSpy = jest.spyOn(service, 'rollupIngresosMes').mockResolvedValue({ despachos: 1, periodo: 'x' } as any);

      const result = await service.ensureBackfillIngresos();

      expect(result.ejecutado).toBe(true);
      expect(rollupDiaSpy).toHaveBeenCalledTimes(2);
      expect(rollupMesSpy).toHaveBeenCalledTimes(2); // enero y febrero
    });
  });
});
