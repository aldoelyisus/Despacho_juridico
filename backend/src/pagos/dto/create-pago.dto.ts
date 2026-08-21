import { IsNotEmpty, IsOptional, IsInt, IsString, IsDateString, Length } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreatePagoDto {
  @IsNotEmpty({ message: 'Debes seleccionar un cliente' })
  @Type(() => Number)
  @IsInt({ message: 'El cliente seleccionado no es válido' })
  @ApiProperty({ example: 4, description: 'Cliente al que se le registra el adeudo' })
  clienteId: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'El expediente seleccionado no es válido' })
  @ApiPropertyOptional({ example: 12 })
  expedienteId?: number;

  @IsNotEmpty({ message: 'Debes seleccionar un servicio' })
  @Type(() => Number)
  @IsInt({ message: 'El servicio seleccionado no es válido' })
  @ApiProperty({ example: 2, description: 'Servicio del catálogo cuyo costo define el monto del cobro' })
  servicioId: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'El descuento seleccionado no es válido' })
  @ApiPropertyOptional({ example: 3, description: 'Un único descuento del catálogo (opcional) — solo se admite uno por cobro' })
  descuentoId?: number;

  @IsOptional()
  @IsString()
  @Length(0, 500, { message: 'El concepto no puede exceder 500 caracteres' })
  @ApiPropertyOptional({ example: 'Honorarios por consulta inicial', description: 'Si se omite, se usa el nombre del servicio' })
  concepto?: string;

  @IsOptional()
  @IsDateString({}, { message: 'La fecha de vencimiento no es válida' })
  @ApiPropertyOptional({ example: '2026-09-30' })
  fechaVencimiento?: string;

  @IsOptional()
  @IsString()
  @ApiPropertyOptional()
  notas?: string;
}
