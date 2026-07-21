import { Controller, Get } from '@nestjs/common';
import { DashboardService } from './dashboard.service';

@Controller('status')
export class PublicStatusController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get()
  getStatus() {
    return this.dashboardService.getPublicStatus();
  }
}
