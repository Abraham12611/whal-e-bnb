import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { WhaleDiscoveryModule } from './whale-discovery/whale-discovery.module';
import { AiAnalysisModule } from './ai-analysis/ai-analysis.module';
import { TradeExecutionModule } from './trade-execution/trade-execution.module';
import { WebhooksModule } from './webhooks/webhooks.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    ScheduleModule.forRoot(),
    WhaleDiscoveryModule,
    AiAnalysisModule,
    TradeExecutionModule,
    WebhooksModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
