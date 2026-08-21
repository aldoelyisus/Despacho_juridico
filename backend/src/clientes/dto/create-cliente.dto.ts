import { IsString, IsOptional, IsEmail, IsDateString, IsNotEmpty, Length, Matches, ValidateIf } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

const RFC_REGEX = /^[A-Za-z&Ññ]{3,4}\d{6}[A-Za-z0-9]{3}$/;
const CURP_REGEX = /^[A-Za-z]{4}\d{6}[HMhm][A-Za-z]{5}[A-Za-z0-9]\d$/;
const TELEFONO_REGEX = /^[0-9+\-\s()]{7,20}$/;

export class CreateClienteDto {
  @IsNotEmpty({ message: 'El nombre es obligatorio' })
  @IsString()
  @Length(1, 100, { message: 'El nombre no puede exceder 100 caracteres' })
  @ApiProperty({ example: 'Juan' })
  nombre: string;

  @IsNotEmpty({ message: 'El apellido es obligatorio' })
  @IsString()
  @Length(1, 100, { message: 'El apellido no puede exceder 100 caracteres' })
  @ApiProperty({ example: 'Pérez López' })
  apellido: string;

  @ValidateIf(o => !!o.email)
  @IsEmail({}, { message: 'El email no tiene un formato válido' })
  @Length(0, 200, { message: 'El email no puede exceder 200 caracteres' })
  @IsOptional()
  @ApiProperty({ required: false, example: 'juan@ejemplo.com' })
  email?: string;

  @ValidateIf(o => !!o.telefono)
  @Matches(TELEFONO_REGEX, { message: 'El teléfono debe tener entre 7 y 20 caracteres (números, espacios, +, -, paréntesis)' })
  @IsOptional()
  @ApiProperty({ required: false })
  telefono?: string;

  @IsNotEmpty({ message: 'El celular es obligatorio' })
  @Matches(TELEFONO_REGEX, { message: 'El celular debe tener entre 7 y 20 caracteres (números, espacios, +, -, paréntesis)' })
  @ApiProperty({ example: '555-123-4567', description: 'Número de celular (obligatorio)' })
  celular: string;

  @ValidateIf(o => !!o.rfc)
  @Matches(RFC_REGEX, { message: 'El RFC debe tener entre 10 y 13 caracteres alfanuméricos (formato: XXXX000000XXX)' })
  @IsOptional()
  @ApiProperty({ required: false })
  rfc?: string;

  @ValidateIf(o => !!o.curp)
  @Matches(CURP_REGEX, { message: 'La CURP debe tener 18 caracteres con el formato oficial (ej: XXXX000000XXXXXX00)' })
  @IsOptional()
  @ApiProperty({ required: false })
  curp?: string;

  @IsDateString({}, { message: 'La fecha de nacimiento no es válida' })
  @IsOptional()
  @ApiProperty({ required: false })
  fechaNacimiento?: string;

  @IsString()
  @Length(0, 300, { message: 'La dirección no puede exceder 300 caracteres' })
  @IsOptional()
  @ApiProperty({ required: false })
  direccion?: string;

  @IsString()
  @Length(0, 100, { message: 'La ciudad no puede exceder 100 caracteres' })
  @IsOptional()
  @ApiProperty({ required: false })
  ciudad?: string;

  @IsString()
  @Length(0, 100, { message: 'El estado no puede exceder 100 caracteres' })
  @IsOptional()
  @ApiProperty({ required: false })
  estado?: string;

  @IsString()
  @IsOptional()
  @ApiProperty({ required: false })
  notas?: string;
}
