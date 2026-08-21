import {
  Controller, Get, Post, Patch, Delete,
  Body, Param, Query, ParseIntPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery, ApiResponse } from '@nestjs/swagger';
import { DescuentosService } from './descuentos.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { CreateDescuentoDto } from './dto/create-descuento.dto';
import { UpdateDescuentoDto } from './dto/update-descuento.dto';

@ApiTags('🏷️ Descuentos')
@ApiBearerAuth('JWT-auth')
@Controller('descuentos')
export class DescuentosController {
  constructor(private readonly service: DescuentosService) {}

  @Get()
  @ApiOperation({ summary: 'Listar catálogo de descuentos' })
  @ApiQuery({ name: 'activos', required: false, description: '"true" para listar solo los descuentos activos' })
  findAll(
    @CurrentUser('despachoId') despachoId: number,
    @Query('activos') activos?: string,
  ) {
    return this.service.findAll(despachoId, activos === 'true');
  }

  @Post()
  @ApiOperation({ summary: 'Crear descuento' })
  @ApiResponse({ status: 400, description: 'Datos inválidos (nombre vacío, valor inválido o porcentaje mayor a 100%)' })
  @ApiResponse({ status: 409, description: 'Ya existe un descuento con el mismo nombre' })
  create(@Body() dto: CreateDescuentoDto, @CurrentUser('despachoId') despachoId: number) {
    return this.service.create(dto, despachoId);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Actualizar descuento' })
  @ApiResponse({ status: 400, description: 'Datos inválidos' })
  @ApiResponse({ status: 404, description: 'Descuento no encontrado' })
  @ApiResponse({ status: 409, description: 'Ya existe un descuento con el mismo nombre' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateDescuentoDto,
    @CurrentUser('despachoId') despachoId: number,
  ) {
    return this.service.update(id, dto, despachoId);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Eliminar descuento del catálogo' })
  @ApiResponse({ status: 404, description: 'Descuento no encontrado' })
  @ApiResponse({ status: 409, description: 'El descuento ya se usó en pagos registrados; desactívalo en su lugar' })
  remove(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser('despachoId') despachoId: number,
  ) {
    return this.service.remove(id, despachoId);
  }
}
