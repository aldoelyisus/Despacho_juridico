import { Controller, Post, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { FacturacionService } from './facturacion.service';
import { RootGuard } from '../root/root.guard';

@ApiTags('🧾 Facturación — Cron SaaS')
@ApiBearerAuth('JWT-auth')
@UseGuards(RootGuard)
@Controller('facturacion')
export class FacturacionController {
  constructor(private readonly service: FacturacionService) {}

  @Post('generar-adeudos')
  @ApiOperation({ summary: 'Generar adeudos del mes en curso para todos los despachos (normalmente automático el día 1)' })
  generarAdeudos() {
    return this.service.generarAdeudosMensuales();
  }

  @Post('bloquear-morosos')
  @ApiOperation({ summary: 'Bloquear despachos cuya fecha límite de pago ya venció (normalmente automático cada noche)' })
  bloquearMorosos() {
    return this.service.bloquearMorosos();
  }
}
