import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BadRequestException } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { Expediente } from '../expedientes/entities/expediente.entity';
import { Cliente } from '../clientes/entities/cliente.entity';
import { Pago } from '../pagos/entities/pago.entity';
import { EventoAgenda } from '../agenda/entities/evento-agenda.entity';
import { LogAuditoria } from '../auditoria/entities/log-auditoria.entity';
import { EstadisticasService } from '../estadisticas/estadisticas.service';

const repoMockFactory = () => ({
  find: jest.fn(),
  findOne: jest.fn(),
  count: jest.fn(),
  createQueryBuilder: jest.fn(),
});

describe('DashboardService', () => {
  let service: DashboardService;
  let estadisticasService: {
    getIngresosPeriodo: jest.Mock;
    getExpedientesEnFecha: jest.Mock;
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DashboardService,
        { provide: getRepositoryToken(Expediente), useFactory: repoMockFactory },
        { provide: getRepositoryToken(Cliente), useFactory: repoMockFactory },
        { provide: getRepositoryToken(Pago), useFactory: repoMockFactory },
        { provide: getRepositoryToken(EventoAgenda), useFactory: repoMockFactory },
        { provide: getRepositoryToken(LogAuditoria), useFactory: repoMockFactory },
        {
          provide: EstadisticasService,
          useValue: {
            getIngresosPeriodo: jest.fn(),
            getExpedientesEnFecha: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get(DashboardService);
    estadisticasService = module.get(EstadisticasService) as any;
  });

  describe('getResumenPeriodo', () => {
    it('rejects an invalid tipo before touching estadisticasService', async () => {
      await expect(service.getResumenPeriodo(1, 'semana', 2026, 1)).rejects.toThrow(BadRequestException);
      expect(estadisticasService.getIngresosPeriodo).not.toHaveBeenCalled();
    });

    it('rejects a valor out of range for the given tipo', async () => {
      await expect(service.getResumenPeriodo(1, 'mes', 2026, 13)).rejects.toThrow(BadRequestException);
    });

    it('compares agosto 2026 against julio 2026 and computes crecimiento', async () => {
      estadisticasService.getIngresosPeriodo
        .mockResolvedValueOnce({ monto: 1180, numTickets: 6 }) // actual (agosto)
        .mockResolvedValueOnce({ monto: 1000, numTickets: 5 }); // anterior (julio)
      estadisticasService.getExpedientesEnFecha
        .mockResolvedValueOnce([{ estado: 'activo', cantidad: 5 }, { estado: 'ganado', cantidad: 2 }]) // actual
        .mockResolvedValueOnce([{ estado: 'activo', cantidad: 4 }, { estado: 'ganado', cantidad: 1 }]); // anterior

      const result = await service.getResumenPeriodo(1, 'mes', 2026, 8);

      expect(result.periodo).toMatchObject({ tipo: 'mes', anio: 2026, valor: 8, etiqueta: 'Agosto 2026' });
      expect(result.periodoAnterior).toMatchObject({ anio: 2026, valor: 7, etiqueta: 'Julio 2026' });
      expect(result.ingresos.crecimientoMonto).toEqual({ delta: 180, porcentaje: 18 });
      expect(result.expedientes.actual).toMatchObject({ total: 7, activos: 5, ganados: 2 });
      expect(result.expedientes.crecimientoTotal).toEqual({ delta: 2, porcentaje: 40 });
    });

    it('wraps to the previous year when comparing enero against the prior december', async () => {
      estadisticasService.getIngresosPeriodo.mockResolvedValue({ monto: 0, numTickets: 0 });
      estadisticasService.getExpedientesEnFecha.mockResolvedValue([]);

      const result = await service.getResumenPeriodo(1, 'mes', 2026, 1);

      expect(result.periodoAnterior).toMatchObject({ anio: 2025, valor: 12 });
    });

    it('allows tipo anio without a valor', async () => {
      estadisticasService.getIngresosPeriodo.mockResolvedValue({ monto: 0, numTickets: 0 });
      estadisticasService.getExpedientesEnFecha.mockResolvedValue([]);

      const result = await service.getResumenPeriodo(1, 'anio', 2026);

      expect(result.periodo).toMatchObject({ tipo: 'anio', anio: 2026, valor: null });
      expect(result.periodoAnterior).toMatchObject({ anio: 2025, valor: null });
    });

    it('clamps the expediente snapshot date to today when the period extends into the future', async () => {
      estadisticasService.getIngresosPeriodo.mockResolvedValue({ monto: 0, numTickets: 0 });
      estadisticasService.getExpedientesEnFecha.mockResolvedValue([]);

      const hoy = new Date();
      await service.getResumenPeriodo(1, 'anio', hoy.getFullYear());

      const [, fechaConsultada] = estadisticasService.getExpedientesEnFecha.mock.calls[0];
      expect(fechaConsultada.toISOString().split('T')[0]).toBe(hoy.toISOString().split('T')[0]);
    });
  });

  describe('getResumenDia', () => {
    it('rejects when desde or hasta is missing', async () => {
      await expect(service.getResumenDia(1, '', '2026-08-15')).rejects.toThrow(BadRequestException);
      await expect(service.getResumenDia(1, '2026-08-01', '')).rejects.toThrow(BadRequestException);
    });

    it('rejects when desde is after hasta', async () => {
      await expect(service.getResumenDia(1, '2026-08-15', '2026-08-01')).rejects.toThrow(BadRequestException);
    });

    it('sums ingresos across the range and snapshots expedientes at hasta (not summed)', async () => {
      estadisticasService.getIngresosPeriodo.mockResolvedValue({ monto: 5000, numTickets: 3 });
      estadisticasService.getExpedientesEnFecha.mockResolvedValue([{ estado: 'activo', cantidad: 9 }]);

      const result = await service.getResumenDia(1, '2026-08-01', '2026-08-15');

      expect(estadisticasService.getIngresosPeriodo).toHaveBeenCalledWith(1, new Date('2026-08-01'), new Date('2026-08-15'));
      expect(estadisticasService.getExpedientesEnFecha).toHaveBeenCalledWith(1, new Date('2026-08-15'));
      expect(result).toEqual({
        desde: '2026-08-01', hasta: '2026-08-15',
        ingresos: { monto: 5000, numTickets: 3 },
        expedientes: { byStatus: [{ estado: 'activo', cantidad: 9 }], total: 9, activos: 9, ganados: 0 },
      });
    });
  });
});
