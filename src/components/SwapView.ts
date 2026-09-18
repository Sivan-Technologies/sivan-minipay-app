import { miniPayService } from '../services/minipay.service';
import { fetchTokenBalances, checkTokenAllowance } from '../services/celo-client';
import { textileRfqService, type SwapToken, type SwapQuoteResult } from '../services/textile-rfq.service';
import { transactionsService } from '../services/transactions.service';
import { getTokenIconSvg } from '../utils/token-icons';
import { getActiveNetwork } from '../config/celo.config';
import { renderBuyCngn } from './BuyCngnView';
import { parseUnits } from 'viem';

export async function renderSwap(
  container: HTMLElement,
  onNavigate: (tab: string) => void,
  showToast: (msg: string) => void
) {
  const state = miniPayService.getState();
  const balances = await fetchTokenBalances(state.address);

  let fromToken: SwapToken = 'USDT';
  let toToken: SwapToken = 'cNGN';
  let currentQuote: SwapQuoteResult | null = null;
  let quoteTimer: any = null;

  const isFrom = (tok: SwapToken) => (fromToken as string) === tok ? 'selected' : '';
  const isTo = (tok: SwapToken) => (toToken as string) === tok ? 'selected' : '';

  container.innerHTML = `
    <div class="section-header" style="margin-bottom: 16px;">
      <h2 class="section-title">Swap & Buy</h2>
      <span class="section-link" id="btn-back-swap">Back</span>
    </div>

    <!-- Textile RFQ Corridor Banner -->
    <div style="background: rgba(16, 185, 129, 0.08); border: 1px solid rgba(16, 185, 129, 0.25); border-radius: var(--radius-md); padding: 12px 14px; margin-bottom: 20px; font-size: 12px;">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
        <span style="font-weight: 700; color: var(--text-emerald); display: flex; align-items: center; gap: 6px;">
          <span>⚡ Textile Credit Market Maker RFQ</span>
        </span>
        <span style="font-size: 11px; color: var(--text-muted); font-weight: 600;">${getActiveNetwork().chainName}</span>
      </div>
      <div style="color: var(--text-secondary); line-height: 1.4;">
        Institutional liquidity on Celo. Swap between Nigerian cNGN and USD stablecoins with zero custodial holding.
      </div>
    </div>

    <div class="swap-card-wrapper" style="display: flex; flex-direction: column; gap: 12px;">
      
      <!-- Pay Card -->
      <div class="card" style="padding: 16px; background: var(--bg-card); border: 1px solid var(--border-subtle); border-radius: var(--radius-lg);">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
          <span style="font-size: 12px; font-weight: 600; color: var(--text-muted); text-transform: uppercase;">You Pay</span>
          <span id="from-bal-display" style="font-size: 12px; color: var(--text-secondary); cursor: pointer;">
            Bal: 0.00
          </span>
        </div>

        <div style="display: grid; grid-template-columns: 1fr 130px; gap: 12px; align-items: center;">
          <div style="position: relative;">
            <input 
              type="number" 
              id="swap-amount-in" 
              class="form-input" 
              placeholder="0.00" 
              value="10"
              step="any"
              min="0.1"
              style="font-size: 22px; font-weight: 700; padding: 10px 12px;"
            />
            <button type="button" id="btn-max-swap" style="position: absolute; right: 8px; top: 50%; transform: translateY(-50%); background: rgba(16,185,129,0.15); border: 1px solid rgba(16,185,129,0.3); color: var(--text-emerald); font-size: 11px; font-weight: 700; padding: 2px 6px; border-radius: 4px; cursor: pointer;">
              MAX
            </button>
          </div>

          <div class="custom-select-wrap" id="from-token-wrap">
            <div class="custom-select-trigger" id="from-token-trigger" style="padding: 10px 12px;">
              <span id="from-token-display" style="display: inline-flex; align-items: center; gap: 6px; font-weight: 600;">
                ${getTokenIconSvg(fromToken, 18)} <span>${fromToken}</span>
              </span>
              <span class="chevron">▾</span>
            </div>
            <div class="custom-select-menu" id="from-token-menu">
              <div class="custom-select-item ${isFrom('USDT')}" data-token="USDT">
                ${getTokenIconSvg('USDT', 16)} <span>USDT</span>
              </div>
              <div class="custom-select-item ${isFrom('USDC')}" data-token="USDC">
                ${getTokenIconSvg('USDC', 16)} <span>USDC</span>
              </div>
              <div class="custom-select-item ${isFrom('cUSD')}" data-token="cUSD">
                ${getTokenIconSvg('cUSD', 16)} <span>USDm</span>
              </div>
              <div class="custom-select-item ${isFrom('cNGN')}" data-token="cNGN">
                ${getTokenIconSvg('cNGN', 16)} <span>cNGN</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Flip Switch Button -->
      <div style="display: flex; justify-content: center; margin: -6px 0; z-index: 2;">
        <button type="button" id="btn-flip-swap" style="width: 38px; height: 38px; border-radius: 50%; background: var(--bg-card); border: 2px solid var(--border-subtle); color: var(--text-emerald); display: flex; align-items: center; justify-content: center; cursor: pointer; transition: transform 0.2s ease, border-color 0.2s ease; box-shadow: 0 4px 12px rgba(0,0,0,0.25);" title="Invert Swap Direction">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M7 10l5-5 5 5M17 14l-5 5-5-5"/>
          </svg>
        </button>
      </div>

      <!-- Receive Card -->
      <div class="card" style="padding: 16px; background: var(--bg-card); border: 1px solid var(--border-subtle); border-radius: var(--radius-lg);">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
          <span style="font-size: 12px; font-weight: 600; color: var(--text-muted); text-transform: uppercase;">You Receive</span>
          <span id="to-bal-display" style="font-size: 12px; color: var(--text-secondary);">
            Bal: 0.00
          </span>
        </div>

        <div style="display: grid; grid-template-columns: 1fr 130px; gap: 12px; align-items: center;">
          <input 
            type="text" 
            id="swap-amount-out" 
            class="form-input" 
            placeholder="0.00" 
            readonly
            style="font-size: 22px; font-weight: 700; padding: 10px 12px; background: rgba(0,0,0,0.2); color: var(--text-emerald);"
          />

          <div class="custom-select-wrap" id="to-token-wrap">
            <div class="custom-select-trigger" id="to-token-trigger" style="padding: 10px 12px;">
              <span id="to-token-display" style="display: inline-flex; align-items: center; gap: 6px; font-weight: 600;">
                ${getTokenIconSvg(toToken, 18)} <span>${(toToken as string) === 'cUSD' ? 'USDm' : toToken}</span>
              </span>
              <span class="chevron">▾</span>
            </div>
            <div class="custom-select-menu" id="to-token-menu">
              <div class="custom-select-item ${isTo('cNGN')}" data-token="cNGN">
                ${getTokenIconSvg('cNGN', 16)} <span>cNGN</span>
              </div>
              <div class="custom-select-item ${isTo('USDT')}" data-token="USDT">
                ${getTokenIconSvg('USDT', 16)} <span>USDT</span>
              </div>
              <div class="custom-select-item ${isTo('USDC')}" data-token="USDC">
                ${getTokenIconSvg('USDC', 16)} <span>USDC</span>
              </div>
              <div class="custom-select-item ${isTo('cUSD')}" data-token="cUSD">
                ${getTokenIconSvg('cUSD', 16)} <span>USDm</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Quote Details Breakdown -->
      <div style="background: rgba(15, 23, 42, 0.6); border: 1px solid var(--border-subtle); border-radius: var(--radius-md); padding: 14px; font-size: 13px;">
        <div style="display: flex; justify-content: space-between; margin-bottom: 6px;">
          <span style="color: var(--text-muted);">Exchange Rate</span>
          <span id="quote-rate-val" style="font-weight: 600; color: var(--text-primary);">Fetching quote...</span>
        </div>
        <div style="display: flex; justify-content: space-between; margin-bottom: 6px;">
          <span style="color: var(--text-muted);">Liquidity Provider</span>
          <span id="quote-source-val" style="color: var(--accent-cyan); font-weight: 500;">Textile Credit RFQ</span>
        </div>
        <div style="display: flex; justify-content: space-between; margin-bottom: 6px;">
          <span style="color: var(--text-muted);">Minimum Received</span>
          <span id="quote-min-val" style="color: var(--text-secondary);">0.00</span>
        </div>
        <div style="display: flex; justify-content: space-between;">
          <span style="color: var(--text-muted);">Celo Network Gas</span>
          <span style="color: var(--text-emerald); font-weight: 600;">&lt; $0.001 (Sponsored)</span>
        </div>
      </div>

      <!-- Submit Action Button -->
      <button 
        type="button" 
        id="btn-execute-swap" 
        class="btn-primary" 
        style="padding: 16px; font-size: 16px; font-weight: 700; margin-top: 8px; width: 100%; border-radius: var(--radius-md);"
      >
        <span>⚡ Swap ${fromToken} for ${toToken}</span>
      </button>

    </div>
  `;

  // Keep the title/Back action above both modes, matching Cash Out.
  const header = container.querySelector<HTMLElement>('.section-header')!;
  header.remove();
  const swapPanel = document.createElement('div');
  while (container.firstChild) swapPanel.append(container.firstChild);
  const buyPanel = document.createElement('div');
  buyPanel.hidden = true;
  const tabs = document.createElement('div');
  tabs.className = 'segmented-tabs-wrapper';
  tabs.setAttribute('role', 'group');
  tabs.setAttribute('aria-label', 'Swap or buy cNGN');
  for (const label of ['Swap', 'Buy cNGN']) {
    const tab = document.createElement('button');
    tab.type = 'button';
    tab.className = `segmented-tab${label === 'Swap' ? ' active' : ''}`;
    const icon = document.createElement('span');
    icon.textContent = label === 'Swap' ? '⇄' : '🏦';
    icon.setAttribute('aria-hidden', 'true');
    const text = document.createElement('span');
    text.textContent = label;
    tab.append(icon, text);
    tab.setAttribute('aria-pressed', String(label === 'Swap'));
    tab.onclick = () => {
      if (tab.getAttribute('aria-pressed') === 'true') return;
      const buy = label === 'Buy cNGN';
      swapPanel.hidden = buy; buyPanel.hidden = !buy;
      tabs.querySelectorAll('button').forEach(button => {
        button.setAttribute('aria-pressed', String(button === tab));
        button.classList.toggle('active', button === tab);
      });
      if (buy) void renderBuyCngn(buyPanel);
    };
    tabs.append(tab);
  }
  container.append(header, tabs, swapPanel, buyPanel);

  // Elements
  const btnBack = container.querySelector('#btn-back-swap') as HTMLElement;
  const fromBalDisplay = container.querySelector('#from-bal-display') as HTMLElement;
  const toBalDisplay = container.querySelector('#to-bal-display') as HTMLElement;
  const inputAmount = container.querySelector('#swap-amount-in') as HTMLInputElement;
  const outputAmount = container.querySelector('#swap-amount-out') as HTMLInputElement;
  const btnMax = container.querySelector('#btn-max-swap') as HTMLButtonElement;
  const btnFlip = container.querySelector('#btn-flip-swap') as HTMLButtonElement;
  const quoteRateVal = container.querySelector('#quote-rate-val') as HTMLElement;
  const quoteSourceVal = container.querySelector('#quote-source-val') as HTMLElement;
  const quoteMinVal = container.querySelector('#quote-min-val') as HTMLElement;
  const btnExecute = container.querySelector('#btn-execute-swap') as HTMLButtonElement;

  // Dropdowns
  const fromTrigger = container.querySelector('#from-token-trigger') as HTMLElement;
  const fromMenu = container.querySelector('#from-token-menu') as HTMLElement;
  const fromDisplay = container.querySelector('#from-token-display') as HTMLElement;
  const toTrigger = container.querySelector('#to-token-trigger') as HTMLElement;
  const toMenu = container.querySelector('#to-token-menu') as HTMLElement;
  const toDisplay = container.querySelector('#to-token-display') as HTMLElement;

  const updateBalances = () => {
    const fromB = balances.find(b => b.symbol === fromToken)?.balanceFormatted || '0.00';
    const toB = balances.find(b => b.symbol === toToken)?.balanceFormatted || '0.00';
    fromBalDisplay.textContent = `Bal: ${fromB} ${fromToken}`;
    toBalDisplay.textContent = `Bal: ${toB} ${toToken}`;
  };

  const calculateQuote = async () => {
    const amt = parseFloat(inputAmount.value) || 0;
    if (amt <= 0) {
      outputAmount.value = '0.00';
      quoteRateVal.textContent = '-';
      quoteMinVal.textContent = '0.00';
      return;
    }

    quoteRateVal.textContent = 'Quoting RFQ...';

    try {
      currentQuote = await textileRfqService.getSwapQuote(fromToken, toToken, amt, state.address || undefined);
      outputAmount.value = currentQuote.outputAmount >= 1
        ? currentQuote.outputAmount.toLocaleString(undefined, { maximumFractionDigits: 4 })
        : currentQuote.outputAmount.toFixed(6);

      if (fromToken === 'cNGN') {
        quoteRateVal.textContent = `1 cNGN = ${currentQuote.rate.toFixed(6)} ${toToken}`;
      } else {
        quoteRateVal.textContent = `1 ${fromToken} = ${currentQuote.rate.toLocaleString(undefined, { maximumFractionDigits: 2 })} ${toToken}`;
      }

      quoteSourceVal.textContent = currentQuote.source;
      quoteMinVal.textContent = `${currentQuote.minimumReceived.toLocaleString(undefined, { maximumFractionDigits: 4 })} ${toToken}`;
      btnExecute.innerHTML = `<span>⚡ Swap ${fromToken} for ${toToken}</span>`;
      btnExecute.disabled = false;
    } catch (err) {
      quoteRateVal.textContent = 'Quote failed';
    }
  };

  // Event Listeners
  btnBack.addEventListener('click', () => onNavigate('dashboard'));

  inputAmount.addEventListener('input', () => {
    clearTimeout(quoteTimer);
    quoteTimer = setTimeout(calculateQuote, 250);
  });

  btnMax.addEventListener('click', () => {
    const b = balances.find(item => item.symbol === fromToken);
    if (b) {
      const num = parseFloat(b.balanceFormatted.replace(/,/g, '')) || 0;
      inputAmount.value = String(num);
      calculateQuote();
    }
  });

  fromBalDisplay.addEventListener('click', () => {
    btnMax.click();
  });

  btnFlip.addEventListener('click', () => {
    const temp = fromToken;
    fromToken = toToken;
    toToken = temp;

    fromDisplay.innerHTML = `${getTokenIconSvg(fromToken, 18)} <span>${fromToken}</span>`;
    toDisplay.innerHTML = `${getTokenIconSvg(toToken, 18)} <span>${toToken}</span>`;

    btnFlip.style.transform = btnFlip.style.transform === 'rotate(180deg)' ? 'rotate(0deg)' : 'rotate(180deg)';
    updateBalances();
    calculateQuote();
  });

  // Dropdown Handling
  fromTrigger.addEventListener('click', (e) => {
    e.stopPropagation();
    fromMenu.classList.toggle('open');
    toMenu.classList.remove('open');
  });

  toTrigger.addEventListener('click', (e) => {
    e.stopPropagation();
    toMenu.classList.toggle('open');
    fromMenu.classList.remove('open');
  });

  document.addEventListener('click', () => {
    fromMenu?.classList.remove('open');
    toMenu?.classList.remove('open');
  });

  fromMenu.querySelectorAll('.custom-select-item').forEach(item => {
    item.addEventListener('click', (e) => {
      const tok = (e.currentTarget as HTMLElement).dataset.token as SwapToken;
      if (tok) {
        if (tok === toToken) {
          toToken = fromToken;
          toDisplay.innerHTML = `${getTokenIconSvg(toToken, 18)} <span>${toToken}</span>`;
        }
        fromToken = tok;
        fromDisplay.innerHTML = `${getTokenIconSvg(fromToken, 18)} <span>${fromToken}</span>`;
        fromMenu.classList.remove('open');
        updateBalances();
        calculateQuote();
      }
    });
  });

  toMenu.querySelectorAll('.custom-select-item').forEach(item => {
    item.addEventListener('click', (e) => {
      const tok = (e.currentTarget as HTMLElement).dataset.token as SwapToken;
      if (tok) {
        if (tok === fromToken) {
          fromToken = toToken;
          fromDisplay.innerHTML = `${getTokenIconSvg(fromToken, 18)} <span>${fromToken}</span>`;
        }
        toToken = tok;
        toDisplay.innerHTML = `${getTokenIconSvg(toToken, 18)} <span>${toToken}</span>`;
        toMenu.classList.remove('open');
        updateBalances();
        calculateQuote();
      }
    });
  });

  // Swap Execution via Textile Credit RFQ Engine
  btnExecute.addEventListener('click', async () => {
    if (!state.address) {
      showToast('⚠️ Please connect your wallet first.');
      return;
    }

    const amt = parseFloat(inputAmount.value) || 0;
    if (amt <= 0) {
      showToast('⚠️ Please enter a valid swap amount.');
      return;
    }

    const tokenBal = balances.find(b => b.symbol === fromToken);
    const avail = tokenBal ? parseFloat(tokenBal.balanceFormatted.replace(/,/g, '')) : 0;
    if (amt > avail) {
      showToast(`⚠️ Insufficient ${fromToken} balance. Available: ${avail}`);
      return;
    }

    btnExecute.disabled = true;
    btnExecute.innerHTML = '<span>⏳ Requesting Market Maker Quote...</span>';

    try {
      // 1. Solicit firm executable transaction payload from Textile Market Maker
      const firmRfq = await textileRfqService.requestFirmSwapRfq(
        fromToken,
        toToken,
        amt,
        state.address,
        getActiveNetwork().chainId
      );

      const approvalTx = firmRfq.transactions?.approval;
      const swapTx = firmRfq.transactions?.swap;

      if (!swapTx || !swapTx.to || !swapTx.data) {
        throw new Error('No executable swap transaction received from Textile RFQ.');
      }

      // 2. Check on-chain allowance if approval transaction definition is present
      if (approvalTx && approvalTx.to) {
        const decimals = tokenBal?.decimals || 6;
        const requiredAmountRaw = parseUnits(amt.toString(), decimals);
        const currentAllowance = await checkTokenAllowance(
          approvalTx.to,
          state.address as `0x${string}`,
          swapTx.to
        );

        if (currentAllowance < requiredAmountRaw) {
          btnExecute.innerHTML = `<span>1/2: Approve ${fromToken} in Wallet...</span>`;
          const apprRes = await miniPayService.sendRawTransaction({
            to: approvalTx.to,
            data: approvalTx.data,
            value: approvalTx.value,
            attribution: false,
          });

          if (!apprRes.success || !apprRes.txHash) {
            btnExecute.disabled = false;
            btnExecute.innerHTML = `<span>⚡ Swap ${fromToken} for ${toToken}</span>`;
            showToast(`❌ Approval rejected: ${apprRes.error || 'Cancelled'}`);
            return;
          }

          showToast(`⏳ ${fromToken} approval confirmed on Celo. Preparing atomic swap...`);
          await miniPayService.waitForReceipt(apprRes.txHash);
        }
      }

      // 3. Execute atomic swap transaction on LimitOrderReactor
      btnExecute.innerHTML = `<span>2/2: Confirm Swap in Wallet...</span>`;
      const swapRes = await miniPayService.sendRawTransaction({
        to: swapTx.to,
        data: swapTx.data,
        value: swapTx.value,
        attribution: true,
      });

      if (!swapRes.success || !swapRes.txHash) {
        btnExecute.disabled = false;
        btnExecute.innerHTML = `<span>⚡ Swap ${fromToken} for ${toToken}</span>`;
        showToast(`❌ Swap rejected: ${swapRes.error || 'Cancelled'}`);
        return;
      }

      // 4. Submit broadcasted transaction hash to Textile RFQ engine for settlement registration
      if (firmRfq.rfqId && swapRes.txHash) {
        void textileRfqService.submitSwapTx(firmRfq.rfqId, swapRes.txHash);
      }

      // Record in local transaction history
      const outFormatted = firmRfq.quote.outputAmount >= 1
        ? firmRfq.quote.outputAmount.toLocaleString(undefined, { maximumFractionDigits: 2 })
        : firmRfq.quote.outputAmount.toFixed(4);

      transactionsService.recordTransfer({
        amount: amt,
        token: fromToken,
        feeAmount: 0,
        netAmount: firmRfq.quote.outputAmount,
        recipientIdentifier: `Textile RFQ (${toToken})`,
        recipientAddress: swapTx.to,
        txHash: swapRes.txHash,
      });

      btnExecute.innerHTML = '<span>🚀 Swap Confirmed!</span>';
      showToast(`🎉 Swap confirmed! Received ${outFormatted} ${toToken}! Tx: ${swapRes.txHash.slice(0, 8)}...`);

      setTimeout(() => {
        onNavigate('history');
      }, 1500);
    } catch (err: any) {
      console.error('Swap error:', err);
      btnExecute.disabled = false;
      btnExecute.innerHTML = `<span>⚡ Swap ${fromToken} for ${toToken}</span>`;
      showToast(`❌ Swap failed: ${err.message || 'Execution error'}`);
    }
  });

  updateBalances();
  calculateQuote();
}
