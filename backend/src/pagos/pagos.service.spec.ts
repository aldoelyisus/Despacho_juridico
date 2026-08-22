import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { PagosService } from './pagos.service';
import { Pago, EstadoPago } from './entities/pago.entity';
import { PagoDetalle } from './entities/pago-detalle.entity';
import { Servicio } from '../catalogos/entities/servicio.entity';
import { Expediente } from '../expedientes/entities/expediente.entity';
import { Cliente } from '../clientes/entities/cliente.entity';
import { TipoDescuento } from '../descuentos/entities/descuento.entity';
import { DescuentosService } from '../descuentos/descuentos.service';
import { CreatePagoDto } from './dto/create-pago.dto';
import { CreateAbonoDto } from './dto/create-abono.dto';

function createQueryBuilderMock(overrides: Record<string, any> = {}) {
  return {
    select: jest.fn().mockReturnThis(),
    addSelect: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    getRawOne: jest.fn(),
    ...overrides,
  };
}

const repoMockFactory = () => ({
  find: jest.fn(),
  findOne: jest.fn(),
  findAndCount: jest.fn(),
  count: jest.fn(),
  create: jest.fn((data) => data),
  save: jest.fn((data) => Promise.resolve({ id: 1, ...data })),
  update: jest.fn(),
  createQueryBuilder: jest.fn(),
});

describe('PagosService', () => {
  let service: PagosService;
  let repo: ReturnType<typeof repoMockFactory>;
  let detalleRepo: ReturnType<typeof repoMockFactory>;
  let servicioRepo: ReturnType<typeof repoMockFactory>;
  let expRepo: ReturnType<typeof repoMockFactory>;
  let clienteRepo: ReturnType<typeof repoMockFactory>;
  let descuentosService: { findOne: jest.Mock; calcularMontoConDescuento: jest.Mock };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PagosService,
        { provide: getRepositoryToken(Pago), useFactory: repoMockFactory },
        { provide: getRepositoryToken(PagoDetalle), useFactory: repoMockFactory },
        { provide: getRepositoryToken(Servicio), useFactory: repoMockFactory },
        { provide: getRepositoryToken(Expediente), useFactory: repoMockFactory },
        { provide: getRepositoryToken(Cliente), useFactory: repoMockFactory },
        { provide: DescuentosService, useValue: { findOne: jest.fn(), calcularMontoConDescuento: jest.fn() } },
      ],
    }).compile();

    service = module.get(PagosService);
    repo = module.get(getRepositoryToken(Pago));
    detalleRepo = module.get(getRepositoryToken(PagoDetalle));
    servicioRepo = module.get(getRepositoryToken(Servicio));
    expRepo = module.get(getRepositoryToken(Expediente));
    clienteRepo = module.get(getRepositoryToken(Cliente));
    descuentosService = module.get(DescuentosService) as any;
  });

  describe('findAll', () => {
    it('lists without a date filter when desde/hasta are not provided', async () => {
      repo.findAndCount.mockResolvedValue([[], 0]);
      await service.findAll(1, {});
      const [options] = repo.findAndCount.mock.calls[0];
      expect(options.where.createdAt).toBeUndefined();
    });

    it('filters by an inclusive date range when both desde and hasta are provided', async () => {
      repo.findAndCount.mockResolvedValue([[], 0]);
      await service.findAll(1, { desde: '2026-08-01', hasta: '2026-08-15' });
      const [options] = repo.findAndCount.mock.calls[0];
      expect(options.where.createdAt.value).toEqual([new Date('2026-08-01T00:00:00'), new Date('2026-08-15T23:59:59.999')]);
    });

    it('filters from desde onward when only desde is provided', async () => {
      repo.findAndCount.mockResolvedValue([[], 0]);
      await service.findAll(1, { desde: '2026-08-01' });
      const [options] = repo.findAndCount.mock.calls[0];
      expect(options.where.createdAt.value).toEqual(new Date('2026-08-01T00:00:00'));
    });

    it('filters up to hasta when only hasta is provided', async () => {
      repo.findAndCount.mockResolvedValue([[], 0]);
      await service.findAll(1, { hasta: '2026-08-15' });
      const [options] = repo.findAndCount.mock.calls[0];
      expect(options.where.createdAt.value).toEqual(new Date('2026-08-15T23:59:59.999'));
    });
  });

  describe('findOne', () => {
    it('throws NotFoundException when the pago does not belong to the despacho', async () => {
      repo.findOne.mockResolvedValue(null);
      await expect(service.findOne(1, 1)).rejects.toThrow(NotFoundException);
    });
  });

  describe('create', () => {
    it('throws NotFoundException when the cliente does not belong to the despacho', async () => {
      clienteRepo.findOne.mockResolvedValue(null);
      await expect(
        service.create({ clienteId: 99, servicioId: 1 } as CreatePagoDto, 1, 5),
      ).rejects.toThrow(NotFoundException);
      expect(repo.save).not.toHaveBeenCalled();
    });

    it('throws NotFoundException when the expediente does not belong to the despacho', async () => {
      clienteRepo.findOne.mockResolvedValue({ id: 4, despachoId: 1 });
      expRepo.findOne.mockResolvedValue(null);
      await expect(
        service.create({ clienteId: 4, expedienteId: 77, servicioId: 1 } as CreatePagoDto, 1, 5),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws NotFoundException when the servicio does not belong to the despacho', async () => {
      clienteRepo.findOne.mockResolvedValue({ id: 4, despachoId: 1 });
      servicioRepo.findOne.mockResolvedValue(null);
      await expect(
        service.create({ clienteId: 4, servicioId: 99 } as CreatePagoDto, 1, 5),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws BadRequestException when the descuento is inactive', async () => {
      clienteRepo.findOne.mockResolvedValue({ id: 4, despachoId: 1 });
      servicioRepo.findOne.mockResolvedValue({ id: 1, despachoId: 1, nombre: 'Consulta', costo: 1000 });
      descuentosService.findOne.mockResolvedValue({ id: 2, activo: false });
      await expect(
        service.create({ clienteId: 4, servicioId: 1, descuentoId: 2 } as CreatePagoDto, 1, 5),
      ).rejects.toThrow(BadRequestException);
    });

    it('applies a single descuento and computes montoTotal/montoDescuento', async () => {
      clienteRepo.findOne.mockResolvedValue({ id: 4, despachoId: 1 });
      servicioRepo.findOne.mockResolvedValue({ id: 1, despachoId: 1, nombre: 'Consulta', costo: 1000 });
      descuentosService.findOne.mockResolvedValue({ id: 2, activo: true, tipo: TipoDescuento.PORCENTAJE, valor: 10 });
      descuentosService.calcularMontoConDescuento.mockReturnValue({ montoDescuento: 100, montoFinal: 900 });
      repo.count.mockResolvedValue(0);

      const result = await service.create({ clienteId: 4, servicioId: 1, descuentoId: 2 } as CreatePagoDto, 1, 5);

      expect(result.montoOriginal).toBe(1000);
      expect(result.montoDescuento).toBe(100);
      expect(result.montoTotal).toBe(900);
      expect(result.montoPendiente).toBe(900);
      expect(result.montoPagado).toBe(0);
      expect(result.estado).toBe(EstadoPago.PENDIENTE);
      expect(result.numero).toMatch(/^REC-\d{4}-0001$/);
    });

    it('defaults concepto to the servicio name and uses the full costo with no descuento', async () => {
      clienteRepo.findOne.mockResolvedValue({ id: 4, despachoId: 1 });
      servicioRepo.findOne.mockResolvedValue({ id: 1, despachoId: 1, nombre: 'Consulta Jurídica', costo: 500 });
      repo.count.mockResolvedValue(2);

      const result = await service.create({ clienteId: 4, servicioId: 1 } as CreatePagoDto, 1, 5);

      expect(result.concepto).toBe('Consulta Jurídica');
      expect(result.montoTotal).toBe(500);
      expect(result.montoDescuento).toBe(0);
      expect(descuentosService.findOne).not.toHaveBeenCalled();
    });

    it('recalculates the expediente total when a expedienteId is provided', async () => {
      clienteRepo.findOne.mockResolvedValue({ id: 4, despachoId: 1 });
      expRepo.findOne.mockResolvedValue({ id: 8, despachoId: 1 });
      servicioRepo.findOne.mockResolvedValue({ id: 1, despachoId: 1, nombre: 'Consulta', costo: 500 });
      repo.count.mockResolvedValue(0);
      const qb = createQueryBuilderMock({ getRawOne: jest.fn().mockResolvedValue({ total: '500' }) });
      repo.createQueryBuilder.mockReturnValue(qb);

      await service.create({ clienteId: 4, expedienteId: 8, servicioId: 1 } as CreatePagoDto, 1, 5);

      expect(expRepo.update).toHaveBeenCalledWith({ id: 8, despachoId: 1 }, { montoTotal: 500 });
    });
  });

  describe('registrarAbono', () => {
    it('throws NotFoundException when the pago does not belong to the despacho', async () => {
      repo.findOne.mockResolvedValue(null);
      await expect(
        service.registrarAbono(1, { monto: 100, fechaPago: '2026-08-20' } as CreateAbonoDto, 1),
      ).rejects.toThrow(NotFoundException);
    });

    it('rejects an abono on a cancelled pago', async () => {
      repo.findOne.mockResolvedValue({ id: 1, despachoId: 1, estado: EstadoPago.CANCELADO, montoPendiente: 500, montoTotal: 500, montoPagado: 0, detalles: [] });
      await expect(
        service.registrarAbono(1, { monto: 100, fechaPago: '2026-08-20' } as CreateAbonoDto, 1),
      ).rejects.toThrow(BadRequestException);
      expect(detalleRepo.save).not.toHaveBeenCalled();
    });

    it('rejects an abono when the pago is already fully paid', async () => {
      repo.findOne.mockResolvedValue({ id: 1, despachoId: 1, estado: EstadoPago.PAGADO, montoPendiente: 0, montoTotal: 500, montoPagado: 500, detalles: [] });
      await expect(
        service.registrarAbono(1, { monto: 50, fechaPago: '2026-08-20' } as CreateAbonoDto, 1),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects an abono greater than the remaining balance', async () => {
      repo.findOne.mockResolvedValue({ id: 1, despachoId: 1, estado: EstadoPago.PENDIENTE, montoPendiente: 300, montoTotal: 500, montoPagado: 200, detalles: [] });
      await expect(
        service.registrarAbono(1, { monto: 400, fechaPago: '2026-08-20' } as CreateAbonoDto, 1),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects a partial abono that does not cover the full pending balance', async () => {
      repo.findOne.mockResolvedValue({ id: 1, despachoId: 1, estado: EstadoPago.PENDIENTE, montoPendiente: 500, montoTotal: 500, montoPagado: 0, detalles: [] });
      await expect(
        service.registrarAbono(1, { monto: 200, fechaPago: '2026-08-20' } as CreateAbonoDto, 1),
      ).rejects.toThrow(BadRequestException);
      expect(detalleRepo.save).not.toHaveBeenCalled();
    });

    it('marks the pago as pagado when the abono covers the full remaining balance exactly', async () => {
      repo.findOne.mockResolvedValue({ id: 1, despachoId: 1, estado: EstadoPago.PENDIENTE, montoPendiente: 300, montoTotal: 500, montoPagado: 200, detalles: [] });
      const result = await service.registrarAbono(1, { monto: 300, fechaPago: '2026-08-20' } as CreateAbonoDto, 1);
      expect(result.montoPagado).toBe(500);
      expect(result.montoPendiente).toBe(0);
      expect(result.estado).toBe(EstadoPago.PAGADO);
    });

    it('tolerates sub-cent floating point noise when comparing to the pending balance', async () => {
      repo.findOne.mockResolvedValue({ id: 1, despachoId: 1, estado: EstadoPago.PENDIENTE, montoPendiente: 0.1 + 0.2, montoTotal: 0.3, montoPagado: 0, detalles: [] });
      const result = await service.registrarAbono(1, { monto: 0.3, fechaPago: '2026-08-20' } as CreateAbonoDto, 1);
      expect(result.estado).toBe(EstadoPago.PAGADO);
    });
  });

  describe('getStats', () => {
    it('returns totalRecaudado and totalPagos from the aggregate query', async () => {
      const qb = createQueryBuilderMock({ getRawOne: jest.fn().mockResolvedValue({ totalRecaudado: '1500.00', totalPagos: '4' }) });
      repo.createQueryBuilder.mockReturnValue(qb);
      const result = await service.getStats(1, {});
      expect(result).toEqual({ totalRecaudado: '1500.00', totalPagos: '4' });
    });
  });
});

describe('CreatePagoDto validation', () => {
  it('rejects a missing clienteId', async () => {
    const dto = plainToInstance(CreatePagoDto, { servicioId: 1 });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'clienteId')).toBe(true);
  });

  it('rejects a missing servicioId', async () => {
    const dto = plainToInstance(CreatePagoDto, { clienteId: 1 });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'servicioId')).toBe(true);
  });

  it('rejects a non-numeric descuentoId', async () => {
    const dto = plainToInstance(CreatePagoDto, { clienteId: 1, servicioId: 1, descuentoId: 'a' });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'descuentoId')).toBe(true);
  });

  it('accepts valid input with a single descuento', async () => {
    const dto = plainToInstance(CreatePagoDto, { clienteId: 1, servicioId: 2, descuentoId: 3 });
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });
});

describe('CreateAbonoDto validation', () => {
  it('rejects a missing monto', async () => {
    const dto = plainToInstance(CreateAbonoDto, { fechaPago: '2026-08-20' });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'monto')).toBe(true);
  });

  it('rejects a zero or negative monto', async () => {
    const dto = plainToInstance(CreateAbonoDto, { monto: 0, fechaPago: '2026-08-20' });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'monto')).toBe(true);
  });

  it('rejects a missing fechaPago', async () => {
    const dto = plainToInstance(CreateAbonoDto, { monto: 100 });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'fechaPago')).toBe(true);
  });

  it('accepts valid input', async () => {
    const dto = plainToInstance(CreateAbonoDto, { monto: 100, fechaPago: '2026-08-20' });
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });
});
