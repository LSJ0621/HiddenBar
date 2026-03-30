import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ThrottlerGuard, Throttle } from '@nestjs/throttler';
import type { Request, Response } from 'express';
import { AuthService } from './auth.service.js';
import { CookieService } from './cookie.service.js';
import { EmailVerificationService } from './email-verification.service.js';
import { AuthPasswordService } from './auth-password.service.js';
import { SignupDto } from './dto/signup.dto.js';
import { LoginDto } from './dto/login.dto.js';
import { SocialLoginDto } from './dto/social-login.dto.js';
import { SendCodeDto } from './dto/send-code.dto.js';
import { VerifyCodeDto } from './dto/verify-code.dto.js';
import { ResetPasswordDto } from './dto/reset-password.dto.js';
import { Public } from './decorators/public.decorator.js';

@Controller('auth')
@UseGuards(ThrottlerGuard)
@Throttle({ default: { ttl: 60000, limit: 5 } })
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly cookieService: CookieService,
    private readonly emailVerificationService: EmailVerificationService,
    private readonly authPasswordService: AuthPasswordService,
  ) {}

  /**
   * 이메일 회원가입.
   */
  @Post('signup')
  @Public()
  async signup(
    @Body() dto: SignupDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.signup(dto);
    this.cookieService.setAuthCookies(res, result);
    return { user: result.user };
  }

  /**
   * 이메일 로그인.
   */
  @Post('login')
  @Public()
  @HttpCode(HttpStatus.OK)
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.login(dto);
    this.cookieService.setAuthCookies(res, result);
    return { user: result.user };
  }

  /**
   * Google OAuth 로그인. isNewUser 여부에 따라 상태코드가 달라진다.
   */
  @Post('google')
  @Public()
  async google(
    @Body() dto: SocialLoginDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.googleLogin(dto.code);
    this.cookieService.setAuthCookies(res, result);
    res.status(result.isNewUser ? HttpStatus.CREATED : HttpStatus.OK);
    return { user: result.user, isNewUser: result.isNewUser };
  }

  /**
   * 인증 코드 발송.
   */
  @Post('email/send-code')
  @Public()
  @HttpCode(HttpStatus.OK)
  async sendCode(@Body() dto: SendCodeDto) {
    await this.emailVerificationService.sendCode(dto.email, dto.purpose);
    return { success: true };
  }

  /**
   * 인증 코드 검증. 성공 시 verificationToken을 반환한다.
   */
  @Post('email/verify-code')
  @Public()
  @HttpCode(HttpStatus.OK)
  async verifyCode(@Body() dto: VerifyCodeDto) {
    return this.emailVerificationService.verifyCode(
      dto.email,
      dto.code,
      dto.purpose,
    );
  }

  /**
   * 비밀번호 재설정.
   */
  @Post('password/reset')
  @Public()
  @HttpCode(HttpStatus.OK)
  async resetPassword(@Body() dto: ResetPasswordDto) {
    await this.authPasswordService.resetPassword(
      dto.verificationToken,
      dto.newPassword,
    );
    return { success: true };
  }

  /**
   * 토큰 갱신. refreshToken 쿠키에서 읽는다.
   */
  @Post('refresh')
  @Public()
  @HttpCode(HttpStatus.OK)
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const refreshToken = req.cookies?.refreshToken as string | undefined;
    if (!refreshToken) {
      res.status(HttpStatus.UNAUTHORIZED);
      return { message: 'Invalid refresh token.' };
    }
    const tokens = await this.authService.refresh(refreshToken);
    this.cookieService.setAuthCookies(res, tokens);
    return { success: true };
  }

  /**
   * 로그아웃. refreshToken 쿠키에서 읽어 삭제한다.
   */
  @Post('logout')
  @Public()
  @HttpCode(HttpStatus.NO_CONTENT)
  async logout(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const refreshToken = req.cookies?.refreshToken as string | undefined;
    if (refreshToken) {
      await this.authService.logout(refreshToken);
    }
    this.cookieService.clearAuthCookies(res);
  }
}
