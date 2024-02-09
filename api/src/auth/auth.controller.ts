import { Body, Controller, Get, Post, UseGuards, Res, Req } from '@nestjs/common';
import { Response } from 'express';
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
  @Post('change-username')
  async changeUsername(@Req() request) {
    let result = await this.authService.changeUsername(request.account, request.body.newUsername);
    return result;
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
