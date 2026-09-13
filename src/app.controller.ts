import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

@ApiTags('Health')
@Controller('health')
export class AppController {
  @Get()
  @ApiOperation({ summary: 'Vérifie que l’API est disponible' })
  @ApiResponse({ status: 200, description: 'API opérationnelle.' })
  getHealth() {
    return {
      status: 'ok',
      service: 'api-monitor-api',
      timestamp: new Date().toISOString(),
    };
  }
}
