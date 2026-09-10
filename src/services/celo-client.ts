import { createPublicClient, http, formatUnits, encodeFunctionData, parseAbi } from 'viem';
import { celo } from 'viem/chains';
import { CELO_CONFIG, type SupportedTokenSymbol } from '../config/celo.config';
import type { TokenBalance } from '../types/minipay.types';
import { attachAttributionSuffix } from '../config/attribution';

const ERC20_ABI = parseAbi([
  'function balanceOf(address owner) view returns (uint256)',
  'function decimals() view returns (uint8)',
  'function transfer(address to, uint256 amount) returns (bool)',
]);

export const publicClient = createPublicClient({
  chain: celo,
  transport: http(CELO_CONFIG.rpcUrl),
});

// Cache CELO price for 60 seconds to avoid hammering the API
let _celoPriceUsd: number = 0.075; // fallback: last known ~price
let _celoPriceLastFetched = 0;

async function getCeloPriceUsd(): Promise<number> {
  const now = Date.now();
  if (now - _celoPriceLastFetched < 60_000) return _celoPriceUsd;

  try {
    const res = await fetch(
      'https://api.coingecko.com/api/v3/simple/price?ids=celo&vs_currencies=usd',
      { signal: AbortSignal.timeout(4000) }
    );
    if (res.ok) {
      const data = await res.json() as { celo?: { usd?: number } };
      if (data?.celo?.usd) {
        _celoPriceUsd = data.celo.usd;
        _celoPriceLastFetched = now;
      }
    }
  } catch {
    // Network unavailable — keep last cached value
  }
  return _celoPriceUsd;
}

export async function fetchTokenBalances(address: string | null): Promise<TokenBalance[]> {
  if (!address || !address.startsWith('0x') || address.length !== 42) {
    return getDefaultBalances();
  }

  const tokens = CELO_CONFIG.tokens;
  const results: TokenBalance[] = [];

  // Fetch live CELO price once per batch
  const celoPriceUsd = await getCeloPriceUsd();

  for (const [key, token] of Object.entries(tokens)) {
    try {
      if (token.symbol === 'CELO') {
        const rawBal = await publicClient.getBalance({ address: address as `0x${string}` });
        const formatted = parseFloat(formatUnits(rawBal, token.decimals)).toFixed(4);
        results.push({
          symbol: key as SupportedTokenSymbol,
          name: token.name,
          balanceFormatted: formatted,
          balanceRaw: rawBal,
          decimals: token.decimals,
          icon: token.icon,
          usdValue: parseFloat(formatted) * celoPriceUsd,
        });
      } else {
        const rawBal = await publicClient.readContract({
          address: token.address,
          abi: ERC20_ABI,
          functionName: 'balanceOf',
          args: [address as `0x${string}`],
        });
        const formatted = parseFloat(formatUnits(rawBal, token.decimals)).toFixed(token.decimals === 18 ? 4 : 2);
        // cNGN is NGN-pegged; cUSD is $1.00; USDC/USDT are $1.00 stablecoins
        const usdRate = token.symbol === 'cNGN' ? 1 / 1450 : 1.0;
        results.push({
          symbol: key as SupportedTokenSymbol,
          name: token.name,
          balanceFormatted: formatted,
          balanceRaw: rawBal,
          decimals: token.decimals,
          icon: token.icon,
          usdValue: parseFloat(formatted) * usdRate,
        });
      }
    } catch (err) {
      console.warn(`Error reading balance for ${token.symbol}:`, err);
      results.push({
        symbol: key as SupportedTokenSymbol,
        name: token.name,
        balanceFormatted: '0.00',
        balanceRaw: 0n,
        decimals: token.decimals,
        icon: token.icon,
        usdValue: 0,
      });
    }
  }

  return results;
}

function getDefaultBalances(): TokenBalance[] {
  return [
    { symbol: 'USDC', name: 'USD Coin', balanceFormatted: '25.00', balanceRaw: 25000000n, decimals: 6, icon: '💵', usdValue: 25 },
    { symbol: 'USDT', name: 'Tether USD', balanceFormatted: '15.00', balanceRaw: 15000000n, decimals: 6, icon: '🟢', usdValue: 15 },
    { symbol: 'cNGN', name: 'Compliant Naira', balanceFormatted: '36,250.00', balanceRaw: 36250000000n, decimals: 6, icon: '🇳🇬', usdValue: 25 },
    { symbol: 'cUSD', name: 'Celo Dollar', balanceFormatted: '10.00', balanceRaw: 10000000000000000000n, decimals: 18, icon: '💲', usdValue: 10 },
    { symbol: 'CELO', name: 'Celo Native', balanceFormatted: '12.50', balanceRaw: 12500000000000000000n, decimals: 18, icon: '🟡', usdValue: 0.94 },
  ];
}

/**
 * Builds an ERC-20 transfer payload appended with Sivan's official ERC-8021
 * hackathon attribution tag suffix (celo_bafcc2e56bd7).
 */
export function buildAttributedTransferCalldata(
  toAddress: `0x${string}`,
  amount: bigint
): `0x${string}` {
  const baseCalldata = encodeFunctionData({
    abi: ERC20_ABI,
    functionName: 'transfer',
    args: [toAddress, amount],
  });
  return attachAttributionSuffix(baseCalldata);
}
