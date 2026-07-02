import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { S3Service } from './services/s3.service';
import { TextractService } from './services/textract.service';
import { CreateNutritionManualDto } from './dto/create-nutrition-manual.dto';
import {
  NutritionResponseDto,
  LastConsumptionResponseDto,
} from './dto/nutrition-response.dto';
import {
  DashboardSummaryDto,
  WeeklyChartResponseDto,
  DailyPatternResponseDto,
  ScanResultDto,
} from './dto/dashboard.dto';
import { ScanUploadUrlResponseDto } from './dto/scan-upload-url.dto';
import { calculateDailySugarLimit } from '../common/utils/sugar-limit.util';

@Injectable()
export class NutritionService {
  private readonly logger = new Logger(NutritionService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly s3Service: S3Service,
    private readonly textractService: TextractService,
  ) {}

  // ─────────────────────────────────────────────────────────────
  // DYNAMIC DAILY LIMIT
  // ─────────────────────────────────────────────────────────────

  /**
   * Resolve the user's personalized daily added-sugar limit (grams).
   * Falls back to 50g/day when the health profile is incomplete.
   */
  private async getDailyLimit(userId: string): Promise<number> {
    const profile = await this.prisma.healthProfile.findUnique({
      where: { userId },
    });
    return calculateDailySugarLimit(profile);
  }

  // ─────────────────────────────────────────────────────────────
  // MANUAL ENTRY
  // ─────────────────────────────────────────────────────────────

  async createManual(
    userId: string,
    dto: CreateNutritionManualDto,
  ): Promise<NutritionResponseDto> {
    const thresholds = await this.prisma.nutriGradeThreshold.findMany({
      orderBy: { grade: 'asc' },
    });

    const nutriGrade = this.calculateNutriGrade(dto, thresholds);

    this.logger.log(
      `NutriGrade calculated for "${dto.productName}": ${nutriGrade}`,
    );

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

  // ─────────────────────────────────────────────────────────────
  // SCANNING (Pre-signed URL + S3-triggered Textract)
  // ─────────────────────────────────────────────────────────────

  /**
   * Step 1 of scanning: hand the frontend a pre-signed URL so it can upload
   * the label image DIRECTLY to S3 (no image payload through the backend).
   */
  async getUploadUrl(contentType: string): Promise<ScanUploadUrlResponseDto> {
    return this.s3Service.generateUploadUrl(contentType);
  }

  /**
   * Step 2 of scanning: the image is already in S3. Run Textract on it,
   * derive per-100ml sugar concentration, grade it, and log the consumption.
   *
   * Volume policy (see PRD): we assume the user consumed ONE serving
   * (takaran saji). The label's sugar value is per-serving, so we normalize
   * to per-100ml for grading and store the serving size as the consumed volume.
   */
  async scanAndCreate(
    userId: string,
    s3Key: string,
    productName?: string,
    servingSizeOverrideMl?: number,
  ): Promise<ScanResultDto> {
    const extracted = await this.textractService.extractNutritionFromS3(
      this.s3Service.bucket,
      s3Key,
    );

    // Sugar is mandatory — without it there is nothing to grade or track.
    if (extracted.sugarPerServing === null) {
      throw new BadRequestException(
        'Gagal mengekstrak kadar gula dari gambar. Silakan foto ulang lebih jelas atau gunakan input manual.',
      );
    }

    // Serving size resolution: user override wins; else OCR; else reject so we
    // never silently assume a wrong volume and corrupt the streak.
    const servingSizeMl = servingSizeOverrideMl ?? extracted.servingSizeMl;
    if (servingSizeMl == null || servingSizeMl <= 0) {
      throw new BadRequestException(
        'Takaran saji (mL) tidak terdeteksi dari gambar. Silakan masukkan volume secara manual pada field servingSizeMl.',
      );
    }

    // Normalize label per-serving values → per-100ml.
    const factor = 100 / servingSizeMl;
    const sugarPer100ml =
      Math.round(extracted.sugarPerServing * factor * 100) / 100;
    const saltPer100ml =
      Math.round((extracted.saltPerServing ?? 0) * factor * 100) / 100;
    const saturatedFatPer100ml =
      Math.round((extracted.saturatedFatPerServing ?? 0) * factor * 100) / 100;

    const thresholds = await this.prisma.nutriGradeThreshold.findMany({
      orderBy: { grade: 'asc' },
    });

    const nutriGrade = this.calculateNutriGrade({ sugarPer100ml }, thresholds);

    const log = await this.prisma.consumptionLog.create({
      data: {
        userId,
        productName: productName ?? 'Scanned Product',
        servingSizeMl,
        sugarPer100ml,
        saltPer100ml,
        saturatedFatPer100ml,
        nutriGrade,
        scanImageKey: s3Key,
        entryMethod: 'SCAN',
      },
    });

    const scanImageUrl = await this.s3Service.getSignedUrl(s3Key);

    return {
      ...this.mapToResponseDto(log),
      scanImageUrl,
    };
  }

  async findLastConsumption(
    userId: string,
  ): Promise<LastConsumptionResponseDto> {
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

  // ─────────────────────────────────────────────────────────────
  // DASHBOARD + STREAK
  // ─────────────────────────────────────────────────────────────

  async getDashboardSummary(userId: string): Promise<DashboardSummaryDto> {
    const dailyLimit = await this.getDailyLimit(userId);

    const now = new Date();
    const todayStart = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
    );
    const todayEnd = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate() + 1,
    );

    const todayLogs = await this.prisma.consumptionLog.findMany({
      where: {
        userId,
        consumedAt: { gte: todayStart, lt: todayEnd },
      },
    });

    const consumedToday = todayLogs.reduce((sum, log) => {
      return sum + (log.sugarPer100ml * log.servingSizeMl) / 100;
    }, 0);

    const consumedTodayRounded = Math.round(consumedToday * 10) / 10;
    const limitExceeded = consumedTodayRounded > dailyLimit;

    const { currentStreak, longestStreak } = await this.calculateStreak(
      userId,
      todayStart,
      todayLogs.length > 0,
      limitExceeded,
      dailyLimit,
    );

    const lastLog = await this.prisma.consumptionLog.findFirst({
      where: { userId },
      orderBy: { consumedAt: 'desc' },
      select: { consumedAt: true },
    });

    return {
      consumedToday: consumedTodayRounded,
      dailyLimit,
      limitExceeded,
      currentStreak,
      longestStreak,
      lastConsumptionAt: lastLog?.consumedAt ?? null,
    };
  }

  async getWeeklyChart(userId: string): Promise<WeeklyChartResponseDto> {
    const dailyLimit = await this.getDailyLimit(userId);

    const now = new Date();
    const sevenDaysAgo = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate() - 6,
    );

    const logs = await this.prisma.consumptionLog.findMany({
      where: {
        userId,
        consumedAt: { gte: sevenDaysAgo },
      },
      orderBy: { consumedAt: 'asc' },
    });

    const dailyMap = new Map<
      string,
      { totalSugar: number; logCount: number }
    >();

    for (let i = 0; i < 7; i++) {
      const d = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate() - 6 + i,
      );
      const key = d.toISOString().split('T')[0];
      dailyMap.set(key, { totalSugar: 0, logCount: 0 });
    }

    for (const log of logs) {
      const key = log.consumedAt.toISOString().split('T')[0];
      const entry = dailyMap.get(key);
      if (entry) {
        entry.totalSugar += (log.sugarPer100ml * log.servingSizeMl) / 100;
        entry.logCount++;
      }
    }

    const data = Array.from(dailyMap.entries()).map(([date, entry]) => ({
      date,
      totalSugar: Math.round(entry.totalSugar * 10) / 10,
      logCount: entry.logCount,
      exceeded: entry.totalSugar > dailyLimit,
    }));

    return { data, dailyLimit };
  }

  async getDailyPattern(
    userId: string,
    date?: string,
  ): Promise<DailyPatternResponseDto> {
    const targetDate = date ? new Date(date) : new Date();
    const dayStart = new Date(
      targetDate.getFullYear(),
      targetDate.getMonth(),
      targetDate.getDate(),
    );
    const dayEnd = new Date(
      targetDate.getFullYear(),
      targetDate.getMonth(),
      targetDate.getDate() + 1,
    );

    const logs = await this.prisma.consumptionLog.findMany({
      where: {
        userId,
        consumedAt: { gte: dayStart, lt: dayEnd },
      },
    });

    const periods = {
      morning: { totalSugar: 0, logCount: 0, timeRange: '06:00 - 12:00' },
      afternoon: { totalSugar: 0, logCount: 0, timeRange: '12:00 - 18:00' },
      night: { totalSugar: 0, logCount: 0, timeRange: '18:00 - 06:00' },
    };

    for (const log of logs) {
      const hour = log.consumedAt.getHours();
      const sugarAmount = (log.sugarPer100ml * log.servingSizeMl) / 100;

      if (hour >= 6 && hour < 12) {
        periods.morning.totalSugar += sugarAmount;
        periods.morning.logCount++;
      } else if (hour >= 12 && hour < 18) {
        periods.afternoon.totalSugar += sugarAmount;
        periods.afternoon.logCount++;
      } else {
        periods.night.totalSugar += sugarAmount;
        periods.night.logCount++;
      }
    }

    const totalSugar =
      periods.morning.totalSugar +
      periods.afternoon.totalSugar +
      periods.night.totalSugar;

    const data = Object.entries(periods).map(([period, info]) => ({
      period,
      timeRange: info.timeRange,
      totalSugar: Math.round(info.totalSugar * 10) / 10,
      logCount: info.logCount,
      percentage:
        totalSugar > 0
          ? Math.round((info.totalSugar / totalSugar) * 1000) / 10
          : 0,
    }));

    return {
      data,
      date: dayStart.toISOString().split('T')[0],
    };
  }

  /**
   * Current streak: consecutive days (ending today/yesterday) where total
   * sugar stayed at or below the personalized daily limit.
   *
   * Rules (see PRD):
   * - Today counts as +1 only once the user has logged and is still <= limit.
   * - If today has no logs yet, we do NOT break — we show the streak through
   *   yesterday (the empty day only breaks it once midnight passes).
   * - Any past day with logs > limit breaks the streak.
   * - Any past day with zero logs (a gap in the date sequence) breaks it.
   */
  private async calculateStreak(
    userId: string,
    todayStart: Date,
    hasLogsToday: boolean,
    limitExceededToday: boolean,
    dailyLimit: number,
  ): Promise<{ currentStreak: number; longestStreak: number }> {
    const longestStreak = await this.computeLongestStreak(userId, dailyLimit);

    if (hasLogsToday && limitExceededToday) {
      return { currentStreak: 0, longestStreak };
    }

    const pastLogs = await this.prisma.consumptionLog.findMany({
      where: {
        userId,
        consumedAt: { lt: todayStart },
      },
      orderBy: { consumedAt: 'desc' },
    });

    const dailyTotals = new Map<string, number>();
    for (const log of pastLogs) {
      const key = log.consumedAt.toISOString().split('T')[0];
      const current = dailyTotals.get(key) ?? 0;
      dailyTotals.set(
        key,
        current + (log.sugarPer100ml * log.servingSizeMl) / 100,
      );
    }

    let currentStreak = 0;
    const checkDate = new Date(todayStart);

    if (hasLogsToday && !limitExceededToday) {
      currentStreak = 1;
    }

    checkDate.setDate(checkDate.getDate() - 1);

    while (true) {
      const key = checkDate.toISOString().split('T')[0];
      const dayTotal = dailyTotals.get(key);

      if (dayTotal === undefined) {
        break; // empty day → streak broken
      }

      if (dayTotal > dailyLimit) {
        break; // over limit → streak broken
      }

      currentStreak++;
      checkDate.setDate(checkDate.getDate() - 1);
    }

    return {
      currentStreak,
      longestStreak: Math.max(longestStreak, currentStreak),
    };
  }

  private async computeLongestStreak(
    userId: string,
    dailyLimit: number,
  ): Promise<number> {
    const allLogs = await this.prisma.consumptionLog.findMany({
      where: { userId },
      orderBy: { consumedAt: 'asc' },
    });

    if (!allLogs.length) return 0;

    const dailyTotals = new Map<string, number>();
    for (const log of allLogs) {
      const key = log.consumedAt.toISOString().split('T')[0];
      const current = dailyTotals.get(key) ?? 0;
      dailyTotals.set(
        key,
        current + (log.sugarPer100ml * log.servingSizeMl) / 100,
      );
    }

    const sortedDates = Array.from(dailyTotals.keys()).sort();

    let longest = 0;
    let current = 0;

    for (let i = 0; i < sortedDates.length; i++) {
      const dateStr = sortedDates[i];
      const total = dailyTotals.get(dateStr) ?? 0;

      if (total > dailyLimit) {
        current = 0;
        continue;
      }

      if (i === 0) {
        current = 1;
      } else {
        const prevDate = new Date(sortedDates[i - 1]);
        const currDate = new Date(dateStr);
        const diffDays =
          (currDate.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24);

        if (diffDays === 1) {
          current++;
        } else {
          current = 1;
        }
      }

      longest = Math.max(longest, current);
    }

    return longest;
  }

  // ─────────────────────────────────────────────────────────────
  // NUTRIGRADE (sugar-only)
  // ─────────────────────────────────────────────────────────────

  private calculateNutriGrade(
    dto: Pick<CreateNutritionManualDto, 'sugarPer100ml'>,
    thresholds: Array<{
      grade: string;
      maxSugarPer100ml: number;
    }>,
  ): 'A' | 'B' | 'C' | 'D' {
    if (!thresholds.length) {
      return this.fallbackNutriGrade(dto);
    }

    for (const threshold of thresholds) {
      if (dto.sugarPer100ml <= threshold.maxSugarPer100ml) {
        return threshold.grade as 'A' | 'B' | 'C' | 'D';
      }
    }

    return 'D';
  }

  private fallbackNutriGrade(
    dto: Pick<CreateNutritionManualDto, 'sugarPer100ml'>,
  ): 'A' | 'B' | 'C' | 'D' {
    const s = dto.sugarPer100ml;

    if (s <= 1.0) return 'A';
    if (s <= 5.0) return 'B';
    if (s <= 8.0) return 'C';
    return 'D';
  }

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
