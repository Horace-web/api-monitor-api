import { Controller, Get, ParseIntPipe, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '@/auth/current-user.decorator';
import { SupabaseAuthGuard } from '@/auth/supabase-auth.guard';
import { SupabaseUser } from '@/auth/supabase-auth.service';
import { IncidentsService } from './incidents.service';

@ApiTags('alerts')
@ApiBearerAuth()
@UseGuards(SupabaseAuthGuard)
@Controller('alerts')
export class IncidentsController {
  constructor(private readonly incidentsService: IncidentsService) {}

  @Get()
  findAlerts(
    @CurrentUser() user: SupabaseUser,
    @Query('page', new ParseIntPipe({ optional: true })) page?: number,
    @Query('limit', new ParseIntPipe({ optional: true })) limit?: number,
  ) {
    return this.incidentsService.findAlerts(user, page, limit);
  }
}
