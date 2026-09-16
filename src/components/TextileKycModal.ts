import { textileKycService, type TextileCustomerProfile, type TextileKycState } from '../services/textile-kyc.service';
import { miniPayService } from '../services/minipay.service';

let modalRoot: HTMLElement | null = null;
let onVerifiedCallback: (() => void) | null = null;

export function initTextileKycModal() {
  let container = document.getElementById('textile-kyc-modal-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'textile-kyc-modal-container';
    document.body.appendChild(container);
  }
  modalRoot = container;
}

export async function openTextileKycModal(onVerified?: () => void) {
  if (onVerified) {
    onVerifiedCallback = onVerified;
  }
  initTextileKycModal();
  await renderKycModal();
  const overlay = document.getElementById('textile-kyc-overlay');
  if (overlay) {
    overlay.classList.add('active');
  }
}

export function closeTextileKycModal() {
  const overlay = document.getElementById('textile-kyc-overlay');
  if (overlay) {
    overlay.classList.remove('active');
  }
}

async function renderKycModal() {
  if (!modalRoot) return;

  const state = miniPayService.getState();
  const walletAddress = state.address || '';
  const localProfile = walletAddress ? textileKycService.getLocalProfile(walletAddress) : null;
  const localKyc = walletAddress ? textileKycService.getLocalKycState(walletAddress) : null;

  modalRoot.innerHTML = `
    <div id="textile-kyc-overlay" class="modal-overlay">
      <div class="modal-card" style="max-height: 90vh; overflow-y: auto; display: flex; flex-direction: column; width: 100%; max-width: 440px;">
        <div class="modal-header" style="flex-shrink: 0; padding-bottom: 12px; border-bottom: 1px solid var(--border-subtle);">
          <div style="display: flex; align-items: center; gap: 8px;">
            <span style="font-size: 20px;">🛡️</span>
            <div>
              <h3 style="font-family: var(--font-display); font-size: 15px; margin: 0; font-weight: 700;">Identity Verification</h3>
              <span style="font-size: 11px; color: var(--text-muted);">Busha / Textile FX Compliance</span>
            </div>
          </div>
          <button class="btn-close-modal" id="btn-close-kyc-modal" style="cursor: pointer; background: transparent; border: none; font-size: 18px; color: var(--text-muted);">✕</button>
        </div>

        <div id="kyc-modal-body" style="padding: 16px 0;">
          <div style="text-align: center; padding: 24px 0;">
            <span class="pulse-dot"></span>
            <p style="margin-top: 10px; font-size: 13px; color: var(--text-secondary);">Loading compliance review state...</p>
          </div>
        </div>
      </div>
    </div>
  `;

  document.getElementById('btn-close-kyc-modal')?.addEventListener('click', closeTextileKycModal);

  // Fetch live review state from backend
  const bodyEl = document.getElementById('kyc-modal-body');
  if (!bodyEl) return;

  if (!walletAddress) {
    bodyEl.innerHTML = `
      <div style="text-align: center; padding: 20px 0;">
        <p style="color: #ef4444; font-size: 13px;">⚠️ Please connect your Web3 wallet or MiniPay first.</p>
      </div>
    `;
    return;
  }

  try {
    const res = await textileKycService.getKycStatus(walletAddress);
    const kyc = res.kyc;

    if (kyc?.state === 'verified') {
      renderVerifiedState(bodyEl, kyc);
      if (onVerifiedCallback) onVerifiedCallback();
    } else if (kyc?.state === 'pending') {
      renderPendingState(bodyEl, kyc, walletAddress);
    } else if (kyc?.state === 'rejected') {
      renderRejectedState(bodyEl, kyc, walletAddress, localProfile);
    } else {
      // Unverified or needs customer profile registration
      renderRegistrationForm(bodyEl, walletAddress, localProfile);
    }
  } catch (err: any) {
    // If status check fails, fallback to local state or registration form
    if (localKyc?.state === 'verified') {
      renderVerifiedState(bodyEl, localKyc);
    } else {
      renderRegistrationForm(bodyEl, walletAddress, localProfile);
    }
  }
}

function renderVerifiedState(container: HTMLElement, _kyc: TextileKycState) {
  container.innerHTML = `
    <div style="text-align: center; padding: 16px 0;">
      <div style="width: 56px; height: 56px; border-radius: 50%; background: rgba(16, 185, 129, 0.15); border: 2px solid var(--accent-emerald); display: flex; align-items: center; justify-content: center; margin: 0 auto 14px; font-size: 26px;">
        ✓
      </div>
      <h4 style="font-size: 16px; margin: 0 0 6px; color: var(--text-emerald); font-weight: 700;">Account Verified</h4>
      <p style="font-size: 12px; color: var(--text-secondary); line-height: 1.5; margin: 0 0 16px;">
        Your identity is verified with Busha / Textile. You have full access to Nigerian bank cashouts and cNGN purchases.
      </p>

      <div style="background: var(--bg-glass); border: 1px solid var(--border-subtle); border-radius: var(--radius-md); padding: 12px; margin-bottom: 20px; font-size: 12px; text-align: left;">
        <div style="display: flex; justify-content: space-between; margin-bottom: 6px;">
          <span style="color: var(--text-muted);">Review State:</span>
          <span style="color: var(--accent-emerald); font-weight: 600;">Verified (Level 1)</span>
        </div>
        <div style="display: flex; justify-content: space-between;">
          <span style="color: var(--text-muted);">Payout Rail:</span>
          <span style="color: var(--text-primary); font-weight: 500;">NIBSS / Instant NIP</span>
        </div>
      </div>

      <button type="button" class="btn btn-primary" id="btn-kyc-done" style="width: 100%;">
        Continue
      </button>
    </div>
  `;

  container.querySelector('#btn-kyc-done')?.addEventListener('click', () => {
    closeTextileKycModal();
    if (onVerifiedCallback) onVerifiedCallback();
  });
}

function renderPendingState(container: HTMLElement, _kyc: TextileKycState, _walletAddress: string) {
  container.innerHTML = `
    <div style="text-align: center; padding: 16px 0;">
      <div style="width: 56px; height: 56px; border-radius: 50%; background: rgba(245, 158, 11, 0.15); border: 2px solid #f59e0b; display: flex; align-items: center; justify-content: center; margin: 0 auto 14px; font-size: 24px;">
        ⏳
      </div>
      <h4 style="font-size: 16px; margin: 0 0 6px; color: #f59e0b; font-weight: 700;">Review in Progress</h4>
      <p style="font-size: 12px; color: var(--text-secondary); line-height: 1.5; margin: 0 0 16px;">
        Your identity documents have been submitted to Busha and are currently under compliance review. Reviews typically complete in 1 to 5 minutes.
      </p>

      <div style="background: var(--bg-glass); border: 1px solid var(--border-subtle); border-radius: var(--radius-md); padding: 12px; margin-bottom: 20px; font-size: 12px; text-align: left;">
        <div style="display: flex; justify-content: space-between; margin-bottom: 6px;">
          <span style="color: var(--text-muted);">Status:</span>
          <span style="color: #f59e0b; font-weight: 600;">Awaiting Review</span>
        </div>
        <div style="display: flex; justify-content: space-between;">
          <span style="color: var(--text-muted);">Provider:</span>
          <span style="color: var(--text-primary); font-weight: 500;">Busha / Sumsub</span>
        </div>
      </div>

      <div style="display: flex; gap: 10px;">
        <button type="button" class="btn btn-secondary" id="btn-refresh-kyc" style="flex: 1;">
          ↻ Check Status
        </button>
        <button type="button" class="btn btn-primary" id="btn-kyc-close" style="flex: 1;">
          Got it
        </button>
      </div>
    </div>
  `;

  container.querySelector('#btn-refresh-kyc')?.addEventListener('click', async () => {
    const btn = container.querySelector('#btn-refresh-kyc') as HTMLButtonElement;
    if (btn) btn.innerHTML = '↻ Checking...';
    await renderKycModal();
  });

  container.querySelector('#btn-kyc-close')?.addEventListener('click', closeTextileKycModal);
}

function renderRejectedState(
  container: HTMLElement,
  kyc: TextileKycState,
  walletAddress: string,
  localProfile: TextileCustomerProfile | null
) {
  const reasons = kyc.rejectionReasons?.length
    ? kyc.rejectionReasons.join('. ')
    : 'Identity verification could not be approved with provided documents.';

  container.innerHTML = `
    <div style="text-align: center; padding: 16px 0;">
      <div style="width: 56px; height: 56px; border-radius: 50%; background: rgba(239, 68, 68, 0.15); border: 2px solid #ef4444; display: flex; align-items: center; justify-content: center; margin: 0 auto 14px; font-size: 24px;">
        ✕
      </div>
      <h4 style="font-size: 16px; margin: 0 0 6px; color: #ef4444; font-weight: 700;">Verification Declined</h4>
      <p style="font-size: 12px; color: var(--text-secondary); line-height: 1.5; margin: 0 0 16px;">
        ${reasons}
      </p>

      <button type="button" class="btn btn-primary" id="btn-retry-kyc" style="width: 100%;">
        Re-Submit Identity Documents
      </button>
    </div>
  `;

  container.querySelector('#btn-retry-kyc')?.addEventListener('click', () => {
    renderRegistrationForm(container, walletAddress, localProfile);
  });
}

function renderRegistrationForm(
  container: HTMLElement,
  walletAddress: string,
  localProfile: TextileCustomerProfile | null
) {
  container.innerHTML = `
    <div>
      <div style="background: rgba(6, 182, 212, 0.08); border: 1px solid rgba(6, 182, 212, 0.25); border-radius: var(--radius-md); padding: 12px; margin-bottom: 16px; font-size: 12px; color: var(--text-secondary); line-height: 1.4;">
        <span style="font-weight: 700; color: var(--accent-cyan);">🇳🇬 One-Time Identity Verification</span><br />
        Busha & Textile require your legal name and residential address once to enable automated NGN bank payouts.
      </div>

      <!-- Quick Option: Hosted Sumsub Link -->
      <div style="margin-bottom: 16px; text-align: center;">
        <button type="button" class="btn btn-primary" id="btn-open-hosted-kyc" style="width: 100%; display: flex; align-items: center; justify-content: center; gap: 8px;">
          <span>⚡ Fast Verification (Camera / WebSDK)</span>
        </button>
        <span style="font-size: 11px; color: var(--text-muted); display: block; margin-top: 6px;">
          Opens secure Sumsub portal with camera ID scanning
        </span>
      </div>

      <div style="display: flex; align-items: center; gap: 10px; margin: 16px 0;">
        <div style="flex: 1; height: 1px; background: var(--border-subtle);"></div>
        <span style="font-size: 11px; color: var(--text-muted); font-weight: 600;">OR ENTER DETAILS</span>
        <div style="flex: 1; height: 1px; background: var(--border-subtle);"></div>
      </div>

      <form id="form-kyc-register">
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 12px;">
          <div class="form-group" style="margin-bottom: 0;">
            <label class="form-label" style="font-size: 11px;">First Name *</label>
            <input type="text" id="kyc-first-name" class="form-input" placeholder="e.g. Samson" required value="${localProfile?.firstName || ''}" />
          </div>
          <div class="form-group" style="margin-bottom: 0;">
            <label class="form-label" style="font-size: 11px;">Last Name *</label>
            <input type="text" id="kyc-last-name" class="form-input" placeholder="e.g. Micheal" required value="${localProfile?.lastName || ''}" />
          </div>
        </div>

        <div class="form-group" style="margin-bottom: 12px;">
          <label class="form-label" style="font-size: 11px;">Email Address *</label>
          <input type="email" id="kyc-email" class="form-input" placeholder="e.g. user@example.com" required value="${localProfile?.email || ''}" />
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 12px;">
          <div class="form-group" style="margin-bottom: 0;">
            <label class="form-label" style="font-size: 11px;">Phone Number *</label>
            <input type="tel" id="kyc-phone" class="form-input" placeholder="+234..." required value="${localProfile?.phone || ''}" />
          </div>
          <div class="form-group" style="margin-bottom: 0;">
            <label class="form-label" style="font-size: 11px;">Date of Birth (dd-mm-yyyy) *</label>
            <input type="text" id="kyc-dob" class="form-input" placeholder="14-02-1995" pattern="\\d{2}-\\d{2}-\\d{4}" required value="${localProfile?.birthDate || ''}" />
          </div>
        </div>

        <div class="form-group" style="margin-bottom: 12px;">
          <label class="form-label" style="font-size: 11px;">Street Address *</label>
          <input type="text" id="kyc-address-line1" class="form-input" placeholder="Street name and number" required value="${localProfile?.address?.line1 || ''}" />
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 16px;">
          <div class="form-group" style="margin-bottom: 0;">
            <label class="form-label" style="font-size: 11px;">City / State *</label>
            <input type="text" id="kyc-city" class="form-input" placeholder="Abuja" required value="${localProfile?.address?.city || 'Abuja'}" />
          </div>
          <div class="form-group" style="margin-bottom: 0;">
            <label class="form-label" style="font-size: 11px;">Postal Code</label>
            <input type="text" id="kyc-postal" class="form-input" placeholder="900001" value="${localProfile?.address?.postalCode || '900001'}" />
          </div>
        </div>

        <div style="margin-bottom: 16px; font-size: 11px; color: var(--text-muted); display: flex; align-items: flex-start; gap: 6px;">
          <input type="checkbox" id="kyc-terms" required checked style="margin-top: 2px;" />
          <label for="kyc-terms">
            I confirm provided details are accurate and accept Busha / Textile Ramp terms of service for fiat disbursement.
          </label>
        </div>

        <div id="kyc-error-msg" style="display: none; color: #ef4444; font-size: 12px; margin-bottom: 12px;"></div>

        <button type="submit" class="btn btn-secondary" id="btn-submit-kyc-profile" style="width: 100%;">
          Save Profile & Continue
        </button>
      </form>
    </div>
  `;

  // Handle Hosted Verification Button Click
  container.querySelector('#btn-open-hosted-kyc')?.addEventListener('click', async () => {
    const btn = container.querySelector('#btn-open-hosted-kyc') as HTMLButtonElement;
    btn.disabled = true;
    btn.innerHTML = '<span>⚡ Opening Portal...</span>';

    try {
      // First ensure profile exists if filled
      const firstName = (container.querySelector('#kyc-first-name') as HTMLInputElement)?.value.trim();
      const lastName = (container.querySelector('#kyc-last-name') as HTMLInputElement)?.value.trim();
      const email = (container.querySelector('#kyc-email') as HTMLInputElement)?.value.trim();
      const phone = (container.querySelector('#kyc-phone') as HTMLInputElement)?.value.trim();
      const birthDate = (container.querySelector('#kyc-dob') as HTMLInputElement)?.value.trim();
      const line1 = (container.querySelector('#kyc-address-line1') as HTMLInputElement)?.value.trim();
      const city = (container.querySelector('#kyc-city') as HTMLInputElement)?.value.trim();
      const postalCode = (container.querySelector('#kyc-postal') as HTMLInputElement)?.value.trim();

      if (firstName && lastName && email && phone) {
        await textileKycService.registerCustomer({
          firstName,
          lastName,
          email,
          phone,
          birthDate: birthDate || '14-02-1995',
          address: {
            line1: line1 || '12 Central District',
            city: city || 'Abuja',
            state: city || 'Abuja',
            postalCode: postalCode || '900001',
          },
        }, walletAddress);
      }

      const res = await textileKycService.getHostedVerificationLink(walletAddress);
      if (res.status === 'ok' && res.url) {
        window.open(res.url, '_blank');
        renderPendingState(container, {
          state: 'pending',
          providerStatus: 'awaiting_review',
          rejectionReasons: [],
          requirementsDue: [],
          level: '1',
          canDeposit: false,
        }, walletAddress);
      } else {
        alert(res.error || 'Please fill in your basic profile details first.');
        btn.disabled = false;
        btn.innerHTML = '<span>⚡ Fast Verification (Camera / WebSDK)</span>';
      }
    } catch (err: any) {
      alert(err.message || 'Could not open verification portal.');
      btn.disabled = false;
      btn.innerHTML = '<span>⚡ Fast Verification (Camera / WebSDK)</span>';
    }
  });

  // Handle Form Submission
  const form = container.querySelector('#form-kyc-register') as HTMLFormElement;
  form?.addEventListener('submit', async (e) => {
    e.preventDefault();

    const firstName = (container.querySelector('#kyc-first-name') as HTMLInputElement).value.trim();
    const lastName = (container.querySelector('#kyc-last-name') as HTMLInputElement).value.trim();
    const email = (container.querySelector('#kyc-email') as HTMLInputElement).value.trim();
    const phone = (container.querySelector('#kyc-phone') as HTMLInputElement).value.trim();
    const birthDate = (container.querySelector('#kyc-dob') as HTMLInputElement).value.trim();
    const line1 = (container.querySelector('#kyc-address-line1') as HTMLInputElement).value.trim();
    const city = (container.querySelector('#kyc-city') as HTMLInputElement).value.trim();
    const postalCode = (container.querySelector('#kyc-postal') as HTMLInputElement).value.trim();

    const submitBtn = container.querySelector('#btn-submit-kyc-profile') as HTMLButtonElement;
    const errorEl = container.querySelector('#kyc-error-msg') as HTMLElement;
    errorEl.style.display = 'none';

    submitBtn.disabled = true;
    submitBtn.innerHTML = '<span>⏳ Signing & Registering Profile...</span>';

    try {
      const profile: TextileCustomerProfile = {
        firstName,
        lastName,
        email,
        phone,
        birthDate,
        address: {
          line1,
          city,
          state: city,
          postalCode: postalCode || '900001',
        },
      };

      const regRes = await textileKycService.registerCustomer(profile, walletAddress);
      if (regRes.status !== 'ok') {
        throw new Error(regRes.error || 'Failed to register customer profile.');
      }

      // Customer registered successfully! Now offer hosted Sumsub verification link
      const linkRes = await textileKycService.getHostedVerificationLink(walletAddress);
      if (linkRes.status === 'ok' && linkRes.url) {
        window.open(linkRes.url, '_blank');
      }

      renderPendingState(container, {
        state: 'pending',
        providerStatus: 'awaiting_review',
        rejectionReasons: [],
        requirementsDue: [],
        level: '1',
        canDeposit: false,
      }, walletAddress);
    } catch (err: any) {
      submitBtn.disabled = false;
      submitBtn.innerHTML = '<span>Save Profile & Continue</span>';
      errorEl.textContent = `❌ ${err.message || 'Could not complete registration.'}`;
      errorEl.style.display = 'block';
    }
  });
}
