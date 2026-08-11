import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ServerGuard } from '../auth/guards/server.guard';
import { ValorService } from './valor.service';

@Controller('valor')
@UseGuards(ServerGuard)
export class ValorController {
  constructor(private readonly valor: ValorService) {}

  @Post('award')
  async award(@Body() body: any) {
    return { profiles: await this.valor.awardBatch(body?.outbreakId, body?.awards) };
  }

  @Get('profile/:accountId')
  profile(@Param('accountId') rawAccountId: string) {
    return this.valor.profile(Number(rawAccountId));
  }

  @Get('top')
  async top(@Query('limit') rawLimit: string) {
    return { profiles: await this.valor.top(Number(rawLimit) || 10) };
  }
}
