import { IsString, IsOptional, IsEmail, IsNotEmpty, Length, Matches, ValidateIf } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

const TELEFONO_REGEX = /^[0-9+\-\s()]{7,20}$/;

export class CreateContactoDto {
  @IsNotEmpty({ message: 'El nombre es obligatorio' })
  @IsString()
  @Length(1, 150, { message: 'El nombre no puede exceder 150 caracteres' })
  @ApiProperty({ example: 'Ana Torres' })
  nombre: string;

  @IsNotEmpty({ message: 'El email es obligatorio' })
  @IsEmail({}, { message: 'El email no tiene un formato válido' })
  @Length(1, 200, { message: 'El email no puede exceder 200 caracteres' })
  @ApiProperty({ example: 'ana@despacho.com' })
  email: string;

  @ValidateIf((o) => !!o.telefono)
  @Matches(TELEFONO_REGEX, { message: 'El teléfono debe tener entre 7 y 20 caracteres (números, espacios, +, -, paréntesis)' })
  @IsOptional()
  @ApiProperty({ required: false, example: '618-246-6273' })
  telefono?: string;

  @IsNotEmpty({ message: 'El mensaje es obligatorio' })
  @IsString()
  @Length(1, 1000, { message: 'El mensaje no puede exceder 1000 caracteres' })
  @ApiProperty({ example: 'Somos un despacho de 5 abogados, nos interesa el plan Profesional.' })
  mensaje: string;
}
