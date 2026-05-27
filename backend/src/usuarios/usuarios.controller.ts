import { Controller, Get, Post, Patch, Delete, Body, Param, ParseIntPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { UsuariosService } from './usuarios.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles, RolEnum } from '../common/decorators/roles.decorator';

@ApiTags('👤 Usuarios')
@ApiBearerAuth('JWT-auth')
@Controller('usuarios')
export class UsuariosController {
  constructor(private readonly service: UsuariosService) {}

  @Get()
  @ApiOperation({ summary: 'Listar usuarios del despacho' })
  findAll(@CurrentUser('despachoId') despachoId: number) {
    return this.service.findAll(despachoId);
  }

  @Get('roles')
  @ApiOperation({ summary: 'Obtener roles disponibles' })
  getRoles() { return this.service.getRoles(); }

  @Get('stats')
  @ApiOperation({ summary: 'Estadísticas de usuarios' })
  getStats(@CurrentUser('despachoId') despachoId: number) {
    return this.service.getStats(despachoId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener usuario por ID' })
  findOne(@Param('id', ParseIntPipe) id: number, @CurrentUser('despachoId') despachoId: number) {
    return this.service.findOne(id, despachoId);
  }

  @Post()
  @Roles(RolEnum.ADMIN)
  @ApiOperation({ summary: 'Crear usuario (solo administradores)' })
  create(@Body() dto: any, @CurrentUser('despachoId') despachoId: number) {
    return this.service.create(dto, despachoId);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Actualizar usuario' })
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: any, @CurrentUser('despachoId') despachoId: number) {
    return this.service.update(id, dto, despachoId);
  }

  @Patch(':id/toggle')
  @Roles(RolEnum.ADMIN)
  @ApiOperation({ summary: 'Activar/desactivar usuario' })
  toggle(@Param('id', ParseIntPipe) id: number, @CurrentUser('despachoId') despachoId: number) {
    return this.service.toggleActivo(id, despachoId);
  }
}
