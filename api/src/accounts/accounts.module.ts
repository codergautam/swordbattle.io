import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AccountsService } from './accounts.service';
import { Account } from './account.entity';
import { AccountsController } from './accounts.controller';
import { StatsModule } from '../stats/stats.module';
import { TransactionModule } from 'src/transactions/transactions.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Account]),
    forwardRef(() => TransactionModule),
    forwardRef(() => StatsModule),
  ],
  providers: [AccountsService],
  exports: [AccountsService],
  controllers: [AccountsController],
})
export class AccountsModule {}
