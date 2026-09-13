import { Module } from '@nestjs/common';
import { AppController } from '../app.controller';
import { TargetUrlService } from './target-url.service';

@Module({
  controllers: [AppController],
  providers: [TargetUrlService],
  exports: [TargetUrlService],
})
export class CommonModule {}
