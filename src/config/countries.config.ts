export interface SupportedCountry {
  code: string; // 'NG' | 'GH' | 'KE' | 'ZA'
  name: string;
  flag: string;
  currency: string; // 'NGN' | 'GHS' | 'KES' | 'ZAR'
  currencySymbol: string; // '₦' | 'GH₵' | 'KSh' | 'R'
  defaultUsdRate: number;
  railType: 'nibss_bank' | 'mobile_money_and_bank';
  accountLabel: string;
  accountPlaceholder: string;
  settlementDescription: string;
  defaultBanks: Array<{
    code: string;
    name: string;
    category: 'fintech_wallet' | 'commercial_bank' | 'mobile_money';
    logoUrl?: string;
  }>;
}

export const SUPPORTED_COUNTRIES: Record<string, SupportedCountry> = {
  NG: {
    code: 'NG',
    name: 'Nigeria',
    flag: '🇳🇬',
    currency: 'NGN',
    currencySymbol: '₦',
    defaultUsdRate: 1485.5,
    railType: 'nibss_bank',
    accountLabel: '10-Digit NUBAN Account Number',
    accountPlaceholder: 'e.g. 0123456789',
    settlementDescription: 'Direct payout to Nigerian commercial and digital banks. Bank credit typically in under 1 to 2 minutes via NIBSS / NIP rails; internal ledger settled in 0.15s.',
    defaultBanks: [
      { code: '100004', name: 'OPay Digital Services', category: 'fintech_wallet', logoUrl: '/banks/opay.png' },
      { code: '100033', name: 'PalmPay Limited', category: 'fintech_wallet', logoUrl: '/banks/palmpay.png' },
      { code: '090267', name: 'Kuda Microfinance Bank', category: 'fintech_wallet', logoUrl: '/banks/kuda.png' },
      { code: '000013', name: 'Guaranty Trust Bank (GTBank)', category: 'commercial_bank', logoUrl: '/banks/gtbank.png' },
      { code: '000014', name: 'Access Bank', category: 'commercial_bank', logoUrl: '/banks/access.png' },
      { code: '000015', name: 'Zenith Bank', category: 'commercial_bank', logoUrl: '/banks/zenith.png' },
      { code: '000004', name: 'United Bank for Africa (UBA)', category: 'commercial_bank', logoUrl: '/banks/uba.png' },
      { code: '000016', name: 'First Bank of Nigeria', category: 'commercial_bank', logoUrl: '/banks/firstbank.png' },
      { code: '000017', name: 'Wema Bank', category: 'commercial_bank', logoUrl: '/banks/wema.png' },
    ],
  },
  GH: {
    code: 'GH',
    name: 'Ghana',
    flag: '🇬🇭',
    currency: 'GHS',
    currencySymbol: 'GH₵',
    defaultUsdRate: 15.65,
    railType: 'mobile_money_and_bank',
    accountLabel: 'Mobile Money Number or Bank Account',
    accountPlaceholder: 'e.g. 024XXXXXXX (MoMo) or Bank Acct',
    settlementDescription: 'Instant payout to Ghanaian Mobile Money (MTN MoMo, Telecel Cash, AirtelTigo) and commercial banks. Typically settled in under 1 to 2 minutes via GhIPSS rails.',
    defaultBanks: [
      { code: 'GH_MTN', name: 'MTN Mobile Money (MoMo)', category: 'mobile_money' },
      { code: 'GH_TELECEL', name: 'Telecel Cash (Vodafone)', category: 'mobile_money' },
      { code: 'GH_AIRTELTIGO', name: 'AirtelTigo Money', category: 'mobile_money' },
      { code: 'GH_GCB', name: 'GCB Bank Limited', category: 'commercial_bank' },
      { code: 'GH_ECOBANK', name: 'Ecobank Ghana', category: 'commercial_bank' },
      { code: 'GH_STANBIC', name: 'Stanbic Bank Ghana', category: 'commercial_bank' },
      { code: 'GH_ABSA', name: 'Absa Bank Ghana', category: 'commercial_bank' },
      { code: 'GH_FIDELITY', name: 'Fidelity Bank Ghana', category: 'commercial_bank' },
    ],
  },
  KE: {
    code: 'KE',
    name: 'Kenya',
    flag: '🇰🇪',
    currency: 'KES',
    currencySymbol: 'KSh',
    defaultUsdRate: 129.8,
    railType: 'mobile_money_and_bank',
    accountLabel: 'M-PESA Phone Number or Bank Account',
    accountPlaceholder: 'e.g. 0712345678 (M-PESA) or Bank Acct',
    settlementDescription: 'Instant mobile payout via Safaricom M-PESA B2C, Airtel Money, and Pesalink commercial bank rails. Typically settled in under 1 to 2 minutes.',
    defaultBanks: [
      { code: 'KE_MPESA', name: 'Safaricom M-PESA', category: 'mobile_money' },
      { code: 'KE_AIRTEL', name: 'Airtel Money Kenya', category: 'mobile_money' },
      { code: 'KE_EQUITY', name: 'Equity Bank Kenya', category: 'commercial_bank' },
      { code: 'KE_KCB', name: 'KCB Bank Kenya', category: 'commercial_bank' },
      { code: 'KE_COOP', name: 'Co-operative Bank of Kenya', category: 'commercial_bank' },
    ],
  },
  ZA: {
    code: 'ZA',
    name: 'South Africa',
    flag: '🇿🇦',
    currency: 'ZAR',
    currencySymbol: 'R',
    defaultUsdRate: 18.25,
    railType: 'mobile_money_and_bank',
    accountLabel: 'Bank Account Number or PayShap ID',
    accountPlaceholder: 'e.g. 1234567890 or 082XXXXXXX@shap',
    settlementDescription: 'Instant EFT and PayShap payout to South African banks. Typically settled in under 1 to 2 minutes.',
    defaultBanks: [
      { code: 'ZA_CAPITEC', name: 'Capitec Bank', category: 'commercial_bank' },
      { code: 'ZA_STANLIB', name: 'Standard Bank of South Africa', category: 'commercial_bank' },
      { code: 'ZA_FNB', name: 'First National Bank (FNB)', category: 'commercial_bank' },
      { code: 'ZA_NEDBANK', name: 'Nedbank', category: 'commercial_bank' },
      { code: 'ZA_ABSA', name: 'Absa Bank South Africa', category: 'commercial_bank' },
    ],
  },
};

const ACTIVE_COUNTRY_KEY = 'sivan_active_country';

/**
 * Intelligent country detection based on user's timezone/locale with smooth fallback.
 */
export function detectDefaultCountry(): SupportedCountry {
  try {
    const stored = localStorage.getItem(ACTIVE_COUNTRY_KEY);
    if (stored && SUPPORTED_COUNTRIES[stored]) {
      return SUPPORTED_COUNTRIES[stored];
    }

    const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || '';
    const tzLower = timeZone.toLowerCase();

    if (tzLower.includes('accra') || tzLower.includes('ghana')) {
      return SUPPORTED_COUNTRIES.GH;
    }
    if (tzLower.includes('nairobi') || tzLower.includes('kenya')) {
      return SUPPORTED_COUNTRIES.KE;
    }
    if (tzLower.includes('johannesburg') || tzLower.includes('south_africa')) {
      return SUPPORTED_COUNTRIES.ZA;
    }
    if (tzLower.includes('lagos') || tzLower.includes('nigeria') || tzLower.includes('west_africa')) {
      return SUPPORTED_COUNTRIES.NG;
    }
  } catch {
    // Default to Nigeria
  }
  return SUPPORTED_COUNTRIES.NG;
}

class CountryStateService {
  private activeCountry: SupportedCountry = detectDefaultCountry();
  private listeners: ((country: SupportedCountry) => void)[] = [];

  public getActiveCountry(): SupportedCountry {
    return this.activeCountry;
  }

  public setCountry(code: string): SupportedCountry {
    const target = SUPPORTED_COUNTRIES[code] || SUPPORTED_COUNTRIES.NG;
    this.activeCountry = target;
    try {
      localStorage.setItem(ACTIVE_COUNTRY_KEY, target.code);
    } catch {
      // safe storage ignore
    }
    this.notify();
    return this.activeCountry;
  }

  public subscribe(fn: (country: SupportedCountry) => void): () => void {
    this.listeners.push(fn);
    return () => {
      this.listeners = this.listeners.filter(l => l !== fn);
    };
  }

  private notify() {
    for (const fn of this.listeners) {
      try {
        fn(this.activeCountry);
      } catch (e) {
        console.error('Country subscriber error:', e);
      }
    }
  }
}

export const countryService = new CountryStateService();
