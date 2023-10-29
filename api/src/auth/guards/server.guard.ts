import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Observable } from 'rxjs';
import { ExtractJwt } from 'passport-jwt';
import * as jwt from 'jsonwebtoken';

import { ServerPayload } from '../auth.interface';
import { config } from '../../config';

@Injectable()
export class ServerGuard implements CanActivate {
  canActivate( context: ExecutionContext ): boolean | Promise<boolean> | Observable<boolean> {
    const request = context.switchToHttp().getRequest();
    const token = ExtractJwt.fromAuthHeaderAsBearerToken()(request);
    try {
      const decoded = jwt.verify(token, config.serverSecret) as ServerPayload;
      return decoded.isServer === true;
    } catch (err) {
      return false;
    }
  }
}
