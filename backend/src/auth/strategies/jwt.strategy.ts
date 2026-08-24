import { Injectable, UnauthorizedException, ForbiddenException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Request } from 'express';
import { Usuario } from '../../usuarios/entities/usuario.entity';

/** Prioriza la cookie httpOnly (flujo real de la app); el header Authorization queda como
 *  fallback para poder probar endpoints manualmente desde Swagger UI. */
const cookieExtractor = (req: Request): string | null => req?.cookies?.accessToken || null;

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private config: ConfigService,
    @InjectRepository(Usuario)
    private usuarioRepo: Repository<Usuario>,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([cookieExtractor, ExtractJwt.fromAuthHeaderAsBearerToken()]),
      ignoreExpiration: false,
      secretOrKey: config.get('JWT_SECRET', 'fallback_secret'),
    });
  }

  async validate(payload: any) {
    const usuario = await this.usuarioRepo.findOne({
      where: { id: payload.sub, activo: true },
      relations: { rol: true, despacho: true },
    });
    if (!usuario) throw new UnauthorizedException('Usuario no encontrado');

    const isRoot = usuario.rol?.nombre?.toLowerCase() === 'root';
    if (!isRoot && usuario.despacho) {
      if (!usuario.despacho.activo) {
        throw new ForbiddenException({
          code: 'DESPACHO_DESACTIVADO',
          message: 'El despacho está desactivado',
        });
      }
      if (usuario.despacho.bloqueado) {
        throw new ForbiddenException({
          code: 'DESPACHO_BLOQUEADO',
          message: 'El acceso de tu despacho está suspendido por falta de pago. Contacta al administrador del sistema.',
        });
      }
    }

    return {
      id: usuario.id,
      email: usuario.email,
      nombre: usuario.nombre,
      apellido: usuario.apellido,
      despachoId: usuario.despachoId,
      rolId: usuario.rolId,
      rol: usuario.rol,
    };
  }
}
