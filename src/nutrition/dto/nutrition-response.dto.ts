import { ApiProperty } from '@nestjs/swagger';

export class NutritionResponseDto {
  @ApiProperty({
    example: 'clxyz123abc456def',
    description: 'Unique consumption log ID (cuid)',
  })
  id: string;

  @ApiProperty({
    example: 'Teh Botol Sosro',
    description: 'Nama produk',
  })
  productName: string;

  @ApiProperty({
    example: 'C',
    description: 'NutriGrade hasil kalkulasi (A = terbaik, D = terburuk)',
    enum: ['A', 'B', 'C', 'D'],
  })
  nutriGrade: string;

  @ApiProperty({
    example: 250,
    description: 'Ukuran sajian dalam mL',
  })
  servingSizeMl: number;

  @ApiProperty({
    example: 12,
    description: 'Kadar gula per 100 mL (gram)',
  })
  sugarPer100ml: number;

  @ApiProperty({
    example: 0.1,
    description: 'Kadar garam per 100 mL (gram)',
  })
  saltPer100ml: number;

  @ApiProperty({
    example: 0.3,
    description: 'Kadar lemak jenuh per 100 mL (gram)',
  })
  saturatedFatPer100ml: number;

  @ApiProperty({
    example: 'MANUAL',
    description: 'Metode input',
    enum: ['MANUAL', 'SCAN'],
  })
  entryMethod: string;

  @ApiProperty({
    example: '2024-01-15T08:30:00.000Z',
    description: 'Waktu konsumsi dicatat',
  })
  consumedAt: Date;
}

/**
 * Response wrapper for last-consumption endpoint
 */
export class LastConsumptionResponseDto {
  @ApiProperty({
    description: 'List konsumsi terbaru (maksimum 10)',
    type: [NutritionResponseDto],
  })
  data: NutritionResponseDto[];

  @ApiProperty({
    example: 3,
    description: 'Jumlah data yang dikembalikan',
  })
  count: number;
}
