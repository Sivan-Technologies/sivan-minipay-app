import { identityService } from '../services/identity.service';

const MODAL_ID = 'sivan-claim-handle-modal';
let _resolvePromise: ((username: string | null) => void) | null = null;
let _debounceTimer: any = null;

/**
 * Opens the styled Claim @handle modal.
 * Returns the claimed username (e.g. "@soliame") or null if dismissed.
 */
export function openClaimHandleModal(
  walletAddress: string,
  onSuccess?: (username: string) => void,
  onToast?: (msg: string) => void
): Promise<string | null> {
  // Destroy any existing instance
  document.getElementById(MODAL_ID)?.remove();

  return new Promise((resolve) => {
    _resolvePromise = resolve;

    const overlay = document.createElement('div');
    overlay.id = MODAL_ID;
    overlay.style.cssText = `
      position: fixed; inset: 0; z-index: 9999;
      background: rgba(0,0,0,0.65);
      backdrop-filter: blur(6px);
      display: flex; align-items: flex-end; justify-content: center;
      animation: fadeInOverlay 0.2s ease;
    `;

    overlay.innerHTML = `
      <style>
        @keyframes slideUpModal {
          from { transform: translateY(100%); opacity: 0; }
          to   { transform: translateY(0);   opacity: 1; }
        }
        @keyframes fadeInOverlay {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        #claim-handle-card {
          width: 100%;
          max-width: 480px;
          background: var(--bg-card, #16213e);
          border-top-left-radius: 20px;
          border-top-right-radius: 20px;
          padding: 28px 24px 36px;
          animation: slideUpModal 0.28s cubic-bezier(0.34,1.4,0.64,1);
          position: relative;
        }
        #claim-handle-input {
          width: 100%;
          box-sizing: border-box;
          background: rgba(255,255,255,0.06);
          border: 1.5px solid rgba(255,255,255,0.12);
          border-radius: 12px;
          color: #fff;
          font-size: 15px;
          font-family: 'Inter', monospace;
          font-weight: 600;
          padding: 13px 16px;
          outline: none;
          transition: border-color 0.2s;
          letter-spacing: 0.3px;
        }
        #claim-handle-input:focus {
          border-color: var(--accent-emerald, #34d399);
        }
        #claim-handle-input.error {
          border-color: #ef4444;
        }
        #claim-handle-input.success {
          border-color: #34d399;
        }
        #btn-claim-submit {
          width: 100%;
          background: linear-gradient(135deg, #10b981, #34d399);
          border: none;
          border-radius: 12px;
          color: #fff;
          font-size: 14px;
          font-weight: 700;
          padding: 14px;
          cursor: pointer;
          margin-top: 14px;
          letter-spacing: 0.3px;
          transition: opacity 0.2s, transform 0.1s;
        }
        #btn-claim-submit:disabled {
          opacity: 0.45;
          cursor: not-allowed;
        }
        #btn-claim-submit:not(:disabled):active {
          transform: scale(0.98);
        }
        #btn-claim-close {
          position: absolute;
          top: 16px; right: 20px;
          background: rgba(255,255,255,0.08);
          border: none;
          border-radius: 50%;
          color: #aaa;
          width: 28px; height: 28px;
          font-size: 14px;
          cursor: pointer;
          display: flex; align-items: center; justify-content: center;
          transition: background 0.15s;
        }
        #btn-claim-close:hover { background: rgba(255,255,255,0.14); }
        #claim-handle-availability {
          min-height: 20px;
          font-size: 11.5px;
          margin-top: 7px;
          display: flex;
          align-items: center;
          gap: 5px;
          transition: opacity 0.2s;
        }
      </style>

      <div id="claim-handle-card">
        <button id="btn-claim-close" title="Dismiss">✕</button>

        <!-- Icon + heading -->
        <div style="text-align: center; margin-bottom: 22px;">
          <div style="
            width: 52px; height: 52px;
            background: linear-gradient(135deg, rgba(52,211,153,0.18), rgba(16,185,129,0.08));
            border: 1.5px solid rgba(52,211,153,0.3);
            border-radius: 16px;
            display: inline-flex; align-items: center; justify-content: center;
            font-size: 24px;
            margin-bottom: 14px;
          ">🏷️</div>
          <h3 style="
            font-family: var(--font-display,'Inter'); font-size: 18px;
            font-weight: 700; color: #fff; margin: 0 0 6px;
          ">Claim Your @handle</h3>
          <p style="font-size: 12.5px; color: var(--text-muted,#8892a4); margin: 0; line-height: 1.5; max-width: 300px; display: inline-block;">
            Your handle lets others send deals and payments directly to you by name — no wallet address needed.
          </p>
        </div>

        <!-- Why it matters strip -->
        <div style="
          display: flex; gap: 8px; margin-bottom: 20px;
        ">
          ${[
            ['📨', 'Receive deals by name'],
            ['🔗', 'Share a link, not an address'],
            ['✅', 'Appears on your deal cards'],
          ].map(([icon, label]) => `
            <div style="
              flex: 1;
              background: rgba(52,211,153,0.07);
              border: 1px solid rgba(52,211,153,0.15);
              border-radius: 10px;
              padding: 8px 6px;
              text-align: center;
              font-size: 10.5px;
              color: var(--text-secondary,#c4ccd8);
              line-height: 1.4;
            ">
              <div style="font-size: 16px; margin-bottom: 4px;">${icon}</div>
              <div>${label}</div>
            </div>
          `).join('')}
        </div>

        <!-- Input -->
        <div style="position: relative;">
          <span style="
            position: absolute; left: 14px; top: 50%; transform: translateY(-50%);
            color: var(--accent-emerald, #34d399);
            font-weight: 700; font-size: 15px; pointer-events: none;
            line-height: 1;
          ">@</span>
          <input
            id="claim-handle-input"
            type="text"
            autocomplete="off"
            autocorrect="off"
            autocapitalize="off"
            spellcheck="false"
            maxlength="30"
            placeholder="yourname"
            style="padding-left: 30px;"
          />
        </div>

        <!-- Availability feedback -->
        <div id="claim-handle-availability"></div>

        <!-- CTA -->
        <button id="btn-claim-submit" disabled>Claim @handle</button>

        <!-- Skip link -->
        <div style="text-align: center; margin-top: 14px;">
          <button id="btn-claim-skip" style="
            background: none; border: none; color: var(--text-muted,#8892a4);
            font-size: 12px; cursor: pointer; text-decoration: underline;
            opacity: 0.7;
          ">Skip for now</button>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);

    const input = overlay.querySelector('#claim-handle-input') as HTMLInputElement;
    const submitBtn = overlay.querySelector('#btn-claim-submit') as HTMLButtonElement;
    const availabilityEl = overlay.querySelector('#claim-handle-availability') as HTMLElement;
    const closeBtn = overlay.querySelector('#btn-claim-close') as HTMLButtonElement;
    const skipBtn = overlay.querySelector('#btn-claim-skip') as HTMLButtonElement;

    const dismiss = () => {
      overlay.remove();
      if (_resolvePromise) {
        _resolvePromise(null);
        _resolvePromise = null;
      }
    };

    closeBtn.addEventListener('click', dismiss);
    skipBtn.addEventListener('click', dismiss);

    // Dismiss on overlay click (not card click)
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) dismiss();
    });

    // Availability state
    let currentAvailability: 'idle' | 'checking' | 'available' | 'taken' | 'invalid' = 'idle';

    const setAvailability = (state: typeof currentAvailability, message = '') => {
      currentAvailability = state;
      const colors: Record<string, string> = {
        idle: '#8892a4',
        checking: '#8892a4',
        available: '#34d399',
        taken: '#ef4444',
        invalid: '#f59e0b',
      };
      const icons: Record<string, string> = {
        idle: '',
        checking: '⏳',
        available: '✓',
        taken: '✗',
        invalid: '⚠',
      };
      availabilityEl.innerHTML = message
        ? `<span style="color:${colors[state]}">${icons[state]} ${message}</span>`
        : '';

      input.classList.remove('error', 'success');
      if (state === 'available') input.classList.add('success');
      if (state === 'taken' || state === 'invalid') input.classList.add('error');

      submitBtn.disabled = state !== 'available';
    };

    input.addEventListener('input', () => {
      const raw = input.value.replace(/^@+/, '').toLowerCase().replace(/[^a-z0-9_.-]/g, '');
      if (input.value !== raw) input.value = raw; // sanitize in-place

      if (raw.length === 0) {
        setAvailability('idle');
        return;
      }
      if (raw.length < 3) {
        setAvailability('invalid', 'Min 3 characters');
        return;
      }

      setAvailability('checking', 'Checking availability...');
      clearTimeout(_debounceTimer);
      _debounceTimer = setTimeout(async () => {
        const result = await identityService.checkAvailability(raw);
        if (result.ownerIsCurrentUser) {
          setAvailability('available', `@${raw} is already yours`);
        } else if (result.available && !result.reserved) {
          setAvailability('available', `@${raw} is available`);
        } else {
          setAvailability('taken', `@${raw} is already taken`);
        }
      }, 500);
    });

    submitBtn.addEventListener('click', async () => {
      const raw = input.value.replace(/^@+/, '').toLowerCase().trim();
      if (!raw || currentAvailability !== 'available') return;

      submitBtn.disabled = true;
      submitBtn.textContent = 'Claiming...';

      const result = await identityService.claimUsername(raw, walletAddress);
      if (result.success && result.username) {
        overlay.remove();
        if (onToast) onToast(`🎉 Sivan handle claimed: ${result.username}`);
        if (onSuccess) onSuccess(result.username);
        if (_resolvePromise) {
          _resolvePromise(result.username);
          _resolvePromise = null;
        }
      } else {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Claim @handle';
        setAvailability('taken', result.error || 'Could not claim. Try another handle.');
      }
    });

    // Auto-focus
    setTimeout(() => input.focus(), 300);
  });
}
