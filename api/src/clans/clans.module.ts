import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ClansService } from './clans.service';
import { ClansController } from './clans.controller';
import { Clan } from './clan.entity';
import { ClanMember } from './clan-member.entity';
import { ClanJoinRequest } from './clan-join-request.entity';
import { ClanChatMessage } from './clan-chat-message.entity';
import { Account } from '../accounts/account.entity';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Clan, ClanMember, ClanJoinRequest, ClanChatMessage, Account]),
    forwardRef(() => AuthModule),
  ],
  providers: [ClansService],
  controllers: [ClansController],
  exports: [ClansService],
})
export class ClansModule {}
