import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiConflictResponse,
  ApiUnauthorizedResponse,
  ApiBadRequestResponse,
} from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { AuthResponseDto } from './dto/auth-response.dto';
import { ErrorResponseDto } from '../common/dto/error-response.dto';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @ApiOperation({
    summary: 'Register akun baru',
    description:
      'Daftarkan akun pengguna baru. Email harus unik. ' +
      'Setelah berhasil, token JWT langsung dikembalikan.',
  })
  @ApiCreatedResponse({
    description: 'Akun berhasil didaftarkan — token JWT dikembalikan',
    type: AuthResponseDto,
  })
  @ApiBadRequestResponse({
    description:
      'Validasi gagal (email tidak valid, password terlalu pendek, dsb)',
    type: ErrorResponseDto,
  })
  @ApiConflictResponse({
    description: 'Email sudah terdaftar',
    type: ErrorResponseDto,
  })
  async register(@Body() dto: RegisterDto): Promise<AuthResponseDto> {
    return this.authService.register(dto);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Login dengan email & password',
    description:
      'Autentikasi pengguna dan dapatkan JWT token. ' +
      'Gunakan token ini di header `Authorization: Bearer <token>`.',
  })
  @ApiOkResponse({
    description: 'Login berhasil — token JWT dikembalikan',
    type: AuthResponseDto,
  })
  @ApiUnauthorizedResponse({
    description: 'Email atau password salah',
    type: ErrorResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'Validasi gagal',
    type: ErrorResponseDto,
  })
  async login(@Body() dto: LoginDto): Promise<AuthResponseDto> {
    return this.authService.login(dto);
  }
}
