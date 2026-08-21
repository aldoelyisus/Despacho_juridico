import { IsNotEmpty, IsString, IsOptional, IsNumber, Min, Max, Length } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateServicioDto {
  @IsNotEmpty({ message: 'El nombre del servicio es obligatorio' })
  @IsString()
  @Length(1, 200, { message: 'El nombre no puede exceder 200 caracteres' })
  @ApiProperty({ example: 'Consulta Jurídica' })
  nombre: string;

  @IsOptional()
  @IsString()
  @Length(0, 1000, { message: 'La descripción no puede exceder 1000 caracteres' })
  @ApiPropertyOptional({ example: 'Consulta inicial de una hora con un abogado del despacho' })
  descripcion?: string;

  @IsNotEmpty({ message: 'El costo del servicio es obligatorio' })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 }, { message: 'El costo debe ser un número con máximo 2 decimales' })
  @Min(0, { message: 'El costo no puede ser negativo' })
  @Max(9999999999.99, { message: 'El costo ingresado es demasiado alto' })
  @ApiProperty({ example: 1500.0, description: 'Precio del servicio en la moneda del despacho' })
  costo: number;
}
