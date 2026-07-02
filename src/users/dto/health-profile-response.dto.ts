import { ApiProperty } from '@nestjs/swagger';

export class HealthProfileResponseDto {
  @ApiProperty({ example: 'clxyz123abc456def' })
  id: string;

  @ApiProperty({ example: 25, nullable: true })
  age: number | null;

  @ApiProperty({ example: 65.5, nullable: true })
  weight: number | null;

  @ApiProperty({ example: 170, nullable: true })
  height: number | null;

  @ApiProperty({ example: 'MALE', nullable: true, enum: ['MALE', 'FEMALE'] })
  gender: string | null;

  @ApiProperty({
    example: 'MODERATE',
    nullable: true,
    enum: ['SEDENTARY', 'LIGHT', 'MODERATE', 'ACTIVE'],
    description: 'Tingkat aktivitas fisik',
  })
  activityLevel: string | null;

  @ApiProperty({
    example: 22.6,
    description: 'BMI dihitung otomatis dari berat & tinggi badan',
    nullable: true,
  })
  bmi: number | null;

  @ApiProperty({
    example: 50.2,
    description:
      'Batas gula harian yang dipersonalisasi (gram). Dihitung dari BMR & activity level, ' +
      'atau 50g default jika profil belum lengkap.',
  })
  dailySugarLimit: number;
}
