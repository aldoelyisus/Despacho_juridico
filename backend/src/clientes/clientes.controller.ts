import {
  Controller, Get, Post, Patch, Delete,
  Body, Param, Query, ParseIntPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { ClientesService } from './clientes.service';
import { CreateClienteDto } from './dto/create-cliente.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('👥 Clientes')
@ApiBearerAuth('JWT-auth')
@Controller('clientes')
export class ClientesController {
  constructor(private readonly service: ClientesService) {}

  @Get()
  @ApiOperation({ summary: 'Listar clientes del despacho' })
  @ApiQuery({ name: 'busqueda', required: false })
  @ApiQuery({ name: 'pagina', required: false })
  @ApiQuery({ name: 'limite', required: false })
  findAll(@CurrentUser('despachoId') despachoId: number, @Query() query: any) {
    return this.service.findAll(despachoId, query);
  }

  @Get('stats')
  @ApiOperation({ summary: 'Estadísticas de clientes' })
  getStats(@CurrentUser('despachoId') despachoId: number) {
    return this.service.getStats(despachoId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener cliente por ID' })
  findOne(@Param('id', ParseIntPipe) id: number, @CurrentUser('despachoId') despachoId: number) {
    return this.service.findOne(id, despachoId);
  }

  @Post()
  @ApiOperation({ summary: 'Crear nuevo cliente' })
  create(@Body() dto: CreateClienteDto, @CurrentUser('despachoId') despachoId: number) {
    return this.service.create(dto, despachoId);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Actualizar cliente' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: Partial<CreateClienteDto>,
    @CurrentUser('despachoId') despachoId: number,
  ) {
    return this.service.update(id, dto, despachoId);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Desactivar cliente' })
  remove(@Param('id', ParseIntPipe) id: number, @CurrentUser('despachoId') despachoId: number) {
    return this.service.remove(id, despachoId);
  }
}
