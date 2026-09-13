import { Module } from '@nestjs/common';
import { PrismaModule } from '@/prisma/prisma.module';
import { AuthModule } from '@/auth/auth.module';
import { MonitorsController } from './monitors.controller';
import { MonitorsService } from './monitors.service';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [MonitorsController],
  providers: [MonitorsService],
  exports: [MonitorsService],
})
export class MonitorsModule {}
