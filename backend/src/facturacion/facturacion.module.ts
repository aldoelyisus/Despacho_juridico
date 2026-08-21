import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FacturacionController } from './facturacion.controller';
import { FacturacionService } from './facturacion.service';
import { Despacho } from '../despachos/entities/despacho.entity';
import { Mensualidad } from '../root/entities/mensualidad.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Despacho, Mensualidad])],
  controllers: [FacturacionController],
  providers: [FacturacionService],
})
export class FacturacionModule {}
