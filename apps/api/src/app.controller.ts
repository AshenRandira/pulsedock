import { Controller, Get } from '@nestjs/common';

@Controller()
export class AppController {
  @Get()
  getRoot(): { app: string; status: string } {
    return {
      app: 'PulseDock API',
      status: 'running',
    };
  }

  @Get('health')
  getHealth(): { status: string; service: string; timestamp: string } {
    return {
      status: 'ok',
      service: 'pulsedock-api',
      timestamp: new Date().toISOString(),
    };
  }
}
