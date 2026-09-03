import { MockDealSync } from './mock-deal-sync';
import { SalesforceDealSync } from './salesforce-deal-sync';
import type { DealSyncBackend } from './types';

/**
 * The one swap point. Everything in the app talks to the `DealSyncBackend`
 * interface, never a concrete class — so flipping this env var (or
 * replacing this function outright) is the entire app-side code change to
 * go live against DealerTeam. See docs/salesforce-dealerteam-integration-plan.md.
 */
export function createDealSync(): DealSyncBackend {
  if (process.env.EXPO_PUBLIC_DEAL_SYNC === 'salesforce') {
    return new SalesforceDealSync();
  }
  return new MockDealSync();
}
