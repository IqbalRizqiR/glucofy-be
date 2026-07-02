import { ApiProperty } from '@nestjs/swagger';

export class SummarizeResponseDto {
  @ApiProperty({
    example:
      'Berdasarkan data Anda, konsumsi gula Anda meningkat di malam hari. ' +
      'Disarankan mengganti minuman manis dengan air putih setelah jam 8 malam.',
    description: 'Rekomendasi kesehatan yang dihasilkan AI',
  })
  recommendation: string;

  @ApiProperty({
    example: 22.6,
    description: 'BMI pengguna saat ini',
    nullable: true,
  })
  bmi: number | null;

  @ApiProperty({
    example: 'Normal',
    description: 'Kategori BMI',
    nullable: true,
    enum: ['Underweight', 'Normal', 'Overweight', 'Obese'],
  })
  bmiCategory: string | null;

  @ApiProperty({
    example: 18.5,
    description: 'Rata-rata konsumsi gula harian (7 hari terakhir)',
  })
  avgDailySugar: number;

  @ApiProperty({
    example: [
      'Kurangi konsumsi gula di malam hari',
      'Tingkatkan streak harian',
    ],
    description: 'Tips singkat dari AI',
  })
  tips: string[];
}
