/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { createParamDecorator, ExecutionContext } from '@nestjs/common';

/**
 * @User() decorator — extracts the authenticated user from the request.
 *
 * Populated by JwtStrategy.validate() after a valid JWT is verified.
 *
 * Usage:
 *   @Get('me')
 *   @UseGuards(JwtAuthGuard)
 *   getProfile(@User() user: RequestUser) { return user; }
 */
export const User = createParamDecorator(
  (data: keyof RequestUser | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user: RequestUser = request.user;

    // If a specific field is requested (e.g. @User('id')), return that field
    return data ? user?.[data] : user;
  },
);

/**
 * Shape of the authenticated user object attached to request.user
 * Matches what JwtStrategy.validate() returns
 */
export interface RequestUser {
  id: string;
  email: string;
  name: string | null;
  role: string;
}
