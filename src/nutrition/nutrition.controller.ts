import { Controller, Post, Get, Body, Query, UseGuards } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiBearerAuth,
  ApiUnauthorizedResponse,
  ApiBadRequestResponse,
  ApiQuery,
} from '@nestjs/swagger';
import { NutritionService } from './nutrition.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { User, type RequestUser } from '../common/decorators/user.decorator';
import { CreateNutritionManualDto } from './dto/create-nutrition-manual.dto';
import { ScanNutritionDto } from './dto/scan-nutrition.dto';
import {
  ScanUploadUrlQueryDto,
  ScanUploadUrlResponseDto,
} from './dto/scan-upload-url.dto';
import {
  NutritionResponseDto,
  LastConsumptionResponseDto,
} from './dto/nutrition-response.dto';
import {
  DashboardSummaryDto,
  WeeklyChartResponseDto,
  DailyPatternResponseDto,
  ScanResultDto,
} from './dto/dashboard.dto';
import { ErrorResponseDto } from '../common/dto/error-response.dto';

@ApiTags('Nutrition')
@Controller('nutrition')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class NutritionController {
  constructor(private readonly nutritionService: NutritionService) {}

  @Get('scan-upload-url')
  @ApiOperation({
    summary: 'Dapatkan pre-signed URL untuk upload gambar ke S3',
    description:
      'Langkah 1 dari scan. Frontend memanggil ini untuk mendapatkan URL S3 sementara, ' +
      'lalu meng-upload gambar label LANGSUNG ke S3 via PUT (tanpa membebani backend). ' +
      'Setelah upload selesai, kirim s3Key ke POST /nutrition/scan.',
  })
  @ApiOkResponse({
    description: 'Pre-signed URL berhasil dibuat',
    type: ScanUploadUrlResponseDto,
  })
  @ApiUnauthorizedResponse({
    description: 'Token tidak valid atau sudah expired',
    type: ErrorResponseDto,
  })
  async getScanUploadUrl(
    @Query() query: ScanUploadUrlQueryDto,
  ): Promise<ScanUploadUrlResponseDto> {
    return this.nutritionService.getUploadUrl(
      query.contentType ?? 'image/jpeg',
    );
  }

  @Post('scan')
  @ApiOperation({
    summary: 'Proses scan label nutrisi (OCR via Textract)',
    description:
      'Langkah 2 dari scan. Gambar sudah ada di S3 (dari upload pre-signed URL). ' +
      'Sistem menjalankan AWS Textract pada objek S3, mengekstrak gula & takaran saji, ' +
      'menghitung NutriGrade (berdasarkan gula per 100mL), lalu menyimpan log konsumsi. ' +
      'Jika takaran saji tidak terdeteksi, wajib mengisi servingSizeMl.',
  })
  @ApiCreatedResponse({
    description: 'Scan berhasil — log konsumsi dibuat dengan NutriGrade',
    type: ScanResultDto,
  })
  @ApiBadRequestResponse({
    description:
      'Gula tidak terdeteksi, atau takaran saji tidak terdeteksi dan tidak disediakan manual',
    type: ErrorResponseDto,
  })
  @ApiUnauthorizedResponse({
    description: 'Token tidak valid atau sudah expired',
    type: ErrorResponseDto,
  })
  async scan(
    @User() user: RequestUser,
    @Body() dto: ScanNutritionDto,
  ): Promise<ScanResultDto> {
    return this.nutritionService.scanAndCreate(
      user.id,
      dto.s3Key,
      dto.productName,
      dto.servingSizeMl,
    );
  }

  @Post('manual')
  @ApiOperation({
    summary: 'Catat konsumsi makanan/minuman secara manual',
    description:
      'Input data nutrisi produk secara manual. ' +
      'Sistem akan menghitung NutriGrade (A-D) berdasarkan kadar gula per 100 mL.',
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

  @Get('dashboard-summary')
  @ApiOperation({
    summary: 'Dapatkan ringkasan dashboard harian',
    description:
      'Mengembalikan total konsumsi gula hari ini, status streak, ' +
      'dan batas harian yang DIPERSONALISASI (berdasarkan BMR & activity level, ' +
      'atau 50g default). Streak dihitung berdasarkan hari berturut-turut ' +
      'di bawah batas harian.',
  })
  @ApiOkResponse({
    description: 'Dashboard summary berhasil diambil',
    type: DashboardSummaryDto,
  })
  @ApiUnauthorizedResponse({
    description: 'Token tidak valid atau sudah expired',
    type: ErrorResponseDto,
  })
  async getDashboardSummary(
    @User() user: RequestUser,
  ): Promise<DashboardSummaryDto> {
    return this.nutritionService.getDashboardSummary(user.id);
  }

  @Get('charts/weekly')
  @ApiOperation({
    summary: 'Data chart konsumsi gula mingguan',
    description:
      'Mengembalikan data konsumsi gula 7 hari terakhir, dikelompokkan per hari, ' +
      'dibandingkan dengan batas harian yang dipersonalisasi.',
  })
  @ApiOkResponse({
    description: 'Data chart mingguan berhasil diambil',
    type: WeeklyChartResponseDto,
  })
  @ApiUnauthorizedResponse({
    description: 'Token tidak valid atau sudah expired',
    type: ErrorResponseDto,
  })
  async getWeeklyChart(
    @User() user: RequestUser,
  ): Promise<WeeklyChartResponseDto> {
    return this.nutritionService.getWeeklyChart(user.id);
  }

  @Get('daily-pattern')
  @ApiOperation({
    summary: 'Pola konsumsi berdasarkan waktu (pagi/siang/malam)',
    description:
      'Breakdown konsumsi gula berdasarkan periode waktu: ' +
      'Morning (06:00-12:00), Afternoon (12:00-18:00), Night (18:00-06:00).',
  })
  @ApiQuery({
    name: 'date',
    required: false,
    description: 'Tanggal yang dianalisis (YYYY-MM-DD), default: hari ini',
    example: '2024-01-15',
  })
  @ApiOkResponse({
    description: 'Pola harian berhasil diambil',
    type: DailyPatternResponseDto,
  })
  @ApiUnauthorizedResponse({
    description: 'Token tidak valid atau sudah expired',
    type: ErrorResponseDto,
  })
  async getDailyPattern(
    @User() user: RequestUser,
    @Query('date') date?: string,
  ): Promise<DailyPatternResponseDto> {
    return this.nutritionService.getDailyPattern(user.id, date);
  }
}
