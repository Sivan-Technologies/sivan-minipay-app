/**
 * Legal, Compliance & Dedicated Support Modal for MiniPay Discover
 * Meets all MiniPay listing requirements:
 * - In-app accessible Terms of Service
 * - In-app accessible Privacy Policy
 * - Direct in-app Support URL (Telegram / Email) with 24-hour critical SLA guarantee
 * - Clear publisher ownership: Sivan Technology (Abuja, Nigeria)
 */

import {
  getTelegramIconSvg,
  getMailIconSvg,
  getFlashIconSvg
} from '../utils/ui-icons';

type LegalTab = 'terms' | 'privacy' | 'support';

let currentTab: LegalTab = 'terms';
let modalRoot: HTMLElement | null = null;

export function openLegalModal(tab: LegalTab = 'terms') {
  currentTab = tab;
  renderModal();
  const overlay = document.getElementById('legal-support-overlay');
  if (overlay) {
    overlay.classList.add('active');
  }
}

export function closeLegalModal() {
  const overlay = document.getElementById('legal-support-overlay');
  if (overlay) {
    overlay.classList.remove('active');
  }
}

export function initLegalModal() {
  let container = document.getElementById('legal-modal-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'legal-modal-container';
    document.body.appendChild(container);
  }
  modalRoot = container;
  renderModal();
}

function renderModal() {
  if (!modalRoot) return;

  modalRoot.innerHTML = `
    <div id="legal-support-overlay" class="modal-overlay">
      <div class="modal-card legal-modal-card" style="max-height: 85vh; display: flex; flex-direction: column;">
        <div class="modal-header" style="flex-shrink: 0;">
          <div style="display: flex; align-items: center; gap: 8px;">
            <img src="/minipay-icon-512.png" alt="Sivan Ai" style="width: 24px; height: 24px; border-radius: 6px;" />
            <h3 style="font-family: var(--font-display); font-size: 15px; margin: 0;">Sivan Ai Legal & Support</h3>
          </div>
          <button class="btn-close-modal" id="btn-close-legal-modal" style="cursor: pointer;">✕</button>
        </div>

        <!-- Navigation Tabs -->
        <div class="legal-modal-tabs" style="display: grid; grid-template-columns: 1fr 1fr 1fr; border-bottom: 1px solid var(--border-subtle); background: var(--bg-glass);">
          <button type="button" class="legal-tab-btn ${currentTab === 'terms' ? 'active' : ''}" data-tab="terms" style="padding: 10px 4px; font-size: 11px; font-weight: 600; border: none; background: ${currentTab === 'terms' ? 'rgba(16, 185, 129, 0.15)' : 'transparent'}; color: ${currentTab === 'terms' ? 'var(--accent-emerald)' : 'var(--text-muted)'}; border-bottom: 2px solid ${currentTab === 'terms' ? 'var(--accent-emerald)' : 'transparent'}; cursor: pointer;">
            Terms of Service
          </button>
          <button type="button" class="legal-tab-btn ${currentTab === 'privacy' ? 'active' : ''}" data-tab="privacy" style="padding: 10px 4px; font-size: 11px; font-weight: 600; border: none; background: ${currentTab === 'privacy' ? 'rgba(16, 185, 129, 0.15)' : 'transparent'}; color: ${currentTab === 'privacy' ? 'var(--accent-emerald)' : 'var(--text-muted)'}; border-bottom: 2px solid ${currentTab === 'privacy' ? 'var(--accent-emerald)' : 'transparent'}; cursor: pointer;">
            Privacy Policy
          </button>
          <button type="button" class="legal-tab-btn ${currentTab === 'support' ? 'active' : ''}" data-tab="support" style="padding: 10px 4px; font-size: 11px; font-weight: 600; border: none; background: ${currentTab === 'support' ? 'rgba(16, 185, 129, 0.15)' : 'transparent'}; color: ${currentTab === 'support' ? 'var(--accent-emerald)' : 'var(--text-muted)'}; border-bottom: 2px solid ${currentTab === 'support' ? 'var(--accent-emerald)' : 'transparent'}; cursor: pointer;">
            Support (24/7)
          </button>
        </div>

        <!-- Tab Body (Scrollable) -->
        <div class="modal-body" style="flex: 1; overflow-y: auto; padding: 16px; font-size: 12px; line-height: 1.6; color: var(--text-secondary);">
          ${getTabContent(currentTab)}
        </div>

        <!-- Publisher Disclosure Footer -->
        <div style="flex-shrink: 0; padding: 12px 16px; border-top: 1px solid var(--border-subtle); background: var(--bg-glass); font-size: 10px; color: var(--text-muted); display: flex; justify-content: space-between; align-items: center;">
          <span>Published by <strong>Sivan Technologies</strong></span>
          <span>Celo Mainnet #9827</span>
        </div>
      </div>
    </div>
  `;

  // Attach event listeners
  modalRoot.querySelector('#btn-close-legal-modal')?.addEventListener('click', closeLegalModal);
  modalRoot.querySelector('#legal-support-overlay')?.addEventListener('click', (e) => {
    if ((e.target as HTMLElement).id === 'legal-support-overlay') {
      closeLegalModal();
    }
  });

  modalRoot.querySelectorAll('.legal-tab-btn').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      const tab = (e.currentTarget as HTMLElement).dataset.tab as LegalTab;
      if (tab) {
        currentTab = tab;
        renderModal();
        const overlay = document.getElementById('legal-support-overlay');
        if (overlay) overlay.classList.add('active');
      }
    });
  });
}

function getTabContent(tab: LegalTab): string {
  switch (tab) {
    case 'terms':
      return `
        <h4 style="color: var(--text-primary); margin-top: 0; margin-bottom: 8px; font-size: 13px;">Sivan Autonomous Protocol Terms of Service</h4>
        <p style="margin-bottom: 10px;">
          Welcome to Sivan. By accessing or interacting with the Sivan MiniPay mini-app, you agree to be bound by these terms. Sivan Technologies provides autonomous milestone-based smart contracts, ERC-8021 transactional attribution, and liquidity settlement rails on the Celo network.
        </p>
        <p style="margin-bottom: 10px;">
          <strong>1. Decentralized & Self-Custodial:</strong> You maintain full control over your cryptographic private keys. Sivan does not take custody of user funds outside of the immutable parameters programmed into open smart contracts.
        </p>
        <p style="margin-bottom: 10px;">
          <strong>2. Service Agreements & Settlement:</strong> Milestone deals locked on Celo Mainnet are released upon mutual milestone verification or buyer cryptographic authorization. All transactions are final and settled directly on-chain.
        </p>
        <p style="margin-bottom: 10px;">
          <strong>3. MiniPay & Opera Non-Affiliation Disclosure:</strong> Sivan Ai is developed and operated independently by Sivan Technologies. Sivan Ai is not operated by, affiliated with, sponsored by, or an agent of Opera Software, Opera Mini, or MiniPay. MiniPay provides the in-app Web3 runtime browser environment.
        </p>
        <p style="margin-bottom: 10px;">
          <strong>4. Compliance & Legality:</strong> Users agree not to utilize Sivan rails for prohibited, illicit, or sanctioned transactions under international anti-money laundering regulations.
        </p>
        <div style="font-size: 11px; color: var(--text-muted); margin-top: 14px; border-top: 1px solid var(--border-subtle); padding-top: 8px;">
          Publisher: Sivan Technologies · Global Remote Protocol
        </div>
      `;

    case 'privacy':
      return `
        <h4 style="color: var(--text-primary); margin-top: 0; margin-bottom: 8px; font-size: 13px;">Sivan Global Privacy Policy</h4>
        <p style="margin-bottom: 10px;">
          Sivan values your digital privacy. We operate on a strict data-minimization architecture:
        </p>
        <p style="margin-bottom: 10px;">
          <strong>1. Non-Custodial Data Processing:</strong> We do not store unencrypted financial records, private keys, seed phrases, or sensitive personal data on central servers.
        </p>
        <p style="margin-bottom: 10px;">
          <strong>2. Telemetry & Analytics:</strong> Any diagnostic telemetry collected is strictly anonymous, used purely for network health, RPC latency monitoring, and gas optimization.
        </p>
        <p style="margin-bottom: 10px;">
          <strong>3. Payout Data Retention:</strong> Local bank account numbers used for NIBSS off-ramping are securely passed to licensed settlement partners and never sold to third-party advertisers.
        </p>
        <div style="font-size: 11px; color: var(--text-muted); margin-top: 14px; border-top: 1px solid var(--border-subtle); padding-top: 8px;">
          Public wallet addresses and service agreement states are recorded on the public Celo blockchain as part of standard distributed ledger operation.
        </div>
      `;

    case 'support':
      return `
        <h4 style="color: var(--text-primary); margin-top: 0; margin-bottom: 8px; font-size: 13px;">Dedicated Support & Contact</h4>
        <p style="margin-bottom: 12px;">
          Need assistance with a transfer, service agreement, or payout? Our dedicated engineering team is available 24/7.
        </p>
        
        <div style="display: flex; flex-direction: column; gap: 8px; margin-bottom: 14px;">
          <a href="https://t.me/Sivan_Ai" target="_blank" rel="noopener noreferrer" style="display: flex; align-items: center; justify-content: space-between; background: var(--bg-glass); border: 1px solid var(--border-subtle); padding: 10px 12px; border-radius: 8px; text-decoration: none; color: var(--text-primary);">
            <div style="display: flex; align-items: center; gap: 8px;">
              ${getTelegramIconSvg(18, '#229ED9')}
              <div>
                <div style="font-weight: 600; font-size: 12px;">Official Telegram Support</div>
                <div style="font-size: 10px; color: var(--text-muted);">t.me/Sivan_Ai • Instant Community & Help</div>
              </div>
            </div>
            <span style="color: var(--accent-emerald);">Join ↗</span>
          </a>

          <a href="mailto:support@sivantech.online" style="display: flex; align-items: center; justify-content: space-between; background: var(--bg-glass); border: 1px solid var(--border-subtle); padding: 10px 12px; border-radius: 8px; text-decoration: none; color: var(--text-primary);">
            <div style="display: flex; align-items: center; gap: 8px;">
              ${getMailIconSvg(18, 'var(--accent-cyan)')}
              <div>
                <div style="font-weight: 600; font-size: 12px;">Official Support Email</div>
                <div style="font-size: 10px; color: var(--text-muted);">support@sivantech.online</div>
              </div>
            </div>
            <span style="color: var(--accent-cyan);">Email ↗</span>
          </a>
        </div>

        <div style="background: rgba(16, 185, 129, 0.08); border: 1px solid rgba(16, 185, 129, 0.2); border-radius: 8px; padding: 10px; font-size: 11px;">
          <strong style="color: var(--accent-emerald); display: flex; align-items: center; gap: 4px; margin-bottom: 2px;">
            ${getFlashIconSvg(13, 'var(--accent-emerald)')}
            <span>MiniPay SLA Guarantee:</span>
          </strong>
          Our engineering team guarantees responses to all critical issues and inquiries within <strong>24 hours</strong>.
        </div>
      `;
  }
}
