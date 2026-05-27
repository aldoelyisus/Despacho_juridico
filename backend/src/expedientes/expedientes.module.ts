import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MulterModule } from '@nestjs/platform-express';
import { ExpedientesController } from './expedientes.controller';
import { ExpedientesService } from './expedientes.service';
import { Expediente } from './entities/expediente.entity';
import { Documento } from './entities/documento.entity';
import { Observacion } from './entities/observacion.entity';
import { EventoExpediente } from './entities/evento-expediente.entity';
import { Cliente } from '../clientes/entities/cliente.entity';
import { Usuario } from '../usuarios/entities/usuario.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Expediente, Documento, Observacion, EventoExpediente, Cliente, Usuario]),
    MulterModule.register({ dest: './uploads' }),
  ],
  controllers: [ExpedientesController],
  providers: [ExpedientesService],
  exports: [ExpedientesService],
})
export class ExpedientesModule {}
