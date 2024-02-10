import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import axios from 'axios';

@Injectable()
export class RecaptchaGuard implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const body = request.body;
    console.log('body', body);
    const recaptchaToken = body.recaptchaToken;
    const secret = process.env.RECAPTCHA_SECRET_KEY;

    if(!secret) {
      return true;
    }

    if (!recaptchaToken) {
      return false;
    }

    try {
      const response = await axios.post(
        `https://www.google.com/recaptcha/api/siteverify`,
        null,
        {
          params: {
            secret: secret,
            response: recaptchaToken,
          },
        }
      );

      return response.data.success;
    } catch (error) {
      return false;
    }
  }
}
