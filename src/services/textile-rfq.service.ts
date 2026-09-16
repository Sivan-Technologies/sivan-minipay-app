/**
 * Textile RFQ Swap Service for Sivan MiniPay App
 * 
 * Interacts with Textile FX API v2 RFQ engine:
 * Base URL: https://api.textilecredit.com/v2/rfq
 * 
 * Supports on-chain Celo market maker swap quotes between:
 * - USDT <-> cNGN
 * - USDC <-> cNGN
 * - cUSD <-> cNGN
 * - USDT <-> USDC
 */

import { getPaymentApiUrl } from '../config/api.config';

export type SwapToken = 'USDT' | 'USDC' | 'cUSD' | 'cNGN';

export interface SwapQuoteResult {
  fromToken: SwapToken;
  toToken: SwapToken;
  inputAmount: number;
  outputAmount: number;
  rate: number;
  inverseRate: number;
  priceImpactBps: number;
  protocolFee: number;
  minimumReceived: number;
  expiresInSeconds: number;
  source: string;
  depositAddress?: string;
  calldata?: string;
}

const CACHE_TTL_MS = 25_000;

class TextileRfqService {
  private quoteCache = new Map<string, { quote: SwapQuoteResult; fetchedAt: number }>();

  /**
   * Fetches an indicative or firm RFQ swap quote from Sivan Payment backend
   */
  public async getSwapQuote(
    fromToken: SwapToken,
    toToken: SwapToken,
    amount: number,
    userAddress?: string
  ): Promise<SwapQuoteResult> {
    if (fromToken === toToken) {
      return {
        fromToken,
        toToken,
        inputAmount: amount,
        outputAmount: amount,
        rate: 1.0,
        inverseRate: 1.0,
        priceImpactBps: 0,
        protocolFee: 0,
        minimumReceived: amount,
        expiresInSeconds: 60,
        source: '1:1 Direct',
      };
    }

    const cacheKey = `${fromToken}_${toToken}_${amount.toFixed(4)}_${userAddress || ''}`;
    const cached = this.quoteCache.get(cacheKey);
    if (cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) {
      return cached.quote;
    }

    // 1. Primary: Query secure Sivan Payment backend gateway (keeps API key secure on server)
    const apiBase = getPaymentApiUrl();
    try {
      const qParams = new URLSearchParams({
        fromToken,
        toToken,
        amount: String(amount),
      });
      if (userAddress) {
        qParams.set('userAddress', userAddress);
      }
      const res = await fetch(`${apiBase}/api/v1/cashout/swap-quote?${qParams.toString()}`, {
        headers: { 'Accept': 'application/json' },
        signal: AbortSignal.timeout(8000),
      }).catch(() => null);

      if (res && res.ok) {
        const data = await res.json();
        if (data?.rate && typeof data.rate === 'number' && data.rate > 0) {
          const result: SwapQuoteResult = {
            fromToken,
            toToken,
            inputAmount: amount,
            outputAmount: data.outputAmount || (amount * data.rate),
            rate: data.rate,
            inverseRate: data.inverseRate || (data.rate > 0 ? 1 / data.rate : 0),
            priceImpactBps: 15,
            protocolFee: data.protocolFee || 0,
            minimumReceived: data.minimumReceived || (data.outputAmount * 0.995),
            expiresInSeconds: 60,
            source: data.source || 'Textile Credit RFQ (Live Backend)',
            depositAddress: data.depositAddress,
          };
          this.quoteCache.set(cacheKey, { quote: result, fetchedAt: Date.now() });
          return result;
        }
      }
    } catch (err) {
      // ignore
    }

    // If server RFQ is pending or network was interrupted, check cached live quote
    if (cached) {
      return cached.quote;
    }

    throw new Error(`Live RFQ quote unavailable for ${fromToken} to ${toToken}. Please verify network connection.`);
  }
}

export const textileRfqService = new TextileRfqService();
