import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PagosController } from './pagos.controller';
import { PagosService } from './pagos.service';
import { Pago } from './entities/pago.entity';
import { PagoDetalle } from './entities/pago-detalle.entity';
import { Servicio } from '../catalogos/entities/servicio.entity';
import { Expediente } from '../expedientes/entities/expediente.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Pago, PagoDetalle, Servicio, Expediente])],
  controllers: [PagosController],
  providers: [PagosService],
  exports: [PagosService],
})
export class PagosModule {}
