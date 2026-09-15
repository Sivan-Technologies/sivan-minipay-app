import { getPaymentApiUrl } from '../config/api.config';

export interface TextileProof {
  nonce: string;
  issuedAt: number;
  signature: string;
}

export interface TextileCustomerAddress {
  line1: string;
  line2?: string;
  city: string;
  state: string;
  postalCode: string;
}

export interface TextileCustomerProfile {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  birthDate: string; // 'dd-mm-yyyy'
  address: TextileCustomerAddress;
}

export interface TextileKycState {
  state: 'unverified' | 'pending' | 'verified' | 'rejected' | 'expired';
  providerStatus: string;
  rejectionReasons: string[];
  requirementsDue: string[];
  level: string;
  canDeposit: boolean;
  maxBuy?: {
    amount: string;
    currency: string;
  } | null;
}

export interface TextileKycDocument {
  type: 'passport' | 'national-id' | 'drivers-license';
  number: string;
  expiryDate?: string;
  imageFront: string; // base64
  imageBack?: string; // base64
}

const LOCAL_KYC_CACHE_KEY = 'sivan_textile_kyc_state';
const LOCAL_PROFILE_KEY = 'sivan_textile_customer_profile';

class TextileKycService {
  private cachedProof: { proof: TextileProof; wallet: string; expiresAt: number } | null = null;

  /**
   * Generates or reuses valid EIP-712 TakerControl proof of control.
   * Valid for 60 seconds per Textile FX specification.
   */
  public async getProof(walletAddress: string, chainId: number = 56): Promise<TextileProof> {
    const now = Date.now();
    if (
      this.cachedProof &&
      this.cachedProof.wallet.toLowerCase() === walletAddress.toLowerCase() &&
      now < this.cachedProof.expiresAt
    ) {
      return this.cachedProof.proof;
    }

    const nonceBytes = new Uint8Array(32);
    crypto.getRandomValues(nonceBytes);
    const nonce = '0x' + Array.from(nonceBytes).map(b => b.toString(16).padStart(2, '0')).join('');
    const issuedAt = now;

    const domain = {
      name: 'Textile Taker Control',
      version: '1',
      chainId: chainId,
    };

    const types = {
      EIP712Domain: [
        { name: 'name', type: 'string' },
        { name: 'version', type: 'string' },
        { name: 'chainId', type: 'uint256' },
      ],
      TakerControl: [
        { name: 'taker', type: 'address' },
        { name: 'chainId', type: 'uint256' },
        { name: 'nonce', type: 'bytes32' },
        { name: 'issuedAt', type: 'uint256' },
      ],
    };

    const message = {
      taker: walletAddress,
      chainId: chainId,
      nonce: nonce,
      issuedAt: issuedAt,
    };

    const provider = (window as any).ethereum;
    if (!provider) {
      throw new Error('No Web3 wallet provider available to sign identity proof.');
    }

    let signature: string;
    try {
      signature = await provider.request({
        method: 'eth_signTypedData_v4',
        params: [
          walletAddress,
          JSON.stringify({
            types,
            domain,
            primaryType: 'TakerControl',
            message,
          }),
        ],
      });
    } catch (v4Err: any) {
      // Fallback to personal_sign or standard signTypedData if v4 is unsupported
      try {
        signature = await provider.request({
          method: 'eth_signTypedData',
          params: [walletAddress, [types.TakerControl, domain, message]],
        });
      } catch (fallbackErr: any) {
        throw new Error(v4Err.message || 'Signature of identity proof was declined.');
      }
    }

    const proof: TextileProof = { nonce, issuedAt, signature };
    // Cache for 45s (under the 60s server limit)
    this.cachedProof = {
      proof,
      wallet: walletAddress,
      expiresAt: now + 45_000,
    };

    return proof;
  }

  /**
   * Reads the current KYC review state for a wallet from Textile / Busha.
   * POST /api/v1/cashout/kyc/status
   */
  public async getKycStatus(
    walletAddress: string,
    chainId: number = 56
  ): Promise<{ status: 'ok' | 'error'; kyc: TextileKycState | null; error?: string }> {
    try {
      const proof = await this.getProof(walletAddress, chainId);
      const url = `${getPaymentApiUrl()}/api/v1/cashout/kyc/status`;

      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({
          provider: 'busha',
          wallet: walletAddress,
          chainId,
          proof,
          fiat: 'NGN',
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        return { status: 'error', kyc: null, error: data.error || 'Failed to fetch KYC status' };
      }

      if (data?.kyc) {
        this.saveLocalKycState(walletAddress, data.kyc);
      }

      return { status: 'ok', kyc: data.kyc || null };
    } catch (err: any) {
      return { status: 'error', kyc: null, error: err.message || 'Could not verify KYC status' };
    }
  }

  /**
   * Registers or updates an individual customer record at Busha/Textile.
   * POST /api/v1/cashout/kyc/register
   */
  public async registerCustomer(
    profile: TextileCustomerProfile,
    walletAddress: string,
    chainId: number = 56
  ): Promise<{ status: 'ok' | 'error'; customer?: any; error?: string }> {
    try {
      const proof = await this.getProof(walletAddress, chainId);
      const url = `${getPaymentApiUrl()}/api/v1/cashout/kyc/register`;

      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({
          provider: 'busha',
          wallet: walletAddress,
          chainId,
          proof,
          acceptedTerms: true,
          ...profile,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        return { status: 'error', error: data.error || 'Failed to register customer' };
      }

      this.saveLocalProfile(walletAddress, profile);
      return { status: 'ok', customer: data.customer };
    } catch (err: any) {
      return { status: 'error', error: err.message || 'Customer registration failed' };
    }
  }

  /**
   * Requests a hosted KYC verification portal link (Sumsub WebSDK via Busha).
   * POST /api/v1/cashout/kyc/link
   */
  public async getHostedVerificationLink(
    walletAddress: string,
    chainId: number = 56
  ): Promise<{ status: 'ok' | 'error'; url?: string; error?: string }> {
    try {
      const proof = await this.getProof(walletAddress, chainId);
      const url = `${getPaymentApiUrl()}/api/v1/cashout/kyc/link`;

      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({
          provider: 'busha',
          wallet: walletAddress,
          chainId,
          proof,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        return { status: 'error', error: data.error || 'Failed to generate verification portal link' };
      }

      return { status: 'ok', url: data.url };
    } catch (err: any) {
      return { status: 'error', error: err.message || 'Hosted verification link request failed' };
    }
  }

  /**
   * Submits identity documents and selfie directly for review.
   * POST /api/v1/cashout/kyc/submit
   */
  public async submitKycDocuments(
    document: TextileKycDocument,
    selfieImageBase64: string,
    walletAddress: string,
    chainId: number = 56
  ): Promise<{ status: 'ok' | 'error'; kyc?: TextileKycState; error?: string }> {
    try {
      const proof = await this.getProof(walletAddress, chainId);
      const url = `${getPaymentApiUrl()}/api/v1/cashout/kyc/submit`;

      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({
          provider: 'busha',
          wallet: walletAddress,
          chainId,
          proof,
          document,
          selfieImage: selfieImageBase64,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        return { status: 'error', error: data.error || 'Failed to submit verification documents' };
      }

      if (data?.kyc) {
        this.saveLocalKycState(walletAddress, data.kyc);
      }

      return { status: 'ok', kyc: data.kyc };
    } catch (err: any) {
      return { status: 'error', error: err.message || 'Verification document submission failed' };
    }
  }

  /**
   * Local storage helpers
   */
  public getLocalKycState(walletAddress: string): TextileKycState | null {
    try {
      const raw = localStorage.getItem(`${LOCAL_KYC_CACHE_KEY}_${walletAddress.toLowerCase()}`);
      if (raw) return JSON.parse(raw);
    } catch {}
    return null;
  }

  public saveLocalKycState(walletAddress: string, state: TextileKycState): void {
    try {
      localStorage.setItem(`${LOCAL_KYC_CACHE_KEY}_${walletAddress.toLowerCase()}`, JSON.stringify(state));
    } catch {}
  }

  public getLocalProfile(walletAddress: string): TextileCustomerProfile | null {
    try {
      const raw = localStorage.getItem(`${LOCAL_PROFILE_KEY}_${walletAddress.toLowerCase()}`);
      if (raw) return JSON.parse(raw);
    } catch {}
    return null;
  }

  public saveLocalProfile(walletAddress: string, profile: TextileCustomerProfile): void {
    try {
      localStorage.setItem(`${LOCAL_PROFILE_KEY}_${walletAddress.toLowerCase()}`, JSON.stringify(profile));
    } catch {}
  }
}

export const textileKycService = new TextileKycService();
