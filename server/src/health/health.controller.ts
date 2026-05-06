import { Controller, Get } from '@nestjs/common';
import { Public } from '../common/decorators/public.decorator';
import pkg from '../../package.json';

@Controller('health')
export class HealthController {
  private readonly startedAt = Date.now();

  @Public()
  @Get()
  check() {
    return {
      status: 'ok',
      service: pkg.name,
      version: pkg.version,
      uptimeSec: Math.floor((Date.now() - this.startedAt) / 1000),
      timestamp: new Date().toISOString(),
    };
  }
}
