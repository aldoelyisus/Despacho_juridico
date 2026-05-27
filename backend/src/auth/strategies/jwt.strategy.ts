import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Usuario } from '../../usuarios/entities/usuario.entity';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private config: ConfigService,
    @InjectRepository(Usuario)
    private usuarioRepo: Repository<Usuario>,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
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
