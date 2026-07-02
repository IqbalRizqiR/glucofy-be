import { Module } from '@nestjs/common';
import { NutritionController } from './nutrition.controller';
import { NutritionService } from './nutrition.service';
import { S3Service } from './services/s3.service';
import { TextractService } from './services/textract.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [NutritionController],
  providers: [NutritionService, S3Service, TextractService],
})
export class NutritionModule {}
