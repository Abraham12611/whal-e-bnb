import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { request, gql } from 'graphql-request';
import { ConfigService } from '@nestjs/config';

export interface Whale {
  address: string;
  winRate: number;
  totalVolume: number;
  totalTrades: number;
  successfulTrades: number;
  avgTradeSize: number;
  riskScore: number;
  lastTradeTimestamp: number;
  isActive: boolean;
}

@Injectable()
export class WhaleDiscoveryService {
  private readonly logger = new Logger(WhaleDiscoveryService.name);
  private whales: Map<string, Whale> = new Map();
  private subgraphUrl: string;

  constructor(private configService: ConfigService) {
    this.subgraphUrl = this.configService.get<string>('SUBGRAPH_URL') || 
      'https://api.studio.thegraph.com/query/YOUR_DEPLOYMENT/whal-e';
  }

  async onModuleInit() {
    this.logger.log('🐋 Whale Discovery Service initialized');
    await this.discoverWhales();
  }

  @Cron(CronExpression.EVERY_15_MINUTES)
  async handleCron() {
    this.logger.log('🔍 Running scheduled whale discovery...');
    await this.discoverWhales();
  }

  async discoverWhales(): Promise<Whale[]> {
    const query = gql`
      query GetTopTraders {
        whales(
          where: { 
            totalVolumeUSD_gt: "10000",
            totalTrades_gt: "10"
          }
          orderBy: winRate
          orderDirection: desc
          first: 100
        ) {
          id
          winRate
          totalVolumeUSD
          totalTrades
          successfulTrades
          lastTradeTimestamp
          isActive
        }
      }
    `;

    try {
      const data = await request(this.subgraphUrl, query);
      const qualifiedWhales: Whale[] = [];

      for (const w of data.whales) {
        const winRate = parseFloat(w.winRate);
        const totalTrades = parseInt(w.totalTrades);
        const totalVolume = parseFloat(w.totalVolumeUSD);

        // Filter qualified whales
        if (winRate > 0.55 && totalTrades > 20) {
          const whale: Whale = {
            address: w.id,
            winRate,
            totalVolume,
            totalTrades,
            successfulTrades: parseInt(w.successfulTrades),
            avgTradeSize: totalVolume / totalTrades,
            riskScore: this.calculateRiskScore(winRate, totalTrades, totalVolume),
            lastTradeTimestamp: parseInt(w.lastTradeTimestamp),
            isActive: w.isActive
          };

          this.whales.set(w.id, whale);
          qualifiedWhales.push(whale);
        }
      }

      this.logger.log(`✅ Discovered ${qualifiedWhales.length} qualified whales`);
      return qualifiedWhales;

    } catch (error) {
      this.logger.error('❌ Whale discovery failed:', error.message);
      return Array.from(this.whales.values());
    }
  }

  private calculateRiskScore(
    winRate: number, 
    totalTrades: number, 
    volume: number
  ): number {
    let score = 50; // Base score

    // Win rate weight (40%)
    score += winRate * 40;

    // Experience weight (30%) - more trades = more reliable
    score += Math.min(totalTrades / 100, 1) * 30;

    // Volume weight (30%) - higher volume = more serious
    score += Math.min(volume / 100000, 1) * 30;

    return Math.min(100, Math.max(0, score));
  }

  getAllWhales(): Whale[] {
    return Array.from(this.whales.values())
      .sort((a, b) => b.winRate - a.winRate);
  }

  getTopWhales(limit: number = 10): Whale[] {
    return this.getAllWhales().slice(0, limit);
  }

  getWhale(address: string): Whale | undefined {
    return this.whales.get(address.toLowerCase());
  }

  getActiveWhales(): Whale[] {
    return this.getAllWhales().filter(w => w.isActive);
  }

  // For testing/demo purposes
  async getMockWhales(): Promise<Whale[]> {
    const mockWhales: Whale[] = [
      {
        address: '0x742d35Cc6634C0532925a3b8D4C9db96590f6C7E',
        winRate: 0.68,
        totalVolume: 452000,
        totalTrades: 145,
        successfulTrades: 99,
        avgTradeSize: 3117,
        riskScore: 78,
        lastTradeTimestamp: Date.now() / 1000 - 300,
        isActive: true
      },
      {
        address: '0x8ba1f109551bD432803012645Hac136c82C3e8C',
        winRate: 0.72,
        totalVolume: 891000,
        totalTrades: 234,
        successfulTrades: 169,
        avgTradeSize: 3808,
        riskScore: 85,
        lastTradeTimestamp: Date.now() / 1000 - 600,
        isActive: true
      },
      {
        address: '0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984',
        winRate: 0.61,
        totalVolume: 223000,
        totalTrades: 89,
        successfulTrades: 54,
        avgTradeSize: 2506,
        riskScore: 65,
        lastTradeTimestamp: Date.now() / 1000 - 1200,
        isActive: true
      }
    ];

    mockWhales.forEach(w => this.whales.set(w.address.toLowerCase(), w));
    return mockWhales;
  }
}
