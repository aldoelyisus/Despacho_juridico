import { Controller, Get, Post, Patch, Delete, Body, Param, ParseIntPipe, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { LandingService } from './landing.service';
import { Public } from '../common/decorators/public.decorator';
import { RootGuard } from '../root/root.guard';
import { CreateTestimonioDto } from './dto/create-testimonio.dto';
import { CreateContactoDto } from './dto/create-contacto.dto';

@ApiTags('🌐 Landing (pública)')
@Controller('landing')
export class LandingController {
  constructor(private readonly service: LandingService) {}

  @Get('planes')
  @Public()
  @ApiOperation({ summary: 'Planes marcados como visibles en la landing pública' })
  planes() {
    return this.service.listarPlanesPublicos();
  }

  @Get('testimonios')
  @Public()
  @ApiOperation({ summary: 'Testimonios ya aprobados, para mostrar en la landing pública' })
  testimonios() {
    return this.service.listarTestimoniosAprobados();
  }

  @Post('testimonios')
  @Public()
  @ApiOperation({ summary: 'Enviar un testimonio nuevo (queda pendiente de aprobación por root)' })
  crearTestimonio(@Body() dto: CreateTestimonioDto) {
    return this.service.crearTestimonio(dto);
  }

  @Post('contacto')
  @Public()
  @ApiOperation({ summary: 'Enviar un contacto/lead desde la landing pública' })
  crearContacto(@Body() dto: CreateContactoDto) {
    return this.service.crearContacto(dto);
  }

  @Get('testimonios/todos')
  @UseGuards(RootGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: '[Root] Todos los testimonios, aprobados o no' })
  testimoniosTodos() {
    return this.service.listarTodosTestimonios();
  }

  @Patch('testimonios/:id/aprobar')
  @UseGuards(RootGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: '[Root] Aprobar un testimonio para que se muestre en la landing pública' })
  aprobarTestimonio(@Param('id', ParseIntPipe) id: number) {
    return this.service.aprobarTestimonio(id);
  }

  @Delete('testimonios/:id')
  @UseGuards(RootGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: '[Root] Eliminar un testimonio' })
  eliminarTestimonio(@Param('id', ParseIntPipe) id: number) {
    return this.service.eliminarTestimonio(id);
  }

  @Get('contactos')
  @UseGuards(RootGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: '[Root] Listar los contactos/leads recibidos' })
  contactos() {
    return this.service.listarContactos();
  }

  @Patch('contactos/:id/atendido')
  @UseGuards(RootGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: '[Root] Marcar un contacto como atendido' })
  marcarAtendido(@Param('id', ParseIntPipe) id: number) {
    return this.service.marcarContactoAtendido(id);
  }
}
