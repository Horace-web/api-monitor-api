import {
  Controller,
  Get,
  NotFoundException,
  Param,
  ParseIntPipe,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '@/auth/current-user.decorator';
import { SupabaseAuthGuard } from '@/auth/supabase-auth.guard';
import { SupabaseUser } from '@/auth/supabase-auth.service';
import { CheckResultsService } from './check-results.service';

@ApiTags('check-results')
@ApiBearerAuth()
@UseGuards(SupabaseAuthGuard)
@Controller('check-results')
export class CheckResultsController {
  constructor(private readonly checkResultsService: CheckResultsService) {}

  @Get('monitor/:monitorId')
  async findByMonitor(
    @Param('monitorId') monitorId: string,
    @CurrentUser() user: SupabaseUser,
    @Query('limit', new ParseIntPipe({ optional: true })) limit?: number,
  ) {
    const results = await this.checkResultsService.findByMonitor(
      monitorId,
      user,
      limit,
    );

    if (!results) {
      throw new NotFoundException('Monitor not found');
    }

    return results;
  }

  @Get('monitor/:monitorId/stats')
  async getStats(
    @Param('monitorId') monitorId: string,
    @CurrentUser() user: SupabaseUser,
  ) {
    const stats = await this.checkResultsService.getStats(monitorId, user);

    if (!stats) {
      throw new NotFoundException('Monitor not found');
    }

    return stats;
  }
}
