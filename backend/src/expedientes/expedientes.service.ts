import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Expediente, EstadoExpediente } from './entities/expediente.entity';
import { Documento } from './entities/documento.entity';
import { Observacion } from './entities/observacion.entity';
import { EventoExpediente } from './entities/evento-expediente.entity';
import { Cliente } from '../clientes/entities/cliente.entity';
import { Usuario } from '../usuarios/entities/usuario.entity';
import { CreateExpedienteDto } from './dto/create-expediente.dto';
import { UpdateExpedienteDto } from './dto/update-expediente.dto';
import { CreateDocumentoDto } from './dto/create-documento.dto';
import { CreateEventoDto } from './dto/create-evento.dto';

const LIMITE_MAXIMO = 100;

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
    const { estado, areaId, busqueda, clienteId } = query;
    const pagina = Math.max(1, Number(query.pagina) || 1);
    const limite = Math.min(LIMITE_MAXIMO, Math.max(1, Number(query.limite) || 20));

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
      .take(limite)
      .skip((pagina - 1) * limite)
      .getManyAndCount();

    return { items, total, pagina, limite, totalPaginas: Math.ceil(total / limite) };
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
      .leftJoinAndSelect('e.area', 'ar')
      .leftJoinAndSelect('e.subarea', 'sa')
      .where('e.id = :id AND e.despachoId = :despachoId', { id, despachoId });

    // Restricción por rol
    if (!this.isAdmin(user)) {
      qb.andWhere('col.id = :usuarioId', { usuarioId });
    }

    const e = await qb.getOne();
    if (!e) throw new NotFoundException('Expediente no encontrado o sin acceso');
    return e;
  }

  async create(dto: CreateExpedienteDto, despachoId: number) {
    if (!dto.clienteIds?.length) {
      throw new BadRequestException('Debes asociar al menos un cliente al expediente');
    }
    const { clienteIds, colaboradorIds, ...rest } = dto;
    const count = await this.repo.count({ where: { despachoId } });
    const year = new Date().getFullYear();
    const numero = `EXP-${year}-${String(count + 1).padStart(4, '0')}`;
    const exp = Object.assign(new Expediente(), { ...rest, despachoId, numero, montoTotal: 0 });

    exp.clientes = (await this.resolveClientes(clienteIds, despachoId))!;
    if (colaboradorIds?.length) {
      exp.colaboradores = (await this.resolveColaboradores(colaboradorIds, despachoId))!;
    }
    return this.repo.save(exp);
  }

  async update(id: number, dto: UpdateExpedienteDto, user: any) {
    const exp = await this.findOne(id, user);
    const { clienteIds, colaboradorIds, ...rest } = dto;
    Object.assign(exp, rest);

    const clientes = await this.resolveClientes(clienteIds, user.despachoId);
    if (clientes !== undefined) exp.clientes = clientes;

    const colaboradores = await this.resolveColaboradores(colaboradorIds, user.despachoId);
    if (colaboradores !== undefined) exp.colaboradores = colaboradores;

    return this.repo.save(exp);
  }

  async cambiarEstado(id: number, estado: EstadoExpediente, user: any) {
    await this.findOne(id, user);
    await this.repo.update({ id, despachoId: user.despachoId }, { estado });
    return this.findOne(id, user);
  }

  async addDocumento(expedienteId: number, file: Express.Multer.File, dto: CreateDocumentoDto, user: any) {
    if (!file) throw new BadRequestException('Debes seleccionar un archivo para subir');
    await this.findOne(expedienteId, user);

    const doc = this.docRepo.create({
      expedienteId,
      despachoId: user.despachoId,
      usuarioId: user.id,
      nombre: dto.nombre || file.originalname,
      ruta: `/uploads/${file.filename}`,
      tipo: file.mimetype,
      tamanoBytes: file.size,
      descripcion: dto.descripcion,
    });
    return this.docRepo.save(doc);
  }

  async addObservacion(expedienteId: number, contenido: string, user: any) {
    await this.findOne(expedienteId, user);

    const obs = this.obsRepo.create({
      expedienteId,
      despachoId: user.despachoId,
      usuarioId: user.id,
      usuarioNombre: `${user.nombre} ${user.apellido}`,
      contenido,
    });
    return this.obsRepo.save(obs);
  }

  async addEvento(expedienteId: number, dto: CreateEventoDto, user: any) {
    if (dto.fechaFin && new Date(dto.fechaFin) < new Date(dto.fechaInicio)) {
      throw new BadRequestException('La fecha de fin no puede ser anterior a la fecha de inicio');
    }
    await this.findOne(expedienteId, user);

    const evento = this.eventoRepo.create({ ...dto, expedienteId, despachoId: user.despachoId });
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

  private async resolveClientes(clienteIds: number[] | undefined, despachoId: number): Promise<Cliente[] | undefined> {
    if (clienteIds === undefined) return undefined;
    if (!clienteIds.length) return [];
    const clientes = await this.clienteRepo.findBy({ id: In(clienteIds), despachoId });
    if (clientes.length !== new Set(clienteIds).size) {
      throw new BadRequestException('Uno o más clientes seleccionados no existen en tu despacho');
    }
    return clientes;
  }

  private async resolveColaboradores(colaboradorIds: number[] | undefined, despachoId: number): Promise<Usuario[] | undefined> {
    if (colaboradorIds === undefined) return undefined;
    if (!colaboradorIds.length) return [];
    const usuarios = await this.usuarioRepo.findBy({ id: In(colaboradorIds), despachoId });
    if (usuarios.length !== new Set(colaboradorIds).size) {
      throw new BadRequestException('Uno o más colaboradores seleccionados no existen en tu despacho');
    }
    return usuarios;
  }
}
