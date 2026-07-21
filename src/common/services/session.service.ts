import { PrismaService } from 'src/prisma/prisma.service';
import DeviceDetector from 'device-detector-js';
import { Injectable } from '@nestjs/common';

type createSessionT = {
  ip: string;
  userAgent: string;
  userId: string;
};


@Injectable()
export class SessionService {
  private readonly detector = new DeviceDetector();

  constructor(private readonly prisma: PrismaService) {}

  createSession({ ip, userAgent, userId }: createSessionT) {
    const parsed = this.detector.parse(userAgent);

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    return this.prisma.client.session.create({
      data: {
        ipAddress: ip,
        userId: userId,
        userAgent,
        expiresAt,
      },
    });
  }
}
