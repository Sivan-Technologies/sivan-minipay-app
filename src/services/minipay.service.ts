import type { MiniPayDetectionState } from '../types/minipay.types';
import { CELO_CONFIG } from '../config/celo.config';

// Fallback demo address for evaluator desktop browser testing
const DEMO_EVALUATOR_ADDRESS = '0x4a1A9cf30A86b2b333D1a743181aAE71a50BAFBc';

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
  }

  public isMiniPayInjected(): boolean {
    if (typeof window === 'undefined') return false;
    const eth = (window as any).ethereum;
    return !!eth && eth.isMiniPay === true;
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
      // Desktop / External browser evaluator mode
      const savedAddress = localStorage.getItem('sivan_evaluator_address') || DEMO_EVALUATOR_ADDRESS;
      this.state = {
        isMiniPay: false,
        address: savedAddress,
        chainId: CELO_CONFIG.chainId,
        mode: 'desktop_evaluator',
      };
    }

    this.notify();
    return this.state;
  }

  public getState(): MiniPayDetectionState {
    return this.state;
  }

  public toggleEvaluatorMode(useDemoAddress?: string) {
    if (this.state.mode === 'live_minipay') return; // Cannot override real MiniPay
    const newAddress = useDemoAddress || (this.state.address ? null : DEMO_EVALUATOR_ADDRESS);
    this.state.address = newAddress;
    if (newAddress) {
      localStorage.setItem('sivan_evaluator_address', newAddress);
    } else {
      localStorage.removeItem('sivan_evaluator_address');
    }
    this.notify();
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
}

export const miniPayService = new MiniPayService();
