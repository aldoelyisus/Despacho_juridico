import { Controller, Get, Post, Patch, Delete, Body, Param, ParseIntPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { CatalogosService } from './catalogos.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('📚 Catálogos')
@ApiBearerAuth('JWT-auth')
@Controller('catalogos')
export class CatalogosController {
  constructor(private readonly service: CatalogosService) {}

  // ── ÁREAS ──────────────────────────────────────────────────────────────────
  @Get('areas')
  @ApiOperation({ summary: 'Áreas del derecho del despacho' })
  getAreas(@CurrentUser('despachoId') despachoId: number) {
    return this.service.getAreas(despachoId);
  }

  @Post('areas')
  @ApiOperation({ summary: 'Crear área del derecho' })
  createArea(@Body() dto: any, @CurrentUser('despachoId') despachoId: number) {
    return this.service.createArea(dto, despachoId);
  }

  @Patch('areas/:id')
  @ApiOperation({ summary: 'Actualizar área' })
  updateArea(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: any,
    @CurrentUser('despachoId') despachoId: number,
  ) {
    return this.service.updateArea(id, dto, despachoId);
  }

  @Delete('areas/:id')
  @ApiOperation({ summary: 'Desactivar área' })
  deleteArea(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser('despachoId') despachoId: number,
  ) {
    return this.service.deleteArea(id, despachoId);
  }

  // ── SUBÁREAS ───────────────────────────────────────────────────────────────
  @Get('subareas')
  @ApiOperation({ summary: 'Subáreas del despacho' })
  getSubareas(@CurrentUser('despachoId') despachoId: number) {
    return this.service.getSubareas(despachoId);
  }

  @Post('subareas')
  @ApiOperation({ summary: 'Crear subárea' })
  createSubarea(@Body() dto: any, @CurrentUser('despachoId') despachoId: number) {
    return this.service.createSubarea(dto, despachoId);
  }

  @Patch('subareas/:id')
  @ApiOperation({ summary: 'Actualizar subárea' })
  updateSubarea(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: any,
    @CurrentUser('despachoId') despachoId: number,
  ) {
    return this.service.updateSubarea(id, dto, despachoId);
  }

  @Delete('subareas/:id')
  @ApiOperation({ summary: 'Desactivar subárea' })
  deleteSubarea(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser('despachoId') despachoId: number,
  ) {
    return this.service.deleteSubarea(id, despachoId);
  }

  // ── SERVICIOS ──────────────────────────────────────────────────────────────
  @Get('servicios')
  @ApiOperation({ summary: 'Servicios legales del despacho' })
  getServicios(@CurrentUser('despachoId') despachoId: number) {
    return this.service.getServicios(despachoId);
  }

  @Post('servicios')
  @ApiOperation({ summary: 'Crear servicio' })
  createServicio(@Body() dto: any, @CurrentUser('despachoId') despachoId: number) {
    return this.service.createServicio(dto, despachoId);
  }

  @Patch('servicios/:id')
  @ApiOperation({ summary: 'Actualizar servicio' })
  updateServicio(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: any,
    @CurrentUser('despachoId') despachoId: number,
  ) {
    return this.service.updateServicio(id, dto, despachoId);
  }

  @Delete('servicios/:id')
  @ApiOperation({ summary: 'Desactivar servicio' })
  deleteServicio(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser('despachoId') despachoId: number,
  ) {
    return this.service.deleteServicio(id, despachoId);
  }
}
