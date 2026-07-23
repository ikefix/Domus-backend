import {
  Controller,
  Post,
  Body,
  Res,
  UseGuards,
  Req,
  Inject,
  Get,
  Query,
} from '@nestjs/common';
import { UserService } from './user.service';
import { RegisterUserDto } from './dto/register-user.dto';
import type { Request, Response } from 'express';
import { BotDetectionGuard } from 'src/common/guards/bot-detection.guards';
import { LoginUserDto } from './dto/login-user.dto';
import { VerifyLoginOtpDto } from './dto/verify-login-otp.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { ThrottlerGuard, Throttle } from '@nestjs/throttler';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';
import { LoginBlockGuard } from 'src/common/guards/login-block.guard';
import { Authenticate_With_Cookie } from 'src/common/utils/cookie-authenticate.util';

@UseGuards(BotDetectionGuard, ThrottlerGuard)
@Controller('user')
export class UserController {
  googleCallbackQueryDtogoogleCallbackQueryDtogoogleCallbackQueryDto;
  constructor(
    private readonly userService: UserService,
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
  ) {}

  @Post('register')
  async handleRegister(
    @Body() registerUserDto: RegisterUserDto,
    @Res({ passthrough: true }) res: Response,
    @Req() req: Request,
  ) {
    const userAgent = req.headers['user-agent'] ?? '';
    const rawIp = req.ip || req.headers['x-forwarded-for'];
    const ip = Array.isArray(rawIp) ? rawIp[0] : (rawIp ?? '');

    const { user_data, access_token, refresh_token, session } =
      await this.userService.register({ registerUserDto, userAgent, ip });

    Authenticate_With_Cookie({ res, access_token, refresh_token });

    return {
      session: session,
      user_data: user_data,
      access_token,
    };
  }

  @UseGuards(LoginBlockGuard)
  @Post('login')
  async handleLogin(
    @Body() loginUserDto: LoginUserDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const userAgent = req.headers['user-agent'] ?? '';
    const rawIp = req.ip || req.headers['x-forwarded-for'];
    const ip = Array.isArray(rawIp) ? rawIp[0] : (rawIp ?? '');

    const result = await this.userService.login({
      loginUserDto,
      ip,
      userAgent,
    });

    if (result.trust === 'no trust') {
      if (result.emailSentStatus === 'success') {
        const blockDuration = 60 * 1000; // 60 seconds (short-lived, not longer than token life)
        const blockUntil = Date.now() + blockDuration;
        await this.cacheManager.set(
          `login_block:${ip}`,
          { blockUntil },
          blockDuration,
        );
      }
      return {
        requireOtp: true,
        emailSentStatus: result.emailSentStatus,
      };
    }

    Authenticate_With_Cookie({
      res,
      access_token: result.access_token,
      refresh_token: result.refresh_token,
    });

    return {
      access_token: result.access_token,
    };
  }

  @Post('verify-login-otp')
  async handleVerifyLoginOtp(
    @Body() verifyLoginOtpDto: VerifyLoginOtpDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const userAgent = req.headers['user-agent'] ?? '';
    const rawIp = req.ip || req.headers['x-forwarded-for'];
    const ip = Array.isArray(rawIp) ? rawIp[0] : (rawIp ?? '');

    const { user_data, access_token, refresh_token, session } =
      await this.userService.verifyLoginOtp({
        verifyLoginOtpDto,
        ip,
        userAgent,
      });

    Authenticate_With_Cookie({ res, access_token, refresh_token });

    return {
      session,
      user_data,
      access_token,
    };
  }

  @Throttle({ default: { limit: 3, ttl: 60000 } }) // Limit forgot password requests to 3 per minute
  @Post('forgot-password')
  async handleForgotPassword(@Body() forgotPasswordDto: ForgotPasswordDto) {
    return await this.userService.forgotPassword({
      email: forgotPasswordDto.email,
    });
  }

  @Throttle({ default: { limit: 5, ttl: 60000 } }) // Limit reset password requests to 5 per minute
  @Post('reset-password')
  async handleResetPassword(
    @Body() resetPasswordDto: ResetPasswordDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const userAgent = req.headers['user-agent'] ?? '';
    const rawIp = req.ip || req.headers['x-forwarded-for'];
    const ip = Array.isArray(rawIp) ? rawIp[0] : (rawIp ?? '');

    const { user_data, session, access_token, refresh_token } =
      await this.userService.resetPassword({
        resetPasswordDto,
        ip,
        userAgent,
      });

    Authenticate_With_Cookie({ res, access_token, refresh_token });

    return {
      session,
      user_data,
      access_token,
    };
  }

  @Get('google-callback')
  async handleGoogleCallBack(
    @Query() queryPayload: { code?: string,state?:string },
    @Res() res: Response,
    @Req() req: Request,
  ) {
    const userAgent = req.headers['user-agent'] ?? '';
    const rawIp = req.ip || req.headers['x-forwarded-for'];
    const ip = Array.isArray(rawIp) ? rawIp[0] : (rawIp ?? '');

    if (!queryPayload.code) {
      const frontend_base =
        process.env.FRONTEND_BASE_URL ?? 'http://localhost:3000';
      return res.redirect(
        `${frontend_base}/auth/google-return?status=no-code`,
      );
    }

    const payload = await this.userService.googleCallback({
      code: queryPayload.code,
      ip,
      userAgent,
      state: queryPayload.state,
    });

    const frontend_base =
      process.env.FRONTEND_BASE_URL ?? 'http://localhost:3000';

    if (payload.status === 'failed') {
      return res.redirect(
        `${frontend_base}/auth/google-return?status=${payload.reason}`,
      );
    }

    const { access_token, refresh_token } = payload;

    Authenticate_With_Cookie({ res, access_token, refresh_token });

    return res.redirect(`${frontend_base}/auth/google-callback?status=success`)
  }

  @Get('init-google-auth')
  async handleInitGoogleAuth(@Req() req: Request) {
    const rawIp = req.ip || req.headers['x-forwarded-for'];
    const ip = Array.isArray(rawIp) ? rawIp[0] : (rawIp ?? '');

     return this.userService.initGoogleAuth(ip);

   
  }

}
