import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsInt, IsNumber, IsOptional, Max, Min } from 'class-validator';

export class UpdateHealthProfileDto {
  @ApiProperty({
    example: 25,
    description: 'Usia pengguna (tahun)',
    required: false,
    minimum: 1,
    maximum: 150,
  })
  @IsOptional()
  @IsInt({ message: 'Usia harus berupa bilangan bulat' })
  @Min(1, { message: 'Usia minimal 1 tahun' })
  @Max(150, { message: 'Usia maksimal 150 tahun' })
  age?: number;

  @ApiProperty({
    example: 65.5,
    description: 'Berat badan (kg)',
    required: false,
    minimum: 1,
  })
  @IsOptional()
  @IsNumber({}, { message: 'Berat badan harus berupa angka' })
  @Min(1, { message: 'Berat badan minimal 1 kg' })
  weight?: number;

  @ApiProperty({
    example: 170,
    description: 'Tinggi badan (cm)',
    required: false,
    minimum: 30,
  })
  @IsOptional()
  @IsNumber({}, { message: 'Tinggi badan harus berupa angka' })
  @Min(30, { message: 'Tinggi badan minimal 30 cm' })
  height?: number;

  @ApiProperty({
    example: 'MALE',
    description: 'Jenis kelamin',
    required: false,
    enum: ['MALE', 'FEMALE'],
  })
  @IsOptional()
  @IsEnum(['MALE', 'FEMALE'], { message: 'Gender harus MALE atau FEMALE' })
  gender?: 'MALE' | 'FEMALE';

  @ApiProperty({
    example: 'MODERATE',
    description:
      'Tingkat aktivitas fisik. Digunakan untuk menghitung batas gula harian ' +
      'yang dipersonalisasi (SEDENTARY = jarang olahraga, ACTIVE = sangat aktif).',
    required: false,
    enum: ['SEDENTARY', 'LIGHT', 'MODERATE', 'ACTIVE'],
  })
  @IsOptional()
  @IsEnum(['SEDENTARY', 'LIGHT', 'MODERATE', 'ACTIVE'], {
    message: 'activityLevel harus SEDENTARY, LIGHT, MODERATE, atau ACTIVE',
  })
  activityLevel?: 'SEDENTARY' | 'LIGHT' | 'MODERATE' | 'ACTIVE';
}
