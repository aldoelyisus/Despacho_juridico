import { Controller, Get, Post, Patch, Delete, Body, Param, Query, ParseIntPipe, Ip } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery, ApiResponse } from '@nestjs/swagger';
import { CatalogosService } from './catalogos.service';
import { CreateAreaDto } from './dto/create-area.dto';
import { UpdateAreaDto } from './dto/update-area.dto';
import { CreateSubareaDto } from './dto/create-subarea.dto';
import { UpdateSubareaDto } from './dto/update-subarea.dto';
import { CreateServicioDto } from './dto/create-servicio.dto';
import { UpdateServicioDto } from './dto/update-servicio.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('📚 Catálogos')
@ApiBearerAuth('JWT-auth')
@Controller('catalogos')
export class CatalogosController {
  constructor(private readonly service: CatalogosService) {}

  // ── ÁREAS ──────────────────────────────────────────────────────────────────
  @Get('areas')
  @ApiOperation({ summary: 'Áreas del derecho del despacho (búsqueda y paginación quedan registrados en auditoría)' })
  @ApiQuery({ name: 'busqueda', required: false })
  @ApiQuery({ name: 'pagina', required: false })
  @ApiQuery({ name: 'limite', required: false, description: 'Máximo 100' })
  getAreas(
    @CurrentUser('despachoId') despachoId: number,
    @Query() query: any,
    @CurrentUser() usuario: { id: number; nombre: string; apellido: string },
    @Ip() ip: string,
  ) {
    return this.service.getAreas(despachoId, query, usuario, ip);
  }

  @Post('areas')
  @ApiOperation({ summary: 'Crear área del derecho' })
  @ApiResponse({ status: 400, description: 'Datos inválidos' })
  @ApiResponse({ status: 409, description: 'Ya existe un área con el mismo nombre' })
  createArea(@Body() dto: CreateAreaDto, @CurrentUser('despachoId') despachoId: number) {
    return this.service.createArea(dto, despachoId);
  }

  @Patch('areas/:id')
  @ApiOperation({ summary: 'Actualizar área' })
  @ApiResponse({ status: 400, description: 'Datos inválidos' })
  @ApiResponse({ status: 404, description: 'Área no encontrada' })
  @ApiResponse({ status: 409, description: 'Ya existe un área con el mismo nombre' })
  updateArea(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateAreaDto,
    @CurrentUser('despachoId') despachoId: number,
  ) {
    return this.service.updateArea(id, dto, despachoId);
  }

  @Delete('areas/:id')
  @ApiOperation({ summary: 'Desactivar área' })
  @ApiResponse({ status: 404, description: 'Área no encontrada' })
  @ApiResponse({ status: 409, description: 'El área tiene subáreas activas o expedientes vinculados' })
  deleteArea(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser('despachoId') despachoId: number,
  ) {
    return this.service.deleteArea(id, despachoId);
  }

  // ── SUBÁREAS ───────────────────────────────────────────────────────────────
  @Get('subareas')
  @ApiOperation({ summary: 'Subáreas del despacho (opcionalmente filtradas por área)' })
  @ApiQuery({ name: 'areaId', required: false })
  @ApiQuery({ name: 'busqueda', required: false })
  @ApiQuery({ name: 'pagina', required: false })
  @ApiQuery({ name: 'limite', required: false, description: 'Máximo 100' })
  getSubareas(
    @CurrentUser('despachoId') despachoId: number,
    @Query() query: any,
    @CurrentUser() usuario: { id: number; nombre: string; apellido: string },
    @Ip() ip: string,
  ) {
    return this.service.getSubareas(despachoId, query, usuario, ip);
  }

  @Post('subareas')
  @ApiOperation({ summary: 'Crear subárea' })
  @ApiResponse({ status: 400, description: 'Datos inválidos' })
  @ApiResponse({ status: 404, description: 'El área seleccionada no existe' })
  @ApiResponse({ status: 409, description: 'Ya existe una subárea con el mismo nombre en esa área' })
  createSubarea(@Body() dto: CreateSubareaDto, @CurrentUser('despachoId') despachoId: number) {
    return this.service.createSubarea(dto, despachoId);
  }

  @Patch('subareas/:id')
  @ApiOperation({ summary: 'Actualizar subárea' })
  @ApiResponse({ status: 400, description: 'Datos inválidos' })
  @ApiResponse({ status: 404, description: 'Subárea o área no encontrada' })
  @ApiResponse({ status: 409, description: 'Ya existe una subárea con el mismo nombre en esa área' })
  updateSubarea(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateSubareaDto,
    @CurrentUser('despachoId') despachoId: number,
  ) {
    return this.service.updateSubarea(id, dto, despachoId);
  }

  @Delete('subareas/:id')
  @ApiOperation({ summary: 'Desactivar subárea' })
  @ApiResponse({ status: 404, description: 'Subárea no encontrada' })
  @ApiResponse({ status: 409, description: 'La subárea tiene expedientes vinculados' })
  deleteSubarea(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser('despachoId') despachoId: number,
  ) {
    return this.service.deleteSubarea(id, despachoId);
  }

  // ── SERVICIOS ─────────────────────────────────────────────────────────────
  @Get('servicios')
  @ApiOperation({ summary: 'Servicios legales del despacho y sus precios' })
  getServicios(@CurrentUser('despachoId') despachoId: number) {
    return this.service.getServicios(despachoId);
  }

  @Post('servicios')
  @ApiOperation({ summary: 'Registrar un servicio legal y su precio' })
  @ApiResponse({ status: 400, description: 'Datos inválidos (nombre vacío o costo negativo/no numérico)' })
  @ApiResponse({ status: 409, description: 'Ya existe un servicio con el mismo nombre en el despacho' })
  createServicio(@Body() dto: CreateServicioDto, @CurrentUser('despachoId') despachoId: number) {
    return this.service.createServicio(dto, despachoId);
  }

  @Patch('servicios/:id')
  @ApiOperation({ summary: 'Actualizar un servicio legal o su precio' })
  @ApiResponse({ status: 400, description: 'Datos inválidos' })
  @ApiResponse({ status: 404, description: 'Servicio no encontrado' })
  @ApiResponse({ status: 409, description: 'Ya existe un servicio con el mismo nombre en el despacho' })
  updateServicio(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateServicioDto,
    @CurrentUser('despachoId') despachoId: number,
  ) {
    return this.service.updateServicio(id, dto, despachoId);
  }

  @Delete('servicios/:id')
  @ApiOperation({ summary: 'Desactivar un servicio legal' })
  @ApiResponse({ status: 404, description: 'Servicio no encontrado' })
  @ApiResponse({ status: 409, description: 'El servicio tiene expedientes vinculados' })
  deleteServicio(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser('despachoId') despachoId: number,
  ) {
    return this.service.deleteServicio(id, despachoId);
  }
}
