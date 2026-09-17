/**
 * Sivan Dynamic Service Agreement Fee Service
 * 
 * ZERO HARDCODED FEES:
 * Every fee calculation is fetched dynamically from the live backend platform settings
 * configured in the Admin Hub.
 * 
 * Endpoints:
 * - GET /api/agreements/quote?amount=25
 * - GET /api/v1/agreement/fee?currency=USDC&amount=25
 * - GET /api/v1/agreement/limits
 */

import { getPaymentApiUrl } from '../config/api.config';

export interface AgreementFeeQuote {
  amount: number;
  currency: string;
  protocolFee: number;
  netAmount: number;
  totalWithFee?: number;
  feeFormula: string;
  source: string;
}

export interface DynamicAdminLimits {
  minNairaAmount?: number;
  maxNairaAmount?: number;
  minUsdcAmount?: number;
  maxUsdcAmount?: number;
  usdcFeePercent?: number;
  usdcFeeFixed?: number;
  nairaFeePercent?: number;
  nairaFeeFixed?: number;
  nairaFeeModel?: string;
  nairaFeeTiers?: Array<{ max: number | null; fee?: number; rate?: number }>;
  version?: number;
  usdtFeePercent?: number;
  cusdFeePercent?: number;
  cngnFeePercent?: number;
}

class AgreementFeeService {
  private quoteCache: Map<string, { quote: AgreementFeeQuote; timestamp: number }> = new Map();
  private adminLimits: DynamicAdminLimits | null = null;
  private limitsFetchedAt = 0;
  private readonly CACHE_TTL_MS = 30_000; // 30 seconds

  constructor() {
    void this.fetchDynamicLimits();
  }

  /**
   * Fetches the latest live admin settings from the backend.
   */
  public async fetchDynamicLimits(): Promise<DynamicAdminLimits | null> {
    const now = Date.now();
    if (this.adminLimits && now - this.limitsFetchedAt < this.CACHE_TTL_MS) {
      return this.adminLimits;
    }

    const apiBase = getPaymentApiUrl();
    const gatewayOrigin = apiBase.replace(/\/api\/payment\/?$/, '');
    const endpoints = [
      `${gatewayOrigin}/api/settings/limits`,
      `${apiBase}/api/settings/limits`,
      `${apiBase}/api/v1/agreement/limits`,
    ];

    for (const url of endpoints) {
      try {
        const res = await fetch(url, { signal: AbortSignal.timeout(3500) }).catch(() => null);
        if (res && res.ok) {
          const data = await res.json();
          if (data && (data.usdcFeePercent !== undefined || data.minNairaAmount !== undefined)) {
            this.adminLimits = data;
            this.limitsFetchedAt = now;
            return this.adminLimits;
          }
        }
      } catch {
        continue;
      }
    }

    return this.adminLimits;
  }

  /**
   * Fetches dynamic fee directly from the live sivan-escrow-agent platform settings.
   * Zero hardcoded fee math.
   */
  public async getDynamicFeeQuote(amount: number, currency: string): Promise<AgreementFeeQuote> {
    if (amount <= 0 || isNaN(amount)) {
      return {
        amount: 0,
        currency,
        protocolFee: 0,
        netAmount: 0,
        feeFormula: '0.00',
        source: 'sivan_system_empty',
      };
    }

    const cacheKey = `${(currency || 'USDC').toUpperCase()}_${amount}`;
    const cached = this.quoteCache.get(cacheKey);
    const now = Date.now();
    if (cached && now - cached.timestamp < this.CACHE_TTL_MS) {
      return cached.quote;
    }

    // Evaluate live platform settings directly from sivan-escrow-agent /api/settings/limits
    const limits = this.adminLimits || (await this.fetchDynamicLimits());
    if (limits) {
      const isNaira = currency === 'cNGN' || currency === 'NGN' || currency === 'NAIRA';
      let fee = 0;
      let formula = '';

      if (isNaira) {
        if (limits.nairaFeeTiers && Array.isArray(limits.nairaFeeTiers) && limits.nairaFeeTiers.length > 0) {
          const tier = limits.nairaFeeTiers.find(t => t.max === null || amount <= t.max);
          if (tier) {
            if (tier.fee !== undefined) {
              fee = tier.fee;
              formula = `Platform Tier (₦${tier.fee.toLocaleString()})`;
            } else if (tier.rate !== undefined) {
              fee = Math.round((amount * tier.rate) / 100);
              formula = `Platform Tier (${tier.rate}%)`;
            }
          }
        } else if (limits.nairaFeePercent !== undefined) {
          const pct = limits.nairaFeePercent;
          const fixed = limits.nairaFeeFixed ?? 0;
          fee = Math.round((amount * pct) / 100) + fixed;
          formula = `${pct}% + ₦${fixed}`;
        }
      } else if (limits.usdcFeePercent !== undefined) {
        const usdcPct = limits.usdcFeePercent / 100;
        const usdcFixed = limits.usdcFeeFixed ?? 0;
        fee = parseFloat((amount * usdcPct + usdcFixed).toFixed(2));
        formula = `${limits.usdcFeePercent}% + $${usdcFixed.toFixed(2)}`;
      }

      const net = Math.max(0, parseFloat((amount - fee).toFixed(2)));
      const dynamicQuote: AgreementFeeQuote = {
        amount,
        currency,
        protocolFee: fee,
        netAmount: net,
        feeFormula: formula || 'Live Platform Rate',
        source: 'sivan_escrow_agent_api',
      };
      this.quoteCache.set(cacheKey, { quote: dynamicQuote, timestamp: now });
      return dynamicQuote;
    }

    // If offline or connecting, return clean zero state while syncing
    return {
      amount,
      currency,
      protocolFee: 0,
      netAmount: amount,
      feeFormula: 'Syncing live platform rate...',
      source: 'sivan_syncing_live',
    };
  }
}

export const agreementFeeService = new AgreementFeeService();
