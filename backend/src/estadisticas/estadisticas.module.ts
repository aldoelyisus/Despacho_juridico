import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EstadisticasService } from './estadisticas.service';
import { IngresoDiarioDespacho } from './entities/ingreso-diario-despacho.entity';
import { IngresoMensualDespacho } from './entities/ingreso-mensual-despacho.entity';
import { ExpedienteEstadoSnapshot } from './entities/expediente-estado-snapshot.entity';
import { PagoDetalle } from '../pagos/entities/pago-detalle.entity';
import { Expediente } from '../expedientes/entities/expediente.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      IngresoDiarioDespacho, IngresoMensualDespacho, ExpedienteEstadoSnapshot, PagoDetalle, Expediente,
    ]),
  ],
  providers: [EstadisticasService],
  exports: [EstadisticasService],
})
export class EstadisticasModule {}
