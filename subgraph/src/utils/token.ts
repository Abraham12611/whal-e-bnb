import { Address } from '@graphprotocol/graph-ts';
import { ERC20 } from '../../generated/PancakeV3Factory/ERC20';

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

export function fetchTokenDecimals(tokenAddress: Address): i32 {
  let contract = ERC20.bind(tokenAddress);
  let result = contract.try_decimals();
  return result.reverted ? 18 : result.value;
}

export function fetchTokenTotalSupply(tokenAddress: Address): string {
  let contract = ERC20.bind(tokenAddress);
  let result = contract.try_totalSupply();
  return result.reverted ? '0' : result.value.toString();
}
