import { miniPayService } from '../services/minipay.service';
import type { MiniPayDetectionState } from '../types/minipay.types';
import { CELO_CONFIG } from '../config/celo.config';

export function renderHeader(container: HTMLElement) {
  let isModalOpen = false;

  const update = (state: MiniPayDetectionState) => {
    const isLiveMiniPay = state.mode === 'live_minipay';
    const isMetaMask = state.mode === 'connected_wallet';
    const isConnected = !!state.address;

    const shortAddr = state.address 
      ? `${state.address.slice(0, 6)}...${state.address.slice(-4)}`
      : 'Connect Wallet';

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

    container.innerHTML = `
      <header class="app-header">
        <div class="brand-wrapper">
          <img src="/sivan-logo.png" alt="Sivan Ai" class="brand-icon-img" />
          <div class="brand-text">
            <h1>Sivan Ai <span class="brand-badge">MiniPay</span></h1>
            <div class="brand-tagline">Autonomous Service Agreements</div>
          </div>
        </div>

        <button class="header-status-pill" id="btn-wallet-modal" title="Manage connection">
          <span class="${dotClass}"></span>
          <span style="color: ${pillColor}; font-weight: 600;">${pillLabel}</span>
          ${isConnected ? `<span style="color: var(--text-muted); font-size: 11px;">(${shortAddr})</span>` : ''}
        </button>
      </header>

      <!-- Wallet Connection Modal -->
      <div id="wallet-modal-overlay" class="modal-overlay ${isModalOpen ? 'active' : ''}">
        <div class="modal-card">
          <div class="modal-header">
            <h3 style="font-family: var(--font-display); font-size: 16px;">Wallet Connection</h3>
            <button class="btn-close-modal" id="btn-close-wallet-modal">✕</button>
          </div>

          <div class="modal-body">
            <!-- Connection Status -->
            <div style="background: var(--bg-glass); border: 1px solid var(--border-subtle); border-radius: var(--radius-md); padding: 14px; margin-bottom: 16px;">
              <div style="display: flex; justify-content: space-between; font-size: 12px; margin-bottom: 8px;">
                <span style="color: var(--text-muted);">Status:</span>
                <strong style="color: ${pillColor};">${isLiveMiniPay ? 'Opera MiniPay (Injected)' : isMetaMask ? 'MetaMask (Live Celo)' : 'Disconnected'}</strong>
              </div>
              <div style="display: flex; justify-content: space-between; font-size: 12px; margin-bottom: 8px;">
                <span style="color: var(--text-muted);">Network:</span>
                <span style="color: var(--text-emerald); font-weight: 600;">${CELO_CONFIG.chainName} (${CELO_CONFIG.chainId})</span>
              </div>
              ${state.address ? `
                <div style="display: flex; justify-content: space-between; align-items: center; font-size: 12px; margin-bottom: 8px;">
                  <span style="color: var(--text-muted);">Address:</span>
                  <div style="display: flex; align-items: center; gap: 6px;">
                    <code style="font-size: 11px; color: var(--accent-cyan);">${shortAddr}</code>
                    <button class="btn-copy-addr" id="btn-copy-address" title="Copy address" style="background: none; border: none; cursor: pointer; color: var(--text-muted);">📋</button>
                  </div>
                </div>
                <div style="display: flex; justify-content: space-between; align-items: center; font-size: 12px;">
                  <span style="color: var(--text-muted);">Explorer:</span>
                  <a href="https://celoscan.io/address/${state.address}" target="_blank" style="font-size: 11px; color: var(--accent-cyan); text-decoration: underline;">
                    View on Celoscan ↗
                  </a>
                </div>
              ` : ''}
            </div>

            <!-- Actions -->
            <div style="display: flex; flex-direction: column; gap: 10px;">
              ${!isConnected ? `
                <button class="btn-primary" id="btn-connect-metamask">
                  <span>🦊 Connect MetaMask (Celo Mainnet)</span>
                </button>
              ` : isMetaMask ? `
                <button class="btn-secondary" id="btn-disconnect-wallet" style="color: #ef4444; border-color: rgba(239, 68, 68, 0.3);">
                  <span>Disconnect Wallet</span>
                </button>
              ` : `
                <div style="font-size: 12px; color: var(--text-muted); text-align: center;">
                  Connected via Opera MiniPay browser provider.
                </div>
              `}
            </div>
          </div>
        </div>
      </div>
    `;

    // Event handlers
    const pillBtn = container.querySelector('#btn-wallet-modal');
    const closeBtn = container.querySelector('#btn-close-wallet-modal');
    const overlay = container.querySelector('#wallet-modal-overlay');

    pillBtn?.addEventListener('click', () => {
      isModalOpen = true;
      overlay?.classList.add('active');
    });

    closeBtn?.addEventListener('click', () => {
      isModalOpen = false;
      overlay?.classList.remove('active');
    });

    overlay?.addEventListener('click', (e) => {
      if (e.target === overlay) {
        isModalOpen = false;
        overlay.classList.remove('active');
      }
    });

    // Action buttons
    container.querySelector('#btn-connect-metamask')?.addEventListener('click', async () => {
      const res = await miniPayService.connectMetaMask();
      if (!res.success) {
        alert(res.error || 'Failed to connect MetaMask. Ensure MetaMask is installed and unlocked.');
      } else {
        isModalOpen = false;
      }
    });

    container.querySelector('#btn-disconnect-wallet')?.addEventListener('click', () => {
      miniPayService.disconnectWallet();
      isModalOpen = false;
    });

    container.querySelector('#btn-copy-address')?.addEventListener('click', () => {
      if (state.address) {
        navigator.clipboard?.writeText(state.address);
        alert(`Copied address: ${state.address}`);
      }
    });
  };

  miniPayService.subscribe(update);
}
