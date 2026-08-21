import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RootController } from './root.controller';
import { RootService } from './root.service';
import { Despacho } from '../despachos/entities/despacho.entity';
import { Usuario } from '../usuarios/entities/usuario.entity';
import { Rol } from '../usuarios/entities/rol.entity';
import { Mensualidad } from './entities/mensualidad.entity';
import { Plan } from '../planes/entities/plan.entity';
import { AuditoriaModule } from '../auditoria/auditoria.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Despacho, Usuario, Rol, Mensualidad, Plan]),
    AuditoriaModule,
  ],
  controllers: [RootController],
  providers: [RootService],
})
export class RootModule {}
