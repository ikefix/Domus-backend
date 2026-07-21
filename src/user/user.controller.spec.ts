import { Test, TestingModule } from '@nestjs/testing';
import { UserController } from './user.controller';
import { UserService } from './user.service';
import { BotDetectionGuard } from '../common/guards/bot-detection.guards';

describe('UserController', () => {
  let controller: UserController;
  let userServiceMock: any;
  let mockRes: any;
  let mockReq: any;

  beforeEach(async () => {
    userServiceMock = {
      register: jest.fn(),
      login: jest.fn(),
      verifyLoginOtp: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [UserController],
      providers: [{ provide: UserService, useValue: userServiceMock }],
    })
      .overrideGuard(BotDetectionGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<UserController>(UserController);

    mockRes = {
      cookie: jest.fn(),
    };

    mockReq = {
      headers: { 'user-agent': 'test-agent' },
      ip: '127.0.0.1',
    };
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('handleRegister', () => {
    it('should register user, set cookies, and return payload', async () => {
      userServiceMock.register.mockResolvedValue({
        user_data: { id: 'u1', name: 'Test' },
        session: { id: 's1' },
        access_token: 'access_123',
        refresh_token: 'refresh_123',
      });

      const dto = { name: 'Test', email: 'test@example.com', password: 'password123' };
      const response = await controller.handleRegister(dto, mockRes, mockReq);

      expect(userServiceMock.register).toHaveBeenCalledWith({
        registerUserDto: dto,
        userAgent: 'test-agent',
        ip: '127.0.0.1',
      });
      expect(mockRes.cookie).toHaveBeenCalledTimes(2);
      expect(response).toEqual({
        session: { id: 's1' },
        user_data: { id: 'u1', name: 'Test' },
        access_token: 'access_123',
      });
    });
  });

  describe('handleLogin', () => {
    it('should return requireOtp when device is untrusted', async () => {
      userServiceMock.login.mockResolvedValue({
        trust: 'no trust',
        emailSentStatus: 'success',
      });

      const dto = { email: 'test@example.com', password: 'password123' };
      const response = await controller.handleLogin(dto, mockReq, mockRes);

      expect(response).toEqual({
        requireOtp: true,
        emailSentStatus: 'success',
      });
      expect(mockRes.cookie).not.toHaveBeenCalled();
    });

    it('should set cookies and return access token when device is trusted', async () => {
      userServiceMock.login.mockResolvedValue({
        trust: 'trust',
        user_data: { id: 'u1' },
        session: { id: 's1' },
        access_token: 'access_123',
        refresh_token: 'refresh_123',
      });

      const dto = { email: 'test@example.com', password: 'password123' };
      const response = await controller.handleLogin(dto, mockReq, mockRes);

      expect(mockRes.cookie).toHaveBeenCalledTimes(2);
      expect(response).toEqual({
        access_token: 'access_123',
      });
    });
  });

  describe('handleVerifyLoginOtp', () => {
    it('should verify OTP, set cookies, and return session payload', async () => {
      userServiceMock.verifyLoginOtp.mockResolvedValue({
        user_data: { id: 'u1' },
        session: { id: 's1' },
        access_token: 'access_123',
        refresh_token: 'refresh_123',
      });

      const dto = { email: 'test@example.com', code: '123456' };
      const response = await controller.handleVerifyLoginOtp(dto, mockReq, mockRes);

      expect(userServiceMock.verifyLoginOtp).toHaveBeenCalledWith({
        verifyLoginOtpDto: dto,
        ip: '127.0.0.1',
        userAgent: 'test-agent',
      });
      expect(mockRes.cookie).toHaveBeenCalledTimes(2);
      expect(response).toEqual({
        session: { id: 's1' },
        user_data: { id: 'u1' },
        access_token: 'access_123',
      });
    });
  });
});
