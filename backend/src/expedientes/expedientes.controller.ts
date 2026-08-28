import {
  Controller, Get, Post, Patch, Delete, Body, Param,
  Query, ParseIntPipe, UseInterceptors, UploadedFile, Ip,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiConsumes, ApiQuery, ApiResponse } from '@nestjs/swagger';
import { ExpedientesService } from './expedientes.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { CreateExpedienteDto } from './dto/create-expediente.dto';
import { UpdateExpedienteDto } from './dto/update-expediente.dto';
import { CambiarEstadoExpedienteDto } from './dto/cambiar-estado-expediente.dto';
import { CreateDocumentoDto } from './dto/create-documento.dto';
import { CreateObservacionDto } from './dto/create-observacion.dto';
import { CreateEventoDto } from './dto/create-evento.dto';
import { Roles, RolEnum } from '../common/decorators/roles.decorator';

@ApiTags('📁 Expedientes')
@ApiBearerAuth('JWT-auth')
@Controller('expedientes')
export class ExpedientesController {
  constructor(private readonly service: ExpedientesService) {}

  @Get()
  @ApiOperation({ summary: 'Listar expedientes (los no administradores solo ven los suyos)' })
  @ApiQuery({ name: 'estado', required: false })
  @ApiQuery({ name: 'areaId', required: false })
  @ApiQuery({ name: 'busqueda', required: false })
  @ApiQuery({ name: 'clienteId', required: false })
  @ApiQuery({ name: 'pagina', required: false })
  @ApiQuery({ name: 'limite', required: false, description: 'Máximo 100' })
  findAll(@CurrentUser() user: any, @Query() query: any) {
    return this.service.findAll(user, query);
  }

  @Get('stats')
  @ApiOperation({ summary: 'Estadísticas de expedientes' })
  getStats(@CurrentUser() user: any) {
    return this.service.getStats(user);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener expediente por ID' })
  @ApiResponse({ status: 404, description: 'Expediente no encontrado o sin acceso' })
  findOne(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: any) {
    return this.service.findOne(id, user);
  }

  @Post()
  @Roles(RolEnum.ABOGADO, RolEnum.ASISTENTE)
  @ApiOperation({ summary: 'Crear expediente' })
  @ApiResponse({ status: 400, description: 'Datos inválidos (título vacío, sin clientes asociados, etc.)' })
  @ApiResponse({ status: 403, description: 'El despacho alcanzó el límite de expedientes de su plan' })
  create(@Body() dto: CreateExpedienteDto, @CurrentUser('despachoId') despachoId: number) {
    return this.service.create(dto, despachoId);
  }

  @Patch(':id')
  @Roles(RolEnum.ABOGADO, RolEnum.ASISTENTE)
  @ApiOperation({ summary: 'Actualizar expediente' })
  @ApiResponse({ status: 400, description: 'Datos inválidos' })
  @ApiResponse({ status: 404, description: 'Expediente no encontrado o sin acceso' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateExpedienteDto,
    @CurrentUser() user: any,
  ) {
    return this.service.update(id, dto, user);
  }

  @Patch(':id/estado')
  @Roles(RolEnum.ABOGADO, RolEnum.ASISTENTE)
  @ApiOperation({ summary: 'Cambiar estado del expediente' })
  @ApiResponse({ status: 400, description: 'Estado inválido' })
  @ApiResponse({ status: 404, description: 'Expediente no encontrado o sin acceso' })
  cambiarEstado(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CambiarEstadoExpedienteDto,
    @CurrentUser() user: any,
    @Ip() ip: string,
  ) {
    return this.service.cambiarEstado(id, dto.estado, user, ip);
  }

  @Post(':id/documentos')
  @Roles(RolEnum.ABOGADO, RolEnum.ASISTENTE)
  @ApiOperation({ summary: 'Subir documento al expediente (se guarda en S3, bajo despacho/cliente/expediente)' })
  @ApiConsumes('multipart/form-data')
  @ApiResponse({ status: 400, description: 'No se envió ningún archivo' })
  @ApiResponse({ status: 404, description: 'Expediente no encontrado o sin acceso' })
  @UseInterceptors(
    FileInterceptor('archivo', {
      storage: memoryStorage(), // en memoria: se sube a S3 en el service, nunca toca disco local
      limits: { fileSize: 52428800 },
    }),
  )
  addDocumento(
    @Param('id', ParseIntPipe) id: number,
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: CreateDocumentoDto,
    @CurrentUser() user: any,
  ) {
    return this.service.addDocumento(id, file, dto, user);
  }

  @Get(':id/documentos/:documentoId/url')
  @ApiOperation({ summary: 'Obtener una URL temporal (5 min) para ver/descargar un documento del bucket privado de S3' })
  @ApiResponse({ status: 404, description: 'Expediente o documento no encontrado' })
  getDocumentoUrl(
    @Param('id', ParseIntPipe) id: number,
    @Param('documentoId', ParseIntPipe) documentoId: number,
    @CurrentUser() user: any,
  ) {
    return this.service.getDocumentoUrl(id, documentoId, user);
  }

  @Delete(':id/documentos/:documentoId')
  @Roles(RolEnum.ABOGADO, RolEnum.ASISTENTE)
  @ApiOperation({ summary: 'Eliminar un documento (borra el archivo de S3 y su referencia)' })
  @ApiResponse({ status: 404, description: 'Expediente o documento no encontrado' })
  deleteDocumento(
    @Param('id', ParseIntPipe) id: number,
    @Param('documentoId', ParseIntPipe) documentoId: number,
    @CurrentUser() user: any,
  ) {
    return this.service.deleteDocumento(id, documentoId, user);
  }

  @Post(':id/observaciones')
  @Roles(RolEnum.ABOGADO, RolEnum.ASISTENTE)
  @ApiOperation({ summary: 'Agregar observación al expediente' })
  @ApiResponse({ status: 400, description: 'La observación no puede estar vacía' })
  @ApiResponse({ status: 404, description: 'Expediente no encontrado o sin acceso' })
  addObservacion(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CreateObservacionDto,
    @CurrentUser() user: any,
  ) {
    return this.service.addObservacion(id, dto.contenido, user);
  }

  @Post(':id/eventos')
  @Roles(RolEnum.ABOGADO, RolEnum.ASISTENTE)
  @ApiOperation({ summary: 'Agregar fecha/evento al expediente' })
  @ApiResponse({ status: 400, description: 'Datos inválidos (título/fecha faltante o fecha de fin anterior a la de inicio)' })
  @ApiResponse({ status: 404, description: 'Expediente no encontrado o sin acceso' })
  addEvento(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CreateEventoDto,
    @CurrentUser() user: any,
  ) {
    return this.service.addEvento(id, dto, user);
  }
}
