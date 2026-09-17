import type { MiniPayDetectionState } from '../types/minipay.types';
import {
  CELO_CONFIG,
  getActiveNetwork,
  setActiveNetworkMode,
  NETWORKS,
  type NetworkMode,
  type SupportedTokenSymbol,
} from '../config/celo.config';
import { buildAttributedTransferCalldata } from './celo-client';
import { attachAttributionSuffix } from '../config/attribution';
import { parseUnits } from 'viem';

function toSafeDecimalString(value: number | string, decimals: number): string {
  const str = typeof value === 'number' ? value.toString() : value;
  if (!str.includes('.')) return str;
  const [whole, fraction] = str.split('.');
  return `${whole}.${fraction.slice(0, decimals)}`;
}

class MiniPayService {
  private state: MiniPayDetectionState = {
    isMiniPay: false,
    address: null,
    chainId: null,
    mode: 'disconnected',
  };

  private listeners: ((state: MiniPayDetectionState) => void)[] = [];

  constructor() {
    this.detectEnvironment();
    this.listenToWalletEvents();
  }

  public isMiniPayInjected(): boolean {
    if (typeof window === 'undefined') return false;
    const eth = (window as any).ethereum;
    return !!eth && eth.isMiniPay === true;
  }

  public hasInjectedWallet(): boolean {
    if (typeof window === 'undefined') return false;
    return typeof (window as any).ethereum !== 'undefined';
  }

  public async detectEnvironment(): Promise<MiniPayDetectionState> {
    if (this.isMiniPayInjected()) {
      try {
        const provider = (window as any).ethereum;
        const accounts: string[] = await provider.request({ method: 'eth_requestAccounts' });
        const chainIdHex: string = await provider.request({ method: 'eth_chainId' });
        const chainId = parseInt(chainIdHex, 16);

        this.state = {
          isMiniPay: true,
          address: accounts[0] || null,
          chainId,
          mode: accounts[0] ? 'live_minipay' : 'disconnected',
        };
      } catch (err) {
        console.warn('MiniPay provider detected but account access denied:', err);
        this.state = {
          isMiniPay: true,
          address: null,
          chainId: CELO_CONFIG.chainId,
          mode: 'disconnected',
        };
      }
    } else if (this.hasInjectedWallet()) {
      try {
        const provider = (window as any).ethereum;
        // eth_accounts checks if already authorized without opening a popup
        const accounts: string[] = await provider.request({ method: 'eth_accounts' });
        if (accounts && accounts.length > 0) {
          const chainIdHex: string = await provider.request({ method: 'eth_chainId' });
          this.state = {
            isMiniPay: false,
            address: accounts[0],
            chainId: parseInt(chainIdHex, 16),
            mode: 'connected_wallet',
          };
        } else {
          this.state = {
            isMiniPay: false,
            address: null,
            chainId: CELO_CONFIG.chainId,
            mode: 'disconnected',
          };
        }
      } catch (err) {
        console.warn('Error checking existing wallet accounts:', err);
        this.state = {
          isMiniPay: false,
          address: null,
          chainId: CELO_CONFIG.chainId,
          mode: 'disconnected',
        };
      }
    } else {
      this.state = {
        isMiniPay: false,
        address: null,
        chainId: CELO_CONFIG.chainId,
        mode: 'disconnected',
      };
    }

    this.notify();
    return this.state;
  }

  public async connectMetaMask(): Promise<{ success: boolean; error?: string }> {
    if (!this.hasInjectedWallet()) {
      return { success: false, error: 'No Web3 wallet (MetaMask) detected in browser' };
    }

    try {
      const provider = (window as any).ethereum;
      const accounts: string[] = await provider.request({ method: 'eth_requestAccounts' });
      if (!accounts || accounts.length === 0) {
        return { success: false, error: 'No account selected in MetaMask' };
      }

      const activeNet = getActiveNetwork();
      // Check and switch to the active Celo network (Mainnet or Celo Sepolia)
      try {
        await provider.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: activeNet.chainIdHex }],
        });
      } catch (switchError: any) {
        // Chain not added to wallet - prompt to add active Celo network
        if (switchError.code === 4902) {
          await provider.request({
            method: 'wallet_addEthereumChain',
            params: [{
              chainId: activeNet.chainIdHex,
              chainName: activeNet.chainName,
              nativeCurrency: { name: 'CELO', symbol: 'CELO', decimals: 18 },
              rpcUrls: [activeNet.rpcUrl],
              blockExplorerUrls: [activeNet.blockExplorerUrl],
            }],
          });
        }
      }

      const chainIdHex: string = await provider.request({ method: 'eth_chainId' });
      this.state = {
        isMiniPay: false,
        address: accounts[0],
        chainId: parseInt(chainIdHex, 16),
        mode: 'connected_wallet',
      };

      this.notify();
      return { success: true };
    } catch (err: any) {
      console.error('Failed to connect wallet:', err);
      return { success: false, error: err.message || 'Connection rejected' };
    }
  }

  /**
   * Prompts MetaMask to import an ERC-20 token (e.g. USDC) into the user's asset view.
   */
  public async addTokenToWallet(symbol: SupportedTokenSymbol = 'USDC'): Promise<{ success: boolean; error?: string }> {
    if (!this.hasInjectedWallet()) {
      return { success: false, error: 'No Web3 wallet detected in browser' };
    }

    const activeNet = getActiveNetwork();
    const tokenInfo = activeNet.tokens[symbol];
    if (!tokenInfo) {
      return { success: false, error: `Token ${symbol} not found on ${activeNet.chainName}` };
    }

    try {
      const provider = (window as any).ethereum;
      const wasAdded = await provider.request({
        method: 'wallet_watchAsset',
        params: {
          type: 'ERC20',
          options: {
            address: tokenInfo.address,
            symbol: tokenInfo.symbol,
            decimals: tokenInfo.decimals,
            image: `https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/celo/assets/${tokenInfo.address}/logo.png`,
          },
        },
      });
      return { success: !!wasAdded };
    } catch (err: any) {
      console.error('Failed to add token to wallet:', err);
      return { success: false, error: err.message || 'Failed to import token' };
    }
  }

  public disconnectWallet() {
    this.state = {
      isMiniPay: false,
      address: null,
      chainId: CELO_CONFIG.chainId,
      mode: 'disconnected',
    };
    this.notify();
  }

  public async switchNetwork(mode: NetworkMode): Promise<{ success: boolean; error?: string }> {
    const target = NETWORKS[mode];
    setActiveNetworkMode(mode);

    if (this.hasInjectedWallet() && !this.isMiniPayInjected()) {
      try {
        const provider = (window as any).ethereum;
        await provider.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: target.chainIdHex }],
        });
      } catch (switchError: any) {
        const isUnrecognized =
          switchError.code === 4902 ||
          switchError.data?.originalError?.code === 4902 ||
          switchError.message?.includes('Unrecognized chain') ||
          switchError.message?.includes('4902');

        if (isUnrecognized) {
          try {
            const provider = (window as any).ethereum;
            await provider.request({
              method: 'wallet_addEthereumChain',
              params: [{
                chainId: target.chainIdHex,
                chainName: target.chainName,
                nativeCurrency: { name: 'CELO', symbol: 'CELO', decimals: 18 },
                rpcUrls: [target.rpcUrl, target.fallbackRpcUrl].filter(Boolean),
                blockExplorerUrls: [target.blockExplorerUrl],
              }],
            });
          } catch (addError: any) {
            return { success: false, error: addError.message };
          }
        } else {
          return { success: false, error: switchError.message };
        }
      }
    }

    this.state.chainId = target.chainId;
    this.notify();
    return { success: true };
  }

  /**
   * Ensures connected wallet provider is switched to the active Celo network
   * before broadcasting any on-chain transaction.
   */
  public async ensureCeloNetwork(): Promise<{ success: boolean; error?: string }> {
    if (!this.hasInjectedWallet()) return { success: true };
    const provider = (window as any).ethereum;
    if (!provider?.request) return { success: true };

    const activeNet = getActiveNetwork();
    try {
      const currentChainIdHex: string = await provider.request({ method: 'eth_chainId' });
      if (currentChainIdHex && currentChainIdHex.toLowerCase() !== activeNet.chainIdHex.toLowerCase()) {
        try {
          await provider.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: activeNet.chainIdHex }],
          });
        } catch (switchError: any) {
          const isUnrecognized =
            switchError.code === 4902 ||
            switchError.data?.originalError?.code === 4902 ||
            switchError.message?.includes('Unrecognized chain') ||
            switchError.message?.includes('4902');

          if (isUnrecognized) {
            try {
              await provider.request({
                method: 'wallet_addEthereumChain',
                params: [{
                  chainId: activeNet.chainIdHex,
                  chainName: activeNet.chainName,
                  nativeCurrency: { name: 'CELO', symbol: 'CELO', decimals: 18 },
                  rpcUrls: [activeNet.rpcUrl, activeNet.fallbackRpcUrl].filter(Boolean),
                  blockExplorerUrls: [activeNet.blockExplorerUrl],
                }],
              });
            } catch (addError: any) {
              return {
                success: false,
                error: `Could not add ${activeNet.chainName} to wallet: ${addError.message || 'Rejected'}`,
              };
            }
          } else {
            return {
              success: false,
              error: `Please switch your wallet network to ${activeNet.chainName} in MetaMask to complete this transfer.`,
            };
          }
        }
      }

      // Re-verify that the active chain actually matches after prompt
      const postChainId: string = await provider.request({ method: 'eth_chainId' });
      if (postChainId && postChainId.toLowerCase() !== activeNet.chainIdHex.toLowerCase()) {
        return {
          success: false,
          error: `Wallet is currently on network ${postChainId}. Please switch to ${activeNet.chainName} (${activeNet.chainIdHex}) in MetaMask to proceed.`,
        };
      }

      return { success: true };
    } catch (err: any) {
      console.warn('Network verification error:', err);
      try {
        const verifyChain: string = await provider.request({ method: 'eth_chainId' });
        if (verifyChain && verifyChain.toLowerCase() === activeNet.chainIdHex.toLowerCase()) {
          return { success: true };
        }
      } catch {}
      return {
        success: false,
        error: `Please switch your wallet network to ${activeNet.chainName} in MetaMask. (${err.message || 'Chain switch rejected'})`,
      };
    }
  }

  /**
   * Polls Celo JSON-RPC for a transaction receipt to ensure mining before consecutive actions.
   * Celo has ~1-second block times.
   */
  public async waitForReceipt(txHash: string, maxWaitMs = 15_000): Promise<boolean> {
    const startTime = Date.now();
    const provider = (window as any).ethereum;
    const activeNet = getActiveNetwork();

    while (Date.now() - startTime < maxWaitMs) {
      try {
        let receipt: any = null;
        if (provider?.request) {
          receipt = await provider.request({
            method: 'eth_getTransactionReceipt',
            params: [txHash],
          });
        }
        if (!receipt && activeNet.rpcUrl) {
          const res = await fetch(activeNet.rpcUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              jsonrpc: '2.0',
              id: 1,
              method: 'eth_getTransactionReceipt',
              params: [txHash],
            }),
          });
          const data = await res.json();
          receipt = data?.result;
        }

        if (receipt && receipt.blockNumber) {
          return true;
        }
      } catch {
        // Retry
      }
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
    return false;
  }

  /**
   * Sends a genuine transaction on Celo Mainnet via the connected wallet,
   * appended with Sivan's official ERC-8021 attribution tag.
   */
  public async sendAttributedTransfer(params: {
    to: `0x${string}`;
    amount: number;
    currency: SupportedTokenSymbol;
    feeAmount?: number;
    feeWallet?: `0x${string}`;
    onProgress?: (step: 'transfer' | 'fee') => void;
  }): Promise<{ success: boolean; txHash?: string; feeTxHash?: string; error?: string }> {
    if (!this.state.address) {
      return { success: false, error: 'Please connect your wallet first' };
    }

    if (!this.hasInjectedWallet()) {
      return { success: false, error: 'Web3 provider not available' };
    }

    // 1. Ensure the wallet is switched to active Celo network before broadcasting
    const netCheck = await this.ensureCeloNetwork();
    if (!netCheck.success) {
      return { success: false, error: netCheck.error };
    }

    const provider = (window as any).ethereum;
    const activeNet = getActiveNetwork();
    const tokenInfo = activeNet.tokens[params.currency] || CELO_CONFIG.tokens[params.currency];
    if (!tokenInfo) {
      return { success: false, error: `Unsupported currency: ${params.currency}` };
    }

    const targetFeeWallet = (params.feeWallet || activeNet.feeWallet) as `0x${string}` | undefined;
    const hasFee = Boolean(params.feeAmount && params.feeAmount > 0 && targetFeeWallet && targetFeeWallet.toLowerCase() !== params.to.toLowerCase());

    try {
      let txHash: string;
      let feeTxHash: string | undefined;
      const safeAmountStr = toSafeDecimalString(params.amount, tokenInfo.decimals);

      if (params.currency === 'CELO') {
        // Native CELO transfer with ERC-8021 attribution tag in data field
        const rawAmount = parseUnits(safeAmountStr, 18);
        const data = attachAttributionSuffix('0x');

        // Safe bounded gas limit (capped between 65,000 and 200,000)
        let gasHex = '0x186a0'; // 100,000 safe default
        try {
          const est = await provider.request({
            method: 'eth_estimateGas',
            params: [{
              from: this.state.address,
              to: params.to,
              value: `0x${rawAmount.toString(16)}`,
              data,
            }],
          });
          if (est) {
            const gasVal = typeof est === 'string' ? parseInt(est, 16) : Number(est);
            if (Number.isFinite(gasVal) && gasVal > 0 && gasVal < 500_000) {
              gasHex = `0x${Math.min(300_000, Math.ceil(gasVal * 1.3)).toString(16)}`;
            }
          }
        } catch {
          // Keep safe 100,000 gas default
        }

        params.onProgress?.('transfer');
        txHash = await provider.request({
          method: 'eth_sendTransaction',
          params: [{
            from: this.state.address,
            to: params.to,
            value: `0x${rawAmount.toString(16)}`,
            data,
            gas: gasHex,
          }],
        });

        // Collect protocol fee on-chain to Sivan Fee Wallet
        if (hasFee && targetFeeWallet) {
          try {
            params.onProgress?.('fee');
            // Wait for initial transfer receipt on Celo so account nonce increments cleanly
            await this.waitForReceipt(txHash);

            const safeFeeStr = toSafeDecimalString(params.feeAmount!, 18);
            const rawFee = parseUnits(safeFeeStr, 18);
            const feeData = attachAttributionSuffix('0x');
            let feeGasHex = '0x186a0';
            try {
              const estFee = await provider.request({
                method: 'eth_estimateGas',
                params: [{
                  from: this.state.address,
                  to: targetFeeWallet,
                  value: `0x${rawFee.toString(16)}`,
                  data: feeData,
                }],
              });
              if (estFee) {
                const val = typeof estFee === 'string' ? parseInt(estFee, 16) : Number(estFee);
                if (Number.isFinite(val) && val > 0 && val < 500_000) {
                  feeGasHex = `0x${Math.min(300_000, Math.ceil(val * 1.3)).toString(16)}`;
                }
              }
            } catch {}

            feeTxHash = await provider.request({
              method: 'eth_sendTransaction',
              params: [{
                from: this.state.address,
                to: targetFeeWallet,
                value: `0x${rawFee.toString(16)}`,
                data: feeData,
                gas: feeGasHex,
              }],
            });
          } catch (feeErr: any) {
            console.warn('CELO protocol fee collection transfer skipped/failed:', feeErr);
          }
        }
      } else {
        // ERC-20 token transfer (USDC, USDT, cUSD, cNGN) with attribution tag
        const rawAmount = parseUnits(safeAmountStr, tokenInfo.decimals);
        const data = buildAttributedTransferCalldata(params.to, rawAmount);

        // Safe bounded gas limit (never allow fallback to 21,000,000)
        let gasHex = '0x30d40'; // 200,000 safe default for ERC-20 with attribution calldata
        try {
          const est = await provider.request({
            method: 'eth_estimateGas',
            params: [{
              from: this.state.address,
              to: tokenInfo.address,
              data,
            }],
          });
          if (est) {
            const gasVal = typeof est === 'string' ? parseInt(est, 16) : Number(est);
            if (Number.isFinite(gasVal) && gasVal > 0 && gasVal < 500_000) {
              gasHex = `0x${Math.min(300_000, Math.ceil(gasVal * 1.3)).toString(16)}`;
            }
          }
        } catch {
          // Keep safe 200,000 gas default
        }

        params.onProgress?.('transfer');
        txHash = await provider.request({
          method: 'eth_sendTransaction',
          params: [{
            from: this.state.address,
            to: tokenInfo.address,
            data,
            gas: gasHex,
          }],
        });

        // Collect protocol fee on-chain to Sivan Fee Wallet
        if (hasFee && targetFeeWallet) {
          try {
            params.onProgress?.('fee');
            // Wait for initial transfer receipt on Celo so account nonce increments cleanly
            await this.waitForReceipt(txHash);

            const safeFeeStr = toSafeDecimalString(params.feeAmount!, tokenInfo.decimals);
            const rawFee = parseUnits(safeFeeStr, tokenInfo.decimals);
            const feeData = buildAttributedTransferCalldata(targetFeeWallet, rawFee);
            let feeGasHex = '0x30d40';
            try {
              const estFee = await provider.request({
                method: 'eth_estimateGas',
                params: [{
                  from: this.state.address,
                  to: tokenInfo.address,
                  data: feeData,
                }],
              });
              if (estFee) {
                const val = typeof estFee === 'string' ? parseInt(estFee, 16) : Number(estFee);
                if (Number.isFinite(val) && val > 0 && val < 500_000) {
                  feeGasHex = `0x${Math.min(300_000, Math.ceil(val * 1.3)).toString(16)}`;
                }
              }
            } catch {}

            feeTxHash = await provider.request({
              method: 'eth_sendTransaction',
              params: [{
                from: this.state.address,
                to: tokenInfo.address,
                data: feeData,
                gas: feeGasHex,
              }],
            });
          } catch (feeErr: any) {
            console.warn('ERC-20 protocol fee collection transfer skipped/failed:', feeErr);
          }
        }
      }

      return { success: true, txHash, feeTxHash };
    } catch (err: any) {
      console.error('On-chain transaction failed:', err);
      return {
        success: false,
        error: err.message?.includes('User rejected') || err.message?.includes('user rejected')
          ? 'Transaction was rejected in wallet'
          : (err.message || 'Transaction failed on Celo Mainnet'),
      };
    }
  }

  /**
   * Broadcasts a raw contract transaction (e.g. ERC-20 approval or LimitOrderReactor swap)
   * with ERC-8021 hackathon attribution.
   */
  public async sendRawTransaction(params: {
    to: `0x${string}`;
    data: `0x${string}`;
    value?: `0x${string}`;
    attribution?: boolean;
  }): Promise<{ success: boolean; txHash?: string; error?: string }> {
    if (!this.state.address) {
      return { success: false, error: 'Please connect your wallet first' };
    }

    if (!this.hasInjectedWallet()) {
      return { success: false, error: 'Web3 provider not available' };
    }

    const netCheck = await this.ensureCeloNetwork();
    if (!netCheck.success) {
      return { success: false, error: netCheck.error };
    }

    const provider = (window as any).ethereum;
    try {
      const finalData = params.attribution !== false ? attachAttributionSuffix(params.data) : params.data;

      let gasHex = '0x493e0'; // 300,000 safe default
      try {
        const est = await provider.request({
          method: 'eth_estimateGas',
          params: [{
            from: this.state.address,
            to: params.to,
            data: finalData,
            value: params.value || '0x0',
          }],
        });
        if (est) {
          const gasVal = typeof est === 'string' ? parseInt(est, 16) : Number(est);
          if (Number.isFinite(gasVal) && gasVal > 0 && gasVal < 1_500_000) {
            gasHex = `0x${Math.min(1_500_000, Math.ceil(gasVal * 1.3)).toString(16)}`;
          }
        }
      } catch (estErr) {
        console.warn('Gas estimation warning; using safe default:', estErr);
      }

      const txHash: string = await provider.request({
        method: 'eth_sendTransaction',
        params: [{
          from: this.state.address,
          to: params.to,
          data: finalData,
          value: params.value || '0x0',
          gas: gasHex,
        }],
      });

      return { success: true, txHash };
    } catch (err: any) {
      console.error('Raw transaction failed:', err);
      return {
        success: false,
        error: err.message?.includes('User rejected') || err.message?.includes('user rejected')
          ? 'Transaction was rejected in wallet'
          : (err.message || 'Transaction execution failed on Celo Mainnet'),
      };
    }
  }

  /**
   * Prompts connected wallet (MiniPay or MetaMask) to cryptographically sign
   * the milestone release authorization using personal_sign.
   */
  public async signReleaseAuthorization(params: {
    agreementId: string;
    contractorAddress: string;
    amount: number;
    currency: string;
  }): Promise<{ success: boolean; signature?: string; error?: string }> {
    if (!this.state.address) {
      return { success: false, error: 'Please connect your wallet first' };
    }

    if (!this.hasInjectedWallet()) {
      return { success: false, error: 'Web3 provider not available' };
    }

    const provider = (window as any).ethereum;
    const message = [
      'Sivan Ai Autonomous Service Agreement',
      'Action: Authorize Milestone Payment Release',
      `Agreement ID: ${params.agreementId}`,
      `Contractor: ${params.contractorAddress}`,
      `Settlement Net: ${params.amount} ${params.currency}`,
      `Attribution Tag: ${CELO_CONFIG.attributionTag}`,
      `Timestamp: ${new Date().toISOString()}`,
    ].join('\n');

    try {
      const hexMessage = `0x${Array.from(new TextEncoder().encode(message))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('')}`;

      const signature: string = await provider.request({
        method: 'personal_sign',
        params: [hexMessage, this.state.address],
      });

      return { success: true, signature };
    } catch (err: any) {
      console.error('Signing release authorization failed:', err);
      return {
        success: false,
        error: err.message?.includes('User rejected') || err.message?.includes('user rejected')
          ? 'Signature request was rejected in wallet'
          : (err.message || 'Signature request failed'),
      };
    }
  }

  /**
   * Prompts connected wallet to cryptographically sign a dispute filing with reason.
   */
  public async signDisputeFiling(params: {
    agreementId: string;
    reason: string;
  }): Promise<{ success: boolean; signature?: string; error?: string }> {
    if (!this.state.address) {
      return { success: false, error: 'Please connect your wallet first' };
    }

    if (!this.hasInjectedWallet()) {
      return { success: false, error: 'Web3 provider not available' };
    }

    const provider = (window as any).ethereum;
    const message = [
      'Sivan Ai Autonomous Service Agreement',
      'Action: Formal Dispute Filing',
      `Agreement ID: ${params.agreementId}`,
      `Complainant: ${this.state.address}`,
      `Reason: ${params.reason}`,
      `Attribution Tag: ${CELO_CONFIG.attributionTag}`,
      `Timestamp: ${new Date().toISOString()}`,
    ].join('\n');

    try {
      const hexMessage = `0x${Array.from(new TextEncoder().encode(message))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('')}`;

      const signature: string = await provider.request({
        method: 'personal_sign',
        params: [hexMessage, this.state.address],
      });

      return { success: true, signature };
    } catch (err: any) {
      console.error('Signing dispute filing failed:', err);
      return {
        success: false,
        error: err.message?.includes('User rejected') || err.message?.includes('user rejected')
          ? 'Signature request was rejected in wallet'
          : (err.message || 'Signature request failed'),
      };
    }
  }

  /**
   * Prompts connected wallet to cryptographically sign a mutual agreement refund back to client.
   */
  public async signRefundAuthorization(params: {
    agreementId: string;
    amount: number;
    currency: string;
    buyerAddress?: string;
  }): Promise<{ success: boolean; signature?: string; error?: string }> {
    if (!this.state.address) {
      return { success: false, error: 'Please connect your wallet first' };
    }

    if (!this.hasInjectedWallet()) {
      return { success: false, error: 'Web3 provider not available' };
    }

    const provider = (window as any).ethereum;
    const message = [
      'Sivan Ai Autonomous Service Agreement',
      'Action: Authorize Client Refund',
      `Agreement ID: ${params.agreementId}`,
      `Authorized By: ${this.state.address}`,
      `Refund Amount: ${params.amount} ${params.currency}`,
      `Attribution Tag: ${CELO_CONFIG.attributionTag}`,
      `Timestamp: ${new Date().toISOString()}`,
    ].join('\n');

    try {
      const hexMessage = `0x${Array.from(new TextEncoder().encode(message))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('')}`;

      const signature: string = await provider.request({
        method: 'personal_sign',
        params: [hexMessage, this.state.address],
      });

      return { success: true, signature };
    } catch (err: any) {
      console.error('Signing refund authorization failed:', err);
      return {
        success: false,
        error: err.message?.includes('User rejected') || err.message?.includes('user rejected')
          ? 'Signature request was rejected in wallet'
          : (err.message || 'Signature request failed'),
      };
    }
  }

  public getState(): MiniPayDetectionState {
    return this.state;
  }

  public subscribe(fn: (state: MiniPayDetectionState) => void) {
    this.listeners.push(fn);
    fn(this.state);
    return () => {
      this.listeners = this.listeners.filter(l => l !== fn);
    };
  }

  private notify() {
    this.listeners.forEach(fn => fn(this.state));
  }

  private listenToWalletEvents() {
    if (typeof window === 'undefined') return;
    const eth = (window as any).ethereum;
    if (!eth) return;

    eth.on?.('accountsChanged', (accounts: string[]) => {
      if (accounts.length === 0) {
        this.disconnectWallet();
      } else {
        this.state.address = accounts[0];
        this.state.mode = this.isMiniPayInjected() ? 'live_minipay' : 'connected_wallet';
        this.notify();
      }
    });

    eth.on?.('chainChanged', (chainIdHex: string) => {
      this.state.chainId = parseInt(chainIdHex, 16);
      this.notify();
    });
  }
}

export const miniPayService = new MiniPayService();
