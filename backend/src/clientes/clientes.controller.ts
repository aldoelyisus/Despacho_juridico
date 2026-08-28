import {
  Controller, Get, Post, Patch, Delete,
  Body, Param, Query, ParseIntPipe, Ip,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery, ApiResponse } from '@nestjs/swagger';
import { ClientesService } from './clientes.service';
import { CreateClienteDto } from './dto/create-cliente.dto';
import { UpdateClienteDto } from './dto/update-cliente.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles, RolEnum } from '../common/decorators/roles.decorator';

@ApiTags('👥 Clientes')
@ApiBearerAuth('JWT-auth')
@Controller('clientes')
export class ClientesController {
  constructor(private readonly service: ClientesService) {}

  @Get()
  @ApiOperation({ summary: 'Listar clientes del despacho (búsqueda y filtro por activo quedan registrados en auditoría)' })
  @ApiQuery({ name: 'busqueda', required: false })
  @ApiQuery({ name: 'pagina', required: false })
  @ApiQuery({ name: 'limite', required: false, description: `Máximo 100` })
  findAll(
    @CurrentUser('despachoId') despachoId: number,
    @Query() query: any,
    @CurrentUser() usuario: { id: number; nombre: string; apellido: string },
    @Ip() ip: string,
  ) {
    return this.service.findAll(despachoId, query, usuario, ip);
  }

  @Get('stats')
  @ApiOperation({ summary: 'Estadísticas de clientes' })
  getStats(@CurrentUser('despachoId') despachoId: number) {
    return this.service.getStats(despachoId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener cliente por ID' })
  @ApiResponse({ status: 404, description: 'Cliente no encontrado' })
  findOne(@Param('id', ParseIntPipe) id: number, @CurrentUser('despachoId') despachoId: number) {
    return this.service.findOne(id, despachoId);
  }

  @Post()
  @Roles(RolEnum.ABOGADO, RolEnum.ASISTENTE)
  @ApiOperation({ summary: 'Crear nuevo cliente' })
  @ApiResponse({ status: 201, description: 'Cliente creado' })
  @ApiResponse({ status: 400, description: 'Datos inválidos' })
  @ApiResponse({ status: 409, description: 'Ya existe un cliente con el mismo email, RFC o CURP' })
  create(@Body() dto: CreateClienteDto, @CurrentUser('despachoId') despachoId: number) {
    return this.service.create(dto, despachoId);
  }

  @Patch(':id')
  @Roles(RolEnum.ABOGADO, RolEnum.ASISTENTE)
  @ApiOperation({ summary: 'Actualizar cliente' })
  @ApiResponse({ status: 400, description: 'Datos inválidos' })
  @ApiResponse({ status: 404, description: 'Cliente no encontrado' })
  @ApiResponse({ status: 409, description: 'Ya existe un cliente con el mismo email, RFC o CURP' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateClienteDto,
    @CurrentUser('despachoId') despachoId: number,
  ) {
    return this.service.update(id, dto, despachoId);
  }

  @Delete(':id')
  @Roles(RolEnum.ABOGADO)
  @ApiOperation({ summary: 'Desactivar cliente' })
  @ApiResponse({ status: 404, description: 'Cliente no encontrado' })
  remove(@Param('id', ParseIntPipe) id: number, @CurrentUser('despachoId') despachoId: number) {
    return this.service.remove(id, despachoId);
  }
}
