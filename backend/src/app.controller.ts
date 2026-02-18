import { Controller, Get, Post, Body, Param, Query } from '@nestjs/common';
import { AppService } from './app.service';
import { WhaleDiscoveryService } from './whale-discovery/whale-discovery.service';
import { AiAnalysisService } from './ai-analysis/ai-analysis.service';

@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    private readonly whaleService: WhaleDiscoveryService,
    private readonly aiService: AiAnalysisService
  ) {}

  @Get('health')
  getHealth(): { status: string; timestamp: string } {
    return {
      status: 'healthy',
      timestamp: new Date().toISOString()
    };
  }

  @Get('whales')
  getWhales(@Query('limit') limit?: string) {
    const whales = this.whaleService.getTopWhales(
      limit ? parseInt(limit) : 10
    );
    return {
      count: whales.length,
      whales
    };
  }

  @Get('whales/:address')
  getWhale(@Param('address') address: string) {
    const whale = this.whaleService.getWhale(address);
    if (!whale) {
      return { error: 'Whale not found' };
    }
    return whale;
  }

  @Post('analyze')
  async analyzeTrade(@Body() body: {
    whaleAddress: string;
    tokenIn: string;
    tokenOut: string;
    amount: number;
    userBalance: number;
  }) {
    const whale = this.whaleService.getWhale(body.whaleAddress);
    if (!whale) {
      return { error: 'Whale not found' };
    }

    const recommendation = await this.aiService.analyzeWithHeuristics(
      {
        address: whale.address,
        winRate30d: whale.winRate,
        winRate7d: whale.winRate * 0.95, // Slightly lower for 7d
        totalTrades: whale.totalTrades,
        successfulTrades: whale.successfulTrades,
        avgTradeSize: whale.avgTradeSize,
        totalVolumeUSD: whale.totalVolume,
        sharpeRatio: 1.5,
        maxDrawdown: 0.15
      },
      {
        tokenIn: { symbol: 'BNB', address: body.tokenIn, price: 675 },
        tokenOut: { symbol: 'USDT', address: body.tokenOut, price: 1 },
        amountUSD: body.amount,
        slippage: 0.5
      },
      {
        balance: body.userBalance,
        currentPortfolio: {},
        riskTolerance: 'MEDIUM'
      }
    );

    return recommendation;
  }

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }
}
