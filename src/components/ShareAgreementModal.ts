import type { ServiceAgreement } from '../types/minipay.types';
import { formatDeadlineHours } from '../utils/deadline';
import {
  getHandshakeIconSvg,
  getLockIconSvg,
  getWhatsAppIconSvg,
  getTelegramIconSvg,
  getLinkIconSvg,
  getCopyIconSvg
} from '../utils/ui-icons';

let modalRoot: HTMLElement | null = null;
let activeAgreement: ServiceAgreement | null = null;
let onDoneCallback: (() => void) | null = null;

export function initShareModal() {
  let container = document.getElementById('share-modal-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'share-modal-container';
    document.body.appendChild(container);
  }
  modalRoot = container;
}

export function openShareModal(agreement: ServiceAgreement, onDone?: () => void) {
  activeAgreement = agreement;
  onDoneCallback = onDone || null;
  renderShareModal();
  const overlay = document.getElementById('share-agreement-overlay');
  if (overlay) {
    overlay.classList.add('active');
  }
}

export function closeShareModal() {
  const overlay = document.getElementById('share-agreement-overlay');
  if (overlay) {
    overlay.classList.remove('active');
  }
  if (onDoneCallback) {
    onDoneCallback();
    onDoneCallback = null;
  }
}

function renderShareModal() {
  if (!modalRoot || !activeAgreement) return;

  const agr = activeAgreement;
  const appBase = (import.meta.env.VITE_APP_URL || (typeof window !== 'undefined' ? window.location.origin : 'https://app.sivantech.online')).replace(/\/$/, '');
  const telegramBotBase = (import.meta.env.VITE_TELEGRAM_BOT_URL || 'https://t.me/SivanAi_bot').replace(/\/$/, '');

  const params = new URLSearchParams({
    deal: agr.id,
    title: agr.title,
    amount: String(agr.amount),
    curr: agr.currency,
    net: String(agr.netAmount),
    hours: String(agr.deadlineHours),
    from: agr.contractorIdentifier || '',
    desc: agr.description || '',
    ...(agr.fundingTxHash ? { tx: agr.fundingTxHash } : {}),
  });

  const webLink = `${appBase}/?${params.toString()}`;
  const telegramDeepLink = `${telegramBotBase}?start=${agr.id}`;
  
  const shareText = `Sivan Service Agreement\nI have funded and locked ${agr.netAmount} ${agr.currency} on Celo for: "${agr.title}".\nReview and accept here: ${webLink}`;
  const waUrl = `https://wa.me/?text=${encodeURIComponent(shareText)}`;
  const tgUrl = `https://t.me/share/url?url=${encodeURIComponent(telegramDeepLink)}&text=${encodeURIComponent(`Sivan Service Agreement: I have locked ${agr.netAmount} ${agr.currency} on Celo for: "${agr.title}". Tap to review and accept.`)}`;

  modalRoot.innerHTML = `
    <div id="share-agreement-overlay" class="modal-overlay">
      <div class="modal-card" style="max-height: 90vh; display: flex; flex-direction: column; overflow: hidden;">
        <div class="modal-header">
          <div style="display: flex; align-items: center; gap: 8px;">
            <div style="display: flex; align-items: center; justify-content: center; width: 32px; height: 32px; border-radius: var(--radius-sm); background: rgba(16, 185, 129, 0.12); color: var(--accent-emerald);">
              ${getHandshakeIconSvg(18, 'var(--accent-emerald)')}
            </div>
            <div>
              <h3 style="font-family: var(--font-display); font-size: 15px; margin: 0; color: var(--text-primary);">Share Service Agreement</h3>
              <div style="font-size: 11px; color: var(--text-muted); margin-top: 2px;">Locked on Celo Mainnet</div>
            </div>
          </div>
          <button class="btn-close-modal" id="btn-close-share-modal" style="cursor: pointer; background: rgba(255,255,255,0.06); border: none; width: 28px; height: 28px; border-radius: 50%; color: var(--text-muted); font-size: 14px; display: flex; align-items: center; justify-content: center;">✕</button>
        </div>

        <div style="padding: 16px; overflow-y: auto; display: flex; flex-direction: column; gap: 14px;">
          <!-- Agreement Summary Box -->
          <div style="background: var(--bg-glass); border: 1px solid var(--border-subtle); border-radius: var(--radius-md); padding: 12px;">
            <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 6px;">
              <strong style="font-size: 14px; color: var(--text-primary);">${agr.title}</strong>
              <span class="agreement-badge badge-funded" style="font-size: 10px; display: inline-flex; align-items: center; gap: 4px;">${getLockIconSvg(10, 'var(--accent-emerald)')} Locked</span>
            </div>
            
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-top: 8px; font-size: 12px;">
              <div>
                <span style="color: var(--text-muted); display: block; font-size: 10px;">Net Contractor Payout</span>
                <span style="font-weight: 700; color: var(--text-emerald); font-size: 13px;">${agr.netAmount} ${agr.currency}</span>
              </div>
              <div>
                <span style="color: var(--text-muted); display: block; font-size: 10px;">Deadline</span>
                <span style="color: var(--text-secondary); font-size: 12px;">${formatDeadlineHours(agr.deadlineHours)}</span>
              </div>
            </div>

            <div style="margin-top: 8px; padding-top: 8px; border-top: 1px solid var(--border-subtle); font-size: 11px; display: flex; justify-content: space-between; align-items: center;">
              <span style="color: var(--text-muted);">Contractor:</span>
              <span style="font-family: monospace; color: var(--accent-cyan);">${agr.contractorIdentifier}</span>
            </div>
          </div>

          <!-- Share Instruction -->
          <div style="font-size: 12px; color: var(--text-secondary); line-height: 1.4;">
            Send this agreement to your contractor on their preferred platform so they can review deliverables and accept the deal.
          </div>

          <!-- Share Actions -->
          <div style="display: flex; flex-direction: column; gap: 10px;">
            <!-- WhatsApp -->
            <a 
              href="${waUrl}" 
              target="_blank" 
              rel="noopener noreferrer" 
              class="btn-share-channel" 
              style="display: flex; align-items: center; justify-content: space-between; padding: 12px 14px; background: rgba(37, 211, 102, 0.12); border: 1px solid rgba(37, 211, 102, 0.35); border-radius: var(--radius-md); color: #25D366; text-decoration: none; font-weight: 600; font-size: 13px; transition: all 0.2s ease;"
            >
              <span style="display: flex; align-items: center; gap: 10px;">
                ${getWhatsAppIconSvg(18, '#25D366')}
                <span>Share on WhatsApp</span>
              </span>
              <span style="font-size: 12px; opacity: 0.8;">Open ↗</span>
            </a>

            <!-- Telegram -->
            <a 
              href="${tgUrl}" 
              target="_blank" 
              rel="noopener noreferrer" 
              class="btn-share-channel" 
              style="display: flex; align-items: center; justify-content: space-between; padding: 12px 14px; background: rgba(0, 136, 204, 0.12); border: 1px solid rgba(0, 136, 204, 0.35); border-radius: var(--radius-md); color: #0088cc; text-decoration: none; font-weight: 600; font-size: 13px; transition: all 0.2s ease;"
            >
              <span style="display: flex; align-items: center; gap: 10px;">
                ${getTelegramIconSvg(18, '#0088cc')}
                <span>Share on Telegram</span>
              </span>
              <span style="font-size: 12px; opacity: 0.8;">Open ↗</span>
            </a>

            <!-- Copy Web Link -->
            <button 
              type="button" 
              id="btn-copy-agreement-link" 
              style="display: flex; align-items: center; justify-content: space-between; padding: 12px 14px; background: var(--bg-glass); border: 1px solid var(--border-subtle); border-radius: var(--radius-md); color: var(--text-primary); font-weight: 600; font-size: 13px; cursor: pointer; transition: all 0.2s ease; width: 100%;"
            >
              <span style="display: flex; align-items: center; gap: 10px;">
                ${getLinkIconSvg(16, 'var(--accent-cyan)')}
                <span id="copy-link-label">Copy Web Link</span>
              </span>
              <span id="copy-link-status" style="font-size: 11px; color: var(--accent-cyan);">${getCopyIconSvg(12, 'currentColor')} Tap to copy</span>
            </button>
          </div>

          <!-- Close / Done Button -->
          <button 
            type="button" 
            class="btn-secondary" 
            id="btn-done-sharing" 
            style="margin-top: 6px; padding: 10px; font-size: 13px; width: 100%;"
          >
            Done & View Agreements
          </button>
        </div>
      </div>
    </div>
  `;

  // Attach event listeners
  modalRoot.querySelector('#btn-close-share-modal')?.addEventListener('click', closeShareModal);
  modalRoot.querySelector('#btn-done-sharing')?.addEventListener('click', closeShareModal);

  // Close on outside click
  modalRoot.querySelector('#share-agreement-overlay')?.addEventListener('click', (e) => {
    if ((e.target as HTMLElement).id === 'share-agreement-overlay') {
      closeShareModal();
    }
  });

  // Copy Web Link handler
  const copyBtn = modalRoot.querySelector('#btn-copy-agreement-link') as HTMLButtonElement;
  const copyLabel = modalRoot.querySelector('#copy-link-label') as HTMLElement;
  const copyStatus = modalRoot.querySelector('#copy-link-status') as HTMLElement;

  copyBtn?.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(webLink);
      copyLabel.textContent = 'Link Copied!';
      copyStatus.textContent = 'Copied!';
      copyStatus.style.color = 'var(--accent-emerald)';
      setTimeout(() => {
        if (copyLabel) copyLabel.textContent = 'Copy Web Link';
        if (copyStatus) {
          copyStatus.innerHTML = `${getCopyIconSvg(12, 'currentColor')} Tap to copy`;
          copyStatus.style.color = 'var(--accent-cyan)';
        }
      }, 2500);
    } catch {
      // Fallback for browsers that restrict clipboard API
      const input = document.createElement('input');
      input.value = webLink;
      document.body.appendChild(input);
      input.select();
      document.execCommand('copy');
      document.body.removeChild(input);
      copyLabel.textContent = 'Link Copied!';
      copyStatus.textContent = 'Copied!';
      copyStatus.style.color = 'var(--accent-emerald)';
      setTimeout(() => {
        if (copyLabel) copyLabel.textContent = 'Copy Web Link';
        if (copyStatus) {
          copyStatus.innerHTML = `${getCopyIconSvg(12, 'currentColor')} Tap to copy`;
          copyStatus.style.color = 'var(--accent-cyan)';
        }
      }, 2500);
    }
  });
}
