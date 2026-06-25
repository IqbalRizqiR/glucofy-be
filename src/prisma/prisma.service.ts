import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClient } from '../../generated/prisma';
import { PrismaPg } from '@prisma/adapter-pg';

/**
 * PrismaService — NestJS-injectable database service
 *
 * Architecture (Prisma v7 + Supabase):
 * ─────────────────────────────────────
 * - Uses @prisma/adapter-pg driver adapter with DATABASE_URL (pooled via PgBouncer)
 * - Migrations use DIRECT_URL configured in prisma.config.ts (bypasses PgBouncer)
 * - Extends PrismaClient so all models (user, consumptionLog, etc.) are directly accessible
 */
@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(PrismaService.name);

  constructor() {
    // Use the pg driver adapter with the pooled DATABASE_URL
    // This routes all runtime queries through Supabase's PgBouncer
    const adapter = new PrismaPg({
      connectionString: process.env.DATABASE_URL,
    });

    super({ adapter });
  }

  async onModuleInit() {
    this.logger.log('Connecting to database via PgBouncer pooler...');
    await this.$connect();
    this.logger.log('Database connection established.');
  }

  async onModuleDestroy() {
    this.logger.log('Disconnecting from database...');
    await this.$disconnect();
  }
}
