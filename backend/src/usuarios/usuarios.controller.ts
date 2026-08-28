import { Controller, Get, Post, Patch, Delete, Body, Param, ParseIntPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { UsuariosService } from './usuarios.service';
import { CreateUsuarioDto } from './dto/create-usuario.dto';
import { UpdateUsuarioDto } from './dto/update-usuario.dto';
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
  @ApiOperation({ summary: 'Obtener roles asignables a usuarios de despacho (excluye el rol root)' })
  getRoles() { return this.service.getRoles(); }

  @Get('stats')
  @ApiOperation({ summary: 'Estadísticas de usuarios' })
  getStats(@CurrentUser('despachoId') despachoId: number) {
    return this.service.getStats(despachoId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener usuario por ID' })
  @ApiResponse({ status: 404, description: 'Usuario no encontrado' })
  findOne(@Param('id', ParseIntPipe) id: number, @CurrentUser('despachoId') despachoId: number) {
    return this.service.findOnePublico(id, despachoId);
  }

  @Post()
  @Roles(RolEnum.ADMIN)
  @ApiOperation({
    summary: 'Crear usuario (solo administradores)',
    description: 'La contraseña debe cumplir la política de seguridad. El usuario creado queda marcado para fijar su propia contraseña en el primer inicio de sesión.',
  })
  @ApiResponse({ status: 201, description: 'Usuario creado' })
  @ApiResponse({ status: 400, description: 'Contraseña débil o datos inválidos' })
  @ApiResponse({ status: 402, description: 'Se alcanzó el límite de usuarios del plan y requiere confirmación de costo extra' })
  @ApiResponse({ status: 403, description: 'Sin permisos suficientes' })
  @ApiResponse({ status: 409, description: 'Email ya en uso o intento de asignar el rol root' })
  create(@Body() dto: CreateUsuarioDto, @CurrentUser('despachoId') despachoId: number) {
    return this.service.create(dto, despachoId);
  }

  @Patch(':id')
  @Roles(RolEnum.ADMIN)
  @ApiOperation({ summary: 'Actualizar usuario' })
  @ApiResponse({ status: 400, description: 'Contraseña débil o datos inválidos' })
  @ApiResponse({ status: 404, description: 'Usuario no encontrado' })
  @ApiResponse({ status: 409, description: 'Intento de asignar el rol root' })
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateUsuarioDto, @CurrentUser('despachoId') despachoId: number) {
    return this.service.update(id, dto, despachoId);
  }

  @Patch(':id/toggle')
  @Roles(RolEnum.ADMIN)
  @ApiOperation({
    summary: 'Activar/desactivar usuario',
    description: 'Si reactivar a este usuario excede el límite de usuarios del plan, requiere confirmExtra en el body para aceptar el cargo extra (igual que al crear un usuario).',
  })
  @ApiResponse({ status: 402, description: 'Reactivar a este usuario excede el límite del plan y requiere confirmación de costo extra' })
  toggle(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser('despachoId') despachoId: number,
    @Body() body: { confirmExtra?: boolean } = {},
  ) {
    return this.service.toggleActivo(id, despachoId, body.confirmExtra);
  }

  @Patch(':id/reset-password')
  @Roles(RolEnum.ADMIN)
  @ApiOperation({
    summary: 'Restablecer la contraseña de un usuario del despacho (ej: el usuario la olvidó)',
    description: 'Genera una contraseña temporal segura y la devuelve una sola vez. El usuario deberá fijar su propia contraseña definitiva en su siguiente inicio de sesión.',
  })
  @ApiResponse({ status: 200, description: 'Contraseña temporal generada' })
  @ApiResponse({ status: 403, description: 'Sin permisos suficientes' })
  @ApiResponse({ status: 404, description: 'Usuario no encontrado' })
  resetPassword(@Param('id', ParseIntPipe) id: number, @CurrentUser('despachoId') despachoId: number) {
    return this.service.resetPassword(id, despachoId);
  }
}
