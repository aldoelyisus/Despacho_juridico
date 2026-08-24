import {
  Controller, Post, Get, Body, HttpCode, HttpStatus, Ip, Req, Res, UnauthorizedException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import type { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { ChangePasswordRequiredDto } from './dto/change-password-required.dto';
import { Public } from '../common/decorators/public.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { cookieOptions, ACCESS_TOKEN_MAX_AGE_MS, REFRESH_TOKEN_MAX_AGE_MS } from './auth-cookies.util';

@ApiTags('🔐 Autenticación')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly config: ConfigService,
  ) {}

  /** Pone accessToken/refreshToken como cookies httpOnly — nunca viajan en el body de la respuesta. */
  private setSessionCookies(res: Response, accessToken: string, refreshToken: string) {
    res.cookie('accessToken', accessToken, cookieOptions(this.config, '/', ACCESS_TOKEN_MAX_AGE_MS));
    res.cookie('refreshToken', refreshToken, cookieOptions(this.config, '/auth', REFRESH_TOKEN_MAX_AGE_MS));
  }

  @Post('login')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Iniciar sesión',
    description:
      'Si el usuario tiene una contraseña temporal pendiente retorna requiresPasswordChange: true + tempToken. ' +
      'Si tiene 2FA activo retorna requires2FA: true + tempToken. El tiempo de respuesta es uniforme independientemente ' +
      'de si el correo existe o la contraseña es correcta, y los intentos fallidos se registran con límite configurable de bloqueo. ' +
      'En caso de éxito, los tokens de sesión se entregan como cookies httpOnly (no en el body).',
  })
  @ApiResponse({ status: 200, description: 'Login exitoso, requiere 2FA o requiere cambio de contraseña' })
  @ApiResponse({ status: 401, description: 'Credenciales inválidas' })
  @ApiResponse({ status: 403, description: 'Despacho bloqueado/desactivado o cuenta temporalmente bloqueada por intentos fallidos' })
  async login(@Body() dto: LoginDto, @Ip() ip: string, @Res({ passthrough: true }) res: Response) {
    const result = await this.authService.login(dto, ip);
    if ('accessToken' in result) {
      this.setSessionCookies(res, result.accessToken, result.refreshToken);
      return { usuario: result.usuario };
    }
    return result;
  }

  @Post('change-password-required')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Fijar la contraseña definitiva cuando el login exige un cambio obligatorio',
    description:
      'Se usa con el tempToken devuelto por /auth/login cuando requiresPasswordChange es true ' +
      '(usuario recién creado o con contraseña restablecida por un administrador del despacho). ' +
      'La nueva contraseña debe cumplir la política de seguridad y ser distinta a la actual. ' +
      'Tras el cambio, continúa el flujo normal (2FA si está activo, o cookies de sesión).',
  })
  @ApiResponse({ status: 200, description: 'Contraseña actualizada — deja la sesión iniciada o requiere 2FA' })
  @ApiResponse({ status: 400, description: 'Contraseña débil o igual a la actual' })
  @ApiResponse({ status: 401, description: 'Token temporal inválido o expirado' })
  async changePasswordRequired(@Body() dto: ChangePasswordRequiredDto, @Ip() ip: string, @Res({ passthrough: true }) res: Response) {
    const result = await this.authService.changePasswordRequired(dto.tempToken, dto.newPassword, ip);
    if ('accessToken' in result) {
      this.setSessionCookies(res, result.accessToken, result.refreshToken);
      return { usuario: result.usuario };
    }
    return result;
  }

  @Post('refresh')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Renovar la sesión usando la cookie httpOnly de refresh token' })
  @ApiResponse({ status: 401, description: 'Sin cookie de refresh o refresh token inválido/expirado' })
  async refresh(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const refreshToken = req.cookies?.refreshToken;
    if (!refreshToken) throw new UnauthorizedException('Sesión no encontrada');
    const tokens = await this.authService.refreshToken(refreshToken);
    this.setSessionCookies(res, tokens.accessToken, tokens.refreshToken);
    return { success: true };
  }

  @Post('logout')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Cerrar sesión — borra las cookies de sesión' })
  logout(@Res({ passthrough: true }) res: Response) {
    res.clearCookie('accessToken', { path: '/' });
    res.clearCookie('refreshToken', { path: '/auth' });
    return { success: true };
  }

  @Get('me')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Usuario de la sesión actual (según la cookie httpOnly)' })
  async me(@CurrentUser('id') userId: number) {
    return { usuario: await this.authService.getUsuarioActual(userId) };
  }

  // ── 2FA ──────────────────────────────────────────────────────────────────

  @Post('2fa/verify')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verificar código 2FA (TOTP o backup code) e iniciar la sesión' })
  @ApiResponse({ status: 200, description: 'Código correcto — deja la sesión iniciada' })
  @ApiResponse({ status: 401, description: 'Token temporal inválido o código incorrecto' })
  async verify2FA(@Body() body: { tempToken: string; code: string }, @Ip() ip: string, @Res({ passthrough: true }) res: Response) {
    const result = await this.authService.verify2FA(body.tempToken, body.code, ip);
    if ('accessToken' in result) {
      this.setSessionCookies(res, result.accessToken, result.refreshToken);
      return { usuario: result.usuario };
    }
    return result;
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
