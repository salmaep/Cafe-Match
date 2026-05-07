import {
  Controller,
  Post,
  Get,
  Body,
  UseGuards,
  Request,
  Res,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';
import type { Response } from 'express';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { RegisterOwnerDto } from './dto/register-owner.dto';
import { LoginDto } from './dto/login.dto';
import {
  Verify2faDto,
  Resend2faDto,
  EnrollPhoneDto,
  EnrollPhoneVerifyDto,
  SocialEnrollPhoneDto,
  SocialVerifyPhoneDto,
} from './dto/verify-2fa.dto';
import { Public } from '../common/decorators/public.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly config: ConfigService,
  ) {}

  @Public()
  @Post('register')
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Public()
  @Post('register/owner')
  registerOwner(@Body() dto: RegisterOwnerDto) {
    return this.authService.registerOwner(dto);
  }

  @Public()
  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  // ── 2FA ─────────────────────────────────────────────────────────────────
  @Public()
  @Post('2fa/verify')
  verify2fa(@Body() dto: Verify2faDto) {
    return this.authService.verify2fa(dto.otpId, dto.code);
  }

  @Public()
  @Post('2fa/resend')
  resend2fa(@Body() dto: Resend2faDto) {
    return this.authService.resend2fa(dto.otpId);
  }

  // ── Phone enrollment (turn on 2FA from settings) ────────────────────────
  @UseGuards(JwtAuthGuard)
  @Post('phone/enroll')
  enrollPhone(@Request() req: any, @Body() dto: EnrollPhoneDto) {
    return this.authService.enrollPhoneStart(req.user.userId ?? req.user.id, dto.phone);
  }

  @UseGuards(JwtAuthGuard)
  @Post('phone/verify')
  verifyPhone(@Request() req: any, @Body() dto: EnrollPhoneVerifyDto) {
    return this.authService.enrollPhoneVerify(
      req.user.userId ?? req.user.id,
      dto.otpId,
      dto.code,
      dto.phone,
    );
  }

  // ── Social phone enrollment (no JWT — keyed by enrollmentId) ───────────
  @Public()
  @Post('social/phone/enroll')
  socialEnrollPhone(@Body() dto: SocialEnrollPhoneDto) {
    return this.authService.socialEnrollPhone(dto.enrollmentId, dto.phone);
  }

  @Public()
  @Post('social/phone/verify')
  socialVerifyPhone(@Body() dto: SocialVerifyPhoneDto) {
    return this.authService.socialVerifyPhone(
      dto.enrollmentId,
      dto.otpId,
      dto.code,
      dto.phone,
    );
  }

  // ── Social login ────────────────────────────────────────────────────────
  @Public()
  @Get('google')
  @UseGuards(AuthGuard('google'))
  googleAuth() {
    /* redirect handled by passport */
  }

  @Public()
  @Get('google/callback')
  @UseGuards(AuthGuard('google'))
  async googleCallback(@Request() req: any, @Res() res: Response) {
    const result = await this.authService.socialLogin(req.user);
    return this.redirectToFrontend(req, res, result);
  }

  @Public()
  @Get('facebook')
  @UseGuards(AuthGuard('facebook'))
  facebookAuth() {
    /* redirect handled by passport */
  }

  @Public()
  @Get('facebook/callback')
  @UseGuards(AuthGuard('facebook'))
  async facebookCallback(@Request() req: any, @Res() res: Response) {
    const result = await this.authService.socialLogin(req.user);
    return this.redirectToFrontend(req, res, result);
  }

  private redirectToFrontend(req: any, res: Response, result: any) {
    // Mobile clients pass ?mobile_redirect=cafematch://auth/callback in the
    // initial /auth/google call; passport carries it via req.query on callback.
    const mobileRedirect = req.query?.mobile_redirect as string | undefined;
    const redirect =
      mobileRedirect ||
      this.config.get<string>('OAUTH_REDIRECT_URL') ||
      'http://localhost:3083/auth/callback';
    const params = new URLSearchParams();
    if (result.twoFaRequired) {
      params.set('twoFaRequired', '1');
      params.set('otpId', result.otpId);
      params.set('expiresAt', result.expiresAt);
      if (result.phoneHint) params.set('phoneHint', result.phoneHint);
    } else if (result.phoneEnrollRequired) {
      params.set('phoneEnrollRequired', '1');
      params.set('enrollmentId', result.enrollmentId);
      params.set('expiresAt', result.expiresAt);
    } else {
      params.set('token', result.accessToken);
    }
    return res.redirect(`${redirect}?${params.toString()}`);
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  getProfile(@Request() req: any) {
    return req.user;
  }
}
