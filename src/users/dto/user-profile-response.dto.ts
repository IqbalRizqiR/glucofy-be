import { ApiProperty } from '@nestjs/swagger';

/**
 * Safe user profile response — never exposes passwordHash.
 */
export class UserProfileResponseDto {
  @ApiProperty({
    example: 'clxyz123abc456def',
    description: 'Unique user ID (cuid)',
  })
  id: string;

  @ApiProperty({
    example: 'anjar@gmail.com',
    description: 'User email address',
  })
  email: string;

  @ApiProperty({
    example: 'Anjar',
    description: 'Display name',
    nullable: true,
  })
  name: string | null;

  @ApiProperty({
    example: 'USER',
    description: 'User role',
    enum: ['USER', 'PREMIUM', 'ADMIN'],
  })
  role: string;

  @ApiProperty({
    example: null,
    description: 'Profile image URL',
    nullable: true,
  })
  profileImage: string | null;

  @ApiProperty({
    example: '2024-01-15T08:30:00.000Z',
    description: 'Account creation timestamp',
  })
  createdAt: Date;
}
