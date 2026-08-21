import { IsOptional, IsString, Length } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class CreateDocumentoDto {
  @IsOptional()
  @IsString()
  @Length(0, 300, { message: 'El nombre del documento no puede exceder 300 caracteres' })
  @ApiPropertyOptional({ example: 'Contrato firmado.pdf', description: 'Si se omite, se usa el nombre original del archivo' })
  nombre?: string;

  @IsOptional()
  @IsString()
  @Length(0, 200, { message: 'La descripción no puede exceder 200 caracteres' })
  @ApiPropertyOptional({ example: 'Versión firmada por ambas partes' })
  descripcion?: string;
}
