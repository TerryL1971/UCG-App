import type { DealServerState, DealSignal, DealSyncBackend, PaymentStatus } from './types';

/**
 * Stub. This is where a real DealerTeam / Salesforce integration lands —
 * see docs/salesforce-dealerteam-integration-plan.md (Phase 1b / 2 / 3):
 *
 *  - `getState()` / `subscribe()` — a backend proxy relays Salesforce
 *    Change Data Capture events (or a refresh-on-app-open poll) and maps a
 *    Sales Up / Deal / Appraisal record into a `DealServerState`.
 *  - `send()` — authenticated writes through that same proxy create or
 *    update the record (OAuth 2.0 Connected App; the Consumer Key/Secret
 *    live on the server, never in the app bundle).
 *
 * Nothing constructs this yet: `createDealSync()` only returns it when
 * `EXPO_PUBLIC_DEAL_SYNC === 'salesforce'`, which no environment sets.
 * The constructor throws on purpose so a misconfigured env fails loudly at
 * startup instead of surfacing as a mysterious render error later.
 */
export class SalesforceDealSync implements DealSyncBackend {
  constructor() {
    throw new Error(
      'SalesforceDealSync is not implemented — unset EXPO_PUBLIC_DEAL_SYNC or see docs/salesforce-dealerteam-integration-plan.md',
    );
  }

  getState(): DealServerState {
    throw new Error('SalesforceDealSync.getState is not implemented');
  }

  subscribe(): () => void {
    return () => {};
  }

  send(_signal: DealSignal): void {}

  reset(): void {}

  jumpToStep(_index: number): void {}

  setPaymentStatus(_status: PaymentStatus): void {}
}
