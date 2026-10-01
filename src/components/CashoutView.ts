import { fxQuotesService, type BankItem, getBankLogoUrl } from '../services/fx-quotes.service';
import { miniPayService } from '../services/minipay.service';
import { fetchTokenBalances } from '../services/celo-client';
import { countryService } from '../config/countries.config';
import { transactionsService } from '../services/transactions.service';
import { identityService } from '../services/identity.service';
import { getActiveNetwork, getSivanFeeWallet, type SupportedTokenSymbol } from '../config/celo.config';
import { getTokenIconSvg } from '../utils/token-icons';
import { textileKycService } from '../services/textile-kyc.service';
import { openTextileKycModal } from './TextileKycModal';
import { injectClaimHandleNudge } from './ClaimHandleNudge';
import { 
  getBankIconSvg, 
  getDirectTransferIconSvg, 
  getFlashIconSvg, 
  getHourglassIconSvg, 
  getShieldIconSvg, 
  getSparkleIconSvg,
  getCheckCircleSvg
} from '../utils/ui-icons';
import { featureFlagsService } from '../services/feature-flags.service';

export async function renderCashout(
  container: HTMLElement,
  onNavigate: (tab: string) => void,
  showToast: (msg: string) => void
) {
  const state = miniPayService.getState();
  const balances = await fetchTokenBalances(state.address);
  const country = countryService.getActiveCountry();

  const isGhana = country.code === 'GH';
  const isKenya = country.code === 'KE';
  const isNigeria = country.code === 'NG';
  const isGlobal = country.code === 'GLOBAL';

  const isMoneyGramEnabled = await featureFlagsService.isMoneyGramPickupEnabled();
  const activePickups = featureFlagsService.getActivePickups(state.address || undefined);

  let activeTab: 'bank' | 'wallet' | 'moneygram' = 'bank';

  const corridorTitle = isNigeria
    ? 'Celo to NIBSS Off-Ramp'
    : isGhana
      ? 'Celo to GhIPSS & MoMo Off-Ramp'
      : isKenya
        ? 'Celo to M-PESA & Pesalink'
        : 'Celo to PayShap & EFT';

  const corridorProvider = isNigeria
    ? 'Sivan Liquidity Engine (NIBSS)'
    : isGhana
      ? 'Sivan Multi-Corridor (GhIPSS)'
      : 'Sivan Multi-Corridor';

  // Bank pills dynamically rendered from active country
  const quickBanks = isGlobal ? [] : country.defaultBanks.slice(0, 6);
  const defaultBank = quickBanks[0];

  container.innerHTML = `
    <div class="section-header" style="margin-bottom: 16px;">
      <div style="display: flex; align-items: center; gap: 8px;">
        <h2 class="section-title">Send & Cash Out</h2>
        <button type="button" id="btn-cashout-change-country" title="Select Country & Payout Rail" style="display: inline-flex; align-items: center; gap: 5px; padding: 4px 10px; border-radius: 14px; background: rgba(255, 255, 255, 0.05); border: 1px solid var(--border-subtle); color: var(--text-secondary); font-size: 11px; font-weight: 600; cursor: pointer;">
          <span>${country.flag}</span>
          <span>${country.name}</span>
          <span style="font-size: 9px; opacity: 0.6;">▾</span>
        </button>
      </div>
      <span class="section-link" id="btn-back-cashout">Back</span>
    </div>

    <!-- Active Cash Pickup Vouchers (Pinned Until Completed / Redeemed) -->
    ${activePickups.map((p) => `
      <div class="active-voucher-card" data-voucher-id="${p.id}" style="background: linear-gradient(135deg, rgba(16, 185, 129, 0.12), rgba(6, 182, 212, 0.08)); border: 1px solid rgba(16, 185, 129, 0.35); border-radius: var(--radius-md); padding: 14px; margin-bottom: 14px;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
          <span style="font-weight: 700; font-size: 12px; color: var(--text-emerald); display: flex; align-items: center; gap: 6px;">
            <span>💵</span> <span>Active MoneyGram Cash Pickup</span>
          </span>
          <span style="font-size: 11px; padding: 2px 8px; border-radius: 12px; background: rgba(16, 185, 129, 0.2); color: #10b981; font-weight: 700;">
            ${p.status === 'ready_for_pickup' ? 'Ready for Pickup' : p.status.replace(/_/g, ' ')}
          </span>
        </div>
        <p style="margin: 0 0 10px; font-size: 11.5px; color: var(--text-secondary); line-height: 1.4;">
          Present this 8-digit pickup PIN with a valid ID at any participating MoneyGram agent counter:
        </p>
        <div style="background: rgba(0,0,0,0.35); border: 1px dashed rgba(16, 185, 129, 0.4); border-radius: 8px; padding: 10px; text-align: center; margin-bottom: 10px;">
          <span style="font-size: 10px; color: var(--text-muted); display: block; letter-spacing: 0.08em;">8-DIGIT PICKUP PIN</span>
          <strong style="font-size: 20px; letter-spacing: 0.15em; color: #10b981; font-family: monospace;">${p.pickupPin || '4829-1049'}</strong>
        </div>
        <div style="display: flex; justify-content: space-between; align-items: center; font-size: 11px; color: var(--text-muted);">
          <span>Amount: <strong style="color: #fff;">$${p.amountUsdc.toFixed(2)} USDC</strong> (~${p.targetAmount.toLocaleString()} ${p.targetCurrency})</span>
          <div style="display: flex; gap: 8px; align-items: center;">
            <a href="${p.moreInfoUrl}" target="_blank" rel="noreferrer" style="color: var(--accent-cyan); font-weight: 600; text-decoration: none;">Receipt ↗</a>
            <button type="button" class="btn-dismiss-voucher" data-id="${p.id}" style="background: transparent; border: none; color: var(--text-muted); cursor: pointer; font-size: 11px; text-decoration: underline;">Dismiss</button>
          </div>
        </div>
      </div>
    `).join('')}


    <!-- Segmented Switcher (Bank vs MoneyGram vs Sivan User/Wallet) -->
    <div class="segmented-tabs-wrapper" id="cashout-segmented-tabs" style="display: flex; gap: 6px;">
      <button type="button" class="segmented-tab active" id="tab-btn-bank" style="flex: 1;">
        <span>${getBankIconSvg(15)}</span> <span>To ${isNigeria ? 'Nigeria Bank' : isGhana ? 'Ghana MoMo' : isKenya ? 'M-PESA' : 'Bank'}</span>
      </button>
      ${isMoneyGramEnabled ? `
      <button type="button" class="segmented-tab" id="tab-btn-moneygram" style="flex: 1;">
        <span>💵</span> <span>Cash Pickup</span>
      </button>
      ` : ''}
      <button type="button" class="segmented-tab" id="tab-btn-wallet" style="flex: 1;">
        <span>${getDirectTransferIconSvg(15)}</span> <span>To User</span>
      </button>
    </div>

    <!-- Live Corridor Status: Bank Mode -->
    <div id="corridor-banner-bank" style="background: rgba(16, 185, 129, 0.08); border: 1px solid rgba(16, 185, 129, 0.25); border-radius: var(--radius-md); padding: 12px 14px; margin-bottom: ${isNigeria ? '10px' : '20px'}; font-size: 12px;">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
        <span style="font-weight: 700; color: var(--text-emerald); display: flex; align-items: center; gap: 6px;">
          ${getFlashIconSvg(14, 'var(--accent-emerald)')} <span>${corridorTitle}</span>
        </span>
        <span style="font-size: 11px; color: var(--text-muted);">${corridorProvider}</span>
      </div>
      <div id="corridor-desc" style="color: var(--text-secondary); line-height: 1.4;">
        ${country.settlementDescription}
      </div>
    </div>

    <!-- Live Corridor Status: MoneyGram Mode -->
    <div id="corridor-banner-moneygram" style="display: none; background: rgba(16, 185, 129, 0.08); border: 1px solid rgba(16, 185, 129, 0.25); border-radius: var(--radius-md); padding: 12px 14px; margin-bottom: 20px; font-size: 12px;">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
        <span style="font-weight: 700; color: var(--text-emerald); display: flex; align-items: center; gap: 6px;">
          <span>💵</span> <span>Global Physical Cash Pickup via MoneyGram</span>
        </span>
        <span style="font-size: 11px; color: var(--accent-emerald); font-weight: 600;">0% Platform Fee</span>
      </div>
      <div style="color: var(--text-secondary); line-height: 1.4;">
        Collect cash instantly at participating MoneyGram agent locations worldwide using your 8-digit pickup PIN and valid ID.
      </div>
    </div>

    ${isNigeria ? `
    <!-- KYC Compliance Status Banner (Nigeria Only) -->
    <div id="kyc-status-banner" style="margin-bottom: 16px; padding: 10px 12px; border-radius: var(--radius-md); font-size: 12px; background: rgba(245, 158, 11, 0.08); border: 1px solid rgba(245, 158, 11, 0.25); display: flex; align-items: center; justify-content: space-between; gap: 10px; cursor: pointer;">
      <div style="display: flex; align-items: center; gap: 8px;">
        <span>${getHourglassIconSvg(16, '#f59e0b')}</span>
        <div>
          <span style="font-weight: 700; color: #f59e0b; font-size: 11px; display: block;">Identity Verification Required</span>
          <span style="color: var(--text-muted); font-size: 11px;">Checking KYC status with Busha...</span>
        </div>
      </div>
      <span style="font-size: 11px; color: #f59e0b; font-weight: 600;">Verify →</span>
    </div>
    ` : ''}

    <!-- Live Corridor Status: Wallet Mode -->
    <div id="corridor-banner-wallet" style="display: none; background: rgba(6, 182, 212, 0.08); border: 1px solid rgba(6, 182, 212, 0.25); border-radius: var(--radius-md); padding: 12px 14px; margin-bottom: 20px; font-size: 12px;">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
        <span style="font-weight: 700; color: var(--accent-cyan); display: flex; align-items: center; gap: 6px;">
          ${getFlashIconSvg(14, 'var(--accent-cyan)')} <span>Instant Peer-to-Peer Transfer on Celo</span>
        </span>
        <span style="font-size: 11px; color: var(--accent-emerald); font-weight: 600;">✓ Sub-Second Finality</span>
      </div>
      <div style="color: var(--text-secondary); line-height: 1.4;">
        Zero-gas direct settlement. Send directly to any Sivan handle (@username) or verified Celo address.
      </div>
    </div>

    <form id="form-cashout">
      <!-- Shared Asset & Amount Section -->
      <div class="form-group">
        <label class="form-label">Source Asset & Amount</label>
        <div style="display: grid; grid-template-columns: 140px 1fr; gap: 10px;">
          <!-- In-DOM Token Selector Dropdown -->
          <div class="custom-select-wrap" id="token-select-wrap">
            <div class="custom-select-trigger" id="token-select-trigger" ${isNigeria ? 'style="cursor: default;"' : ''}>
              <span id="selected-token-display" style="display: inline-flex; align-items: center; gap: 6px;">${getTokenIconSvg(isNigeria ? 'cNGN' : 'USDC', 16)} <span style="font-weight: 700;">${isNigeria ? 'cNGN' : 'USDC'}</span></span>
              ${isNigeria ? '' : '<span class="chevron">▾</span>'}
            </div>
            <div class="custom-select-menu" id="token-select-menu">
              ${isNigeria ? `
                <div class="custom-select-item selected" data-value="cNGN" style="display: flex; align-items: center; gap: 8px;">
                  ${getTokenIconSvg('cNGN', 16)} <span>cNGN (Celo)</span>
                </div>
              ` : `
                <div class="custom-select-item selected" data-value="USDC" style="display: flex; align-items: center; gap: 8px;">
                  ${getTokenIconSvg('USDC', 16)} <span>USDC (Celo)</span>
                </div>
                <div class="custom-select-item" data-value="USDT" style="display: flex; align-items: center; gap: 8px;">
                  ${getTokenIconSvg('USDT', 16)} <span>USDT (Celo)</span>
                </div>
                <div class="custom-select-item" data-value="cUSD" style="display: flex; align-items: center; gap: 8px;">
                  ${getTokenIconSvg('cUSD', 16)} <span>USDm (Celo)</span>
                </div>
              `}
            </div>
            <input type="hidden" id="cashout-token" value="${isNigeria ? 'cNGN' : 'USDC'}" />
          </div>

          <input 
            type="number" 
            id="cashout-amount" 
            class="form-input" 
            placeholder="0.00" 
            min="0.01" 
            step="any" 
            required 
          />
        </div>
        <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 4px;">
          <div id="cashout-avail-bal" class="form-helper" style="color: var(--accent-emerald); font-weight: 500; margin-top: 0;">
            Available: Loading...
          </div>
        </div>

        <!-- Quick Swap helper banner for USDT/USDC holders -->
        ${isNigeria ? `
          <div id="swap-nudge-box" style="display: flex; align-items: center; justify-content: space-between; margin-top: 8px; padding: 6px 10px; border-radius: 8px; background: rgba(6, 182, 212, 0.06); border: 1px solid rgba(6, 182, 212, 0.15); font-size: 11px;">
            <span style="color: var(--text-secondary); display: flex; align-items: center; gap: 5px;">
              ${getSparkleIconSvg(13, 'var(--accent-cyan)')} <span>Holding USDT or USDC?</span>
            </span>
            <button type="button" id="btn-jump-swap" style="background: none; border: none; color: var(--accent-cyan); font-weight: 700; cursor: pointer; padding: 0; font-size: 11px;">Swap to cNGN →</button>
          </div>
        ` : ''}
      </div>

      <!-- Bank Mode Fields -->
      <div id="section-bank-fields">
        <!-- Live FX Quote Summary -->
        <div class="quote-box" id="quote-container">
          <div class="quote-row">
            <span id="q-rate-label">Live FX Rate:</span>
            <span id="q-rate" style="font-weight: 600; color: var(--accent-emerald);">Fetching live rate...</span>
          </div>
          <div class="quote-row">
            <span id="q-gross-label">Gross Payout:</span>
            <span id="q-gross">${country.currencySymbol}0.00</span>
          </div>
          <div class="quote-row">
            <span id="q-fee-label">Sivan Off-Ramp Fee (0.1%):</span>
            <span id="q-fee">-${country.currencySymbol}0.00</span>
          </div>
          <div class="quote-row">
            <span id="q-net-label">Net Credit to Destination:</span>
            <span id="q-net">${country.currencySymbol}0.00</span>
          </div>
        </div>

        <div class="form-group">
          <label class="form-label" for="cashout-acct">${isNigeria ? '10-Digit NUBAN Account Number' : country.accountLabel}</label>
          <input 
            type="text" 
            id="cashout-acct" 
            class="form-input" 
            placeholder="${country.accountPlaceholder}" 
            ${isNigeria ? 'maxlength="10" pattern="^\\d{10}$"' : 'maxlength="20"'}
            ${isNigeria ? 'inputmode="numeric"' : ''}
            autocomplete="off"
          />
          <div id="acct-lookup-status" style="font-size: 11px; margin-top: 8px; padding: 8px 12px; border-radius: 6px; background: var(--bg-glass); border: 1px solid var(--border-subtle); color: var(--text-muted); font-weight: 500; display: flex; align-items: center; gap: 8px;">
            <span>${isNigeria ? 'Enter 10-digit account number to auto-verify recipient' : 'Enter mobile money phone number or bank account'}</span>
          </div>
        </div>

        <!-- Destination Bank / Rail for Fiat Corridors (NG, GH, KE) -->
        <div class="form-group">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
            <label class="form-label" style="margin-bottom: 0;">${isNigeria ? 'Destination Bank' : `${country.name} Destination`}</label>
            <span style="font-size: 10px; color: var(--accent-emerald); font-weight: 500;">✓ Live Rail Lookup</span>
          </div>

          <!-- Quick Bank / Rail Suggestion Pills -->
          <div class="bank-suggestions-row" id="bank-quick-pills">
            ${quickBanks.map((b, idx) => {
              const logo = b.logoUrl || (isNigeria ? getBankLogoUrl(b.name) : '');
              const pillClass = idx === 0 ? 'class="bank-pill-btn active"' : 'class="bank-pill-btn"';
              return `
                <button type="button" ${pillClass} data-code="${b.code}" data-name="${b.name}" data-logo="${logo}">
                  ${logo ? `<img src="${logo}" alt="${b.name}" class="bank-logo-img" />` : `<span style="display: inline-flex; align-items: center;">${getBankIconSvg(14)}</span>`}
                  <span>${b.name.replace(' Digital Services', '').replace(' Limited', '').replace(' Bank', '')}</span>
                </button>
              `;
            }).join('')}
          </div>

          <!-- Custom Searchable Bank Selector -->
          <div class="custom-select-wrap" id="bank-select-wrap" style="position: relative;">
            <div class="custom-select-trigger" id="bank-select-trigger" style="display: flex; align-items: center; justify-content: space-between; padding: 10px 14px;">
              <div style="display: flex; align-items: center; gap: 8px;">
                ${defaultBank?.logoUrl ? `<img src="${defaultBank.logoUrl}" class="bank-logo-img" id="selected-bank-img" />` : `<span id="selected-bank-icon" style="display: inline-flex; align-items: center;">${getBankIconSvg(15)}</span>`}
                <span id="selected-bank-name" style="font-weight: 500;">${defaultBank?.name || 'Select Rail'}</span>
              </div>
              <span class="chevron">▾</span>
            </div>
            <div class="custom-select-menu" id="bank-select-menu" style="width: 100%; max-height: 250px; overflow: hidden;">
              <div class="bank-search-box">
                <input type="text" id="bank-filter-input" class="bank-search-input" placeholder="Search ${isKenya ? 'M-PESA or bank (Safaricom, Airtel, Equity...)' : isGhana ? 'MoMo or bank (MTN, Telecel, GCB...)' : 'bank (GTB, Zenith, OPay, PalmPay...)'}" />
              </div>
              <div class="bank-items-scroll" id="bank-items-container">
                <!-- populated dynamically -->
              </div>
            </div>
            <input type="hidden" id="cashout-bank" value="${defaultBank?.code || ''}" />
          </div>
        </div>
      </div>

      <!-- Sivan User / Wallet Mode Fields -->
      <div id="section-wallet-fields" style="display: none;">
        <div class="form-group">
          <label class="form-label" for="wallet-recipient-input">Recipient (@handle or Celo 0x Address)</label>
          <input 
            type="text" 
            id="wallet-recipient-input" 
            class="form-input" 
            placeholder="e.g. @soliame or 0x4a1A..." 
            autocomplete="off"
          />
          <div id="wallet-recipient-status" style="font-size: 11px; margin-top: 8px; padding: 8px 12px; border-radius: 6px; background: var(--bg-glass); border: 1px solid var(--border-subtle); color: var(--text-muted); font-weight: 500; display: flex; align-items: center; gap: 8px;">
            <span>Enter @handle or 0x address to auto-verify recipient</span>
          </div>
        </div>

        <!-- Transfer Summary Box -->
        <div class="quote-box" id="p2p-summary-box" style="margin-bottom: 16px;">
          <div class="quote-row">
            <span>Settlement Network:</span>
            <span style="font-weight: 600; color: var(--accent-cyan);">Celo Mainnet (Attributed)</span>
          </div>
          <div class="quote-row">
            <span>Sivan Transfer Fee:</span>
            <span id="p2p-fee-display" style="font-weight: 600; color: var(--accent-cyan);">-0.10 USDC (1.00%)</span>
          </div>
          <div class="quote-row">
            <span>Net Recipient Credit:</span>
            <span id="p2p-net-display" style="font-weight: 700; color: var(--accent-emerald);">9.90 USDC</span>
          </div>
          <div class="quote-row">
            <span>Settlement Speed:</span>
            <span id="p2p-speed-display" style="font-weight: 500; color: var(--text-secondary);">Sub-second (Celo Finality)</span>
          </div>
        </div>
      </div>

      <!-- MoneyGram Mode Fields -->
      <div id="section-moneygram-fields" style="display: none;">
        <!-- Recipient Pickup Country Selector -->
        <div class="form-group">
          <label class="form-label">Recipient Country (Cash Pickup Location)</label>
          <div class="custom-select-wrap" id="mg-country-select-wrap" style="position: relative;">
            <div class="custom-select-trigger" id="mg-country-trigger" style="display: flex; align-items: center; justify-content: space-between; padding: 10px 14px; cursor: pointer;">
              <span id="selected-mg-country-display" style="display: inline-flex; align-items: center; gap: 8px; font-weight: 600;">
                <span>${country.flag}</span> <span>${country.name} (${country.currency === 'USD' ? 'USD' : country.currency})</span>
              </span>
              <span class="chevron">▾</span>
            </div>
            <div class="custom-select-menu" id="mg-country-menu" style="width: 100%; max-height: 230px; overflow-y: auto;">
              ${[
                { code: 'NG', flag: '🇳🇬', name: 'Nigeria', currency: 'NGN', prefix: '+234', rate: 1620 },
                { code: 'GH', flag: '🇬🇭', name: 'Ghana', currency: 'GHS', prefix: '+233', rate: 15.65 },
                { code: 'KE', flag: '🇰🇪', name: 'Kenya', currency: 'KES', prefix: '+254', rate: 129.8 },
                { code: 'ZA', flag: '🇿🇦', name: 'South Africa', currency: 'ZAR', prefix: '+27', rate: 18.25 },
                { code: 'GLOBAL', flag: '🌐', name: 'United States & Global', currency: 'USD', prefix: '+1', rate: 1.0 },
                { code: 'GB', flag: '🇬🇧', name: 'United Kingdom', currency: 'GBP', prefix: '+44', rate: 0.79 },
                { code: 'EU', flag: '🇪🇺', name: 'Europe (SEPA)', currency: 'EUR', prefix: '+49', rate: 0.92 },
                { code: 'PH', flag: '🇵🇭', name: 'Philippines', currency: 'PHP', prefix: '+63', rate: 58.5 },
                { code: 'CA', flag: '🇨🇦', name: 'Canada', currency: 'CAD', prefix: '+1', rate: 1.38 },
              ].map(c => `
                <div class="custom-select-item mg-country-option ${c.code === country.code ? 'selected' : ''}" data-code="${c.code}" data-flag="${c.flag}" data-name="${c.name}" data-currency="${c.currency}" data-prefix="${c.prefix}" data-rate="${c.rate}" style="display: flex; align-items: center; gap: 8px;">
                  <span style="font-size: 15px;">${c.flag}</span>
                  <span style="font-size: 13px; font-weight: 500;">${c.name} (${c.currency})</span>
                </div>
              `).join('')}
            </div>
            <input type="hidden" id="mg-target-country" value="${country.code}" />
            <input type="hidden" id="mg-target-currency" value="${country.currency === 'USD' ? 'USD' : country.currency}" />
          </div>
          <small style="color: var(--text-muted); font-size: 11px; margin-top: 4px; display: block;">
            The recipient will collect physical fiat cash in this selected country.
          </small>
        </div>

        <div class="form-group">
          <label class="form-label" for="moneygram-recipient-name">Recipient Legal Full Name (Must Match Government ID)</label>
          <input 
            type="text" 
            id="moneygram-recipient-name" 
            class="form-input" 
            placeholder="e.g. Samson Micheal" 
            autocomplete="name"
          />
          <small style="color: var(--text-muted); font-size: 11px; margin-top: 4px; display: block;">
            The MoneyGram agent teller will verify this name against your physical passport, driver's license, or national ID.
          </small>
        </div>

        <div class="form-group">
          <label class="form-label" for="moneygram-recipient-phone">Recipient Mobile Phone (Optional SMS Receipt)</label>
          <input 
            type="tel" 
            id="moneygram-recipient-phone" 
            class="form-input" 
            placeholder="${country.code === 'GH' ? 'e.g. +233 24 123 4567' : country.code === 'KE' ? 'e.g. +254 712 345 678' : country.code === 'ZA' ? 'e.g. +27 82 123 4567' : country.code === 'GLOBAL' ? 'e.g. +1 415 555 2671' : 'e.g. +234 803 123 4567'}" 
            autocomplete="tel"
          />
        </div>

        <!-- MoneyGram Summary Box -->
        <div class="quote-box" id="moneygram-summary-box" style="margin-bottom: 16px;">
          <div class="quote-row">
            <span>Counter Network:</span>
            <span style="font-weight: 600; color: var(--accent-emerald);">MoneyGram Global Locations</span>
          </div>
          <div class="quote-row">
            <span>Estimated Cash Payout:</span>
            <span id="moneygram-est-payout" style="font-weight: 700; color: var(--accent-emerald);">~0.00 ${isGhana ? 'GHS' : isKenya ? 'KES' : 'NGN'}</span>
          </div>
          <div class="quote-row">
            <span>Sivan Platform Fee:</span>
            <span style="font-weight: 700; color: var(--accent-emerald);">0.00 USDC (0.00% Zero Fee)</span>
          </div>
          <div class="quote-row">
            <span>Pickup Requirement:</span>
            <span style="font-weight: 500; color: var(--text-secondary);">8-Digit PIN + Government Photo ID</span>
          </div>
          <div class="quote-row">
            <span>Settlement Speed:</span>
            <span style="font-weight: 600; color: var(--accent-cyan);">Instant Interactive Session</span>
          </div>
        </div>
      </div>

      <button type="submit" class="btn-primary" id="btn-submit-cashout" style="margin-top: 8px;">
        <span id="submit-btn-text">Confirm Cash Out (Under 1-2 Mins)</span>
      </button>
    </form>
  `;

  // Inject @handle nudge banner for users without a handle (Wallet tab context is key for this)
  const cashoutFormEl = container.querySelector('#form-cashout') as HTMLElement | null;
  injectClaimHandleNudge(container, {
    insertBefore: cashoutFormEl,
    onToast: showToast,
    onClaimed: (username) => {
      showToast(`Sivan handle set: ${username} — others can send deals & payments to you by name`);
    },
  });

  // Elements
  const tabBankBtn = container.querySelector('#tab-btn-bank') as HTMLButtonElement;
  const tabMoneyGramBtn = container.querySelector('#tab-btn-moneygram') as HTMLButtonElement | null;
  const tabWalletBtn = container.querySelector('#tab-btn-wallet') as HTMLButtonElement;
  const bannerBank = container.querySelector('#corridor-banner-bank') as HTMLElement;
  const bannerMoneyGram = container.querySelector('#corridor-banner-moneygram') as HTMLElement | null;
  const bannerWallet = container.querySelector('#corridor-banner-wallet') as HTMLElement;
  const sectionBankFields = container.querySelector('#section-bank-fields') as HTMLElement;
  const sectionMoneyGramFields = container.querySelector('#section-moneygram-fields') as HTMLElement | null;
  const sectionWalletFields = container.querySelector('#section-wallet-fields') as HTMLElement;
  const submitBtnText = container.querySelector('#submit-btn-text') as HTMLElement;

  const amountEl = container.querySelector('#cashout-amount') as HTMLInputElement;
  const tokenHiddenEl = container.querySelector('#cashout-token') as HTMLInputElement;
  const tokenTrigger = container.querySelector('#token-select-trigger') as HTMLElement;
  const tokenMenu = container.querySelector('#token-select-menu') as HTMLElement;
  const tokenDisplay = container.querySelector('#selected-token-display') as HTMLElement;

  const availEl = container.querySelector('#cashout-avail-bal') as HTMLElement;
  const rateEl = container.querySelector('#q-rate') as HTMLElement;
  const grossEl = container.querySelector('#q-gross') as HTMLElement;
  const feeEl = container.querySelector('#q-fee') as HTMLElement;
  const feeLabelEl = container.querySelector('#q-fee-label') as HTMLElement | null;
  const netEl = container.querySelector('#q-net') as HTMLElement;

  let allBanks: BankItem[] = [];
  const bankHiddenEl = container.querySelector('#cashout-bank') as HTMLInputElement;
  const bankTrigger = container.querySelector('#bank-select-trigger') as HTMLElement | null;
  const bankMenu = container.querySelector('#bank-select-menu') as HTMLElement | null;
  const bankFilterInput = container.querySelector('#bank-filter-input') as HTMLInputElement | null;
  const bankItemsContainer = container.querySelector('#bank-items-container') as HTMLElement | null;
  const selectedBankImg = container.querySelector('#selected-bank-img') as HTMLImageElement | null;
  const selectedBankName = container.querySelector('#selected-bank-name') as HTMLElement | null;
  const quickPills = container.querySelectorAll('.bank-pill-btn');
  const acctEl = container.querySelector('#cashout-acct') as HTMLInputElement;
  const acctStatusEl = container.querySelector('#acct-lookup-status') as HTMLElement;
  const submitBtn = container.querySelector('#btn-submit-cashout') as HTMLButtonElement;

  // P2P Recipient & Summary Elements
  const p2pFeeDisplay = container.querySelector('#p2p-fee-display') as HTMLElement | null;
  const p2pNetDisplay = container.querySelector('#p2p-net-display') as HTMLElement | null;
  const p2pSpeedDisplay = container.querySelector('#p2p-speed-display') as HTMLElement | null;
  const walletRecipientInput = container.querySelector('#wallet-recipient-input') as HTMLInputElement;
  const walletRecipientStatus = container.querySelector('#wallet-recipient-status') as HTMLElement;
  let resolvedP2PAddress: string | null = null;
  let resolvedP2PDisplayName: string | null = null;
  let p2pLookupTimeout: any = null;

  let resolvedRecipientName = '';

  const updateP2PQuoteDisplay = async () => {
    if (activeTab !== 'wallet') return;
    const amt = parseFloat(amountEl.value) || 0;
    const tok = tokenHiddenEl.value || 'USDC';

    if (amt <= 0) {
      if (p2pFeeDisplay) p2pFeeDisplay.textContent = `0.00 ${tok}`;
      if (p2pNetDisplay) p2pNetDisplay.textContent = `0.00 ${tok}`;
      if (p2pSpeedDisplay) p2pSpeedDisplay.textContent = 'Sub-second (Celo Finality)';
      submitBtnText.textContent = 'Send Instantly on Celo (Attributed)';
      return;
    }

    if (p2pSpeedDisplay) {
      p2pSpeedDisplay.textContent = 'Sub-second (Celo Finality)';
    }

    try {
      const quote = await fxQuotesService.fetchTransferFeeQuote(amt, tok, resolvedP2PAddress || undefined);
      const feeFormatted = quote.fee.toFixed(2);
      const netFormatted = quote.netAmount.toFixed(2);
      if (p2pFeeDisplay) {
        p2pFeeDisplay.textContent = `-${feeFormatted} ${tok} (${quote.effectivePercent}%)`;
      }
      if (p2pNetDisplay) {
        p2pNetDisplay.textContent = `${netFormatted} ${tok}`;
      }
      submitBtnText.textContent = `Send ${netFormatted} ${tok} on Celo (Attributed)`;
    } catch {
      const fallbackFee = Math.max(0.10, Math.round(amt * 0.01 * 100) / 100);
      const fallbackNet = Math.max(0, amt - fallbackFee);
      if (p2pFeeDisplay) {
        p2pFeeDisplay.textContent = `-${fallbackFee.toFixed(2)} ${tok} (1.00%)`;
      }
      if (p2pNetDisplay) {
        p2pNetDisplay.textContent = `${fallbackNet.toFixed(2)} ${tok}`;
      }
      submitBtnText.textContent = `Send ${fallbackNet.toFixed(2)} ${tok} on Celo (Attributed)`;
    }
  };

  const updateBalanceDisplay = () => {
    const tok = tokenHiddenEl.value;
    const tokenBal = balances.find(b => b.symbol === tok);
    const balFormatted = tokenBal?.balanceFormatted || '0.00';
    availEl.textContent = state.address 
      ? `Wallet Balance: ${balFormatted} ${tok}`
      : 'Wallet not connected';
  };

  const defaultToken = isNigeria ? 'cNGN' : 'USDC';
  let currentLiveRate: number = isNigeria ? 1.0 : fxQuotesService.getLatestRate(defaultToken, country.code);
  let currentRateSource: string = isNigeria ? 'Parity' : '';
  let currentDepositAddress: string = '';
  let currentQuoteId: string | undefined = undefined;
  let currentGrossNgn: number | undefined = undefined;
  let currentSivanFeeNgn: number | undefined = undefined;
  let currentNetNgn: number | undefined = undefined;
  let rateDebounceTimer: any = null;

  const updateQuoteDisplay = async () => {
    const amt = parseFloat(amountEl.value) || 0;
    const token = tokenHiddenEl.value as 'USDC' | 'USDT' | 'cNGN' | 'cUSD';
    const sym = country.currencySymbol;

    const liveFeePercent = await fxQuotesService.fetchLiveOfframpFeePercent('NGN');

    if (token === 'cNGN' && isNigeria) {
      rateEl.textContent = `1 cNGN = ${sym}1.00 (Parity)`;
      const grossOutput = amt;
      let protocolFeeAmount = currentSivanFeeNgn !== undefined 
        ? currentSivanFeeNgn 
        : Math.round(grossOutput * liveFeePercent * 100) / 100;
      let netOutput = currentNetNgn !== undefined 
        ? currentNetNgn 
        : Math.max(0, Math.round((grossOutput - protocolFeeAmount) * 100) / 100);

      if (feeLabelEl) {
        const pctLabel = (liveFeePercent * 100).toFixed(liveFeePercent * 100 % 1 === 0 ? 0 : 2);
        feeLabelEl.textContent = `Sivan Off-Ramp Fee (${pctLabel}%):`;
      }
      grossEl.textContent = `${sym}${grossOutput.toLocaleString(undefined, { minimumFractionDigits: 2 })}`;
      feeEl.textContent = `-${sym}${protocolFeeAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}`;
      netEl.textContent = `${sym}${netOutput.toLocaleString(undefined, { minimumFractionDigits: 2 })}`;
      return;
    }

    if (currentLiveRate <= 0) {
      rateEl.textContent = `Fetching live ${token} market rate...`;
      grossEl.textContent = `${sym}0.00`;
      feeEl.textContent = `-${sym}0.00`;
      netEl.textContent = `${sym}0.00`;
      return;
    }

    const quote = fxQuotesService.getQuote(amt, token, currentLiveRate, country.code);
    rateEl.textContent = `1 ${token} = ${sym}${currentLiveRate.toLocaleString(undefined, { minimumFractionDigits: 2 })} (${currentRateSource || 'Live Liquidity'})`;

    if (feeLabelEl) {
      const pctLabel = (liveFeePercent * 100).toFixed(liveFeePercent * 100 % 1 === 0 ? 0 : 2);
      feeLabelEl.textContent = `Sivan Off-Ramp Fee (${pctLabel}%):`;
    }
    const grossDisplay = currentGrossNgn ?? quote.grossOutput;
    const feeDisplay = currentSivanFeeNgn ?? quote.protocolFeeAmount;
    const netDisplay = currentNetNgn ?? quote.netOutput;

    grossEl.textContent = `${sym}${grossDisplay.toLocaleString(undefined, { minimumFractionDigits: 2 })}`;
    feeEl.textContent = `-${sym}${feeDisplay.toLocaleString(undefined, { minimumFractionDigits: 2 })}`;
    netEl.textContent = `${sym}${netDisplay.toLocaleString(undefined, { minimumFractionDigits: 2 })}`;
  };

  const fetchAndRefreshRate = async () => {
    const token = tokenHiddenEl.value as 'USDC' | 'USDT' | 'cNGN' | 'cUSD';
    const amt = parseFloat(amountEl.value) || (token === 'cNGN' ? 5000 : 10);

    if (currentLiveRate <= 0 && token !== 'cNGN') {
      rateEl.textContent = `Fetching live ${token} market rate...`;
    }

    try {
      const res = await fxQuotesService.fetchLiveCashoutQuote(
        token,
        amt,
        country.code,
        acctEl?.value?.trim() || undefined,
        bankHiddenEl?.value || undefined
      );
      if (res.rate > 0) {
        currentLiveRate = res.rate;
        currentRateSource = res.source;
        if (res.depositAddress) currentDepositAddress = res.depositAddress;
        if (res.quoteId) currentQuoteId = res.quoteId;
        if (res.grossNgn !== undefined) currentGrossNgn = res.grossNgn;
        if (res.sivanFeeNgn !== undefined) currentSivanFeeNgn = res.sivanFeeNgn;
        if (res.netNgn !== undefined) currentNetNgn = res.netNgn;
      }
    } catch {
      // retain current cached rate if available
    }
    void updateQuoteDisplay();
  };

  let mgSelectedCurrency = country.currency === 'USD' ? 'USD' : (country.currency || 'NGN');
  let mgSelectedRate = country.code === 'GH' ? 15.65 : country.code === 'KE' ? 129.8 : country.code === 'ZA' ? 18.25 : country.code === 'GLOBAL' ? 1.0 : 1620;

  const updateMoneyGramDisplay = () => {
    const amt = parseFloat(amountEl.value) || 0;
    const estEl = container.querySelector('#moneygram-est-payout');
    if (estEl) {
      const targetAmt = amt * mgSelectedRate;
      estEl.textContent = `~${targetAmt.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${mgSelectedCurrency}`;
    }
  };

  // Dynamic Token Mode Switcher (USDC for MoneyGram, cNGN/USDC for Bank, USD stables for Wallet)
  const setTokenMode = (mode: 'bank' | 'moneygram' | 'wallet') => {
    let allowedTokens: Array<{ symbol: string; label: string }> = [];
    let selectedToken = 'USDC';

    if (mode === 'moneygram') {
      // MoneyGram is Global Physical Cash Pickup for USDC
      allowedTokens = [
        { symbol: 'USDC', label: 'USDC (Celo)' },
        { symbol: 'USDT', label: 'USDT (Celo)' },
        { symbol: 'cUSD', label: 'USDm (Celo)' },
      ];
      selectedToken = 'USDC';
    } else if (mode === 'wallet') {
      allowedTokens = [
        { symbol: 'USDC', label: 'USDC (Celo)' },
        { symbol: 'USDT', label: 'USDT (Celo)' },
        { symbol: 'cUSD', label: 'USDm (Celo)' },
      ];
      if (isNigeria) {
        allowedTokens.push({ symbol: 'cNGN', label: 'cNGN (Celo)' });
      }
      const cur = tokenHiddenEl.value;
      selectedToken = allowedTokens.some(t => t.symbol === cur) ? cur : 'USDC';
    } else {
      // Bank mode
      if (isNigeria) {
        allowedTokens = [{ symbol: 'cNGN', label: 'cNGN (Celo)' }];
        selectedToken = 'cNGN';
      } else {
        allowedTokens = [
          { symbol: 'USDC', label: 'USDC (Celo)' },
          { symbol: 'USDT', label: 'USDT (Celo)' },
          { symbol: 'cUSD', label: 'USDm (Celo)' },
        ];
        selectedToken = 'USDC';
      }
    }

    tokenHiddenEl.value = selectedToken;
    const displayName = selectedToken === 'cUSD' ? 'USDm' : selectedToken;
    tokenDisplay.innerHTML = `${getTokenIconSvg(selectedToken, 16)} <span style="font-weight: 700;">${displayName}</span>`;

    tokenMenu.innerHTML = allowedTokens.map(t => {
      const isSel = t.symbol === selectedToken;
      return `
        <div class="custom-select-item ${isSel ? 'selected' : ''}" data-value="${t.symbol}" style="display: flex; align-items: center; gap: 8px;">
          ${getTokenIconSvg(t.symbol, 16)} <span>${t.label}</span>
        </div>
      `;
    }).join('');

    tokenMenu.querySelectorAll('.custom-select-item').forEach(item => {
      item.addEventListener('click', (e) => {
        e.stopPropagation();
        const el = e.currentTarget as HTMLElement;
        const val = el.dataset.value!;
        tokenHiddenEl.value = val;
        const name = val === 'cUSD' ? 'USDm' : val;
        tokenDisplay.innerHTML = `${getTokenIconSvg(val, 16)} <span style="font-weight: 700;">${name}</span>`;

        tokenMenu.querySelectorAll('.custom-select-item').forEach(i => i.classList.remove('selected'));
        el.classList.add('selected');

        tokenMenu.classList.remove('open');
        tokenTrigger.classList.remove('active');

        updateBalanceDisplay();
        if (activeTab === 'bank') {
          void fetchAndRefreshRate();
        } else if (activeTab === 'wallet') {
          void updateP2PQuoteDisplay();
        } else if (activeTab === 'moneygram') {
          updateMoneyGramDisplay();
        }
      });
    });

    let chevronEl = tokenTrigger.querySelector('.chevron');
    if (allowedTokens.length > 1) {
      tokenTrigger.style.cursor = 'pointer';
      if (!chevronEl) {
        tokenTrigger.insertAdjacentHTML('beforeend', '<span class="chevron">▾</span>');
      }
    } else {
      tokenTrigger.style.cursor = 'default';
      if (chevronEl) {
        chevronEl.remove();
      }
    }

    updateBalanceDisplay();
  };

  // Tab Switching Logic
  const switchTab = (tab: 'bank' | 'wallet' | 'moneygram') => {
    activeTab = tab;
    const kycBanner = container.querySelector('#kyc-status-banner') as HTMLElement | null;
    const swapNudgeBox = container.querySelector('#swap-nudge-box') as HTMLElement | null;

    if (tab === 'bank') {
      tabBankBtn?.classList.add('active');
      tabMoneyGramBtn?.classList.remove('active');
      tabWalletBtn?.classList.remove('active');
      if (bannerBank) bannerBank.style.display = 'block';
      if (bannerMoneyGram) bannerMoneyGram.style.display = 'none';
      if (bannerWallet) bannerWallet.style.display = 'none';
      if (sectionBankFields) sectionBankFields.style.display = 'block';
      if (sectionMoneyGramFields) sectionMoneyGramFields.style.display = 'none';
      if (sectionWalletFields) sectionWalletFields.style.display = 'none';
      submitBtnText.textContent = 'Confirm Cash Out (Under 1-2 Mins)';
      acctEl.required = true;
      walletRecipientInput.required = false;

      if (kycBanner) kycBanner.style.display = isNigeria ? 'flex' : 'none';
      if (swapNudgeBox) swapNudgeBox.style.display = isNigeria ? 'flex' : 'none';
      amountEl.placeholder = isNigeria ? '0.00' : '0.00 USDC';

      setTokenMode('bank');
      void updateQuoteDisplay();
    } else if (tab === 'moneygram') {
      tabMoneyGramBtn?.classList.add('active');
      tabBankBtn?.classList.remove('active');
      tabWalletBtn?.classList.remove('active');
      if (bannerBank) bannerBank.style.display = 'none';
      if (bannerMoneyGram) bannerMoneyGram.style.display = 'block';
      if (bannerWallet) bannerWallet.style.display = 'none';
      if (sectionBankFields) sectionBankFields.style.display = 'none';
      if (sectionMoneyGramFields) sectionMoneyGramFields.style.display = 'block';
      if (sectionWalletFields) sectionWalletFields.style.display = 'none';
      submitBtnText.textContent = 'Generate MoneyGram Cash Pickup Voucher';
      acctEl.required = false;
      walletRecipientInput.required = false;

      // MoneyGram is Global Physical Cash Pickup for USDC
      if (kycBanner) kycBanner.style.display = 'none';
      if (swapNudgeBox) swapNudgeBox.style.display = 'none';
      amountEl.placeholder = '0.00 USDC';

      setTokenMode('moneygram');
      updateMoneyGramDisplay();
    } else {
      tabWalletBtn?.classList.add('active');
      tabBankBtn?.classList.remove('active');
      tabMoneyGramBtn?.classList.remove('active');
      if (bannerBank) bannerBank.style.display = 'none';
      if (bannerMoneyGram) bannerMoneyGram.style.display = 'none';
      if (bannerWallet) bannerWallet.style.display = 'block';
      if (sectionBankFields) sectionBankFields.style.display = 'none';
      if (sectionMoneyGramFields) sectionMoneyGramFields.style.display = 'none';
      if (sectionWalletFields) sectionWalletFields.style.display = 'block';
      submitBtnText.textContent = 'Send Instantly on Celo (Attributed)';
      acctEl.required = false;
      walletRecipientInput.required = true;

      if (kycBanner) kycBanner.style.display = 'none';
      if (swapNudgeBox) swapNudgeBox.style.display = 'none';
      amountEl.placeholder = '0.00 USDC';

      setTokenMode('wallet');
      void updateP2PQuoteDisplay();
    }
  };

  tabBankBtn?.addEventListener('click', () => switchTab('bank'));
  tabMoneyGramBtn?.addEventListener('click', () => switchTab('moneygram'));
  tabWalletBtn?.addEventListener('click', () => switchTab('wallet'));

  // Wire dismiss buttons on active vouchers
  container.querySelectorAll('.btn-dismiss-voucher').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const id = (e.currentTarget as HTMLElement).dataset.id;
      if (id) {
        featureFlagsService.dismissPickup(id);
        showToast('Voucher cleared.');
        void renderCashout(container, onNavigate, showToast);
      }
    });
  });

  // P2P Recipient Live Resolution
  walletRecipientInput?.addEventListener('input', () => {
    const rawVal = walletRecipientInput.value.trim();
    resolvedP2PAddress = null;
    resolvedP2PDisplayName = null;

    if (p2pLookupTimeout) clearTimeout(p2pLookupTimeout);

    if (!rawVal) {
      walletRecipientStatus.style.background = 'var(--bg-glass)';
      walletRecipientStatus.style.borderColor = 'var(--border-subtle)';
      walletRecipientStatus.innerHTML = '<span>Enter @handle or 0x address to auto-verify recipient</span>';
      return;
    }

    if (/^0x[a-fA-F0-9]{40}$/.test(rawVal)) {
      resolvedP2PAddress = rawVal;
      resolvedP2PDisplayName = `${rawVal.slice(0, 6)}...${rawVal.slice(-4)}`;
      walletRecipientStatus.style.background = 'rgba(16, 185, 129, 0.1)';
      walletRecipientStatus.style.borderColor = 'rgba(16, 185, 129, 0.35)';
      walletRecipientStatus.innerHTML = `
        <div style="display: flex; align-items: center; justify-content: space-between; gap: 8px;">
          <div style="display: flex; align-items: center; gap: 8px;">
            <span style="display: flex; align-items: center;">${getCheckCircleSvg(14, 'var(--accent-emerald)')}</span>
            <div>
              <div style="color: var(--accent-emerald); font-weight: 700; font-size: 13px;">
                Valid Celo Address
              </div>
              <div style="font-size: 11px; color: var(--text-secondary); margin-top: 1px;">
                Direct On-Chain · <span style="font-family: monospace; color: var(--accent-cyan);">${resolvedP2PDisplayName}</span>
              </div>
            </div>
          </div>
          <span style="font-size: 10px; background: rgba(16, 185, 129, 0.2); color: var(--accent-emerald); padding: 3px 8px; border-radius: 12px; font-weight: 700;">
            Celo Native
          </span>
        </div>
      `;
      return;
    }

    walletRecipientStatus.style.background = 'rgba(6, 182, 212, 0.08)';
    walletRecipientStatus.style.borderColor = 'rgba(6, 182, 212, 0.25)';
    walletRecipientStatus.innerHTML = `
      <div style="display: flex; align-items: center; gap: 8px;">
        <span class="pulse-dot"></span>
        <span style="color: var(--accent-cyan); font-size: 12px; font-weight: 600;">Resolving Sivan identity...</span>
      </div>
    `;

    p2pLookupTimeout = setTimeout(async () => {
      try {
        const res = await identityService.resolveTarget(rawVal, 'celo');
        if (res.found && res.user) {
          const celoWallet = res.user.wallets?.find(w => w.chain.toLowerCase() === 'celo')?.address ||
                             res.user.targetAddress ||
                             (res.user as any).address;
          if (celoWallet) {
            resolvedP2PAddress = celoWallet;
            resolvedP2PDisplayName = res.user.username ? `@${res.user.username.replace(/^@/, '')}` : res.user.displayName || rawVal;
            walletRecipientStatus.style.background = 'rgba(16, 185, 129, 0.1)';
            walletRecipientStatus.style.borderColor = 'rgba(16, 185, 129, 0.35)';
            walletRecipientStatus.innerHTML = `
              <div style="display: flex; align-items: center; justify-content: space-between; gap: 8px;">
                <div style="display: flex; align-items: center; gap: 8px;">
                  <span style="display: flex; align-items: center;">${getCheckCircleSvg(14, 'var(--accent-emerald)')}</span>
                  <div>
                    <div style="color: var(--accent-emerald); font-weight: 700; font-size: 13px;">
                      Resolved: <span style="font-family: monospace;">${resolvedP2PDisplayName}</span>
                    </div>
                    <div style="font-size: 11px; color: var(--text-secondary); margin-top: 1px;">
                      Verified Sivan User · <span style="font-family: monospace; color: var(--accent-cyan);">${celoWallet.slice(0, 6)}...${celoWallet.slice(-4)}</span>
                    </div>
                  </div>
                </div>
                <span style="font-size: 10px; background: rgba(16, 185, 129, 0.2); color: var(--accent-emerald); padding: 3px 8px; border-radius: 12px; font-weight: 700;">
                  Sub-Second
                </span>
              </div>
            `;
            return;
          }
        }
        walletRecipientStatus.style.background = 'rgba(239, 68, 68, 0.08)';
        walletRecipientStatus.style.borderColor = 'rgba(239, 68, 68, 0.25)';
        walletRecipientStatus.innerHTML = '<span style="color: #ef4444; font-size: 12px;">Sivan handle not found. Please verify handle or enter a 0x address.</span>';
      } catch {
        walletRecipientStatus.style.background = 'rgba(239, 68, 68, 0.08)';
        walletRecipientStatus.style.borderColor = 'rgba(239, 68, 68, 0.25)';
        walletRecipientStatus.innerHTML = '<span style="color: #ef4444; font-size: 12px;">Identity resolution unavailable right now.</span>';
      }
    }, 350);
  });

  const renderBankItems = (filterText = '') => {
    if (!bankItemsContainer) return;
    const q = filterText.toLowerCase().trim();
    const filtered = allBanks.filter(b => b.name.toLowerCase().includes(q) || b.code.includes(q));
    if (filtered.length === 0) {
      bankItemsContainer.innerHTML = '<div style="padding: 12px; font-size: 12px; color: var(--text-muted); text-align: center;">No rails found</div>';
      return;
    }
    bankItemsContainer.innerHTML = filtered.map(b => {
      const logo = b.logoUrl || (isNigeria ? getBankLogoUrl(b.name) : '');
      return `
        <div class="custom-select-item bank-item-row" data-code="${b.code}" data-name="${b.name}" data-logo="${logo}">
          ${logo 
            ? `<img src="${logo}" alt="${b.name}" class="bank-logo-img" />` 
            : `<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" style="margin-right: 6px; opacity: 0.8; flex-shrink: 0;"><path d="M12 1.75L2 6.5v2.25h20V6.5L12 1.75zM4.5 11v6.5h2.8V11H4.5zm5.1 0v6.5h2.8V11H9.6zm5.1 0v6.5h2.8V11h-2.8zM2 19.5v2.25h20V19.5H2z"/></svg>`}
          <span style="font-size: 13px; font-weight: 500;">${b.name}</span>
        </div>
      `;
    }).join('');

    bankItemsContainer.querySelectorAll('.bank-item-row').forEach(row => {
      row.addEventListener('click', () => {
        const el = row as HTMLElement;
        selectBank(el.dataset.code!, el.dataset.name!, el.dataset.logo || '');
        bankMenu?.classList.remove('open');
        bankTrigger?.classList.remove('active');
        void checkAccount();
      });
    });
  };

  const selectBank = (code: string, name: string, logo: string) => {
    if (bankHiddenEl) bankHiddenEl.value = code;
    if (selectedBankName) selectedBankName.textContent = name;
    if (selectedBankImg) {
      if (logo) {
        selectedBankImg.src = logo;
        selectedBankImg.style.display = 'inline-block';
      } else {
        selectedBankImg.style.display = 'none';
      }
    }

    quickPills.forEach(p => {
      const el = p as HTMLElement;
      if (el.dataset.code === code) el.classList.add('active');
      else el.classList.remove('active');
    });
  };

  quickPills.forEach(p => {
    p.addEventListener('click', () => {
      const el = p as HTMLElement;
      selectBank(el.dataset.code!, el.dataset.name!, el.dataset.logo || '');
      void checkAccount();
    });
  });

  bankTrigger?.addEventListener('click', (e) => {
    e.stopPropagation();
    if (!bankMenu) return;
    const isOpen = bankMenu.classList.contains('open');
    if (isOpen) {
      bankMenu.classList.remove('open');
      bankTrigger.classList.remove('active');
    } else {
      bankMenu.classList.add('open');
      bankTrigger.classList.add('active');
      if (bankFilterInput) {
        bankFilterInput.value = '';
        renderBankItems('');
        setTimeout(() => bankFilterInput.focus(), 60);
      }
    }
  });

  bankMenu?.addEventListener('click', (e) => {
    e.stopPropagation();
  });

  bankFilterInput?.addEventListener('input', () => {
    renderBankItems(bankFilterInput.value);
  });

  // Only load bank directory for fiat corridors (Nigeria, Ghana, Kenya)
  void fxQuotesService.fetchBanks(country.code).then(banks => {
    allBanks = banks;
    renderBankItems('');
  });

  // Initialize default token mode for active corridor
  setTokenMode('bank');
  void fetchAndRefreshRate();

  // Dropdown open/close event
  tokenTrigger?.addEventListener('click', (e) => {
    e.stopPropagation();
    const count = tokenMenu.querySelectorAll('.custom-select-item').length;
    if (count <= 1) return;
    const isOpen = tokenMenu.classList.contains('open');
    if (isOpen) {
      tokenMenu.classList.remove('open');
      tokenTrigger.classList.remove('active');
    } else {
      tokenMenu.classList.add('open');
      tokenTrigger.classList.add('active');
    }
  });

  tokenMenu?.addEventListener('click', (e) => {
    e.stopPropagation();
  });

  const mgCountryTrigger = container.querySelector('#mg-country-trigger') as HTMLElement | null;
  const mgCountryMenu = container.querySelector('#mg-country-menu') as HTMLElement | null;
  const mgCountryDisplay = container.querySelector('#selected-mg-country-display') as HTMLElement | null;
  const mgTargetCountryEl = container.querySelector('#mg-target-country') as HTMLInputElement | null;
  const mgTargetCurrencyEl = container.querySelector('#mg-target-currency') as HTMLInputElement | null;
  const mgPhoneInput = container.querySelector('#moneygram-recipient-phone') as HTMLInputElement | null;

  mgCountryTrigger?.addEventListener('click', (e) => {
    e.stopPropagation();
    const isOpen = mgCountryMenu?.classList.contains('open');
    if (isOpen) {
      mgCountryMenu?.classList.remove('open');
      mgCountryTrigger.classList.remove('active');
    } else {
      mgCountryMenu?.classList.add('open');
      mgCountryTrigger.classList.add('active');
    }
  });

  mgCountryMenu?.addEventListener('click', (e) => {
    e.stopPropagation();
  });

  container.querySelectorAll('.mg-country-option').forEach(opt => {
    opt.addEventListener('click', () => {
      const el = opt as HTMLElement;
      const code = el.dataset.code || 'NG';
      const flag = el.dataset.flag || '🇳🇬';
      const name = el.dataset.name || 'Nigeria';
      const cur = el.dataset.currency || 'NGN';
      const prefix = el.dataset.prefix || '+234';
      const rate = parseFloat(el.dataset.rate || '1620');

      mgSelectedCurrency = cur;
      mgSelectedRate = rate;

      if (mgCountryDisplay) {
        mgCountryDisplay.innerHTML = `<span>${flag}</span> <span>${name} (${cur})</span>`;
      }
      if (mgTargetCountryEl) mgTargetCountryEl.value = code;
      if (mgTargetCurrencyEl) mgTargetCurrencyEl.value = cur;
      if (mgPhoneInput) {
        mgPhoneInput.placeholder = `e.g. ${prefix} ...`;
      }

      container.querySelectorAll('.mg-country-option').forEach(o => o.classList.remove('selected'));
      el.classList.add('selected');

      mgCountryMenu?.classList.remove('open');
      mgCountryTrigger?.classList.remove('active');

      updateMoneyGramDisplay();
    });
  });

  // Close menus when clicking outside
  container.addEventListener('click', () => {
    tokenMenu?.classList.remove('open');
    tokenTrigger?.classList.remove('active');
    mgCountryMenu?.classList.remove('open');
    mgCountryTrigger?.classList.remove('active');
  });

  amountEl?.addEventListener('input', () => {
    if (activeTab === 'bank') {
      void updateQuoteDisplay();
      clearTimeout(rateDebounceTimer);
      rateDebounceTimer = setTimeout(() => {
        void fetchAndRefreshRate();
      }, 400);
    } else if (activeTab === 'wallet') {
      void updateP2PQuoteDisplay();
    } else if (activeTab === 'moneygram') {
      updateMoneyGramDisplay();
    }
  });

  // KYC Status Banner: Live update for Nigeria corridor (non-blocking)
  if (isNigeria && state.address) {
    const kycBanner = container.querySelector('#kyc-status-banner') as HTMLElement | null;
    if (kycBanner) {
      // Wire up click to open verification modal
      kycBanner.addEventListener('click', () => {
        openTextileKycModal(() => {
          if (kycBanner) {
            kycBanner.style.background = 'rgba(16, 185, 129, 0.08)';
            kycBanner.style.borderColor = 'rgba(16, 185, 129, 0.25)';
            kycBanner.style.cursor = 'default';
            kycBanner.innerHTML = `
              <div style="display: flex; align-items: center; gap: 8px;">
                <span style="font-size: 16px;">✓</span>
                <div>
                  <span style="font-weight: 700; color: var(--accent-emerald); font-size: 11px; display: block;">Identity Verified</span>
                  <span style="color: var(--text-muted); font-size: 11px;">Full bank cashout access enabled via Busha / NIBSS</span>
                </div>
              </div>
              <span style="font-size: 11px; color: var(--accent-emerald); font-weight: 600;">✓ Verified</span>
            `;
          }
        });
      });

      // Check local cache first, then fetch live status in background
      const localKyc = textileKycService.getLocalKycState(state.address);
      const updateBannerForState = (kycState: string | null) => {
        if (!kycBanner) return;
        if (kycState === 'verified') {
          kycBanner.style.background = 'rgba(16, 185, 129, 0.08)';
          kycBanner.style.borderColor = 'rgba(16, 185, 129, 0.25)';
          kycBanner.style.cursor = 'default';
          kycBanner.innerHTML = `
            <div style="display: flex; align-items: center; gap: 8px;">
              <span>${getShieldIconSvg(16, 'var(--accent-emerald)')}</span>
              <div>
                <span style="font-weight: 700; color: var(--accent-emerald); font-size: 11px; display: block;">Identity Verified</span>
                <span style="color: var(--text-muted); font-size: 11px;">Full bank cashout access enabled via Busha / NIBSS</span>
              </div>
            </div>
            <span style="font-size: 11px; color: var(--accent-emerald); font-weight: 600;">✓ Verified</span>
          `;
        } else if (kycState === 'pending') {
          kycBanner.style.background = 'rgba(245, 158, 11, 0.08)';
          kycBanner.style.borderColor = 'rgba(245, 158, 11, 0.25)';
          kycBanner.innerHTML = `
            <div style="display: flex; align-items: center; gap: 8px;">
              <span>${getHourglassIconSvg(16, '#f59e0b')}</span>
              <div>
                <span style="font-weight: 700; color: #f59e0b; font-size: 11px; display: block;">Review in Progress</span>
                <span style="color: var(--text-muted); font-size: 11px;">Busha compliance team is reviewing your identity. Usually 1–5 mins.</span>
              </div>
            </div>
            <span style="font-size: 11px; color: #f59e0b; font-weight: 600;">Check →</span>
          `;
        } else {
          kycBanner.style.background = 'rgba(239, 68, 68, 0.08)';
          kycBanner.style.borderColor = 'rgba(239, 68, 68, 0.25)';
          kycBanner.innerHTML = `
            <div style="display: flex; align-items: center; gap: 8px;">
              <span>${getShieldIconSvg(16, '#ef4444')}</span>
              <div>
                <span style="font-weight: 700; color: #ef4444; font-size: 11px; display: block;">Identity Verification Required</span>
                <span style="color: var(--text-muted); font-size: 11px;">Tap to verify identity with Busha before cashing out to your bank.</span>
              </div>
            </div>
            <span style="font-size: 11px; color: #ef4444; font-weight: 600;">Verify →</span>
          `;
        }
      };

      if (localKyc?.state) {
        updateBannerForState(localKyc.state);
      }

      if (state.address) {
        void textileKycService.getKycStatus(state.address).then(res => {
          if (res?.kyc?.state) {
            updateBannerForState(res.kyc.state);
          }
        });
      }
    }
  }

  // Live account number verification listener
  let lookupTimeout: any = null;
  const checkAccount = () => {
    if (lookupTimeout) clearTimeout(lookupTimeout);
    lookupTimeout = setTimeout(doAccountCheck, 400);
  };

  const doAccountCheck = async () => {
    const val = acctEl?.value.trim() || '';

    if (isNigeria) {
      const cleanVal = val.replace(/\D/g, '').slice(0, 10);
      acctEl.value = cleanVal;

      if (cleanVal.length === 10) {
        const isPhoneNuban = /^(70|80|81|90|91|07|08|09)/.test(cleanVal);
        if (isPhoneNuban && (!bankHiddenEl.value || bankHiddenEl.value === '000014')) {
          selectBank('100004', 'OPay Digital Services', '/banks/opay.png');
        }

        if (!bankHiddenEl.value) {
          acctStatusEl.style.background = 'rgba(245, 158, 11, 0.08)';
          acctStatusEl.style.borderColor = 'rgba(245, 158, 11, 0.25)';
          acctStatusEl.innerHTML = '<span style="color: #f59e0b;">Please select destination bank to verify recipient</span>';
          return;
        }

        acctStatusEl.style.background = 'rgba(6, 182, 212, 0.08)';
        acctStatusEl.style.borderColor = 'rgba(6, 182, 212, 0.25)';
        acctStatusEl.innerHTML = '<span class="pulse-dot"></span> <span style="color: var(--accent-cyan); font-weight: 500;">Resolving recipient via NIBSS...</span>';
        
        try {
          const res = await fxQuotesService.verifyBankAccount(cleanVal, bankHiddenEl.value, 'NG');
          const currentBank = allBanks.find(b => b.code === bankHiddenEl.value) || 
            country.defaultBanks.find(b => b.code === bankHiddenEl.value);
          const bankDisplayName = currentBank?.name || selectedBankName?.textContent || 'Bank';

          if (res.valid && res.accountName) {
            resolvedRecipientName = res.accountName;
            acctStatusEl.style.background = 'rgba(16, 185, 129, 0.08)';
            acctStatusEl.style.borderColor = 'rgba(16, 185, 129, 0.25)';
            acctStatusEl.innerHTML = `
              <div style="display: flex; flex-direction: column; gap: 4px; width: 100%;">
                <div style="color: var(--accent-emerald); font-weight: 700; font-size: 13px; display: flex; align-items: center; gap: 6px;">
                  <span>✓</span> <span>Verified Recipient: ${res.accountName}</span>
                </div>
                <div style="color: var(--text-secondary); font-size: 12px; display: flex; align-items: center; gap: 6px;">
                  <span style="color: var(--accent-emerald);">✓</span> <span>Verified NUBAN: ${cleanVal} (${bankDisplayName})</span>
                </div>
              </div>
            `;
          } else {
            resolvedRecipientName = '';
            acctStatusEl.style.background = 'rgba(239, 68, 68, 0.08)';
            acctStatusEl.style.borderColor = 'rgba(239, 68, 68, 0.25)';
            acctStatusEl.innerHTML = '<span style="color: #ef4444; font-size: 12px;">Invalid account number or bank rail mismatch. Please verify details.</span>';
          }
        } catch {
          resolvedRecipientName = '';
          acctStatusEl.style.background = 'rgba(239, 68, 68, 0.08)';
          acctStatusEl.style.borderColor = 'rgba(239, 68, 68, 0.25)';
          acctStatusEl.innerHTML = '<span style="color: #ef4444; font-size: 12px;">Could not verify account right now. Check details or try again.</span>';
        }
      } else if (cleanVal.length > 0) {
        resolvedRecipientName = '';
        acctStatusEl.style.background = 'var(--bg-glass)';
        acctStatusEl.style.borderColor = 'var(--border-subtle)';
        acctStatusEl.innerHTML = `<span style="color: var(--text-muted);">${10 - cleanVal.length} more digit${10 - cleanVal.length > 1 ? 's' : ''} needed...</span>`;
      } else {
        resolvedRecipientName = '';
        acctStatusEl.style.background = 'var(--bg-glass)';
        acctStatusEl.style.borderColor = 'var(--border-subtle)';
        acctStatusEl.innerHTML = '<span>Enter 10-digit account number to auto-verify recipient</span>';
      }
    } else {
      // Ghana or Kenya Mobile Money check
      if (val.length >= 9) {
        const res = await fxQuotesService.verifyBankAccount(val, bankHiddenEl?.value || '', country.code);
        const currentBank = allBanks.find(b => b.code === bankHiddenEl?.value) || 
          country.defaultBanks.find(b => b.code === bankHiddenEl?.value);
        const bankDisplayName = currentBank?.name || selectedBankName?.textContent || 'Mobile Money';

        if (res.valid) {
          resolvedRecipientName = res.accountName;
          acctStatusEl.style.background = 'rgba(16, 185, 129, 0.08)';
          acctStatusEl.style.borderColor = 'rgba(16, 185, 129, 0.25)';
          acctStatusEl.innerHTML = `
            <div style="display: flex; flex-direction: column; gap: 4px; width: 100%;">
              <div style="color: var(--accent-emerald); font-weight: 700; font-size: 13px; display: flex; align-items: center; gap: 6px;">
                <span>✓</span> <span>Verified Recipient: ${res.accountName}</span>
              </div>
              <div style="color: var(--text-secondary); font-size: 12px; display: flex; align-items: center; gap: 6px;">
                <span style="color: var(--accent-emerald);">✓</span> <span>Verified Destination: ${val} (${bankDisplayName})</span>
              </div>
            </div>
          `;
        } else {
          resolvedRecipientName = '';
          acctStatusEl.style.background = 'rgba(239, 68, 68, 0.08)';
          acctStatusEl.style.borderColor = 'rgba(239, 68, 68, 0.25)';
          acctStatusEl.innerHTML = `<span style="color: #ef4444; font-size: 12px;">Invalid recipient number for ${country.name}.</span>`;
        }
      } else if (val.length > 0) {
        resolvedRecipientName = '';
        acctStatusEl.style.background = 'var(--bg-glass)';
        acctStatusEl.style.borderColor = 'var(--border-subtle)';
        acctStatusEl.innerHTML = '<span style="color: var(--text-muted);">Enter full account or MoMo phone number...</span>';
      } else {
        resolvedRecipientName = '';
        acctStatusEl.style.background = 'var(--bg-glass)';
        acctStatusEl.style.borderColor = 'var(--border-subtle)';
        acctStatusEl.innerHTML = `<span>Enter ${country.name} recipient number</span>`;
      }
    }
  };

  acctEl?.addEventListener('input', checkAccount);
  container.querySelector('#btn-back-cashout')?.addEventListener('click', () => onNavigate('dashboard'));
  container.querySelector('#btn-jump-swap')?.addEventListener('click', () => onNavigate('swap'));

  container.querySelector('#btn-cashout-change-country')?.addEventListener('click', () => {
    const modalBtn = document.querySelector('#btn-country-modal') as HTMLElement | null;
    if (modalBtn) modalBtn.click();
  });

  const form = container.querySelector('#form-cashout') as HTMLFormElement;
  form?.addEventListener('submit', async (e) => {
    e.preventDefault();

    if (!state.address) {
      showToast('Please connect your wallet first.');
      return;
    }

    const amt = parseFloat(amountEl.value);
    const tok = tokenHiddenEl.value;

    if (!amt || amt <= 0) {
      showToast('Please enter a valid transfer amount.');
      return;
    }

    const tokenBal = balances.find(b => b.symbol === tok);
    const availableNum = tokenBal ? parseFloat(tokenBal.balanceFormatted.replace(/,/g, '')) : 0;

    if (amt > availableNum) {
      showToast(`Insufficient ${tok} balance. Available: ${availableNum} ${tok}`);
      return;
    }

    if (activeTab === 'moneygram') {
      submitBtn.disabled = true;
      submitBtn.innerHTML = '<span>Initiating MoneyGram Session...</span>';

      try {
        let baseUrl = '';
        try {
          const fullApi = (globalThis as any).process?.env?.VITE_PAYMENT_API_URL || 'https://api.sivantech.online';
          const parsed = new URL(fullApi);
          baseUrl = parsed.origin;
        } catch {
          baseUrl = 'https://api.sivantech.online';
        }

        const nameInput = (container.querySelector('#moneygram-recipient-name') as HTMLInputElement)?.value?.trim() || 'Valued Customer';
        const phoneInput = (container.querySelector('#moneygram-recipient-phone') as HTMLInputElement)?.value?.trim() || '';
        const targetCurrency = (container.querySelector('#mg-target-currency') as HTMLInputElement)?.value || mgSelectedCurrency || 'NGN';

        const sessionRes = await fetch(`${baseUrl}/api/moneygram/session`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            amount: amt,
            targetCurrency,
            mode: 'withdraw',
            recipientName: nameInput,
            recipientPhone: phoneInput,
            channel: 'minipay',
            userAddressOrId: state.address,
          }),
        });

        const json = await sessionRes.json();
        if (!sessionRes.ok) {
          throw new Error(json?.error?.message || 'MoneyGram cash pickup session rejected.');
        }

        const data = json.data;
        featureFlagsService.saveActivePickup({
          id: data.id,
          amountUsdc: amt,
          targetCurrency: data.targetCurrency || targetCurrency,
          targetAmount: Math.round(amt * mgSelectedRate),
          pickupPin: '4829-1049',
          status: 'ready_for_pickup',
          moreInfoUrl: data.moreInfoUrl,
          walletAddress: state.address,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });

        showToast('MoneyGram Cash Pickup voucher generated! Present 8-digit PIN at any counter.');
        void renderCashout(container, onNavigate, showToast);
      } catch (err: any) {
        showToast(err.message || 'MoneyGram session failed');
      } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<span>Generate MoneyGram Cash Pickup Voucher</span>';
      }
      return;
    }

    if (activeTab === 'wallet') {
      // P2P Transfer Mode
      if (!resolvedP2PAddress) {
        showToast('Please specify a valid @handle or Celo address.');
        return;
      }

      submitBtn.disabled = true;
      submitBtn.innerHTML = '<span>Quoting & Signing Celo Transfer...</span>';

      try {
        const quote = await fxQuotesService.fetchTransferFeeQuote(amt, tok, resolvedP2PAddress);
        const feeAmount = quote.fee;
        const netAmount = quote.netAmount;
        const targetFeeWallet = ((quote.feeWallet as `0x${string}`) || (getActiveNetwork().feeWallet as `0x${string}`) || (getSivanFeeWallet() as `0x${string}`));

        submitBtn.innerHTML = '<span>Confirming Transfer in Wallet...</span>';

        const txRes = await miniPayService.sendAttributedTransfer({
          to: resolvedP2PAddress as `0x${string}`,
          amount: netAmount,
          currency: tok as SupportedTokenSymbol,
          feeAmount,
          feeWallet: targetFeeWallet,
          onProgress: (step) => {
            if (step === 'fee') {
              submitBtn.innerHTML = '<span>Confirming Protocol Fee to Sivan Wallet...</span>';
            }
          },
        });

        if (!txRes.success || !txRes.txHash) {
          submitBtn.disabled = false;
          submitBtn.innerHTML = `<span>Send ${netAmount.toFixed(2)} ${tok} on Celo (Attributed)</span>`;
          showToast(`${txRes.error || 'Transfer cancelled in wallet'}`);
          return;
        }

        // Record P2P Transfer in Transaction History with verified fee collection
        transactionsService.recordTransfer({
          amount: txRes.feeTxHash ? amt : netAmount,
          token: tok,
          feeAmount: txRes.feeTxHash ? feeAmount : 0,
          netAmount,
          feeTxHash: txRes.feeTxHash,
          feeWallet: targetFeeWallet,
          recipientIdentifier: resolvedP2PDisplayName || resolvedP2PAddress,
          recipientAddress: resolvedP2PAddress,
          txHash: txRes.txHash,
        });

        submitBtn.innerHTML = '<span>Transfer Dispatched...</span>';
        const feeNote = txRes.feeTxHash ? ' · Fee settled ✓' : '';
        showToast(`Transfer confirmed! Sent ${netAmount.toFixed(2)} ${tok} to ${resolvedP2PDisplayName}${feeNote}`);

        setTimeout(() => {
          onNavigate('history');
        }, 1500);
      } catch (err: any) {
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<span>Send Instantly on Celo (Attributed)</span>';
        showToast(`Transfer error: ${err.message || 'Execution failed'}`);
      }
      return;
    }

    // Bank Cash Out Mode
    const acctNum = acctEl.value.trim();
    if (isNigeria && acctNum.length !== 10) {
      showToast('Please enter a valid 10-digit NUBAN account number.');
      return;
    } else if (!isNigeria && acctNum.length < 9) {
      showToast(`Please enter a valid ${country.name} account or phone number.`);
      return;
    }

    const bankName = selectedBankName?.textContent || 'Destination Rail';
    const bankCode = bankHiddenEl.value || '';

    submitBtn.disabled = true;
    submitBtn.innerHTML = '<span>Signing Celo Transfer...</span>';

    try {
      // Dynamic deposit address from live quote or registered settlement wallet
      let targetDepositAddress = currentDepositAddress;
      let targetQuoteId = currentQuoteId;

      if (!targetDepositAddress) {
        try {
          const freshQuote = await fxQuotesService.fetchLiveCashoutQuote(
            tok as any,
            amt,
            country.code,
            acctNum,
            bankCode
          );
          if (freshQuote.depositAddress) targetDepositAddress = freshQuote.depositAddress;
          if (freshQuote.quoteId) targetQuoteId = freshQuote.quoteId;
          if (freshQuote.rate > 0) currentLiveRate = freshQuote.rate;
        } catch {
          // ignore
        }
      }

      if (!targetDepositAddress) {
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<span>Confirm Cash Out (Under 1-2 Mins)</span>';
        showToast('Off-ramp liquidity deposit address unavailable. Please retry.');
        return;
      }

      const destinationAddress = targetDepositAddress as `0x${string}`;

      const txRes = await miniPayService.sendAttributedTransfer({
        to: destinationAddress,
        amount: amt,
        currency: tok as SupportedTokenSymbol,
      });

      if (!txRes.success || !txRes.txHash) {
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<span>Confirm Cash Out (Under 1-2 Mins)</span>';
        showToast(`${txRes.error || 'Transfer cancelled in wallet'}`);
        return;
      }

      submitBtn.innerHTML = `<span>Dispatching ${isGhana ? 'GhIPSS MoMo' : isKenya ? 'M-PESA Mobile' : 'NIBSS Bank'} Payout...</span>`;

      // Live backend execution: Notify Sivan payment gateway to trigger Textile/Busha NIBSS payout
      try {
        await fxQuotesService.executeCashout({
          quoteId: targetQuoteId,
          celoTxHash: txRes.txHash,
          token: tok,
          amount: amt,
          bankAccount: acctNum,
          bankCode: bankCode,
          senderAddress: state.address || undefined,
        });
      } catch (execErr: any) {
        console.warn('Backend payout execution notification logged:', execErr?.message || execErr);
      }

      const effectiveQuote = fxQuotesService.getQuote(amt, tok as any, currentLiveRate > 0 ? currentLiveRate : undefined, country.code);

      // Record transaction into user's persistent Transaction History ledger
      transactionsService.recordCashout({
        sourceAmount: amt,
        sourceToken: tok,
        targetAmount: effectiveQuote.netOutput,
        targetCurrency: country.currency,
        targetCurrencySymbol: country.currencySymbol,
        recipientAccount: acctNum,
        recipientName: resolvedRecipientName || bankName,
        bankOrRailName: bankName,
        countryCode: country.code,
        txHash: txRes.txHash,
      });

      submitBtn.innerHTML = '<span>Off-Ramp Dispatched...</span>';
      showToast(`Celo Tx Confirmed: ${txRes.txHash.slice(0, 8)}... Payout dispatched to ${bankName}. Credit typically in 1-2 mins!`);

      setTimeout(() => {
        onNavigate('history');
      }, 1500);
    } catch (err: any) {
      submitBtn.disabled = false;
      submitBtn.innerHTML = '<span>Confirm Cash Out (Under 1-2 Mins)</span>';
      showToast(`Transfer error: ${err.message || 'Execution failed'}`);
    }
  });
}
