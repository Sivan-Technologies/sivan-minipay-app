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
      icon: '✅',
    };
  }

  if (status === 'refunded' || status === 'cancelled') {
    return {
      label: 'Refunded to Client',
      urgency: 'terminal',
      badgeClass: 'badge-refunded',
      icon: '↩️',
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
      icon: '⚠️',
    };
  }

  if (status === 'delivered') {
    return {
      label: 'Delivered — Awaiting Release',
      urgency: 'safe',
      badgeClass: 'badge-delivered',
      icon: '📦',
    };
  }

  if (!deadlineTimestamp || isNaN(deadlineTimestamp)) {
    return {
      label: 'Active Deal',
      urgency: 'safe',
      badgeClass: 'badge-in_progress',
      icon: '⏱',
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
      icon: '⏱',
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
        icon: '⚠️',
      };
    }
    return {
      label: `${hours}h ${mins > 0 ? `${mins}m ` : ''}remaining`,
      urgency: diffHours <= 6 ? 'urgent' : 'warn',
      badgeClass: diffHours <= 6 ? 'badge-urgent' : 'badge-warn',
      icon: diffHours <= 6 ? '⚠️' : '⏱',
    };
  }

  // Overdue
  const overdueHours = Math.abs(Math.floor(diffHours));
  if (overdueHours < 24) {
    return {
      label: `Overdue by ${overdueHours}h`,
      urgency: 'urgent',
      badgeClass: 'badge-overdue',
      icon: '🔴',
    };
  }
  const overdueDays = Math.floor(overdueHours / 24);
  return {
    label: `Overdue by ${overdueDays}d`,
    urgency: 'urgent',
    badgeClass: 'badge-overdue',
    icon: '🔴',
  };
}
