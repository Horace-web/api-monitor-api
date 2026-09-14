import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

@ApiTags('Health')
@Controller()
export class AppController {
  @Get()
  @ApiOperation({ summary: 'Informations de base sur l’API' })
  @ApiResponse({ status: 200, description: 'API Monitor API opérationnelle.' })
  getRoot() {
    return {
      service: 'api-monitor-api',
      status: 'ok',
      message: 'API Monitor API is running.',
      documentation: '/docs',
      health: '/health',
      timestamp: new Date().toISOString(),
    };
  }

  @Get('health')
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
