import type { ServiceAgreement, AgreementStatus } from '../types/minipay.types';
import { CELO_CONFIG } from '../config/celo.config';
import { agreementFeeService } from './agreement-fee.service';
import { getPaymentApiUrl } from '../config/api.config';

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
    buyerAddress: string;      // Real connected wallet address — required, never a placeholder
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
      buyerAddress: data.buyerAddress,
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
    this.syncAgreementToBackend(newAgreement).catch(() => {});
    return newAgreement;
  }

  public importAgreement(agreement: ServiceAgreement): ServiceAgreement {
    const existingIndex = this.agreements.findIndex(a => a.id === agreement.id);
    if (existingIndex >= 0) {
      this.agreements[existingIndex] = { ...this.agreements[existingIndex], ...agreement };
    } else {
      this.agreements.unshift(agreement);
    }
    this.saveAgreements();
    this.syncAgreementToBackend(agreement).catch(() => {});
    return agreement;
  }

  private get apiBase(): string {
    return getPaymentApiUrl();
  }

  public async syncAgreementToBackend(agreement: ServiceAgreement): Promise<boolean> {
    // buyerAddress must be the real connected wallet address — never a placeholder or mock.
    // If somehow missing (legacy import), log a warning and skip the sync rather than
    // poisoning the backend with fake identity data.
    if (!agreement.buyerAddress || agreement.buyerAddress.length < 10) {
      console.warn('[AgreementsService] Refusing to sync agreement without a real buyerAddress:', agreement.id);
      return false;
    }

    try {
      const url = `${this.apiBase}/api/agreements`;
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: agreement.id,
          buyerUserId: agreement.buyerAddress,          // Real Celo wallet address of the buyer
          sellerUserId: agreement.contractorAddress || agreement.contractorIdentifier,
          buyerWalletAddress: agreement.buyerAddress,  // Explicit wallet field for backend indexing
          sellerWalletAddress: agreement.contractorAddress || undefined,
          title: agreement.title,
          description: agreement.description,
          amountUsdc: agreement.amount,
          currency: agreement.currency,
          network: 'celo',
          deadlineDays: Math.max(1, Math.round(agreement.deadlineHours / 24)),
          channel: 'minipay',
          fundingTxHash: agreement.fundingTxHash || undefined,
          attributionTag: agreement.attributionTag,
        }),
      });

      // If agreement has been funded on-chain, ensure backend marks it funded immediately
      if (agreement.fundingTxHash || agreement.status === 'funded') {
        fetch(`${this.apiBase}/api/agreements/${agreement.id}/fund`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ fundingTxHash: agreement.fundingTxHash }),
        }).catch(() => {});
      }

      return res.ok;
    } catch (e) {
      console.warn('[AgreementsService.syncAgreementToBackend] note:', e);
      return false;
    }
  }

  public updateStatus(
    id: string,
    status: AgreementStatus,
    proofUrl?: string,
    releaseTxHash?: string,
    disputeReason?: string,
    refundTxHash?: string
  ): boolean {
    const agreement = this.agreements.find(a => a.id === id);
    if (!agreement) return false;

    agreement.status = status;
    if (proofUrl !== undefined) {
      agreement.deliverableProofUrl = proofUrl;
    }
    if (releaseTxHash !== undefined) {
      agreement.releaseTxHash = releaseTxHash;
    }
    if (disputeReason !== undefined) {
      agreement.disputeReason = disputeReason;
    }
    if (refundTxHash !== undefined) {
      agreement.refundTxHash = refundTxHash;
    }

    this.saveAgreements();
    return true;
  }

  public raiseDispute(id: string, reason: string, disputeSignature?: string): boolean {
    return this.updateStatus(id, 'disputed', undefined, undefined, reason, disputeSignature);
  }

  public refundAgreement(id: string, refundSignature?: string): boolean {
    return this.updateStatus(id, 'refunded', undefined, undefined, undefined, refundSignature);
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
