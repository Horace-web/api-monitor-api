import { Module } from '@nestjs/common';
import { PrismaModule } from '@/prisma/prisma.module';
import { CheckResultsController } from './check-results.controller';
import { CheckResultsService } from './check-results.service';

@Module({
  imports: [PrismaModule],
  controllers: [CheckResultsController],
  providers: [CheckResultsService],
  exports: [CheckResultsService],
})
export class CheckResultsModule {}
