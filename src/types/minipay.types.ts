import type { SupportedTokenSymbol } from '../config/celo.config';

export interface MiniPayDetectionState {
  isMiniPay: boolean;
  address: string | null;
  chainId: number | null;
  mode: 'live_minipay' | 'connected_wallet' | 'desktop_evaluator' | 'disconnected';
}

export interface TokenBalance {
  symbol: SupportedTokenSymbol;
  name: string;
  balanceFormatted: string;
  balanceRaw: bigint;
  decimals: number;
  icon: string;
  usdValue: number;
}

export type AgreementStatus = 'funded' | 'in_progress' | 'delivered' | 'released' | 'disputed' | 'refunded' | 'cancelled';

export interface ServiceAgreement {
  id: string;
  title: string;
  description: string;
  contractorIdentifier: string; // Phone, Celo 0x, or handle
  contractorAddress: string;
  buyerAddress: string;         // Real connected wallet address of the buyer — never a placeholder
  amount: number;
  currency: 'USDC' | 'USDT' | 'cNGN' | 'cUSD';
  protocolFee: number; // 1%
  netAmount: number;
  status: AgreementStatus;
  createdAt: string;
  deadlineHours: number;
  deadlineTimestamp: number;
  deliverableProofUrl?: string;
  fundingTxHash?: string;
  releaseTxHash?: string;
  disputeReason?: string;
  disputeTxHash?: string;
  refundTxHash?: string;
  attributionTag: string;
}

export interface FXQuote {
  sourceAmount: number;
  sourceCurrency: 'USDC' | 'USDT' | 'cNGN' | 'cUSD';
  targetCurrency: 'NGN' | 'GHS' | 'KES' | 'ZAR' | 'USDC' | 'USD';
  targetCurrencySymbol?: string;
  exchangeRate: number; // e.g. 1 USDC = 1,485 NGN or 15.65 GHS
  grossOutput: number;
  protocolFeeAmount: number; // 1%
  netOutput: number;
  expiresInSeconds: number;
  quoteId: string;
}

export interface BankCashoutRequest {
  sourceToken: 'USDC' | 'USDT' | 'cNGN' | 'cUSD';
  amount: number;
  bankCode: string;
  bankName: string;
  accountNumber: string;
  accountName: string;
  quote: FXQuote;
}
