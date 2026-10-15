import { Alert, Linking } from 'react-native';

/**
 * Shared by every WhatsApp/external-link button in the app. Each one used
 * to just do `Linking.openURL(...).catch(() => {})` — if the open failed
 * (no network, WhatsApp not installed, an odd device state), the button
 * silently did nothing: no alert, no retry hint, at a moment a customer
 * is often already anxious about a big purchase (Terry, 2026-10-15,
 * catching a real pattern repeated across the app). This awaits the open
 * and surfaces a real, actionable alert on failure instead.
 */
export async function openUrlWithFeedback(url: string, failureMessage?: string): Promise<void> {
  try {
    await Linking.openURL(url);
  } catch {
    Alert.alert('Could not open that', failureMessage ?? "Check your connection, then try again — nothing's happened yet.");
  }
}
