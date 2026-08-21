import { Injectable, NotFoundException, ConflictException, HttpException, HttpStatus } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Not, Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { Usuario } from './entities/usuario.entity';
import { Rol } from './entities/rol.entity';
import { Despacho } from '../despachos/entities/despacho.entity';
import { Mensualidad, EstadoMensualidad, TipoMensualidad } from '../root/entities/mensualidad.entity';
import { CreateUsuarioDto } from './dto/create-usuario.dto';
import { UpdateUsuarioDto } from './dto/update-usuario.dto';
import { generateStrongPassword } from '../common/utils/password-generator';

@Injectable()
export class UsuariosService {
  constructor(
    @InjectRepository(Usuario) private repo: Repository<Usuario>,
    @InjectRepository(Rol) private rolRepo: Repository<Rol>,
    @InjectRepository(Despacho) private despachoRepo: Repository<Despacho>,
    @InjectRepository(Mensualidad) private mensualidadRepo: Repository<Mensualidad>,
  ) {}

  async findAll(despachoId: number) {
    return this.repo.find({
      where: { despachoId },
      relations: { rol: true },
      order: { nombre: 'ASC' },
      select: {
        id: true, nombre: true, apellido: true, email: true, telefono: true, avatar: true, activo: true,
        ultimoAcceso: true, createdAt: true, rolId: true, debeCambiarPassword: true, twoFactorEnabled: true,
      },
    });
  }

  /** Uso interno: incluye password/campos sensibles porque update()/toggleActivo() los necesitan para el re-save */
  async findOne(id: number, despachoId: number) {
    const u = await this.repo.findOne({ where: { id, despachoId }, relations: { rol: true } });
    if (!u) throw new NotFoundException('Usuario no encontrado');
    return u;
  }

  /** Uso en respuestas de API: nunca expone password ni campos de seguridad internos */
  async findOnePublico(id: number, despachoId: number) {
    const { password, intentosFallidos, bloqueadoHasta, twoFactorSecret, twoFactorBackupCodes, ...rest } =
      await this.findOne(id, despachoId) as any;
    return rest;
  }

  private async assertRolAsignable(rolId: number | undefined | null) {
    if (!rolId) return;
    const rol = await this.rolRepo.findOne({ where: { id: rolId } });
    if (!rol) throw new NotFoundException('Rol no encontrado');
    if (rol.nombre?.toLowerCase() === 'root') {
      throw new ConflictException('No se puede asignar el rol root a un usuario de despacho');
    }
  }

  /**
   * Verifica si sumar un usuario activo más (por alta nueva o por reactivación) excede el límite
   * del plan. Si lo excede y no viene confirmExtra, lanza 402 pidiendo confirmación del cargo extra.
   */
  private async verificarLimitePlan(
    despachoId: number,
    confirmExtra: boolean | undefined,
    accion: 'agregar este usuario' | 'reactivar a este usuario',
  ): Promise<{ despacho: Despacho | null; esUsuarioExtra: boolean }> {
    const despacho = await this.despachoRepo.findOne({ where: { id: despachoId }, relations: { plan: true } });
    if (!despacho?.plan) return { despacho, esUsuarioExtra: false };

    const usuariosActuales = await this.repo.count({ where: { despachoId, activo: true } });
    if (usuariosActuales + 1 > despacho.plan.numeroUsuarios) {
      if (!confirmExtra) {
        throw new HttpException({
          requiereConfirmacion: true,
          usuariosActuales,
          limiteUsuarios: despacho.plan.numeroUsuarios,
          precioUsuarioExtra: despacho.plan.precioUsuarioExtra,
          message: `Alcanzaste el límite de ${despacho.plan.numeroUsuarios} usuarios de tu plan. ${accion.charAt(0).toUpperCase() + accion.slice(1)} tendrá un costo extra de $${despacho.plan.precioUsuarioExtra}.`,
        }, HttpStatus.PAYMENT_REQUIRED);
      }
      return { despacho, esUsuarioExtra: true };
    }
    return { despacho, esUsuarioExtra: false };
  }

  private async registrarUsuarioExtra(despacho: Despacho, usuarioId: number) {
    const fechaVencimiento = despacho.fechaVencimientoPago
      ?? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    await this.mensualidadRepo.save(this.mensualidadRepo.create({
      despachoId: despacho.id,
      usuarioId,
      monto: despacho.plan.precioUsuarioExtra,
      tipo: TipoMensualidad.USUARIO_EXTRA,
      estado: EstadoMensualidad.PENDIENTE,
      fechaVencimiento,
    }));
  }

  async create(dto: CreateUsuarioDto, despachoId: number) {
    await this.assertRolAsignable(dto.rolId);

    const existing = await this.repo.findOne({ where: { email: dto.email.toLowerCase() } });
    if (existing) throw new ConflictException('El email ya está en uso');

    const { despacho, esUsuarioExtra } = await this.verificarLimitePlan(despachoId, dto.confirmExtra, 'agregar este usuario');

    const hash = await bcrypt.hash(dto.password, 12);
    const { confirmExtra, ...data } = dto;
    const u = this.repo.create({
      ...data,
      despachoId,
      password: hash,
      email: dto.email.toLowerCase(),
      debeCambiarPassword: true,
    });
    const saved = await this.repo.save(u);

    if (esUsuarioExtra && despacho) {
      await this.registrarUsuarioExtra(despacho, (saved as any).id);
    }

    const { password, intentosFallidos, bloqueadoHasta, twoFactorSecret, twoFactorBackupCodes, ...rest } = saved as any;
    return rest;
  }

  async update(id: number, dto: UpdateUsuarioDto, despachoId: number) {
    await this.assertRolAsignable(dto.rolId);
    const u = await this.findOne(id, despachoId);
    if (dto.password) (dto as any).password = await bcrypt.hash(dto.password, 12);
    Object.assign(u, dto);
    const saved = await this.repo.save(u);
    const { password, intentosFallidos, bloqueadoHasta, twoFactorSecret, twoFactorBackupCodes, ...rest } = saved as any;
    return rest;
  }

  /** Genera una nueva contraseña temporal (el usuario deberá fijar la definitiva en su siguiente login) */
  async resetPassword(id: number, despachoId: number) {
    const u = await this.findOne(id, despachoId);
    const nuevaPassword = generateStrongPassword();
    const hash = await bcrypt.hash(nuevaPassword, 12);
    await this.repo.update(id, {
      password: hash,
      debeCambiarPassword: true,
      intentosFallidos: 0,
      bloqueadoHasta: null as any,
    });
    return { email: u.email, password: nuevaPassword };
  }

  async toggleActivo(id: number, despachoId: number, confirmExtra?: boolean) {
    const u = await this.findOne(id, despachoId);
    const reactivando = !u.activo;

    if (reactivando) {
      const { despacho, esUsuarioExtra } = await this.verificarLimitePlan(despachoId, confirmExtra, 'reactivar a este usuario');
      if (esUsuarioExtra && despacho) {
        await this.registrarUsuarioExtra(despacho, id);
      }
    }

    u.activo = !u.activo;
    const saved = await this.repo.save(u);
    const { password, intentosFallidos, bloqueadoHasta, twoFactorSecret, twoFactorBackupCodes, ...rest } = saved as any;
    return rest;
  }

  async getRoles() {
    return this.rolRepo.find({ where: { nombre: Not('root') }, order: { nombre: 'ASC' } });
  }

  async getStats(despachoId: number) {
    const total = await this.repo.count({ where: { despachoId } });
    const activos = await this.repo.count({ where: { despachoId, activo: true } });
    return { total, activos };
  }
}
