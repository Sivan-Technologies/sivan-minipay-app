import { agreementsService } from '../services/agreements.service';
import { CELO_CONFIG } from '../config/celo.config';

export function renderCreateAgreement(
  container: HTMLElement,
  onNavigate: (tab: string) => void,
  showToast: (msg: string) => void
) {
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
          placeholder="e.g. Mobile UI Design or Smart Contract Audit" 
          required 
          value="Figma Mobile Prototype"
        />
      </div>

      <div class="form-group">
        <label class="form-label" for="deal-contractor">Contractor Identifier</label>
        <input 
          type="text" 
          id="deal-contractor" 
          class="form-input" 
          placeholder="Phone (+234...), Celo 0x address, or Telegram" 
          required 
          value="+234 812 345 6789"
        />
        <div class="form-helper">MiniPay user, phone number, or Celo 0x address</div>
      </div>

      <div class="form-group">
        <label class="form-label">Currency & Amount</label>
        <div style="display: grid; grid-template-columns: 100px 1fr; gap: 10px;">
          <select id="deal-currency" class="form-select">
            <option value="USDC">USDC</option>
            <option value="cNGN">cNGN</option>
          </select>
          <input 
            type="number" 
            id="deal-amount" 
            class="form-input" 
            placeholder="Amount" 
            min="1" 
            step="any" 
            required 
            value="25"
          />
        </div>
        <div class="form-helper">Recommended realistic test range: 5 to 50 USDC</div>
      </div>

      <div class="form-group">
        <label class="form-label" for="deal-deadline">Delivery Deadline</label>
        <select id="deal-deadline" class="form-select">
          <option value="24">24 Hours (1 Day)</option>
          <option value="48" selected>48 Hours (2 Days)</option>
          <option value="72">72 Hours (3 Days)</option>
          <option value="168">7 Days (1 Week)</option>
        </select>
      </div>

      <div class="form-group">
        <label class="form-label" for="deal-desc">Deliverable Scope & Criteria</label>
        <textarea 
          id="deal-desc" 
          class="form-textarea" 
          placeholder="Describe what must be delivered before milestone funds are released..." 
          required
        >Deliver 8 high-fidelity mobile prototype screens on Figma with click-through navigation.</textarea>
      </div>

      <!-- Live Calculation Box -->
      <div class="quote-box" id="calc-box">
        <div class="quote-row">
          <span>Gross Agreement Value:</span>
          <span id="calc-gross">25.00 USDC</span>
        </div>
        <div class="quote-row">
          <span>Sivan Protocol Fee (1%):</span>
          <span id="calc-fee">0.25 USDC</span>
        </div>
        <div class="quote-row">
          <span>Net Contractor Payout:</span>
          <span id="calc-net">24.75 USDC</span>
        </div>
        <div style="margin-top: 8px; font-size: 11px; color: var(--text-muted); display: flex; align-items: center; gap: 4px;">
          <span>🏷️ Attributed:</span>
          <code style="color: var(--accent-cyan);">${CELO_CONFIG.attributionTag}</code>
        </div>
      </div>

      <button type="submit" class="btn-primary" id="btn-submit-deal">
        <span>🔒 Fund & Lock Deal</span>
      </button>
    </form>
  `;

  // Calculator update
  const amountInput = container.querySelector('#deal-amount') as HTMLInputElement;
  const currencySelect = container.querySelector('#deal-currency') as HTMLSelectElement;
  const grossEl = container.querySelector('#calc-gross') as HTMLElement;
  const feeEl = container.querySelector('#calc-fee') as HTMLElement;
  const netEl = container.querySelector('#calc-net') as HTMLElement;

  const updateCalc = () => {
    const amt = parseFloat(amountInput.value) || 0;
    const curr = currencySelect.value;
    const fee = Math.round(amt * 0.01 * 100) / 100;
    const net = Math.round((amt - fee) * 100) / 100;

    if (curr === 'USDC') {
      grossEl.textContent = `${amt.toFixed(2)} USDC`;
      feeEl.textContent = `${fee.toFixed(2)} USDC`;
      netEl.textContent = `${net.toFixed(2)} USDC`;
    } else {
      grossEl.textContent = `₦${amt.toLocaleString()} cNGN`;
      feeEl.textContent = `₦${fee.toLocaleString()} cNGN`;
      netEl.textContent = `₦${net.toLocaleString()} cNGN`;
    }
  };

  amountInput?.addEventListener('input', updateCalc);
  currencySelect?.addEventListener('change', updateCalc);

  // Back button
  container.querySelector('#btn-cancel-create')?.addEventListener('click', () => onNavigate('dashboard'));

  // Form submission
  const form = container.querySelector('#form-create-deal') as HTMLFormElement;
  form?.addEventListener('submit', (e) => {
    e.preventDefault();
    const title = (container.querySelector('#deal-title') as HTMLInputElement).value;
    const contractorIdentifier = (container.querySelector('#deal-contractor') as HTMLInputElement).value;
    const amount = parseFloat(amountInput.value);
    const currency = currencySelect.value as 'USDC' | 'cNGN';
    const deadlineHours = parseInt((container.querySelector('#deal-deadline') as HTMLSelectElement).value, 10);
    const description = (container.querySelector('#deal-desc') as HTMLTextAreaElement).value;

    const newDeal = agreementsService.createAgreement({
      title,
      description,
      contractorIdentifier,
      amount,
      currency,
      deadlineHours,
    });

    showToast(`✅ Deal "${newDeal.title}" funded & locked on Celo!`);
    onNavigate('deals');
  });
}
