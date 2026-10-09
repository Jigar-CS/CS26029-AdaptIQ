import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger('PrismaService');

  constructor() {
    super({
      datasources: {
        db: {
          url: process.env.DATABASE_URL,
        },
      },
      // Connection pool settings to reduce latency
      log:
        process.env.NODE_ENV === 'development'
          ? [{ emit: 'event', level: 'error' }]
          : [{ emit: 'event', level: 'error' }],
    });
  }

  async onModuleInit() {
    let retries = 5;
    while (retries > 0) {
      try {
        await this.$connect();
        this.logger.log('✅ Prisma connected to database');
        return;
      } catch (err: any) {
        retries--;
        this.logger.warn(`DB connection failed (${retries} retries left): ${err.message}`);
        if (retries === 0) throw err;
        await new Promise((r) => setTimeout(r, 2000));
      }
    }
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
