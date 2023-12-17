import { Body, Controller, Get, Post, UseGuards, Res, Req } from '@nestjs/common';
import { Response } from 'express';
import { RegisterDTO, LoginDTO } from './auth.dto';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { ServerGuard } from './guards/server.guard';
import { JwtBodyGuard } from './guards/jwt-body.guard';
import { config } from 'src/config';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  async register(@Body() registerData: RegisterDTO, @Res({ passthrough: true }) res: Response) {
    const data = await this.authService.register(registerData);
    res.set('Authorization', `Bearer ${data.token}`);
    this.setCookie(res, 'auth-token', data.token);
    return data;
  }

  @Post('login')
  async login(@Body() loginData: LoginDTO, @Res({ passthrough: true }) res: Response) {
    const data = await this.authService.login(loginData);
    res.set('Authorization', `Bearer ${data.token}`);
    this.setCookie(res, 'auth-token', data.token);
    if (data.account.is_v1) {
      // assume the migration screen has been shown
      data.account.is_v1 = false;
      await this.authService.updateAccount(data.account);
      data.account.is_v1 = true;
    }
    return data;
  }

  @UseGuards(JwtAuthGuard)
  @Get('account')
  async account(@Req() req) {
    const token = await this.authService.getToken(req.user);
    return { account: req.user, token };
  }

  @Post('logout')
  async logout(@Res({ passthrough: true }) res: Response) {
    this.setCookie(res, 'auth-token', '');
    res.set('Authorization', '');
    return true;
  }

  @UseGuards(ServerGuard, JwtBodyGuard)
  @Post('verify')
  async verify(@Req() req) {
    return { account: req.user };
  }

  @UseGuards(JwtAuthGuard)
  @Post('change-username')
  async changeUsername(@Req() request) {
    const token = await this.authService.getIdFromToken(request.body.token);
    const { newUsername } = request.body;

    // Get account
    const account = await this.authService.getAccountById(token);
    let result = await this.authService.changeUsername(account, newUsername);
    return result;
  }

  setCookie(res: Response, key: string, value: string) {
    return res.cookie(key, value, {
      httpOnly: true,
      secure: config.isProduction,
      sameSite: config.isProduction ? 'none' : 'lax',
    });
  }
}
