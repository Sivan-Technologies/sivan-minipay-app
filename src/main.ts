import './index.css';
import { renderHeader } from './components/Header';
import { renderDashboard } from './components/DashboardView';
import { renderCreateAgreement } from './components/CreateAgreementView';
import { renderAgreementsList } from './components/AgreementsListView';
import { renderCashout } from './components/CashoutView';
import { renderTransactionHistory } from './components/TransactionHistoryView';
import { miniPayService } from './services/minipay.service';
import { countryService } from './config/countries.config';

type Tab = 'dashboard' | 'deals' | 'create' | 'cashout' | 'history';

class SivanMiniPayApp {
  private currentTab: Tab = 'dashboard';
  private headerContainer!: HTMLElement;
  private mainContentContainer!: HTMLElement;
  private bottomNavContainer!: HTMLElement;
  private toastContainer!: HTMLElement;

  constructor() {
    this.initDOM();
    this.render();

    // Re-render views when wallet connects, disconnects, or switches accounts
    miniPayService.subscribe(() => {
      this.renderMainContent();
    });

    // Re-render views when user switches country / corridor
    countryService.subscribe(() => {
      this.renderMainContent();
    });
  }

  private initDOM() {
    const root = document.querySelector<HTMLDivElement>('#app')!;
    root.innerHTML = `
      <div id="header-root"></div>
      <main class="main-content" id="main-content-root"></main>
      <nav class="bottom-nav" id="bottom-nav-root"></nav>
      <div class="toast-container" id="toast-root"></div>
    `;

    this.headerContainer = root.querySelector('#header-root')!;
    this.mainContentContainer = root.querySelector('#main-content-root')!;
    this.bottomNavContainer = root.querySelector('#bottom-nav-root')!;
    this.toastContainer = root.querySelector('#toast-root')!;
  }

  public navigateTo(tab: Tab) {
    this.currentTab = tab;
    this.renderMainContent();
    this.renderBottomNav();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  public showToast(message: string) {
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.innerHTML = `
      <span style="font-size: 16px;">⚡</span>
      <div style="line-height: 1.3;">${message}</div>
    `;
    this.toastContainer.appendChild(toast);
    setTimeout(() => {
      toast.remove();
    }, 3800);
  }

  private render() {
    renderHeader(this.headerContainer, (msg) => this.showToast(msg));
    this.renderBottomNav();
    this.renderMainContent();
  }

  private renderMainContent() {
    this.mainContentContainer.innerHTML = '';

    switch (this.currentTab) {
      case 'dashboard':
        renderDashboard(this.mainContentContainer, (t) => this.navigateTo(t as Tab));
        break;
      case 'deals':
        renderAgreementsList(
          this.mainContentContainer,
          (t) => this.navigateTo(t as Tab),
          (msg) => this.showToast(msg)
        );
        break;
      case 'create':
        renderCreateAgreement(
          this.mainContentContainer,
          (t) => this.navigateTo(t as Tab),
          (msg) => this.showToast(msg)
        );
        break;
      case 'cashout':
        renderCashout(
          this.mainContentContainer,
          (t) => this.navigateTo(t as Tab),
          (msg) => this.showToast(msg)
        );
        break;
      case 'history':
        renderTransactionHistory(
          this.mainContentContainer,
          (t) => this.navigateTo(t as Tab)
        );
        break;
    }
  }

  private renderBottomNav() {
    this.bottomNavContainer.innerHTML = `
      <button class="nav-item ${this.currentTab === 'dashboard' ? 'active' : ''}" data-tab="dashboard">
        <span class="nav-icon">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 3L2 12h3v8c0 .55.45 1 1 1h4v-6h4v6h4c.55 0 1-.45 1-1v-8h3L12 3z"/>
          </svg>
        </span>
        <span>Home</span>
      </button>
      <button class="nav-item ${this.currentTab === 'deals' ? 'active' : ''}" data-tab="deals">
        <span class="nav-icon">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
            <path d="M21.5 9.5l-2.5-2.5c-.3-.3-.8-.3-1.1 0l-3.3 3.3c-.3.3-.3.8 0 1.1.3.3.8.3 1.1 0l2.7-2.7 1.4 1.4-3.5 3.5-1.4-1.4c-.3-.3-.8-.3-1.1 0l-2.5 2.5-2.8-2.8c.3-.3.3-.8 0-1.1l-2.5-2.5c-.3-.3-.8-.3-1.1 0L2.5 10.7c-.3.3-.3.8 0 1.1l5.3 5.3c.3.3.8.3 1.1 0l2.5-2.5 1.4 1.4c.3.3.8.3 1.1 0l4.6-4.6 2.5 2.5c.3.3.8.3 1.1 0l2.5-2.5c.3-.3.3-.8 0-1.1L21.5 9.5z"/>
          </svg>
        </span>
        <span>Deals</span>
      </button>
      <button class="nav-item ${this.currentTab === 'create' ? 'active' : ''}" data-tab="create">
        <span class="nav-icon">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
            <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V5h14v14zm-8-2h2v-4h4v-2h-4V7h-2v4H7v2h4v4z"/>
          </svg>
        </span>
        <span>New Deal</span>
      </button>
      <button class="nav-item ${this.currentTab === 'cashout' ? 'active' : ''}" data-tab="cashout">
        <span class="nav-icon">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 1.75L2 6.5v2.25h20V6.5L12 1.75zM4.5 11v6.5h2.8V11H4.5zm5.1 0v6.5h2.8V11H9.6zm5.1 0v6.5h2.8V11h-2.8zM2 19.5v2.25h20V19.5H2z"/>
          </svg>
        </span>
        <span>Cash Out</span>
      </button>
    `;

    this.bottomNavContainer.querySelectorAll('.nav-item').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const tab = (e.currentTarget as HTMLElement).dataset.tab as Tab;
        if (tab) this.navigateTo(tab);
      });
    });
  }
}

// Initialize on DOM ready
document.addEventListener('DOMContentLoaded', () => {
  new SivanMiniPayApp();
});
