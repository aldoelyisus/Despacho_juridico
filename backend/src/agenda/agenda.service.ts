import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, Between } from 'typeorm';
import { EventoAgenda } from './entities/evento-agenda.entity';
import { Usuario } from '../usuarios/entities/usuario.entity';

@Injectable()
export class AgendaService {
  constructor(
    @InjectRepository(EventoAgenda) private repo: Repository<EventoAgenda>,
    @InjectRepository(Usuario) private usuarioRepo: Repository<Usuario>,
  ) {}

  private isAdmin(user: any): boolean {
    return user?.rol?.nombre?.toLowerCase() === 'administrador';
  }

  // ── LISTAR: solo eventos donde el usuario es creador o participante ────────
  async findAll(user: any, query: any = {}) {
    const { despachoId, id: usuarioId } = user;
    const { inicio, fin } = query;

    const qb = this.repo
      .createQueryBuilder('e')
      .leftJoin('e.participantes', 'p')
      .addSelect(['p.id', 'p.nombre', 'p.apellido', 'p.avatar'])
      .where('e.despachoId = :despachoId', { despachoId })
      .andWhere(
        // creador O participante (admin ve todo)
        this.isAdmin(user)
          ? '1=1'
          : '(e.creadorId = :uid OR p.id = :uid)',
        { uid: usuarioId },
      );

    if (inicio && fin) {
      qb.andWhere('e.fechaInicio BETWEEN :inicio AND :fin', { inicio, fin });
    }

    return qb.orderBy('e.fechaInicio', 'ASC').getMany();
  }

  // ── DETALLE: solo si es creador, participante o admin ─────────────────────
  async findOne(id: number, user: any) {
    const { despachoId, id: usuarioId } = user;

    const qb = this.repo
      .createQueryBuilder('e')
      .leftJoin('e.participantes', 'p')
      .addSelect(['p.id', 'p.nombre', 'p.apellido', 'p.avatar'])
      .where('e.id = :id AND e.despachoId = :despachoId', { id, despachoId });

    if (!this.isAdmin(user)) {
      qb.andWhere('(e.creadorId = :uid OR p.id = :uid)', { uid: usuarioId });
    }

    const evento = await qb.getOne();
    if (!evento) throw new NotFoundException('Evento no encontrado o sin acceso');
    return evento;
  }

  // ── CREAR: auto-incluye al creador como participante ──────────────────────
  async create(dto: any, user: any) {
    const { despachoId, id: creadorId } = user;
    const { participanteIds = [], ...rest } = dto;

    const evento = Object.assign(new EventoAgenda(), {
      ...rest,
      despachoId,
      creadorId,
    });

    // El creador siempre es participante + los que agregue
    const todosIds = Array.from(new Set([creadorId, ...participanteIds.map(Number)]));
    evento.participantes = await this.usuarioRepo.find({
      where: { id: In(todosIds) },
      select: { id: true, nombre: true, apellido: true, avatar: true },
    });

    return this.repo.save(evento);
  }

  // ── ACTUALIZAR: solo el creador o admin puede editar ──────────────────────
  async update(id: number, dto: any, user: any) {
    const evento = await this.findOne(id, user);

    if (!this.isAdmin(user) && evento.creadorId !== user.id) {
      throw new ForbiddenException('Solo el creador puede editar este evento');
    }

    const { participanteIds, ...rest } = dto;
    Object.assign(evento, rest);

    if (participanteIds !== undefined) {
      // Siempre mantener al creador
      const todosIds = Array.from(new Set([evento.creadorId, ...participanteIds.map(Number)]));
      evento.participantes = await this.usuarioRepo.find({
        where: { id: In(todosIds) },
        select: { id: true, nombre: true, apellido: true, avatar: true },
      });
    }

    return this.repo.save(evento);
  }

  // ── ELIMINAR: solo el creador o admin ─────────────────────────────────────
  async remove(id: number, user: any) {
    const evento = await this.findOne(id, user);

    if (!this.isAdmin(user) && evento.creadorId !== user.id) {
      throw new ForbiddenException('Solo el creador puede eliminar este evento');
    }

    return this.repo.remove(evento);
  }

  // ── PRÓXIMOS: solo los del usuario ────────────────────────────────────────
  async getProximos(user: any, dias = 7) {
    const { despachoId, id: usuarioId } = user;
    const desde = new Date();
    const hasta = new Date();
    hasta.setDate(hasta.getDate() + dias);

    const qb = this.repo
      .createQueryBuilder('e')
      .leftJoin('e.participantes', 'p')
      .addSelect(['p.id', 'p.nombre', 'p.apellido', 'p.avatar'])
      .where('e.despachoId = :despachoId', { despachoId })
      .andWhere('e.fechaInicio BETWEEN :desde AND :hasta', { desde, hasta });

    if (!this.isAdmin(user)) {
      qb.andWhere('(e.creadorId = :uid OR p.id = :uid)', { uid: usuarioId });
    }

    return qb.orderBy('e.fechaInicio', 'ASC').take(10).getMany();
  }
}
