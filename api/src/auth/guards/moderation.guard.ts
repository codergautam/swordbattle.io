import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { config } from 'src/config';

@Injectable()
export class ModerationGuard implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return false;
    }

    const secretKey = authHeader.split(' ')[1];
    if (!secretKey || secretKey !== config.moderationSecret) {
      return false;
    }

    return true;
  }
}
