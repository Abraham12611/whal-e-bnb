import { Address, BigDecimal, BigInt, Bytes, log } from '@graphprotocol/graph-ts';
import { Swap as SwapEvent } from '../../generated/SwapRouter/SwapRouter';
import { Whale, Trade, Token, DayData } from '../../generated/schema';
import { getOrCreateWhale, updateWhaleStats, calculateUSDValue } from '../utils/helpers';

const MIN_TRADE_USD = BigDecimal.fromString('1000'); // Track trades >$1K
const BNB_PRICE = BigDecimal.fromString('675'); // Simplified - use oracle in production

export function handleSwap(event: SwapEvent): void {
  let trader = event.params.sender.toHexString();
  
  // Skip contracts and small trades
  if (isContract(trader)) {
    return;
  }

  let amountUSD = calculateUSDValue(
    event.params.amountIn,
    event.params.amountOut,
    BNB_PRICE
  );

  // Only track significant trades
  if (amountUSD.lt(MIN_TRADE_USD)) {
    return;
  }

  // Get or create whale
  let whale = getOrCreateWhale(trader, event.block.timestamp);
  
  // Create trade record
  let tradeId = event.transaction.hash.toHexString();
  let trade = new Trade(tradeId);
  trade.whale = whale.id;
  trade.timestamp = event.block.timestamp;
  trade.tokenIn = Bytes.fromHexString('0x0000000000000000000000000000000000000000') as Bytes;
  trade.tokenOut = Bytes.fromHexString('0x0000000000000000000000000000000000000000') as Bytes;
  trade.tokenInSymbol = 'BNB';
  trade.tokenOutSymbol = 'TOKEN';
  trade.amountIn = BigDecimal.fromString(event.params.amountIn.toString());
  trade.amountOut = BigDecimal.fromString(event.params.amountOut.toString());
  trade.amountUSD = amountUSD;
  trade.profitUSD = BigDecimal.zero();
  trade.isSuccess = true; // Will be updated later
  trade.gasUsed = event.transaction.gasUsed;
  trade.gasPrice = event.transaction.gasPrice;
  trade.blockNumber = event.block.number;
  trade.txHash = event.transaction.hash;
  trade.save();

  // Update whale stats
  whale.totalTrades = whale.totalTrades.plus(BigInt.fromI32(1));
  whale.totalVolumeUSD = whale.totalVolumeUSD.plus(amountUSD);
  whale.averageTradeSize = whale.totalVolumeUSD.div(
    BigDecimal.fromString(whale.totalTrades.toString())
  );
  whale.lastTradeTimestamp = event.block.timestamp;
  whale.isActive = true;
  whale.save();

  // Update day data
  updateDayData(event.block.timestamp, amountUSD);

  log.info('Trade recorded: {} - ${}', [trader, amountUSD.toString()]);
}

function isContract(address: string): boolean {
  // Simplified - in production check if address is a contract
  return address.startsWith('0x0000'); // Filter null addresses
}

function updateDayData(timestamp: BigInt, volumeUSD: BigDecimal): void {
  let dayId = timestamp.div(BigInt.fromI32(86400)).toString();
  let dayData = DayData.load(dayId);

  if (dayData === null) {
    dayData = new DayData(dayId);
    dayData.date = timestamp.div(BigInt.fromI32(86400)).toI32();
    dayData.volumeUSD = BigDecimal.zero();
    dayData.txCount = BigInt.zero();
    dayData.uniqueWhales = 0;
  }

  dayData.volumeUSD = dayData.volumeUSD.plus(volumeUSD);
  dayData.txCount = dayData.txCount.plus(BigInt.fromI32(1));
  dayData.save();
}
