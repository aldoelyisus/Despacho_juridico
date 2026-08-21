import {
  Injectable,
  UnauthorizedException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import * as speakeasy from 'speakeasy';
import * as QRCode from 'qrcode';
import { randomInt } from 'crypto';
import { Usuario } from '../usuarios/entities/usuario.entity';
import { Despacho } from '../despachos/entities/despacho.entity';
import { Rol } from '../usuarios/entities/rol.entity';
import { LoginDto } from './dto/login.dto';
import { AuditoriaService } from '../auditoria/auditoria.service';

// Hash bcrypt fijo (no corresponde a ninguna contraseña real) usado para comparar cuando
// el usuario no existe, así el tiempo de respuesta del login no delata si el correo está
// registrado (mitigación de timing attack / enumeración de usuarios).
const DUMMY_PASSWORD_HASH = '$2b$12$a1VKQ0qLuDZYWhXMd3lX5uYgaUFMHOgZ9bl1zDfFljXyx.XQcTGYq';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(Usuario)  private usuarioRepo: Repository<Usuario>,
    @InjectRepository(Despacho) private despachoRepo: Repository<Despacho>,
    @InjectRepository(Rol)      private rolRepo: Repository<Rol>,
    private jwtService: JwtService,
    private config: ConfigService,
    private auditoriaService: AuditoriaService,
  ) {}

  private get maxIntentos(): number {
    return Number(this.config.get('LOGIN_MAX_INTENTOS', 5));
  }

  private get bloqueoMinutos(): number {
    return Number(this.config.get('LOGIN_BLOQUEO_MINUTOS', 15));
  }

  // ── LOGIN ─────────────────────────────────────────────────────────────────
  async login(dto: LoginDto, ip?: string) {
    const usuario = await this.usuarioRepo.findOne({
      where: { email: dto.email.toLowerCase(), activo: true },
      relations: { rol: true, despacho: true },
    });

    if (usuario) await this.assertCuentaNoBloqueada(usuario, ip);

    // Siempre se ejecuta bcrypt.compare (contra el hash real o uno dummy) para que el
    // tiempo de respuesta sea el mismo exista o no el usuario / sea cual sea la contraseña.
    const valid = await bcrypt.compare(dto.password, usuario?.password ?? DUMMY_PASSWORD_HASH);

    if (!usuario || !valid) {
      if (usuario) await this.registrarIntentoFallido(usuario, ip);
      else await this.logIntento('LOGIN_FALLIDO', null, dto.email, ip);
      throw new UnauthorizedException('Credenciales inválidas');
    }

    const isRoot = usuario.rol?.nombre?.toLowerCase() === 'root';

    if (!isRoot) {
      if (!usuario.despacho) throw new UnauthorizedException('Despacho no encontrado');
      if (!usuario.despacho.activo) throw new ForbiddenException('El despacho está desactivado');
      if (usuario.despacho.bloqueado) {
        throw new ForbiddenException(
          'El acceso de tu despacho está suspendido por falta de pago. Contacta al administrador del sistema.',
        );
      }
    }

    await this.usuarioRepo.update(usuario.id, {
      ultimoAcceso: new Date(),
      intentosFallidos: 0,
      bloqueadoHasta: null as any,
    });
    usuario.intentosFallidos = 0;
    usuario.bloqueadoHasta = null as any;

    return this.postCredencialesValidas(usuario, isRoot, ip);
  }

  /**
   * Continúa el flujo tras validar la contraseña (o al completar un cambio de contraseña
   * forzado): exige cambio de contraseña si corresponde, luego 2FA si corresponde, o entrega tokens.
   */
  private async postCredencialesValidas(usuario: Usuario, isRoot: boolean, ip?: string) {
    if (usuario.debeCambiarPassword) {
      await this.logIntento('LOGIN_REQUIERE_CAMBIO_PASSWORD', usuario, usuario.email, ip);
      const tempToken = this.jwtService.sign(
        { sub: usuario.id, type: 'password_change_pending' },
        { secret: this.config.get('JWT_SECRET'), expiresIn: '5m' },
      );
      return { requiresPasswordChange: true, tempToken };
    }

    // Si tiene 2FA activo → emitir temp token en lugar de tokens reales
    if (usuario.twoFactorEnabled) {
      await this.logIntento('LOGIN_REQUIERE_2FA', usuario, usuario.email, ip);
      const tempToken = this.jwtService.sign(
        { sub: usuario.id, type: '2fa_pending' },
        {
          secret: this.config.get('JWT_SECRET'),
          expiresIn: '5m',
        },
      );
      return { requires2FA: true, tempToken };
    }

    await this.logIntento('LOGIN_EXITOSO', usuario, usuario.email, ip);
    const tokens = await this.generateTokens(usuario);
    return {
      ...tokens,
      usuario: this.buildUsuarioPayload(usuario, isRoot),
    };
  }

  /** accionFallo permite reutilizar el mismo contador/bloqueo de cuenta para intentos fallidos
   *  de contraseña (LOGIN_FALLIDO) o de código 2FA (2FA_FALLIDO) — cualquiera de los dos agota
   *  el mismo límite de intentos, porque ambos son intentos de autenticación contra la cuenta. */
  private async registrarIntentoFallido(usuario: Usuario, ip?: string, accionFallo: string = 'LOGIN_FALLIDO') {
    const intentos = (usuario.intentosFallidos ?? 0) + 1;
    if (intentos >= this.maxIntentos) {
      const bloqueadoHasta = new Date(Date.now() + this.bloqueoMinutos * 60000);
      await this.usuarioRepo.update(usuario.id, { intentosFallidos: 0, bloqueadoHasta });
      await this.logIntento('CUENTA_BLOQUEADA', usuario, usuario.email, ip);
    } else {
      await this.usuarioRepo.update(usuario.id, { intentosFallidos: intentos });
      await this.logIntento(accionFallo, usuario, usuario.email, ip);
    }
  }

  /** Usado tanto al iniciar sesión con contraseña como al verificar el código 2FA: ambos son
   *  intentos de autenticación contra la misma cuenta y comparten el mismo bloqueo temporal. */
  private async assertCuentaNoBloqueada(usuario: Usuario, ip?: string) {
    if (usuario.bloqueadoHasta && usuario.bloqueadoHasta.getTime() > Date.now()) {
      await this.logIntento('LOGIN_BLOQUEADO', usuario, usuario.email, ip);
      const minutosRestantes = Math.ceil((usuario.bloqueadoHasta.getTime() - Date.now()) / 60000);
      throw new ForbiddenException(
        `Cuenta bloqueada temporalmente por múltiples intentos fallidos. Intenta de nuevo en ${minutosRestantes} minuto(s).`,
      );
    }
  }

  /** Mismo criterio que JwtStrategy: una sesión deja de ser válida si el usuario fue desactivado
   *  o su despacho quedó bloqueado/desactivado — se aplica también al refrescar tokens, para que
   *  no se puedan seguir renovando tokens indefinidamente después de perder el acceso. */
  private assertSesionActiva(usuario: Usuario & { rol?: Rol; despacho?: Despacho }) {
    const isRoot = usuario.rol?.nombre?.toLowerCase() === 'root';
    if (isRoot || !usuario.despacho) return;
    if (!usuario.despacho.activo) {
      throw new ForbiddenException('El despacho está desactivado');
    }
    if (usuario.despacho.bloqueado) {
      throw new ForbiddenException(
        'El acceso de tu despacho está suspendido por falta de pago. Contacta al administrador del sistema.',
      );
    }
  }

  private async logIntento(accion: string, usuario: Usuario | null, emailIntentado: string, ip?: string) {
    try {
      await this.auditoriaService.log({
        despachoId: usuario?.despachoId ?? null,
        usuarioId: usuario?.id ?? null,
        usuarioNombre: usuario ? `${usuario.nombre} ${usuario.apellido}` : emailIntentado,
        accion,
        modulo: 'AUTH',
        descripcion: `${accion} — ${emailIntentado}`,
        ip,
      });
    } catch {
      // La auditoría nunca debe interrumpir el flujo de autenticación
    }
  }

  // ── CAMBIO DE CONTRASEÑA OBLIGATORIO ────────────────────────────────────────
  async changePasswordRequired(tempToken: string, newPassword: string, ip?: string) {
    let payload: any;
    try {
      payload = this.jwtService.verify(tempToken, {
        secret: this.config.get('JWT_SECRET'),
      });
    } catch {
      throw new UnauthorizedException('Token temporal inválido o expirado');
    }

    if (payload.type !== 'password_change_pending') {
      throw new UnauthorizedException('Token inválido');
    }

    const usuario = await this.usuarioRepo.findOne({
      where: { id: payload.sub, activo: true },
      relations: { rol: true, despacho: true },
    });
    if (!usuario) throw new UnauthorizedException('Usuario no encontrado');
    if (!usuario.debeCambiarPassword) {
      throw new BadRequestException('Este usuario no requiere cambiar su contraseña');
    }

    const sameAsCurrent = await bcrypt.compare(newPassword, usuario.password);
    if (sameAsCurrent) {
      throw new BadRequestException('La nueva contraseña debe ser diferente a la actual');
    }

    const hash = await bcrypt.hash(newPassword, 12);
    await this.usuarioRepo.update(usuario.id, {
      password: hash,
      debeCambiarPassword: false,
      intentosFallidos: 0,
      bloqueadoHasta: null as any,
    });
    usuario.password = hash;
    usuario.debeCambiarPassword = false;

    await this.logIntento('PASSWORD_CAMBIO_COMPLETADO', usuario, usuario.email, ip);

    const isRoot = usuario.rol?.nombre?.toLowerCase() === 'root';
    return this.postCredencialesValidas(usuario, isRoot, ip);
  }

  // ── VERIFICAR CÓDIGO 2FA ──────────────────────────────────────────────────
  async verify2FA(tempToken: string, code: string, ip?: string) {
    let payload: any;
    try {
      payload = this.jwtService.verify(tempToken, {
        secret: this.config.get('JWT_SECRET'),
      });
    } catch {
      throw new UnauthorizedException('Token temporal inválido o expirado');
    }

    if (payload.type !== '2fa_pending') {
      throw new UnauthorizedException('Token inválido');
    }

    const usuario = await this.usuarioRepo.findOne({
      where: { id: payload.sub, activo: true },
      relations: { rol: true, despacho: true },
    });
    if (!usuario) throw new UnauthorizedException('Usuario no encontrado');

    // El mismo bloqueo por intentos fallidos que protege la contraseña también protege el
    // código 2FA: sin esto, alguien con la contraseña correcta podría intentar códigos TOTP
    // sin límite mientras el token temporal (5 min) siga vigente.
    await this.assertCuentaNoBloqueada(usuario, ip);

    if (!usuario.twoFactorEnabled || !usuario.twoFactorSecret) {
      throw new BadRequestException('2FA no está activo en esta cuenta');
    }

    // Verificar código TOTP
    const isValid = speakeasy.totp.verify({
      secret: usuario.twoFactorSecret,
      encoding: 'base32',
      token: code.replace(/\s/g, ''),
      window: 1, // permite ±30 seg de desfase
    });

    // Si no es TOTP válido, intentar backup code
    if (!isValid) {
      const backupUsed = await this.tryBackupCode(usuario, code);
      if (!backupUsed) {
        await this.registrarIntentoFallido(usuario, ip, '2FA_FALLIDO');
        throw new UnauthorizedException('Código incorrecto');
      }
    }

    await this.usuarioRepo.update(usuario.id, { intentosFallidos: 0, bloqueadoHasta: null as any });
    await this.logIntento('2FA_EXITOSO', usuario, usuario.email, ip);

    const isRoot = usuario.rol?.nombre?.toLowerCase() === 'root';
    const tokens = await this.generateTokens(usuario);
    return {
      ...tokens,
      usuario: this.buildUsuarioPayload(usuario, isRoot),
    };
  }

  private async tryBackupCode(usuario: Usuario, code: string): Promise<boolean> {
    if (!usuario.twoFactorBackupCodes?.length) return false;
    const clean = code.trim().toUpperCase();
    const idx = usuario.twoFactorBackupCodes.findIndex((h) => h === clean);
    if (idx === -1) return false;
    // Consumir el backup code (solo se usa una vez)
    const remaining = [...usuario.twoFactorBackupCodes];
    remaining.splice(idx, 1);
    await this.usuarioRepo.update(usuario.id, { twoFactorBackupCodes: remaining });
    return true;
  }

  // ── SETUP 2FA — genera QR ─────────────────────────────────────────────────
  async setup2FA(userId: number) {
    const usuario = await this.usuarioRepo.findOne({ where: { id: userId } });
    if (!usuario) throw new UnauthorizedException();

    const secret = speakeasy.generateSecret({
      name: `Despacho Jurídico (${usuario.email})`,
      length: 20,
    });

    // Guardar secreto temporalmente (aún no activado)
    await this.usuarioRepo.update(userId, {
      twoFactorSecret: secret.base32,
      twoFactorEnabled: false,
    });

    const otpauthUrl = secret.otpauth_url!;
    const qrCode = await QRCode.toDataURL(otpauthUrl);

    return { qrCode, secret: secret.base32 };
  }

  // ── ACTIVAR 2FA ───────────────────────────────────────────────────────────
  async enable2FA(userId: number, code: string) {
    const usuario = await this.usuarioRepo.findOne({ where: { id: userId } });
    if (!usuario) throw new UnauthorizedException();
    if (!usuario.twoFactorSecret) {
      throw new BadRequestException('Primero debes generar el código QR');
    }
    if (usuario.twoFactorEnabled) {
      throw new BadRequestException('El 2FA ya está activo');
    }

    const isValid = speakeasy.totp.verify({
      secret: usuario.twoFactorSecret,
      encoding: 'base32',
      token: code.replace(/\s/g, ''),
      window: 1,
    });
    if (!isValid) throw new BadRequestException('Código incorrecto. Verifica la hora de tu dispositivo.');

    // Generar backup codes
    const backupCodes = this.generateBackupCodes();

    await this.usuarioRepo.update(userId, {
      twoFactorEnabled: true,
      twoFactorBackupCodes: backupCodes,
    });

    return { enabled: true, backupCodes };
  }

  // ── DESACTIVAR 2FA ────────────────────────────────────────────────────────
  async disable2FA(userId: number, code: string) {
    const usuario = await this.usuarioRepo.findOne({ where: { id: userId } });
    if (!usuario) throw new UnauthorizedException();
    if (!usuario.twoFactorEnabled) {
      throw new BadRequestException('El 2FA no está activo');
    }

    const isValid = speakeasy.totp.verify({
      secret: usuario.twoFactorSecret!,
      encoding: 'base32',
      token: code.replace(/\s/g, ''),
      window: 1,
    });
    if (!isValid) throw new BadRequestException('Código incorrecto');

    await this.usuarioRepo.update(userId, {
      twoFactorEnabled: false,
      twoFactorSecret: null as any,
      twoFactorBackupCodes: null as any,
    });

    return { disabled: true };
  }

  // ── OBTENER ESTADO 2FA ────────────────────────────────────────────────────
  async get2FAStatus(userId: number) {
    const usuario = await this.usuarioRepo.findOne({ where: { id: userId } });
    if (!usuario) throw new UnauthorizedException();
    return {
      twoFactorEnabled: usuario.twoFactorEnabled,
      backupCodesRemaining: usuario.twoFactorBackupCodes?.length ?? 0,
    };
  }

  // ── HELPERS ───────────────────────────────────────────────────────────────
  private generateBackupCodes(): string[] {
    const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // sin caracteres ambiguos
    const randomPart = (len: number) =>
      Array.from({ length: len }, () => alphabet[randomInt(0, alphabet.length)]).join('');
    return Array.from({ length: 8 }, () => `${randomPart(4)}-${randomPart(4)}`);
  }

  private buildUsuarioPayload(usuario: Usuario, isRoot: boolean) {
    return {
      id: usuario.id,
      nombre: usuario.nombre,
      apellido: usuario.apellido,
      email: usuario.email,
      avatar: usuario.avatar,
      twoFactorEnabled: usuario.twoFactorEnabled,
      rol: usuario.rol,
      despacho: isRoot ? null : {
        id: usuario.despacho?.id,
        nombre: usuario.despacho?.nombre,
        logo: usuario.despacho?.logo,
      },
    };
  }

  // ── TOKENS ────────────────────────────────────────────────────────────────
  private async generateTokens(usuario: Usuario & { rol?: Rol }) {
    const payload = {
      sub: usuario.id,
      email: usuario.email,
      despachoId: usuario.despachoId ?? null,
      rolId: usuario.rolId,
      rolNombre: usuario.rol?.nombre,
    };
    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret: this.config.get('JWT_SECRET'),
        expiresIn: this.config.get('JWT_EXPIRES_IN', '15m'),
      }),
      this.jwtService.signAsync(payload, {
        secret: this.config.get('JWT_REFRESH_SECRET'),
        expiresIn: this.config.get('JWT_REFRESH_EXPIRES_IN', '7d'),
      }),
    ]);
    return { accessToken, refreshToken };
  }

  async refreshToken(refreshToken: string) {
    let payload: any;
    try {
      payload = this.jwtService.verify(refreshToken, {
        secret: this.config.get('JWT_REFRESH_SECRET'),
      });
    } catch {
      throw new UnauthorizedException('Refresh token inválido');
    }

    // activo: true — un usuario desactivado no debe poder seguir renovando su sesión
    // indefinidamente solo porque su refresh token (hasta 7 días) todavía no expiró.
    const usuario = await this.usuarioRepo.findOne({
      where: { id: payload.sub, activo: true },
      relations: { rol: true, despacho: true },
    });
    if (!usuario) {
      throw new UnauthorizedException('Sesión inválida: el usuario ya no existe o fue desactivado');
    }
    this.assertSesionActiva(usuario);

    return this.generateTokens(usuario);
  }

  // ── SEMILLA ───────────────────────────────────────────────────────────────
  async seedSystem() {
    await this.seedRoles();
    await this.seedRootUser();
  }

  private async seedRoles() {
    const roles = [
      { nombre: 'root',          descripcion: 'Dueño del sistema SaaS', permisos: { all: ['*'] } },
      { nombre: 'administrador', descripcion: 'Acceso completo al despacho', permisos: { all: ['ver','crear','editar','eliminar'] } },
      { nombre: 'abogado',       descripcion: 'Gestión de expedientes y clientes', permisos: {} },
      { nombre: 'asistente',     descripcion: 'Apoyo administrativo', permisos: {} },
      { nombre: 'contador',      descripcion: 'Gestión financiera', permisos: {} },
    ];
    for (const role of roles) {
      const exists = await this.rolRepo.findOne({ where: { nombre: role.nombre } });
      if (!exists) await this.rolRepo.save(this.rolRepo.create(role));
    }
  }

  private async seedRootUser() {
    const rootEmail = this.config.get('ROOT_EMAIL', 'root@sistema.com');
    const exists = await this.usuarioRepo.findOne({ where: { email: rootEmail } });
    if (exists) return;

    const rootRol = await this.rolRepo.findOne({ where: { nombre: 'root' } });
    if (!rootRol) return;

    const rootPassword = this.config.get('ROOT_PASSWORD', 'Root@2024!');
    const hash = await bcrypt.hash(rootPassword, 12);

    const root = this.usuarioRepo.create({
      nombre: 'Root',
      apellido: 'Sistema',
      email: rootEmail,
      password: hash,
      rolId: rootRol.id,
      despachoId: null as any,
      activo: true,
    });
    await this.usuarioRepo.save(root);
    console.log(`\n👑 Usuario root creado: ${rootEmail} / ${rootPassword}`);
    console.log('   ⚠️  Cambia la contraseña en producción (ROOT_PASSWORD en .env)\n');
  }
}
