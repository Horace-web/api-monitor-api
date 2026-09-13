import { Module } from '@nestjs/common';
import { PrismaModule } from '@/prisma/prisma.module';
import { MonitoringService } from './monitoring.service';

@Module({
  imports: [PrismaModule],
  providers: [MonitoringService],
  exports: [MonitoringService],
})
export class MonitoringModule {}
