import { ApiProperty } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  MaxLength,
} from 'class-validator';

export class ScanNutritionDto {
  @ApiProperty({
    example: 'scans/uuid.jpg',
    description:
      'S3 object key hasil dari GET /nutrition/scan-upload-url setelah gambar di-upload.',
  })
  @IsString()
  @IsNotEmpty({ message: 's3Key tidak boleh kosong' })
  s3Key: string;

  @ApiProperty({
    example: 'Pocari Sweat',
    description: 'Nama produk (opsional)',
    required: false,
    maxLength: 200,
  })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  productName?: string;

  @ApiProperty({
    example: 250,
    description:
      'Override ukuran sajian dalam mL. Wajib diisi jika OCR gagal mendeteksi takaran saji.',
    required: false,
    minimum: 1,
  })
  @IsOptional()
  @IsNumber({}, { message: 'servingSizeMl harus berupa angka' })
  @IsPositive({ message: 'servingSizeMl harus lebih dari 0' })
  servingSizeMl?: number;
}
