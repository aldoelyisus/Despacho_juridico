import { IsNotEmpty, IsOptional, IsNumber, IsDateString, IsString, Min, Length } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateAbonoDto {
  @IsNotEmpty({ message: 'El monto del abono es obligatorio' })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 }, { message: 'El monto debe ser un número con máximo 2 decimales' })
  @Min(0.01, { message: 'El monto debe ser mayor a 0' })
  @ApiProperty({ example: 500, description: 'Monto aplicado al adeudo. Debe cubrir exactamente el saldo pendiente del cobro — no se permiten abonos parciales' })
  monto: number;

  @IsNotEmpty({ message: 'La fecha de pago es obligatoria' })
  @IsDateString({}, { message: 'La fecha de pago no es válida' })
  @ApiProperty({ example: '2026-08-20' })
  fechaPago: string;

  @IsOptional()
  @IsString()
  @Length(0, 100, { message: 'El método de pago no puede exceder 100 caracteres' })
  @ApiPropertyOptional({ example: 'Transferencia bancaria' })
  metodoPago?: string;

  @IsOptional()
  @IsString()
  @Length(0, 200, { message: 'La referencia no puede exceder 200 caracteres' })
  @ApiPropertyOptional({ example: 'REF-00123' })
  referencia?: string;

  @IsOptional()
  @IsString()
  @ApiPropertyOptional()
  notas?: string;
}
