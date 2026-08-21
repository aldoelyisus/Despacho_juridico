import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PagosController } from './pagos.controller';
import { PagosService } from './pagos.service';
import { Pago } from './entities/pago.entity';
import { PagoDetalle } from './entities/pago-detalle.entity';
import { Servicio } from '../catalogos/entities/servicio.entity';
import { Expediente } from '../expedientes/entities/expediente.entity';
import { Cliente } from '../clientes/entities/cliente.entity';
import { Descuento } from '../descuentos/entities/descuento.entity';
import { DescuentosService } from '../descuentos/descuentos.service';

@Module({
  imports: [TypeOrmModule.forFeature([Pago, PagoDetalle, Servicio, Expediente, Cliente, Descuento])],
  controllers: [PagosController],
  providers: [PagosService, DescuentosService],
  exports: [PagosService],
})
export class PagosModule {}

