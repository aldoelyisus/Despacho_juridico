import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
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
}
