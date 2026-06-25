import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';

/**
 * PrismaModule — Global database module
 *
 * Marked as @Global() so PrismaService is available everywhere
 * without needing to import PrismaModule in each feature module.
 *
 * Usage in any service:
 *   constructor(private readonly prisma: PrismaService) {}
 *   // then: this.prisma.user.findMany(), this.prisma.consumptionLog.create(), etc.
 */
@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
