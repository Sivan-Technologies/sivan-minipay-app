import type { ServiceAgreement, AgreementStatus } from '../types/minipay.types';
import { CELO_CONFIG } from '../config/celo.config';
import { agreementFeeService } from './agreement-fee.service';

const STORAGE_KEY = 'sivan_minipay_agreements';

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
        const parsed: ServiceAgreement[] = JSON.parse(stored);
        // Clean out any legacy mock agreements from previous testing
        this.agreements = parsed.filter(a => !a.id.startsWith('agr_celo_01') && !a.id.startsWith('agr_celo_02') && !a.id.startsWith('agr_celo_03'));
        this.saveAgreements();
      } else {
        this.agreements = [];
      }
    } catch {
      this.agreements = [];
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

  public async createAgreement(data: {
    title: string;
    description: string;
    contractorIdentifier: string;
    contractorAddress: string;
    amount: number;
    currency: 'USDC' | 'USDT' | 'cNGN' | 'cUSD';
    deadlineHours: number;
    fundingTxHash: string;
    protocolFee?: number;
    netAmount?: number;
  }): Promise<ServiceAgreement> {
    const feeCalculation = await agreementFeeService.getDynamicFeeQuote(data.amount, data.currency);
    const fee = data.protocolFee !== undefined ? data.protocolFee : feeCalculation.protocolFee;
    const net = data.netAmount !== undefined ? data.netAmount : feeCalculation.netAmount;

    const newAgreement: ServiceAgreement = {
      id: `agr_${Date.now()}`,
      title: data.title,
      description: data.description,
      contractorIdentifier: data.contractorIdentifier,
      contractorAddress: data.contractorAddress,
      amount: data.amount,
      currency: data.currency as any,
      protocolFee: fee,
      netAmount: net,
      status: 'funded',
      createdAt: new Date().toISOString(),
      deadlineHours: data.deadlineHours,
      deadlineTimestamp: Date.now() + data.deadlineHours * 3600000,
      fundingTxHash: data.fundingTxHash,
      attributionTag: CELO_CONFIG.attributionTag,
    };

    this.agreements.unshift(newAgreement);
    this.saveAgreements();
    return newAgreement;
  }

  public updateStatus(id: string, status: AgreementStatus, proofUrl?: string, releaseTxHash?: string): boolean {
    const agreement = this.agreements.find(a => a.id === id);
    if (!agreement) return false;

    agreement.status = status;
    if (proofUrl) {
      agreement.deliverableProofUrl = proofUrl;
    }
    if (releaseTxHash) {
      agreement.releaseTxHash = releaseTxHash;
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
