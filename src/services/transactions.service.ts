import { CELO_CONFIG } from '../config/celo.config';

export type TransactionType = 'cashout' | 'agreement_fund' | 'agreement_release' | 'p2p_transfer';

export interface TransactionItem {
  id: string;
  type: TransactionType;
  title: string;
  sourceAmount: number;
  sourceToken: string;
  targetAmount?: number;
  targetCurrency?: string;
  targetCurrencySymbol?: string;
  recipientAccount?: string;
  recipientName?: string;
  bankOrRailName?: string;
  countryCode?: string;
  txHash?: string;
  status: 'completed' | 'processing' | 'failed';
  timestamp: number;
  attributionTag: string;
}

const STORAGE_KEY = 'sivan_minipay_tx_history';

class TransactionsService {
  private items: TransactionItem[] = [];
  private listeners: ((items: TransactionItem[]) => void)[] = [];

  constructor() {
    this.load();
  }

  private load() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        this.items = JSON.parse(stored);
      } else {
        this.items = [];
      }
    } catch {
      this.items = [];
    }
  }

  private save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.items));
    } catch (e) {
      console.warn('Failed to persist transaction history:', e);
    }
    this.notify();
  }

  public getAll(): TransactionItem[] {
    return [...this.items];
  }

  public recordCashout(data: {
    sourceAmount: number;
    sourceToken: string;
    targetAmount: number;
    targetCurrency: string;
    targetCurrencySymbol: string;
    recipientAccount: string;
    recipientName: string;
    bankOrRailName: string;
    countryCode: string;
    txHash?: string;
  }): TransactionItem {
    const item: TransactionItem = {
      id: `tx_cashout_${Date.now()}`,
      type: 'cashout',
      title: `Cash Out to ${data.bankOrRailName}`,
      sourceAmount: data.sourceAmount,
      sourceToken: data.sourceToken,
      targetAmount: data.targetAmount,
      targetCurrency: data.targetCurrency,
      targetCurrencySymbol: data.targetCurrencySymbol,
      recipientAccount: data.recipientAccount,
      recipientName: data.recipientName,
      bankOrRailName: data.bankOrRailName,
      countryCode: data.countryCode,
      txHash: data.txHash,
      status: 'completed',
      timestamp: Date.now(),
      attributionTag: CELO_CONFIG.attributionTag,
    };

    this.items.unshift(item);
    this.save();
    return item;
  }

  public recordAgreementEvent(data: {
    agreementId: string;
    title: string;
    type: 'agreement_fund' | 'agreement_release';
    amount: number;
    token: string;
    txHash?: string;
  }): TransactionItem {
    const isFund = data.type === 'agreement_fund';
    const item: TransactionItem = {
      id: `tx_${data.agreementId}_${Date.now()}`,
      type: data.type,
      title: isFund ? `Funded Deal: ${data.title}` : `Released Deal: ${data.title}`,
      sourceAmount: data.amount,
      sourceToken: data.token,
      txHash: data.txHash,
      status: 'completed',
      timestamp: Date.now(),
      attributionTag: CELO_CONFIG.attributionTag,
    };

    this.items.unshift(item);
    this.save();
    return item;
  }

  public recordTransfer(data: {
    amount: number;
    token: string;
    recipientIdentifier: string;
    recipientAddress: string;
    txHash?: string;
  }): TransactionItem {
    const item: TransactionItem = {
      id: `tx_transfer_${Date.now()}`,
      type: 'p2p_transfer',
      title: `Transfer to ${data.recipientIdentifier}`,
      sourceAmount: data.amount,
      sourceToken: data.token,
      recipientAccount: data.recipientAddress,
      recipientName: data.recipientIdentifier,
      bankOrRailName: 'Celo P2P Direct Rail',
      txHash: data.txHash,
      status: 'completed',
      timestamp: Date.now(),
      attributionTag: CELO_CONFIG.attributionTag,
    };

    this.items.unshift(item);
    this.save();
    return item;
  }

  public subscribe(fn: (items: TransactionItem[]) => void): () => void {
    this.listeners.push(fn);
    return () => {
      this.listeners = this.listeners.filter(l => l !== fn);
    };
  }

  private notify() {
    for (const fn of this.listeners) {
      try {
        fn(this.getAll());
      } catch (e) {
        console.error('Transaction subscriber error:', e);
      }
    }
  }
}

export const transactionsService = new TransactionsService();
