/**
 * Sivan In-App Confirmation & Input Modal Component
 * Replaces native browser alert/confirm/prompt with rich themed UI.
 */

export interface ConfirmModalOptions {
  title: string;
  subtitle?: string;
  message: string;
  badgeText?: string;
  badgeColor?: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'primary' | 'warning';
}

export interface PromptModalOptions {
  title: string;
  subtitle?: string;
  placeholder?: string;
  defaultValue?: string;
  multiline?: boolean;
  confirmText?: string;
  cancelText?: string;
}

let activeOverlay: HTMLElement | null = null;

function getOrCreateContainer(): HTMLElement {
  let container = document.getElementById('sivan-modal-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'sivan-modal-container';
    document.body.appendChild(container);
  }
  return container;
}

function cleanupModal() {
  if (activeOverlay && activeOverlay.parentNode) {
    activeOverlay.parentNode.removeChild(activeOverlay);
    activeOverlay = null;
  }
}

export function showConfirmModal(options: ConfirmModalOptions): Promise<boolean> {
  return new Promise((resolve) => {
    cleanupModal();
    const container = getOrCreateContainer();

    const overlay = document.createElement('div');
    overlay.className = 'sivan-custom-overlay';
    activeOverlay = overlay;

    const confirmBg = options.variant === 'danger' 
      ? 'linear-gradient(135deg, #ef4444, #dc2626)' 
      : options.variant === 'warning'
      ? 'linear-gradient(135deg, #f59e0b, #d97706)'
      : 'linear-gradient(135deg, #06b6d4, #3b82f6)';
    
    const confirmColor = '#ffffff';

    overlay.innerHTML = `
      <div class="sivan-custom-modal" role="dialog" aria-modal="true">
        <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px;">
          <div>
            <h3 style="font-size: 18px; font-weight: 700; color: #f8fafc; margin: 0 0 4px 0;">${options.title}</h3>
            ${options.subtitle ? `<p style="font-size: 13px; color: #94a3b8; margin: 0;">${options.subtitle}</p>` : ''}
          </div>
          ${options.badgeText ? `
            <span style="font-size: 11px; font-weight: 700; padding: 4px 8px; border-radius: 6px; background: ${options.badgeColor || 'rgba(239, 68, 68, 0.2)'}; color: #fca5a5; border: 1px solid rgba(239, 68, 68, 0.4);">
              ${options.badgeText}
            </span>
          ` : ''}
        </div>

        <div style="background: rgba(15, 23, 42, 0.6); border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 12px; padding: 14px; margin-bottom: 20px;">
          <p style="font-size: 13.5px; color: #cbd5e1; line-height: 1.5; margin: 0;">${options.message}</p>
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
          <button type="button" id="modal-btn-cancel" class="sivan-modal-btn sivan-modal-btn-secondary">
            ${options.cancelText || 'Cancel'}
          </button>
          <button type="button" id="modal-btn-confirm" class="sivan-modal-btn" style="background: ${confirmBg}; color: ${confirmColor};">
            ${options.confirmText || 'Confirm'}
          </button>
        </div>
      </div>
    `;

    container.appendChild(overlay);

    // Fade in
    requestAnimationFrame(() => {
      overlay.classList.add('active');
    });

    const btnCancel = overlay.querySelector('#modal-btn-cancel') as HTMLButtonElement;
    const btnConfirm = overlay.querySelector('#modal-btn-confirm') as HTMLButtonElement;

    const handleAction = (val: boolean) => {
      overlay.classList.remove('active');
      setTimeout(() => {
        cleanupModal();
        resolve(val);
      }, 200);
    };

    btnCancel?.addEventListener('click', () => handleAction(false));
    btnConfirm?.addEventListener('click', () => handleAction(true));
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) handleAction(false);
    });
  });
}

export function showPromptModal(options: PromptModalOptions): Promise<string | null> {
  return new Promise((resolve) => {
    cleanupModal();
    const container = getOrCreateContainer();

    const overlay = document.createElement('div');
    overlay.className = 'sivan-custom-overlay';
    activeOverlay = overlay;

    overlay.innerHTML = `
      <div class="sivan-custom-modal" role="dialog" aria-modal="true">
        <div style="margin-bottom: 14px;">
          <h3 style="font-size: 18px; font-weight: 700; color: #f8fafc; margin: 0 0 4px 0;">${options.title}</h3>
          ${options.subtitle ? `<p style="font-size: 13px; color: #94a3b8; margin: 0;">${options.subtitle}</p>` : ''}
        </div>

        <div style="margin-bottom: 18px;">
          ${options.multiline ? `
            <textarea 
              id="modal-prompt-input" 
              class="sivan-modal-input" 
              rows="3" 
              placeholder="${options.placeholder || ''}"
              style="width: 100%; box-sizing: border-box; resize: vertical;"
            >${options.defaultValue || ''}</textarea>
          ` : `
            <input 
              type="text" 
              id="modal-prompt-input" 
              class="sivan-modal-input" 
              placeholder="${options.placeholder || ''}" 
              value="${options.defaultValue || ''}"
              style="width: 100%; box-sizing: border-box;"
            />
          `}
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
          <button type="button" id="modal-btn-cancel" class="sivan-modal-btn sivan-modal-btn-secondary">
            ${options.cancelText || 'Cancel'}
          </button>
          <button type="button" id="modal-btn-confirm" class="sivan-modal-btn sivan-modal-btn-primary">
            ${options.confirmText || 'Submit'}
          </button>
        </div>
      </div>
    `;

    container.appendChild(overlay);

    requestAnimationFrame(() => {
      overlay.classList.add('active');
      const inputEl = overlay.querySelector('#modal-prompt-input') as HTMLInputElement | HTMLTextAreaElement;
      inputEl?.focus();
    });

    const btnCancel = overlay.querySelector('#modal-btn-cancel') as HTMLButtonElement;
    const btnConfirm = overlay.querySelector('#modal-btn-confirm') as HTMLButtonElement;
    const inputEl = overlay.querySelector('#modal-prompt-input') as HTMLInputElement | HTMLTextAreaElement;

    const handleAction = (submitted: boolean) => {
      const val = submitted ? (inputEl?.value.trim() || '') : null;
      overlay.classList.remove('active');
      setTimeout(() => {
        cleanupModal();
        resolve(val);
      }, 200);
    };

    btnCancel?.addEventListener('click', () => handleAction(false));
    btnConfirm?.addEventListener('click', () => handleAction(true));
    inputEl?.addEventListener('keydown', (e: Event) => {
      const kb = e as KeyboardEvent;
      if (kb.key === 'Enter' && !options.multiline) {
        e.preventDefault();
        handleAction(true);
      } else if (kb.key === 'Escape') {
        handleAction(false);
      }
    });
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) handleAction(false);
    });
  });
}
