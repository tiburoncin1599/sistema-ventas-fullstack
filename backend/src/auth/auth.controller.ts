import {
  Controller,
  Post,
  Get,
  Body,
  Req,
  Res,
  UseGuards,
  UnauthorizedException,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { RegistroDto } from './dto/registro.dto';
import { LoginDto } from './dto/login.dto';
import { JwtAuthGuard } from './jwt-auth.guard';
import { Request, Response } from 'express';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  private readonly REFRESH_COOKIE = 'refresh_token';
  private readonly COOKIE_OPTIONS = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: '/auth',
    maxAge: 30 * 24 * 60 * 60 * 1000, // 30 días
  };

  private get googleConfig() {
    return {
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL:
        process.env.GOOGLE_CALLBACK_URL ||
        'https://web-production-c811d.up.railway.app/auth/google/callback',
    };
  }

  private get googleHabilitado() {
    return !!(this.googleConfig.clientId && this.googleConfig.clientSecret);
  }

  private setRefreshCookie(res: Response, refreshToken: string) {
    res.cookie(this.REFRESH_COOKIE, refreshToken, this.COOKIE_OPTIONS);
  }

  private clearRefreshCookie(res: Response) {
    res.clearCookie(this.REFRESH_COOKIE, { path: '/auth' });
  }

  @Post('registro')
  @Throttle({ short: { limit: 2, ttl: 60000 } })
  async registro(@Body() body: RegistroDto, @Res({ passthrough: true }) res: Response) {
    const result = await this.authService.registro(body.nombre, body.email, body.password);
    this.setRefreshCookie(res, result.refreshToken);
    const { refreshToken, ...data } = result;
    return data;
  }

  @Post('login')
  @Throttle({ short: { limit: 5, ttl: 60000 } })
  async login(@Body() body: LoginDto, @Res({ passthrough: true }) res: Response) {
    const result = await this.authService.login(body.email, body.password);
    this.setRefreshCookie(res, result.refreshToken);
    const { refreshToken, ...data } = result;
    return data;
  }

  @Post('refresh')
  async refresh(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const refreshToken = req.cookies?.[this.REFRESH_COOKIE];
    if (!refreshToken) {
      const token = req.body?.refreshToken;
      if (!token) throw new UnauthorizedException('Refresh token requerido');
      const result = await this.authService.refresh(token);
      this.setRefreshCookie(res, result.refreshToken);
      const { refreshToken: rt, ...data } = result;
      return data;
    }
    const result = await this.authService.refresh(refreshToken);
    this.setRefreshCookie(res, result.refreshToken);
    const { refreshToken: rt, ...data } = result;
    return data;
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  async logout(@Req() req: any, @Res({ passthrough: true }) res: Response) {
    await this.authService.logout(req.user.id);
    this.clearRefreshCookie(res);
    return { message: 'Sesión cerrada correctamente' };
  }

  @Get('google')
  googleAuth(@Res() res: Response) {
    const FRONTEND_URL = process.env.FRONTEND_URL || 'https://sistema-ventas-frontend-tawny.vercel.app';
    if (!this.googleHabilitado) {
      return res.redirect(
        `${FRONTEND_URL}/auth?error=${encodeURIComponent('Google OAuth no configurado. Contactá al administrador.')}`,
      );
    }
    const { clientId, callbackURL } = this.googleConfig;
    const googleUrl =
      'https://accounts.google.com/o/oauth2/v2/auth?' +
      new URLSearchParams({
        client_id: clientId!,
        redirect_uri: callbackURL,
        response_type: 'code',
        scope: 'email profile',
      }).toString();
    res.redirect(googleUrl);
  }

  @Get('google/callback')
  async googleCallback(@Req() req: Request, @Res() res: Response) {
    const FRONTEND_URL = process.env.FRONTEND_URL || 'https://sistema-ventas-frontend-tawny.vercel.app';
    const code = req.query.code as string;
    if (!code || !this.googleHabilitado) {
      return res.redirect(
        `${FRONTEND_URL}/auth?error=${encodeURIComponent('Google OAuth no configurado. Contactá al administrador.')}`,
      );
    }
    try {
      const { clientId, clientSecret, callbackURL } = this.googleConfig;
      const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          code,
          client_id: clientId!,
          client_secret: clientSecret!,
          redirect_uri: callbackURL,
          grant_type: 'authorization_code',
        }).toString(),
      });
      const tokenData = await tokenRes.json();
      if (!tokenData.access_token) {
        console.error('Error en token exchange:', JSON.stringify(tokenData));
        throw new Error(`Error de Google: ${tokenData.error_description || tokenData.error || 'Failed to get access token'}`);
      }
      const userRes = await fetch(
        'https://www.googleapis.com/oauth2/v2/userinfo',
        {
          headers: { Authorization: `Bearer ${tokenData.access_token}` },
        },
      );
      const googleUser = await userRes.json();

      const result = await this.authService.loginOGoogle(
        googleUser.id,
        googleUser.email,
        googleUser.name,
      );

      res.redirect(
        `${FRONTEND_URL}/auth/google/callback?token=${result.token}&usuario=${encodeURIComponent(JSON.stringify(result.usuario))}`,
      );
    } catch (err) {
      console.error('Error en Google callback:', err);
      const mensaje = err instanceof Error ? err.message : 'Error al autenticar con Google. Intentalo de nuevo.';
      return res.redirect(
        `${FRONTEND_URL}/auth?error=${encodeURIComponent(mensaje)}`,
      );
    }
  }
}
