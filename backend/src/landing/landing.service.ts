import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Testimonio } from './entities/testimonio.entity';
import { Contacto } from './entities/contacto.entity';
import { Plan } from '../planes/entities/plan.entity';
import { CreateTestimonioDto } from './dto/create-testimonio.dto';
import { CreateContactoDto } from './dto/create-contacto.dto';

@Injectable()
export class LandingService {
  constructor(
    @InjectRepository(Testimonio) private testimonioRepo: Repository<Testimonio>,
    @InjectRepository(Contacto) private contactoRepo: Repository<Contacto>,
    @InjectRepository(Plan) private planRepo: Repository<Plan>,
  ) {}

  // ── Planes (público) ─────────────────────────────────────────────────────
  listarPlanesPublicos() {
    return this.planRepo.find({ where: { visibleEnLanding: true }, order: { costoMensualidad: 'ASC' } });
  }

  // ── Testimonios ───────────────────────────────────────────────────────────
  crearTestimonio(dto: CreateTestimonioDto) {
    const testimonio = this.testimonioRepo.create({ ...dto, aprobado: false });
    return this.testimonioRepo.save(testimonio);
  }

  listarTestimoniosAprobados() {
    return this.testimonioRepo.find({ where: { aprobado: true }, order: { createdAt: 'DESC' } });
  }

  listarTodosTestimonios() {
    return this.testimonioRepo.find({ order: { createdAt: 'DESC' } });
  }

  async aprobarTestimonio(id: number) {
    const testimonio = await this.testimonioRepo.findOne({ where: { id } });
    if (!testimonio) throw new NotFoundException('Testimonio no encontrado');
    await this.testimonioRepo.update(id, { aprobado: true });
    return this.testimonioRepo.findOne({ where: { id } });
  }

  async eliminarTestimonio(id: number) {
    const testimonio = await this.testimonioRepo.findOne({ where: { id } });
    if (!testimonio) throw new NotFoundException('Testimonio no encontrado');
    await this.testimonioRepo.delete(id);
    return { success: true };
  }

  // ── Contacto ──────────────────────────────────────────────────────────────
  crearContacto(dto: CreateContactoDto) {
    const contacto = this.contactoRepo.create({ ...dto, atendido: false });
    return this.contactoRepo.save(contacto);
  }

  listarContactos() {
    return this.contactoRepo.find({ order: { createdAt: 'DESC' } });
  }

  async marcarContactoAtendido(id: number) {
    const contacto = await this.contactoRepo.findOne({ where: { id } });
    if (!contacto) throw new NotFoundException('Contacto no encontrado');
    await this.contactoRepo.update(id, { atendido: true });
    return this.contactoRepo.findOne({ where: { id } });
  }
}
