import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsuariosController } from './usuarios.controller';
import { UsuariosService } from './usuarios.service';
import { Usuario } from './entities/usuario.entity';
import { Rol } from './entities/rol.entity';
import { Despacho } from '../despachos/entities/despacho.entity';
import { Mensualidad } from '../root/entities/mensualidad.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Usuario, Rol, Despacho, Mensualidad])],
  controllers: [UsuariosController],
  providers: [UsuariosService],
  exports: [UsuariosService],
})
export class UsuariosModule {}
