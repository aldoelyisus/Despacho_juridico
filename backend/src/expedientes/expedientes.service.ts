import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Expediente, EstadoExpediente } from './entities/expediente.entity';
import { Documento } from './entities/documento.entity';
import { Observacion } from './entities/observacion.entity';
import { EventoExpediente } from './entities/evento-expediente.entity';
import { Cliente } from '../clientes/entities/cliente.entity';
import { Usuario } from '../usuarios/entities/usuario.entity';

@Injectable()
export class ExpedientesService {
  constructor(
    @InjectRepository(Expediente) private repo: Repository<Expediente>,
    @InjectRepository(Documento) private docRepo: Repository<Documento>,
    @InjectRepository(Observacion) private obsRepo: Repository<Observacion>,
    @InjectRepository(EventoExpediente) private eventoRepo: Repository<EventoExpediente>,
    @InjectRepository(Cliente) private clienteRepo: Repository<Cliente>,
    @InjectRepository(Usuario) private usuarioRepo: Repository<Usuario>,
  ) {}

  private isAdmin(user: any): boolean {
    return user?.rol?.nombre?.toLowerCase() === 'administrador';
  }

  async findAll(user: any, query: any = {}) {
    const { despachoId, id: usuarioId } = user;
    const { estado, areaId, busqueda, clienteId, pagina = 1, limite = 20 } = query;

    const qb = this.repo
      .createQueryBuilder('e')
      .leftJoinAndSelect('e.clientes', 'c')
      .leftJoinAndSelect('e.colaboradores', 'col')
      .where('e.despachoId = :despachoId', { despachoId });

    // Si NO es admin, solo ve los expedientes donde está asignado
    if (!this.isAdmin(user)) {
      qb.andWhere('col.id = :usuarioId', { usuarioId });
    }

    if (estado) qb.andWhere('e.estado = :estado', { estado });
    if (areaId) qb.andWhere('e.areaId = :areaId', { areaId });
    if (busqueda) qb.andWhere('(e.titulo LIKE :b OR e.numero LIKE :b)', { b: `%${busqueda}%` });
    if (clienteId) qb.andWhere('c.id = :clienteId', { clienteId: +clienteId });

    const [items, total] = await qb
      .orderBy('e.createdAt', 'DESC')
      .take(+limite)
      .skip((+pagina - 1) * +limite)
      .getManyAndCount();

    return { items, total, pagina: +pagina, totalPaginas: Math.ceil(total / +limite) };
  }

  async findOne(id: number, user: any) {
    const { despachoId, id: usuarioId } = user;
    const qb = this.repo
      .createQueryBuilder('e')
      .leftJoinAndSelect('e.clientes', 'c')
      .leftJoinAndSelect('e.colaboradores', 'col')
      .leftJoinAndSelect('e.documentos', 'doc')
      .leftJoinAndSelect('e.observaciones', 'obs')
      .leftJoinAndSelect('e.eventosExpediente', 'ev')
      .where('e.id = :id AND e.despachoId = :despachoId', { id, despachoId });

    // Restricción por rol
    if (!this.isAdmin(user)) {
      qb.andWhere('col.id = :usuarioId', { usuarioId });
    }

    const e = await qb.getOne();
    if (!e) throw new NotFoundException('Expediente no encontrado o sin acceso');
    return e;
  }

  async create(dto: any, despachoId: number) {
    const { montoTotal: _ignored, clienteIds, colaboradorIds, ...rest } = dto;
    const count = await this.repo.count({ where: { despachoId } });
    const year = new Date().getFullYear();
    const numero = `EXP-${year}-${String(count + 1).padStart(4, '0')}`;
    const exp = Object.assign(new Expediente(), { ...rest, despachoId, numero, montoTotal: 0 });

    if (clienteIds?.length) {
      exp.clientes = await this.clienteRepo.findBy({ id: In(clienteIds) });
    }
    if (colaboradorIds?.length) {
      exp.colaboradores = await this.usuarioRepo.findBy({ id: In(colaboradorIds) });
    }
    return this.repo.save(exp);
  }

  async update(id: number, dto: any, despachoId: number) {
    const exp = await this.findOne(id, despachoId);
    const { clienteIds, colaboradorIds, ...rest } = dto;
    Object.assign(exp, rest);

    if (clienteIds !== undefined) {
      exp.clientes = clienteIds.length
        ? await this.clienteRepo.findBy({ id: In(clienteIds) })
        : [];
    }
    if (colaboradorIds !== undefined) {
      exp.colaboradores = colaboradorIds.length
        ? await this.usuarioRepo.findBy({ id: In(colaboradorIds) })
        : [];
    }
    return this.repo.save(exp);
  }

  async cambiarEstado(id: number, estado: EstadoExpediente, despachoId: number) {
    await this.repo.update({ id, despachoId }, { estado });
    return this.findOne(id, despachoId);
  }

  async addDocumento(expedienteId: number, file: Express.Multer.File, data: any, despachoId: number, usuarioId: number) {
    const doc = this.docRepo.create({
      expedienteId,
      despachoId,
      usuarioId,
      nombre: data.nombre || file.originalname,
      ruta: `/uploads/${file.filename}`,
      tipo: file.mimetype,
      tamanoBytes: file.size,
      descripcion: data.descripcion,
    });
    return this.docRepo.save(doc);
  }

  async addObservacion(expedienteId: number, contenido: string, usuario: any, despachoId: number) {
    const obs = this.obsRepo.create({
      expedienteId,
      despachoId,
      usuarioId: usuario.id,
      usuarioNombre: `${usuario.nombre} ${usuario.apellido}`,
      contenido,
    });
    return this.obsRepo.save(obs);
  }

  async addEvento(expedienteId: number, dto: any, despachoId: number) {
    const evento = this.eventoRepo.create({ ...dto, expedienteId, despachoId });
    return this.eventoRepo.save(evento);
  }

  async getStats(user: any) {
    const { despachoId, id: usuarioId } = user;
    const qb = this.repo
      .createQueryBuilder('e')
      .leftJoin('e.colaboradores', 'col')
      .where('e.despachoId = :despachoId', { despachoId });

    if (!this.isAdmin(user)) {
      qb.andWhere('col.id = :usuarioId', { usuarioId });
    }

    const byStatus = await qb
      .select('e.estado', 'estado')
      .addSelect('COUNT(*)', 'total')
      .groupBy('e.estado')
      .getRawMany();

    const ganados = byStatus.find((s: any) => s.estado === 'ganado')?.total || 0;
    const cerrados = ['cerrado', 'ganado', 'perdido'].reduce(
      (sum: number, st: string) => sum + Number(byStatus.find((s: any) => s.estado === st)?.total || 0), 0
    );
    const tasaExito = cerrados > 0 ? Math.round((ganados / cerrados) * 100) : 0;
    return { byStatus, tasaExito };
  }
}
