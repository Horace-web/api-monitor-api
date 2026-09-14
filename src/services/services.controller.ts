import {
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Body,
  UseGuards,
  NotFoundException,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '@/auth/current-user.decorator';
import { SupabaseAuthGuard } from '@/auth/supabase-auth.guard';
import { SupabaseUser } from '@/auth/supabase-auth.service';
import { ServicesService } from './services.service';
import { CreateServiceDto } from './dto/create-service.dto';

@ApiTags('services')
@ApiBearerAuth()
@UseGuards(SupabaseAuthGuard)
@Controller('services')
export class ServicesController {
  constructor(private readonly servicesService: ServicesService) {}

  @Get()
  findAll(@CurrentUser() user: SupabaseUser) {
    return this.servicesService.findAll(user);
  }

  @Get(':id')
  async findOne(@Param('id') id: string, @CurrentUser() user: SupabaseUser) {
    const service = await this.servicesService.findOne(id, user);

    if (!service) {
      throw new NotFoundException('Service not found');
    }

    return service;
  }

  @Post()
  create(
    @Body() body: CreateServiceDto,
    @CurrentUser() user: SupabaseUser,
  ) {
    return this.servicesService.create(user, {
      name: body.name.trim(),
      description: body.description?.trim(),
    });
  }

  @Delete(':id')
  async remove(@Param('id') id: string, @CurrentUser() user: SupabaseUser) {
    const service = await this.servicesService.remove(id, user);

    if (!service) {
      throw new NotFoundException('Service not found');
    }

    return { message: 'Service deleted successfully' };
  }
}
