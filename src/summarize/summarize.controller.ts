import { Controller, Post, UseGuards } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiOkResponse,
  ApiBearerAuth,
  ApiUnauthorizedResponse,
  ApiForbiddenResponse,
} from '@nestjs/swagger';
import { SummarizeService } from './summarize.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { User, type RequestUser } from '../common/decorators/user.decorator';
import { SummarizeResponseDto } from './dto/summarize-response.dto';
import { ErrorResponseDto } from '../common/dto/error-response.dto';

@ApiTags('Summarize')
@Controller('summarize')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class SummarizeController {
  constructor(private readonly summarizeService: SummarizeService) {}

  @Post()
  @ApiOperation({
    summary: 'Dapatkan rekomendasi AI (Premium)',
    description:
      'Menghasilkan rekomendasi kesehatan berbasis AI berdasarkan ' +
      'profil kesehatan, pola konsumsi, dan data BMI pengguna. ' +
      'Fitur ini hanya tersedia untuk pengguna premium.',
  })
  @ApiOkResponse({
    description: 'Rekomendasi AI berhasil dihasilkan',
    type: SummarizeResponseDto,
  })
  @ApiForbiddenResponse({
    description: 'Pengguna tidak memiliki langganan premium aktif',
    type: ErrorResponseDto,
  })
  @ApiUnauthorizedResponse({
    description: 'Token tidak valid atau sudah expired',
    type: ErrorResponseDto,
  })
  async summarize(@User() user: RequestUser): Promise<SummarizeResponseDto> {
    return this.summarizeService.generateSummary(user.id);
  }
}
