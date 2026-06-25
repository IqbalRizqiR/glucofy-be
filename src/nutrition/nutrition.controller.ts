import { Controller, Post, Get, Body, UseGuards } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiBearerAuth,
  ApiUnauthorizedResponse,
  ApiBadRequestResponse,
} from '@nestjs/swagger';
import { NutritionService } from './nutrition.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { User, type RequestUser } from '../common/decorators/user.decorator';
import { CreateNutritionManualDto } from './dto/create-nutrition-manual.dto';
import {
  NutritionResponseDto,
  LastConsumptionResponseDto,
} from './dto/nutrition-response.dto';
import { ErrorResponseDto } from '../common/dto/error-response.dto';

@ApiTags('Nutrition')
@Controller('nutrition')
@UseGuards(JwtAuthGuard) // All nutrition routes require authentication
@ApiBearerAuth('JWT-auth')
export class NutritionController {
  constructor(private readonly nutritionService: NutritionService) {}

  @Post('manual')
  @ApiOperation({
    summary: 'Catat konsumsi makanan/minuman secara manual',
    description:
      'Input data nutrisi produk secara manual. ' +
      'Sistem akan menghitung NutriGrade (A-D) berdasarkan kadar ' +
      'gula, garam, dan lemak jenuh per 100 mL.',
  })
  @ApiCreatedResponse({
    description: 'Log konsumsi berhasil dibuat dengan NutriGrade terhitung',
    type: NutritionResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'Validasi input gagal',
    type: ErrorResponseDto,
  })
  @ApiUnauthorizedResponse({
    description: 'Token tidak valid atau sudah expired',
    type: ErrorResponseDto,
  })
  async createManual(
    @User() user: RequestUser,
    @Body() dto: CreateNutritionManualDto,
  ): Promise<NutritionResponseDto> {
    return this.nutritionService.createManual(user.id, dto);
  }

  @Get('last-consumption')
  @ApiOperation({
    summary: 'Ambil 10 riwayat konsumsi terakhir',
    description:
      'Mengembalikan 10 log konsumsi terakhir dari pengguna yang sedang login. ' +
      'Diurutkan dari yang paling baru.',
  })
  @ApiOkResponse({
    description: 'Riwayat konsumsi berhasil diambil',
    type: LastConsumptionResponseDto,
  })
  @ApiUnauthorizedResponse({
    description: 'Token tidak valid atau sudah expired',
    type: ErrorResponseDto,
  })
  async getLastConsumption(
    @User() user: RequestUser,
  ): Promise<LastConsumptionResponseDto> {
    return this.nutritionService.findLastConsumption(user.id);
  }
}
