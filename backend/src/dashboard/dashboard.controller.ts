import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery, ApiResponse } from '@nestjs/swagger';
import { DashboardService } from './dashboard.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('📊 Dashboard')
@ApiBearerAuth('JWT-auth')
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly service: DashboardService) {}

  @Get('kpis')
  @ApiOperation({ summary: 'KPIs principales del dashboard' })
  getKpis(@CurrentUser('despachoId') despachoId: number) {
    return this.service.getKpis(despachoId);
  }

  @Get('rendimiento-usuarios')
  @ApiOperation({ summary: 'Rendimiento por usuario/abogado' })
  getRendimiento(@CurrentUser('despachoId') despachoId: number) {
    return this.service.getRendimientoUsuarios(despachoId);
  }

  @Get('ingresos-historico')
  @ApiOperation({ summary: 'Historial de ingresos por mes' })
  getIngresosHistorico(
    @CurrentUser('despachoId') despachoId: number,
    @Query('meses') meses: number,
  ) {
    return this.service.getIngresosHistorico(despachoId, meses || 6);
  }

  @Get('expedientes-historico')
  @ApiOperation({ summary: 'Tendencia de expedientes por estatus de los últimos N días (foto diaria, no acumulativa)' })
  getExpedientesHistorico(
    @CurrentUser('despachoId') despachoId: number,
    @Query('dias') dias: number,
  ) {
    return this.service.getExpedientesHistorico(despachoId, dias || 30);
  }

  @Get('periodo')
  @ApiOperation({ summary: 'Resumen de ingresos (sumados) y expedientes (foto al cierre) de un período, comparado con el período anterior' })
  @ApiQuery({ name: 'tipo', enum: ['mes', 'bimestre', 'trimestre', 'semestre', 'anio'] })
  @ApiQuery({ name: 'anio', example: 2026 })
  @ApiQuery({ name: 'valor', required: false, description: 'Mes 1-12, bimestre 1-6, trimestre 1-4, semestre 1-2. No aplica para tipo=anio' })
  @ApiResponse({ status: 400, description: 'Tipo o valor de período inválido' })
  getResumenPeriodo(
    @CurrentUser('despachoId') despachoId: number,
    @Query('tipo') tipo: string,
    @Query('anio') anio: number,
    @Query('valor') valor?: number,
  ) {
    return this.service.getResumenPeriodo(despachoId, tipo, +anio, valor !== undefined ? +valor : undefined);
  }

  @Get('periodo/dias')
  @ApiOperation({ summary: 'Ingresos sumados y expedientes al cierre de un rango de días específico dentro de un mes' })
  @ApiQuery({ name: 'desde', example: '2026-08-01' })
  @ApiQuery({ name: 'hasta', example: '2026-08-15' })
  @ApiResponse({ status: 400, description: '"desde"/"hasta" faltantes o "desde" posterior a "hasta"' })
  getResumenDia(
    @CurrentUser('despachoId') despachoId: number,
    @Query('desde') desde: string,
    @Query('hasta') hasta: string,
  ) {
    return this.service.getResumenDia(despachoId, desde, hasta);
  }
}
