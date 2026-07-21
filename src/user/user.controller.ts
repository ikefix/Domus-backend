import { Controller, Post, Body, Res, UseGuards, Req } from '@nestjs/common';
import { UserService } from './user.service';
import { RegisterUserDto } from './dto/register-user.dto';
import type { Request, Response } from 'express';
import { BotDetectionGuard } from 'src/common/guards/bot-detection.guards';
import { LoginUserDto } from './dto/login-user.dto';
import { VerifyLoginOtpDto } from './dto/verify-login-otp.dto';

@UseGuards(BotDetectionGuard)
@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) {}

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

    const isProduction = process.env.NODE_ENV === 'production';

    res.cookie(process.env.ACCESS_COOKIE_NAME ?? 'happydada', access_token, {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'lax',
      maxAge: 15 * 60 * 1000, // 15 minutes
    });

    res.cookie(process.env.REFRESH_COOKIE_NAME ?? 'hayyya', refresh_token, {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    return {
      session: session,
      user_data: user_data,
      access_token,
    };
  }

  @Post('login')
  async handleLogin(
    @Body() loginUserDto: LoginUserDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const userAgent = req.headers['user-agent'] ?? '';
    const rawIp = req.ip || req.headers['x-forwarded-for'];
    const ip = Array.isArray(rawIp) ? rawIp[0] : (rawIp ?? '');

    const result = await this.userService.login({ loginUserDto, ip, userAgent });

    if (result.trust === 'no trust') {
      return {
        requireOtp: true,
        emailSentStatus: result.emailSentStatus,
      };
    }

    const isProduction = process.env.NODE_ENV === 'production';

    res.cookie(process.env.ACCESS_COOKIE_NAME ?? 'happydada', result.access_token, {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'lax',
      maxAge: 15 * 60 * 1000, // 15 minutes
    });

    res.cookie(process.env.REFRESH_COOKIE_NAME ?? 'hayyya', result.refresh_token, {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
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

    const isProduction = process.env.NODE_ENV === 'production';

    res.cookie(process.env.ACCESS_COOKIE_NAME ?? 'happydada', access_token, {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'lax',
      maxAge: 15 * 60 * 1000, // 15 minutes
    });

    res.cookie(process.env.REFRESH_COOKIE_NAME ?? 'hayyya', refresh_token, {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    return {
      session,
      user_data,
      access_token,
    };
  }
}
