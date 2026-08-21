import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CatalogosService } from './catalogos.service';
import { AreaDerecho } from './entities/area-derecho.entity';
import { Subarea } from './entities/subarea.entity';
import { Servicio } from './entities/servicio.entity';
import { Expediente } from '../expedientes/entities/expediente.entity';
import { AuditoriaService } from '../auditoria/auditoria.service';
import { CreateAreaDto } from './dto/create-area.dto';
import { CreateSubareaDto } from './dto/create-subarea.dto';
import { CreateServicioDto } from './dto/create-servicio.dto';

const repoMockFactory = () => ({
  find: jest.fn(),
  findOne: jest.fn(),
  findAndCount: jest.fn(),
  create: jest.fn((data) => data),
  save: jest.fn((data) => Promise.resolve({ id: 1, ...data })),
  update: jest.fn(),
  count: jest.fn(),
});

describe('CatalogosService', () => {
  let service: CatalogosService;
  let areaRepo: ReturnType<typeof repoMockFactory>;
  let subareaRepo: ReturnType<typeof repoMockFactory>;
  let servicioRepo: ReturnType<typeof repoMockFactory>;
  let expedienteRepo: ReturnType<typeof repoMockFactory>;
  let auditoriaService: { log: jest.Mock };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CatalogosService,
        { provide: getRepositoryToken(AreaDerecho), useFactory: repoMockFactory },
        { provide: getRepositoryToken(Subarea), useFactory: repoMockFactory },
        { provide: getRepositoryToken(Servicio), useFactory: repoMockFactory },
        { provide: getRepositoryToken(Expediente), useFactory: repoMockFactory },
        { provide: AuditoriaService, useValue: { log: jest.fn().mockResolvedValue(undefined) } },
      ],
    }).compile();

    service = module.get(CatalogosService);
    areaRepo = module.get(getRepositoryToken(AreaDerecho));
    subareaRepo = module.get(getRepositoryToken(Subarea));
    servicioRepo = module.get(getRepositoryToken(Servicio));
    expedienteRepo = module.get(getRepositoryToken(Expediente));
    auditoriaService = module.get(AuditoriaService) as any;
  });

  describe('getAreas', () => {
    it('caps limite at 100 and floors pagina at 1', async () => {
      areaRepo.findAndCount.mockResolvedValue([[], 0]);
      const result = await service.getAreas(1, { pagina: -3, limite: 500 });
      expect(result.pagina).toBe(1);
      expect(result.limite).toBe(100);
    });

    it('logs a BUSCAR audit entry only when a search term is provided', async () => {
      areaRepo.findAndCount.mockResolvedValue([[], 2]);
      await service.getAreas(1, { busqueda: 'civil' }, { id: 9, nombre: 'Ana', apellido: 'Ruiz' }, '127.0.0.1');
      expect(auditoriaService.log).toHaveBeenCalledWith(expect.objectContaining({
        despachoId: 1, usuarioId: 9, accion: 'BUSCAR', modulo: 'CATALOGOS',
      }));
    });

    it('does not log when there is no search term', async () => {
      areaRepo.findAndCount.mockResolvedValue([[], 0]);
      await service.getAreas(1, {}, { id: 9, nombre: 'Ana', apellido: 'Ruiz' }, '127.0.0.1');
      expect(auditoriaService.log).not.toHaveBeenCalled();
    });
  });

  describe('createArea', () => {
    it('rejects a duplicate name within the same despacho', async () => {
      areaRepo.findOne.mockResolvedValue({ id: 5 });
      await expect(service.createArea({ nombre: 'Civil' } as any, 1)).rejects.toThrow(ConflictException);
    });

    it('trims the name and creates successfully when there is no duplicate', async () => {
      areaRepo.findOne.mockResolvedValue(null);
      const result = await service.createArea({ nombre: '  Civil  ' } as any, 1);
      expect(areaRepo.create.mock.calls[0][0].nombre).toBe('Civil');
      expect(result).toMatchObject({ nombre: 'Civil', despachoId: 1 });
    });
  });

  describe('updateArea', () => {
    it('excludes the record itself when checking for duplicate names', async () => {
      areaRepo.findOne
        .mockResolvedValueOnce({ id: 7, despachoId: 1, nombre: 'Civil' }) // findAreaOrFail
        .mockResolvedValueOnce(null); // duplicate check
      await service.updateArea(7, { nombre: 'Civil' } as any, 1);
      expect(areaRepo.findOne.mock.calls[1][0].where.id).not.toBeUndefined();
    });

    it('throws NotFoundException for an area in another despacho', async () => {
      areaRepo.findOne.mockResolvedValue(null);
      await expect(service.updateArea(1, {} as any, 1)).rejects.toThrow(NotFoundException);
    });
  });

  describe('deleteArea', () => {
    it('rejects when the area has active subareas or linked expedientes', async () => {
      areaRepo.findOne.mockResolvedValue({ id: 1, despachoId: 1, activo: true });
      subareaRepo.count.mockResolvedValue(2);
      expedienteRepo.count.mockResolvedValue(3);
      await expect(service.deleteArea(1, 1)).rejects.toThrow(ConflictException);
      expect(areaRepo.save).not.toHaveBeenCalled();
    });

    it('deactivates and returns the entity when there are no dependents', async () => {
      areaRepo.findOne.mockResolvedValue({ id: 1, despachoId: 1, nombre: 'Civil', activo: true });
      subareaRepo.count.mockResolvedValue(0);
      expedienteRepo.count.mockResolvedValue(0);
      const result = await service.deleteArea(1, 1);
      expect(result.activo).toBe(false);
      expect(result.nombre).toBe('Civil');
    });
  });

  describe('createSubarea', () => {
    it('throws NotFoundException when the area does not exist in this despacho', async () => {
      areaRepo.findOne.mockResolvedValue(null);
      await expect(service.createSubarea({ nombre: 'Contratos', areaId: 99 } as any, 1)).rejects.toThrow(NotFoundException);
    });

    it('rejects a duplicate name within the same area', async () => {
      areaRepo.findOne.mockResolvedValue({ id: 1, despachoId: 1 });
      subareaRepo.findOne.mockResolvedValue({ id: 8 });
      await expect(service.createSubarea({ nombre: 'Contratos', areaId: 1 } as any, 1)).rejects.toThrow(ConflictException);
    });

    it('allows the same subarea name in a different area', async () => {
      areaRepo.findOne.mockResolvedValue({ id: 2, despachoId: 1 });
      subareaRepo.findOne.mockResolvedValue(null); // no duplicate found scoped to areaId 2
      const result = await service.createSubarea({ nombre: 'Contratos', areaId: 2 } as any, 1);
      expect(result).toMatchObject({ nombre: 'Contratos', areaId: 2, despachoId: 1 });
    });
  });

  describe('deleteSubarea', () => {
    it('rejects when the subarea has linked expedientes', async () => {
      subareaRepo.findOne.mockResolvedValue({ id: 1, despachoId: 1, activo: true });
      expedienteRepo.count.mockResolvedValue(4);
      await expect(service.deleteSubarea(1, 1)).rejects.toThrow(ConflictException);
    });

    it('deactivates and returns the entity when there are no dependents', async () => {
      subareaRepo.findOne.mockResolvedValue({ id: 1, despachoId: 1, nombre: 'Contratos', activo: true });
      expedienteRepo.count.mockResolvedValue(0);
      const result = await service.deleteSubarea(1, 1);
      expect(result.activo).toBe(false);
    });
  });

  describe('getServicios', () => {
    it('lists only active servicios of the despacho, ordered by name', async () => {
      servicioRepo.find.mockResolvedValue([{ id: 1, nombre: 'Consulta' }]);
      const result = await service.getServicios(1);
      expect(servicioRepo.find).toHaveBeenCalledWith({
        where: { despachoId: 1, activo: true },
        order: { nombre: 'ASC' },
      });
      expect(result).toEqual([{ id: 1, nombre: 'Consulta' }]);
    });
  });

  describe('createServicio', () => {
    it('rejects a duplicate name within the same despacho', async () => {
      servicioRepo.findOne.mockResolvedValue({ id: 3 });
      await expect(
        service.createServicio({ nombre: 'Consulta Jurídica', costo: 500 } as any, 1),
      ).rejects.toThrow(ConflictException);
      expect(servicioRepo.save).not.toHaveBeenCalled();
    });

    it('trims the name and creates successfully when there is no duplicate', async () => {
      servicioRepo.findOne.mockResolvedValue(null);
      const result = await service.createServicio({ nombre: '  Consulta Jurídica  ', costo: 500 } as any, 1);
      expect(servicioRepo.create.mock.calls[0][0].nombre).toBe('Consulta Jurídica');
      expect(result).toMatchObject({ nombre: 'Consulta Jurídica', costo: 500, despachoId: 1 });
    });
  });

  describe('updateServicio', () => {
    it('throws NotFoundException for a servicio in another despacho', async () => {
      servicioRepo.findOne.mockResolvedValue(null);
      await expect(service.updateServicio(1, { costo: 800 } as any, 1)).rejects.toThrow(NotFoundException);
    });

    it('rejects renaming to a name already used by another servicio', async () => {
      servicioRepo.findOne
        .mockResolvedValueOnce({ id: 4, despachoId: 1, nombre: 'Consulta' }) // findServicioOrFail
        .mockResolvedValueOnce({ id: 9 }); // duplicate check
      await expect(service.updateServicio(4, { nombre: 'Amparo' } as any, 1)).rejects.toThrow(ConflictException);
    });

    it('updates the price without requiring a name change', async () => {
      servicioRepo.findOne.mockResolvedValue({ id: 4, despachoId: 1, nombre: 'Consulta', costo: 500 });
      const result = await service.updateServicio(4, { costo: 750 } as any, 1);
      expect(result.costo).toBe(750);
      expect(servicioRepo.findOne).toHaveBeenCalledTimes(1);
    });
  });

  describe('deleteServicio', () => {
    it('deactivates and returns the entity even if it was already used in past cobros', async () => {
      servicioRepo.findOne.mockResolvedValue({ id: 1, despachoId: 1, nombre: 'Consulta', activo: true });
      const result = await service.deleteServicio(1, 1);
      expect(result.activo).toBe(false);
      expect(result.nombre).toBe('Consulta');
    });

    it('throws NotFoundException for a servicio in another despacho', async () => {
      servicioRepo.findOne.mockResolvedValue(null);
      await expect(service.deleteServicio(1, 1)).rejects.toThrow(NotFoundException);
    });
  });
});

describe('CreateAreaDto validation', () => {
  it('rejects an empty nombre', async () => {
    const dto = plainToInstance(CreateAreaDto, { nombre: '' });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'nombre')).toBe(true);
  });

  it('rejects an invalid hex color', async () => {
    const dto = plainToInstance(CreateAreaDto, { nombre: 'Civil', color: 'azul' });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'color')).toBe(true);
  });

  it('accepts a valid hex color', async () => {
    const dto = plainToInstance(CreateAreaDto, { nombre: 'Civil', color: '#6366f1' });
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });
});

describe('CreateSubareaDto validation', () => {
  it('rejects a missing areaId', async () => {
    const dto = plainToInstance(CreateSubareaDto, { nombre: 'Contratos' });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'areaId')).toBe(true);
  });

  it('accepts valid input', async () => {
    const dto = plainToInstance(CreateSubareaDto, { nombre: 'Contratos', areaId: 1 });
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });
});

describe('CreateServicioDto validation', () => {
  it('rejects an empty nombre', async () => {
    const dto = plainToInstance(CreateServicioDto, { nombre: '', costo: 100 });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'nombre')).toBe(true);
  });

  it('rejects a missing costo', async () => {
    const dto = plainToInstance(CreateServicioDto, { nombre: 'Consulta' });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'costo')).toBe(true);
  });

  it('rejects a negative costo', async () => {
    const dto = plainToInstance(CreateServicioDto, { nombre: 'Consulta', costo: -50 });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'costo')).toBe(true);
  });

  it('rejects a non-numeric costo', async () => {
    const dto = plainToInstance(CreateServicioDto, { nombre: 'Consulta', costo: 'gratis' });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'costo')).toBe(true);
  });

  it('rejects a costo with more than 2 decimal places', async () => {
    const dto = plainToInstance(CreateServicioDto, { nombre: 'Consulta', costo: 99.999 });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'costo')).toBe(true);
  });

  it('rejects a descripcion longer than 1000 characters', async () => {
    const dto = plainToInstance(CreateServicioDto, { nombre: 'Consulta', costo: 100, descripcion: 'a'.repeat(1001) });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'descripcion')).toBe(true);
  });

  it('accepts valid input, including a costo of exactly 0', async () => {
    const dto = plainToInstance(CreateServicioDto, { nombre: 'Consulta Jurídica', costo: 0 });
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });
});
