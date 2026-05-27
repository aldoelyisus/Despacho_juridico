import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AreaDerecho } from './entities/area-derecho.entity';
import { Subarea } from './entities/subarea.entity';
import { Servicio } from './entities/servicio.entity';

@Injectable()
export class CatalogosService {
  constructor(
    @InjectRepository(AreaDerecho) private areaRepo: Repository<AreaDerecho>,
    @InjectRepository(Subarea) private subareaRepo: Repository<Subarea>,
    @InjectRepository(Servicio) private servicioRepo: Repository<Servicio>,
  ) {}

  // ── ÁREAS ──────────────────────────────────────────────────────────────────
  async getAreas(despachoId: number) {
    return this.areaRepo.find({
      where: { despachoId, activo: true },
      relations: { subareas: true },
      order: { nombre: 'ASC' },
    });
  }

  async createArea(dto: any, despachoId: number) {
    return this.areaRepo.save(this.areaRepo.create({ ...dto, despachoId }));
  }

  async updateArea(id: number, dto: any, despachoId: number) {
    await this.areaRepo.update({ id, despachoId }, dto);
    return this.areaRepo.findOne({ where: { id, despachoId } });
  }

  async deleteArea(id: number, despachoId: number) {
    await this.areaRepo.update({ id, despachoId }, { activo: false });
  }

  // ── SUBÁREAS ───────────────────────────────────────────────────────────────
  async getSubareas(despachoId: number) {
    // Solo subáreas del propio despacho — aislamiento total
    return this.subareaRepo.find({
      where: { despachoId, activo: true },
      relations: { area: true },
      order: { nombre: 'ASC' },
    });
  }

  async createSubarea(dto: any, despachoId: number) {
    return this.subareaRepo.save(this.subareaRepo.create({ ...dto, despachoId }));
  }

  async updateSubarea(id: number, dto: any, despachoId: number) {
    await this.subareaRepo.update({ id, despachoId }, dto);
    return this.subareaRepo.findOne({ where: { id, despachoId }, relations: { area: true } });
  }

  async deleteSubarea(id: number, despachoId: number) {
    await this.subareaRepo.update({ id, despachoId }, { activo: false });
  }

  // ── SERVICIOS ──────────────────────────────────────────────────────────────
  async getServicios(despachoId: number) {
    return this.servicioRepo.find({
      where: { despachoId, activo: true },
      order: { nombre: 'ASC' },
    });
  }

  async createServicio(dto: any, despachoId: number) {
    return this.servicioRepo.save(this.servicioRepo.create({ ...dto, despachoId }));
  }

  async updateServicio(id: number, dto: any, despachoId: number) {
    await this.servicioRepo.update({ id, despachoId }, dto);
    return this.servicioRepo.findOne({ where: { id, despachoId } });
  }

  async deleteServicio(id: number, despachoId: number) {
    await this.servicioRepo.update({ id, despachoId }, { activo: false });
  }
}
