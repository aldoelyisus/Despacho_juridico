import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException } from '@nestjs/common';
import { LandingService } from './landing.service';
import { Testimonio } from './entities/testimonio.entity';
import { Contacto } from './entities/contacto.entity';
import { Plan } from '../planes/entities/plan.entity';

const repoMockFactory = () => ({
  find: jest.fn(),
  findOne: jest.fn(),
  create: jest.fn((data) => data),
  save: jest.fn((data) => Promise.resolve({ id: 1, ...data })),
  update: jest.fn(),
  delete: jest.fn(),
});

describe('LandingService', () => {
  let service: LandingService;
  let testimonioRepo: ReturnType<typeof repoMockFactory>;
  let contactoRepo: ReturnType<typeof repoMockFactory>;
  let planRepo: ReturnType<typeof repoMockFactory>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LandingService,
        { provide: getRepositoryToken(Testimonio), useFactory: repoMockFactory },
        { provide: getRepositoryToken(Contacto), useFactory: repoMockFactory },
        { provide: getRepositoryToken(Plan), useFactory: repoMockFactory },
      ],
    }).compile();

    service = module.get(LandingService);
    testimonioRepo = module.get(getRepositoryToken(Testimonio));
    contactoRepo = module.get(getRepositoryToken(Contacto));
    planRepo = module.get(getRepositoryToken(Plan));
  });

  describe('listarPlanesPublicos', () => {
    it('filters to only planes marked visibleEnLanding, ordered by price', async () => {
      planRepo.find.mockResolvedValue([{ id: 1, nombre: 'Básico', visibleEnLanding: true }]);
      const result = await service.listarPlanesPublicos();
      expect(planRepo.find).toHaveBeenCalledWith({ where: { visibleEnLanding: true }, order: { costoMensualidad: 'ASC' } });
      expect(result).toEqual([{ id: 1, nombre: 'Básico', visibleEnLanding: true }]);
    });
  });

  describe('crearTestimonio', () => {
    it('always saves new testimonios as not approved, regardless of input', async () => {
      const result = await service.crearTestimonio({ nombre: 'Roberto', mensaje: 'Excelente sistema' } as any);
      expect(testimonioRepo.create).toHaveBeenCalledWith(expect.objectContaining({ nombre: 'Roberto', aprobado: false }));
      expect(result.aprobado).toBe(false);
    });
  });

  describe('listarTestimoniosAprobados', () => {
    it('only queries testimonios where aprobado is true', async () => {
      testimonioRepo.find.mockResolvedValue([]);
      await service.listarTestimoniosAprobados();
      expect(testimonioRepo.find).toHaveBeenCalledWith({ where: { aprobado: true }, order: { createdAt: 'DESC' } });
    });
  });

  describe('listarTodosTestimonios', () => {
    it('queries without an aprobado filter (root sees pending and approved)', async () => {
      testimonioRepo.find.mockResolvedValue([]);
      await service.listarTodosTestimonios();
      expect(testimonioRepo.find).toHaveBeenCalledWith({ order: { createdAt: 'DESC' } });
    });
  });

  describe('aprobarTestimonio', () => {
    it('throws NotFoundException when the testimonio does not exist', async () => {
      testimonioRepo.findOne.mockResolvedValue(null);
      await expect(service.aprobarTestimonio(99)).rejects.toThrow(NotFoundException);
      expect(testimonioRepo.update).not.toHaveBeenCalled();
    });

    it('updates aprobado to true and returns the refreshed row', async () => {
      testimonioRepo.findOne
        .mockResolvedValueOnce({ id: 1, aprobado: false })
        .mockResolvedValueOnce({ id: 1, aprobado: true });
      const result = await service.aprobarTestimonio(1);
      expect(testimonioRepo.update).toHaveBeenCalledWith(1, { aprobado: true });
      expect(result.aprobado).toBe(true);
    });
  });

  describe('eliminarTestimonio', () => {
    it('throws NotFoundException when the testimonio does not exist', async () => {
      testimonioRepo.findOne.mockResolvedValue(null);
      await expect(service.eliminarTestimonio(99)).rejects.toThrow(NotFoundException);
      expect(testimonioRepo.delete).not.toHaveBeenCalled();
    });

    it('deletes an existing testimonio', async () => {
      testimonioRepo.findOne.mockResolvedValue({ id: 1 });
      const result = await service.eliminarTestimonio(1);
      expect(testimonioRepo.delete).toHaveBeenCalledWith(1);
      expect(result).toEqual({ success: true });
    });
  });

  describe('crearContacto', () => {
    it('always saves new contactos as not atendido', async () => {
      const result = await service.crearContacto({ nombre: 'Ana', email: 'ana@a.com', mensaje: 'Hola' } as any);
      expect(contactoRepo.create).toHaveBeenCalledWith(expect.objectContaining({ atendido: false }));
      expect(result.atendido).toBe(false);
    });
  });

  describe('marcarContactoAtendido', () => {
    it('throws NotFoundException when the contacto does not exist', async () => {
      contactoRepo.findOne.mockResolvedValue(null);
      await expect(service.marcarContactoAtendido(99)).rejects.toThrow(NotFoundException);
    });

    it('updates atendido to true', async () => {
      contactoRepo.findOne
        .mockResolvedValueOnce({ id: 1, atendido: false })
        .mockResolvedValueOnce({ id: 1, atendido: true });
      const result = await service.marcarContactoAtendido(1);
      expect(contactoRepo.update).toHaveBeenCalledWith(1, { atendido: true });
      expect(result.atendido).toBe(true);
    });
  });
});
