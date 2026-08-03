import { Module } from '@nestjs/common';
import { MaintenanceController } from './maintenance.controller';
import { MaintenanceService } from './maintenance.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AllowedIp } from './allowedIp.entity';
import { AllowedAccount } from './allowedAccount.entity';
import { Account } from '../accounts/account.entity';

@Module({
  imports: [TypeOrmModule.forFeature([AllowedIp, AllowedAccount, Account])],
  controllers: [MaintenanceController],
  exports: [MaintenanceService],
  providers: [MaintenanceService],
})
export class MaintenanceModule {}
