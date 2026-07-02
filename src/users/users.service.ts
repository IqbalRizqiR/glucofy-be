import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UserProfileResponseDto } from './dto/user-profile-response.dto';
import { UpdateHealthProfileDto } from './dto/update-health-profile.dto';
import { HealthProfileResponseDto } from './dto/health-profile-response.dto';
import { calculateDailySugarLimit } from '../common/utils/sugar-limit.util';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async findMe(userId: string): Promise<UserProfileResponseDto> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        profileImage: true,
        createdAt: true,
      },
    });

    if (!user) {
      throw new NotFoundException('User tidak ditemukan');
    }

    return user;
  }

  async updateHealthProfile(
    userId: string,
    dto: UpdateHealthProfileDto,
  ): Promise<HealthProfileResponseDto> {
    await this.ensureUserExists(userId);

    let bmi: number | null = null;

    const existing = await this.prisma.healthProfile.findUnique({
      where: { userId },
    });

    const weight = dto.weight ?? existing?.weight ?? null;
    const height = dto.height ?? existing?.height ?? null;

    if (weight && height) {
      const heightInMeters = height / 100;
      bmi = Math.round((weight / (heightInMeters * heightInMeters)) * 10) / 10;
    }

    const profile = await this.prisma.healthProfile.upsert({
      where: { userId },
      update: {
        ...dto,
        bmi,
      },
      create: {
        userId,
        ...dto,
        bmi,
      },
    });

    return {
      id: profile.id,
      age: profile.age,
      weight: profile.weight,
      height: profile.height,
      gender: profile.gender,
      activityLevel: profile.activityLevel,
      bmi: profile.bmi,
      dailySugarLimit: calculateDailySugarLimit(profile),
    };
  }

  private async ensureUserExists(userId: string): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true },
    });

    if (!user) {
      throw new NotFoundException('User tidak ditemukan');
    }
  }
}
