import { IsNotEmpty, IsString, IsOptional, IsDateString, IsBoolean, Length } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateEventoDto {
  @IsNotEmpty({ message: 'El título del evento es obligatorio' })
  @IsString()
  @Length(1, 300, { message: 'El título no puede exceder 300 caracteres' })
  @ApiProperty({ example: 'Audiencia preliminar' })
  titulo: string;

  @IsOptional()
  @IsString()
  @ApiPropertyOptional({ example: 'Sala 4, Juzgado Segundo de lo Familiar' })
  descripcion?: string;

  @IsNotEmpty({ message: 'La fecha de inicio del evento es obligatoria' })
  @IsDateString({}, { message: 'La fecha de inicio no es válida' })
  @ApiProperty({ example: '2026-03-10T10:00:00' })
  fechaInicio: string;

  @IsOptional()
  @IsDateString({}, { message: 'La fecha de fin no es válida' })
  @ApiPropertyOptional({ example: '2026-03-10T11:30:00' })
  fechaFin?: string;

  @IsOptional()
  @IsBoolean({ message: 'El campo completado debe ser verdadero o falso' })
  @ApiPropertyOptional()
  completado?: boolean;
}
