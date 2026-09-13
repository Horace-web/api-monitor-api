import { Module } from '@nestjs/common';
import { CommonModule } from '@/common/common.module';
import { PrismaModule } from '@/prisma/prisma.module';
import { MonitoringService } from './monitoring.service';

@Module({
  imports: [PrismaModule, CommonModule],
  providers: [MonitoringService],
  exports: [MonitoringService],
})
export class MonitoringModule {}
