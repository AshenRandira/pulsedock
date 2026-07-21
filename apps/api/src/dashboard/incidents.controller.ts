import { Controller, Get, Query } from '@nestjs/common';
import { PaginationQueryDto } from './dto/pagination-query.dto';
import { DashboardService } from './dashboard.service';

@Controller('incidents')
export class IncidentsController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get()
  getIncidents(@Query() query: PaginationQueryDto) {
    return this.dashboardService.getIncidents(query.limit);
  }
}
