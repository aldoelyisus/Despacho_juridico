import {
  Controller, Get, Post, Patch, Body, Param,
  Query, ParseIntPipe, UseInterceptors, UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { v4 as uuid } from 'uuid';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiConsumes } from '@nestjs/swagger';
import { ExpedientesService } from './expedientes.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('📁 Expedientes')
@ApiBearerAuth('JWT-auth')
@Controller('expedientes')
export class ExpedientesController {
  constructor(private readonly service: ExpedientesService) {}

  @Get()
  @ApiOperation({ summary: 'Listar expedientes' })
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
  findOne(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: any) {
    return this.service.findOne(id, user);
  }

  @Post()
  @ApiOperation({ summary: 'Crear expediente' })
  create(@Body() dto: any, @CurrentUser('despachoId') despachoId: number) {
    return this.service.create(dto, despachoId);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Actualizar expediente' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: any,
    @CurrentUser() user: any,
  ) {
    return this.service.update(id, dto, user.despachoId);
  }

  @Patch(':id/estado')
  @ApiOperation({ summary: 'Cambiar estado del expediente' })
  cambiarEstado(
    @Param('id', ParseIntPipe) id: number,
    @Body('estado') estado: any,
    @CurrentUser() user: any,
  ) {
    return this.service.cambiarEstado(id, estado, user.despachoId);
  }

  @Post(':id/documentos')
  @ApiOperation({ summary: 'Subir documento al expediente' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(
    FileInterceptor('archivo', {
      storage: diskStorage({
        destination: './uploads',
        filename: (_req, file, cb) => cb(null, `${uuid()}${extname(file.originalname)}`),
      }),
      limits: { fileSize: 52428800 },
    }),
  )
  addDocumento(
    @Param('id', ParseIntPipe) id: number,
    @UploadedFile() file: Express.Multer.File,
    @Body() body: any,
    @CurrentUser() user: any,
  ) {
    return this.service.addDocumento(id, file, body, user.despachoId, user.id);
  }

  @Post(':id/observaciones')
  @ApiOperation({ summary: 'Agregar observación al expediente' })
  addObservacion(
    @Param('id', ParseIntPipe) id: number,
    @Body('contenido') contenido: string,
    @CurrentUser() user: any,
  ) {
    return this.service.addObservacion(id, contenido, user, user.despachoId);
  }

  @Post(':id/eventos')
  @ApiOperation({ summary: 'Agregar fecha/evento al expediente' })
  addEvento(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: any,
    @CurrentUser('despachoId') despachoId: number,
  ) {
    return this.service.addEvento(id, dto, despachoId);
  }
}
