import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-jwt';
import { Request } from 'express';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  private readonly logger = new Logger(JwtStrategy.name);

  constructor(private prisma: PrismaService) {
    super({
      jwtFromRequest: (req: Request) => {
        let token = null;
        if (req && req.cookies) {
          token = req.cookies['jwt'];
        }
        return token;
      },
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET || 'super-secret-key-for-development-only',
    });
  }

  async validate(payload: any) {
    this.logger.log(`Validating JWT payload for user ID: ${payload.sub}`);
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
    });
    if (!user) {
      this.logger.warn(`JWT validation failed: user ID ${payload.sub} not found`);
      throw new UnauthorizedException();
    }
    // Return safe user object (without password)
    const { password, ...safeUser } = user;
    return safeUser;
  }
}
