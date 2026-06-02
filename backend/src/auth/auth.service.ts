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
import { Usuario } from '../usuarios/entities/usuario.entity';
import { Despacho } from '../despachos/entities/despacho.entity';
import { Rol } from '../usuarios/entities/rol.entity';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(Usuario)  private usuarioRepo: Repository<Usuario>,
    @InjectRepository(Despacho) private despachoRepo: Repository<Despacho>,
    @InjectRepository(Rol)      private rolRepo: Repository<Rol>,
    private jwtService: JwtService,
    private config: ConfigService,
  ) {}

  // ── LOGIN ─────────────────────────────────────────────────────────────────
  async login(dto: LoginDto) {
    const usuario = await this.usuarioRepo.findOne({
      where: { email: dto.email.toLowerCase(), activo: true },
      relations: { rol: true, despacho: true },
    });
    if (!usuario) throw new UnauthorizedException('Credenciales inválidas');

    const valid = await bcrypt.compare(dto.password, usuario.password);
    if (!valid) throw new UnauthorizedException('Credenciales inválidas');

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

    await this.usuarioRepo.update(usuario.id, { ultimoAcceso: new Date() });

    // Si tiene 2FA activo → emitir temp token en lugar de tokens reales
    if (usuario.twoFactorEnabled) {
      const tempToken = this.jwtService.sign(
        { sub: usuario.id, type: '2fa_pending' },
        {
          secret: this.config.get('JWT_SECRET'),
          expiresIn: '5m',
        },
      );
      return { requires2FA: true, tempToken };
    }

    const tokens = await this.generateTokens(usuario);
    return {
      ...tokens,
      usuario: this.buildUsuarioPayload(usuario, isRoot),
    };
  }

  // ── VERIFICAR CÓDIGO 2FA ──────────────────────────────────────────────────
  async verify2FA(tempToken: string, code: string) {
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
      if (!backupUsed) throw new UnauthorizedException('Código incorrecto');
    }

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
    const codes: string[] = [];
    for (let i = 0; i < 8; i++) {
      const part1 = Math.random().toString(36).substring(2, 6).toUpperCase();
      const part2 = Math.random().toString(36).substring(2, 6).toUpperCase();
      codes.push(`${part1}-${part2}`);
    }
    return codes;
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
    try {
      const payload = this.jwtService.verify(refreshToken, {
        secret: this.config.get('JWT_REFRESH_SECRET'),
      });
      const usuario = await this.usuarioRepo.findOne({
        where: { id: payload.sub },
        relations: { rol: true },
      });
      if (!usuario) throw new UnauthorizedException();
      return this.generateTokens(usuario as any);
    } catch {
      throw new UnauthorizedException('Refresh token inválido');
    }
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
