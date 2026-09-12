/**
 * Legal, Compliance & Dedicated Support Modal for MiniPay Discover
 * Meets all MiniPay listing requirements:
 * - In-app accessible Terms of Service
 * - In-app accessible Privacy Policy
 * - Direct in-app Support URL (Telegram / Email) with 24-hour critical SLA guarantee
 * - Clear publisher ownership: Sivan Technology (Abuja, Nigeria)
 */

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
        <h4 style="color: var(--text-primary); margin-top: 0; margin-bottom: 8px; font-size: 13px;">Terms of Service</h4>
        <p style="margin-bottom: 10px;">
          Last updated: September 2026. By accessing Sivan Ai inside Opera MiniPay or online, you agree to these Terms of Service.
        </p>
        <div style="margin-bottom: 12px;">
          <strong style="color: var(--text-primary); display: block; margin-bottom: 4px;">1. Protocol Nature & Autonomous Agreements</strong>
          Sivan Ai is an autonomous decentralized smart payment protocol enabling peer-to-peer digital dollar transfers, milestone-based service agreements, and local currency bank settlement on the Celo network. Sivan Ai is non-custodial; all funds remain locked in on-chain service agreements until mutual release, milestone delivery, or dispute resolution.
        </div>
        <div style="margin-bottom: 12px;">
          <strong style="color: var(--text-primary); display: block; margin-bottom: 4px;">2. MiniPay & Opera Non-Affiliation Disclosure</strong>
          Sivan Ai is developed and operated independently by Sivan Technologies. Sivan Ai is not operated by, affiliated with, sponsored by, or an agent of Opera Software, Opera Mini, or MiniPay. MiniPay provides the in-app Web3 runtime browser environment.
        </div>
        <div style="margin-bottom: 12px;">
          <strong style="color: var(--text-primary); display: block; margin-bottom: 4px;">3. Protocol Fees & Transparent Settlement</strong>
          All direct transfers and service agreement settlements are subjected to transparent network rules displayed prior to signing. Local bank payouts are executed via licensed corridor rails (e.g. Textile Credit / Busha NIBSS network).
        </div>
        <div style="margin-bottom: 12px;">
          <strong style="color: var(--text-primary); display: block; margin-bottom: 4px;">4. User Responsibilities</strong>
          Users are responsible for ensuring accurate beneficiary wallet addresses and bank account numbers. Blockchain transactions on Celo Mainnet are immutable once confirmed.
        </div>
      `;

    case 'privacy':
      return `
        <h4 style="color: var(--text-primary); margin-top: 0; margin-bottom: 8px; font-size: 13px;">Privacy Policy</h4>
        <p style="margin-bottom: 10px;">
          Sivan Technologies is committed to strict privacy preservation and minimal data collection principles.
        </p>
        <div style="margin-bottom: 12px;">
          <strong style="color: var(--text-primary); display: block; margin-bottom: 4px;">1. Non-Custodial Architecture</strong>
          Sivan Ai never has access to your private keys, seed phrases, or wallet credentials. Your identity is managed directly by your MiniPay wallet or injected Web3 provider.
        </div>
        <div style="margin-bottom: 12px;">
          <strong style="color: var(--text-primary); display: block; margin-bottom: 4px;">2. Zero Tracking & No Ad Telemetry</strong>
          We do not track browsing history, sell user data, or inject third-party advertising cookies.
        </div>
        <div style="margin-bottom: 12px;">
          <strong style="color: var(--text-primary); display: block; margin-bottom: 4px;">3. Bank Verification Data</strong>
          When requesting local currency payouts, bank account numbers and routing codes are transmitted directly via encrypted channels to licensed settlement rails to resolve account holder names for fraud prevention.
        </div>
        <div style="margin-bottom: 12px;">
          <strong style="color: var(--text-primary); display: block; margin-bottom: 4px;">4. Public On-Chain Ledger</strong>
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
              <span style="font-size: 16px;">💬</span>
              <div>
                <div style="font-weight: 600; font-size: 12px;">Official Telegram Support</div>
                <div style="font-size: 10px; color: var(--text-muted);">t.me/Sivan_Ai • Instant Community & Help</div>
              </div>
            </div>
            <span style="color: var(--accent-emerald);">Join ↗</span>
          </a>

          <a href="mailto:support@sivantech.online" style="display: flex; align-items: center; justify-content: space-between; background: var(--bg-glass); border: 1px solid var(--border-subtle); padding: 10px 12px; border-radius: 8px; text-decoration: none; color: var(--text-primary);">
            <div style="display: flex; align-items: center; gap: 8px;">
              <span style="font-size: 16px;">✉️</span>
              <div>
                <div style="font-weight: 600; font-size: 12px;">Official Support Email</div>
                <div style="font-size: 10px; color: var(--text-muted);">support@sivantech.online</div>
              </div>
            </div>
            <span style="color: var(--accent-cyan);">Email ↗</span>
          </a>
        </div>

        <div style="background: rgba(16, 185, 129, 0.08); border: 1px solid rgba(16, 185, 129, 0.2); border-radius: 8px; padding: 10px; font-size: 11px;">
          <strong style="color: var(--accent-emerald); display: block; margin-bottom: 2px;">⚡ MiniPay SLA Guarantee:</strong>
          Our engineering team guarantees responses to all critical issues and inquiries within <strong>24 hours</strong>.
        </div>
      `;
  }
}
