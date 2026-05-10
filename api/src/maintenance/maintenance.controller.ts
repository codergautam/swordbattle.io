import { Controller, Get, UseGuards } from '@nestjs/common';
import { MaintenanceService } from './maintenance.service';
import { ServerGuard } from 'src/auth/guards/server.guard';

@Controller('maintenance')
export class MaintenanceController {
  constructor(private readonly maintenanceService: MaintenanceService) {}

  @Get('allowed-ips')
  @UseGuards(ServerGuard)
  getAllowedIps() {
    return this.maintenanceService.getAllowedIps();
  }
}
