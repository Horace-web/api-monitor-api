import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  NotFoundException,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '@/auth/current-user.decorator';
import { SupabaseAuthGuard } from '@/auth/supabase-auth.guard';
import { SupabaseUser } from '@/auth/supabase-auth.service';
import { MonitorsService } from './monitors.service';

@ApiTags('monitors')
@ApiBearerAuth()
@UseGuards(SupabaseAuthGuard)
@Controller('monitors')
export class MonitorsController {
  constructor(private readonly monitorsService: MonitorsService) {}

  @Get()
  findAll(
    @CurrentUser() user: SupabaseUser,
    @Query('serviceId') serviceId?: string,
  ) {
    return this.monitorsService.findAll(user, serviceId);
  }

  @Get(':id')
  async findOne(@Param('id') id: string, @CurrentUser() user: SupabaseUser) {
    const monitor = await this.monitorsService.findOne(id, user);
    if (!monitor) throw new NotFoundException('Monitor not found');
    return monitor;
  }

  @Post()
  async create(
    @Body()
    body: {
      serviceId?: string;
      name?: string;
      url?: string;
      timeout?: number;
      expectedStatus?: number;
      interval?: number;
    },
    @CurrentUser() user: SupabaseUser,
  ) {
    if (!body.serviceId || !body.name || !body.url) {
      throw new BadRequestException('serviceId, name and url are required');
    }

    let parsedUrl: URL;
    try {
      parsedUrl = new URL(body.url);
    } catch {
      throw new BadRequestException('url must be a valid URL');
    }

    if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
      throw new BadRequestException('Only HTTP and HTTPS URLs are supported');
    }

    if (body.interval !== undefined && body.interval < 60) {
      throw new BadRequestException('interval must be at least 60 seconds');
    }

    if (body.timeout !== undefined && body.timeout <= 0) {
      throw new BadRequestException('timeout must be greater than 0');
    }

    if (
      body.expectedStatus !== undefined &&
      (body.expectedStatus < 100 || body.expectedStatus > 599)
    ) {
      throw new BadRequestException('expectedStatus must be between 100 and 599');
    }

    const monitor = await this.monitorsService.create(user, {
      serviceId: body.serviceId,
      name: body.name.trim(),
      url: parsedUrl.toString(),
      timeout: body.timeout,
      expectedStatus: body.expectedStatus,
      interval: body.interval,
    });

    if (!monitor) throw new NotFoundException('Service not found');
    return monitor;
  }

  @Post(':id/activate')
  async activate(@Param('id') id: string, @CurrentUser() user: SupabaseUser) {
    const monitor = await this.monitorsService.updateStatus(id, user, true);
    if (!monitor) throw new NotFoundException('Monitor not found');
    return monitor;
  }

  @Post(':id/deactivate')
  async deactivate(@Param('id') id: string, @CurrentUser() user: SupabaseUser) {
    const monitor = await this.monitorsService.updateStatus(id, user, false);
    if (!monitor) throw new NotFoundException('Monitor not found');
    return monitor;
  }

  @Delete(':id')
  async remove(@Param('id') id: string, @CurrentUser() user: SupabaseUser) {
    const monitor = await this.monitorsService.remove(id, user);
    if (!monitor) throw new NotFoundException('Monitor not found');
    return { message: 'Monitor deleted successfully' };
  }
}
