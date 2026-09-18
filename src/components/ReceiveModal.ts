import { miniPayService } from '../services/minipay.service';
import { identityService } from '../services/identity.service';
import { openClaimHandleModal } from './ClaimHandleModal';
import { getTokenIconSvg } from '../utils/token-icons';
import { getFlashIconSvg, getSparkleIconSvg } from '../utils/ui-icons';

const MODAL_ID = 'sivan-receive-modal';

export function openReceiveModal(onToast?: (msg: string) => void) {
  // Remove any existing instance
  document.getElementById(MODAL_ID)?.remove();

  const state = miniPayService.getState();
  const address = state.address || '';
  const savedUsername = identityService.getSavedUsername();
  const shortAddr = address ? `${address.slice(0, 6)}...${address.slice(-4)}` : 'Not Connected';

  const overlay = document.createElement('div');
  overlay.id = MODAL_ID;
  overlay.className = 'modal-overlay active';
  overlay.style.cssText = `
    position: fixed; inset: 0; z-index: 9999;
    background: rgba(0, 0, 0, 0.75);
    backdrop-filter: blur(8px);
    -webkit-backdrop-filter: blur(8px);
    display: flex; align-items: flex-end; justify-content: center;
    animation: fadeInOverlay 0.2s ease;
  `;

  const qrData = encodeURIComponent(address || 'https://sivantech.online');
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${qrData}&bgcolor=16213e&color=34d399&margin=8`;

  overlay.innerHTML = `
    <style>
      @keyframes slideUpReceiveModal {
        from { transform: translateY(100%); opacity: 0; }
        to   { transform: translateY(0);   opacity: 1; }
      }
      #receive-modal-card {
        width: 100%;
        max-width: 480px;
        background: var(--bg-card, #16213e);
        border-top-left-radius: 24px;
        border-top-right-radius: 24px;
        border-top: 1px solid var(--border-subtle);
        padding: 24px 20px 36px;
        animation: slideUpReceiveModal 0.28s cubic-bezier(0.34, 1.3, 0.64, 1);
        position: relative;
        max-height: 90vh;
        overflow-y: auto;
      }
      .receive-handle-badge {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        background: linear-gradient(135deg, rgba(16, 185, 129, 0.15), rgba(6, 182, 212, 0.15));
        border: 1px solid var(--accent-emerald);
        border-radius: 24px;
        padding: 10px 18px;
        margin: 12px 0 16px;
        cursor: pointer;
        transition: transform 0.15s ease, box-shadow 0.15s ease;
      }
      .receive-handle-badge:active {
        transform: scale(0.97);
      }
      .receive-qr-container {
        display: flex;
        justify-content: center;
        align-items: center;
        margin: 14px auto;
        padding: 12px;
        background: #16213e;
        border: 1px solid var(--border-subtle);
        border-radius: 16px;
        width: fit-content;
        box-shadow: 0 8px 24px rgba(0,0,0,0.4);
      }
      .receive-token-pill {
        display: flex;
        align-items: center;
        gap: 6px;
        background: var(--bg-glass);
        border: 1px solid var(--border-subtle);
        border-radius: 20px;
        padding: 6px 10px;
        font-size: 11px;
        font-weight: 600;
        color: var(--text-primary);
      }
    </style>

    <div id="receive-modal-card">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
        <div style="display: flex; align-items: center; gap: 8px;">
          <div style="width: 32px; height: 32px; border-radius: 8px; background: rgba(16, 185, 129, 0.15); color: var(--accent-emerald); display: flex; align-items: center; justify-content: center;">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
          </div>
          <div>
            <h3 style="font-family: var(--font-display); font-size: 17px; font-weight: 700; color: var(--text-primary); margin: 0;">Receive & Deposit</h3>
            <span style="font-size: 11px; color: var(--text-muted);">Direct P2P & Multi-Chain Sivan Universal Handle</span>
          </div>
        </div>
        <button id="btn-close-receive-modal" style="background: rgba(255,255,255,0.08); border: none; width: 28px; height: 28px; border-radius: 50%; color: var(--text-muted); cursor: pointer; font-size: 14px; display: flex; align-items: center; justify-content: center;">✕</button>
      </div>

      <div style="text-align: center;">
        <div style="font-size: 11px; text-transform: uppercase; letter-spacing: 0.6px; font-weight: 600; color: var(--text-secondary);">
          Your Sivan Universal Handle
        </div>

        ${savedUsername ? `
          <div class="receive-handle-badge" id="btn-copy-handle" title="Tap to copy Sivan handle">
            <span>${getSparkleIconSvg(14, 'var(--accent-emerald)')}</span>
            <span style="font-family: monospace; font-size: 16px; font-weight: 700; color: var(--accent-emerald); letter-spacing: 0.3px;">${savedUsername}</span>
            <span style="font-size: 11px; background: rgba(16, 185, 129, 0.2); color: var(--accent-emerald); padding: 2px 8px; border-radius: 12px; font-weight: 600;">Tap to Copy</span>
          </div>
        ` : `
          <div style="margin: 12px 0 16px;">
            <button type="button" id="btn-modal-claim-handle" style="background: linear-gradient(135deg, rgba(16, 185, 129, 0.2), rgba(6, 182, 212, 0.2)); border: 1.5px solid var(--accent-emerald); border-radius: 24px; padding: 10px 18px; color: var(--accent-emerald); font-weight: 700; font-size: 13px; cursor: pointer; display: inline-flex; align-items: center; gap: 8px;">
              <span>${getSparkleIconSvg(14, 'var(--accent-emerald)')}</span>
              <span>Claim Your Universal @handle</span>
              <span>→</span>
            </button>
          </div>
        `}

        <!-- QR Code Display -->
        <div class="receive-qr-container">
          <img src="${qrUrl}" alt="Sivan QR Code" width="180" height="180" style="border-radius: 8px; display: block;" />
        </div>

        <!-- Wallet Address Copy Box -->
        <div style="background: var(--bg-glass); border: 1px solid var(--border-subtle); border-radius: 12px; padding: 10px 14px; margin: 12px 0 14px; display: flex; align-items: center; justify-content: space-between; gap: 8px;">
          <div style="text-align: left; overflow: hidden;">
            <div style="font-size: 10px; color: var(--text-muted); text-transform: uppercase;">Celo Address</div>
            <div style="font-family: monospace; font-size: 12px; color: var(--accent-cyan); text-overflow: ellipsis; overflow: hidden; white-space: nowrap;">
              ${address || 'Connect wallet to view address'}
            </div>
          </div>
          <button id="btn-copy-receive-address" style="background: rgba(6, 182, 212, 0.12); border: 1px solid var(--accent-cyan); border-radius: 8px; padding: 6px 12px; font-size: 11px; font-weight: 600; color: var(--accent-cyan); cursor: pointer; white-space: nowrap;">
            Copy
          </button>
        </div>

        <!-- Universal Cross-Chain Explanatory Callout -->
        <div style="background: rgba(16, 185, 129, 0.08); border: 1px solid rgba(16, 185, 129, 0.2); border-radius: 12px; padding: 12px 14px; text-align: left; margin-bottom: 16px;">
          <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 4px;">
            <span style="color: var(--accent-emerald); display: flex; align-items: center;">${getFlashIconSvg(13, 'var(--accent-emerald)')}</span>
            <span style="color: var(--accent-emerald); font-weight: 700; font-size: 12px;">Zero-Gas Sivan Handle Transfers</span>
          </div>
          <p style="font-size: 11px; color: var(--text-secondary); line-height: 1.45; margin: 0;">
            Senders on Celo, Solana, or Stellar can send directly to <strong style="color: var(--text-primary);">${savedUsername || 'your verified Sivan handle'}</strong> with zero gas fees.
          </p>
        </div>

        <!-- Supported Assets Grid -->
        <div style="text-align: left;">
          <div style="font-size: 11px; font-weight: 600; color: var(--text-muted); text-transform: uppercase; margin-bottom: 8px; letter-spacing: 0.5px;">Supported Deposit Assets</div>
          <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 6px;">
            <div class="receive-token-pill">
              <span>${getTokenIconSvg('USDC', 16)}</span>
              <span>USDC</span>
            </div>
            <div class="receive-token-pill">
              <span>${getTokenIconSvg('USDT', 16)}</span>
              <span>USDT</span>
            </div>
            <div class="receive-token-pill">
              <span>${getTokenIconSvg('cUSD', 16)}</span>
              <span>USDm</span>
            </div>
            <div class="receive-token-pill">
              <span>${getTokenIconSvg('cNGN', 16)}</span>
              <span>cNGN</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);

  const copyToClipboard = async (text: string): Promise<boolean> => {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text);
        return true;
      }
    } catch (err) {
      console.warn('navigator.clipboard failed:', err);
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
      return false;
    }
  };

  const close = () => {
    overlay.remove();
  };

  overlay.querySelector('#btn-close-receive-modal')?.addEventListener('click', close);
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) close();
  });

  overlay.querySelector('#btn-copy-handle')?.addEventListener('click', async () => {
    if (savedUsername) {
      const ok = await copyToClipboard(savedUsername);
      if (ok && onToast) {
        onToast(`✨ Sivan handle copied: ${savedUsername}`);
      }
    }
  });

  overlay.querySelector('#btn-copy-receive-address')?.addEventListener('click', async () => {
    if (address) {
      const ok = await copyToClipboard(address);
      if (ok && onToast) {
        onToast(`✓ Wallet address copied: ${shortAddr}`);
      }
    }
  });

  overlay.querySelector('#btn-modal-claim-handle')?.addEventListener('click', async () => {
    close();
    await openClaimHandleModal(
      address,
      (username) => {
        if (onToast) onToast(`🎉 Sivan handle claimed: ${username}`);
      },
      onToast
    );
  });
}
