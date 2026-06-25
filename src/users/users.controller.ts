import { Controller, Get, UseGuards } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiOkResponse,
  ApiBearerAuth,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { User, type RequestUser } from '../common/decorators/user.decorator';
import { UserProfileResponseDto } from './dto/user-profile-response.dto';
import { ErrorResponseDto } from '../common/dto/error-response.dto';

@ApiTags('Users')
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Dapatkan profil pengguna saat ini',
    description:
      'Mengembalikan data profil dari pengguna yang sedang login. ' +
      'Memerlukan JWT token di header Authorization.',
  })
  @ApiOkResponse({
    description: 'Profil pengguna berhasil diambil',
    type: UserProfileResponseDto,
  })
  @ApiUnauthorizedResponse({
    description: 'Token tidak valid atau sudah expired',
    type: ErrorResponseDto,
  })
  async getMe(@User() user: RequestUser): Promise<UserProfileResponseDto> {
    return this.usersService.findMe(user.id);
  }
}
