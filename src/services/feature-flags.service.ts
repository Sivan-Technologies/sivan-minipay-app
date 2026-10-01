import { getPaymentApiUrl } from '../config/api.config';

export interface PublicFeatureStatus {
  moneygram: {
    enabled: boolean;
    minipayEnabled: boolean;
    telegramEnabled: boolean;
    whatsappEnabled: boolean;
    webappEnabled: boolean;
    maintenanceMode: boolean;
    maintenanceReason: string;
    corridors: string[];
    platformFeePercent: number;
    minAmountUsdc: number;
    maxAmountUsdc: number;
  };
  utilities: {
    enabled: boolean;
    airtimeEnabled: boolean;
    dataEnabled: boolean;
    electricityEnabled: boolean;
    cableTvEnabled: boolean;
    maintenanceMode: boolean;
  };
}

export interface ActivePickupVoucher {
  id: string;
  amountUsdc: number;
  targetCurrency: string;
  targetAmount: number;
  pickupPin?: string;
  status: 'pending_user_transfer_start' | 'pending_user_transfer_complete' | 'ready_for_pickup' | 'completed' | 'refunded' | 'expired';
  moreInfoUrl: string;
  walletAddress: string;
  createdAt: string;
  updatedAt: string;
}

const STORAGE_FEATURES_KEY = 'sivan.minipay.features.status';
const STORAGE_PICKUPS_KEY = 'sivan.minipay.active_pickups';

const DEFAULT_STATUS: PublicFeatureStatus = {
  moneygram: {
    enabled: true,
    minipayEnabled: true,
    telegramEnabled: true,
    whatsappEnabled: true,
    webappEnabled: true,
    maintenanceMode: false,
    maintenanceReason: '',
    corridors: ['NG', 'GH', 'KE', 'UG', 'ZA', 'CO', 'PH', 'US'],
    platformFeePercent: 0,
    minAmountUsdc: 5,
    maxAmountUsdc: 500,
  },
  utilities: {
    enabled: true,
    airtimeEnabled: true,
    dataEnabled: true,
    electricityEnabled: true,
    cableTvEnabled: true,
    maintenanceMode: false,
  },
};

export class FeatureFlagsService {
  private cachedStatus: PublicFeatureStatus | null = null;
  private lastFetchedAt = 0;
  private readonly CACHE_TTL_MS = 30000; // 30 seconds

  async fetchFeatureStatus(force = false): Promise<PublicFeatureStatus> {
    const now = Date.now();
    if (!force && this.cachedStatus && now - this.lastFetchedAt < this.CACHE_TTL_MS) {
      return this.cachedStatus;
    }

    try {
      let baseUrl = '';
      try {
        const fullApi = getPaymentApiUrl();
        const parsed = new URL(fullApi);
        baseUrl = parsed.origin;
      } catch {
        baseUrl = 'https://api.sivantech.online';
      }

      const res = await fetch(`${baseUrl}/api/features/status`, {
        method: 'GET',
        headers: { Accept: 'application/json' },
      });

      if (res.ok) {
        const json = await res.json();
        if (json?.data) {
          this.cachedStatus = json.data;
          this.lastFetchedAt = now;
          try {
            localStorage.setItem(STORAGE_FEATURES_KEY, JSON.stringify(json.data));
          } catch {}
          return json.data;
        }
      }
    } catch {
      // Offline or network error: fall back to localStorage
    }

    try {
      const stored = localStorage.getItem(STORAGE_FEATURES_KEY);
      if (stored) {
        this.cachedStatus = JSON.parse(stored);
        return this.cachedStatus!;
      }
    } catch {}

    this.cachedStatus = DEFAULT_STATUS;
    return DEFAULT_STATUS;
  }

  async isMoneyGramPickupEnabled(): Promise<boolean> {
    const status = await this.fetchFeatureStatus();
    return Boolean(
      status.moneygram?.enabled &&
      status.moneygram?.minipayEnabled &&
      !status.moneygram?.maintenanceMode
    );
  }

  getActivePickups(walletAddress?: string): ActivePickupVoucher[] {
    try {
      const stored = localStorage.getItem(STORAGE_PICKUPS_KEY);
      if (!stored) return [];
      const list: ActivePickupVoucher[] = JSON.parse(stored);
      // Active means NOT completed, NOT refunded, NOT expired
      const active = list.filter(
        (p) => p.status !== 'completed' && p.status !== 'refunded' && p.status !== 'expired'
      );
      if (walletAddress) {
        const normalized = walletAddress.toLowerCase();
        return active.filter((p) => p.walletAddress?.toLowerCase() === normalized);
      }
      return active;
    } catch {
      return [];
    }
  }

  saveActivePickup(voucher: ActivePickupVoucher): void {
    try {
      const stored = localStorage.getItem(STORAGE_PICKUPS_KEY);
      let list: ActivePickupVoucher[] = stored ? JSON.parse(stored) : [];
      const idx = list.findIndex((item) => item.id === voucher.id);
      if (idx >= 0) {
        list[idx] = { ...list[idx], ...voucher, updatedAt: new Date().toISOString() };
      } else {
        list.unshift({ ...voucher, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
      }
      localStorage.setItem(STORAGE_PICKUPS_KEY, JSON.stringify(list));
    } catch {}
  }

  async syncPickupStatus(voucherId: string): Promise<ActivePickupVoucher | null> {
    try {
      let baseUrl = '';
      try {
        const fullApi = getPaymentApiUrl();
        const parsed = new URL(fullApi);
        baseUrl = parsed.origin;
      } catch {
        baseUrl = 'https://api.sivantech.online';
      }

      const res = await fetch(`${baseUrl}/api/moneygram/transactions/${voucherId}`, {
        method: 'GET',
        headers: { Accept: 'application/json' },
      });

      if (res.ok) {
        const json = await res.json();
        const tx = json?.data;
        if (tx) {
          const stored = localStorage.getItem(STORAGE_PICKUPS_KEY);
          let list: ActivePickupVoucher[] = stored ? JSON.parse(stored) : [];
          const idx = list.findIndex((item) => item.id === voucherId);
          if (idx >= 0) {
            list[idx].status = tx.status || list[idx].status;
            if (tx.externalTransactionId) list[idx].pickupPin = tx.externalTransactionId;
            list[idx].updatedAt = new Date().toISOString();
            localStorage.setItem(STORAGE_PICKUPS_KEY, JSON.stringify(list));
            return list[idx];
          }
        }
      }
    } catch {}
    return null;
  }

  dismissPickup(voucherId: string): void {
    try {
      const stored = localStorage.getItem(STORAGE_PICKUPS_KEY);
      if (!stored) return;
      let list: ActivePickupVoucher[] = JSON.parse(stored);
      list = list.map((item) => {
        if (item.id === voucherId) {
          return { ...item, status: 'completed', updatedAt: new Date().toISOString() };
        }
        return item;
      });
      localStorage.setItem(STORAGE_PICKUPS_KEY, JSON.stringify(list));
    } catch {}
  }
}

export const featureFlagsService = new FeatureFlagsService();
