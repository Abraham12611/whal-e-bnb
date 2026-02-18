import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

export interface WhaleStats {
  address: string;
  winRate30d: number;
  winRate7d: number;
  totalTrades: number;
  successfulTrades: number;
  avgTradeSize: number;
  totalVolumeUSD: number;
  sharpeRatio: number;
  maxDrawdown: number;
}

export interface TradeDetails {
  tokenIn: {
    symbol: string;
    address: string;
    price: number;
  };
  tokenOut: {
    symbol: string;
    address: string;
    price: number;
  };
  amountUSD: number;
  slippage: number;
}

export interface UserContext {
  balance: number;
  currentPortfolio: { [token: string]: number };
  riskTolerance: 'LOW' | 'MEDIUM' | 'HIGH';
}

export interface MarketConditions {
  bnbPrice: number;
  marketVolatility: number;
  gasPrice: number;
  timestamp: number;
}

export interface TradeRecommendation {
  shouldCopy: boolean;
  confidence: number;
  positionSize: number;
  reasoning: string;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  expectedReturn: number;
  maxLoss: number;
}

@Injectable()
export class AiAnalysisService {
  private readonly logger = new Logger(AiAnalysisService.name);
  private readonly openrouterApiKey: string;
  private readonly apiUrl = 'https://openrouter.ai/api/v1/chat/completions';
  
  // Available free models
  private readonly models = {
    default: 'qwen/qwen3-vl-235b-a22b-thinking',
    fast: 'qwen/qwen3-4b:free',
    reasoning: 'deepseek/deepseek-r1-0528:free',
    oss: 'openai/gpt-oss-120b:free'
  };

  constructor(private configService: ConfigService) {
    this.openrouterApiKey = this.configService.get<string>('OPENROUTER_API_KEY') || '';
    if (!this.openrouterApiKey) {
      this.logger.warn('OPENROUTER_API_KEY not set - AI analysis will not work');
    }
  }

  async analyzeTrade(
    whale: WhaleStats,
    trade: TradeDetails,
    user: UserContext,
    market: MarketConditions
  ): Promise<TradeRecommendation> {
    this.logger.log(`Analyzing trade from whale ${whale.address}`);
    
    const prompt = this.buildAnalysisPrompt(whale, trade, user, market);
    
    try {
      const response = await this.callOpenRouter(prompt, this.models.reasoning);
      return this.parseRecommendation(response);
    } catch (error) {
      this.logger.error('AI analysis failed:', error.message);
      return this.getFallbackRecommendation();
    }
  }

  private buildAnalysisPrompt(
    whale: WhaleStats,
    trade: TradeDetails,
    user: UserContext,
    market: MarketConditions
  ): string {
    return `
You are Whal-E, an expert DeFi trading analyst evaluating whether to copy a whale's trade on BNB Chain.

## WHALE PROFILE
- Address: ${whale.address}
- 30-Day Win Rate: ${(whale.winRate30d * 100).toFixed(1)}%
- 7-Day Win Rate: ${(whale.winRate7d * 100).toFixed(1)}%
- Total Trades: ${whale.totalTrades}
- Successful Trades: ${whale.successfulTrades}
- Average Trade Size: $${whale.avgTradeSize.toFixed(2)}
- Total Volume: $${whale.totalVolumeUSD.toFixed(2)}
- Sharpe Ratio: ${whale.sharpeRatio.toFixed(2)}
- Max Drawdown: ${(whale.maxDrawdown * 100).toFixed(1)}%

## CURRENT TRADE
- From: ${trade.tokenIn.symbol} ($${trade.tokenIn.price})
- To: ${trade.tokenOut.symbol} ($${trade.tokenOut.price})
- Amount: $${trade.amountUSD.toFixed(2)}
- Expected Slippage: ${trade.slippage.toFixed(2)}%

## USER CONTEXT
- Available Balance: $${user.balance.toFixed(2)}
- Risk Tolerance: ${user.riskTolerance}
- Current Portfolio: ${JSON.stringify(user.currentPortfolio)}

## MARKET CONDITIONS
- BNB Price: $${market.bnbPrice}
- Market Volatility: ${market.marketVolatility}%
- Gas Price: ${market.gasPrice} gwei
- Timestamp: ${new Date(market.timestamp).toISOString()}

## ANALYSIS INSTRUCTIONS
Evaluate whether to copy this trade based on:
1. Whale's historical performance (win rate, consistency)
2. Risk-adjusted returns (Sharpe ratio, drawdown)
3. Trade quality (size, slippage, token quality)
4. Portfolio fit (diversification, correlation)
5. Market timing (volatility, gas costs)

Respond ONLY with a JSON object in this exact format:
{
  "shouldCopy": boolean,
  "confidence": number (0-100),
  "positionSize": number (percentage 1-100 of user's balance),
  "reasoning": "string explaining the decision",
  "riskLevel": "LOW" | "MEDIUM" | "HIGH",
  "expectedReturn": number (percentage estimate),
  "maxLoss": number (percentage estimate)
}

Do not include any other text, markdown, or explanations outside the JSON.`;
  }

  private async callOpenRouter(prompt: string, model: string): Promise<string> {
    if (!this.openrouterApiKey) {
      throw new Error('OpenRouter API key not configured');
    }

    const response = await axios.post(
      this.apiUrl,
      {
        model: model,
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.3,
        max_tokens: 1000
      },
      {
        headers: {
          'Authorization': `Bearer ${this.openrouterApiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'https://whal-e.app',
          'X-Title': 'Whal-E BNB'
        }
      }
    );

    return response.data.choices[0].message.content;
  }

  private parseRecommendation(response: string): TradeRecommendation {
    try {
      // Try to extract JSON from response
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        
        return {
          shouldCopy: Boolean(parsed.shouldCopy),
          confidence: Math.min(100, Math.max(0, Number(parsed.confidence) || 0)),
          positionSize: Math.min(100, Math.max(1, Number(parsed.positionSize) || 5)),
          reasoning: String(parsed.reasoning || 'No reasoning provided'),
          riskLevel: ['LOW', 'MEDIUM', 'HIGH'].includes(parsed.riskLevel) 
            ? parsed.riskLevel 
            : 'MEDIUM',
          expectedReturn: Number(parsed.expectedReturn) || 0,
          maxLoss: Number(parsed.maxLoss) || 0
        };
      }
      
      throw new Error('No JSON found in response');
    } catch (error) {
      this.logger.error('Failed to parse AI response:', error.message);
      return this.getFallbackRecommendation();
    }
  }

  private getFallbackRecommendation(): TradeRecommendation {
    return {
      shouldCopy: false,
      confidence: 0,
      positionSize: 0,
      reasoning: 'AI analysis failed - using conservative fallback',
      riskLevel: 'HIGH',
      expectedReturn: 0,
      maxLoss: 0
    };
  }

  // Simple rule-based analysis as backup
  analyzeWithHeuristics(
    whale: WhaleStats,
    trade: TradeDetails,
    user: UserContext
  ): TradeRecommendation {
    let score = 0;
    let reasons: string[] = [];

    // Win rate check
    if (whale.winRate30d > 0.6) {
      score += 30;
      reasons.push('Strong historical win rate');
    } else if (whale.winRate30d > 0.5) {
      score += 15;
      reasons.push('Moderate win rate');
    }

    // Consistency check
    if (whale.winRate7d > whale.winRate30d) {
      score += 10;
      reasons.push('Recent performance improving');
    }

    // Trade size check (don't copy if too large relative to user's balance)
    const tradeRatio = trade.amountUSD / user.balance;
    if (tradeRatio > 0.5) {
      score -= 20;
      reasons.push('Trade size too large relative to balance');
    } else if (tradeRatio < 0.1) {
      score += 10;
      reasons.push('Manageable trade size');
    }

    // Slippage check
    if (trade.slippage > 2) {
      score -= 15;
      reasons.push('High slippage warning');
    } else if (trade.slippage < 0.5) {
      score += 10;
      reasons.push('Low slippage favorable');
    }

    // Risk tolerance alignment
    if (user.riskTolerance === 'LOW' && whale.maxDrawdown > 0.2) {
      score -= 20;
      reasons.push('High drawdown incompatible with low risk tolerance');
    }

    const shouldCopy = score > 40;
    const confidence = Math.min(100, Math.max(0, score + 50));
    const positionSize = shouldCopy 
      ? Math.min(20, Math.max(5, Math.floor(score / 5)))
      : 0;

    return {
      shouldCopy,
      confidence,
      positionSize,
      reasoning: reasons.join('; ') || 'Rule-based analysis',
      riskLevel: score > 60 ? 'MEDIUM' : score > 30 ? 'MEDIUM' : 'HIGH',
      expectedReturn: shouldCopy ? 5 : 0,
      maxLoss: shouldCopy ? 2 : 0
    };
  }
}
