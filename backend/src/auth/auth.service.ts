import {
  Injectable,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
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

  async login(dto: LoginDto) {
    const usuario = await this.usuarioRepo.findOne({
      where: { email: dto.email.toLowerCase(), activo: true },
      relations: { rol: true, despacho: true },
    });
    if (!usuario) throw new UnauthorizedException('Credenciales inválidas');

    const valid = await bcrypt.compare(dto.password, usuario.password);
    if (!valid) throw new UnauthorizedException('Credenciales inválidas');

    // ROOT — no tiene despacho, acceso siempre permitido
    const isRoot = usuario.rol?.nombre?.toLowerCase() === 'root';

    if (!isRoot) {
      // Verificar que el despacho no esté bloqueado o desactivado
      if (!usuario.despacho) throw new UnauthorizedException('Despacho no encontrado');
      if (!usuario.despacho.activo) throw new ForbiddenException('El despacho está desactivado');
      if (usuario.despacho.bloqueado) {
        throw new ForbiddenException(
          'El acceso de tu despacho está suspendido por falta de pago. Contacta al administrador del sistema.',
        );
      }
    }

    await this.usuarioRepo.update(usuario.id, { ultimoAcceso: new Date() });

    const tokens = await this.generateTokens(usuario);
    return {
      ...tokens,
      usuario: {
        id: usuario.id,
        nombre: usuario.nombre,
        apellido: usuario.apellido,
        email: usuario.email,
        avatar: usuario.avatar,
        rol: usuario.rol,
        despacho: isRoot ? null : {
          id: usuario.despacho.id,
          nombre: usuario.despacho.nombre,
          logo: usuario.despacho.logo,
        },
      },
    };
  }

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

  // ── Semilla root + roles por defecto ──────────────────────────────────────
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
    if (exists) return; // Ya existe, no recrear

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
