import type { ServiceAgreement, AgreementStatus } from '../types/minipay.types';
import { CELO_CONFIG } from '../config/celo.config';

const STORAGE_KEY = 'sivan_minipay_agreements';

const INITIAL_AGREEMENTS: ServiceAgreement[] = [
  {
    id: 'agr_celo_01',
    title: 'Mobile App Icon & UI Kit Design',
    description: 'Design 12 SVG icons and color palette for Sivan MiniPay mobile mini app',
    contractorIdentifier: '@chididesigns (Telegram)',
    contractorAddress: '0x742d35Cc6634C0532925a3b844Bc454e4438f44e',
    amount: 25,
    currency: 'USDC',
    protocolFee: 0.25,
    netAmount: 24.75,
    status: 'in_progress',
    createdAt: new Date(Date.now() - 3600000 * 18).toISOString(),
    deadlineHours: 48,
    deadlineTimestamp: Date.now() + 3600000 * 30,
    deliverableProofUrl: 'https://www.figma.com/file/sample-sivan-icons',
    fundingTxHash: '0x8f192b10a9c80d4567e9f3b1234567890abcdef1234567890abcdef123456789',
    attributionTag: CELO_CONFIG.attributionTag,
  },
  {
    id: 'agr_celo_02',
    title: 'Smart Contract Audit & Test Verification',
    description: 'Independent review of Multicall3 fee abstraction scripts on Celo',
    contractorIdentifier: '+234 803 123 4567',
    contractorAddress: '0x53d284357ec70cE289D6D64134DfAc8E511c8a3D',
    amount: 50,
    currency: 'USDC',
    protocolFee: 0.50,
    netAmount: 49.50,
    status: 'delivered',
    createdAt: new Date(Date.now() - 3600000 * 40).toISOString(),
    deadlineHours: 72,
    deadlineTimestamp: Date.now() + 3600000 * 32,
    deliverableProofUrl: 'https://github.com/Sivan-Technologies/audit-report',
    fundingTxHash: '0x1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b',
    attributionTag: CELO_CONFIG.attributionTag,
  },
  {
    id: 'agr_celo_03',
    title: 'Hausa & Yoruba Localization Translation',
    description: 'Translate onboarding copy and agreement confirmation messages to Hausa and Yoruba',
    contractorIdentifier: '@aishatranslates',
    contractorAddress: '0x2b5AD5c4795c026514f8317c7a215E218DcCD6cF',
    amount: 25000,
    currency: 'cNGN',
    protocolFee: 250,
    netAmount: 24750,
    status: 'released',
    createdAt: new Date(Date.now() - 3600000 * 96).toISOString(),
    deadlineHours: 24,
    deadlineTimestamp: Date.now() - 3600000 * 72,
    deliverableProofUrl: 'https://docs.google.com/sample-translation-strings',
    fundingTxHash: '0x99a8b7c6d5e4f3a2b1c0d9e8f7a6b5c4d3e2f1a0b9c8d7e6f5a4b3c2d1e0f9a8',
    releaseTxHash: '0x33b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4',
    attributionTag: CELO_CONFIG.attributionTag,
  }
];

class AgreementsService {
  private agreements: ServiceAgreement[] = [];
  private listeners: ((agreements: ServiceAgreement[]) => void)[] = [];

  constructor() {
    this.loadAgreements();
  }

  private loadAgreements() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        this.agreements = JSON.parse(stored);
      } else {
        this.agreements = [...INITIAL_AGREEMENTS];
        this.saveAgreements();
      }
    } catch {
      this.agreements = [...INITIAL_AGREEMENTS];
    }
  }

  private saveAgreements() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.agreements));
    } catch (e) {
      console.warn('Failed to persist agreements to localStorage:', e);
    }
    this.notify();
  }

  public getAll(): ServiceAgreement[] {
    return [...this.agreements];
  }

  public getById(id: string): ServiceAgreement | undefined {
    return this.agreements.find(a => a.id === id);
  }

  public createAgreement(data: {
    title: string;
    description: string;
    contractorIdentifier: string;
    contractorAddress?: string;
    amount: number;
    currency: 'USDC' | 'USDT' | 'cNGN' | 'cUSD';
    deadlineHours: number;
  }): ServiceAgreement {
    const fee = Math.round(data.amount * 0.01 * 100) / 100;
    const net = Math.round((data.amount - fee) * 100) / 100;
    
    // Generate realistic Celo address if none provided
    const address = data.contractorAddress?.startsWith('0x') && data.contractorAddress.length === 42
      ? data.contractorAddress
      : `0x${Array.from({ length: 40 }, () => Math.floor(Math.random() * 16).toString(16)).join('')}`;

    const newAgreement: ServiceAgreement = {
      id: `agr_celo_${Date.now()}`,
      title: data.title,
      description: data.description,
      contractorIdentifier: data.contractorIdentifier,
      contractorAddress: address,
      amount: data.amount,
      currency: data.currency,
      protocolFee: fee,
      netAmount: net,
      status: 'funded',
      createdAt: new Date().toISOString(),
      deadlineHours: data.deadlineHours,
      deadlineTimestamp: Date.now() + data.deadlineHours * 3600000,
      fundingTxHash: `0x${Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join('')}`,
      attributionTag: CELO_CONFIG.attributionTag,
    };

    this.agreements.unshift(newAgreement);
    this.saveAgreements();
    return newAgreement;
  }

  public updateStatus(id: string, status: AgreementStatus, proofUrl?: string): boolean {
    const agreement = this.agreements.find(a => a.id === id);
    if (!agreement) return false;

    agreement.status = status;
    if (proofUrl) {
      agreement.deliverableProofUrl = proofUrl;
    }
    if (status === 'released' && !agreement.releaseTxHash) {
      agreement.releaseTxHash = `0x${Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join('')}`;
    }

    this.saveAgreements();
    return true;
  }

  public subscribe(fn: (agreements: ServiceAgreement[]) => void) {
    this.listeners.push(fn);
    fn(this.agreements);
    return () => {
      this.listeners = this.listeners.filter(l => l !== fn);
    };
  }

  private notify() {
    this.listeners.forEach(fn => fn(this.agreements));
  }
}

export const agreementsService = new AgreementsService();
