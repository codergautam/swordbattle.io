import { Body, Controller, Get, Post, UseGuards, Res, Req, Query, UnauthorizedException } from '@nestjs/common';
import { FastifyReply } from 'fastify';
import { Throttle } from '@nestjs/throttler';
import { RegisterDTO, LoginDTO, SecretLoginDTO } from './auth.dto';
import { AuthService } from './auth.service';
import { ServerGuard } from './guards/server.guard';
import { config } from 'src/config';
import { AccountGuard } from './guards/account.guard';
import { ClansService } from 'src/clans/clans.service';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly clansService: ClansService,
  ) {}

  @Get('username-available')
  @Throttle({ short: { limit: 5, ttl: 1000 }, medium: { limit: 60, ttl: 60000 } })
  async usernameAvailable(@Query('username') username: string) {
    return this.authService.checkUsername(username || '');
  }

  @Post('register')
  async register(@Body() registerData: RegisterDTO, @Res({ passthrough: true }) res: FastifyReply) {
    const data = await this.authService.register(registerData);
    // res.set('Authorization', `Bearer ${data.token}`);
    // this.setCookie(res, 'auth-token', data.token);
    return data;
  }

  @Post('login')
  async login(@Body() loginData: LoginDTO, @Res({ passthrough: true }) res: FastifyReply) {
    const data = await this.authService.login(loginData);
    if (data.account.is_v1) {
      // assume the migration screen will be shown
      data.account.is_v1 = false;
      await this.authService.updateAccount(data.account);
      data.account.is_v1 = true;
    }
    (data.account as any).clan = await this.clansService.getMembershipForAccount(data.account.id);
    return data;
  }

  // secrets system
  @Post('loginWithSecret')
  async loginWithSecret(@Body() loginData: SecretLoginDTO, @Res({ passthrough: true }) res: FastifyReply) {
    const data = await this.authService.secretLogin(loginData);

    if(data.account.is_v1) {
      // assume the migration screen will be shown
      data.account.is_v1 = false;
      await this.authService.updateAccount(data.account);
      data.account.is_v1 = true;
    }
    (data.account as any).clan = await this.clansService.getMembershipForAccount(data.account.id);
    return data;
  }

  @Post('crazygames/login')
  async crazygamesLogin(@Body() body: { token: string; userId?: string; username?: string }) {
    console.log('[AUTH CONTROLLER] ===== CRAZYGAMES LOGIN ENDPOINT HIT =====');
    const { token, userId } = body;

    if (!token) {
      throw new UnauthorizedException('Missing CrazyGames token');
    }

    const data = await this.authService.crazygamesLogin(token, userId);
    return data;
  }

  @Get('account')
  async account(@Req() req) {
    throw new Error('DEPRECATED');
  }

  @Post('logout')
  async logout(@Res({ passthrough: true }) res: FastifyReply) {
    throw new Error('DEPRECATED');
  }

  @UseGuards(ServerGuard, AccountGuard)
  @Post('verify')
  async verify(@Req() req) {
    const clan = await this.clansService.getMembershipForAccount(req.account.id);
    return { account: { ...req.account, clan } };
  }

  @UseGuards(AccountGuard)
  @Throttle({ short: { limit: 2, ttl: 1000 }, medium: { limit: 10, ttl: 60000 } })
  @Post('set-more-ads')
  async setMoreAds(@Req() request) {
    return this.authService.setMoreAds(request.account, request.body.enabled === true);
  }

  @UseGuards(AccountGuard)
  @Throttle({ short: { limit: 2, ttl: 1000 }, medium: { limit: 10, ttl: 60000 } })
  @Post('claim-daily-login')
  async claimDailyLogin(@Req() request) {
    return this.authService.claimDailyLogin(request.account, request.body.count);
  }

  @UseGuards(AccountGuard)
  @Throttle({ short: { limit: 2, ttl: 1000 }, medium: { limit: 10, ttl: 60000 } })
  @Post('claim-gem-bonus')
  async claimGemBonus(@Req() request) {
    const sources = Array.isArray(request.body?.sources) ? request.body.sources : ['ad'];
    return this.authService.claimGemBonus(request.account, sources);
  }

  @UseGuards(AccountGuard)
  @Throttle({ short: { limit: 2, ttl: 1000 }, medium: { limit: 10, ttl: 60000 } })
  @Post('check-in')
  async checkIn(@Req() request) {
    const account = await this.authService.checkInAccount(request.account);
    return { dailyLogin: account.dailyLogin };
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
  @Post('change-userbio')
  async changeUserbio(@Req() request) {
    let result = await this.authService.changeUserbio(request.account, request.body.newUserbio);
    return result;
  }

  @Post('request-api-token')
  @Throttle({ short: { limit: 3, ttl: 10000 }, medium: { limit: 10, ttl: 60000 } })
  async requestApiToken(@Req() req) {
    const token = await this.authService.generateApiToken();
    return { token, expiresIn: 300000 }; // 5 minutes
  }

  setCookie(res: FastifyReply, key: string, value: string) {
    return res.setCookie(key, value, {
      // httpOnly: true,
      secure: config.isProduction,
      sameSite: config.isProduction ? 'none' : 'lax',
      maxAge: 1000 * 60 * 60 * 24 * 365, // 1 year
    });
  }
}
