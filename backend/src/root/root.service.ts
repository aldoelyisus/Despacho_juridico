import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { Despacho } from '../despachos/entities/despacho.entity';
import { Usuario } from '../usuarios/entities/usuario.entity';
import { Rol } from '../usuarios/entities/rol.entity';
import { Mensualidad, EstadoMensualidad } from './entities/mensualidad.entity';

@Injectable()
export class RootService {
  constructor(
    @InjectRepository(Despacho)   private despachoRepo: Repository<Despacho>,
    @InjectRepository(Usuario)    private usuarioRepo: Repository<Usuario>,
    @InjectRepository(Rol)        private rolRepo: Repository<Rol>,
    @InjectRepository(Mensualidad) private mensualidadRepo: Repository<Mensualidad>,
  ) {}

  // ── DASHBOARD ─────────────────────────────────────────────────────────────
  async getDashboard() {
    const despachos = await this.despachoRepo.find({ where: { activo: true } });
    const totalDespachos = despachos.length;
    const despachosActivos  = despachos.filter(d => !d.bloqueado).length;
    const despachosBloqueados = despachos.filter(d => d.bloqueado).length;

    // Stats por despacho (clientes, ingresos)
    const stats = await Promise.all(
      despachos.map(async (d) => {
        const clientes = await this.usuarioRepo.manager
          .query(`SELECT COUNT(*) as total FROM clientes WHERE despacho_id = ?`, [d.id]);
        const ingresos = await this.usuarioRepo.manager
          .query(`SELECT COALESCE(SUM(monto),0) as total FROM mensualidades WHERE despacho_id = ? AND estado = 'pagado'`, [d.id]);
        return {
          despachoId: d.id,
          nombre: d.nombre,
          bloqueado: d.bloqueado,
          clientes: Number(clientes[0]?.total || 0),
          ingresosMensualidades: Number(ingresos[0]?.total || 0),
        };
      })
    );

    const mensualidadesPendientes = await this.mensualidadRepo.count({
      where: { estado: EstadoMensualidad.PENDIENTE },
    });
    const mensualidadesVencidas = await this.mensualidadRepo.count({
      where: { estado: EstadoMensualidad.VENCIDO },
    });
    const ingresosTotales = await this.mensualidadRepo
      .createQueryBuilder('m')
      .select('COALESCE(SUM(m.monto), 0)', 'total')
      .where('m.estado = :estado', { estado: EstadoMensualidad.PAGADO })
      .getRawOne();

    return {
      totalDespachos,
      despachosActivos,
      despachosBloqueados,
      mensualidadesPendientes,
      mensualidadesVencidas,
      ingresosTotales: Number(ingresosTotales?.total || 0),
      statsPorDespacho: stats,
    };
  }

  // ── DESPACHOS ─────────────────────────────────────────────────────────────
  async getDespachos() {
    const despachos = await this.despachoRepo.find({
      order: { createdAt: 'DESC' },
    });
    // Enriquecer con conteo de usuarios y próxima mensualidad
    return Promise.all(despachos.map(async (d) => {
      const totalUsuarios = await this.usuarioRepo.count({ where: { despachoId: d.id } });
      const proximaMensualidad = await this.mensualidadRepo.findOne({
        where: { despachoId: d.id, estado: EstadoMensualidad.PENDIENTE },
        order: { fechaVencimiento: 'ASC' },
      });
      return { ...d, totalUsuarios, proximaMensualidad };
    }));
  }

  async createDespacho(dto: any) {
    // 1. Verificar email único
    const existingUser = await this.usuarioRepo.findOne({ where: { email: dto.emailAdmin.toLowerCase() } });
    if (existingUser) throw new ConflictException('El email del administrador ya está en uso');

    // 2. Crear despacho
    const despacho = this.despachoRepo.create({
      nombre: dto.nombre,
      nombreComercial: dto.nombreComercial,
      email: dto.email,
      telefono: dto.telefono,
      ciudad: dto.ciudad,
      estado: dto.estado,
      planMensual: dto.planMensual || 0,
      fechaVencimientoPago: dto.fechaVencimientoPago,
    });
    const savedDespacho = await this.despachoRepo.save(despacho);

    // 3. Obtener rol administrador
    const adminRol = await this.rolRepo.findOne({ where: { nombre: 'administrador' } });
    if (!adminRol) throw new NotFoundException('Rol administrador no encontrado');

    // 4. Crear usuario admin del despacho
    const hash = await bcrypt.hash(dto.passwordAdmin, 12);
    const usuario = this.usuarioRepo.create({
      despachoId: savedDespacho.id,
      rolId: adminRol.id,
      nombre: dto.nombreAdmin,
      apellido: dto.apellidoAdmin,
      email: dto.emailAdmin.toLowerCase(),
      password: hash,
    });
    const savedUsuario = await this.usuarioRepo.save(usuario);

    // 5. Crear primera mensualidad si viene con plan
    if (dto.planMensual && dto.fechaVencimientoPago) {
      await this.mensualidadRepo.save(this.mensualidadRepo.create({
        despachoId: savedDespacho.id,
        monto: dto.planMensual,
        fechaVencimiento: dto.fechaVencimientoPago,
        estado: EstadoMensualidad.PENDIENTE,
      }));
    }

    return { despacho: savedDespacho, usuario: { ...savedUsuario, password: undefined } };
  }

  async updateDespacho(id: number, dto: any) {
    await this.despachoRepo.update(id, dto);
    return this.despachoRepo.findOne({ where: { id } });
  }

  async toggleBloqueo(id: number) {
    const despacho = await this.despachoRepo.findOne({ where: { id } });
    if (!despacho) throw new NotFoundException('Despacho no encontrado');
    await this.despachoRepo.update(id, { bloqueado: !despacho.bloqueado });
    return { id, bloqueado: !despacho.bloqueado };
  }

  // ── USUARIOS DE DESPACHO ──────────────────────────────────────────────────
  async getUsuariosDespacho(despachoId: number) {
    return this.usuarioRepo.find({
      where: { despachoId },
      relations: { rol: true },
      order: { nombre: 'ASC' },
    });
  }

  async toggleUsuario(id: number) {
    const usuario = await this.usuarioRepo.findOne({ where: { id } });
    if (!usuario) throw new NotFoundException('Usuario no encontrado');
    await this.usuarioRepo.update(id, { activo: !usuario.activo });
    return { id, activo: !usuario.activo };
  }

  // ── MENSUALIDADES ─────────────────────────────────────────────────────────
  async getMensualidades(query: any = {}) {
    const { despachoId, estado } = query;
    const qb = this.mensualidadRepo
      .createQueryBuilder('m')
      .orderBy('m.fechaVencimiento', 'DESC');
    if (despachoId) qb.andWhere('m.despachoId = :despachoId', { despachoId: +despachoId });
    if (estado)     qb.andWhere('m.estado = :estado', { estado });
    return qb.getMany();
  }

  async createMensualidad(dto: any) {
    const mensualidad = this.mensualidadRepo.create(dto);
    const saved = await this.mensualidadRepo.save(mensualidad);

    // Si se registra como pagada, desbloquear el despacho automáticamente
    if (dto.estado === EstadoMensualidad.PAGADO) {
      await this.despachoRepo.update(dto.despachoId, {
        bloqueado: false,
        fechaVencimientoPago: dto.fechaVencimiento,
      });
    }
    return saved;
  }

  async updateMensualidad(id: number, dto: any) {
    await this.mensualidadRepo.update(id, dto);
    const updated = await this.mensualidadRepo.findOne({ where: { id } });

    // Si se marca como pagada, desbloquear despacho
    if (dto.estado === EstadoMensualidad.PAGADO && updated) {
      await this.despachoRepo.update(updated.despachoId, {
        bloqueado: false,
        fechaVencimientoPago: updated.fechaVencimiento,
      });
    }
    return updated;
  }

  async deleteMensualidad(id: number) {
    const m = await this.mensualidadRepo.findOne({ where: { id } });
    if (!m) throw new NotFoundException('Mensualidad no encontrada');
    return this.mensualidadRepo.remove(m);
  }
}
