import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { NutritionModule } from './nutrition/nutrition.module';

@Module({
  imports: [
    // Global config — loads .env automatically, available everywhere via ConfigService
    ConfigModule.forRoot({
      isGlobal: true,
    }),

    // Core modules
    PrismaModule,

    // Feature modules
    AuthModule,
    UsersModule,
    NutritionModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
