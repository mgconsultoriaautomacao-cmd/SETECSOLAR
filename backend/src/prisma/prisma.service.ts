import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  async onModuleInit() {
    try {
      await this.$connect();
      console.log('Prisma connected to the database successfully.');
    } catch (error) {
      console.warn('Warning: Database connection failed. Verify DATABASE_URL in .env.', error.message);
    }
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
