import { IsNotEmpty, IsString, IsOptional, IsEnum, IsNumber, IsBoolean, Min, Max, Length } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TipoDescuento } from '../entities/descuento.entity';

export class CreateDescuentoDto {
  @IsNotEmpty({ message: 'El nombre del descuento es obligatorio' })
  @IsString()
  @Length(1, 150, { message: 'El nombre no puede exceder 150 caracteres' })
  @ApiProperty({ example: 'Descuento clientes frecuentes' })
  nombre: string;

  @IsOptional()
  @IsString()
  @ApiPropertyOptional({ example: 'Aplica a clientes con más de 3 expedientes activos' })
  descripcion?: string;

  @IsNotEmpty({ message: 'El tipo de descuento es obligatorio' })
  @IsEnum(TipoDescuento, { message: 'El tipo de descuento no es válido' })
  @ApiProperty({ enum: TipoDescuento, example: TipoDescuento.PORCENTAJE })
  tipo: TipoDescuento;

  @IsNotEmpty({ message: 'El valor del descuento es obligatorio' })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 }, { message: 'El valor debe ser un número con máximo 2 decimales' })
  @Min(0.01, { message: 'El valor debe ser mayor a 0' })
  @Max(999999999.99, { message: 'El valor ingresado es demasiado alto' })
  @ApiProperty({ example: 10, description: 'Porcentaje (0-100) si tipo=porcentaje, o monto fijo en pesos si tipo=monto_fijo' })
  valor: number;

  @IsOptional()
  @IsBoolean({ message: 'El campo activo debe ser verdadero o falso' })
  @ApiPropertyOptional({ default: true })
  activo?: boolean;
}
