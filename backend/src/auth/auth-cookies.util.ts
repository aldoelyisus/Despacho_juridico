import { ConfigService } from '@nestjs/config';
import { CookieOptions } from 'express';

/**
 * Opciones de cookie de sesión, según entorno:
 *  - Producción (Railway, NODE_ENV=production): sameSite:'none' + secure:true — obligatorio para
 *    que el navegador mande la cookie entre dominios distintos (frontend en Vercel, backend en Railway).
 *  - Local: sameSite:'lax' + secure:false — funciona igual entre localhost:5173 y localhost:3001
 *    porque el navegador considera "mismo site" a distintos puertos de localhost.
 */
export function cookieOptions(config: ConfigService, path: string, maxAgeMs: number): CookieOptions {
  const isProd = config.get('NODE_ENV') === 'production';
  return {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? 'none' : 'lax',
    path,
    maxAge: maxAgeMs,
  };
}

export const ACCESS_TOKEN_MAX_AGE_MS = 15 * 60 * 1000;
export const REFRESH_TOKEN_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;
