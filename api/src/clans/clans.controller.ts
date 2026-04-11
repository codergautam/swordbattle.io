import {
  Body,
  Controller,
  Param,
  Post,
  Req,
  UseGuards,
  ParseIntPipe,
} from '@nestjs/common';
import { SkipThrottle, Throttle } from '@nestjs/throttler';
import { AccountGuard, AccountRequest } from '../auth/guards/account.guard';
import { ClansService, clanCreationCost, clanXpRequirement, clanMemberCap } from './clans.service';
import { ClanRole } from './clan-member.entity';
import { ClanStatus } from './clan.entity';

@Controller('clans')
@UseGuards(AccountGuard)
export class ClansController {
  constructor(private readonly clansService: ClansService) {}

  @Post('me')
  @SkipThrottle({ short: true, medium: true, long: true })
  async getMyClan(@Req() req: AccountRequest) {
    const config = {
      clanCreationCost,
      clanXpRequirement,
      clanMemberCap,
    };
    const membership = await this.clansService.getMembershipForAccount(req.account.id);
    if (!membership) return { clan: null, config };
    const profile = await this.clansService.getClanProfile(membership.clan.id);
    return { clan: profile, role: membership.role, contributedXp: membership.contributedXp, config };
  }

  @Post('recommended')
  @SkipThrottle({ short: true, medium: true, long: true })
  async listRecommended(@Req() req: AccountRequest, @Body() body: { seed?: number; showRequest?: boolean; showIneligible?: boolean }) {
    return this.clansService.listRecommended(req.account, {
      seed: body?.seed,
      showRequest: body?.showRequest !== false,
      showIneligible: !!body?.showIneligible,
    });
  }

  @Post('search')
  async search(@Body() body: { q: string; by?: 'tag' | 'name' }) {
    const mode = body?.by === 'tag' ? 'tag' : 'name';
    return this.clansService.search(body?.q || '', mode);
  }

  @Post('leaderboard')
  @SkipThrottle({ short: true, medium: true, long: true })
  async leaderboard(@Body() body: { sort?: 'xp' | 'mastery' }) {
    const mode = body?.sort === 'mastery' ? 'mastery' : 'xp';
    return this.clansService.leaderboard(mode);
  }

  @Post('view/:id')
  @SkipThrottle({ short: true, medium: true, long: true })
  async getClan(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { sort?: 'role' | 'xp' | 'mastery' | 'joined' },
  ) {
    const allowed = ['role', 'xp', 'mastery', 'joined'] as const;
    const sortKey = (allowed as readonly string[]).includes(body?.sort ?? '')
      ? (body!.sort as (typeof allowed)[number])
      : 'xp';
    return this.clansService.getClanProfile(id, sortKey);
  }

  @Post('create')
  @Throttle({ short: { limit: 1, ttl: 5000 }, medium: { limit: 5, ttl: 60000 } })
  async createClan(@Req() req: AccountRequest, @Body() body: any) {
    return this.clansService.createClan(req.account, body);
  }

  @Post(':id/join')
  @Throttle({ short: { limit: 1, ttl: 1000 }, medium: { limit: 5, ttl: 60000 } })
  async joinOrRequest(@Req() req: AccountRequest, @Param('id', ParseIntPipe) id: number) {
    return this.clansService.joinOrRequest(req.account, id);
  }

  @Post(':id/requests/:reqId/accept')
  @Throttle({ short: { limit: 5, ttl: 1000 }, medium: { limit: 30, ttl: 60000 } })
  async acceptRequest(
    @Req() req: AccountRequest,
    @Param('id', ParseIntPipe) id: number,
    @Param('reqId', ParseIntPipe) reqId: number,
  ) {
    return this.clansService.respondToRequest(req.account, id, reqId, true);
  }

  @Post(':id/requests/:reqId/reject')
  @Throttle({ short: { limit: 5, ttl: 1000 }, medium: { limit: 30, ttl: 60000 } })
  async rejectRequest(
    @Req() req: AccountRequest,
    @Param('id', ParseIntPipe) id: number,
    @Param('reqId', ParseIntPipe) reqId: number,
  ) {
    return this.clansService.respondToRequest(req.account, id, reqId, false);
  }

  @Post(':id/leave')
  @Throttle({ short: { limit: 1, ttl: 2000 }, medium: { limit: 5, ttl: 60000 } })
  async leave(@Req() req: AccountRequest, @Param('id', ParseIntPipe) id: number) {
    return this.clansService.leaveClan(req.account);
  }

  @Post(':id/kick/:targetId')
  @Throttle({ short: { limit: 2, ttl: 1000 }, medium: { limit: 20, ttl: 60000 } })
  async kick(
    @Req() req: AccountRequest,
    @Param('id', ParseIntPipe) id: number,
    @Param('targetId', ParseIntPipe) targetId: number,
  ) {
    return this.clansService.kickMember(req.account, id, targetId);
  }

  @Post(':id/role/:targetId')
  @Throttle({ short: { limit: 2, ttl: 1000 }, medium: { limit: 20, ttl: 60000 } })
  async changeRole(
    @Req() req: AccountRequest,
    @Param('id', ParseIntPipe) id: number,
    @Param('targetId', ParseIntPipe) targetId: number,
    @Body() body: { role: ClanRole },
  ) {
    return this.clansService.changeRole(req.account, id, targetId, body.role);
  }

  @Post(':id/transfer/:targetId')
  @Throttle({ short: { limit: 1, ttl: 5000 }, medium: { limit: 3, ttl: 60000 } })
  async transferLeadership(
    @Req() req: AccountRequest,
    @Param('id', ParseIntPipe) id: number,
    @Param('targetId', ParseIntPipe) targetId: number,
  ) {
    return this.clansService.transferLeadership(req.account, id, targetId);
  }

  @Post(':id/edit')
  @Throttle({ short: { limit: 1, ttl: 1000 }, medium: { limit: 10, ttl: 60000 } })
  async edit(
    @Req() req: AccountRequest,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: {
      description?: string;
      frameId?: number;
      iconId?: number;
      frameColor?: string;
      iconColor?: string;
      status?: ClanStatus;
      xpRequirement?: number;
      masteryRequirement?: number;
    },
  ) {
    return this.clansService.editClan(req.account, id, body);
  }

  @Post(':id/disband')
  @Throttle({ short: { limit: 1, ttl: 5000 }, medium: { limit: 2, ttl: 60000 } })
  async disband(@Req() req: AccountRequest, @Param('id', ParseIntPipe) id: number) {
    return this.clansService.disband(req.account, id);
  }

  @Post(':id/chat/history')
  @SkipThrottle({ short: true, medium: true, long: true })
  async getChat(
    @Req() req: AccountRequest,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { before?: number },
  ) {
    return this.clansService.getChatHistory(req.account, id, body?.before);
  }

  @Post(':id/chat')
  @Throttle({ short: { limit: 1, ttl: 1500 }, medium: { limit: 30, ttl: 60000 } })
  async postChat(
    @Req() req: AccountRequest,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { content: string },
  ) {
    return this.clansService.postChat(req.account, id, body.content);
  }
}
