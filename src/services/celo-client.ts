import { createPublicClient, http, formatUnits, encodeFunctionData, parseAbi } from 'viem';
import { celo, celoSepolia } from 'viem/chains';
import { getActiveNetwork, type SupportedTokenSymbol } from '../config/celo.config';
import type { TokenBalance } from '../types/minipay.types';
import { attachAttributionSuffix } from '../config/attribution';

const ERC20_ABI = parseAbi([
  'function balanceOf(address owner) view returns (uint256)',
  'function allowance(address owner, address spender) view returns (uint256)',
  'function decimals() view returns (uint8)',
  'function transfer(address to, uint256 amount) returns (bool)',
  'function approve(address spender, uint256 amount) returns (bool)',
]);

export async function checkTokenAllowance(
  tokenAddress: `0x${string}`,
  owner: `0x${string}`,
  spender: `0x${string}`
): Promise<bigint> {
  const client = getPublicClient();
  try {
    const allowance = await client.readContract({
      address: tokenAddress,
      abi: ERC20_ABI,
      functionName: 'allowance',
      args: [owner, spender],
    });
    return allowance;
  } catch (err) {
    console.warn('Failed to read allowance:', err);
    return 0n;
  }
}

export function getPublicClient() {
  const network = getActiveNetwork();
  return createPublicClient({
    chain: network.mode === 'testnet' ? celoSepolia : celo,
    transport: http(network.rpcUrl),
  });
}

export const publicClient = getPublicClient();

export function getZeroBalances(): TokenBalance[] {
  return [
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

  const network = getActiveNetwork();
  const client = getPublicClient();
  const tokens = network.tokens;
  const results: TokenBalance[] = [];

  // Strictly the 4 primary stablecoins: USDT, USDC, cUSD, cNGN
  const stablecoinSymbols: SupportedTokenSymbol[] = ['USDT', 'USDC', 'cUSD', 'cNGN'];

  for (const sym of stablecoinSymbols) {
    const token = tokens[sym];
    if (!token) continue;

    try {
      const rawBal = await client.readContract({
        address: token.address,
        abi: ERC20_ABI,
        functionName: 'balanceOf',
        args: [address as `0x${string}`],
      });

      const balNum = parseFloat(formatUnits(rawBal, token.decimals));
      const formatted = balNum > 0
        ? (token.symbol === 'cNGN'
            ? balNum.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
            : balNum.toFixed(2))
        : '0.00';

      // Stablecoin valuations: USDC, USDT, cUSD are pegged 1:1 USD; cNGN at 1450 NGN/USD
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
    } catch {
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
