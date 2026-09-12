import { miniPayService } from '../services/minipay.service';
import type { MiniPayDetectionState } from '../types/minipay.types';
import { getActiveNetwork } from '../config/celo.config';

export function renderHeader(container: HTMLElement) {
  let isModalOpen = false;

  const update = (state: MiniPayDetectionState) => {
    const activeNet = getActiveNetwork();
    const isLiveMiniPay = state.mode === 'live_minipay';
    const isMetaMask = state.mode === 'connected_wallet';
    const isConnected = !!state.address;
    const isTestnet = activeNet.mode === 'testnet';

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

    const netBadgeLabel = isTestnet ? 'Celo Sepolia' : 'Celo Mainnet';
    const netBadgeColor = isTestnet ? '#f59e0b' : 'var(--accent-emerald)';
    const netBadgeDot = isTestnet ? 'background: #f59e0b;' : 'background: var(--accent-emerald);';

    container.innerHTML = `
      <header class="app-header">
        <div class="brand-wrapper">
          <img src="/sivan-logo.png" alt="Sivan Ai" class="brand-icon-img" />
          <div class="brand-text">
            <h1>Sivan Ai</h1>
            <div class="brand-tagline">Autonomous Service Agreements</div>
          </div>
        </div>

        <div style="display: flex; align-items: center; gap: 8px;">
          <!-- Network Badge / Toggle -->
          <button class="header-network-pill" id="btn-network-toggle" title="Switch Network (Mainnet / Testnet)" style="background: var(--bg-glass); border: 1px solid var(--border-subtle); border-radius: 20px; padding: 4px 10px; font-size: 11px; display: flex; align-items: center; gap: 6px; cursor: pointer; color: ${netBadgeColor};">
            <span style="width: 7px; height: 7px; border-radius: 50%; ${netBadgeDot}"></span>
            <span style="font-weight: 600;">${isTestnet ? 'Sepolia Testnet' : 'Mainnet'}</span>
          </button>

          <!-- Wallet Status Pill -->
          <button class="header-status-pill" id="btn-wallet-modal" title="Manage connection">
            <span class="${dotClass}"></span>
            <span style="color: ${pillColor}; font-weight: 600;">${pillLabel}</span>
            ${isConnected ? `<span style="color: var(--text-muted); font-size: 11px;">(${shortAddr})</span>` : ''}
          </button>
        </div>
      </header>

      <!-- Wallet & Network Modal -->
      <div id="wallet-modal-overlay" class="modal-overlay ${isModalOpen ? 'active' : ''}">
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
              ${isTestnet ? `
                <div style="margin-top: 10px; padding: 10px; background: rgba(245, 158, 11, 0.1); border: 1px dashed rgba(245, 158, 11, 0.3); border-radius: 6px; font-size: 11px;">
                  <div style="font-weight: 600; color: #f59e0b; margin-bottom: 2px;">Need Testnet CELO for Gas?</div>
                  <div style="color: var(--text-muted); font-size: 10px; margin-bottom: 6px;">MetaMask requires a tiny fraction of CELO (&lt; $0.001) for network fee.</div>
                  <a href="https://faucet.celo.org/celo-sepolia" target="_blank" rel="noreferrer" style="color: #f59e0b; font-weight: 600; text-decoration: underline; display: inline-flex; align-items: center; gap: 4px;">
                    🚰 Get Free Testnet CELO ↗
                  </a>
                </div>
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

            <!-- Actions -->
            <div style="display: flex; flex-direction: column; gap: 10px;">
              ${!isConnected ? `
                <button class="btn-primary" id="btn-connect-metamask">
                  <span>🦊 Connect MetaMask</span>
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
    const networkToggleBtn = container.querySelector('#btn-network-toggle');
    const closeBtn = container.querySelector('#btn-close-wallet-modal');
    const overlay = container.querySelector('#wallet-modal-overlay');

    const openModal = () => {
      isModalOpen = true;
      overlay?.classList.add('active');
    };

    pillBtn?.addEventListener('click', openModal);
    networkToggleBtn?.addEventListener('click', openModal);

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

    // Network select buttons
    const btnSelectMainnet = container.querySelector('#btn-select-mainnet');
    const btnSelectTestnet = container.querySelector('#btn-select-testnet');

    btnSelectMainnet?.addEventListener('click', async () => {
      await miniPayService.switchNetwork('mainnet');
      window.location.reload();
    });

    btnSelectTestnet?.addEventListener('click', async () => {
      await miniPayService.switchNetwork('testnet');
      window.location.reload();
    });

    // Connect / Disconnect handlers
    const connectBtn = container.querySelector('#btn-connect-metamask');
    connectBtn?.addEventListener('click', async () => {
      const res = await miniPayService.connectMetaMask();
      if (!res.success) {
        alert(res.error || 'Failed to connect MetaMask');
      } else {
        isModalOpen = false;
        overlay?.classList.remove('active');
      }
    });

    const disconnectBtn = container.querySelector('#btn-disconnect-wallet');
    disconnectBtn?.addEventListener('click', () => {
      miniPayService.disconnectWallet();
      isModalOpen = false;
      overlay?.classList.remove('active');
    });

    const importUsdcBtn = container.querySelector('#btn-import-usdc');
    importUsdcBtn?.addEventListener('click', async () => {
      const res = await miniPayService.addTokenToWallet('USDC');
      if (res.success) {
        alert('USDC token added to MetaMask successfully!');
      } else {
        alert(res.error || 'Failed to add USDC token to MetaMask');
      }
    });

    // Copy address handler
    const copyBtn = container.querySelector('#btn-copy-address');
    copyBtn?.addEventListener('click', () => {
      if (state.address) {
        void navigator.clipboard.writeText(state.address);
        copyBtn.textContent = '✓';
        setTimeout(() => {
          copyBtn.textContent = '📋';
        }, 1500);
      }
    });
  };

  miniPayService.subscribe(update);
}
