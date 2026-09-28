import { identityService } from '../services/identity.service';
import { miniPayService } from '../services/minipay.service';
import { openClaimHandleModal } from './ClaimHandleModal';
import { getTagIconSvg } from '../utils/ui-icons';

const DISMISSED_KEY = 'sivan_handle_nudge_dismissed_at';

/**
 * Returns true if the user dismissed the nudge in the last 24 hours.
 */
function isDismissed(): boolean {
  try {
    const ts = localStorage.getItem(DISMISSED_KEY);
    if (!ts) return false;
    return Date.now() - Number(ts) < 24 * 60 * 60 * 1000;
  } catch {
    return false;
  }
}

function markDismissed() {
  try {
    localStorage.setItem(DISMISSED_KEY, String(Date.now()));
  } catch {}
}

/**
 * Injects a slim, animated "Claim your @handle" nudge banner just before
 * `insertBefore` element (or at the top of `container` if omitted).
 *
 * The nudge is a no-op if:
 *  - The user already has a saved username, OR
 *  - The wallet is not connected, OR
 *  - The user dismissed the nudge within the last 24 h.
 *
 * Returns the injected HTMLElement (or null if skipped).
 */
export function injectClaimHandleNudge(
  container: HTMLElement,
  options: {
    insertBefore?: HTMLElement | null;
    onToast?: (msg: string) => void;
    onClaimed?: (username: string) => void;
  } = {}
): HTMLElement | null {
  const { onToast, onClaimed, insertBefore } = options;

  // Skip if already has handle, not connected, or recently dismissed
  if (identityService.getSavedUsername()) return null;
  const state = miniPayService.getState();
  if (!state.address) return null;
  if (isDismissed()) return null;

  const nudge = document.createElement('div');
  nudge.id = 'claim-handle-nudge';
  nudge.style.cssText = `
    display: flex;
    align-items: center;
    gap: 12px;
    background: linear-gradient(135deg, rgba(52,211,153,0.09), rgba(16,185,129,0.04));
    border: 1px solid rgba(52,211,153,0.28);
    border-radius: 14px;
    padding: 11px 14px;
    margin-bottom: 16px;
    animation: nudgeSlideIn 0.35s cubic-bezier(0.34,1.4,0.64,1);
    position: relative;
    overflow: hidden;
  `;

  nudge.innerHTML = `
    <style>
      @keyframes nudgeSlideIn {
        from { opacity: 0; transform: translateY(-10px) scaleY(0.9); }
        to   { opacity: 1; transform: translateY(0) scaleY(1); }
      }
      @keyframes nudgeSlideOut {
        to { opacity: 0; transform: translateY(-8px) scaleY(0.9); max-height: 0; margin-bottom: 0; padding: 0; }
      }
      #claim-handle-nudge::before {
        content: '';
        position: absolute;
        left: 0; top: 0; bottom: 0;
        width: 3px;
        background: linear-gradient(to bottom, #34d399, #10b981);
        border-radius: 3px 0 0 3px;
      }
    </style>

    <!-- Icon -->
    <div style="
      flex-shrink: 0;
      width: 36px; height: 36px;
      background: rgba(52,211,153,0.12);
      border: 1px solid rgba(52,211,153,0.25);
      border-radius: 10px;
      display: flex; align-items: center; justify-content: center;
      color: var(--accent-emerald);
    ">${getTagIconSvg(18, 'var(--accent-emerald)')}</div>

    <!-- Text -->
    <div style="flex: 1; min-width: 0;">
      <div style="
        font-size: 12.5px; font-weight: 700;
        color: #34d399;
        margin-bottom: 2px;
        letter-spacing: 0.2px;
      ">You don't have a @handle yet</div>
      <div style="
        font-size: 11px; color: var(--text-muted, #8892a4);
        line-height: 1.4;
        white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
      ">Claim one so others can send you deals by name</div>
    </div>

    <!-- CTA -->
    <button id="nudge-btn-claim" style="
      flex-shrink: 0;
      background: linear-gradient(135deg, #10b981, #34d399);
      border: none;
      border-radius: 10px;
      color: #fff;
      font-size: 11.5px;
      font-weight: 700;
      padding: 7px 13px;
      cursor: pointer;
      white-space: nowrap;
      transition: opacity 0.15s;
    ">+ Claim</button>

    <!-- Dismiss -->
    <button id="nudge-btn-dismiss" title="Dismiss" style="
      flex-shrink: 0;
      background: none;
      border: none;
      color: var(--text-muted, #8892a4);
      font-size: 14px;
      cursor: pointer;
      padding: 2px;
      line-height: 1;
      opacity: 0.6;
      transition: opacity 0.15s;
    ">✕</button>
  `;

  // Animate out + remove helper
  const animateOut = () => {
    nudge.style.animation = 'nudgeSlideOut 0.25s ease forwards';
    setTimeout(() => nudge.remove(), 260);
  };

  nudge.querySelector('#nudge-btn-dismiss')?.addEventListener('click', () => {
    markDismissed();
    animateOut();
  });

  nudge.querySelector('#nudge-btn-claim')?.addEventListener('click', async () => {
    const username = await openClaimHandleModal({
      walletAddress: state.address || '',
      onSuccess: (claimed: string) => {
        animateOut();
        if (onClaimed) onClaimed(claimed);
      },
      onToast
    });
    if (!username) return; // dismissed without claiming
  });

  // Insert before target or prepend
  if (insertBefore && insertBefore.parentElement === container) {
    container.insertBefore(nudge, insertBefore);
  } else {
    container.prepend(nudge);
  }

  return nudge;
}
