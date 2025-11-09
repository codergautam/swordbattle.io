import { Body, Controller, Get, Post, UseGuards, Res, Req } from '@nestjs/common';
import { Response } from 'express';
import { Throttle } from '@nestjs/throttler';
import { RegisterDTO, LoginDTO, SecretLoginDTO } from './auth.dto';
import { AuthService } from './auth.service';
import { ServerGuard } from './guards/server.guard';
import { config } from 'src/config';
import { RecaptchaGuard } from './guards/recaptcha.guard';
import { AccountGuard } from './guards/account.guard';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @UseGuards(RecaptchaGuard)
  async register(@Body() registerData: RegisterDTO, @Res({ passthrough: true }) res: Response) {
    const data = await this.authService.register(registerData);
    // res.set('Authorization', `Bearer ${data.token}`);
    // this.setCookie(res, 'auth-token', data.token);
    return data;
  }

  @Post('login')
  async login(@Body() loginData: LoginDTO, @Res({ passthrough: true }) res: Response) {
    const data = await this.authService.login(loginData);
    // res.set('Authorization', `Bearer ${data.token}`);
    // this.setCookie(res, 'auth-token', data.token);
    if (data.account.is_v1) {
      // assume the migration screen will be shown
      data.account.is_v1 = false;
      await this.authService.updateAccount(data.account);
      data.account.is_v1 = true;
    }
    return data;
  }

  // secrets system
  @Post('loginWithSecret')
  async loginWithSecret(@Body() loginData: SecretLoginDTO, @Res({ passthrough: true }) res: Response) {
    const data = await this.authService.secretLogin(loginData);

    if(data.account.is_v1) {
      // assume the migration screen will be shown
      data.account.is_v1 = false;
      await this.authService.updateAccount(data.account);
      data.account.is_v1 = true;
    }
    return data;
  }

  @Get('account')
  async account(@Req() req) {
    throw new Error('DEPRECATED');
  }

  @Post('logout')
  async logout(@Res({ passthrough: true }) res: Response) {
    throw new Error('DEPRECATED');
  }

  @UseGuards(ServerGuard, AccountGuard)
  @Post('verify')
  async verify(@Req() req) {
    return { account: req.account };
  }

  @UseGuards(AccountGuard)
  @Throttle({ short: { limit: 1, ttl: 1000 }, medium: { limit: 5, ttl: 60000 } })
  @Post('change-username')
  async changeUsername(@Req() request) {
    let result = await this.authService.changeUsername(request.account, request.body.newUsername);
    return result;
  }

  @UseGuards(AccountGuard)
  @Throttle({ short: { limit: 1, ttl: 1000 }, medium: { limit: 5, ttl: 60000 } })
  @Post('change-clantag')
  async changeClantag(@Req() request) {
    let result = await this.authService.changeClantag(request.account, request.body.newClantag);
    return result;
  }

  @UseGuards(AccountGuard)
  @Throttle({ short: { limit: 1, ttl: 1000 }, medium: { limit: 5, ttl: 60000 } })
  @Post('change-userbio')
  async changeUserbio(@Req() request) {
    let result = await this.authService.changeUserbio(request.account, request.body.newUserbio);
    return result;
  }

  @Post('request-api-token')
  @UseGuards(RecaptchaGuard)
  @Throttle({ short: { limit: 3, ttl: 10000 }, medium: { limit: 10, ttl: 60000 } })
  async requestApiToken(@Req() req) {
    const token = await this.authService.generateApiToken();
    return { token, expiresIn: 300000 }; // 5 minutes
  }

  setCookie(res: Response, key: string, value: string) {
    return res.cookie(key, value, {
      // httpOnly: true,
      secure: config.isProduction,
      sameSite: config.isProduction ? 'none' : 'lax',
      maxAge: 1000 * 60 * 60 * 24 * 365, // 1 year
    });
  }
}
