import { miniPayService } from '../services/minipay.service';
import type { MiniPayDetectionState } from '../types/minipay.types';

export function renderHeader(container: HTMLElement) {
  const update = (state: MiniPayDetectionState) => {
    const isLive = state.mode === 'live_minipay';
    const shortAddr = state.address 
      ? `${state.address.slice(0, 6)}...${state.address.slice(-4)}`
      : 'Connect';

    container.innerHTML = `
      <header class="app-header">
        <div class="brand-wrapper">
          <div class="brand-icon">S</div>
          <div class="brand-text">
            <h1>Sivan Ai <span class="brand-badge">MiniPay</span></h1>
            <div class="brand-tagline">Autonomous Service Agreements</div>
          </div>
        </div>

        <button class="header-status-pill" id="btn-toggle-evaluator" title="Click to toggle account mode">
          <span class="pulse-dot"></span>
          <span>${isLive ? 'MiniPay' : 'Evaluator'}</span>
          <span style="color: var(--text-muted); font-size: 11px;">(${shortAddr})</span>
        </button>
      </header>
    `;

    const toggleBtn = container.querySelector('#btn-toggle-evaluator');
    toggleBtn?.addEventListener('click', () => {
      miniPayService.toggleEvaluatorMode();
    });
  };

  miniPayService.subscribe(update);
}
