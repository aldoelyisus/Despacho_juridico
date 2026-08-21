import { IsNotEmpty, IsString, IsOptional, IsInt, IsEnum, IsDateString, IsArray, Length } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { EstadoExpediente } from '../entities/expediente.entity';

export class CreateExpedienteDto {
  @IsNotEmpty({ message: 'El título del expediente es obligatorio' })
  @IsString()
  @Length(1, 300, { message: 'El título no puede exceder 300 caracteres' })
  @ApiProperty({ example: 'Divorcio incausado - Familia Ramírez' })
  titulo: string;

  @IsOptional()
  @IsString()
  @ApiPropertyOptional({ example: 'Divorcio de mutuo acuerdo, sin hijos menores de edad' })
  descripcion?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'El área seleccionada no es válida' })
  @ApiPropertyOptional({ example: 1 })
  areaId?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'La subárea seleccionada no es válida' })
  @ApiPropertyOptional({ example: 3 })
  subareaId?: number;

  @IsOptional()
  @IsEnum(EstadoExpediente, { message: 'El estado seleccionado no es válido' })
  @ApiPropertyOptional({ enum: EstadoExpediente, example: EstadoExpediente.ACTIVO })
  estado?: EstadoExpediente;

  @IsOptional()
  @IsDateString({}, { message: 'La fecha de inicio no es válida' })
  @ApiPropertyOptional({ example: '2026-01-15' })
  fechaInicio?: string;

  @IsOptional()
  @IsDateString({}, { message: 'La fecha de cierre no es válida' })
  @ApiPropertyOptional({ example: '2026-06-30' })
  fechaCierre?: string;

  @IsOptional()
  @IsString()
  @ApiPropertyOptional()
  notas?: string;

  @IsOptional()
  @IsArray({ message: 'Los clientes deben enviarse como una lista' })
  @Type(() => Number)
  @IsInt({ each: true, message: 'Uno de los clientes seleccionados no es válido' })
  @ApiPropertyOptional({ type: [Number], example: [4, 7], description: 'Debe incluir al menos un cliente al crear el expediente' })
  clienteIds?: number[];

  @IsOptional()
  @IsArray({ message: 'Los colaboradores deben enviarse como una lista' })
  @Type(() => Number)
  @IsInt({ each: true, message: 'Uno de los colaboradores seleccionados no es válido' })
  @ApiPropertyOptional({ type: [Number], example: [2] })
  colaboradorIds?: number[];
}
