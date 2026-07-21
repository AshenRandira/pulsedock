import { Controller, Param, Post } from '@nestjs/common';
import { HealthChecksService } from './health-checks.service';

@Controller('monitors')
export class HealthChecksController {
  constructor(private readonly healthChecksService: HealthChecksService) {}

  @Post(':id/check')
  check(@Param('id') id: string) {
    return this.healthChecksService.checkMonitor(id);
  }
}
