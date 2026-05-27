import {
  Controller, Get, Post, Patch, Delete,
  Body, Param, Query, ParseIntPipe, UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { RootService } from './root.service';
import { RootGuard } from './root.guard';

@ApiTags('👑 Root — Administración SaaS')
@ApiBearerAuth('JWT-auth')
@UseGuards(RootGuard)
@Controller('root')
export class RootController {
  constructor(private readonly service: RootService) {}

  // ── DASHBOARD ─────────────────────────────────────────────────────────────
  @Get('dashboard')
  @ApiOperation({ summary: 'Dashboard global del sistema' })
  getDashboard() {
    return this.service.getDashboard();
  }

  // ── DESPACHOS ─────────────────────────────────────────────────────────────
  @Get('despachos')
  @ApiOperation({ summary: 'Listar todos los despachos' })
  getDespachos() {
    return this.service.getDespachos();
  }

  @Post('despachos')
  @ApiOperation({ summary: 'Crear despacho + usuario administrador inicial' })
  createDespacho(@Body() dto: any) {
    return this.service.createDespacho(dto);
  }

  @Patch('despachos/:id')
  @ApiOperation({ summary: 'Actualizar datos del despacho' })
  updateDespacho(@Param('id', ParseIntPipe) id: number, @Body() dto: any) {
    return this.service.updateDespacho(id, dto);
  }

  @Patch('despachos/:id/bloqueo')
  @ApiOperation({ summary: 'Bloquear / desbloquear acceso del despacho' })
  toggleBloqueo(@Param('id', ParseIntPipe) id: number) {
    return this.service.toggleBloqueo(id);
  }

  // ── USUARIOS ──────────────────────────────────────────────────────────────
  @Get('despachos/:id/usuarios')
  @ApiOperation({ summary: 'Usuarios de un despacho' })
  getUsuariosDespacho(@Param('id', ParseIntPipe) id: number) {
    return this.service.getUsuariosDespacho(id);
  }

  @Patch('usuarios/:id/toggle')
  @ApiOperation({ summary: 'Activar / desactivar usuario de cualquier despacho' })
  toggleUsuario(@Param('id', ParseIntPipe) id: number) {
    return this.service.toggleUsuario(id);
  }

  // ── MENSUALIDADES ─────────────────────────────────────────────────────────
  @Get('mensualidades')
  @ApiOperation({ summary: 'Listar mensualidades (filtrable por despacho y estado)' })
  getMensualidades(@Query() query: any) {
    return this.service.getMensualidades(query);
  }

  @Post('mensualidades')
  @ApiOperation({ summary: 'Registrar mensualidad / pago' })
  createMensualidad(@Body() dto: any) {
    return this.service.createMensualidad(dto);
  }

  @Patch('mensualidades/:id')
  @ApiOperation({ summary: 'Actualizar mensualidad (ej: marcar como pagada)' })
  updateMensualidad(@Param('id', ParseIntPipe) id: number, @Body() dto: any) {
    return this.service.updateMensualidad(id, dto);
  }

  @Delete('mensualidades/:id')
  @ApiOperation({ summary: 'Eliminar mensualidad' })
  deleteMensualidad(@Param('id', ParseIntPipe) id: number) {
    return this.service.deleteMensualidad(id);
  }
}
