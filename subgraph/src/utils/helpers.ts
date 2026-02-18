import { Address, BigDecimal, BigInt, ethereum } from '@graphprotocol/graph-ts';
import { ERC20 } from '../../generated/SwapRouter/ERC20';
import { Whale } from '../../generated/schema';

export function getOrCreateWhale(address: string, timestamp: BigInt): Whale {
  let whale = Whale.load(address);
  
  if (whale === null) {
    whale = new Whale(address);
    whale.firstSeen = timestamp;
    whale.totalTrades = BigInt.zero();
    whale.successfulTrades = BigInt.zero();
    whale.winRate = BigDecimal.zero();
    whale.totalVolumeUSD = BigDecimal.zero();
    whale.averageTradeSize = BigDecimal.zero();
    whale.isActive = false;
    whale.lastTradeTimestamp = timestamp;
    whale.riskScore = 50;
    whale.profitUSD = BigDecimal.zero();
    whale.lossUSD = BigDecimal.zero();
    whale.profitLossRatio = BigDecimal.fromString('1');
    whale.save();
  }
  
  return whale;
}

export function updateWhaleStats(whale: Whale): void {
  if (whale.totalTrades.gt(BigInt.zero())) {
    whale.winRate = BigDecimal.fromString(
      whale.successfulTrades.toString()
    ).div(
      BigDecimal.fromString(whale.totalTrades.toString())
    );
  }
  whale.save();
}

export function calculateUSDValue(
  amountIn: BigInt,
  amountOut: BigInt,
  bnbPrice: BigDecimal
): BigDecimal {
  // Simplified calculation - assumes BNB input
  let amountInDecimal = BigDecimal.fromString(amountIn.toString()).div(
    BigDecimal.fromString('1000000000000000000')
  );
  return amountInDecimal.times(bnbPrice);
}

export function fetchTokenSymbol(tokenAddress: Address): string {
  let contract = ERC20.bind(tokenAddress);
  let result = contract.try_symbol();
  return result.reverted ? 'UNKNOWN' : result.value;
}

export function fetchTokenName(tokenAddress: Address): string {
  let contract = ERC20.bind(tokenAddress);
  let result = contract.try_name();
  return result.reverted ? 'Unknown Token' : result.value;
}

export function fetchTokenDecimals(tokenAddress: Address): BigInt {
  let contract = ERC20.bind(tokenAddress);
  let result = contract.try_decimals();
  return result.reverted ? BigInt.fromI32(18) : BigInt.fromI32(result.value);
}

export function fetchTokenTotalSupply(tokenAddress: Address): BigDecimal {
  let contract = ERC20.bind(tokenAddress);
  let result = contract.try_totalSupply();
  
  if (result.reverted) {
    return BigDecimal.zero();
  }
  
  let decimals = fetchTokenDecimals(tokenAddress);
  let decimalDivisor = BigInt.fromI32(10).pow(decimals.toI32() as u8);
  
  return BigDecimal.fromString(result.value.toString()).div(
    BigDecimal.fromString(decimalDivisor.toString())
  );
}
