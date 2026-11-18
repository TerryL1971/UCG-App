import * as Notifications from 'expo-notifications';
import { AndroidImportance } from 'expo-notifications';
import { Platform } from 'react-native';

import { addDays, currentDeadline, formatDate, parseDate, vehicleLabel } from '@/lib/deal-flow';
import type { DealBundle } from '@/lib/deals';

/**
 * Reminders for the customer's deadlines (Terry, 2026-11-18 gap review):
 * the pay-by date, Cost Estimate expiry, the 5-day inspection guarantee,
 * the 550-175B's 90 days, registration expiry and USAREUR license expiry.
 *
 * Local notifications scheduled on the phone — no server, and they work
 * in Expo Go. They're rebuilt from scratch whenever the dates change, so
 * a ticked step or an edited date never leaves a stale reminder behind.
 */

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

interface Reminder {
  date: Date;
  title: string;
  body: string;
}

/** 9:00 in the morning on `day`. */
function at9(day: Date): Date {
  return new Date(day.getFullYear(), day.getMonth(), day.getDate(), 9, 0, 0);
}

export function buildReminders(deals: DealBundle[], licenseExpires: string | null, now: Date = new Date()): Reminder[] {
  const out: Reminder[] = [];
  const add = (day: Date, title: string, body: string) => {
    const date = at9(day);
    if (date.getTime() > now.getTime()) out.push({ date, title, body });
  };

  for (const { deal, milestones, files } of deals) {
    const car = vehicleLabel(deal);
    const deadline = currentDeadline(deal, milestones, now, files);
    if (deadline) {
      add(addDays(deadline.date, -1), `Tomorrow: ${deadline.title}`, `${car} — ${deadline.message}`);
      add(deadline.date, `Today: ${deadline.title}`, `${car} — ${deadline.message}`);
    }
    if (deal.registration_expires) {
      const exp = parseDate(deal.registration_expires);
      const body = `Your ${car}'s registration expires ${formatDate(exp)}. Renew it at the VRO in time.`;
      add(addDays(exp, -30), 'Registration expires in 30 days', body);
      add(addDays(exp, -7), 'Registration expires in a week', body);
    }
  }

  if (licenseExpires) {
    const exp = parseDate(licenseExpires);
    const body = `Your USAREUR driver's license expires ${formatDate(exp)}.`;
    add(addDays(exp, -30), 'License expires in 30 days', body);
    add(addDays(exp, -7), 'License expires in a week', body);
  }

  return out.sort((a, b) => a.date.getTime() - b.date.getTime());
}

/** Replaces every scheduled reminder with `reminders`. Asks for
 * permission only when there is something to remind about. */
export async function syncReminders(reminders: Reminder[]): Promise<void> {
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
    if (reminders.length === 0) return;

    let { status } = await Notifications.getPermissionsAsync();
    if (status === 'undetermined') ({ status } = await Notifications.requestPermissionsAsync());
    if (status !== 'granted') return;

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('deadlines', {
        name: 'Deadlines',
        importance: AndroidImportance.HIGH,
      });
    }

    // iOS keeps at most 64 pending; the soonest matter most.
    for (const r of reminders.slice(0, 60)) {
      await Notifications.scheduleNotificationAsync({
        content: { title: r.title, body: r.body },
        trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: r.date, channelId: 'deadlines' },
      });
    }
  } catch (error) {
    // Reminders are a convenience — never break the app over them.
    console.warn('Scheduling reminders failed:', error);
  }
}
