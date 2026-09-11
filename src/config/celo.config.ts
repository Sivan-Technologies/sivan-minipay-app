/**
 * Celo Multi-Network and Token Configuration for Sivan MiniPay Mini App
 * Supports seamless switching between Celo Mainnet and Celo Alfajores Testnet
 */

export type NetworkMode = 'mainnet' | 'testnet';

export interface CeloNetworkDefinition {
  mode: NetworkMode;
  chainId: number;
  chainIdHex: string;
  chainName: string;
  rpcUrl: string;
  fallbackRpcUrl: string;
  blockExplorerUrl: string;
  agentId: number;
  agentWallet: string;
  attributionTag: string;
  tokens: {
    USDC: { address: `0x${string}`; symbol: string; name: string; decimals: number; icon: string };
    USDT: { address: `0x${string}`; symbol: string; name: string; decimals: number; icon: string };
    cNGN: { address: `0x${string}`; symbol: string; name: string; decimals: number; icon: string };
    cUSD: { address: `0x${string}`; symbol: string; name: string; decimals: number; icon: string };
    CELO: { address: `0x${string}`; symbol: string; name: string; decimals: number; icon: string };
  };
}

export const NETWORKS: Record<NetworkMode, CeloNetworkDefinition> = {
  mainnet: {
    mode: 'mainnet',
    chainId: 42220,
    chainIdHex: '0xa4ec',
    chainName: 'Celo Mainnet',
    rpcUrl: 'https://forno.celo.org',
    fallbackRpcUrl: 'https://celo.drpc.org',
    blockExplorerUrl: 'https://celoscan.io',
    agentId: 9827,
    agentWallet: '0x4a1A9cf30A86b2b333D1a743181aAE71a50BAFBc',
    attributionTag: 'celo_bafcc2e56bd7',
    tokens: {
      USDC: {
        address: '0xcebA9300f2b948710d2653dD7B07f33A8B32118C',
        symbol: 'USDC',
        name: 'USD Coin',
        decimals: 6,
        icon: '💵',
      },
      USDT: {
        address: '0x48065fbBE25f71C9282ddf5e1cD6D6A887483D5e',
        symbol: 'USDT',
        name: 'Tether USD',
        decimals: 6,
        icon: '🟢',
      },
      cNGN: {
        address: '0xF6829D7393dAe24509eb1E52eE8e572e2E271a4f',
        symbol: 'cNGN',
        name: 'Compliant Nigerian Naira',
        decimals: 6,
        icon: '🇳🇬',
      },
      cUSD: {
        address: '0x765DE816845861e75A25fCA122bb6898B8B1282a',
        symbol: 'cUSD',
        name: 'Celo Dollar',
        decimals: 18,
        icon: '💲',
      },
      CELO: {
        address: '0x471EcE3750Da237f93B8E339c536989b8978a438',
        symbol: 'CELO',
        name: 'Celo Native',
        decimals: 18,
        icon: '🟡',
      },
    },
  },
  testnet: {
    mode: 'testnet',
    chainId: 44787,
    chainIdHex: '0xaf11',
    chainName: 'Celo Alfajores Testnet',
    rpcUrl: 'https://alfajores-forno.celo-testnet.org',
    fallbackRpcUrl: 'https://celo-alfajores.drpc.org',
    blockExplorerUrl: 'https://alfajores.celoscan.io',
    agentId: 9827,
    agentWallet: '0x4a1A9cf30A86b2b333D1a743181aAE71a50BAFBc',
    attributionTag: 'celo_bafcc2e56bd7',
    tokens: {
      USDC: {
        address: '0x2F25deB3848C207fc8E0c34035B3Ba7fC157602B',
        symbol: 'USDC',
        name: 'USD Coin (Alfajores)',
        decimals: 6,
        icon: '💵',
      },
      USDT: {
        address: '0x48065fbBE25f71C9282ddf5e1cD6D6A887483D5e',
        symbol: 'USDT',
        name: 'Tether USD (Alfajores)',
        decimals: 6,
        icon: '🟢',
      },
      cNGN: {
        address: '0xF6829D7393dAe24509eb1E52eE8e572e2E271a4f',
        symbol: 'cNGN',
        name: 'cNGN (Alfajores)',
        decimals: 6,
        icon: '🇳🇬',
      },
      cUSD: {
        address: '0x874069Fa1Eb16D44d622F2e0Ca25eeA172369bC1',
        symbol: 'cUSD',
        name: 'Celo Dollar (Alfajores)',
        decimals: 18,
        icon: '💲',
      },
      CELO: {
        address: '0xF194afDf50B03e69Bd7D057c1Aa9e10c9954E4C9',
        symbol: 'CELO',
        name: 'Celo Native (Alfajores)',
        decimals: 18,
        icon: '🟡',
      },
    },
  },
};

const NETWORK_STORAGE_KEY = 'sivan_celo_network_mode';

export function getSavedNetworkMode(): NetworkMode {
  try {
    const saved = localStorage.getItem(NETWORK_STORAGE_KEY);
    if (saved === 'testnet' || saved === 'mainnet') return saved;
  } catch {}
  return 'mainnet';
}

export function saveNetworkMode(mode: NetworkMode) {
  try {
    localStorage.setItem(NETWORK_STORAGE_KEY, mode);
  } catch {}
}

let currentMode: NetworkMode = getSavedNetworkMode();

export function getActiveNetwork(): CeloNetworkDefinition {
  return NETWORKS[currentMode];
}

export function setActiveNetworkMode(mode: NetworkMode) {
  currentMode = mode;
  saveNetworkMode(mode);
}

// Proxied default config for backwards compatibility
export const CELO_CONFIG = new Proxy(NETWORKS.mainnet, {
  get(_target, prop: keyof CeloNetworkDefinition) {
    return getActiveNetwork()[prop];
  },
});

export type SupportedTokenSymbol = keyof typeof NETWORKS.mainnet.tokens;
