import { BadRequestException, Injectable, Ip } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { RegisterUserDto } from './dto/register-user.dto';
import bcrypt from 'bcryptjs';
import signJwt from 'src/common/utils/jwt.util';
import { SessionService } from 'src/common/services/session.service';
import { LoginUserDto } from './dto/login-user.dto';
import { VerifyLoginOtpDto } from './dto/verify-login-otp.dto';
import { EmailingService } from 'src/common/services';

type registerT = {
  registerUserDto: RegisterUserDto;
  ip: string;
  userAgent: string;
};

type loginT = {
  loginUserDto: LoginUserDto;
  ip: string;
  userAgent: string;
};

type verifyLoginOtpT = {
  verifyLoginOtpDto: VerifyLoginOtpDto;
  ip: string;
  userAgent: string;
};

export type LoginTrustedResponse = {
  trust: 'trust';
  user_data: any;
  session: any;
  access_token: string;
  refresh_token: string;
};

export type LoginNoTrustResponse = {
  trust: 'no trust';
  emailSentStatus: 'success' | 'failed';
};

export type LoginResponse = LoginTrustedResponse | LoginNoTrustResponse;

@Injectable()
export class UserService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly sessionService: SessionService,
    private readonly mailer: EmailingService,
  ) {}

  async register(payload: registerT) {
    const registerUserDto = payload.registerUserDto;
    const userAgent = payload.userAgent;
    const ip = payload.ip;

    const { name, email, password } = registerUserDto;

    const findUser = await this.prisma.client.user.findUnique({
      where: {
        email,
      },
    });

    if (findUser) {
      throw new BadRequestException('User already registered login');
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = await this.prisma.client.user.create({
      data: {
        email,
        password: hashedPassword,
        name,
      },
    });

    const newSession = await this.sessionService.createSession({
      ip,
      userId: newUser.id,
      userAgent,
    });

    const access_token = signJwt({
      type: 'access',
      userId: newUser.id,
      sessionId: newSession.id,
    });
    const refresh_token = signJwt({
      type: 'refresh',
      userId: newUser.id,
      sessionId: newSession.id,
    });

    return {
      user_data: newUser,
      session: newSession,
      access_token,
      refresh_token,
    };
  }

  async login(payload: loginT): Promise<LoginResponse> {
    const MAX_ACTIVE_SESSIONS = 10;

    const { email, password } = payload.loginUserDto;

    const ip = payload.ip;
    const userAgent = payload.userAgent;

    const findUser = await this.prisma.client.user.findUnique({
      where: {
        email,
      },
    });

    if (!findUser) {
      throw new BadRequestException('Invalid email or password');
    }

    const isPasswordValid = await bcrypt.compare(password, findUser.password);
    if (!isPasswordValid) {
      throw new BadRequestException('Invalid email or password');
    }

    const trustedOldSession = await this.prisma.client.session.findFirst({
      where: {
        userId: findUser.id,
        ipAddress: ip,
        expiresAt: {
          gt: new Date(), // Ensures the session is still alive (not expired)
        },
      },
      orderBy: {
        createdAt: 'asc',
      },
    });

    if (trustedOldSession) {
      await this.prisma.client.session.delete({
        where: {
          id: trustedOldSession.id,
        },
      });

      const newSession = await this.sessionService.createSession({
        ip,
        userId: findUser.id,
        userAgent,
      });

      const access_token = signJwt({
        type: 'access',
        userId: findUser.id,
        sessionId: newSession.id,
      });

      const refresh_token = signJwt({
        type: 'refresh',
        userId: findUser.id,
        sessionId: newSession.id,
      });

      return {
        trust: 'trust',
        user_data: findUser,
        session: newSession,
        access_token,
        refresh_token,
      };
    }

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

    const newOtp = await this.prisma.client.otp.create({
      data: {
        useCase: 'LOGIN_AUTHENTICATE',
        identifier: findUser.email,
        code,
        userId: findUser.id,
        expiresAt,
      },
    });

    const sendOtpRes = await this.mailer.sendOtp(
      findUser.email,
      newOtp.code,
      newOtp.useCase,
    );

    return {
      trust: 'no trust',
      emailSentStatus: sendOtpRes,
    };
  }

  async verifyLoginOtp(payload: verifyLoginOtpT) {
    const { email, code } = payload.verifyLoginOtpDto;
    const { ip, userAgent } = payload;

    const findUser = await this.prisma.client.user.findUnique({
      where: { email },
    });

    if (!findUser) {
      throw new BadRequestException('Invalid request');
    }

    const otpRecord = await this.prisma.client.otp.findFirst({
      where: {
        userId: findUser.id,
        identifier: email,
        code,
        useCase: 'LOGIN_AUTHENTICATE',
      },
    });

    if (!otpRecord) {
      throw new BadRequestException('Invalid or expired OTP code');
    }

    if (otpRecord.expiresAt < new Date()) {
      await this.prisma.client.otp.delete({
        where: { id: otpRecord.id },
      });
      throw new BadRequestException('OTP code has expired');
    }

    await this.prisma.client.otp.delete({
      where: { id: otpRecord.id },
    });

    const newSession = await this.sessionService.createSession({
      ip,
      userId: findUser.id,
      userAgent,
    });

    const access_token = signJwt({
      type: 'access',
      userId: findUser.id,
      sessionId: newSession.id,
    });

    const refresh_token = signJwt({
      type: 'refresh',
      userId: findUser.id,
      sessionId: newSession.id,
    });

    return {
      user_data: findUser,
      session: newSession,
      access_token,
      refresh_token,
    };
  }
}
