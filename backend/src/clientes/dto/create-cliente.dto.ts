import { IsString, IsOptional, IsEmail, IsDateString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateClienteDto {
  @IsString()
  @ApiProperty({ example: 'Juan' })
  nombre: string;

  @IsString()
  @ApiProperty({ example: 'Pérez López' })
  apellido: string;

  @IsEmail()
  @IsOptional()
  @ApiProperty({ required: false, example: 'juan@ejemplo.com' })
  email?: string;

  @IsString()
  @IsOptional()
  @ApiProperty({ required: false })
  telefono?: string;

  @IsString()
  @ApiProperty({ example: '555-123-4567', description: 'Número de celular (obligatorio)' })
  celular: string;

  @IsString()
  @IsOptional()
  @ApiProperty({ required: false })
  rfc?: string;

  @IsString()
  @IsOptional()
  @ApiProperty({ required: false })
  curp?: string;

  @IsDateString()
  @IsOptional()
  @ApiProperty({ required: false })
  fechaNacimiento?: string;

  @IsString()
  @IsOptional()
  @ApiProperty({ required: false })
  direccion?: string;

  @IsString()
  @IsOptional()
  @ApiProperty({ required: false })
  ciudad?: string;

  @IsString()
  @IsOptional()
  @ApiProperty({ required: false })
  estado?: string;

  @IsString()
  @IsOptional()
  @ApiProperty({ required: false })
  notas?: string;
}
