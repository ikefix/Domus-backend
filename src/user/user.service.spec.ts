import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { UserService } from './user.service';
import { PrismaService } from '../prisma/prisma.service';
import { SessionService } from '../common/services/session.service';
import { EmailingService } from '../common/services';
import bcrypt from 'bcryptjs';

jest.mock('../common/utils/jwt.util', () => jest.fn(() => 'mock_token'));

describe('UserService', () => {
  let service: UserService;
  let prismaMock: any;
  let sessionServiceMock: any;
  let mailerMock: any;

  beforeEach(async () => {
    prismaMock = {
      client: {
        user: {
          findUnique: jest.fn(),
          create: jest.fn(),
        },
        session: {
          findFirst: jest.fn(),
          delete: jest.fn(),
        },
        otp: {
          create: jest.fn(),
          findFirst: jest.fn(),
          delete: jest.fn(),
        },
      },
    };

    sessionServiceMock = {
      createSession: jest.fn(),
    };

    mailerMock = {
      sendOtp: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserService,
        { provide: PrismaService, useValue: prismaMock },
        { provide: SessionService, useValue: sessionServiceMock },
        { provide: EmailingService, useValue: mailerMock },
      ],
    }).compile();

    service = module.get<UserService>(UserService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('register', () => {
    it('should throw BadRequestException if user email already exists', async () => {
      prismaMock.client.user.findUnique.mockResolvedValue({ id: '1', email: 'test@example.com' });

      await expect(
        service.register({
          registerUserDto: { name: 'Test', email: 'test@example.com', password: 'password123' },
          ip: '127.0.0.1',
          userAgent: 'test-agent',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should register user and return tokens', async () => {
      prismaMock.client.user.findUnique.mockResolvedValue(null);
      prismaMock.client.user.create.mockResolvedValue({
        id: 'user_1',
        name: 'Test User',
        email: 'test@example.com',
      });
      sessionServiceMock.createSession.mockResolvedValue({ id: 'session_1' });

      const result = await service.register({
        registerUserDto: { name: 'Test User', email: 'test@example.com', password: 'password123' },
        ip: '127.0.0.1',
        userAgent: 'test-agent',
      });

      expect(result).toHaveProperty('user_data');
      expect(result).toHaveProperty('session');
      expect(result).toHaveProperty('access_token', 'mock_token');
      expect(result).toHaveProperty('refresh_token', 'mock_token');
    });
  });

  describe('login', () => {
    it('should throw BadRequestException if user is not found', async () => {
      prismaMock.client.user.findUnique.mockResolvedValue(null);

      await expect(
        service.login({
          loginUserDto: { email: 'nonexistent@example.com', password: 'password123' },
          ip: '127.0.0.1',
          userAgent: 'test-agent',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if password does not match', async () => {
      const hashedPassword = await bcrypt.hash('password123', 10);
      prismaMock.client.user.findUnique.mockResolvedValue({
        id: 'user_1',
        email: 'test@example.com',
        password: hashedPassword,
      });

      await expect(
        service.login({
          loginUserDto: { email: 'test@example.com', password: 'wrongpassword' },
          ip: '127.0.0.1',
          userAgent: 'test-agent',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should return trusted response if trusted session exists', async () => {
      const hashedPassword = await bcrypt.hash('password123', 10);
      const user = { id: 'user_1', email: 'test@example.com', password: hashedPassword };

      prismaMock.client.user.findUnique.mockResolvedValue(user);
      prismaMock.client.session.findFirst.mockResolvedValue({ id: 'old_session_1' });
      prismaMock.client.session.delete.mockResolvedValue({});
      sessionServiceMock.createSession.mockResolvedValue({ id: 'new_session_1' });

      const result = await service.login({
        loginUserDto: { email: 'test@example.com', password: 'password123' },
        ip: '127.0.0.1',
        userAgent: 'test-agent',
      });

      expect(result).toEqual({
        trust: 'trust',
        user_data: user,
        session: { id: 'new_session_1' },
        access_token: 'mock_token',
        refresh_token: 'mock_token',
      });
    });

    it('should return no-trust response and send OTP if trusted session does not exist', async () => {
      const hashedPassword = await bcrypt.hash('password123', 10);
      const user = { id: 'user_1', email: 'test@example.com', password: hashedPassword };

      prismaMock.client.user.findUnique.mockResolvedValue(user);
      prismaMock.client.session.findFirst.mockResolvedValue(null);
      prismaMock.client.otp.create.mockResolvedValue({ code: '123456', useCase: 'LOGIN_AUTHENTICATE' });
      mailerMock.sendOtp.mockResolvedValue('success');

      const result = await service.login({
        loginUserDto: { email: 'test@example.com', password: 'password123' },
        ip: '127.0.0.1',
        userAgent: 'test-agent',
      });

      expect(result).toEqual({
        trust: 'no trust',
        emailSentStatus: 'success',
      });
    });
  });

  describe('verifyLoginOtp', () => {
    it('should throw BadRequestException if user does not exist', async () => {
      prismaMock.client.user.findUnique.mockResolvedValue(null);

      await expect(
        service.verifyLoginOtp({
          verifyLoginOtpDto: { email: 'test@example.com', code: '123456' },
          ip: '127.0.0.1',
          userAgent: 'test-agent',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if OTP record is not found', async () => {
      prismaMock.client.user.findUnique.mockResolvedValue({ id: 'user_1', email: 'test@example.com' });
      prismaMock.client.otp.findFirst.mockResolvedValue(null);

      await expect(
        service.verifyLoginOtp({
          verifyLoginOtpDto: { email: 'test@example.com', code: '123456' },
          ip: '127.0.0.1',
          userAgent: 'test-agent',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException and delete OTP if OTP is expired', async () => {
      prismaMock.client.user.findUnique.mockResolvedValue({ id: 'user_1', email: 'test@example.com' });
      prismaMock.client.otp.findFirst.mockResolvedValue({
        id: 'otp_1',
        expiresAt: new Date(Date.now() - 1000), // expired
      });
      prismaMock.client.otp.delete.mockResolvedValue({});

      await expect(
        service.verifyLoginOtp({
          verifyLoginOtpDto: { email: 'test@example.com', code: '123456' },
          ip: '127.0.0.1',
          userAgent: 'test-agent',
        }),
      ).rejects.toThrow(BadRequestException);

      expect(prismaMock.client.otp.delete).toHaveBeenCalledWith({ where: { id: 'otp_1' } });
    });

    it('should verify OTP, delete record, create session and return tokens', async () => {
      const user = { id: 'user_1', email: 'test@example.com' };
      prismaMock.client.user.findUnique.mockResolvedValue(user);
      prismaMock.client.otp.findFirst.mockResolvedValue({
        id: 'otp_1',
        expiresAt: new Date(Date.now() + 60000), // valid
      });
      prismaMock.client.otp.delete.mockResolvedValue({});
      sessionServiceMock.createSession.mockResolvedValue({ id: 'session_1' });

      const result = await service.verifyLoginOtp({
        verifyLoginOtpDto: { email: 'test@example.com', code: '123456' },
        ip: '127.0.0.1',
        userAgent: 'test-agent',
      });

      expect(prismaMock.client.otp.delete).toHaveBeenCalledWith({ where: { id: 'otp_1' } });
      expect(result).toHaveProperty('user_data', user);
      expect(result).toHaveProperty('session');
      expect(result).toHaveProperty('access_token', 'mock_token');
      expect(result).toHaveProperty('refresh_token', 'mock_token');
    });
  });
});
