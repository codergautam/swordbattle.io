import { ExtractJwt, Strategy, VerifiedCallback } from 'passport-jwt';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { AuthService } from '../auth.service';
import { config } from '../../config';

@Injectable()
export class JwtBodyStrategy extends PassportStrategy(Strategy, 'jwt-body') {
  constructor(private authService: AuthService) {
    super({
      jwtFromRequest: ExtractJwt.fromBodyField('token'),
      ignoreExpiration: false,
      secretOrKey: config.jwtSecret,
    });
  }

  async validate(payload: any, done: VerifiedCallback) {
    const user = await this.authService.validateAccount(payload);
    if (!user) {
      return done(new UnauthorizedException(), false);
    }
    return done(null, user, payload.iat);
  }
}
