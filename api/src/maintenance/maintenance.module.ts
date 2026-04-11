import { Module } from '@nestjs/common';
import { MaintenanceController } from './maintenance.controller';
import { MaintenanceService } from './maintenance.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AllowedIp } from './allowedIp.entity';

@Module({
  imports: [TypeOrmModule.forFeature([AllowedIp])],
  controllers: [MaintenanceController],
  exports: [MaintenanceService],
  providers: [MaintenanceService],
})
export class MaintenanceModule {}
