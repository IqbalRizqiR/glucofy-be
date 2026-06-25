import { ApiProperty } from '@nestjs/swagger';

export class AuthResponseDto {
  @ApiProperty({
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
    description: 'JWT Bearer token — gunakan ini di header Authorization',
  })
  accessToken: string;

  @ApiProperty({
    example: 'Bearer',
    description: 'Token type',
  })
  tokenType: string;

  @ApiProperty({
    example: 604800,
    description: 'Token expiry in seconds (7 days = 604800)',
  })
  expiresIn: number;
}
