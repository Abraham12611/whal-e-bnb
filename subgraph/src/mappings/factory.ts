import { Address, BigDecimal, BigInt, log } from '@graphprotocol/graph-ts';
import { PoolCreated } from '../../generated/PancakeV3Factory/PancakeV3Factory';
import { Pool, Token } from '../../generated/schema';
import { PancakeV3Pool as PoolTemplate } from '../../generated/templates';
import { fetchTokenSymbol, fetchTokenName, fetchTokenDecimals, fetchTokenTotalSupply } from '../utils/token';

export function handlePoolCreated(event: PoolCreated): void {
  // Load or create tokens
  let token0 = Token.load(event.params.token0.toHexString());
  let token1 = Token.load(event.params.token1.toHexString());

  if (token0 === null) {
    token0 = new Token(event.params.token0.toHexString());
    token0.symbol = fetchTokenSymbol(event.params.token0);
    token0.name = fetchTokenName(event.params.token0);
    token0.totalSupply = fetchTokenTotalSupply(event.params.token0);
    token0.decimals = fetchTokenDecimals(event.params.token0);
    token0.tradeVolumeUSD = BigDecimal.zero();
    token0.txCount = BigInt.zero();
    token0.save();
  }

  if (token1 === null) {
    token1 = new Token(event.params.token1.toHexString());
    token1.symbol = fetchTokenSymbol(event.params.token1);
    token1.name = fetchTokenName(event.params.token1);
    token1.totalSupply = fetchTokenTotalSupply(event.params.token1);
    token1.decimals = fetchTokenDecimals(event.params.token1);
    token1.tradeVolumeUSD = BigDecimal.zero();
    token1.txCount = BigInt.zero();
    token1.save();
  }

  // Create pool
  let pool = new Pool(event.params.pool.toHexString());
  pool.token0 = token0.id;
  pool.token1 = token1.id;
  pool.fee = BigInt.fromI32(event.params.fee);
  pool.tickSpacing = BigInt.fromI32(event.params.tickSpacing);
  pool.liquidity = BigInt.zero();
  pool.sqrtPriceX96 = BigInt.zero();
  pool.tick = 0;
  pool.volumeToken0 = BigDecimal.zero();
  pool.volumeToken1 = BigDecimal.zero();
  pool.volumeUSD = BigDecimal.zero();
  pool.txCount = BigInt.zero();
  pool.createdAtTimestamp = event.block.timestamp;
  pool.createdAtBlockNumber = event.block.number;
  pool.save();

  // Create template for pool events
  PoolTemplate.create(event.params.pool);

  log.info('Pool created: {} - {} / {}', [
    event.params.pool.toHexString(),
    token0.symbol,
    token1.symbol
  ]);
}
