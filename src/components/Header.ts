import { miniPayService } from '../services/minipay.service';
import type { MiniPayDetectionState } from '../types/minipay.types';
import { getActiveNetwork, setActiveNetworkMode } from '../config/celo.config';
import { countryService, SUPPORTED_COUNTRIES } from '../config/countries.config';
import { openLegalModal } from './LegalSupportModal';
import { identityService } from '../services/identity.service';

export function renderHeader(container: HTMLElement, onToast?: (message: string) => void) {
  let isWalletModalOpen = false;
  let isCountryModalOpen = false;
  let isCopied = false;
  let copyTimeout: any = null;

  const update = (state: MiniPayDetectionState) => {
    const activeNet = getActiveNetwork();
    const activeCountry = countryService.getActiveCountry();
    const isLiveMiniPay = state.mode === 'live_minipay';
    const isMetaMask = state.mode === 'connected_wallet';
    const isConnected = !!state.address;
    const isTestnet = activeNet.mode === 'testnet';

    const shortAddr = state.address 
      ? `${state.address.slice(0, 6)}...${state.address.slice(-4)}`
      : 'Connect';

    let pillLabel = 'Connect';
    let pillColor = 'var(--text-muted)';
    let dotClass = 'pulse-dot-red';

    if (isLiveMiniPay) {
      pillLabel = 'MiniPay';
      pillColor = 'var(--accent-emerald)';
      dotClass = 'pulse-dot';
    } else if (isMetaMask) {
      pillLabel = 'MetaMask';
      pillColor = 'var(--accent-cyan)';
      dotClass = 'pulse-dot';
    }

    const netBadgeLabel = isTestnet ? 'Celo Sepolia' : 'Celo Mainnet';
    const netBadgeColor = isTestnet ? '#f59e0b' : 'var(--accent-emerald)';
    const netBadgeDot = isTestnet ? 'background: #f59e0b;' : 'background: var(--accent-emerald);';

    container.innerHTML = `
      <header class="app-header">
        <div class="brand-wrapper">
          <img src="/sivan-logo.png" alt="Sivan Ai" class="brand-icon-img" />
          <!-- Country / Corridor Selector Pill -->
          <button type="button" class="header-country-pill" id="btn-country-modal" title="Switch Country Corridor">
            <span class="country-flag">${activeCountry.flag}</span>
            <span class="country-name">${activeCountry.name}</span>
            <span class="country-chevron">▾</span>
          </button>
        </div>

        <div style="display: flex; align-items: center; gap: 8px;">
          <!-- Network Badge / Toggle -->
          <button class="header-network-pill" id="btn-network-toggle" title="Switch Network (Mainnet / Testnet)" style="background: var(--bg-glass); border: 1px solid var(--border-subtle); border-radius: 20px; padding: 4px 10px; font-size: 11px; display: flex; align-items: center; gap: 6px; cursor: pointer; color: ${netBadgeColor};">
            <span style="width: 7px; height: 7px; border-radius: 50%; ${netBadgeDot}"></span>
            <span style="font-weight: 600;">${isTestnet ? 'Sepolia' : 'Mainnet'}</span>
          </button>

          <!-- Wallet Status Pill (Tap to Copy Address when connected) -->
          <button class="header-status-pill ${isCopied ? 'copied' : ''}" id="btn-wallet-modal" title="${isConnected ? 'Tap to copy wallet address' : 'Connect wallet'}" style="user-select: none;">
            ${isCopied ? `
              <span style="color: var(--accent-emerald); font-weight: 600; font-size: 11px; display: flex; align-items: center; gap: 4px;">
                <span>✓</span>
                <span>Copied!</span>
              </span>
            ` : `
              <span class="${dotClass}"></span>
              <span style="color: ${pillColor}; font-weight: 600;">${pillLabel}</span>
              ${isConnected ? `<span style="color: var(--text-muted); font-size: 11px;">(${shortAddr})</span>` : ''}
              ${isConnected ? `<span style="font-size: 10px; opacity: 0.6; margin-left: 2px;">📋</span>` : ''}
            `}
          </button>
        </div>
      </header>

      <!-- Country / Corridor Selection Modal -->
      <div id="country-modal-overlay" class="modal-overlay ${isCountryModalOpen ? 'active' : ''}">
        <div class="modal-card">
          <div class="modal-header">
            <h3 style="font-family: var(--font-display); font-size: 16px;">Select Country & Payout Rail</h3>
            <button class="btn-close-modal" id="btn-close-country-modal">✕</button>
          </div>
          <div class="modal-body">
            <p style="font-size: 12px; color: var(--text-muted); margin-bottom: 14px;">
              Payout rails, local bank networks, and currency conversion will automatically adapt to your selection.
            </p>
            <div class="country-options-list">
              ${Object.values(SUPPORTED_COUNTRIES).map(c => {
                const isCurrent = c.code === activeCountry.code;
                return `
                  <button type="button" class="country-option-item ${isCurrent ? 'selected' : ''}" data-country-code="${c.code}">
                    <span class="country-opt-flag">${c.flag}</span>
                    <div class="country-opt-details">
                      <div class="country-opt-title">${c.name} (${c.currency})</div>
                      <div class="country-opt-sub">${c.code === 'GLOBAL' ? 'Global Cross-Border Service Agreements (USD)' : c.railType === 'nibss_bank' ? 'Commercial Banks & Fintech (NIBSS)' : 'Mobile Money & Commercial Banks'}</div>
                    </div>
                    ${isCurrent ? '<span class="country-opt-check">✓</span>' : ''}
                  </button>
                `;
              }).join('')}
            </div>
          </div>
        </div>
      </div>

      <!-- Wallet & Network Modal -->
      <div id="wallet-modal-overlay" class="modal-overlay ${isWalletModalOpen ? 'active' : ''}">
        <div class="modal-card">
          <div class="modal-header">
            <h3 style="font-family: var(--font-display); font-size: 16px;">Network & Wallet</h3>
            <button class="btn-close-modal" id="btn-close-wallet-modal">✕</button>
          </div>

          <div class="modal-body">
            <!-- Network Mode Switcher -->
            <div style="background: var(--bg-glass); border: 1px solid var(--border-subtle); border-radius: var(--radius-md); padding: 14px; margin-bottom: 14px;">
              <div style="font-size: 12px; font-weight: 600; margin-bottom: 8px; color: var(--text-main); display: flex; justify-content: space-between; align-items: center;">
                <span>Active Network:</span>
                <span style="color: ${netBadgeColor};">${netBadgeLabel}</span>
              </div>

              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-top: 10px;">
                <button type="button" class="btn-network-select ${!isTestnet ? 'active' : ''}" id="btn-select-mainnet" style="padding: 10px; border-radius: 8px; font-size: 12px; font-weight: 600; border: 1px solid ${!isTestnet ? 'var(--accent-emerald)' : 'var(--border-subtle)'}; background: ${!isTestnet ? 'rgba(16, 185, 129, 0.15)' : 'transparent'}; color: ${!isTestnet ? 'var(--accent-emerald)' : 'var(--text-muted)'}; cursor: pointer;">
                  🟢 Celo Mainnet (42220)
                </button>
                <button type="button" class="btn-network-select ${isTestnet ? 'active' : ''}" id="btn-select-testnet" style="padding: 10px; border-radius: 8px; font-size: 12px; font-weight: 600; border: 1px solid ${isTestnet ? '#f59e0b' : 'var(--border-subtle)'}; background: ${isTestnet ? 'rgba(245, 158, 11, 0.15)' : 'transparent'}; color: ${isTestnet ? '#f59e0b' : 'var(--text-muted)'}; cursor: pointer;">
                  🟡 Celo Sepolia (11142220)
                </button>
              </div>

              ${isLiveMiniPay ? `
                <div style="margin-top: 8px; font-size: 11px; color: var(--text-muted);">
                  ℹ️ Opera MiniPay runs natively on Celo Mainnet.
                </div>
              ` : `
                <div style="margin-top: 8px; font-size: 11px; color: var(--text-muted);">
                  Switching networks will prompt MetaMask to switch chains.
                </div>
              `}
            </div>

            <!-- Token / USDC Helper -->
            <div style="background: var(--bg-glass); border: 1px solid var(--border-subtle); border-radius: var(--radius-md); padding: 12px; margin-bottom: 14px;">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
                <span style="font-size: 11px; font-weight: 600; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.5px;">USDC on ${isTestnet ? 'Sepolia' : 'Mainnet'}</span>
                <span style="font-size: 10px; color: var(--text-muted);">Decimals: 6</span>
              </div>
              <div style="font-size: 11px; color: var(--text-muted); margin-bottom: 8px; word-break: break-all;">
                Contract: <code style="font-size: 10px; color: var(--accent-cyan);">${activeNet.tokens.USDC.address}</code>
              </div>
              ${isMetaMask ? `
                <button type="button" class="btn-secondary" id="btn-import-usdc" style="width: 100%; font-size: 11px; padding: 6px 10px; display: flex; align-items: center; justify-content: center; gap: 6px; cursor: pointer;">
                  <span>🦊 Import USDC to MetaMask</span>
                </button>
              ` : ''}
            </div>

            <!-- Connection Status -->
            <div style="background: var(--bg-glass); border: 1px solid var(--border-subtle); border-radius: var(--radius-md); padding: 14px; margin-bottom: 16px;">
              <div style="display: flex; justify-content: space-between; font-size: 12px; margin-bottom: 8px;">
                <span style="color: var(--text-muted);">Status:</span>
                <strong style="color: ${pillColor};">${isLiveMiniPay ? 'Opera MiniPay (Injected)' : isMetaMask ? 'MetaMask Connected' : 'Disconnected'}</strong>
              </div>
              <div style="display: flex; justify-content: space-between; font-size: 12px; margin-bottom: 8px;">
                <span style="color: var(--text-muted);">RPC URL:</span>
                <span style="color: var(--text-muted); font-size: 11px;">${activeNet.rpcUrl.replace('https://', '')}</span>
              </div>
              ${state.address ? `
                <div style="display: flex; justify-content: space-between; align-items: center; font-size: 12px; margin-bottom: 8px;">
                  <span style="color: var(--text-muted);">Sivan Handle:</span>
                  <div style="display: flex; align-items: center; gap: 6px;">
                    ${identityService.getSavedUsername() ? `
                      <span style="font-weight: 600; color: var(--accent-emerald); font-family: monospace;">${identityService.getSavedUsername()}</span>
                    ` : `
                      <button type="button" id="btn-claim-handle" style="background: rgba(16, 185, 129, 0.12); border: 1px solid var(--accent-emerald); border-radius: 12px; color: var(--accent-emerald); font-size: 11px; padding: 2px 10px; cursor: pointer; font-weight: 600;">+ Claim @handle</button>
                    `}
                  </div>
                </div>
                <div style="display: flex; justify-content: space-between; align-items: center; font-size: 12px; margin-bottom: 8px;">
                  <span style="color: var(--text-muted);">Address:</span>
                  <div style="display: flex; align-items: center; gap: 6px;">
                    <code style="font-size: 11px; color: var(--accent-cyan);">${shortAddr}</code>
                    <button class="btn-copy-addr" id="btn-copy-address" title="Copy address" style="background: none; border: none; cursor: pointer; color: var(--text-muted);">📋</button>
                  </div>
                </div>
                <div style="display: flex; justify-content: space-between; align-items: center; font-size: 12px;">
                  <span style="color: var(--text-muted);">Explorer:</span>
                  <a href="${activeNet.blockExplorerUrl}/address/${state.address}" target="_blank" style="font-size: 11px; color: var(--accent-cyan); text-decoration: underline;">
                    View on Explorer ↗
                  </a>
                </div>
              ` : ''}
            </div>

            ${!isConnected ? `
              <button class="btn-primary" id="btn-modal-connect" style="width: 100%;">
                Connect Wallet
              </button>
            ` : `
              <button class="btn-secondary" id="btn-modal-disconnect" style="width: 100%; color: var(--accent-rose); border-color: rgba(244, 63, 94, 0.3);">
                Disconnect Wallet
              </button>
            `}

            <button type="button" id="btn-modal-legal-support" style="width: 100%; margin-top: 12px; background: rgba(255, 255, 255, 0.04); border: 1px solid var(--border-subtle); border-radius: 8px; padding: 10px; font-size: 11px; color: var(--text-secondary); cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 6px;">
              <span>🛡️</span>
              <span>Terms of Service, Privacy & 24/7 Support</span>
            </button>
          </div>
        </div>
      </div>
    `;

    // Attach Country Modal Listeners
    container.querySelector('#btn-country-modal')?.addEventListener('click', () => {
      isCountryModalOpen = true;
      update(miniPayService.getState());
    });
    container.querySelector('#btn-close-country-modal')?.addEventListener('click', () => {
      isCountryModalOpen = false;
      update(miniPayService.getState());
    });

    container.querySelectorAll('.country-option-item').forEach(el => {
      el.addEventListener('click', (e) => {
        const code = (e.currentTarget as HTMLElement).dataset.countryCode;
        if (code) {
          countryService.setCountry(code);
          isCountryModalOpen = false;
          update(miniPayService.getState());
        }
      });
    });

    // Clipboard copy helper with mobile WebView fallback
    const copyToClipboard = async (text: string): Promise<boolean> => {
      try {
        if (navigator.clipboard && navigator.clipboard.writeText) {
          await navigator.clipboard.writeText(text);
          return true;
        }
      } catch (err) {
        console.warn('navigator.clipboard write failed, trying execCommand fallback:', err);
      }
      try {
        const textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.style.position = 'fixed';
        textarea.style.left = '-9999px';
        textarea.style.top = '-9999px';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.focus();
        textarea.select();
        const successful = document.execCommand('copy');
        document.body.removeChild(textarea);
        return successful;
      } catch (err) {
        console.warn('execCommand fallback failed:', err);
        return false;
      }
    };

    // Attach Wallet Pill & Modal Listeners
    container.querySelector('#btn-wallet-modal')?.addEventListener('click', async (e) => {
      e.preventDefault();
      e.stopPropagation();

      // If not connected, open wallet connection modal
      if (!isConnected || !state.address) {
        isWalletModalOpen = true;
        update(miniPayService.getState());
        return;
      }

      // Tap-to-copy wallet address
      const ok = await copyToClipboard(state.address);
      if (ok) {
        isCopied = true;
        update(miniPayService.getState());
        if (onToast) {
          onToast(`Wallet address copied: ${shortAddr}`);
        }
        if (copyTimeout) clearTimeout(copyTimeout);
        copyTimeout = setTimeout(() => {
          isCopied = false;
          update(miniPayService.getState());
        }, 2000);
      } else {
        if (onToast) {
          onToast('Unable to copy address');
        }
      }
    });

    container.querySelector('#btn-network-toggle')?.addEventListener('click', () => {
      isWalletModalOpen = true;
      update(miniPayService.getState());
    });
    container.querySelector('#btn-close-wallet-modal')?.addEventListener('click', () => {
      isWalletModalOpen = false;
      update(miniPayService.getState());
    });

    container.querySelector('#btn-select-mainnet')?.addEventListener('click', async () => {
      setActiveNetworkMode('mainnet');
      const eth = (window as any).ethereum;
      if (eth) {
        try {
          await eth.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: '0xa4ec' }], // 42220
          });
        } catch (e) {
          console.warn('Network switch prompt:', e);
        }
      }
      update(miniPayService.getState());
    });

    container.querySelector('#btn-select-testnet')?.addEventListener('click', async () => {
      setActiveNetworkMode('testnet');
      const eth = (window as any).ethereum;
      if (eth) {
        try {
          await eth.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: '0xaa36a7' }], // 11142220
          });
        } catch (e) {
          console.warn('Network switch prompt:', e);
        }
      }
      update(miniPayService.getState());
    });

    container.querySelector('#btn-modal-connect')?.addEventListener('click', async () => {
      isWalletModalOpen = false;
      await miniPayService.connectMetaMask();
    });

    container.querySelector('#btn-modal-disconnect')?.addEventListener('click', () => {
      isWalletModalOpen = false;
      miniPayService.disconnectWallet();
    });

    container.querySelector('#btn-modal-legal-support')?.addEventListener('click', () => {
      isWalletModalOpen = false;
      update(miniPayService.getState());
      openLegalModal('support');
    });

    container.querySelector('#btn-copy-address')?.addEventListener('click', async () => {
      if (state.address) {
        const ok = await copyToClipboard(state.address);
        if (ok && onToast) {
          onToast(`Wallet address copied: ${shortAddr}`);
        }
      }
    });

    container.querySelector('#btn-claim-handle')?.addEventListener('click', async () => {
      const handle = prompt('Choose your unique Sivan handle (e.g. @soliame):');
      if (!handle) return;
      const res = await identityService.claimUsername(handle, state.address || '');
      if (res.success && res.username) {
        if (onToast) onToast(`🎉 Sivan handle claimed: ${res.username}`);
        update(miniPayService.getState());
      } else if (res.error) {
        if (onToast) onToast(`❌ ${res.error}`);
      }
    });
  };

  miniPayService.subscribe(update);
  countryService.subscribe(() => update(miniPayService.getState()));
  update(miniPayService.getState());
}
