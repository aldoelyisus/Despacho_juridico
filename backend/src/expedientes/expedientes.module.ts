import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ExpedientesController } from './expedientes.controller';
import { ExpedientesService } from './expedientes.service';
import { Expediente } from './entities/expediente.entity';
import { Documento } from './entities/documento.entity';
import { Observacion } from './entities/observacion.entity';
import { EventoExpediente } from './entities/evento-expediente.entity';
import { Cliente } from '../clientes/entities/cliente.entity';
import { Usuario } from '../usuarios/entities/usuario.entity';
import { Despacho } from '../despachos/entities/despacho.entity';
import { AuditoriaModule } from '../auditoria/auditoria.module';
import { StorageModule } from '../common/storage.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Expediente, Documento, Observacion, EventoExpediente, Cliente, Usuario, Despacho]),
    AuditoriaModule,
    StorageModule,
  ],
  controllers: [ExpedientesController],
  providers: [ExpedientesService],
  exports: [ExpedientesService],
})
export class ExpedientesModule {}
