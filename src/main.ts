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
    renderHeader(this.headerContainer);
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
        <span class="nav-icon">🏠</span>
        <span>Home</span>
      </button>
      <button class="nav-item ${this.currentTab === 'deals' ? 'active' : ''}" data-tab="deals">
        <span class="nav-icon">🤝</span>
        <span>Deals</span>
      </button>
      <button class="nav-item ${this.currentTab === 'create' ? 'active' : ''}" data-tab="create">
        <span class="nav-icon">➕</span>
        <span>New Deal</span>
      </button>
      <button class="nav-item ${this.currentTab === 'history' ? 'active' : ''}" data-tab="history">
        <span class="nav-icon">📜</span>
        <span>History</span>
      </button>
      <button class="nav-item ${this.currentTab === 'cashout' ? 'active' : ''}" data-tab="cashout">
        <span class="nav-icon">🏦</span>
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
