import { Body, Controller, Get, Post, UseGuards, Res, Req } from '@nestjs/common';
import { Response } from 'express';
import { RegisterDTO, LoginDTO } from './auth.dto';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { ServerGuard } from './guards/server.guard';
import { JwtBodyGuard } from './guards/jwt-body.guard';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  async register(@Body() registerData: RegisterDTO, @Res({ passthrough: true }) res: Response) {
    const data = await this.authService.register(registerData);
    res.set('Authorization', `Bearer ${data.token}`);
    res.cookie('auth-token', data.token, { httpOnly: true });
    return data;
  }

  @Post('login')
  async login(@Body() loginData: LoginDTO, @Res({ passthrough: true }) res: Response) {
    const data = await this.authService.login(loginData);
    res.set('Authorization', `Bearer ${data.token}`);
    res.cookie('auth-token', data.token, { httpOnly: true });
    return data;
  }

  @UseGuards(JwtAuthGuard)
  @Get('account')
  async account(@Req() req) {
    return { account: req.user };
  }

  @Post('logout')
  async logout(@Res({ passthrough: true }) res: Response) {
    const data = res.cookie('auth-token', '', { httpOnly: true });
    res.set('Authorization', '');
    return data.statusCode;
  }

  @UseGuards(ServerGuard, JwtBodyGuard)
  @Post('verify')
  async verify(@Req() req) {
    return { account: req.user };
  }
}
