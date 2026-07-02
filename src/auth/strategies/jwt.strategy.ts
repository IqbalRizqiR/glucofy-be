import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';

/**
 * JWT Payload shape — apa yang di-encode ke dalam token
 */
export interface JwtPayload {
  sub: string; // userId (cuid)
  email: string;
}

/**
 * JwtStrategy validates the JWT token on every protected request.
 * - Extracts Bearer token from Authorization header
 * - Verifies signature against JWT_SECRET
 * - Returns user object to be injected as @User() in controllers
 */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      // Non-null assertion: JWT_SECRET is required and validated at startup
      secretOrKey: configService.getOrThrow<string>('JWT_SECRET'),
    });
  }

  /**
   * Called automatically by Passport after signature verification.
   * Return value is attached to request.user
   */
  async validate(payload: JwtPayload) {
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
      },
    });

    if (!user) {
      throw new UnauthorizedException(
        'User tidak ditemukan atau token tidak valid',
      );
    }

    return user; // this becomes request.user
  }
}
