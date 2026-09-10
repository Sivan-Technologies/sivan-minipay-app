import type { MiniPayDetectionState } from '../types/minipay.types';
import { CELO_CONFIG } from '../config/celo.config';

export const DEMO_EVALUATOR_ADDRESS = '0x4a1A9cf30A86b2b333D1a743181aAE71a50BAFBc';

class MiniPayService {
  private state: MiniPayDetectionState = {
    isMiniPay: false,
    address: null,
    chainId: null,
    mode: 'desktop_evaluator',
  };

  private listeners: ((state: MiniPayDetectionState) => void)[] = [];

  constructor() {
    this.detectEnvironment();
    this.listenToWalletEvents();
  }

  public isMiniPayInjected(): boolean {
    if (typeof window === 'undefined') return false;
    const eth = (window as any).ethereum;
    return !!eth && eth.isMiniPay === true;
  }

  public hasInjectedWallet(): boolean {
    if (typeof window === 'undefined') return false;
    return typeof (window as any).ethereum !== 'undefined';
  }

  public async detectEnvironment(): Promise<MiniPayDetectionState> {
    if (this.isMiniPayInjected()) {
      try {
        const provider = (window as any).ethereum;
        const accounts: string[] = await provider.request({ method: 'eth_requestAccounts' });
        const chainIdHex: string = await provider.request({ method: 'eth_chainId' });
        const chainId = parseInt(chainIdHex, 16);

        this.state = {
          isMiniPay: true,
          address: accounts[0] || null,
          chainId,
          mode: 'live_minipay',
        };
      } catch (err) {
        console.warn('MiniPay provider detected but account access denied:', err);
        this.state = {
          isMiniPay: true,
          address: null,
          chainId: CELO_CONFIG.chainId,
          mode: 'live_minipay',
        };
      }
    } else {
      const savedMode = localStorage.getItem('sivan_wallet_mode');

      if (savedMode === 'disconnected') {
        this.state = {
          isMiniPay: false,
          address: null,
          chainId: CELO_CONFIG.chainId,
          mode: 'disconnected',
        };
      } else if (savedMode === 'connected_wallet' && this.hasInjectedWallet()) {
        try {
          const provider = (window as any).ethereum;
          const accounts: string[] = await provider.request({ method: 'eth_accounts' });
          if (accounts.length > 0) {
            const chainIdHex: string = await provider.request({ method: 'eth_chainId' });
            this.state = {
              isMiniPay: false,
              address: accounts[0],
              chainId: parseInt(chainIdHex, 16),
              mode: 'connected_wallet',
            };
          } else {
            this.useEvaluatorMode();
          }
        } catch {
          this.useEvaluatorMode();
        }
      } else {
        // Default to evaluator mode for desktop testing
        this.useEvaluatorMode();
      }
    }

    this.notify();
    return this.state;
  }

  public async connectMetaMask(): Promise<{ success: boolean; error?: string }> {
    if (!this.hasInjectedWallet()) {
      return { success: false, error: 'No Web3 wallet (MetaMask) detected in browser' };
    }

    try {
      const provider = (window as any).ethereum;
      const accounts: string[] = await provider.request({ method: 'eth_requestAccounts' });
      if (!accounts || accounts.length === 0) {
        return { success: false, error: 'No account selected' };
      }

      // Check / switch to Celo Mainnet (42220 / 0xa4ec)
      try {
        await provider.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: '0xa4ec' }],
        });
      } catch (switchError: any) {
        // Chain not added to wallet - prompt to add Celo Mainnet
        if (switchError.code === 4902) {
          await provider.request({
            method: 'wallet_addEthereumChain',
            params: [{
              chainId: '0xa4ec',
              chainName: 'Celo Mainnet',
              nativeCurrency: { name: 'CELO', symbol: 'CELO', decimals: 18 },
              rpcUrls: ['https://forno.celo.org'],
              blockExplorerUrls: ['https://celoscan.io'],
            }],
          });
        }
      }

      const chainIdHex: string = await provider.request({ method: 'eth_chainId' });
      this.state = {
        isMiniPay: false,
        address: accounts[0],
        chainId: parseInt(chainIdHex, 16),
        mode: 'connected_wallet',
      };

      localStorage.setItem('sivan_wallet_mode', 'connected_wallet');
      localStorage.setItem('sivan_connected_address', accounts[0]);
      this.notify();
      return { success: true };
    } catch (err: any) {
      console.error('Failed to connect wallet:', err);
      return { success: false, error: err.message || 'Connection rejected' };
    }
  }

  public disconnectWallet() {
    this.state = {
      isMiniPay: false,
      address: null,
      chainId: CELO_CONFIG.chainId,
      mode: 'disconnected',
    };
    localStorage.setItem('sivan_wallet_mode', 'disconnected');
    localStorage.removeItem('sivan_evaluator_address');
    localStorage.removeItem('sivan_connected_address');
    this.notify();
  }

  public useEvaluatorMode(demoAddress: string = DEMO_EVALUATOR_ADDRESS) {
    this.state = {
      isMiniPay: false,
      address: demoAddress,
      chainId: CELO_CONFIG.chainId,
      mode: 'desktop_evaluator',
    };
    localStorage.setItem('sivan_wallet_mode', 'desktop_evaluator');
    localStorage.setItem('sivan_evaluator_address', demoAddress);
    this.notify();
  }

  public getState(): MiniPayDetectionState {
    return this.state;
  }

  public subscribe(fn: (state: MiniPayDetectionState) => void) {
    this.listeners.push(fn);
    fn(this.state);
    return () => {
      this.listeners = this.listeners.filter(l => l !== fn);
    };
  }

  private notify() {
    this.listeners.forEach(fn => fn(this.state));
  }

  private listenToWalletEvents() {
    if (typeof window === 'undefined') return;
    const eth = (window as any).ethereum;
    if (!eth) return;

    eth.on?.('accountsChanged', (accounts: string[]) => {
      if (accounts.length === 0) {
        this.disconnectWallet();
      } else if (this.state.mode === 'connected_wallet') {
        this.state.address = accounts[0];
        localStorage.setItem('sivan_connected_address', accounts[0]);
        this.notify();
      }
    });

    eth.on?.('chainChanged', (chainIdHex: string) => {
      this.state.chainId = parseInt(chainIdHex, 16);
      this.notify();
    });
  }
}

export const miniPayService = new MiniPayService();
