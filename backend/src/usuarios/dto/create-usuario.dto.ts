import { IsEmail, IsString, IsInt, IsOptional, MinLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsStrongPassword } from '../../common/validators/is-strong-password.decorator';
import { PASSWORD_POLICY_DESCRIPTION } from '../../common/validators/password-policy';

export class CreateUsuarioDto {
  @IsString()
  @MinLength(1)
  @ApiProperty({ example: 'Carlos' })
  nombre: string;

  @IsString()
  @MinLength(1)
  @ApiProperty({ example: 'García' })
  apellido: string;

  @IsEmail({}, { message: 'Email inválido' })
  @ApiProperty({ example: 'carlos@despacho.com' })
  email: string;

  @IsString()
  @IsStrongPassword()
  @ApiProperty({ example: 'C0ntr4seña!Segura', description: PASSWORD_POLICY_DESCRIPTION })
  password: string;

  @IsInt()
  @ApiProperty({ example: 2 })
  rolId: number;

  @IsOptional()
  @IsString()
  @ApiPropertyOptional({ example: '5512345678' })
  telefono?: string;

  @IsOptional()
  @ApiPropertyOptional({ description: 'Confirma agregar un usuario extra sobre el límite del plan' })
  confirmExtra?: boolean;
}
