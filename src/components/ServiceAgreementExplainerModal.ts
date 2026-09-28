/**
 * Sivan Service Agreement Explainer Modal
 * Provides an interactive 3-step walkthrough explaining what Sivan does
 * and how Service Agreements protect both buyers and contractors.
 */

import { getLockIconSvg, getFlashIconSvg, getBankIconSvg } from '../utils/ui-icons';

let activeModalOverlay: HTMLElement | null = null;

export function openServiceAgreementExplainerModal(onNavigate?: (tab: string) => void) {
  closeServiceAgreementExplainerModal();

  const overlay = document.createElement('div');
  overlay.className = 'sivan-explainer-overlay';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');
  activeModalOverlay = overlay;

  overlay.innerHTML = `
    <div class="sivan-explainer-modal">
      <!-- Modal Header -->
      <div class="explainer-header">
        <div class="explainer-header-badge">
          <span class="explainer-badge-dot"></span>
          <span>AUTONOMOUS PROTOCOL</span>
        </div>
        <button type="button" class="explainer-close-btn" id="btn-close-explainer" aria-label="Close">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
      </div>

      <div class="explainer-title-block">
        <h3 class="explainer-title">How Sivan Protects You</h3>
        <p class="explainer-subtitle">Zero ghosting. Zero payment risk. 100% on-chain milestone security.</p>
      </div>

      <!-- 3 Steps Interactive Card Timeline -->
      <div class="explainer-steps-container">
        <!-- Step 1 -->
        <div class="explainer-step-card">
          <div class="explainer-step-icon-wrap step-icon-cyan">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
              <polyline points="14 2 14 8 20 8"></polyline>
              <line x1="16" y1="13" x2="8" y2="13"></line>
              <line x1="16" y1="17" x2="8" y2="17"></line>
              <polyline points="10 9 9 9 8 9"></polyline>
            </svg>
          </div>
          <div class="explainer-step-content">
            <div class="explainer-step-num">STEP 1</div>
            <div class="explainer-step-heading">Set Up Service Agreement</div>
            <div class="explainer-step-desc">Define scope, deadline, and payment in digital dollars (USDC or USDm). Both parties review the terms.</div>
          </div>
        </div>

        <!-- Step 2 -->
        <div class="explainer-step-card">
          <div class="explainer-step-icon-wrap step-icon-emerald">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
              <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
            </svg>
          </div>
          <div class="explainer-step-content">
            <div class="explainer-step-num">STEP 2</div>
            <div class="explainer-step-heading">Client Locks Funds in Vault</div>
            <div class="explainer-step-desc">Payment is deposited safely into the autonomous contract vault. Contractor starts work knowing funds are guaranteed.</div>
          </div>
        </div>

        <!-- Step 3 -->
        <div class="explainer-step-card">
          <div class="explainer-step-icon-wrap step-icon-purple">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon>
            </svg>
          </div>
          <div class="explainer-step-content">
            <div class="explainer-step-num">STEP 3</div>
            <div class="explainer-step-heading">Deliver & Release Instantly</div>
            <div class="explainer-step-desc">Contractor submits work. Client approves and funds release immediately to the contractor. Cash out to local bank anytime.</div>
          </div>
        </div>
      </div>

      <!-- Trust Badges Strip -->
      <div class="explainer-trust-strip">
        <div class="explainer-trust-item">
          ${getLockIconSvg(13, '#38bdf8')}
          <span>Smart Vault</span>
        </div>
        <div class="explainer-trust-dot">•</div>
        <div class="explainer-trust-item">
          ${getFlashIconSvg(13, '#34d399')}
          <span>Celo Mainnet</span>
        </div>
        <div class="explainer-trust-dot">•</div>
        <div class="explainer-trust-item">
          ${getBankIconSvg(13, '#c084fc')}
          <span>Local Rails</span>
        </div>
      </div>

      <!-- Action Button -->
      <div class="explainer-action-box">
        <button type="button" class="explainer-btn-primary" id="btn-explainer-create">
          <span>+ Create Service Agreement</span>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <line x1="5" y1="12" x2="19" y2="12"></line>
            <polyline points="12 5 19 12 12 19"></polyline>
          </svg>
        </button>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);

  // Trigger active animation
  requestAnimationFrame(() => {
    overlay.classList.add('active');
  });

  // Close handlers
  overlay.querySelector('#btn-close-explainer')?.addEventListener('click', closeServiceAgreementExplainerModal);
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) {
      closeServiceAgreementExplainerModal();
    }
  });

  // CTA button handler
  overlay.querySelector('#btn-explainer-create')?.addEventListener('click', () => {
    closeServiceAgreementExplainerModal();
    if (onNavigate) {
      onNavigate('create');
    }
  });
}

export function closeServiceAgreementExplainerModal() {
  if (activeModalOverlay) {
    const el = activeModalOverlay;
    el.classList.remove('active');
    setTimeout(() => {
      if (el.parentNode) {
        el.parentNode.removeChild(el);
      }
      if (activeModalOverlay === el) {
        activeModalOverlay = null;
      }
    }, 200);
  }
}
