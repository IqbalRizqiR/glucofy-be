import { ApiProperty } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsNumber,
  IsPositive,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateNutritionManualDto {
  @ApiProperty({
    example: 'Teh Botol Sosro',
    description: 'Nama produk makanan/minuman',
    maxLength: 200,
  })
  @IsString()
  @IsNotEmpty({ message: 'Nama produk tidak boleh kosong' })
  @MaxLength(200)
  productName: string;

  @ApiProperty({
    example: 250,
    description: 'Ukuran sajian dalam mililiter (mL)',
    minimum: 1,
  })
  @IsNumber()
  @IsPositive({ message: 'Serving size harus lebih dari 0' })
  servingSizeMl: number;

  @ApiProperty({
    example: 12,
    description: 'Kandungan gula per 100 mL (gram)',
    minimum: 0,
  })
  @IsNumber()
  @Min(0, { message: 'Kadar gula tidak boleh negatif' })
  sugarPer100ml: number;

  @ApiProperty({
    example: 0.1,
    description: 'Kandungan garam (natrium) per 100 mL (gram)',
    minimum: 0,
  })
  @IsNumber()
  @Min(0, { message: 'Kadar garam tidak boleh negatif' })
  saltPer100ml: number;

  @ApiProperty({
    example: 0.3,
    description: 'Kandungan lemak jenuh per 100 mL (gram)',
    minimum: 0,
  })
  @IsNumber()
  @Min(0, { message: 'Kadar lemak jenuh tidak boleh negatif' })
  saturatedFatPer100ml: number;
}
