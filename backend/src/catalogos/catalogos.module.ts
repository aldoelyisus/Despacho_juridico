import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CatalogosController } from './catalogos.controller';
import { CatalogosService } from './catalogos.service';
import { AreaDerecho } from './entities/area-derecho.entity';
import { Subarea } from './entities/subarea.entity';
import { Servicio } from './entities/servicio.entity';
import { Expediente } from '../expedientes/entities/expediente.entity';
import { AuditoriaModule } from '../auditoria/auditoria.module';

@Module({
  imports: [TypeOrmModule.forFeature([AreaDerecho, Subarea, Servicio, Expediente]), AuditoriaModule],
  controllers: [CatalogosController],
  providers: [CatalogosService],
  exports: [CatalogosService],
})
export class CatalogosModule {}
