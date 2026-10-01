import { agreementsService } from '../services/agreements.service';
import { agreementFeeService } from '../services/agreement-fee.service';
import { miniPayService } from '../services/minipay.service';
import { fetchTokenBalances } from '../services/celo-client';
import { CELO_CONFIG, type SupportedTokenSymbol } from '../config/celo.config';
import { getTokenIconSvg } from '../utils/token-icons';
import { openShareModal } from './ShareAgreementModal';
import { identityService } from '../services/identity.service';
import { DELIVERY_DEADLINE_PRESETS } from '../utils/deadline';
import { injectClaimHandleNudge } from './ClaimHandleNudge';
import { getTagIconSvg, getLockIconSvg, getSearchIconSvg, getCheckCircleSvg } from '../utils/ui-icons';

export async function renderCreateAgreement(
  container: HTMLElement,
  onNavigate: (tab: string) => void,
  showToast: (msg: string) => void
) {
  const state = miniPayService.getState();
  const balances = await fetchTokenBalances(state.address);

  container.innerHTML = `
    <!-- Premium Page Header -->
    <div class="ca-page-header">
      <div class="ca-header-left">
        <button type="button" class="ca-back-btn" id="btn-cancel-create">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="15 18 9 12 15 6"></polyline>
          </svg>
        </button>
        <div>
          <h2 class="ca-page-title">New Service Agreement</h2>
          <p class="ca-page-subtitle">Lock client funds before work begins</p>
        </div>
      </div>
      <div class="ca-header-badge">
        <span class="ca-live-dot"></span>
        <span>Celo Mainnet</span>
      </div>
    </div>

    <form id="form-create-deal" class="ca-form">

      <!-- Step 1: Deal Title -->
      <div class="ca-field-card">
        <div class="ca-step-row">
          <span class="ca-step-num">1</span>
          <label class="ca-field-label" for="deal-title">Deal Title</label>
        </div>
        <input 
          type="text" 
          id="deal-title" 
          class="ca-input" 
          placeholder="e.g. Mobile App UI Design or Smart Contract Review" 
          required 
        />
      </div>

      <!-- Step 2: Contractor -->
      <div class="ca-field-card">
        <div class="ca-step-row">
          <span class="ca-step-num">2</span>
          <label class="ca-field-label" for="deal-contractor">Contractor</label>
        </div>
        <input 
          type="text" 
          id="deal-contractor" 
          class="ca-input" 
          placeholder="Phone, @username, or Celo 0x address" 
          required 
        />
        <div id="contractor-resolution-badge" class="ca-resolution-badge" style="display: none;"></div>
        <p class="ca-field-hint">Phone number, Telegram handle, or Celo wallet address</p>
      </div>

      <!-- Step 3: Token + Amount -->
      <div class="ca-field-card">
        <div class="ca-step-row">
          <span class="ca-step-num">3</span>
          <label class="ca-field-label">Payment</label>
        </div>
        <div class="ca-payment-row">
          <!-- Stablecoin Selector -->
          <div class="ca-token-col">
            <div class="custom-select-wrap" id="deal-currency-wrap">
              <div class="custom-select-trigger ca-token-trigger" id="deal-currency-trigger">
                <span id="deal-currency-display" style="display: inline-flex; align-items: center; gap: 6px; font-weight: 700;">${getTokenIconSvg('USDC', 16)} <span>USDC</span></span>
                <span class="chevron">▾</span>
              </div>
              <div class="custom-select-menu" id="deal-currency-menu">
                <div class="custom-select-item selected" data-value="USDC" style="display: flex; align-items: center; gap: 8px;">
                  ${getTokenIconSvg('USDC', 16)} <span>USDC (Celo)</span>
                </div>
                <div class="custom-select-item" data-value="USDT" style="display: flex; align-items: center; gap: 8px;">
                  ${getTokenIconSvg('USDT', 16)} <span>USDT (Celo)</span>
                </div>
                <div class="custom-select-item" data-value="cUSD" style="display: flex; align-items: center; gap: 8px;">
                  ${getTokenIconSvg('cUSD', 16)} <span>USDm (Celo)</span>
                </div>
              </div>
              <input type="hidden" id="deal-currency" value="USDC" />
            </div>
          </div>
          <!-- Amount -->
          <div class="ca-amount-col">
            <input 
              type="number" 
              id="deal-amount" 
              class="ca-input ca-amount-input" 
              placeholder="0.00" 
              min="0.01" 
              step="any" 
              required 
            />
          </div>
        </div>
        <!-- Live Balance Pill -->
        <div class="ca-balance-pill" id="avail-bal-note">
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="opacity:0.7"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
          <span>Available: Loading...</span>
        </div>
      </div>

      <!-- Step 4: Deadline -->
      <div class="ca-field-card">
        <div class="ca-step-row">
          <span class="ca-step-num">4</span>
          <label class="ca-field-label">Delivery Deadline</label>
        </div>
        <input type="hidden" id="deal-deadline" value="48">
        <div class="custom-select-wrap" id="deadline-select-wrap">
          <div class="custom-select-trigger ca-deadline-trigger" id="deadline-select-trigger">
            <span id="deadline-display" style="display: flex; align-items: center; gap: 8px; font-size: 14px;">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" style="opacity:0.6"><path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zm4.24 16L11 13V7h1.5v5.25l4.5 2.67-1.01 1.66z"/></svg>
              48 Hours (2 Days)
            </span>
            <span class="chevron">▾</span>
          </div>
          <div class="custom-select-menu" id="deadline-select-menu">
            ${DELIVERY_DEADLINE_PRESETS.map(preset => `
              <div class="custom-select-item ${preset.hours === 48 ? 'selected' : ''}" data-hours="${preset.hours}" data-label="${preset.label}" style="display: flex; align-items: center; gap: 8px;">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" style="opacity:0.6;flex-shrink:0"><path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zm4.24 16L11 13V7h1.5v5.25l4.5 2.67-1.01 1.66z"/></svg>
                <span>${preset.label}</span>
              </div>
            `).join('')}
          </div>
        </div>
      </div>

      <!-- Step 5: Scope -->
      <div class="ca-field-card">
        <div class="ca-step-row">
          <span class="ca-step-num">5</span>
          <label class="ca-field-label" for="deal-desc">Deliverable Scope & Criteria</label>
        </div>
        <textarea 
          id="deal-desc" 
          class="ca-input ca-textarea" 
          placeholder="Describe deliverables and the verification criteria that must be met before funds are released..." 
          required
        ></textarea>
      </div>

      <!-- Live Fee Summary Card -->
      <div class="ca-summary-card" id="calc-box">
        <div class="ca-summary-title">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline></svg>
          Live Fee Breakdown
        </div>
        <div class="ca-summary-rows">
          <div class="ca-summary-row">
            <span class="ca-summary-label">Gross Agreement Value</span>
            <span class="ca-summary-val" id="calc-gross">0.00 USDC</span>
          </div>
          <div class="ca-summary-row">
            <span class="ca-summary-label" id="calc-fee-label">Sivan Platform Fee</span>
            <span class="ca-summary-val ca-summary-fee" id="calc-fee">0.00 USDC</span>
          </div>
          <div class="ca-summary-divider"></div>
          <div class="ca-summary-row ca-summary-net-row">
            <span class="ca-summary-net-label">Net Contractor Payout</span>
            <span class="ca-summary-net-val" id="calc-net">0.00 USDC</span>
          </div>
        </div>
        <div class="ca-attribution-row">
          ${getTagIconSvg(12, 'var(--text-muted)')}
          <span>Attribution:</span>
          <code class="ca-attr-tag">${CELO_CONFIG.attributionTag}</code>
        </div>
      </div>

      <!-- Primary CTA -->
      <button type="submit" class="ca-submit-btn" id="btn-submit-deal">
        <div class="ca-submit-icon">
          ${getLockIconSvg(16, '#ffffff')}
        </div>
        <div class="ca-submit-text">
          <span class="ca-submit-main">Fund & Lock Deal</span>
          <span class="ca-submit-sub">Celo Mainnet · Instant On-Chain</span>
        </div>
        <svg class="ca-submit-arrow" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <line x1="5" y1="12" x2="19" y2="12"></line>
          <polyline points="12 5 19 12 12 19"></polyline>
        </svg>
      </button>

    </form>
  `;

  // Inject @handle nudge banner before the form for users without a handle
  const formEl = container.querySelector('#form-create-deal') as HTMLElement | null;
  injectClaimHandleNudge(container, {
    insertBefore: formEl,
    onToast: showToast,
    onClaimed: (username) => {
      showToast(`Sivan handle set: ${username} — others can now find you by name`);
    },
  });

  const amountInput = container.querySelector('#deal-amount') as HTMLInputElement;
  const currencyHiddenInput = container.querySelector('#deal-currency') as HTMLInputElement;
  const currencyTrigger = container.querySelector('#deal-currency-trigger') as HTMLElement;
  const currencyMenu = container.querySelector('#deal-currency-menu') as HTMLElement;
  const currencyDisplay = container.querySelector('#deal-currency-display') as HTMLElement;
  const currencyItems = container.querySelectorAll('#deal-currency-menu .custom-select-item');
  const clickController = new AbortController();

  const availNote = container.querySelector('#avail-bal-note') as HTMLElement;
  const grossEl = container.querySelector('#calc-gross') as HTMLElement;
  const feeLabel = container.querySelector('#calc-fee-label') as HTMLElement;
  const feeEl = container.querySelector('#calc-fee') as HTMLElement;
  const netEl = container.querySelector('#calc-net') as HTMLElement;
  const submitBtn = container.querySelector('#btn-submit-deal') as HTMLButtonElement;

  const updateBalanceDisplay = () => {
    const curr = currencyHiddenInput.value as SupportedTokenSymbol;
    const tokenBal = balances.find(b => b.symbol === curr);
    const balFormatted = tokenBal?.balanceFormatted || '0.00';
    availNote.textContent = state.address 
      ? `Wallet Balance: ${balFormatted} ${curr}`
      : 'Wallet not connected (Connect to fund deal)';
  };

  const updateCalc = async () => {
    const amt = parseFloat(amountInput.value) || 0;
    const curr = currencyHiddenInput.value;

    if (amt <= 0) {
      grossEl.textContent = `0.00 ${curr}`;
      feeEl.textContent = `0.00 ${curr}`;
      netEl.textContent = `0.00 ${curr}`;
      feeLabel.textContent = 'Sivan Platform Fee:';
      return;
    }

    const feeResult = await agreementFeeService.getDynamicFeeQuote(amt, curr);

    grossEl.textContent = `${amt.toFixed(2)} ${curr}`;
    feeLabel.textContent = `Sivan Fee (${feeResult.feeFormula}):`;
    feeEl.textContent = `${feeResult.protocolFee.toFixed(2)} ${curr}`;
    netEl.textContent = `${feeResult.netAmount.toFixed(2)} ${curr}`;
  };

  // ── Fixed-position dropdown helper ─────────────────────────────────────
  // Positions the menu as position:fixed anchored below the trigger using
  // getBoundingClientRect, escaping overflow-y:auto and any stacking context.
  const positionAndOpenMenu = (trigger: HTMLElement, menu: HTMLElement) => {
    const rect = trigger.getBoundingClientRect();
    menu.style.position = 'fixed';
    menu.style.top = `${rect.bottom + 4}px`;
    menu.style.left = `${rect.left}px`;
    menu.style.width = `${rect.width}px`;
    menu.style.zIndex = '99999';
    menu.classList.add('open');
  };

  const closeMenu = (trigger: HTMLElement, menu: HTMLElement) => {
    menu.classList.remove('open');
    menu.style.position = '';
    menu.style.top = '';
    menu.style.left = '';
    menu.style.width = '';
    menu.style.zIndex = '';
    trigger.classList.remove('active');
  };
  // ────────────────────────────────────────────────────────────────────────

  // Dropdown open/close event
  currencyTrigger?.addEventListener('click', (e) => {
    e.stopPropagation();
    const isOpen = currencyMenu.classList.contains('open');
    // Close deadline menu if open first
    if (deadlineMenu) closeMenu(deadlineTrigger, deadlineMenu);
    if (isOpen) {
      closeMenu(currencyTrigger, currencyMenu);
    } else {
      currencyTrigger.classList.add('active');
      positionAndOpenMenu(currencyTrigger, currencyMenu);
    }
  });

  // Select item event
  currencyItems.forEach(item => {
    item.addEventListener('click', (e) => {
      e.stopPropagation();
      const el = e.currentTarget as HTMLElement;
      const val = el.dataset.value!;

      currencyHiddenInput.value = val;
      currencyDisplay.innerHTML = `${getTokenIconSvg(val, 16)} <span>${val}</span>`;

      currencyItems.forEach(i => i.classList.remove('selected'));
      el.classList.add('selected');

      closeMenu(currencyTrigger, currencyMenu);

      updateBalanceDisplay();
      updateCalc();
    });
  });

  // Close dropdowns on outside click — scoped to this view's lifetime via AbortController
  document.addEventListener('click', () => {
    if (currencyMenu) closeMenu(currencyTrigger, currencyMenu);
    if (deadlineMenu) closeMenu(deadlineTrigger, deadlineMenu);
  }, { signal: clickController.signal });

  // Auto-cleanup when container leaves DOM (on navigation)
  const _caObserver = new MutationObserver(() => {
    if (!document.body.contains(container)) {
      clickController.abort();
      clearTimeout(resolveTimer);
      _caObserver.disconnect();
    }
  });
  _caObserver.observe(document.body, { childList: true, subtree: true });

  // Deadline custom dropdown
  const deadlineHiddenInput = container.querySelector('#deal-deadline') as HTMLInputElement;
  const deadlineTrigger = container.querySelector('#deadline-select-trigger') as HTMLElement;
  const deadlineMenu = container.querySelector('#deadline-select-menu') as HTMLElement;
  const deadlineDisplay = container.querySelector('#deadline-display') as HTMLElement;
  const deadlineItems = container.querySelectorAll('#deadline-select-menu .custom-select-item');

  deadlineTrigger?.addEventListener('click', (e) => {
    e.stopPropagation();
    const isOpen = deadlineMenu.classList.contains('open');
    // Close currency menu if open first
    if (currencyMenu) closeMenu(currencyTrigger, currencyMenu);
    if (isOpen) {
      closeMenu(deadlineTrigger, deadlineMenu);
    } else {
      deadlineTrigger.classList.add('active');
      positionAndOpenMenu(deadlineTrigger, deadlineMenu);
    }
  });

  deadlineItems.forEach(item => {
    item.addEventListener('click', (e) => {
      e.stopPropagation();
      const el = e.currentTarget as HTMLElement;
      const hours = el.dataset.hours!;
      const label = el.dataset.label!;

      deadlineHiddenInput.value = hours;
      deadlineDisplay.innerHTML = `
        <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" style="opacity:0.7"><path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zm4.24 16L11 13V7h1.5v5.25l4.5 2.67-1.01 1.66z"/></svg>
        <span>${label}</span>
      `;

      deadlineItems.forEach(i => i.classList.remove('selected'));
      el.classList.add('selected');

      closeMenu(deadlineTrigger, deadlineMenu);
    });
  });

  updateBalanceDisplay();
  updateCalc();

  amountInput?.addEventListener('input', updateCalc);

  // Contractor handle resolution listener
  const contractorField = container.querySelector('#deal-contractor') as HTMLInputElement;
  const resolutionBadge = container.querySelector('#contractor-resolution-badge') as HTMLElement;
  let resolvedAddress: string | null = null;
  let resolveTimer: any = null;

  contractorField?.addEventListener('input', () => {
    const val = contractorField.value.trim();
    resolvedAddress = null;
    clearTimeout(resolveTimer);

    if (!val) {
      if (resolutionBadge) resolutionBadge.style.display = 'none';
      return;
    }

    if (val.startsWith('0x') && val.length === 42) {
      if (resolutionBadge) {
        resolutionBadge.style.display = 'block';
        resolutionBadge.style.color = 'var(--accent-cyan)';
        resolutionBadge.innerHTML = '<span>Direct Celo Wallet Address</span>';
      }
      resolvedAddress = val;
      return;
    }

    if (val.startsWith('@') || val.length >= 3) {
      if (resolutionBadge) {
        resolutionBadge.style.display = 'block';
        resolutionBadge.style.color = 'var(--text-muted)';
        resolutionBadge.innerHTML = `<span style="display: inline-flex; align-items: center; gap: 4px;">${getSearchIconSvg(12, 'var(--text-muted)')} <span>Resolving Sivan handle...</span></span>`;
      }

      resolveTimer = setTimeout(async () => {
        const res = await identityService.resolveTarget(val, 'celo');
        if (res.found && res.user?.targetAddress) {
          resolvedAddress = res.user.targetAddress;
          if (resolutionBadge) {
            resolutionBadge.style.color = 'var(--accent-emerald)';
            resolutionBadge.innerHTML = `<span style="display: inline-flex; align-items: center; gap: 4px;">${getCheckCircleSvg(12, 'var(--accent-emerald)')} <span>Verified Sivan User: ${res.user.displayName || val} (${resolvedAddress.slice(0, 6)}...${resolvedAddress.slice(-4)})</span></span>`;
          }
        } else if (res.found && res.user) {
          if (resolutionBadge) {
            resolutionBadge.style.color = 'var(--accent-emerald)';
            resolutionBadge.innerHTML = `<span style="display: inline-flex; align-items: center; gap: 4px;">${getCheckCircleSvg(12, 'var(--accent-emerald)')} <span>Sivan User: ${res.user.displayName || val}</span></span>`;
          }
        } else {
          if (resolutionBadge) {
            resolutionBadge.style.color = 'var(--text-muted)';
            resolutionBadge.innerHTML = '<span>Contractor will receive invite claim link</span>';
          }
        }
      }, 350);
    }
  });

  // Back button
  container.querySelector('#btn-cancel-create')?.addEventListener('click', () => onNavigate('dashboard'));

  // Form submission with real on-chain transaction execution
  const form = container.querySelector('#form-create-deal') as HTMLFormElement;
  form?.addEventListener('submit', async (e) => {
    e.preventDefault();

    if (!state.address) {
      showToast('Please connect your MetaMask or MiniPay wallet first.');
      const res = await miniPayService.connectMetaMask();
      if (!res.success) return;
    }

    const title = (container.querySelector('#deal-title') as HTMLInputElement).value.trim();
    const amount = parseFloat(amountInput.value);
    const currency = currencyHiddenInput.value as 'USDC' | 'USDT' | 'cNGN' | 'cUSD';
    const deadlineHours = parseInt((container.querySelector('#deal-deadline') as HTMLInputElement).value, 10);

    const description = (container.querySelector('#deal-desc') as HTMLTextAreaElement).value.trim();

    if (!amount || amount <= 0) {
      showToast('Please enter a valid amount.');
      return;
    }

    // Check available balance
    const currentBal = balances.find(b => b.symbol === currency);
    const availableNum = currentBal ? parseFloat(currentBal.balanceFormatted.replace(/,/g, '')) : 0;

    if (amount > availableNum) {
      showToast(`Insufficient ${currency} balance. You have ${availableNum} ${currency}.`);
      return;
    }

    submitBtn.disabled = true;
    submitBtn.innerHTML = `
      <span style="display:inline-flex;align-items:center;gap:8px;">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="animation:spin 1s linear infinite"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
        Waiting for wallet confirmation...
      </span>
    `;

    try {
      // Execute genuine on-chain transfer to lock deal under Sivan AI Autonomous Service Agreement
      const txRes = await miniPayService.sendAttributedTransfer({
        to: CELO_CONFIG.agentWallet as `0x${string}`,
        amount,
        currency,
      });

      if (!txRes.success || !txRes.txHash) {
        showToast(`Transaction failed: ${txRes.error || 'User cancelled'}`);
        submitBtn.disabled = false;
        submitBtn.innerHTML = `<div class="ca-submit-icon">${getLockIconSvg(16, '#ffffff')}</div><div class="ca-submit-text"><span class="ca-submit-main">Fund & Lock Deal</span><span class="ca-submit-sub">Celo Mainnet · Instant On-Chain</span></div>`;
        return;
      }

      const contractorInput = (container.querySelector('#deal-contractor') as HTMLInputElement).value.trim();
      const contractorAddress = resolvedAddress || (contractorInput.startsWith('0x') ? contractorInput : '');
      const contractorIdentifier = contractorInput.startsWith('0x')
        ? `${contractorInput.slice(0, 6)}...${contractorInput.slice(-4)}`
        : contractorInput;

      const feeQuote = await agreementFeeService.getDynamicFeeQuote(amount, currency);

      // Save genuine service agreement with the real connected buyer wallet address
      const created = await agreementsService.createAgreement({
        title,
        description,
        contractorIdentifier,
        contractorAddress,
        buyerAddress: state.address as string,   // Real connected MiniPay wallet — never a placeholder
        amount,
        currency,
        deadlineHours,
        fundingTxHash: txRes.txHash,
        protocolFee: feeQuote.protocolFee,
        netAmount: feeQuote.netAmount,
      });

      showToast(`Deal confirmed on Celo Mainnet! Tx: ${txRes.txHash.slice(0, 10)}...`);
      openShareModal(created, () => {
        onNavigate('deals');
      });
    } catch (err: any) {
      console.error('Deal funding error:', err);
      showToast(`Error: ${err.message || 'Transaction could not be completed'}`);
      submitBtn.disabled = false;
      submitBtn.innerHTML = `<div class="ca-submit-icon">${getLockIconSvg(16, '#ffffff')}</div><div class="ca-submit-text"><span class="ca-submit-main">Fund & Lock Deal</span><span class="ca-submit-sub">Celo Mainnet · Instant On-Chain</span></div>`;
    }
  });
}
