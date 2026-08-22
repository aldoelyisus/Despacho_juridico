import { IsString, IsOptional, IsNotEmpty, IsInt, Min, Max, Length } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class CreateTestimonioDto {
  @IsNotEmpty({ message: 'El nombre es obligatorio' })
  @IsString()
  @Length(1, 150, { message: 'El nombre no puede exceder 150 caracteres' })
  @ApiProperty({ example: 'Lic. Roberto Jiménez' })
  nombre: string;

  @IsOptional()
  @IsString()
  @Length(0, 150, { message: 'El despacho no puede exceder 150 caracteres' })
  @ApiProperty({ required: false, example: 'Jiménez y Asociados' })
  despachoNombre?: string;

  @IsNotEmpty({ message: 'El mensaje es obligatorio' })
  @IsString()
  @Length(1, 1000, { message: 'El mensaje no puede exceder 1000 caracteres' })
  @ApiProperty({ example: 'El sistema nos ahorró horas de trabajo administrativo cada semana.' })
  mensaje: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'La calificación debe ser un número entero' })
  @Min(1, { message: 'La calificación mínima es 1' })
  @Max(5, { message: 'La calificación máxima es 5' })
  @ApiProperty({ required: false, example: 5 })
  calificacion?: number;
}
