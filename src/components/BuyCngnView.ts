import { getPaymentApiUrl } from '../config/api.config';
import { getActiveNetwork } from '../config/celo.config';
import { miniPayService } from '../services/minipay.service';
import { textileKycService } from '../services/textile-kyc.service';
import { BuyViewSession } from '../services/buy-view-session';

export async function renderBuyCngn(container: HTMLElement) {
  container.innerHTML = '<h3>Buy cNGN with naira</h3><p role="status">Checking availability…</p>';
  const status = container.querySelector('p')!;
  const wallet = miniPayService.getState().address;
  const network = getActiveNetwork();
  const active = () => container.isConnected && !container.hidden && container.contains(status);
  if (!wallet) { status.textContent = 'Connect your wallet to continue.'; return; }
  const storageKey = `sivan-buy-cngn:${network.chainId}:${wallet.toLowerCase()}`;
  // Browser storage is only a convenience; durable recovery belongs to the backend.
  const readSaved = () => { try { return JSON.parse(sessionStorage.getItem(storageKey) || 'null'); } catch { return null; } };
  const save = (value: unknown) => { try { sessionStorage.setItem(storageKey, JSON.stringify(value)); } catch { /* Backend recovery remains available. */ } };
  const clearSaved = () => { try { sessionStorage.removeItem(storageKey); } catch { /* No browser state to clear. */ } };
  const session = new BuyViewSession(active, () => `${miniPayService.getState().address?.toLowerCase()}:${getActiveNetwork().chainId}`);
  const stopPolling = () => session.stop();
  let provider = '';
  const current = () => {
    if (!active()) { stopPolling(); throw new Error('Buy view is no longer active.'); }
    if (miniPayService.getState().address?.toLowerCase() !== wallet.toLowerCase() || getActiveNetwork().chainId !== network.chainId) {
      stopPolling(); container.replaceChildren(status);
      status.textContent = 'Wallet or network changed. Reopen Buy cNGN.';
      throw new Error(status.textContent);
    }
  };
  const onError = (error: unknown) => {
    if (!active()) return;
    if (miniPayService.getState().address?.toLowerCase() !== wallet.toLowerCase() || getActiveNetwork().chainId !== network.chainId) container.replaceChildren(status);
    status.textContent = error instanceof Error ? error.message : 'Request failed';
  };
  const run = (action: () => Promise<void>) => session.run(async () => { current(); await action(); }, onError);
  function poll(action: () => Promise<void>, delay: number) {
    session.poll(async () => { current(); await action(); }, delay, onError);
  }
  async function request(path: string, body?: unknown, claim?: string) {
    current();
    try {
    const response = await fetch(`${getPaymentApiUrl()}${path}`, {
      method: body === undefined ? 'GET' : 'POST',
      headers: { 'Content-Type': 'application/json', ...(claim ? { 'X-Ramp-Claim': claim } : {}) },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: AbortSignal.timeout(30000),
    });
    const data = await response.json();
    current(); // A wallet, network or view may have changed while awaiting the response.
    if (!response.ok) throw Object.assign(new Error(typeof data.error === 'string' ? data.error : data.error?.message || 'Request failed. Please try again.'), { status: response.status, code: data.error?.code, details: data.error?.details, kyc: data.error?.kyc, providerError: data.error });
    return data;
    } finally { current(); }
  }
  async function identity() {
    current();
    let proof;
    try { proof = await textileKycService.getProof(wallet!, network.chainId); }
    finally { current(); }
    return { provider, wallet, chainId: network.chainId, proof };
  }
  function button(label: string, action: () => Promise<void>) {
    const element = document.createElement('button');
    element.className = 'btn-primary'; element.textContent = label;
    element.onclick = async () => {
      element.disabled = true;
      try { await run(action); }
      finally { element.disabled = false; }
    };
    container.append(element);
    return element;
  }
  function form(fields: Array<[string, string, string]>, label: string, submit: (form: HTMLFormElement) => Promise<void>) {
    const element = document.createElement('form');
    element.style.cssText = 'display:grid;gap:12px;min-width:0';
    for (const [name, title, type] of fields) {
      const wrapper = document.createElement('label'); wrapper.textContent = title;
      const input = document.createElement('input'); input.name = name; input.type = type; input.required = true; input.className = 'form-input';
      if (type === 'file') input.accept = 'image/jpeg,image/png';
      wrapper.append(input); element.append(wrapper);
    }
    const consent = document.createElement('label');
    const checkbox = document.createElement('input'); checkbox.type = 'checkbox'; checkbox.required = true;
    consent.append(checkbox, ' I accept the provider terms and consent to processing my details for this request.');
    const termsUrl = String(import.meta.env.VITE_TEXTILE_TERMS_URL || '');
    const terms = document.createElement('a');
    if (termsUrl && new URL(termsUrl).protocol === 'https:') {
      terms.href = termsUrl; terms.target = '_blank'; terms.rel = 'noopener noreferrer'; terms.textContent = 'Read terms';
      consent.append(' ', terms);
    } else {
      checkbox.disabled = true;
      status.textContent = 'Provider terms are not configured. Please contact support.';
    }
    element.append(consent);
    const send = document.createElement('button'); send.className = 'btn-primary'; send.textContent = label;
    send.disabled = checkbox.disabled;
    element.append(send); container.append(element);
    element.onsubmit = async event => {
      event.preventDefault(); send.disabled = true;
      try { await run(async () => { current(); await submit(element); }); }
      finally { send.disabled = false; }
    };
  }
  const reset = () => { current(); stopPolling(); container.replaceChildren(status); };
  async function recoverOrder(saved: any) {
    provider = saved.provider;
    if (saved.result) {
      const result = await request(`/api/v1/buy-cngn/orders/${encodeURIComponent(saved.result.transfer.id)}`, undefined, saved.result.claimToken);
      await showOrder(result.transfer, saved.result.claimToken); return;
    }
    reset();
    status.textContent = `A previous purchase attempt for ₦${saved.amount} has no confirmed response. Retry the same reference; do not make another payment.`;
    button('Retry the same purchase reference', async () => {
      const result = await request('/api/v1/buy-cngn/orders', { ...await identity(), amount: saved.amount, intentKey: saved.intentKey, acceptedTerms: true });
      await showOrder(result.transfer, result.claimToken);
    });
  }
  async function review(checkRecovery = true) {
    current(); stopPolling();
    status.textContent = 'Checking verification…';
    if (checkRecovery) {
      const recovered = await request('/api/v1/buy-cngn/orders/recover', await identity());
      if (recovered.orders?.length > 1) {
        reset();
        status.textContent = 'Choose a recent purchase to check its current status.';
        for (const saved of recovered.orders) button(`₦${saved.amount} · ${saved.result?.transfer.id || saved.intentKey}`, () => recoverOrder(saved));
        return;
      }
      if (recovered.orders?.[0]) { await recoverOrder(recovered.orders[0]); return; }
    }
    if (!provider) { reset(); status.textContent = `No previous purchase found. Buy cNGN is currently unavailable on ${network.chainName}.`; return; }
    const { kyc } = await request('/api/v1/cashout/kyc/status', await identity());
    reset();
    if (kyc?.state === 'verified' && kyc.canDeposit === true) {
      status.textContent = `Verified. Receive cNGN on ${network.chainName}. Payment instructions include the final amount and fees.`;
      form([['amount', 'You pay (NGN)', 'text']], 'Get bank payment instructions', async element => {
        const amount = String(new FormData(element).get('amount')).trim();
        if (!/^\d+(\.\d{1,2})?$/.test(amount) || Number(amount) <= 0) throw new Error('Enter a positive naira amount with up to two decimal places.');
        const saved = readSaved();
        if (saved?.id) throw new Error('An existing purchase needs review. Reopen Buy cNGN.');
        const intentKey = saved?.amount === amount ? saved.intentKey : crypto.randomUUID();
        save({ amount, intentKey });
        let result;
        try { result = await request('/api/v1/buy-cngn/orders', { ...await identity(), amount, intentKey, acceptedTerms: true }); }
        catch (error) {
          // Do not leave an editable new-order form after an uncertain response.
          if (active()) { reset(); button('Recover purchase before retrying', () => review()); }
          throw error;
        }
        save({ amount, intentKey, id: result.transfer.id, claim: result.claimToken });
        await showOrder(result.transfer, result.claimToken);
      });
    } else if (kyc?.state === 'pending' || kyc?.state === 'verified') {
      status.textContent = kyc.state === 'pending' ? 'Your identity is under review. No further submission is needed.' : 'Verified, but deposits are currently unavailable.';
      button('Check review status', () => review(false));
      if (kyc.state === 'pending') poll(() => review(false), 15000);
    } else if (!kyc) {
      status.textContent = 'First, complete your identity details.';
      form([['firstName','First name','text'],['lastName','Last name','text'],['email','Email','email'],['phone','Phone','tel'],['birthDate','Date of birth','date'],['line1','Residential address','text'],['city','City','text'],['state','State','text'],['postalCode','Postal code','text']], 'Save and continue', async element => {
        const fields = Object.fromEntries(new FormData(element)) as Record<string,string>;
        const result = await request('/api/v1/cashout/kyc/register', { ...await identity(), acceptedTerms: true, firstName: fields.firstName, lastName: fields.lastName, email: fields.email, phone: fields.phone, birthDate: fields.birthDate.split('-').reverse().join('-'), address: { line1: fields.line1, city: fields.city, state: fields.state, postalCode: fields.postalCode } });
        if (!result.customer?.hasProviderCustomer) throw new Error(result.customer?.rejectionReason || 'Registration is incomplete.');
        await review();
      });
    } else {
      status.textContent = ['Submit your national ID and a selfie for verification.', ...(kyc.rejectionReasons || [])].join(' ');
      form([['number','National ID number','text'],['front','National ID image (JPEG/PNG, max 4 MB)','file'],['selfie','Selfie (JPEG/PNG, max 4 MB)','file']], 'Submit for review', async element => {
        const fields = new FormData(element);
        async function encode(name: string) {
          const file = fields.get(name) as File;
          if (!file || file.size > 4 * 1024 * 1024 || !['image/jpeg','image/png'].includes(file.type)) throw new Error('Use JPEG or PNG images up to 4 MB.');
          return new Promise<string>((resolve, reject) => {
            const reader = new FileReader(); reader.onload = () => resolve(String(reader.result).split(',')[1]); reader.onerror = reject; reader.readAsDataURL(file);
          });
        }
        const imageFront = await encode('front'); const selfieImage = await encode('selfie');
        await request('/api/v1/cashout/kyc/submit', { ...await identity(), document: { type: 'national-id', number: fields.get('number'), imageFront }, selfieImage });
        element.reset(); await review();
      });
    }
  }
  async function showOrder(transfer: any, claim: string) {
    if (typeof transfer.provider === 'string') provider = transfer.provider;
    reset(); status.textContent = `Purchase status: ${transfer.status}`;
    const details = document.createElement('div'); details.style.overflowWrap = 'anywhere';
    const rows: Array<[string, unknown]> = [['Reference', transfer.id], ['You pay (NGN)', transfer.sourceAmount], ['You receive (cNGN)', transfer.targetAmount], ['Fee', transfer.feeLabel], ['Network', network.chainName]];
    if (transfer.status === 'AWAITING_FUNDS' && Date.parse(transfer.expiresAt) > Date.now()) {
      const bank = transfer.payIn?.recipient_details;
      rows.push(['Bank', bank?.bank_name], ['Account name', bank?.account_name], ['Account number', bank?.account_number], ['Pay before', transfer.expiresAt]);
    }
    if (transfer.payOut?.blockchain_hash) rows.push(['Transaction', transfer.payOut.blockchain_hash]);
    for (const [label, value] of rows) { const row = document.createElement('p'); row.textContent = `${label}: ${value ?? 'Unavailable'}`; details.append(row); }
    container.append(details);
    button('Refresh purchase status', async () => {
      const result = await request(`/api/v1/buy-cngn/orders/${encodeURIComponent(transfer.id)}`, undefined, claim);
      await showOrder(result.transfer, claim);
    });
    if (['COMPLETED', 'REFUNDED', 'CANCELLED'].includes(transfer.status)) {
      button('Start another purchase', async () => { clearSaved(); await review(false); });
    } else {
      poll(async () => {
        try {
          const result = await request(`/api/v1/buy-cngn/orders/${encodeURIComponent(transfer.id)}`, undefined, claim);
          await showOrder(result.transfer, claim);
        } catch (error) { details.replaceChildren(); throw error; }
      }, 10000);
    }
  }
  try {
    const saved = readSaved();
    if (saved?.id && saved.claim) {
      const result = await request(`/api/v1/buy-cngn/orders/${encodeURIComponent(saved.id)}`, undefined, saved.claim);
      await showOrder(result.transfer, saved.claim); return;
    }
    const result = await request(`/api/v1/buy-cngn/providers?chainId=${network.chainId}`);
    const available = result.providers?.find((item: any) => item.chainIds?.includes(network.chainId) && item.sides?.includes('buy'));
    provider = available?.provider || '';
    status.textContent = available ? 'Check your identity verification to continue.' : `New purchases are unavailable on ${network.chainName}. You can still recover an existing purchase.`;
    button(available ? 'Continue' : 'Recover previous purchase', () => review());
  } catch (error) {
    if (active()) {
      status.textContent = error instanceof Error ? error.message : 'Unable to load Buy cNGN';
      button('Recover previous purchases', () => review());
    }
  }
}
