import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';
import { Expediente } from '../expedientes/entities/expediente.entity';
import { Cliente } from '../clientes/entities/cliente.entity';
import { Pago } from '../pagos/entities/pago.entity';
import { EventoAgenda } from '../agenda/entities/evento-agenda.entity';
import { LogAuditoria } from '../auditoria/entities/log-auditoria.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Expediente, Cliente, Pago, EventoAgenda, LogAuditoria])],
  controllers: [DashboardController],
  providers: [DashboardService],
})
export class DashboardModule {}
