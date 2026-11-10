import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Public } from '../../common/decorators/public.decorator.js';

@ApiTags('health')
@Public()
@Controller('health')
export class HealthController {
  /** Liveness check. */
  @Get()
  check(): { status: string } {
    return { status: 'ok' };
  }
}
