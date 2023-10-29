import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AccountsService } from './accounts.service';
import { Account } from './account.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Account])],
  providers: [AccountsService],
  exports: [AccountsService],
})
export class AccountsModule {}
