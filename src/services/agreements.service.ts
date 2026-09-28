import type { ServiceAgreement, AgreementStatus } from '../types/minipay.types';
import { CELO_CONFIG } from '../config/celo.config';
import { agreementFeeService } from './agreement-fee.service';
import { getPaymentApiUrl } from '../config/api.config';
import { miniPayService } from './minipay.service';

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
        // Clean out any legacy mock or orphaned agreements from previous testing without valid identity
        this.agreements = parsed.filter(a =>
          !a.id.startsWith('agr_celo_01') &&
          !a.id.startsWith('agr_celo_02') &&
          !a.id.startsWith('agr_celo_03') &&
          a.id !== 'agr_1789488316581' &&
          a.id !== 'agr_1789508144567'
        );
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
    return [...this.agreements].sort((a, b) => {
      // Priority 1: Action Required and Active deals stay at the very top
      const getPriority = (status: AgreementStatus): number => {
        switch (status) {
          case 'delivered': // Deliverables submitted, awaiting review/release
            return 1;
          case 'in_progress':
          case 'funded': // Active deal in progress
            return 2;
          case 'disputed':
            return 3;
          case 'released': // Settled
            return 4;
          case 'refunded':
          case 'cancelled': // Refunded/Cancelled
            return 5;
          default:
            return 6;
        }
      };

      const pA = getPriority(a.status);
      const pB = getPriority(b.status);

      if (pA !== pB) {
        return pA - pB;
      }

      // Priority 2: Recency (most recent timestamp / ID first)
      const timeA = a.createdAt ? new Date(a.createdAt).getTime() : (parseInt(a.id.replace(/\D/g, '')) || 0);
      const timeB = b.createdAt ? new Date(b.createdAt).getTime() : (parseInt(b.id.replace(/\D/g, '')) || 0);
      return timeB - timeA;
    });
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
    if (!agreement.buyerAddress || agreement.buyerAddress.length < 10) {
      const connAddr = miniPayService.getState().address;
      if (connAddr && connAddr.startsWith('0x')) {
        agreement.buyerAddress = connAddr;
        this.saveAgreements();
      } else {
        return false;
      }
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

  public async refundAgreement(id: string, refundSignature?: string, buyerAddress?: string): Promise<{ success: boolean; refundTxHash?: string }> {
    const agreement = this.agreements.find(a => a.id === id);
    if (!agreement) return { success: false };

    agreement.status = 'refunded';
    if (refundSignature) {
      agreement.refundTxHash = refundSignature;
    }
    this.saveAgreements();

    try {
      const res = await fetch(`${this.apiBase}/api/agreements/${agreement.id}/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          signature: refundSignature,
          buyerAddress: buyerAddress || agreement.buyerAddress,
          amount: agreement.amount,
          currency: agreement.currency,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.refundTxHash) {
          agreement.refundTxHash = data.refundTxHash;
          this.saveAgreements();
          return { success: true, refundTxHash: data.refundTxHash };
        }
      }
    } catch (err) {
      console.warn('[AgreementsService.refundAgreement] backend cancel note:', err);
    }

    return { success: true, refundTxHash: agreement.refundTxHash };
  }

  public extendDeadline(id: string, additionalHours: number): boolean {
    const agreement = this.agreements.find(a => a.id === id);
    if (!agreement) return false;

    const baseTimestamp = Math.max(Date.now(), agreement.deadlineTimestamp || Date.now());
    const addedMs = Math.max(1, additionalHours) * 3600 * 1000;
    agreement.deadlineTimestamp = baseTimestamp + addedMs;
    agreement.deadlineHours = (agreement.deadlineHours || 0) + additionalHours;

    if (agreement.status !== 'released' && agreement.status !== 'refunded') {
      agreement.status = 'funded';
    }

    this.saveAgreements();

    // Sync extension to backend gateway
    fetch(`${this.apiBase}/api/agreements/${agreement.id}/extend`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ additionalHours }),
    }).catch(err => console.warn('[AgreementsService.extendDeadline] backend sync note:', err));

    return true;
  }

  public async cancelAndRefundOverdue(id: string, refundSignature?: string, buyerAddress?: string): Promise<{ success: boolean; refundTxHash?: string }> {
    const agreement = this.agreements.find(a => a.id === id);
    if (!agreement) return { success: false };

    agreement.status = 'refunded';
    if (refundSignature) {
      agreement.refundTxHash = refundSignature;
    }

    this.saveAgreements();

    try {
      const res = await fetch(`${this.apiBase}/api/agreements/${agreement.id}/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          signature: refundSignature,
          buyerAddress: buyerAddress || agreement.buyerAddress,
          amount: agreement.amount,
          currency: agreement.currency,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.refundTxHash) {
          agreement.refundTxHash = data.refundTxHash;
          this.saveAgreements();
          return { success: true, refundTxHash: data.refundTxHash };
        }
      }
    } catch (err) {
      console.warn('[AgreementsService.cancelAndRefundOverdue] backend cancel note:', err);
    }

    return { success: true, refundTxHash: agreement.refundTxHash };
  }

  public async releaseAgreement(id: string, releaseSignature?: string): Promise<{ success: boolean; releaseTxHash?: string }> {
    const agreement = this.agreements.find(a => a.id === id);
    if (!agreement) return { success: false };

    agreement.status = 'released';
    if (releaseSignature) {
      agreement.releaseTxHash = releaseSignature;
    }
    this.saveAgreements();

    try {
      const res = await fetch(`${this.apiBase}/api/agreements/${agreement.id}/release`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          signature: releaseSignature,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.releaseTxHash) {
          agreement.releaseTxHash = data.releaseTxHash;
          this.saveAgreements();
          return { success: true, releaseTxHash: data.releaseTxHash };
        }
      }
    } catch (err) {
      console.warn('[AgreementsService.releaseAgreement] backend release note:', err);
    }

    return { success: true, releaseTxHash: agreement.releaseTxHash };
  }

  private pollInterval: any = null;

  public startAutoSync(getConnectedAddress?: () => string | null) {
    if (this.pollInterval) return;
    this.syncWithBackend(getConnectedAddress ? getConnectedAddress() || undefined : undefined);
    this.pollInterval = setInterval(() => {
      this.syncWithBackend(getConnectedAddress ? getConnectedAddress() || undefined : undefined);
    }, 4000);
  }

  public async syncWithBackend(walletAddress?: string): Promise<void> {
    let hasChanges = false;

    // 1. Sync live status for each existing active agreement in memory
    for (const agr of this.agreements) {
      if (agr.status === 'released' && agr.releaseTxHash && agr.releaseTxHash.length === 66) continue;
      if (agr.status === 'refunded' && agr.refundTxHash && agr.refundTxHash.length === 66) continue;

      // Auto-heal missing buyerAddress from connected wallet
      if ((!agr.buyerAddress || agr.buyerAddress.length < 10) && walletAddress && walletAddress.startsWith('0x')) {
        agr.buyerAddress = walletAddress;
        hasChanges = true;
      }

      // If still missing buyerAddress, skip backend polling to prevent 404 loops
      if (!agr.buyerAddress || agr.buyerAddress.length < 10) {
        continue;
      }

      try {
        const res = await fetch(`${this.apiBase}/api/agreements/${encodeURIComponent(agr.id)}`);
        if (res.ok) {
          const backendData = await res.json();
          const backendStatus: string = (backendData.status || '').toLowerCase();

          let mappedStatus: AgreementStatus = agr.status;
          if (backendStatus === 'delivered') mappedStatus = 'delivered';
          else if (backendStatus === 'released') mappedStatus = 'released';
          else if (backendStatus === 'cancelled' || backendStatus === 'refunded') mappedStatus = 'refunded';
          else if (backendStatus === 'disputed') mappedStatus = 'disputed';
          else if (backendStatus === 'funded' || backendStatus === 'in_delivery') mappedStatus = 'funded';

          if (mappedStatus !== agr.status) {
            agr.status = mappedStatus;
            hasChanges = true;
          }

          if (backendData.deliverableProofUrl && backendData.deliverableProofUrl !== agr.deliverableProofUrl) {
            agr.deliverableProofUrl = backendData.deliverableProofUrl;
            hasChanges = true;
          }
          if (backendData.releaseTxHash && backendData.releaseTxHash !== agr.releaseTxHash) {
            agr.releaseTxHash = backendData.releaseTxHash;
            hasChanges = true;
          }
          if (backendData.refundTxHash && backendData.refundTxHash !== agr.refundTxHash) {
            agr.refundTxHash = backendData.refundTxHash;
            hasChanges = true;
          }
          if (backendData.disputeReason && backendData.disputeReason !== agr.disputeReason) {
            agr.disputeReason = backendData.disputeReason;
            hasChanges = true;
          }
        } else if (res.status === 404 && (agr.status === 'funded' || Boolean(agr.fundingTxHash))) {
          // If agreement exists in local storage with on-chain funding but missing on backend, sync it
          this.syncAgreementToBackend(agr).catch(() => {});
        }
      } catch (err) {
        // Silently skip if network blip
      }
    }

    // 2. Discover counterparty agreements from backend if wallet address is connected
    if (walletAddress && walletAddress.startsWith('0x')) {
      try {
        const res = await fetch(`${this.apiBase}/api/agreements?userId=${encodeURIComponent(walletAddress)}`);
        if (res.ok) {
          const list = await res.json();
          if (Array.isArray(list)) {
            for (const item of list) {
              const existing = this.agreements.find(a => a.id === item.id);
              if (!existing) {
                const st = String(item.status || 'funded').toLowerCase();
                const mappedStatus: AgreementStatus =
                  st === 'delivered' ? 'delivered' :
                  st === 'released' ? 'released' :
                  st === 'cancelled' || st === 'refunded' ? 'refunded' :
                  st === 'disputed' ? 'disputed' : 'funded';

                this.agreements.unshift({
                  id: item.id,
                  title: item.title,
                  description: item.description || '',
                  contractorIdentifier: item.sellerUserId || item.sellerWalletAddress || 'Contractor',
                  contractorAddress: item.sellerWalletAddress || item.sellerUserId || '',
                  buyerAddress: item.buyerWalletAddress || item.buyerUserId || walletAddress,
                  amount: item.amountUsdc || item.amount || 0,
                  currency: item.currency || 'USDC',
                  protocolFee: item.feeAmountUsdc || 0,
                  netAmount: item.sellerNetAmountUsdc || item.amountUsdc || 0,
                  status: mappedStatus,
                  createdAt: item.createdAt || new Date().toISOString(),
                  deadlineHours: (item.deadlineDays || 1) * 24,
                  deadlineTimestamp: item.deliveryDueAt ? new Date(item.deliveryDueAt).getTime() : Date.now() + (item.deadlineDays || 1) * 86400000,
                  fundingTxHash: item.fundingTxHash || undefined,
                  releaseTxHash: item.releaseTxHash || undefined,
                  refundTxHash: item.refundTxHash || undefined,
                  deliverableProofUrl: item.deliverableProofUrl || undefined,
                  disputeReason: item.disputeReason || undefined,
                  attributionTag: item.attributionTag || CELO_CONFIG.attributionTag,
                });
                hasChanges = true;
              }
            }
          }
        }
      } catch (err) {
        // Silently skip if network blip
      }
    }

    if (hasChanges) {
      this.saveAgreements();
    }
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
