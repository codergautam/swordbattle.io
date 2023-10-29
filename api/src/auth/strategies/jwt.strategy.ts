import { ExtractJwt, Strategy, VerifiedCallback } from 'passport-jwt';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Request } from 'express';
import { AuthService } from '../auth.service';
import { config } from '../../config';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(private authService: AuthService) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        JwtStrategy.getCookieToken,
        ExtractJwt.fromAuthHeaderAsBearerToken(),
      ]),
      ignoreExpiration: false,
      secretOrKey: config.jwtSecret,
    });
  }

  private static getCookieToken(request: Request) {
    if (request.cookies && request.cookies['auth-token']) {
      return request.cookies['auth-token'];
    }
    return null;
  }

  async validate(payload: any, done: VerifiedCallback) {
    const user = await this.authService.validateAccount(payload);
    if (!user) {
      return done(new UnauthorizedException(), false);
    }
    return done(null, user, payload.iat);
  }
}
