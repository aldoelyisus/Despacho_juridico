import { IsNotEmpty, IsString, IsOptional, Length, Matches } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateAreaDto {
  @IsNotEmpty({ message: 'El nombre del área es obligatorio' })
  @IsString()
  @Length(1, 150, { message: 'El nombre no puede exceder 150 caracteres' })
  @ApiProperty({ example: 'Derecho Penal' })
  nombre: string;

  @IsOptional()
  @IsString()
  @Length(0, 300, { message: 'La descripción no puede exceder 300 caracteres' })
  @ApiPropertyOptional()
  descripcion?: string;

  @IsOptional()
  @Matches(/^#[0-9A-Fa-f]{6}$/, { message: 'El color debe ser un código hexadecimal válido (ej: #6366f1)' })
  @ApiPropertyOptional({ example: '#6366f1' })
  color?: string;
}
