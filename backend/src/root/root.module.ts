import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RootController } from './root.controller';
import { RootService } from './root.service';
import { Despacho } from '../despachos/entities/despacho.entity';
import { Usuario } from '../usuarios/entities/usuario.entity';
import { Rol } from '../usuarios/entities/rol.entity';
import { Mensualidad } from './entities/mensualidad.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Despacho, Usuario, Rol, Mensualidad]),
  ],
  controllers: [RootController],
  providers: [RootService],
})
export class RootModule {}
