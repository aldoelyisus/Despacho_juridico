import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { Despacho } from '../despachos/entities/despacho.entity';
import { Usuario } from '../usuarios/entities/usuario.entity';
import { Rol } from '../usuarios/entities/rol.entity';
import { Mensualidad, EstadoMensualidad, TipoMensualidad } from './entities/mensualidad.entity';
import { Plan } from '../planes/entities/plan.entity';
import { calcularFechaLimiteMensualidad } from '../facturacion/facturacion.util';
import { AuditoriaService } from '../auditoria/auditoria.service';
import { evaluatePasswordPolicy } from '../common/validators/password-policy';

@Injectable()
export class RootService {
  constructor(
    @InjectRepository(Despacho)   private despachoRepo: Repository<Despacho>,
    @InjectRepository(Usuario)    private usuarioRepo: Repository<Usuario>,
    @InjectRepository(Rol)        private rolRepo: Repository<Rol>,
    @InjectRepository(Mensualidad) private mensualidadRepo: Repository<Mensualidad>,
    @InjectRepository(Plan)       private planRepo: Repository<Plan>,
    private auditoriaService: AuditoriaService,
  ) {}

  // ── AUDITORÍA ─────────────────────────────────────────────────────────────
  async getAuditoriaSistema(query: any) {
    return this.auditoriaService.findAll(null, query);
  }

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
      relations: { plan: true },
      order: { createdAt: 'DESC' },
    });
    // Enriquecer con conteo de usuarios y próxima mensualidad
    return Promise.all(despachos.map(async (d) => {
      const totalUsuarios = await this.usuarioRepo.count({ where: { despachoId: d.id } });
      const proximaMensualidad = await this.mensualidadRepo.findOne({
        where: { despachoId: d.id, estado: In([EstadoMensualidad.PENDIENTE, EstadoMensualidad.VENCIDO]) },
        order: { fechaVencimiento: 'ASC' },
      });
      return { ...d, totalUsuarios, proximaMensualidad };
    }));
  }

  async createDespacho(dto: any) {
    // 1. Verificar email único
    const existingUser = await this.usuarioRepo.findOne({ where: { email: dto.emailAdmin.toLowerCase() } });
    if (existingUser) throw new ConflictException('El email del administrador ya está en uso');

    // 2. Resolver plan contratado (si viene) para tomar su costo por defecto
    let planMensual = dto.planMensual || 0;
    if (dto.planId) {
      const plan = await this.planRepo.findOne({ where: { id: dto.planId } });
      if (!plan) throw new NotFoundException('Plan no encontrado');
      if (!dto.planMensual) planMensual = plan.costoMensualidad;
    }

    // 3. Crear despacho
    const despacho = this.despachoRepo.create({
      nombre: dto.nombre,
      nombreComercial: dto.nombreComercial,
      email: dto.email,
      telefono: dto.telefono,
      ciudad: dto.ciudad,
      estado: dto.estado,
      planId: dto.planId || null,
      planMensual,
      fechaVencimientoPago: dto.fechaVencimientoPago,
    });
    const savedDespacho = await this.despachoRepo.save(despacho);

    // 4. Obtener rol administrador
    const adminRol = await this.rolRepo.findOne({ where: { nombre: 'administrador' } });
    if (!adminRol) throw new NotFoundException('Rol administrador no encontrado');

    // 5. Crear usuario admin del despacho
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

    // 6. Crear primera mensualidad si viene con plan
    if (planMensual && dto.fechaVencimientoPago) {
      const primerVencimiento = new Date(dto.fechaVencimientoPago);
      await this.mensualidadRepo.save(this.mensualidadRepo.create({
        despachoId: savedDespacho.id,
        monto: planMensual,
        fechaVencimiento: dto.fechaVencimientoPago,
        estado: EstadoMensualidad.PENDIENTE,
        periodoMes: primerVencimiento.getMonth() + 1,
        periodoAnio: primerVencimiento.getFullYear(),
      }));
    }

    return {
      despacho: savedDespacho,
      usuario: {
        ...savedUsuario,
        password: undefined,
        twoFactorSecret: undefined,
        twoFactorBackupCodes: undefined,
        intentosFallidos: undefined,
        bloqueadoHasta: undefined,
      },
    };
  }

  async updateDespacho(id: number, dto: any) {
    // Si se asigna/cambia el plan y no viene un monto explícito, tomar el costo del plan
    if (dto.planId && !(Number(dto.planMensual) > 0)) {
      const plan = await this.planRepo.findOne({ where: { id: dto.planId } });
      if (!plan) throw new NotFoundException('Plan no encontrado');
      dto.planMensual = plan.costoMensualidad;
    }
    await this.despachoRepo.update(id, dto);
    return this.despachoRepo.findOne({ where: { id }, relations: { plan: true } });
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
      select: {
        id: true, nombre: true, apellido: true, email: true, telefono: true, avatar: true,
        activo: true, ultimoAcceso: true, createdAt: true, rolId: true, debeCambiarPassword: true,
        twoFactorEnabled: true,
      },
    });
  }

  async toggleUsuario(id: number) {
    const usuario = await this.usuarioRepo.findOne({ where: { id } });
    if (!usuario) throw new NotFoundException('Usuario no encontrado');
    await this.usuarioRepo.update(id, { activo: !usuario.activo });
    return { id, activo: !usuario.activo };
  }

  async resetPasswordUsuario(id: number, nuevaPassword: string) {
    const policy = evaluatePasswordPolicy(nuevaPassword);
    if (!policy.valid) {
      throw new BadRequestException(policy.errors.join('. '));
    }
    const usuario = await this.usuarioRepo.findOne({ where: { id } });
    if (!usuario) throw new NotFoundException('Usuario no encontrado');
    const hash = await bcrypt.hash(nuevaPassword, 12);
    await this.usuarioRepo.update(id, {
      password: hash,
      intentosFallidos: 0,
      bloqueadoHasta: null as any,
    });
    return { id, message: 'Contraseña actualizada correctamente' };
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

  /** Próximo periodo a facturar según el historial del despacho + periodos aún sin pagar */
  async getEstadoPagos(despachoId: number) {
    const despacho = await this.despachoRepo.findOne({ where: { id: despachoId }, relations: { plan: true } });
    if (!despacho) throw new NotFoundException('Despacho no encontrado');

    const historial = await this.mensualidadRepo.find({
      where: { despachoId, tipo: TipoMensualidad.PLAN },
      order: { periodoAnio: 'ASC', periodoMes: 'ASC' },
    });

    const pendientes = historial.filter((m) => m.estado !== EstadoMensualidad.PAGADO);
    const pagadas = historial.filter((m) => m.estado === EstadoMensualidad.PAGADO);
    const ultimoPagado = pagadas.length ? pagadas[pagadas.length - 1] : null;

    const { mes: siguienteMes, anio: siguienteAnio } = this.siguientePeriodo(historial);
    const monto = Number(despacho.planMensual) > 0
      ? Number(despacho.planMensual)
      : Number(despacho.plan?.costoMensualidad || 0);

    return {
      monto,
      ultimoPagado: ultimoPagado ? { periodoMes: ultimoPagado.periodoMes, periodoAnio: ultimoPagado.periodoAnio } : null,
      pendientes: pendientes.map((m) => ({
        id: m.id, periodoMes: m.periodoMes, periodoAnio: m.periodoAnio,
        monto: m.monto, estado: m.estado, fechaVencimiento: m.fechaVencimiento,
      })),
      siguientePeriodoNuevo: { mes: siguienteMes, anio: siguienteAnio },
    };
  }

  /** Registra el pago de N periodos: primero salda pendientes existentes (del más antiguo), luego genera los que falten */
  async pagarPeriodos(despachoId: number, dto: any) {
    const periodos = Number(dto.periodos);
    if (!periodos || periodos < 1) throw new BadRequestException('Número de periodos inválido');

    const despacho = await this.despachoRepo.findOne({ where: { id: despachoId }, relations: { plan: true } });
    if (!despacho) throw new NotFoundException('Despacho no encontrado');

    const monto = Number(despacho.planMensual) > 0
      ? Number(despacho.planMensual)
      : Number(despacho.plan?.costoMensualidad || 0);
    if (!monto) throw new BadRequestException('El despacho no tiene un monto de plan configurado');

    const historial = await this.mensualidadRepo.find({
      where: { despachoId, tipo: TipoMensualidad.PLAN },
      order: { periodoAnio: 'ASC', periodoMes: 'ASC' },
    });
    const pendientesOrdenados = historial.filter((m) => m.estado !== EstadoMensualidad.PAGADO);

    const resultados: Mensualidad[] = [];
    let restantes = periodos;

    for (const m of pendientesOrdenados) {
      if (restantes <= 0) break;
      m.estado = EstadoMensualidad.PAGADO;
      m.fechaPago = dto.fechaPago;
      m.metodoPago = dto.metodoPago;
      m.referencia = dto.referencia;
      resultados.push(await this.mensualidadRepo.save(m));
      restantes--;
    }

    let { mes: siguienteMes, anio: siguienteAnio } = this.siguientePeriodo(historial);
    while (restantes > 0) {
      const nueva = this.mensualidadRepo.create({
        despachoId,
        monto,
        tipo: TipoMensualidad.PLAN,
        estado: EstadoMensualidad.PAGADO,
        fechaPago: dto.fechaPago,
        metodoPago: dto.metodoPago,
        referencia: dto.referencia,
        periodoMes: siguienteMes,
        periodoAnio: siguienteAnio,
        fechaVencimiento: calcularFechaLimiteMensualidad(despacho.createdAt, siguienteAnio, siguienteMes),
      });
      resultados.push(await this.mensualidadRepo.save(nueva));
      restantes--;
      siguienteMes++;
      if (siguienteMes > 12) { siguienteMes = 1; siguienteAnio++; }
    }

    // El último elemento procesado siempre es el periodo más lejano cubierto en este pago
    const ultimoResultado = resultados[resultados.length - 1];
    await this.despachoRepo.update(despachoId, {
      bloqueado: false,
      fechaVencimientoPago: ultimoResultado.fechaVencimiento,
    });

    return { periodosPagados: resultados.length, mensualidades: resultados };
  }

  private siguientePeriodo(historialOrdenadoAsc: Mensualidad[]) {
    if (historialOrdenadoAsc.length) {
      const ultimo = historialOrdenadoAsc[historialOrdenadoAsc.length - 1];
      let mes = ultimo.periodoMes + 1;
      let anio = ultimo.periodoAnio;
      if (mes > 12) { mes = 1; anio++; }
      return { mes, anio };
    }
    const hoy = new Date();
    return { mes: hoy.getMonth() + 1, anio: hoy.getFullYear() };
  }

  async createMensualidad(dto: any) {
    const vencimiento = new Date(dto.fechaVencimiento);
    const mensualidad = this.mensualidadRepo.create({
      ...dto,
      periodoMes: dto.periodoMes ?? vencimiento.getMonth() + 1,
      periodoAnio: dto.periodoAnio ?? vencimiento.getFullYear(),
    });
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
