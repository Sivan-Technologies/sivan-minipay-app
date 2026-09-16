export interface ResolvedTargetResult {
  found: boolean;
  target: string;
  user?: {
    userId: string;
    username?: string;
    displayName?: string;
    phone?: string;
    targetAddress?: string;
    chain?: string;
    wallets?: { chain: string; address: string }[];
  };
}

export interface UsernameAvailabilityResult {
  username: string;
  available: boolean;
  reserved: boolean;
  ownerIsCurrentUser: boolean;
}

const PROFILE_KEY = 'sivan_minipay_user_profile';

class IdentityService {
  private get apiBase(): string {
    return (import.meta.env.VITE_PAYMENT_API_URL || 'https://api-staging.sivantech.online').replace(/\/$/, '');
  }

  public getSavedUsername(): string | null {
    try {
      const data = localStorage.getItem(PROFILE_KEY);
      if (data) {
        const parsed = JSON.parse(data);
        return parsed.username || null;
      }
    } catch {}
    return null;
  }

  public saveProfile(profile: { username?: string; address?: string }) {
    try {
      const existing = this.getProfile();
      localStorage.setItem(PROFILE_KEY, JSON.stringify({ ...existing, ...profile, updatedAt: new Date().toISOString() }));
    } catch {}
  }

  public getProfile(): { username?: string; address?: string } {
    try {
      const data = localStorage.getItem(PROFILE_KEY);
      if (data) return JSON.parse(data);
    } catch {}
    return {};
  }

  public async resolveTarget(target: string, chain: string = 'celo'): Promise<ResolvedTargetResult> {
    const cleanTarget = target.trim();
    if (!cleanTarget) return { found: false, target };

    try {
      const url = `${this.apiBase}/api/identity/resolve-target?target=${encodeURIComponent(cleanTarget)}&chain=${encodeURIComponent(chain)}`;
      const res = await fetch(url, { headers: { 'Accept': 'application/json' } });
      if (!res.ok) return { found: false, target: cleanTarget };
      const json = await res.json();
      return json?.data || { found: false, target: cleanTarget };
    } catch (err) {
      console.warn('[identity.resolveTarget] error:', err);
      return { found: false, target: cleanTarget };
    }
  }

  public async checkAvailability(username: string): Promise<UsernameAvailabilityResult> {
    const clean = username.trim().replace(/^@+/, '').toLowerCase();
    try {
      const url = `${this.apiBase}/api/users/me/username/availability?username=${encodeURIComponent(clean)}`;
      const res = await fetch(url, { headers: { 'Accept': 'application/json' } });
      if (!res.ok) {
        return { username: clean, available: true, reserved: false, ownerIsCurrentUser: false };
      }
      const json = await res.json();
      return json?.data || { username: clean, available: true, reserved: false, ownerIsCurrentUser: false };
    } catch (err) {
      return { username: clean, available: true, reserved: false, ownerIsCurrentUser: false };
    }
  }

  public async claimUsername(username: string, address: string): Promise<{ success: boolean; username?: string; error?: string }> {
    const clean = username.trim().replace(/^@+/, '').toLowerCase();
    if (!clean || clean.length < 3) {
      return { success: false, error: 'Username must be at least 3 characters long.' };
    }

    try {
      // Save locally first for instant profile state
      this.saveProfile({ username: `@${clean}`, address });
      return { success: true, username: `@${clean}` };
    } catch (err: any) {
      return { success: false, error: err.message || 'Failed to claim username.' };
    }
  }
}

export const identityService = new IdentityService();
