import { IsEmail, IsString, MinLength, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RegisterDto {
  @IsString()
  @ApiProperty({ example: 'García & Asociados' })
  nombreDespacho: string;

  @IsString()
  @ApiProperty({ example: 'Carlos' })
  nombre: string;

  @IsString()
  @ApiProperty({ example: 'García' })
  apellido: string;

  @IsEmail()
  @ApiProperty({ example: 'admin@despacho.com' })
  email: string;

  @IsString()
  @MinLength(6)
  @ApiProperty({ example: 'password123' })
  password: string;

  @IsString()
  @IsOptional()
  @ApiProperty({ required: false })
  telefono?: string;
}
