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

// Cache live CELO price for 60 seconds
let cachedCeloPrice: { price: number; timestamp: number } | null = null;

export async function getLiveCeloPriceUsd(): Promise<number> {
  const now = Date.now();
  if (cachedCeloPrice && now - cachedCeloPrice.timestamp < 60000) {
    return cachedCeloPrice.price;
  }

  try {
    const res = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=celo&vs_currencies=usd', {
      headers: { Accept: 'application/json' },
    });
    if (res.ok) {
      const data = await res.json();
      if (data?.celo?.usd && typeof data.celo.usd === 'number') {
        const price = data.celo.usd;
        cachedCeloPrice = { price, timestamp: now };
        return price;
      }
    }
  } catch (err) {
    console.warn('Failed to fetch live CELO price from CoinGecko, using fallback:', err);
  }

  // Fallback to recent live price if API is rate-limited or unreachable
  return cachedCeloPrice ? cachedCeloPrice.price : 0.0742;
}

export function getZeroBalances(): TokenBalance[] {
  return [
    { symbol: 'CELO', name: 'Celo Native', balanceFormatted: '0.00', balanceRaw: 0n, decimals: 18, icon: '🟡', usdValue: 0 },
    { symbol: 'USDT', name: 'Tether USD', balanceFormatted: '0.00', balanceRaw: 0n, decimals: 6, icon: '🟢', usdValue: 0 },
    { symbol: 'USDC', name: 'USD Coin', balanceFormatted: '0.00', balanceRaw: 0n, decimals: 6, icon: '💵', usdValue: 0 },
    { symbol: 'cUSD', name: 'Celo Dollar', balanceFormatted: '0.00', balanceRaw: 0n, decimals: 18, icon: '💲', usdValue: 0 },
    { symbol: 'cNGN', name: 'Compliant Naira', balanceFormatted: '0.00', balanceRaw: 0n, decimals: 6, icon: '🇳🇬', usdValue: 0 },
  ];
}

export async function fetchTokenBalances(address: string | null): Promise<TokenBalance[]> {
  if (!address || !address.startsWith('0x') || address.length !== 42) {
    return getZeroBalances();
  }

  const celoPrice = await getLiveCeloPriceUsd();
  const tokens = CELO_CONFIG.tokens;
  const results: TokenBalance[] = [];

  // Order: CELO, USDT, USDC, cUSD, cNGN
  const orderedSymbols: SupportedTokenSymbol[] = ['CELO', 'USDT', 'USDC', 'cUSD', 'cNGN'];

  for (const sym of orderedSymbols) {
    const token = tokens[sym];
    if (!token) continue;

    try {
      if (token.symbol === 'CELO') {
        const rawBal = await publicClient.getBalance({ address: address as `0x${string}` });
        const balNum = parseFloat(formatUnits(rawBal, 18));
        const formatted = balNum > 0 ? balNum.toFixed(3) : '0.00';
        const usdVal = Math.round(balNum * celoPrice * 100) / 100;

        results.push({
          symbol: 'CELO',
          name: token.name,
          balanceFormatted: formatted,
          balanceRaw: rawBal,
          decimals: 18,
          icon: token.icon,
          usdValue: usdVal,
        });
      } else {
        const rawBal = await publicClient.readContract({
          address: token.address,
          abi: ERC20_ABI,
          functionName: 'balanceOf',
          args: [address as `0x${string}`],
        });

        const balNum = parseFloat(formatUnits(rawBal, token.decimals));
        const formatted = balNum > 0 ? (token.symbol === 'cNGN' ? balNum.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : balNum.toFixed(2)) : '0.00';
        
        // Stablecoin valuations: USDC/USDT/cUSD are 1:1 USD; cNGN at market rate (1450 NGN/USD)
        const usdRate = token.symbol === 'cNGN' ? (1 / 1450) : 1.0;
        const usdVal = Math.round(balNum * usdRate * 100) / 100;

        results.push({
          symbol: sym,
          name: token.name,
          balanceFormatted: formatted,
          balanceRaw: rawBal,
          decimals: token.decimals,
          icon: token.icon,
          usdValue: usdVal,
        });
      }
    } catch (err) {
      console.warn(`Error reading live balance on Celo for ${token.symbol}:`, err);
      results.push({
        symbol: sym,
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
