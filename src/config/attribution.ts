import { toDataSuffix } from '@celo/attribution-tags';
import { CELO_CONFIG } from './celo.config';

/**
 * ERC-8021 Attribution Suffix Helper
 *
 * Appends Sivan Ai's official hackathon attribution tag (celo_bafcc2e56bd7)
 * to any Celo transaction calldata so all volume is credited on Dune analytics.
 */

export function getAttributionSuffix(): `0x${string}` {
  return toDataSuffix(CELO_CONFIG.attributionTag) as `0x${string}`;
}

export function attachAttributionSuffix(calldata: `0x${string}`): `0x${string}` {
  const suffix = getAttributionSuffix();
  // Strip the '0x' prefix from the suffix before appending
  const cleanSuffix = suffix.startsWith('0x') ? suffix.slice(2) : suffix;
  return `${calldata}${cleanSuffix}` as `0x${string}`;
}
