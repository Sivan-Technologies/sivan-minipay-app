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
    <div class="section-header" style="margin-bottom: 20px;">
      <h2 class="section-title">New Service Agreement</h2>
      <span class="section-link" id="btn-cancel-create">Back</span>
    </div>

    <form id="form-create-deal">
      <div class="form-group">
        <label class="form-label" for="deal-title">Deal Title</label>
        <input 
          type="text" 
          id="deal-title" 
          class="form-input" 
          <!-- In-DOM Token Selector Dropdown -->
          <div class="custom-select-wrap" id="deal-currency-wrap">
            <div class="custom-select-trigger" id="deal-currency-trigger">
              <span id="deal-currency-display" style="display: inline-flex; align-items: center; gap: 6px;">${getTokenIconSvg('USDC', 16)} <span>USDC</span></span>
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

          <input 
            type="number" 
            id="deal-amount" 
            class="form-input" 
            placeholder="0.00" 
            min="0.01" 
            step="any" 
            required 
          />
        </div>
        <div id="avail-bal-note" class="form-helper" style="color: var(--accent-emerald); font-weight: 500; margin-top: 4px;">
          Available: Loading...
        </div>
      </div>

      <div class="form-group">
        <label class="form-label">Delivery Deadline</label>
        <input type="hidden" id="deal-deadline" value="48">
        <div class="custom-select-wrap" id="deadline-select-wrap">
          <div class="custom-select-trigger" id="deadline-select-trigger">
            <span id="deadline-display" style="display: flex; align-items: center; gap: 8px; font-size: 14px;">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" style="opacity:0.7"><path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zm4.24 16L11 13V7h1.5v5.25l4.5 2.67-1.01 1.66z"/></svg>
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

      <div class="form-group">
        <label class="form-label" for="deal-desc">Deliverable Scope & Criteria</label>
        <textarea 
          id="deal-desc" 
          class="form-textarea" 
          placeholder="Describe deliverables and verification requirements before payment is released..." 
          required
        ></textarea>
      </div>

      <!-- Live Calculation Box -->
      <div class="quote-box" id="calc-box">
        <div class="quote-row">
          <span>Gross Agreement Value:</span>
          <span id="calc-gross">0.00 USDC</span>
        </div>
        <div class="quote-row">
          <span id="calc-fee-label">Sivan Platform Fee:</span>
          <span id="calc-fee">0.00 USDC</span>
        </div>
        <div class="quote-row">
          <span>Net Contractor Payout:</span>
          <span id="calc-net">0.00 USDC</span>
        </div>
        <div style="margin-top: 8px; font-size: 11px; color: var(--text-muted); display: flex; align-items: center; gap: 6px;">
          <span style="display: inline-flex; align-items: center; gap: 4px;">${getTagIconSvg(12, 'var(--text-muted)')} Attribution Tag:</span>
          <code style="color: var(--accent-cyan); font-family: monospace;">${CELO_CONFIG.attributionTag}</code>
        </div>
      </div>

      <button type="submit" class="btn-primary" id="btn-submit-deal" style="margin-top: 10px; display: flex; align-items: center; justify-content: center; gap: 8px;">
        ${getLockIconSvg(16, '#000')}
        <span>Fund & Lock Deal (Celo Mainnet)</span>
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

  // Dropdown open/close event
  currencyTrigger?.addEventListener('click', (e) => {
    e.stopPropagation();
    const isOpen = currencyMenu.classList.contains('open');
    if (isOpen) {
      currencyMenu.classList.remove('open');
      currencyTrigger.classList.remove('active');
    } else {
      currencyMenu.classList.add('open');
      currencyTrigger.classList.add('active');
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

      currencyMenu.classList.remove('open');
      currencyTrigger.classList.remove('active');

      updateBalanceDisplay();
      updateCalc();
    });
  });

  // Close dropdown on outside click
  document.addEventListener('click', () => {
    currencyMenu?.classList.remove('open');
    currencyTrigger?.classList.remove('active');
    deadlineMenu?.classList.remove('open');
    deadlineTrigger?.classList.remove('active');
  });

  // Deadline custom dropdown
  const deadlineHiddenInput = container.querySelector('#deal-deadline') as HTMLInputElement;
  const deadlineTrigger = container.querySelector('#deadline-select-trigger') as HTMLElement;
  const deadlineMenu = container.querySelector('#deadline-select-menu') as HTMLElement;
  const deadlineDisplay = container.querySelector('#deadline-display') as HTMLElement;
  const deadlineItems = container.querySelectorAll('#deadline-select-menu .custom-select-item');

  deadlineTrigger?.addEventListener('click', (e) => {
    e.stopPropagation();
    const isOpen = deadlineMenu.classList.contains('open');
    deadlineMenu.classList.toggle('open', !isOpen);
    deadlineTrigger.classList.toggle('active', !isOpen);
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

      deadlineMenu.classList.remove('open');
      deadlineTrigger.classList.remove('active');
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
        resolutionBadge.innerHTML = `<span style="display: inline-flex; align-items: center; gap: 4px;">${getSearchIconSvg(12, 'var(--text-muted)')} Resolving Sivan handle...</span>`;
      }

      resolveTimer = setTimeout(async () => {
        const res = await identityService.resolveTarget(val, 'celo');
        if (res.found && res.user?.targetAddress) {
          resolvedAddress = res.user.targetAddress;
          if (resolutionBadge) {
            resolutionBadge.style.color = 'var(--accent-emerald)';
            resolutionBadge.innerHTML = `<span style="display: inline-flex; align-items: center; gap: 4px;">${getCheckCircleSvg(12, 'var(--accent-emerald)')} Verified Sivan User: ${res.user.displayName || val} (${resolvedAddress.slice(0, 6)}...${resolvedAddress.slice(-4)})</span>`;
          }
        } else if (res.found && res.user) {
          if (resolutionBadge) {
            resolutionBadge.style.color = 'var(--accent-emerald)';
            resolutionBadge.innerHTML = `<span style="display: inline-flex; align-items: center; gap: 4px;">${getCheckCircleSvg(12, 'var(--accent-emerald)')} Sivan User: ${res.user.displayName || val}</span>`;
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
    submitBtn.innerHTML = '<span>Waiting for wallet confirmation...</span>';

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
        submitBtn.innerHTML = `
          ${getLockIconSvg(16, '#000')}
          <span>Fund & Lock Deal (Celo Mainnet)</span>
        `;
        return;
      }

      const contractorInput = (container.querySelector('#deal-contractor') as HTMLInputElement).value.trim();
      const contractorAddress = resolvedAddress || (contractorInput.startsWith('0x') ? contractorInput : '');
      const contractorIdentifier = contractorInput.startsWith('0x')
        ? `${contractorInput.slice(0, 6)}...${contractorInput.slice(-4)}`
        : contractorInput;

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
      });

      showToast(`Deal confirmed on Celo Mainnet. Tx: ${txRes.txHash.slice(0, 10)}...`);
      openShareModal(created, () => {
        onNavigate('deals');
      });
    } catch (err: any) {
      console.error('Deal funding error:', err);
      showToast(`Error: ${err.message || 'Transaction could not be completed'}`);
      submitBtn.disabled = false;
      submitBtn.innerHTML = `
        ${getLockIconSvg(16, '#000')}
        <span>Fund & Lock Deal (Celo Mainnet)</span>
      `;
    }
  });
}
