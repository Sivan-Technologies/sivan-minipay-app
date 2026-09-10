/**
 * Celo Network and Token Configuration for Sivan MiniPay Mini App
 */

export const CELO_CONFIG = {
  chainId: 42220,
  chainName: 'Celo Mainnet',
  rpcUrl: 'https://forno.celo.org',
  fallbackRpcUrl: 'https://celo.drpc.org',
  blockExplorerUrl: 'https://celoscan.io',
  
  // Official ERC-8021 Hackathon Attribution Tag
  attributionTag: 'celo_bafcc2e56bd7',
  
  // Official Registered Agent
  agentId: 9827,
  agentWallet: '0x4a1A9cf30A86b2b333D1a743181aAE71a50BAFBc',

  // Token Contracts on Celo Mainnet
  tokens: {
    USDC: {
      address: '0xcebA9300f2b948710d2653dD7B07f33A8B32118C' as `0x${string}`,
      symbol: 'USDC',
      name: 'USD Coin',
      decimals: 6,
      icon: '💵',
    },
    USDT: {
      address: '0x48065fbBE25f71C9282ddf5e1cD6D6A887483D5e' as `0x${string}`,
      symbol: 'USDT',
      name: 'Tether USD',
      decimals: 6,
      icon: '🟢',
    },
    cNGN: {
      address: '0xF6829D7393dAe24509eb1E52eE8e572e2E271a4f' as `0x${string}`,
      symbol: 'cNGN',
      name: 'Compliant Nigerian Naira',
      decimals: 6,
      icon: '🇳🇬',
    },
    cUSD: {
      address: '0x765DE816845861e75A25fCA122bb6898B8B1282a' as `0x${string}`,
      symbol: 'cUSD',
      name: 'Celo Dollar',
      decimals: 18,
      icon: '💲',
    },
    CELO: {
      address: '0x471EcE3750Da237f93B8E339c536989b8978a438' as `0x${string}`,
      symbol: 'CELO',
      name: 'Celo Native',
      decimals: 18,
      icon: '🟡',
    },
  },
} as const;

export type SupportedTokenSymbol = keyof typeof CELO_CONFIG.tokens;
