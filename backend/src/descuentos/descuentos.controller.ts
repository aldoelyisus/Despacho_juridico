import {
  Controller, Get, Post, Patch, Delete,
  Body, Param, Query, ParseIntPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { DescuentosService } from './descuentos.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('🏷️ Descuentos')
@ApiBearerAuth('JWT-auth')
@Controller('descuentos')
export class DescuentosController {
  constructor(private readonly service: DescuentosService) {}

  @Get()
  @ApiOperation({ summary: 'Listar catálogo de descuentos' })
  findAll(
    @CurrentUser('despachoId') despachoId: number,
    @Query('activos') activos?: string,
  ) {
    return this.service.findAll(despachoId, activos === 'true');
  }

  @Post()
  @ApiOperation({ summary: 'Crear descuento' })
  create(@Body() dto: any, @CurrentUser('despachoId') despachoId: number) {
    return this.service.create(dto, despachoId);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Actualizar descuento' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: any,
    @CurrentUser('despachoId') despachoId: number,
  ) {
    return this.service.update(id, dto, despachoId);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Eliminar descuento' })
  remove(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser('despachoId') despachoId: number,
  ) {
    return this.service.remove(id, despachoId);
  }
}
