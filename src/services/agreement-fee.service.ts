/**
 * Sivan System Service Agreement Fee Service
 * 
 * Implements canonical Sivan core system fee rules:
 * - cNGN / Naira: Tiered structure (₦500 to ₦1000, 3.75%, 3.5%)
 * - USDC / USDT / cUSD: 3.0% platform fee + $0.50 fixed
 * 
 * Synchronizes with backend limits and exposes zero-latency calculation for the UI.
 */

export interface AgreementFeeResult {
  amount: number;
  currency: string;
  protocolFee: number;
  netAmount: number;
  feeFormula: string;
  source: string;
}

export interface AgreementLimits {
  minNaira: number;
  maxNaira: number;
  minUsdc: number;
  maxUsdc: number;
  usdcFeePercent: number;
  usdcFeeFixed: number;
  nairaFeePercent: number;
  nairaFeeFixed: number;
}

const DEFAULT_LIMITS: AgreementLimits = {
  minNaira: 5000,
  maxNaira: 5000000,
  minUsdc: 5,
  maxUsdc: 5000,
  usdcFeePercent: 3.0,
  usdcFeeFixed: 0.50,
  nairaFeePercent: 2.5,
  nairaFeeFixed: 50,
};

class AgreementFeeService {
  private limits: AgreementLimits = { ...DEFAULT_LIMITS };

  constructor() {
    void this.refreshLimits();
  }

  public async refreshLimits(): Promise<void> {
    try {
      const res = await fetch('/api/v1/agreement/limits', { signal: AbortSignal.timeout(3000) }).catch(() => null);
      if (res && res.ok) {
        const data = await res.json();
        if (data && typeof data.minNairaAmount === 'number') {
          this.limits = {
            minNaira: data.minNairaAmount,
            maxNaira: data.maxNairaAmount,
            minUsdc: data.minUsdcAmount,
            maxUsdc: data.maxUsdcAmount,
            usdcFeePercent: typeof data.usdcFeePercent === 'number' ? data.usdcFeePercent : 3.0,
            usdcFeeFixed: typeof data.usdcFeeFixed === 'number' ? data.usdcFeeFixed : 0.50,
            nairaFeePercent: typeof data.nairaFeePercent === 'number' ? data.nairaFeePercent : 2.5,
            nairaFeeFixed: typeof data.nairaFeeFixed === 'number' ? data.nairaFeeFixed : 50,
          };
        }
      }
    } catch {
      // Graceful fallback to default system constants
    }
  }

  /**
   * Calculates official Sivan System Service Agreement fee synchronously.
   */
  public calculateFee(amount: number, currency: string): AgreementFeeResult {
    const isNaira = currency === 'cNGN' || currency === 'NGN' || currency === 'NAIRA';
    let fee = 0;
    let formula = '';

    if (isNaira) {
      if (amount <= 10000) {
        fee = 500;
        formula = 'Tier 1: Flat ₦500';
      } else if (amount <= 20000) {
        fee = 900;
        formula = 'Tier 2: Flat ₦900';
      } else if (amount <= 25000) {
        fee = 1000;
        formula = 'Tier 3: Flat ₦1,000';
      } else if (amount <= 50000) {
        fee = Math.round(amount * 0.0375);
        formula = 'Tier 4: 3.75%';
      } else {
        fee = Math.round(amount * 0.035);
        formula = 'Tier 5: 3.50%';
      }
    } else {
      const percentRate = (this.limits.usdcFeePercent ?? 3.0) / 100;
      const fixedFee = this.limits.usdcFeeFixed ?? 0.50;
      fee = parseFloat((amount * percentRate + fixedFee).toFixed(2));
      formula = `${(percentRate * 100).toFixed(1)}% + $${fixedFee.toFixed(2)}`;
    }

    const netAmount = Math.max(0, parseFloat((amount - fee).toFixed(2)));

    return {
      amount,
      currency,
      protocolFee: fee,
      netAmount,
      feeFormula: formula,
      source: 'sivan_system_agreement_engine',
    };
  }
}

export const agreementFeeService = new AgreementFeeService();
