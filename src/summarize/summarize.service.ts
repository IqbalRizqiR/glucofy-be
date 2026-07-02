import { Injectable, ForbiddenException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SummarizeResponseDto } from './dto/summarize-response.dto';
import { calculateDailySugarLimit } from '../common/utils/sugar-limit.util';

@Injectable()
export class SummarizeService {
  private readonly logger = new Logger(SummarizeService.name);

  constructor(private readonly prisma: PrismaService) {}

  async generateSummary(userId: string): Promise<SummarizeResponseDto> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        healthProfile: true,
        subscription: true,
      },
    });

    if (
      !user?.subscription ||
      user.subscription.status !== 'ACTIVE' ||
      user.subscription.validUntil < new Date()
    ) {
      throw new ForbiddenException(
        'Fitur ini hanya tersedia untuk pengguna premium. Silakan berlangganan.',
      );
    }

    const dailyLimit = calculateDailySugarLimit(user.healthProfile);

    const now = new Date();
    const sevenDaysAgo = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate() - 7,
    );

    const recentLogs = await this.prisma.consumptionLog.findMany({
      where: {
        userId,
        consumedAt: { gte: sevenDaysAgo },
      },
      orderBy: { consumedAt: 'desc' },
    });

    const dailyTotals = new Map<string, number>();
    const periodTotals = { morning: 0, afternoon: 0, night: 0 };

    for (const log of recentLogs) {
      const sugarAmount = (log.sugarPer100ml * log.servingSizeMl) / 100;
      const key = log.consumedAt.toISOString().split('T')[0];
      dailyTotals.set(key, (dailyTotals.get(key) ?? 0) + sugarAmount);

      const hour = log.consumedAt.getHours();
      if (hour >= 6 && hour < 12) periodTotals.morning += sugarAmount;
      else if (hour >= 12 && hour < 18) periodTotals.afternoon += sugarAmount;
      else periodTotals.night += sugarAmount;
    }

    const totalSugar = Array.from(dailyTotals.values()).reduce(
      (a, b) => a + b,
      0,
    );
    const activeDays = dailyTotals.size || 1;
    const avgDailySugar = Math.round((totalSugar / activeDays) * 10) / 10;

    const bmi = user.healthProfile?.bmi ?? null;
    const bmiCategory = bmi ? this.getBmiCategory(bmi) : null;
    const activityLevel = user.healthProfile?.activityLevel ?? null;

    const tips = this.generateTips(
      avgDailySugar,
      dailyLimit,
      periodTotals,
      bmi,
      activityLevel,
      recentLogs.length,
    );

    const recommendation = this.generateRecommendation(
      avgDailySugar,
      dailyLimit,
      periodTotals,
      bmiCategory,
      activityLevel,
      user.healthProfile,
    );

    return {
      recommendation,
      bmi,
      bmiCategory,
      avgDailySugar,
      tips,
    };
  }

  private getBmiCategory(bmi: number): string {
    if (bmi < 18.5) return 'Underweight';
    if (bmi < 25) return 'Normal';
    if (bmi < 30) return 'Overweight';
    return 'Obese';
  }

  private generateTips(
    avgDailySugar: number,
    dailyLimit: number,
    periodTotals: { morning: number; afternoon: number; night: number },
    bmi: number | null,
    activityLevel: string | null,
    logCount: number,
  ): string[] {
    const tips: string[] = [];

    if (avgDailySugar > dailyLimit) {
      tips.push(
        `Rata-rata konsumsi gula Anda ${avgDailySugar}g/hari, melebihi batas personal ${dailyLimit}g. Coba kurangi secara bertahap.`,
      );
    } else {
      tips.push(
        `Rata-rata konsumsi gula Anda ${avgDailySugar}g/hari, di bawah batas personal ${dailyLimit}g. Pertahankan!`,
      );
    }

    const maxPeriod = Object.entries(periodTotals).sort(
      (a, b) => b[1] - a[1],
    )[0];
    if (maxPeriod[1] > 0) {
      const periodNames: Record<string, string> = {
        morning: 'pagi',
        afternoon: 'siang',
        night: 'malam',
      };
      tips.push(
        `Konsumsi gula tertinggi Anda di waktu ${periodNames[maxPeriod[0]]}. Pertimbangkan alternatif yang lebih sehat di jam tersebut.`,
      );
    }

    if (bmi && bmi >= 25) {
      tips.push(
        'BMI Anda menunjukkan berat badan berlebih. Mengurangi asupan gula dapat membantu menurunkannya.',
      );
    }

    if (activityLevel === 'ACTIVE' || activityLevel === 'MODERATE') {
      tips.push(
        `Dengan tingkat aktivitas "${activityLevel}", batas gula Anda lebih tinggi (${dailyLimit}g). Namun tetap prioritaskan sumber karbohidrat kompleks.`,
      );
    }

    if (activityLevel === 'SEDENTARY') {
      tips.push(
        'Tingkat aktivitas Anda rendah. Pertimbangkan meningkatkan aktivitas fisik untuk memperbesar toleransi gula harian.',
      );
    }

    if (logCount < 3) {
      tips.push(
        'Catat lebih banyak konsumsi untuk mendapatkan analisis yang lebih akurat.',
      );
    }

    return tips;
  }

  private generateRecommendation(
    avgDailySugar: number,
    dailyLimit: number,
    periodTotals: { morning: number; afternoon: number; night: number },
    bmiCategory: string | null,
    activityLevel: string | null,
    healthProfile: { age?: number | null; gender?: string | null } | null,
  ): string {
    const parts: string[] = [];

    if (avgDailySugar > dailyLimit) {
      parts.push(
        `Rata-rata konsumsi gula harian Anda (${avgDailySugar}g) melebihi batas personal Anda (${dailyLimit}g).`,
      );
    } else {
      parts.push(
        `Selamat! Rata-rata konsumsi gula harian Anda (${avgDailySugar}g) sudah di bawah batas personal ${dailyLimit}g.`,
      );
    }

    if (periodTotals.night > periodTotals.morning + periodTotals.afternoon) {
      parts.push(
        'Pola konsumsi menunjukkan lonjakan signifikan di malam hari. ' +
          'Disarankan mengganti minuman manis dengan air putih atau teh tanpa gula setelah jam 6 sore.',
      );
    }

    if (bmiCategory === 'Overweight' || bmiCategory === 'Obese') {
      parts.push(
        `Dengan status BMI "${bmiCategory}", mengurangi asupan gula secara konsisten ` +
          'dapat berkontribusi pada penurunan berat badan yang sehat.',
      );
    }

    if (activityLevel === 'ACTIVE') {
      parts.push(
        'Karena Anda sangat aktif, tubuh Anda memerlukan lebih banyak energi. ' +
          'Namun pastikan sumber gula berasal dari makanan sehat, bukan hanya minuman kemasan.',
      );
    }

    if (healthProfile?.age && healthProfile.age > 40) {
      parts.push(
        'Pada usia di atas 40, risiko diabetes tipe 2 meningkat. ' +
          'Menjaga asupan gula tetap rendah sangat penting.',
      );
    }

    return parts.join(' ');
  }
}
