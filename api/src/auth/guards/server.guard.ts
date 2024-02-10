import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { AuthService } from '../auth.service';
import { config } from 'src/config';

@Injectable()
export class ServerGuard implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers.authorization;

    // Check if the Authorization header is present and formatted correctly
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return false;
    }

    const secretKey = authHeader.split(' ')[1];

    if(!secretKey || (secretKey !== config.serverSecret)) {
      return false;
    }

    return true;
  }
}
