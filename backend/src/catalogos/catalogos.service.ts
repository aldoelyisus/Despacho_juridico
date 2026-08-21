import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like, Not } from 'typeorm';
import { AreaDerecho } from './entities/area-derecho.entity';
import { Subarea } from './entities/subarea.entity';
import { Servicio } from './entities/servicio.entity';
import { Expediente } from '../expedientes/entities/expediente.entity';
import { CreateAreaDto } from './dto/create-area.dto';
import { UpdateAreaDto } from './dto/update-area.dto';
import { CreateSubareaDto } from './dto/create-subarea.dto';
import { UpdateSubareaDto } from './dto/update-subarea.dto';
import { CreateServicioDto } from './dto/create-servicio.dto';
import { UpdateServicioDto } from './dto/update-servicio.dto';
import { AuditoriaService } from '../auditoria/auditoria.service';

const LIMITE_MAXIMO = 100;
type Usuario = { id: number; nombre: string; apellido: string };

@Injectable()
export class CatalogosService {
  constructor(
    @InjectRepository(AreaDerecho) private areaRepo: Repository<AreaDerecho>,
    @InjectRepository(Subarea) private subareaRepo: Repository<Subarea>,
    @InjectRepository(Servicio) private servicioRepo: Repository<Servicio>,
    @InjectRepository(Expediente) private expedienteRepo: Repository<Expediente>,
    private auditoriaService: AuditoriaService,
  ) {}

  // ── ÁREAS ──────────────────────────────────────────────────────────────────
  async getAreas(despachoId: number, query: any = {}, usuario?: Usuario, ip?: string) {
    const pagina = Math.max(1, Number(query.pagina) || 1);
    const limite = Math.min(LIMITE_MAXIMO, Math.max(1, Number(query.limite) || 20));
    const texto = typeof query.busqueda === 'string' ? query.busqueda.trim() : '';

    const where = texto
      ? { despachoId, activo: true, nombre: Like(`%${texto}%`) }
      : { despachoId, activo: true };

    const [items, total] = await this.areaRepo.findAndCount({
      where,
      relations: { subareas: true },
      order: { nombre: 'ASC' },
      take: limite,
      skip: (pagina - 1) * limite,
    });

    if (texto) {
      await this.registrarAuditoria(despachoId, 'BUSCAR', usuario, ip, `Búsqueda de áreas: "${texto}" (${total} resultado${total === 1 ? '' : 's'})`);
    }

    return { items, total, pagina, limite, totalPaginas: Math.ceil(total / limite) };
  }

  async createArea(dto: CreateAreaDto, despachoId: number) {
    const nombre = dto.nombre.trim();
    await this.assertAreaNoDuplicada(nombre, despachoId);
    return this.areaRepo.save(this.areaRepo.create({ ...dto, nombre, despachoId }));
  }

  async updateArea(id: number, dto: UpdateAreaDto, despachoId: number) {
    const area = await this.findAreaOrFail(id, despachoId);
    if (dto.nombre) {
      const nombre = dto.nombre.trim();
      await this.assertAreaNoDuplicada(nombre, despachoId, id);
      dto = { ...dto, nombre };
    }
    Object.assign(area, dto);
    return this.areaRepo.save(area);
  }

  async deleteArea(id: number, despachoId: number) {
    const area = await this.findAreaOrFail(id, despachoId);
    const [subareasActivas, expedientesVinculados] = await Promise.all([
      this.subareaRepo.count({ where: { areaId: id, despachoId, activo: true } }),
      this.expedienteRepo.count({ where: { areaId: id, despachoId } }),
    ]);
    if (subareasActivas > 0 || expedientesVinculados > 0) {
      const partes: string[] = [];
      if (subareasActivas > 0) partes.push(`${subareasActivas} subárea${subareasActivas === 1 ? '' : 's'} activa${subareasActivas === 1 ? '' : 's'}`);
      if (expedientesVinculados > 0) partes.push(`${expedientesVinculados} expediente${expedientesVinculados === 1 ? '' : 's'} vinculado${expedientesVinculados === 1 ? '' : 's'}`);
      throw new ConflictException(`No se puede desactivar: el área tiene ${partes.join(' y ')}. Reasígnalos antes de continuar.`);
    }
    area.activo = false;
    return this.areaRepo.save(area);
  }

  private async findAreaOrFail(id: number, despachoId: number) {
    const area = await this.areaRepo.findOne({ where: { id, despachoId } });
    if (!area) throw new NotFoundException('Área no encontrada');
    return area;
  }

  private async assertAreaNoDuplicada(nombre: string, despachoId: number, excluirId?: number) {
    const existente = await this.areaRepo.findOne({
      where: { despachoId, nombre, ...(excluirId ? { id: Not(excluirId) } : {}) },
    });
    if (existente) throw new ConflictException('Ya existe un área con este nombre en tu despacho');
  }

  // ── SUBÁREAS ───────────────────────────────────────────────────────────────
  async getSubareas(despachoId: number, query: any = {}, usuario?: Usuario, ip?: string) {
    const pagina = Math.max(1, Number(query.pagina) || 1);
    const limite = Math.min(LIMITE_MAXIMO, Math.max(1, Number(query.limite) || 20));
    const texto = typeof query.busqueda === 'string' ? query.busqueda.trim() : '';
    const areaId = query.areaId ? Number(query.areaId) : undefined;

    const where: any = { despachoId, activo: true, ...(areaId ? { areaId } : {}) };
    if (texto) where.nombre = Like(`%${texto}%`);

    const [items, total] = await this.subareaRepo.findAndCount({
      where,
      relations: { area: true },
      order: { nombre: 'ASC' },
      take: limite,
      skip: (pagina - 1) * limite,
    });

    if (texto) {
      await this.registrarAuditoria(despachoId, 'BUSCAR', usuario, ip, `Búsqueda de subáreas: "${texto}" (${total} resultado${total === 1 ? '' : 's'})`);
    }

    return { items, total, pagina, limite, totalPaginas: Math.ceil(total / limite) };
  }

  async createSubarea(dto: CreateSubareaDto, despachoId: number) {
    await this.findAreaOrFail(dto.areaId, despachoId);
    const nombre = dto.nombre.trim();
    await this.assertSubareaNoDuplicada(nombre, dto.areaId, despachoId);
    return this.subareaRepo.save(this.subareaRepo.create({ ...dto, nombre, despachoId }));
  }

  async updateSubarea(id: number, dto: UpdateSubareaDto, despachoId: number) {
    const subarea = await this.findSubareaOrFail(id, despachoId);
    const areaId = dto.areaId ?? subarea.areaId;
    if (dto.areaId) await this.findAreaOrFail(dto.areaId, despachoId);
    if (dto.nombre) {
      const nombre = dto.nombre.trim();
      await this.assertSubareaNoDuplicada(nombre, areaId, despachoId, id);
      dto = { ...dto, nombre };
    }
    Object.assign(subarea, dto);
    return this.subareaRepo.save(subarea);
  }

  async deleteSubarea(id: number, despachoId: number) {
    const subarea = await this.findSubareaOrFail(id, despachoId);
    const expedientesVinculados = await this.expedienteRepo.count({ where: { subareaId: id, despachoId } });
    if (expedientesVinculados > 0) {
      throw new ConflictException(`No se puede desactivar: la subárea tiene ${expedientesVinculados} expediente${expedientesVinculados === 1 ? '' : 's'} vinculado${expedientesVinculados === 1 ? '' : 's'}. Reasígnalos antes de continuar.`);
    }
    subarea.activo = false;
    return this.subareaRepo.save(subarea);
  }

  private async findSubareaOrFail(id: number, despachoId: number) {
    const subarea = await this.subareaRepo.findOne({ where: { id, despachoId } });
    if (!subarea) throw new NotFoundException('Subárea no encontrada');
    return subarea;
  }

  private async assertSubareaNoDuplicada(nombre: string, areaId: number, despachoId: number, excluirId?: number) {
    const existente = await this.subareaRepo.findOne({
      where: { despachoId, areaId, nombre, ...(excluirId ? { id: Not(excluirId) } : {}) },
    });
    if (existente) throw new ConflictException('Ya existe una subárea con este nombre en esta área');
  }

  // ── SERVICIOS ─────────────────────────────────────────────────────────────
  async getServicios(despachoId: number) {
    return this.servicioRepo.find({
      where: { despachoId, activo: true },
      order: { nombre: 'ASC' },
    });
  }

  async createServicio(dto: CreateServicioDto, despachoId: number) {
    const nombre = dto.nombre.trim();
    await this.assertServicioNoDuplicado(nombre, despachoId);
    return this.servicioRepo.save(this.servicioRepo.create({ ...dto, nombre, despachoId }));
  }

  async updateServicio(id: number, dto: UpdateServicioDto, despachoId: number) {
    const servicio = await this.findServicioOrFail(id, despachoId);
    if (dto.nombre) {
      const nombre = dto.nombre.trim();
      await this.assertServicioNoDuplicado(nombre, despachoId, id);
      dto = { ...dto, nombre };
    }
    Object.assign(servicio, dto);
    return this.servicioRepo.save(servicio);
  }

  async deleteServicio(id: number, despachoId: number) {
    // Desactivar un servicio es seguro en cualquier momento: los cobros ya registrados
    // conservan su propia copia del costo y solo dejan de poder seleccionarse en cobros nuevos.
    const servicio = await this.findServicioOrFail(id, despachoId);
    servicio.activo = false;
    return this.servicioRepo.save(servicio);
  }

  private async findServicioOrFail(id: number, despachoId: number) {
    const servicio = await this.servicioRepo.findOne({ where: { id, despachoId } });
    if (!servicio) throw new NotFoundException('Servicio no encontrado');
    return servicio;
  }

  private async assertServicioNoDuplicado(nombre: string, despachoId: number, excluirId?: number) {
    const existente = await this.servicioRepo.findOne({
      where: { despachoId, nombre, ...(excluirId ? { id: Not(excluirId) } : {}) },
    });
    if (existente) throw new ConflictException('Ya existe un servicio con este nombre en tu despacho');
  }

  // ── AUDITORÍA ────────────────────────────────────────────────────────────────
  private async registrarAuditoria(despachoId: number, accion: string, usuario: Usuario | undefined, ip: string | undefined, descripcion: string) {
    if (!usuario) return;
    try {
      await this.auditoriaService.log({
        despachoId,
        usuarioId: usuario.id,
        usuarioNombre: `${usuario.nombre} ${usuario.apellido}`,
        accion,
        modulo: 'CATALOGOS',
        descripcion,
        ip,
      });
    } catch {
      // La auditoría nunca debe interrumpir la operación del usuario
    }
  }
}
