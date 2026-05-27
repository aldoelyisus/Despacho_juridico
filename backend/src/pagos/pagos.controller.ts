import { Controller, Get, Post, Body, Param, Query, ParseIntPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { PagosService } from './pagos.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('💳 Pagos')
@ApiBearerAuth('JWT-auth')
@Controller('pagos')
export class PagosController {
  constructor(private readonly service: PagosService) {}

  @Get()
  @ApiOperation({ summary: 'Listar pagos del despacho' })
  findAll(@CurrentUser('despachoId') despachoId: number, @Query() query: any) {
    return this.service.findAll(despachoId, query);
  }

  @Get('stats')
  @ApiOperation({ summary: 'Estadísticas financieras' })
  getStats(@CurrentUser('despachoId') despachoId: number, @Query() query: any) {
    return this.service.getStats(despachoId, query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener pago por ID' })
  findOne(@Param('id', ParseIntPipe) id: number, @CurrentUser('despachoId') despachoId: number) {
    return this.service.findOne(id, despachoId);
  }

  @Post()
  @ApiOperation({ summary: 'Registrar nuevo cobro' })
  create(@Body() dto: any, @CurrentUser() user: any) {
    return this.service.create(dto, user.despachoId, user.id);
  }

  @Post(':id/abonos')
  @ApiOperation({ summary: 'Registrar abono/parcialidad' })
  registrarAbono(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: any,
    @CurrentUser('despachoId') despachoId: number,
  ) {
    return this.service.registrarAbono(id, dto, despachoId);
  }
}
