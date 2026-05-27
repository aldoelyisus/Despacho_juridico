import {
  Controller, Get, Post, Patch, Delete,
  Body, Param, Query, ParseIntPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AgendaService } from './agenda.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('📅 Agenda')
@ApiBearerAuth('JWT-auth')
@Controller('agenda')
export class AgendaController {
  constructor(private readonly service: AgendaService) {}

  @Get()
  @ApiOperation({ summary: 'Listar eventos — solo los del usuario (creador o participante)' })
  findAll(@CurrentUser() user: any, @Query() query: any) {
    return this.service.findAll(user, query);
  }

  @Get('proximos')
  @ApiOperation({ summary: 'Próximos eventos (7 días) del usuario' })
  getProximos(@CurrentUser() user: any) {
    return this.service.getProximos(user);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener evento por ID' })
  findOne(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: any) {
    return this.service.findOne(id, user);
  }

  @Post()
  @ApiOperation({ summary: 'Crear evento — se incluye al creador como participante automáticamente' })
  create(@Body() dto: any, @CurrentUser() user: any) {
    return this.service.create(dto, user);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Actualizar evento — solo el creador o admin' })
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: any, @CurrentUser() user: any) {
    return this.service.update(id, dto, user);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Eliminar evento — solo el creador o admin' })
  remove(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: any) {
    return this.service.remove(id, user);
  }
}
