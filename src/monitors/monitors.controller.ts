import {
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
import { CreateMonitorDto } from './dto/create-monitor.dto';

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
    @Body() body: CreateMonitorDto,
    @CurrentUser() user: SupabaseUser,
  ) {
    const monitor = await this.monitorsService.create(user, {
      serviceId: body.serviceId,
      name: body.name.trim(),
      url: new URL(body.url).toString(),
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
