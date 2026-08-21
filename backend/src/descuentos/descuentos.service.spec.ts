import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { DescuentosService } from './descuentos.service';
import { Descuento, TipoDescuento } from './entities/descuento.entity';
import { Pago } from '../pagos/entities/pago.entity';
import { CreateDescuentoDto } from './dto/create-descuento.dto';

const repoMockFactory = () => ({
  find: jest.fn(),
  findOne: jest.fn(),
  create: jest.fn((data) => data),
  save: jest.fn((data) => Promise.resolve({ id: 1, ...data })),
  remove: jest.fn((data) => Promise.resolve(data)),
  count: jest.fn(),
});

describe('DescuentosService', () => {
  let service: DescuentosService;
  let repo: ReturnType<typeof repoMockFactory>;
  let pagoRepo: ReturnType<typeof repoMockFactory>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DescuentosService,
        { provide: getRepositoryToken(Descuento), useFactory: repoMockFactory },
        { provide: getRepositoryToken(Pago), useFactory: repoMockFactory },
      ],
    }).compile();

    service = module.get(DescuentosService);
    repo = module.get(getRepositoryToken(Descuento));
    pagoRepo = module.get(getRepositoryToken(Pago));
  });

  describe('create', () => {
    it('rejects a percentage discount greater than 100', async () => {
      await expect(
        service.create({ nombre: 'Promo', tipo: TipoDescuento.PORCENTAJE, valor: 150 } as any, 1),
      ).rejects.toThrow(BadRequestException);
      expect(repo.save).not.toHaveBeenCalled();
    });

    it('allows a fixed-amount discount above 100', async () => {
      repo.findOne.mockResolvedValue(null);
      const result = await service.create({ nombre: 'Promo', tipo: TipoDescuento.MONTO_FIJO, valor: 500 } as any, 1);
      expect(result).toMatchObject({ nombre: 'Promo', valor: 500, despachoId: 1 });
    });

    it('rejects a duplicate name within the same despacho', async () => {
      repo.findOne.mockResolvedValue({ id: 3 });
      await expect(
        service.create({ nombre: 'Clientes VIP', tipo: TipoDescuento.PORCENTAJE, valor: 10 } as any, 1),
      ).rejects.toThrow(ConflictException);
    });

    it('trims the name and creates successfully when there is no duplicate', async () => {
      repo.findOne.mockResolvedValue(null);
      const result = await service.create({ nombre: '  Clientes VIP  ', tipo: TipoDescuento.PORCENTAJE, valor: 10 } as any, 1);
      expect(repo.create.mock.calls[0][0].nombre).toBe('Clientes VIP');
    });
  });

  describe('update', () => {
    it('throws NotFoundException for a descuento in another despacho', async () => {
      repo.findOne.mockResolvedValue(null);
      await expect(service.update(1, { valor: 20 } as any, 1)).rejects.toThrow(NotFoundException);
    });

    it('rejects raising valor above 100 when the existing tipo is porcentaje and tipo is not resent', async () => {
      repo.findOne.mockResolvedValueOnce({ id: 1, despachoId: 1, tipo: TipoDescuento.PORCENTAJE, valor: 10 });
      await expect(service.update(1, { valor: 200 } as any, 1)).rejects.toThrow(BadRequestException);
    });

    it('rejects renaming to a name already used by another descuento', async () => {
      repo.findOne
        .mockResolvedValueOnce({ id: 4, despachoId: 1, tipo: TipoDescuento.PORCENTAJE, valor: 10 }) // findDescuentoOrFail
        .mockResolvedValueOnce({ id: 9 }); // duplicate check
      await expect(service.update(4, { nombre: 'Otro' } as any, 1)).rejects.toThrow(ConflictException);
    });

    it('updates the valor without requiring tipo to be resent', async () => {
      repo.findOne.mockResolvedValueOnce({ id: 1, despachoId: 1, tipo: TipoDescuento.PORCENTAJE, valor: 10 });
      const result = await service.update(1, { valor: 25 } as any, 1);
      expect(result.valor).toBe(25);
    });
  });

  describe('remove', () => {
    it('throws NotFoundException for a descuento in another despacho', async () => {
      repo.findOne.mockResolvedValue(null);
      await expect(service.remove(1, 1)).rejects.toThrow(NotFoundException);
    });

    it('rejects deletion when the descuento was used in registered pagos', async () => {
      repo.findOne.mockResolvedValue({ id: 1, despachoId: 1, nombre: 'Promo' });
      pagoRepo.count.mockResolvedValue(3);
      await expect(service.remove(1, 1)).rejects.toThrow(ConflictException);
      expect(repo.remove).not.toHaveBeenCalled();
    });

    it('removes the descuento when it was never used in a pago', async () => {
      const descuento = { id: 1, despachoId: 1, nombre: 'Promo' };
      repo.findOne.mockResolvedValue(descuento);
      pagoRepo.count.mockResolvedValue(0);
      const result = await service.remove(1, 1);
      expect(result).toEqual(descuento);
    });
  });

  describe('calcularMontoConDescuento', () => {
    it('computes a percentage discount rounded to 2 decimals', () => {
      const result = service.calcularMontoConDescuento(199.99, { tipo: TipoDescuento.PORCENTAJE, valor: 10 } as Descuento);
      expect(result.montoDescuento).toBe(20);
      expect(result.montoFinal).toBe(179.99);
    });

    it('caps a fixed-amount discount at the original amount so it never goes negative', () => {
      const result = service.calcularMontoConDescuento(50, { tipo: TipoDescuento.MONTO_FIJO, valor: 500 } as Descuento);
      expect(result.montoDescuento).toBe(50);
      expect(result.montoFinal).toBe(0);
    });
  });
});

describe('CreateDescuentoDto validation', () => {
  it('rejects an empty nombre', async () => {
    const dto = plainToInstance(CreateDescuentoDto, { tipo: TipoDescuento.PORCENTAJE, valor: 10 });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'nombre')).toBe(true);
  });

  it('rejects an invalid tipo', async () => {
    const dto = plainToInstance(CreateDescuentoDto, { nombre: 'Promo', tipo: 'inventado', valor: 10 });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'tipo')).toBe(true);
  });

  it('rejects a missing valor', async () => {
    const dto = plainToInstance(CreateDescuentoDto, { nombre: 'Promo', tipo: TipoDescuento.PORCENTAJE });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'valor')).toBe(true);
  });

  it('rejects a zero or negative valor', async () => {
    const dto = plainToInstance(CreateDescuentoDto, { nombre: 'Promo', tipo: TipoDescuento.PORCENTAJE, valor: 0 });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'valor')).toBe(true);
  });

  it('rejects a non-numeric valor', async () => {
    const dto = plainToInstance(CreateDescuentoDto, { nombre: 'Promo', tipo: TipoDescuento.PORCENTAJE, valor: 'diez' });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'valor')).toBe(true);
  });

  it('accepts valid input', async () => {
    const dto = plainToInstance(CreateDescuentoDto, { nombre: 'Promo', tipo: TipoDescuento.PORCENTAJE, valor: 15 });
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });
});
