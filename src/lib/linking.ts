import * as WebBrowser from 'expo-web-browser';
import { Alert, Linking } from 'react-native';

import { Colors } from '@/constants/theme';

/**
 * Hosts that must open in their own app, not the in-app browser: wa.me
 * hands off to WhatsApp (only reached now as the guest/no-account
 * fallback — logged-in customers use the private in-app chat), and the
 * maps links (src/lib/maps.ts) exist to start turn-by-turn directions,
 * which only the Maps app can do.
 */
const OPENS_EXTERNAL_APP = ['wa.me', 'maps.apple.com', 'www.google.com/maps'];

function opensInAppBrowser(url: string): boolean {
  if (!/^https?:\/\//i.test(url)) return false; // tel:, mailto:, etc.
  const rest = url.replace(/^https?:\/\//i, '');
  return !OPENS_EXTERNAL_APP.some((prefix) => rest.startsWith(prefix));
}

/**
 * Shared by every WhatsApp/external-link button in the app. Each one used
 * to just do `Linking.openURL(...).catch(() => {})` — if the open failed
 * (no network, WhatsApp not installed, an odd device state), the button
 * silently did nothing: no alert, no retry hint, at a moment a customer
 * is often already anxious about a big purchase (Terry, 2026-10-15,
 * catching a real pattern repeated across the app). This awaits the open
 * and surfaces a real, actionable alert on failure instead.
 *
 * Web pages (usedcarguys.net, the financing application, JKO, insurance,
 * booking pages, document PDFs) open in an in-app browser sheet —
 * SFSafariViewController on iOS, Chrome Custom Tabs on Android — with a
 * Done button back to exactly where the customer was, instead of
 * switching them out to Safari/Chrome (Terry, 2026-11-09: "anything that
 * takes the customer out of the app needs to be redone").
 */
export async function openUrlWithFeedback(url: string, failureMessage?: string): Promise<void> {
  try {
    if (opensInAppBrowser(url)) {
      await WebBrowser.openBrowserAsync(url, {
        controlsColor: Colors.navy,
        presentationStyle: WebBrowser.WebBrowserPresentationStyle.PAGE_SHEET,
        dismissButtonStyle: 'done',
      });
      return;
    }
    await Linking.openURL(url);
  } catch {
    Alert.alert('Could not open that', failureMessage ?? "Check your connection, then try again — nothing's happened yet.");
  }
}
