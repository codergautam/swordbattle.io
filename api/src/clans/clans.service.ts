import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Account } from '../accounts/account.entity';
import { Clan, ClanStatus } from './clan.entity';
import { ClanMember, ClanRole } from './clan-member.entity';
import { ClanJoinRequest } from './clan-join-request.entity';
import {
  ClanChatMessage,
  ClanChatMessageType,
} from './clan-chat-message.entity';
import validateClanTag from '../helpers/validateClantag';
import validateClanName from '../helpers/validateClanName';
import validateTagNameSimilarity from '../helpers/validateTagNameSimilarity';
import { containsProfanity } from '../helpers/profanityFilter';

export const clanXpRequirement = 25_000;
export const clanCreationCost = 20_000; // 100_000 after first day
export const clanMemberCap = 25;
export const clanLeaveCooldownMs = 24 * 60 * 60 * 1000;
export const clanKickCooldownMs = 60 * 60 * 1000;
export const clanDescriptionMax = 250;
export const clanChatMaxLength = 200;
export const clanChatHistoryLimit = 50;
export const recommendedClanLimit = 20;
export const leaderboardLimit = 25;

export const allowedFrameIds = [1, 2, 3, 4, 5];
export const allowedIconIds = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14];
export const allowedFrameColors = [
  '#ffffff', '#ffaa00', '#ff4444', '#ff66cc', '#cc66ff', '#6666ff',
  '#33aaff', '#00cccc', '#33cc33', '#aaff44', '#ffee44', '#888888',
];
export const allowedIconColors = [
  '#33cc33', '#aaff44', '#ffee44', '#ffaa00', '#ff4444',
  '#ff66cc', '#cc66ff', '#6666ff', '#33aaff', '#00cccc',
];
export const allowedXpRequirements = [
  0, 50_000, 100_000, 200_000, 300_000, 500_000, 750_000,
  1_000_000, 1_250_000, 1_500_000, 2_000_000,
];
export const allowedMasteryRequirements = [
  0, 50_000, 100_000, 200_000, 300_000, 500_000, 750_000, 1_000_000,
];

export type ClanSummary = {
  id: number;
  tag: string;
  name: string;
  frameId: number;
  iconId: number;
  frameColor: string;
  iconColor: string;
  description: string;
  status: ClanStatus;
  xpRequirement: number;
  masteryRequirement: number;
  clanXp: number;
  clanMastery: number;
  memberCount: number;
  leaderId: number;
  leaderUsername?: string;
};

export type ClanMemberSummary = {
  accountId: number;
  username: string;
  role: ClanRole;
  joined_at: Date;
  contributedXp: number;
  xp: number;
  mastery: number;
  skinId: number;
};

function sanitizeChatContent(raw: string): string {
  if (typeof raw !== 'string') return '';
  return raw
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F\u200B-\u200F\u2028-\u202F\u2060-\u206F\uFEFF]/g, '')
    .trim();
}

@Injectable()
export class ClansService {
  constructor(
    @InjectRepository(Clan) private clans: Repository<Clan>,
    @InjectRepository(ClanMember) private members: Repository<ClanMember>,
    @InjectRepository(ClanJoinRequest) private requests: Repository<ClanJoinRequest>,
    @InjectRepository(ClanChatMessage) private messages: Repository<ClanChatMessage>,
    @InjectRepository(Account) private accounts: Repository<Account>,
    private dataSource: DataSource,
  ) {}

  private requireXpEligible(account: Account) {
    if ((account.xp ?? 0) < clanXpRequirement) {
      throw new ForbiddenException(
        `You need at least ${clanXpRequirement.toLocaleString()} XP to use clans`,
      );
    }
  }

  private async getClanOrThrow(clanId: number): Promise<Clan> {
    const clan = await this.clans.findOne({ where: { id: clanId } });
    if (!clan) throw new NotFoundException('Clan not found');
    return clan;
  }

  private async getMembership(accountId: number): Promise<ClanMember | null> {
    return this.members.findOne({ where: { accountId } });
  }

  private requireRoleAtLeast(role: ClanRole, minimum: ClanRole) {
    if (role > minimum) {
      throw new ForbiddenException('You do not have permission for this action');
    }
  }

  private toSummary(clan: Clan, memberCount: number, leaderUsername?: string): ClanSummary {
    return {
      id: clan.id,
      tag: clan.tag,
      name: clan.name,
      frameId: clan.frameId,
      iconId: clan.iconId,
      frameColor: clan.frameColor,
      iconColor: clan.iconColor,
      description: clan.description,
      status: clan.status,
      xpRequirement: Number(clan.xpRequirement),
      masteryRequirement: Number(clan.masteryRequirement),
      clanXp: Number(clan.clanXp),
      clanMastery: Number(clan.clanMastery),
      memberCount,
      leaderId: clan.leaderId,
      leaderUsername,
    };
  }

  private async countMembers(clanId: number): Promise<number> {
    return this.members.count({ where: { clanId } });
  }

  private async getLeaderUsername(leaderId: number): Promise<string | undefined> {
    const leader = await this.accounts.findOne({ where: { id: leaderId }, select: ['username'] });
    return leader?.username;
  }

  async getMembershipForAccount(accountId: number): Promise<{
    clan: ClanSummary;
    role: ClanRole;
    contributedXp: number;
  } | null> {
    const member = await this.members.findOne({ where: { accountId } });
    if (!member) return null;
    const clan = await this.clans.findOne({ where: { id: member.clanId } });
    if (!clan) return null;
    const memberCount = await this.countMembers(clan.id);
    const leaderUsername = await this.getLeaderUsername(clan.leaderId);
    return {
      clan: this.toSummary(clan, memberCount, leaderUsername),
      role: member.role,
      contributedXp: Number(member.contributedXp),
    };
  }

  async createClan(account: Account, body: {
    tag: string;
    name: string;
    description?: string;
    frameId?: number;
    iconId?: number;
    frameColor?: string;
    iconColor?: string;
    status?: ClanStatus;
    xpRequirement?: number;
    masteryRequirement?: number;
  }) {
    this.requireXpEligible(account);

    if ((account.gems ?? 0) < clanCreationCost) {
      throw new ForbiddenException(
        `You need ${clanCreationCost.toLocaleString()} gems to create a clan`,
      );
    }

    if (await this.getMembership(account.id)) {
      throw new ConflictException('You are already in a clan');
    }

    const tag = (body.tag || '').trim();
    const name = (body.name || '').trim();
    const description = (body.description || '').trim();

    const tagError = validateClanTag(tag);
    if (tagError) throw new BadRequestException(tagError);
    const nameError = validateClanName(name);
    if (nameError) throw new BadRequestException(nameError);
    const similarityError = validateTagNameSimilarity(tag, name);
    if (similarityError) throw new BadRequestException(similarityError);

    if (description.length > clanDescriptionMax) {
      throw new BadRequestException(
        `Description must be at most ${clanDescriptionMax} characters`,
      );
    }
    if (description && containsProfanity(description)) {
      throw new BadRequestException('Description contains a bad word');
    }

    const frameId = body.frameId ?? allowedFrameIds[0];
    const iconId = body.iconId ?? allowedIconIds[0];
    const frameColor = body.frameColor ?? allowedFrameColors[0];
    const iconColor = body.iconColor ?? allowedIconColors[0];
    if (!allowedFrameIds.includes(frameId)) {
      throw new BadRequestException('Invalid frame');
    }
    if (!allowedIconIds.includes(iconId)) {
      throw new BadRequestException('Invalid icon');
    }
    if (!allowedFrameColors.includes(frameColor)) {
      throw new BadRequestException('Invalid frame color');
    }
    if (!allowedIconColors.includes(iconColor)) {
      throw new BadRequestException('Invalid icon color');
    }

    const status = body.status ?? ClanStatus.Public;
    if (![ClanStatus.Public, ClanStatus.Request, ClanStatus.Private].includes(status)) {
      throw new BadRequestException('Invalid status');
    }

    const xpRequirement = body.xpRequirement ?? 0;
    const masteryRequirement = body.masteryRequirement ?? 0;
    if (!allowedXpRequirements.includes(xpRequirement)) {
      throw new BadRequestException('Invalid xp requirement');
    }
    if (!allowedMasteryRequirements.includes(masteryRequirement)) {
      throw new BadRequestException('Invalid mastery requirement');
    }

    if (account.clanCooldownUntil) {
      const remaining = new Date(account.clanCooldownUntil).getTime() - Date.now();
      if (remaining > 0) {
        const hours = Math.ceil(remaining / (60 * 60 * 1000));
        throw new ForbiddenException(`You must wait ${hours} more hour${hours === 1 ? '' : 's'} before joining/creating another clan`);
      }
    }

    return this.dataSource.transaction(async (tx) => {
      const existingTag = await tx.getRepository(Clan).findOne({ where: { tag } });
      if (existingTag) throw new ConflictException('That clan tag is already taken');
      const existingName = await tx.getRepository(Clan).findOne({ where: { name } });
      if (existingName) throw new ConflictException('That clan name is already taken');

      const liveAccount = await tx.getRepository(Account).findOne({ where: { id: account.id } });
      if (!liveAccount) throw new NotFoundException('Account not found');
      if (liveAccount.gems < clanCreationCost) {
        throw new ForbiddenException(
          `You need ${clanCreationCost.toLocaleString()} gems to create a clan`,
        );
      }
      liveAccount.gems -= clanCreationCost;
      await tx.getRepository(Account).save(liveAccount);

      const clan = tx.getRepository(Clan).create({
        tag,
        name,
        description,
        frameId,
        iconId,
        frameColor,
        iconColor,
        status,
        xpRequirement,
        masteryRequirement,
        leaderId: account.id,
        clanXp: account.xp ?? 0,
        clanMastery: account.mastery ?? 0,
      });
      const savedClan = await tx.getRepository(Clan).save(clan);

      const member = tx.getRepository(ClanMember).create({
        clanId: savedClan.id,
        accountId: account.id,
        role: ClanRole.Leader,
        contributedXp: account.xp ?? 0,
      });
      await tx.getRepository(ClanMember).save(member);

      await this.postSystemMessage(tx, savedClan.id, ClanChatMessageType.Create, {
        actorId: account.id,
        actorName: account.username,
        clanName: savedClan.name,
      });

      return this.toSummary(savedClan, 1, account.username);
    });
  }


  async joinOrRequest(account: Account, clanId: number) {
    this.requireXpEligible(account);
    if (await this.getMembership(account.id)) {
      throw new ConflictException('You are already in a clan');
    }
    if (account.clanCooldownUntil) {
      const remaining = new Date(account.clanCooldownUntil).getTime() - Date.now();
      if (remaining > 0) {
        const hours = Math.ceil(remaining / (60 * 60 * 1000));
        throw new ForbiddenException(`You must wait ${hours} more hour${hours === 1 ? '' : 's'} before joining another clan`);
      }
    }

    const clan = await this.getClanOrThrow(clanId);
    if ((account.xp ?? 0) < Number(clan.xpRequirement)) {
      throw new ForbiddenException("You don't meet this clan's XP requirement");
    }
    if ((account.mastery ?? 0) < Number(clan.masteryRequirement)) {
      throw new ForbiddenException("You don't meet this clan's mastery requirement");
    }
    if (clan.status === ClanStatus.Private) {
      throw new ForbiddenException('This clan is private');
    }

    const memberCount = await this.countMembers(clan.id);
    if (memberCount >= clanMemberCap) {
      throw new ConflictException('This clan is full');
    }

    if (clan.status === ClanStatus.Request) {
      const existing = await this.requests.findOne({ where: { clanId, accountId: account.id } });
      if (existing) {
        throw new ConflictException('You already have a pending request for this clan');
      }
      const req = this.requests.create({ clanId, accountId: account.id });
      await this.requests.save(req);
      return { requested: true };
    }

    return this.dataSource.transaction(async (tx) => {
      const member = tx.getRepository(ClanMember).create({
        clanId: clan.id,
        accountId: account.id,
        role: ClanRole.Member,
        contributedXp: 0,
      });
      await tx.getRepository(ClanMember).save(member);

      await this.postSystemMessage(tx, clan.id, ClanChatMessageType.Join, {
        actorId: account.id,
        actorName: account.username,
      });

      return { joined: true };
    });
  }

  async respondToRequest(actor: Account, clanId: number, requestId: number, accept: boolean) {
    const actorMember = await this.requireMemberOf(actor.id, clanId);
    this.requireRoleAtLeast(actorMember.role, ClanRole.CoLeader);

    const req = await this.requests.findOne({ where: { id: requestId, clanId } });
    if (!req) throw new NotFoundException('Request not found');

    if (!accept) {
      await this.requests.remove(req);
      return { rejected: true };
    }

    const target = await this.accounts.findOne({ where: { id: req.accountId } });
    if (!target) {
      await this.requests.remove(req);
      throw new NotFoundException('Requesting account no longer exists');
    }

    if (await this.getMembership(target.id)) {
      await this.requests.remove(req);
      throw new ConflictException('That player is already in a clan');
    }

    const memberCount = await this.countMembers(clanId);
    if (memberCount >= clanMemberCap) {
      throw new ConflictException('Clan is full');
    }

    return this.dataSource.transaction(async (tx) => {
      const member = tx.getRepository(ClanMember).create({
        clanId,
        accountId: target.id,
        role: ClanRole.Member,
        contributedXp: 0,
      });
      await tx.getRepository(ClanMember).save(member);
      await tx.getRepository(ClanJoinRequest).delete({ id: requestId });
      await this.postSystemMessage(tx, clanId, ClanChatMessageType.Join, {
        actorId: target.id,
        actorName: target.username,
      });
      return { accepted: true };
    });
  }


  private async requireMemberOf(accountId: number, clanId: number): Promise<ClanMember> {
    const member = await this.members.findOne({ where: { accountId, clanId } });
    if (!member) throw new ForbiddenException('You are not in this clan');
    return member;
  }

  async leaveClan(account: Account) {
    const member = await this.getMembership(account.id);
    if (!member) throw new NotFoundException('You are not in a clan');
    const clanId = member.clanId;

    return this.dataSource.transaction(async (tx) => {
      if (member.role === ClanRole.Leader) {
        const candidates = await tx.getRepository(ClanMember).find({
          where: { clanId },
          order: { joined_at: 'ASC' },
        });
        const replacement = candidates
          .filter((m) => m.id !== member.id)
          .sort((a, b) => a.role - b.role || a.joined_at.getTime() - b.joined_at.getTime())[0];

        if (!replacement) {
          await tx.getRepository(ClanMember).delete({ id: member.id });
          await tx.getRepository(Clan).delete({ id: clanId });
          await this.markLeft(tx, account);
          return { disbanded: true };
        }

        replacement.role = ClanRole.Leader;
        await tx.getRepository(ClanMember).save(replacement);
        await tx.getRepository(Clan).update({ id: clanId }, { leaderId: replacement.accountId });

        await tx.getRepository(ClanMember).delete({ id: member.id });
        await this.postSystemMessage(tx, clanId, ClanChatMessageType.Leave, {
          actorId: account.id,
          actorName: account.username,
        });
        await this.markLeft(tx, account);
        return { left: true, newLeaderId: replacement.accountId };
      }

      await tx.getRepository(ClanMember).delete({ id: member.id });
      await this.postSystemMessage(tx, clanId, ClanChatMessageType.Leave, {
        actorId: account.id,
        actorName: account.username,
      });
      await this.markLeft(tx, account);
      return { left: true };
    });
  }

  private async setClanCooldown(tx: any, accountId: number, durationMs: number) {
    await tx.getRepository(Account).update(
      { id: accountId },
      { clanCooldownUntil: new Date(Date.now() + durationMs) },
    );
  }

  private async markLeft(tx: any, account: Account) {
    await this.setClanCooldown(tx, account.id, clanLeaveCooldownMs);
  }

  async kickMember(actor: Account, clanId: number, targetAccountId: number) {
    if (actor.id === targetAccountId) {
      throw new BadRequestException('Use the leave endpoint to remove yourself');
    }
    const actorMember = await this.requireMemberOf(actor.id, clanId);
    const targetMember = await this.members.findOne({ where: { accountId: targetAccountId, clanId } });
    if (!targetMember) throw new NotFoundException('That member is not in this clan');

    if (targetMember.role === ClanRole.Leader) {
      throw new ForbiddenException('You cannot kick the leader');
    }
    if (targetMember.role === ClanRole.CoLeader && actorMember.role !== ClanRole.Leader) {
      throw new ForbiddenException('Only the leader can kick a co-leader');
    }
    if (actorMember.role > ClanRole.CoLeader) {
      throw new ForbiddenException('Only leaders and co-leaders can kick');
    }

    const targetAccount = await this.accounts.findOne({ where: { id: targetAccountId } });

    return this.dataSource.transaction(async (tx) => {
      await tx.getRepository(ClanMember).delete({ id: targetMember.id });
      if (targetAccount) {
        await this.setClanCooldown(tx, targetAccount.id, clanKickCooldownMs);
      }
      await this.postSystemMessage(tx, clanId, ClanChatMessageType.Kick, {
        actorId: actor.id,
        actorName: actor.username,
        targetId: targetAccountId,
        targetName: targetAccount?.username ?? 'Unknown',
      });
      return { kicked: true };
    });
  }

  async changeRole(actor: Account, clanId: number, targetAccountId: number, newRole: ClanRole) {
    const actorMember = await this.requireMemberOf(actor.id, clanId);
    if (actor.id === targetAccountId) throw new BadRequestException('You cannot change your own role');

    const targetMember = await this.members.findOne({ where: { accountId: targetAccountId, clanId } });
    if (!targetMember) throw new NotFoundException('That member is not in this clan');

    if (targetMember.role === ClanRole.Leader) {
      throw new ForbiddenException('You cannot change the leader\'s role');
    }
    if (![ClanRole.CoLeader, ClanRole.Elite, ClanRole.Member].includes(newRole)) {
      throw new BadRequestException('Invalid role');
    }
    if (newRole === ClanRole.CoLeader && actorMember.role !== ClanRole.Leader) {
      throw new ForbiddenException('Only the leader can promote to co-leader');
    }
    if (actorMember.role > ClanRole.CoLeader) {
      throw new ForbiddenException('You do not have permission to change roles');
    }
    if (targetMember.role === ClanRole.CoLeader && actorMember.role !== ClanRole.Leader) {
      throw new ForbiddenException('Only the leader can demote a co-leader');
    }

    const messageType = newRole < targetMember.role ? ClanChatMessageType.Promote : ClanChatMessageType.Demote;
    const targetAccount = await this.accounts.findOne({ where: { id: targetAccountId } });
    const roleLabelMap: Record<number, string> = {
      [ClanRole.Leader]: 'Leader',
      [ClanRole.CoLeader]: 'Co-Leader',
      [ClanRole.Elite]: 'Elite',
      [ClanRole.Member]: 'Member',
    };

    return this.dataSource.transaction(async (tx) => {
      targetMember.role = newRole;
      await tx.getRepository(ClanMember).save(targetMember);
      await this.postSystemMessage(tx, clanId, messageType, {
        actorId: actor.id,
        actorName: actor.username,
        targetId: targetAccountId,
        targetName: targetAccount?.username ?? 'Unknown',
        newRole,
        newRoleLabel: roleLabelMap[newRole],
      });
      return { ok: true };
    });
  }

  async transferLeadership(actor: Account, clanId: number, targetAccountId: number) {
    const actorMember = await this.requireMemberOf(actor.id, clanId);
    if (actorMember.role !== ClanRole.Leader) {
      throw new ForbiddenException('Only the leader can transfer leadership');
    }
    if (actor.id === targetAccountId) {
      throw new BadRequestException('You are already the leader');
    }
    const target = await this.members.findOne({ where: { accountId: targetAccountId, clanId } });
    if (!target) throw new NotFoundException('That member is not in this clan');

    return this.dataSource.transaction(async (tx) => {
      actorMember.role = ClanRole.CoLeader;
      target.role = ClanRole.Leader;
      await tx.getRepository(ClanMember).save([actorMember, target]);
      await tx.getRepository(Clan).update({ id: clanId }, { leaderId: target.accountId });
      return { ok: true };
    });
  }

  async disband(actor: Account, clanId: number) {
    const actorMember = await this.requireMemberOf(actor.id, clanId);
    if (actorMember.role !== ClanRole.Leader) {
      throw new ForbiddenException('Only the leader can disband the clan');
    }
    const memberCount = await this.countMembers(clanId);
    if (memberCount > 1) {
      throw new ForbiddenException('You can only disband a clan when you are the only member');
    }
    return this.dataSource.transaction(async (tx) => {
      await tx.getRepository(Clan).delete({ id: clanId });
      await this.setClanCooldown(tx, actor.id, clanLeaveCooldownMs);
      return { disbanded: true };
    });
  }


  async editClan(actor: Account, clanId: number, body: {
    description?: string;
    frameId?: number;
    iconId?: number;
    frameColor?: string;
    iconColor?: string;
    status?: ClanStatus;
    xpRequirement?: number;
    masteryRequirement?: number;
  }) {
    const actorMember = await this.requireMemberOf(actor.id, clanId);
    this.requireRoleAtLeast(actorMember.role, ClanRole.CoLeader);

    const clan = await this.getClanOrThrow(clanId);
    const updates: Partial<Clan> = {};

    if (body.description !== undefined) {
      const desc = (body.description || '').trim();
      if (desc.length > clanDescriptionMax) {
        throw new BadRequestException(`Description must be at most ${clanDescriptionMax} characters`);
      }
      if (desc && containsProfanity(desc)) {
        throw new BadRequestException('Description contains a bad word');
      }
      updates.description = desc;
    }
    if (body.frameId !== undefined) {
      if (!allowedFrameIds.includes(body.frameId)) throw new BadRequestException('Invalid frame');
      updates.frameId = body.frameId;
    }
    if (body.iconId !== undefined) {
      if (!allowedIconIds.includes(body.iconId)) throw new BadRequestException('Invalid icon');
      updates.iconId = body.iconId;
    }
    if (body.frameColor !== undefined) {
      if (!allowedFrameColors.includes(body.frameColor)) throw new BadRequestException('Invalid color');
      updates.frameColor = body.frameColor;
    }
    if (body.iconColor !== undefined) {
      if (!allowedIconColors.includes(body.iconColor)) throw new BadRequestException('Invalid icon color');
      updates.iconColor = body.iconColor;
    }
    if (body.status !== undefined) {
      if (![ClanStatus.Public, ClanStatus.Request, ClanStatus.Private].includes(body.status)) {
        throw new BadRequestException('Invalid status');
      }
      updates.status = body.status;
    }
    if (body.xpRequirement !== undefined) {
      if (!allowedXpRequirements.includes(body.xpRequirement)) throw new BadRequestException('Invalid xp requirement');
      updates.xpRequirement = body.xpRequirement;
    }
    if (body.masteryRequirement !== undefined) {
      if (!allowedMasteryRequirements.includes(body.masteryRequirement)) throw new BadRequestException('Invalid mastery requirement');
      updates.masteryRequirement = body.masteryRequirement;
    }

    await this.clans.update({ id: clanId }, updates);
    const fresh = await this.getClanOrThrow(clanId);
    const memberCount = await this.countMembers(clanId);
    const leaderUsername = await this.getLeaderUsername(fresh.leaderId);
    return this.toSummary(fresh, memberCount, leaderUsername);
  }

  private async batchLeaderUsernames(leaderIds: number[]): Promise<Map<number, string>> {
    if (leaderIds.length === 0) return new Map();
    const rows = await this.accounts.createQueryBuilder('a')
      .select(['a.id AS id', 'a.username AS username'])
      .where('a.id IN (:...ids)', { ids: leaderIds })
      .getRawMany();
    const map = new Map<number, string>();
    for (const r of rows) map.set(Number(r.id), r.username);
    return map;
  }

  async listRecommended(account: Account, opts: { seed?: number; showRequest?: boolean }) {
    const showRequest = !!opts.showRequest;
    const statuses: ClanStatus[] = showRequest
      ? [ClanStatus.Public, ClanStatus.Request]
      : [ClanStatus.Public];

    const xp = account.xp ?? 0;
    const mastery = account.mastery ?? 0;

    const qb = this.clans.createQueryBuilder('c')
      .where('c.status IN (:...statuses)', { statuses })
      .andWhere('c.xpRequirement <= :xp', { xp })
      .andWhere('c.masteryRequirement <= :mastery', { mastery })
      .orderBy('c.created_at', 'DESC')
      .limit(100);

    const candidates = await qb.getMany();
    const memberCounts = await this.batchMemberCounts(candidates.map((c) => c.id));

    const seed = opts.seed ?? Math.floor(Date.now() / 60000);
    const shuffled = stableShuffle(candidates, seed)
      .filter((c) => (memberCounts.get(c.id) ?? 0) < clanMemberCap)
      .slice(0, recommendedClanLimit);

    const leaderNames = await this.batchLeaderUsernames(shuffled.map((c) => c.leaderId));
    return shuffled.map((c) => this.toSummary(c, memberCounts.get(c.id) ?? 0, leaderNames.get(c.leaderId)));
  }

  async search(query: string, by: 'tag' | 'name') {
    const q = (query || '').trim();
    if (!q) return [];
    const column = by === 'tag' ? 'c.tag' : 'c.name';
    const clans = await this.clans.createQueryBuilder('c')
      .where(`LOWER(${column}) LIKE LOWER(:q)`, { q: `${q}%` })
      .limit(50)
      .getMany();
    const memberCounts = await this.batchMemberCounts(clans.map((c) => c.id));
    const leaderNames = await this.batchLeaderUsernames(clans.map((c) => c.leaderId));
    return clans.map((c) => this.toSummary(c, memberCounts.get(c.id) ?? 0, leaderNames.get(c.leaderId)));
  }

  async leaderboard(sort: 'xp' | 'mastery') {
    const column = sort === 'mastery' ? 'c.clanMastery' : 'c.clanXp';
    const clans = await this.clans.createQueryBuilder('c')
      .orderBy(column, 'DESC')
      .limit(leaderboardLimit)
      .getMany();
    const memberCounts = await this.batchMemberCounts(clans.map((c) => c.id));
    const leaderNames = await this.batchLeaderUsernames(clans.map((c) => c.leaderId));
    return clans.map((c) => this.toSummary(c, memberCounts.get(c.id) ?? 0, leaderNames.get(c.leaderId)));
  }

  private async batchMemberCounts(clanIds: number[]): Promise<Map<number, number>> {
    if (clanIds.length === 0) return new Map();
    const rows = await this.members.createQueryBuilder('m')
      .select('m.clanId', 'clanId')
      .addSelect('COUNT(*)', 'count')
      .where('m.clanId IN (:...ids)', { ids: clanIds })
      .groupBy('m.clanId')
      .getRawMany();
    const map = new Map<number, number>();
    for (const r of rows) {
      map.set(Number(r.clanId), Number(r.count));
    }
    return map;
  }


  async getClanProfile(clanId: number, sort: 'role' | 'xp' | 'mastery' | 'joined' = 'xp') {
    const clan = await this.getClanOrThrow(clanId);

    const rows: any[] = await this.members.createQueryBuilder('m')
      .leftJoin('m.account', 'a')
      .select([
        'm.accountId AS "accountId"',
        'a.username AS username',
        'm.role AS role',
        'm.joined_at AS "joined_at"',
        'm.contributedXp AS "contributedXp"',
        'a.xp AS xp',
        'a.mastery AS mastery',
        'a.skins AS skins',
      ])
      .where('m.clanId = :id', { id: clanId })
      .getRawMany();

    const memberSummaries: ClanMemberSummary[] = rows.map((r) => ({
      accountId: Number(r.accountId),
      username: r.username,
      role: Number(r.role),
      joined_at: new Date(r.joined_at),
      contributedXp: Number(r.contributedXp ?? 0),
      xp: Number(r.xp ?? 0),
      mastery: Number(r.mastery ?? 0),
      skinId: r.skins?.equipped ?? 1,
    }));

    const sortFns: Record<string, (a: ClanMemberSummary, b: ClanMemberSummary) => number> = {
      role: (a, b) => a.role - b.role,
      xp: (a, b) => b.xp - a.xp,
      mastery: (a, b) => b.mastery - a.mastery,
      joined: (a, b) => a.joined_at.getTime() - b.joined_at.getTime(),
    };
    memberSummaries.sort(sortFns[sort] ?? sortFns.xp);

    let pendingRequests: { id: number; accountId: number; username: string; created_at: Date }[] = [];
    const reqRows: any[] = await this.requests.createQueryBuilder('r')
      .leftJoin('r.account', 'a')
      .select(['r.id AS id', 'r.accountId AS "accountId"', 'a.username AS username', 'r.created_at AS "created_at"'])
      .where('r.clanId = :id', { id: clanId })
      .getRawMany();
    pendingRequests = reqRows.map((r) => ({
      id: Number(r.id),
      accountId: Number(r.accountId),
      username: r.username,
      created_at: new Date(r.created_at),
    }));

    const leaderUsername = await this.getLeaderUsername(clan.leaderId);
    return {
      ...this.toSummary(clan, memberSummaries.length, leaderUsername),
      members: memberSummaries,
      pendingRequests,
    };
  }


  async getChatHistory(account: Account, clanId: number, before?: number) {
    await this.requireMemberOf(account.id, clanId);
    const qb = this.messages.createQueryBuilder('m')
      .leftJoin('m.account', 'a')
      .select([
        'm.id AS id',
        'm.clanId AS "clanId"',
        'm.accountId AS "accountId"',
        'a.username AS username',
        'a.skins AS skins',
        'm.content AS content',
        'm.type AS type',
        'm.metadata AS metadata',
        'm.created_at AS "created_at"',
      ])
      .where('m.clanId = :id', { id: clanId })
      .orderBy('m.id', 'DESC')
      .limit(clanChatHistoryLimit);
    if (before) qb.andWhere('m.id < :before', { before });

    const rows = await qb.getRawMany();
    return rows
      .map((r) => ({
        id: Number(r.id),
        clanId: Number(r.clanId),
        accountId: r.accountId !== null ? Number(r.accountId) : null,
        username: r.username ?? null,
        skinId: r.skins?.equipped ?? null,
        content: r.content,
        type: Number(r.type),
        metadata: r.metadata,
        created_at: new Date(r.created_at),
      }))
      .reverse();
  }

  async postChat(account: Account, clanId: number, rawContent: string) {
    await this.requireMemberOf(account.id, clanId);
    const content = sanitizeChatContent(rawContent);
    if (!content) throw new BadRequestException('Message is empty');
    if (content.length > clanChatMaxLength) {
      throw new BadRequestException(`Message must be at most ${clanChatMaxLength} characters`);
    }
    if (containsProfanity(content)) {
      throw new BadRequestException('Message contains a bad word');
    }
    const msg = this.messages.create({
      clanId,
      accountId: account.id,
      content,
      type: ClanChatMessageType.User,
      metadata: null,
    });
    const saved = await this.messages.save(msg);
    await this.trimChatHistory(clanId);
    return {
      id: saved.id,
      clanId,
      accountId: account.id,
      username: account.username,
      content,
      type: ClanChatMessageType.User,
      metadata: null,
      created_at: saved.created_at,
    };
  }

  private async postSystemMessage(
    tx: any,
    clanId: number,
    type: ClanChatMessageType,
    metadata: Record<string, any>,
  ) {
    const repo = tx.getRepository(ClanChatMessage);
    const msg = repo.create({
      clanId,
      accountId: null,
      type,
      content: this.systemMessageContent(type, metadata),
      metadata,
    });
    await repo.save(msg);
  }

  private systemMessageContent(type: ClanChatMessageType, metadata: Record<string, any>): string {
    switch (type) {
      case ClanChatMessageType.Create: return `${metadata.actorName} created the clan ${metadata.clanName}!`;
      case ClanChatMessageType.Join: return `${metadata.actorName} joined the clan`;
      case ClanChatMessageType.Leave: return `${metadata.actorName} left the clan`;
      case ClanChatMessageType.Kick: return `${metadata.targetName} was kicked by ${metadata.actorName}`;
      case ClanChatMessageType.Promote: return `${metadata.targetName} was promoted to ${metadata.newRoleLabel} by ${metadata.actorName}`;
      case ClanChatMessageType.Demote: return `${metadata.targetName} was demoted to ${metadata.newRoleLabel} by ${metadata.actorName}`;
      case ClanChatMessageType.Bank: return `${metadata.actorName} added ${metadata.amount} to the clan bank`;
      default: return '';
    }
  }

  private async trimChatHistory(clanId: number) {
    const keep = clanChatHistoryLimit * 4;
    const newest = await this.messages.find({
      where: { clanId },
      order: { id: 'DESC' },
      take: keep + 1,
      select: ['id'],
    });
    if (newest.length <= keep) return;
    const cutoffId = newest[keep].id;
    await this.messages.createQueryBuilder()
      .delete()
      .where('clanId = :clanId AND id <= :cutoff', { clanId, cutoff: cutoffId })
      .execute();
  }
}

function stableShuffle<T>(input: T[], seed: number): T[] {
  const arr = [...input];
  let s = seed >>> 0;
  for (let i = arr.length - 1; i > 0; i--) {
    s = (s * 1664525 + 1013904223) >>> 0;
    const j = s % (i + 1);
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}
