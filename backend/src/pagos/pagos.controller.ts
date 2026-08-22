import { Controller, Get, Post, Body, Param, Query, ParseIntPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery, ApiResponse } from '@nestjs/swagger';
import { PagosService } from './pagos.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { CreatePagoDto } from './dto/create-pago.dto';
import { CreateAbonoDto } from './dto/create-abono.dto';

@ApiTags('💳 Pagos')
@ApiBearerAuth('JWT-auth')
@Controller('pagos')
export class PagosController {
  constructor(private readonly service: PagosService) {}

  @Get()
  @ApiOperation({ summary: 'Listar cobros del despacho' })
  @ApiQuery({ name: 'clienteId', required: false })
  @ApiQuery({ name: 'expedienteId', required: false })
  @ApiQuery({ name: 'estado', required: false })
  @ApiQuery({ name: 'desde', required: false, description: 'Fecha de registro desde (YYYY-MM-DD)' })
  @ApiQuery({ name: 'hasta', required: false, description: 'Fecha de registro hasta (YYYY-MM-DD)' })
  @ApiQuery({ name: 'pagina', required: false })
  @ApiQuery({ name: 'limite', required: false, description: 'Máximo 100' })
  findAll(@CurrentUser('despachoId') despachoId: number, @Query() query: any) {
    return this.service.findAll(despachoId, query);
  }

  @Get('stats')
  @ApiOperation({ summary: 'Estadísticas financieras' })
  @ApiQuery({ name: 'inicio', required: false })
  @ApiQuery({ name: 'fin', required: false })
  getStats(@CurrentUser('despachoId') despachoId: number, @Query() query: any) {
    return this.service.getStats(despachoId, query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener cobro por ID' })
  @ApiResponse({ status: 404, description: 'Cobro no encontrado' })
  findOne(@Param('id', ParseIntPipe) id: number, @CurrentUser('despachoId') despachoId: number) {
    return this.service.findOne(id, despachoId);
  }

  @Post()
  @ApiOperation({ summary: 'Registrar el cobro (adeudo del cliente) por un servicio, con un único descuento opcional' })
  @ApiResponse({ status: 400, description: 'Datos inválidos o descuento inactivo' })
  @ApiResponse({ status: 404, description: 'Cliente, expediente o servicio no encontrado en el despacho' })
  create(@Body() dto: CreatePagoDto, @CurrentUser() user: any) {
    return this.service.create(dto, user.despachoId, user.id);
  }

  @Post(':id/abonos')
  @ApiOperation({ summary: 'Registrar el pago (el dinero que el cliente efectivamente entrega) contra un cobro. No se permiten abonos parciales: debe cubrir el saldo pendiente completo' })
  @ApiResponse({ status: 400, description: 'Datos inválidos, cobro ya pagado/cancelado, o el monto no cubre exactamente el saldo pendiente' })
  @ApiResponse({ status: 404, description: 'Cobro no encontrado' })
  registrarAbono(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CreateAbonoDto,
    @CurrentUser('despachoId') despachoId: number,
  ) {
    return this.service.registrarAbono(id, dto, despachoId);
  }
}
