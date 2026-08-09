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

    // Same switch as the client's REACT_APP_CAPTCHA_ENABLED and the game server's
    // CAPTCHA_ENABLED, so captcha can be turned off without deleting the secret.
    // Without this the guard keys off the secret alone: the client stops sending a
    // token while the secret is still configured, and every registration 403s.
    const captchaEnabled = process.env.CAPTCHA_ENABLED === 'true' && !!secret;

    if(!captchaEnabled) {
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
