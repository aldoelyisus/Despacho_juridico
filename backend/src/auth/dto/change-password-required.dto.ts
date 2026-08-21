import { IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { IsStrongPassword } from '../../common/validators/is-strong-password.decorator';
import { PASSWORD_POLICY_DESCRIPTION } from '../../common/validators/password-policy';

export class ChangePasswordRequiredDto {
  @IsString()
  @ApiProperty({ description: 'Token temporal recibido en el login cuando requiresPasswordChange es true' })
  tempToken: string;

  @IsString()
  @IsStrongPassword()
  @ApiProperty({ example: 'Nu3va!Contraseña', description: PASSWORD_POLICY_DESCRIPTION })
  newPassword: string;
}
