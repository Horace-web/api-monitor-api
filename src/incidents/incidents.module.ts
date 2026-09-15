import { Module } from '@nestjs/common';
import { PrismaModule } from '@/prisma/prisma.module';
import { AuthModule } from '@/auth/auth.module';
import { IncidentsController } from './incidents.controller';
import { IncidentsService } from './incidents.service';
import { NotificationService } from './notification.service';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [IncidentsController],
  providers: [IncidentsService, NotificationService],
  exports: [IncidentsService],
})
export class IncidentsModule {}
