import { IsEmail, IsString, IsInt, IsOptional, IsBoolean, MinLength } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsStrongPassword } from '../../common/validators/is-strong-password.decorator';
import { PASSWORD_POLICY_DESCRIPTION } from '../../common/validators/password-policy';

export class UpdateUsuarioDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @ApiPropertyOptional({ example: 'Carlos' })
  nombre?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  @ApiPropertyOptional({ example: 'García' })
  apellido?: string;

  @IsOptional()
  @IsEmail({}, { message: 'Email inválido' })
  @ApiPropertyOptional({ example: 'carlos@despacho.com' })
  email?: string;

  @IsOptional()
  @IsString()
  @IsStrongPassword()
  @ApiPropertyOptional({ example: 'C0ntr4seña!Segura', description: PASSWORD_POLICY_DESCRIPTION })
  password?: string;

  @IsOptional()
  @IsInt()
  @ApiPropertyOptional({ example: 2 })
  rolId?: number;

  @IsOptional()
  @IsString()
  @ApiPropertyOptional({ example: '5512345678' })
  telefono?: string;

  @IsOptional()
  @IsBoolean()
  @ApiPropertyOptional()
  activo?: boolean;
}
