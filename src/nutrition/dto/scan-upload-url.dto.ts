import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsOptional } from 'class-validator';

export class ScanUploadUrlQueryDto {
  @ApiProperty({
    example: 'image/jpeg',
    description: 'MIME type gambar yang akan di-upload',
    required: false,
    enum: ['image/jpeg', 'image/png'],
    default: 'image/jpeg',
  })
  @IsOptional()
  @IsEnum(['image/jpeg', 'image/png'], {
    message: 'contentType harus image/jpeg atau image/png',
  })
  contentType?: 'image/jpeg' | 'image/png';
}

export class ScanUploadUrlResponseDto {
  @ApiProperty({
    example:
      'https://glucofy-scans.s3.ap-southeast-1.amazonaws.com/scans/uuid.jpg?X-Amz-Signature=...',
    description:
      'Pre-signed URL untuk PUT gambar langsung ke S3 (berlaku 5 menit)',
  })
  uploadUrl: string;

  @ApiProperty({
    example: 'scans/uuid.jpg',
    description:
      'S3 object key. Kirim ini ke POST /nutrition/scan setelah upload selesai.',
  })
  s3Key: string;
}
