import {
  Controller, Get, Patch, Post, Body, Param,
  ParseIntPipe, UseInterceptors, UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiConsumes } from '@nestjs/swagger';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { DespachosService } from './despachos.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('🏢 Despachos')
@ApiBearerAuth('JWT-auth')
@Controller('despachos')
export class DespachosController {
  constructor(private readonly service: DespachosService) {}

  @Get('mi-despacho')
  @ApiOperation({ summary: 'Obtener información del despacho actual' })
  getMiDespacho(@CurrentUser('despachoId') despachoId: number) {
    return this.service.findOne(despachoId);
  }

  @Patch('mi-despacho')
  @ApiOperation({ summary: 'Actualizar información del despacho' })
  updateMiDespacho(
    @CurrentUser('despachoId') despachoId: number,
    @Body() body: any,
  ) {
    return this.service.update(despachoId, body);
  }

  @Post('mi-despacho/logo')
  @ApiOperation({ summary: 'Subir logo del despacho' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(
    FileInterceptor('logo', {
      storage: diskStorage({
        destination: './uploads/logos',
        filename: (_req, file, cb) => {
          const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
          cb(null, `logo-${unique}${extname(file.originalname)}`);
        },
      }),
      limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
      fileFilter: (_req, file, cb) => {
        if (/\.(jpg|jpeg|png|svg|webp)$/i.test(file.originalname)) cb(null, true);
        else cb(new BadRequestException('Solo se permiten imágenes (jpg, png, svg, webp) · Máx. 10 MB'), false);
      },
    }),
  )
  async uploadLogo(
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser('despachoId') despachoId: number,
  ) {
    if (!file) throw new BadRequestException('No se recibió ningún archivo');
    const logoUrl = `/uploads/logos/${file.filename}`;
    await this.service.update(despachoId, { logo: logoUrl });
    return { logo: logoUrl };
  }
}
