import type { FXQuote } from '../types/minipay.types';

export const NIGERIAN_BANKS = [
  { code: '044', name: 'Access Bank' },
  { code: '058', name: 'Guaranty Trust Bank (GTBank)' },
  { code: '057', name: 'Zenith Bank' },
  { code: '033', name: 'United Bank for Africa (UBA)' },
  { code: '011', name: 'First Bank of Nigeria' },
  { code: '999992', name: 'OPay Digital Services' },
  { code: '999991', name: 'PalmPay Limited' },
  { code: '090267', name: 'Kuda Microfinance Bank' },
  { code: '035', name: 'Wema Bank / ALAT' },
];

export const CURRENT_USDC_NGN_RATE = 1450.0; // 1 USDC/USDT/cUSD = 1,450 NGN (Textile RFQ baseline)
export const PROTOCOL_FEE_PERCENT = 0.01; // 1% Sivan protocol fee

export class FXQuotesService {
  /**
   * Get firm conversion quote for USDC, USDT, cUSD, or cNGN to Nigerian Naira
   */
  public getQuote(
    sourceAmount: number, 
    sourceCurrency: 'USDC' | 'USDT' | 'cNGN' | 'cUSD' = 'USDC'
  ): FXQuote {
    const rate = sourceCurrency === 'cNGN' ? 1.0 : CURRENT_USDC_NGN_RATE;
    const gross = sourceAmount * rate;
    const fee = gross * PROTOCOL_FEE_PERCENT;
    const net = gross - fee;

    return {
      sourceAmount,
      sourceCurrency,
      targetCurrency: 'NGN',
      exchangeRate: rate,
      grossOutput: Math.round(gross * 100) / 100,
      protocolFeeAmount: Math.round(fee * 100) / 100,
      netOutput: Math.round(net * 100) / 100,
      expiresInSeconds: 30,
      quoteId: `q_rfq_${Date.now()}`,
    };
  }

  /**
   * Validates NUBAN 10-digit account structure
   */
  public async verifyBankAccount(
    accountNumber: string,
    bankCode: string
  ): Promise<{ valid: boolean; accountName: string }> {
    if (!/^\d{10}$/.test(accountNumber)) {
      return { valid: false, accountName: '' };
    }

    const bank = NIGERIAN_BANKS.find(b => b.code === bankCode);
    const bankLabel = bank ? bank.name.split(' ')[0] : 'Bank';

    return {
      valid: true,
      accountName: `Verified Account (${bankLabel} NUBAN)`,
    };
  }
}

export const fxQuotesService = new FXQuotesService();
