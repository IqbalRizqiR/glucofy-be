import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateNutritionManualDto } from './dto/create-nutrition-manual.dto';
import {
  NutritionResponseDto,
  LastConsumptionResponseDto,
} from './dto/nutrition-response.dto';

@Injectable()
export class NutritionService {
  private readonly logger = new Logger(NutritionService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Create a manual nutrition log entry.
   *
   * NutriGrade Calculation:
   * 1. Load grade thresholds from DB (NutriGradeThreshold table)
   * 2. Check which grade the product falls into (A → D)
   * 3. A product gets the worst grade where ANY of its values exceed the threshold
   * 4. Fallback to D if all thresholds exceeded
   */
  async createManual(
    userId: string,
    dto: CreateNutritionManualDto,
  ): Promise<NutritionResponseDto> {
    // 1. Load thresholds from DB (sorted A → D)
    const thresholds = await this.prisma.nutriGradeThreshold.findMany({
      orderBy: { grade: 'asc' }, // A, B, C, D
    });

    // 2. Calculate NutriGrade
    const nutriGrade = this.calculateNutriGrade(dto, thresholds);

    this.logger.log(
      `NutriGrade calculated for "${dto.productName}": ${nutriGrade}`,
    );

    // 3. Save to DB
    const log = await this.prisma.consumptionLog.create({
      data: {
        userId,
        productName: dto.productName,
        servingSizeMl: dto.servingSizeMl,
        sugarPer100ml: dto.sugarPer100ml,
        saltPer100ml: dto.saltPer100ml,
        saturatedFatPer100ml: dto.saturatedFatPer100ml,
        nutriGrade,
        entryMethod: 'MANUAL',
      },
    });

    return this.mapToResponseDto(log);
  }

  /**
   * Get the last 10 consumption logs for the authenticated user.
   * Ordered by consumedAt DESC (most recent first).
   */
  async findLastConsumption(userId: string): Promise<LastConsumptionResponseDto> {
    const logs = await this.prisma.consumptionLog.findMany({
      where: { userId },
      orderBy: { consumedAt: 'desc' },
      take: 10,
    });

    return {
      data: logs.map((log) => this.mapToResponseDto(log)),
      count: logs.length,
    };
  }

  /**
   * Calculate NutriGrade based on nutritional values and thresholds.
   *
   * Rules (following Singapore Nutri-Grade system):
   * - Grade is determined by the WORST performing nutrient
   * - We iterate from best grade (A) to worst (D)
   * - First grade where ALL thresholds are satisfied = the product's grade
   * - If no grade matches, fall back to 'D'
   */
  private calculateNutriGrade(
    dto: Pick<
      CreateNutritionManualDto,
      'sugarPer100ml' | 'saltPer100ml' | 'saturatedFatPer100ml'
    >,
    thresholds: Array<{
      grade: string;
      maxSugarPer100ml: number;
      maxSaltPer100ml: number;
      maxSaturatedFatPer100ml: number;
    }>,
  ): 'A' | 'B' | 'C' | 'D' {
    // If no thresholds in DB (e.g. seed not run), use hardcoded fallback
    if (!thresholds.length) {
      return this.fallbackNutriGrade(dto);
    }

    for (const threshold of thresholds) {
      const fitsGrade =
        dto.sugarPer100ml <= threshold.maxSugarPer100ml &&
        dto.saltPer100ml <= threshold.maxSaltPer100ml &&
        dto.saturatedFatPer100ml <= threshold.maxSaturatedFatPer100ml;

      if (fitsGrade) {
        return threshold.grade as 'A' | 'B' | 'C' | 'D';
      }
    }

    // Exceeds all thresholds → D
    return 'D';
  }

  /**
   * Fallback NutriGrade calculation using hardcoded values.
   * Used when NutriGradeThreshold table is empty.
   *
   * Based on Singapore Nutri-Grade thresholds (per 100ml):
   * A: sugar ≤5g,  salt ≤0.3g,  fat ≤1.1g
   * B: sugar ≤8g,  salt ≤0.6g,  fat ≤2.8g
   * C: sugar ≤11.5g, salt ≤1.0g, fat ≤4.7g
   * D: above C
   */
  private fallbackNutriGrade(
    dto: Pick<
      CreateNutritionManualDto,
      'sugarPer100ml' | 'saltPer100ml' | 'saturatedFatPer100ml'
    >,
  ): 'A' | 'B' | 'C' | 'D' {
    const { sugarPer100ml: s, saltPer100ml: sa, saturatedFatPer100ml: f } = dto;

    if (s <= 5 && sa <= 0.3 && f <= 1.1) return 'A';
    if (s <= 8 && sa <= 0.6 && f <= 2.8) return 'B';
    if (s <= 11.5 && sa <= 1.0 && f <= 4.7) return 'C';
    return 'D';
  }

  /**
   * Map Prisma ConsumptionLog record to NutritionResponseDto.
   */
  private mapToResponseDto(log: {
    id: string;
    productName: string;
    nutriGrade: string;
    servingSizeMl: number;
    sugarPer100ml: number;
    saltPer100ml: number;
    saturatedFatPer100ml: number;
    entryMethod: string;
    consumedAt: Date;
  }): NutritionResponseDto {
    return {
      id: log.id,
      productName: log.productName,
      nutriGrade: log.nutriGrade,
      servingSizeMl: log.servingSizeMl,
      sugarPer100ml: log.sugarPer100ml,
      saltPer100ml: log.saltPer100ml,
      saturatedFatPer100ml: log.saturatedFatPer100ml,
      entryMethod: log.entryMethod,
      consumedAt: log.consumedAt,
    };
  }
}
