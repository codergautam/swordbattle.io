import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { AuthService } from '../auth.service';
import { FastifyRequest } from 'fastify';

export interface AccountRequest extends FastifyRequest {
  account: any;
}

@Injectable()
export class AccountGuard implements CanActivate {
  constructor(private readonly authService: AuthService) { }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const body = request.body;
    const secretKey = body.secret;

    if(!secretKey) {
      return false;
    }

    const account = await this.authService.getAccountFromSecret(secretKey);
    if(!account) {
      return false;
    }

    request.account = account;
    return true;
  }
}
