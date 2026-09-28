import { getCheckCircleSvg } from './ui-icons';

export interface DeliveryPreset {
  hours: number;
  label: string;
  days: number;
}

export const DELIVERY_DEADLINE_PRESETS: DeliveryPreset[] = [
  { hours: 12, days: 0.5, label: '12 Hours (Rush / Half Day)' },
  { hours: 24, days: 1, label: '24 Hours (1 Day)' },
  { hours: 48, days: 2, label: '48 Hours (2 Days)' },
  { hours: 72, days: 3, label: '72 Hours (3 Days)' },
  { hours: 120, days: 5, label: '5 Days (Business Week)' },
  { hours: 168, days: 7, label: '7 Days (1 Week)' },
  { hours: 336, days: 14, label: '14 Days (2 Weeks)' },
  { hours: 720, days: 30, label: '30 Days (1 Month)' },
];

export function formatDeadlineHours(hours: number): string {
  const match = DELIVERY_DEADLINE_PRESETS.find(p => p.hours === hours);
  if (match) return match.label;

  if (hours < 24) {
    return `${hours} Hours`;
  }
  const days = Math.round(hours / 24);
  return `${hours} Hours (${days} Day${days === 1 ? '' : 's'})`;
}

export type CountdownUrgency = 'safe' | 'warn' | 'urgent' | 'terminal';

export interface CountdownResult {
  label: string;
  urgency: CountdownUrgency;
  badgeClass: string;
  icon: string;
}

const SVG_TIMER = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block; vertical-align:-1px; flex-shrink:0;"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>`;
const SVG_REFUND = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block; vertical-align:-1px; flex-shrink:0;"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/></svg>`;
const SVG_DISPUTE = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block; vertical-align:-1px; flex-shrink:0;"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`;
const SVG_PACKAGE = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block; vertical-align:-1px; flex-shrink:0;"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>`;
const SVG_OVERDUE = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block; vertical-align:-1px; flex-shrink:0;"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>`;

export function getCountdownStatus(
  deadlineTimestamp: number,
  status: string,
  now = Date.now()
): CountdownResult {
  if (status === 'released') {
    return {
      label: 'Settled & Released',
      urgency: 'terminal',
      badgeClass: 'badge-released',
      icon: getCheckCircleSvg(12, 'var(--accent-emerald)'),
    };
  }

  if (status === 'refunded' || status === 'cancelled') {
    return {
      label: 'Refunded to Client',
      urgency: 'terminal',
      badgeClass: 'badge-refunded',
      icon: SVG_REFUND,
    };
  }

  if (status === 'declined') {
    return {
      label: 'Declined by Seller',
      urgency: 'terminal',
      badgeClass: 'badge-declined',
      icon: '❌',
    };
  }

  if (status === 'pending_seller_acceptance') {
    return {
      label: 'Awaiting Seller Acceptance',
      urgency: 'safe',
      badgeClass: 'badge-pending_acceptance',
      icon: '⏳',
    };
  }

  if (status === 'pending_payment') {
    return {
      label: 'Awaiting Payment',
      urgency: 'safe',
      badgeClass: 'badge-pending_payment',
      icon: '⏳',
    };
  }

  if (status === 'disputed') {
    return {
      label: 'Dispute Open',
      urgency: 'urgent',
      badgeClass: 'badge-disputed',
      icon: SVG_DISPUTE,
    };
  }

  if (status === 'delivered') {
    return {
      label: 'Delivered — Awaiting Release',
      urgency: 'safe',
      badgeClass: 'badge-delivered',
      icon: SVG_PACKAGE,
    };
  }

  if (!deadlineTimestamp || isNaN(deadlineTimestamp)) {
    return {
      label: 'Active Deal',
      urgency: 'safe',
      badgeClass: 'badge-in_progress',
      icon: SVG_TIMER,
    };
  }

  const diffMs = deadlineTimestamp - now;
  const diffHours = diffMs / (1000 * 60 * 60);

  if (diffHours > 24) {
    const days = Math.floor(diffHours / 24);
    const remHours = Math.floor(diffHours % 24);
    return {
      label: remHours > 0 ? `${days}d ${remHours}h remaining` : `${days} days remaining`,
      urgency: 'safe',
      badgeClass: 'badge-in_progress',
      icon: SVG_TIMER,
    };
  }

  if (diffHours > 0) {
    const hours = Math.floor(diffHours);
    const mins = Math.floor((diffHours - hours) * 60);
    if (hours === 0) {
      return {
        label: `Due in ${mins}m`,
        urgency: 'urgent',
        badgeClass: 'badge-urgent',
        icon: SVG_DISPUTE,
      };
    }
    return {
      label: `${hours}h ${mins > 0 ? `${mins}m ` : ''}remaining`,
      urgency: diffHours <= 6 ? 'urgent' : 'warn',
      badgeClass: diffHours <= 6 ? 'badge-urgent' : 'badge-warn',
      icon: diffHours <= 6 ? SVG_DISPUTE : SVG_TIMER,
    };
  }

  // Overdue
  const overdueHours = Math.abs(Math.floor(diffHours));
  if (overdueHours < 24) {
    return {
      label: `Overdue by ${overdueHours}h`,
      urgency: 'urgent',
      badgeClass: 'badge-overdue',
      icon: SVG_OVERDUE,
    };
  }
  const overdueDays = Math.floor(overdueHours / 24);
  return {
    label: `Overdue by ${overdueDays}d`,
    urgency: 'urgent',
    badgeClass: 'badge-overdue',
    icon: SVG_OVERDUE,
  };
}
