import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { ServicesModule } from './services/services.module';
import { MonitorsModule } from './monitors/monitors.module';
import { MonitoringModule } from './monitoring/monitoring.module';
import { CheckResultsModule } from './check-results/check-results.module';
import { IncidentsModule } from './incidents/incidents.module';
import { PrismaModule } from './prisma/prisma.module';
import { CommonModule } from './common/common.module';
import { DashboardModule } from './dashboard/dashboard.module';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    PrismaModule,
    CommonModule,
    AuthModule,
    UsersModule,
    ServicesModule,
    MonitorsModule,
    MonitoringModule,
    CheckResultsModule,
    IncidentsModule,
    DashboardModule,
  ],
})
export class AppModule {}
