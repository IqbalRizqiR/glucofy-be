import { ApiProperty } from '@nestjs/swagger';

/**
 * Standard error response shape.
 * Used across all endpoints for @ApiBadRequestResponse,
 * @ApiUnauthorizedResponse, @ApiConflictResponse, etc.
 */
export class ErrorResponseDto {
  @ApiProperty({
    example: false,
    description: 'Always false for error responses',
  })
  success: boolean;

  @ApiProperty({
    example: 'Email sudah terdaftar',
    description: 'Human-readable error message',
  })
  message: string;

  @ApiProperty({
    example: 400,
    description: 'HTTP status code',
  })
  statusCode: number;
}
