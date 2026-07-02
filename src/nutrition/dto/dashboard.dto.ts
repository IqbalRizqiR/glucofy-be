import { ApiProperty } from '@nestjs/swagger';
import { NutritionResponseDto } from './nutrition-response.dto';

export class DashboardSummaryDto {
  @ApiProperty({
    example: 18.5,
    description: 'Total gula yang dikonsumsi hari ini (gram)',
  })
  consumedToday: number;

  @ApiProperty({
    example: 25,
    description: 'Batas harian gula (gram)',
  })
  dailyLimit: number;

  @ApiProperty({
    example: false,
    description: 'Apakah batas harian sudah terlampaui',
  })
  limitExceeded: boolean;

  @ApiProperty({
    example: 5,
    description: 'Streak berturut-turut (hari di bawah batas)',
  })
  currentStreak: number;

  @ApiProperty({
    example: 12,
    description: 'Streak terpanjang sepanjang waktu',
  })
  longestStreak: number;

  @ApiProperty({
    example: '2024-01-15T08:30:00.000Z',
    description: 'Waktu konsumsi terakhir (null jika belum ada)',
    nullable: true,
  })
  lastConsumptionAt: Date | null;
}

export class WeeklyChartItemDto {
  @ApiProperty({ example: '2024-01-15', description: 'Tanggal (YYYY-MM-DD)' })
  date: string;

  @ApiProperty({ example: 22.5, description: 'Total gula hari itu (gram)' })
  totalSugar: number;

  @ApiProperty({ example: 3, description: 'Jumlah log konsumsi' })
  logCount: number;

  @ApiProperty({
    example: false,
    description: 'Apakah melebihi batas harian',
  })
  exceeded: boolean;
}

export class WeeklyChartResponseDto {
  @ApiProperty({
    type: [WeeklyChartItemDto],
    description: 'Data konsumsi gula 7 hari terakhir',
  })
  data: WeeklyChartItemDto[];

  @ApiProperty({ example: 25, description: 'Batas harian gula (gram)' })
  dailyLimit: number;
}

export class DailyPatternItemDto {
  @ApiProperty({
    example: 'morning',
    description: 'Periode waktu',
    enum: ['morning', 'afternoon', 'night'],
  })
  period: string;

  @ApiProperty({
    example: '06:00 - 12:00',
    description: 'Rentang waktu',
  })
  timeRange: string;

  @ApiProperty({ example: 8.5, description: 'Total gula periode ini (gram)' })
  totalSugar: number;

  @ApiProperty({ example: 2, description: 'Jumlah log konsumsi' })
  logCount: number;

  @ApiProperty({
    example: 38.5,
    description: 'Persentase dari total konsumsi harian',
  })
  percentage: number;
}

export class DailyPatternResponseDto {
  @ApiProperty({
    type: [DailyPatternItemDto],
    description: 'Breakdown konsumsi berdasarkan waktu',
  })
  data: DailyPatternItemDto[];

  @ApiProperty({
    example: '2024-01-15',
    description: 'Tanggal yang dianalisis (YYYY-MM-DD)',
  })
  date: string;
}

export class ScanResultDto extends NutritionResponseDto {
  @ApiProperty({
    example: 'https://glucofy-scans.s3.amazonaws.com/scans/abc123.jpg',
    description: 'URL gambar yang di-upload ke S3',
    nullable: true,
  })
  scanImageUrl: string | null;
}
