import {
  Controller, Post, Get, Body, HttpCode, HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { Public } from '../common/decorators/public.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('🔐 Autenticación')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Iniciar sesión. Si el usuario tiene 2FA activo retorna requires2FA: true + tempToken' })
  @ApiResponse({ status: 200, description: 'Login exitoso o requiere 2FA' })
  @ApiResponse({ status: 401, description: 'Credenciales inválidas' })
  @ApiResponse({ status: 403, description: 'Despacho bloqueado o desactivado' })
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Post('refresh')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Renovar access token con refresh token' })
  refresh(@Body('refreshToken') refreshToken: string) {
    return this.authService.refreshToken(refreshToken);
  }

  // ── 2FA ──────────────────────────────────────────────────────────────────

  @Post('2fa/verify')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verificar código 2FA (TOTP o backup code) y obtener tokens JWT' })
  @ApiResponse({ status: 200, description: 'Código correcto — retorna tokens' })
  @ApiResponse({ status: 401, description: 'Token temporal inválido o código incorrecto' })
  verify2FA(@Body() body: { tempToken: string; code: string }) {
    return this.authService.verify2FA(body.tempToken, body.code);
  }

  @Get('2fa/status')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Obtener estado actual del 2FA del usuario autenticado' })
  get2FAStatus(@CurrentUser('id') userId: number) {
    return this.authService.get2FAStatus(userId);
  }

  @Post('2fa/setup')
  @ApiBearerAuth('JWT-auth')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Generar secreto + QR code para activar 2FA' })
  setup2FA(@CurrentUser('id') userId: number) {
    return this.authService.setup2FA(userId);
  }

  @Post('2fa/enable')
  @ApiBearerAuth('JWT-auth')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Confirmar código TOTP y activar 2FA. Retorna 8 backup codes.' })
  enable2FA(
    @CurrentUser('id') userId: number,
    @Body() body: { code: string },
  ) {
    return this.authService.enable2FA(userId, body.code);
  }

  @Post('2fa/disable')
  @ApiBearerAuth('JWT-auth')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Desactivar 2FA (requiere código TOTP actual)' })
  disable2FA(
    @CurrentUser('id') userId: number,
    @Body() body: { code: string },
  ) {
    return this.authService.disable2FA(userId, body.code);
  }
}
