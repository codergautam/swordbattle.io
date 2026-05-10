import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AccountsService } from './accounts.service';
import { Account } from './account.entity';
import { AccountsController } from './accounts.controller';
import { StatsModule } from '../stats/stats.module';
import { TransactionModule } from 'src/transactions/transactions.module';
import { AuthModule } from 'src/auth/auth.module';
import { CosmeticsModule } from 'src/cosmetics/cosmetics.module';
import { ClansModule } from 'src/clans/clans.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Account]),
    forwardRef(() => TransactionModule),
    forwardRef(() => StatsModule),
    forwardRef(() => AuthModule),
    CosmeticsModule,
    forwardRef(() => ClansModule),
  ],
  providers: [AccountsService],
  exports: [AccountsService],
  controllers: [AccountsController],
})
export class AccountsModule {}
