import { Controller, Get, Param, Query } from '@nestjs/common';
import { PaginationQueryDto } from './dto/pagination-query.dto';
import { DashboardService } from './dashboard.service';

@Controller('monitors')
export class MonitorHistoryController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get(':id/check-results')
  getCheckResults(@Param('id') id: string, @Query() query: PaginationQueryDto) {
    return this.dashboardService.getMonitorCheckResults(id, query.limit);
  }

  @Get(':id/incidents')
  getIncidents(@Param('id') id: string, @Query() query: PaginationQueryDto) {
    return this.dashboardService.getMonitorIncidents(id, query.limit);
  }
}
