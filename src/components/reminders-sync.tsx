import { useEffect } from 'react';

import { useAuth } from '@/lib/auth-context';
import { useMyDeals } from '@/lib/my-deals-context';
import { buildReminders, syncReminders } from '@/lib/reminders';

/** Keeps the phone's deadline reminders in step with the customer's
 * deals and Key Dates. Renders nothing. */
export function RemindersSync() {
  const { deals, isLoading } = useMyDeals();
  const { licenseExpires } = useAuth();

  // Rebuild only when the reminders themselves would change.
  const reminders = isLoading ? null : buildReminders(deals, licenseExpires);
  const signature = reminders ? JSON.stringify(reminders.map((r) => [r.date.getTime(), r.title, r.body])) : null;

  useEffect(() => {
    if (signature === null || reminders === null) return;
    syncReminders(reminders);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- keyed on the signature, not the array identity
  }, [signature]);

  return null;
}
