import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../../generated/prisma/client';

@Injectable()
export class PrismaService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);
  private readonly adapter: PrismaPg;
  private readonly prisma: InstanceType<typeof PrismaClient>;

  constructor() {
    this.adapter = new PrismaPg({
      connectionString: process.env.DATABASE_URL,
      // Set connection timeout to prevent indefinite hangs on unavailable database
      // Prisma v7 defaults to 0 (no timeout), which can cause startup hangs
      connectionTimeoutMillis: 5000,
    });
    this.prisma = new PrismaClient({ adapter: this.adapter });
  }

  get client(): InstanceType<typeof PrismaClient> {
    return this.prisma;
  }

  async onModuleInit() {
    try {
      await this.prisma.$connect();
      this.logger.log('Database connected successfully');
    } catch (error) {
      this.logger.error('Failed to connect to database', error);
      throw error;
    }
  }

  async onModuleDestroy() {
    await this.prisma.$disconnect();
  }
}
