import { Platform } from 'react-native';

/**
 * A "get directions" deep link to whatever the OS treats as its default
 * maps app — Apple Maps on iOS, Google Maps (or whatever else handles
 * `geo:`) on Android, and a plain Google Maps search on web, where
 * there's no native app to hand off to.
 *
 * Uses the `maps.apple.com` universal link rather than the `maps://`
 * custom scheme on iOS — Apple Maps intercepts the https link
 * automatically, with no `LSApplicationQueriesSchemes` entry needed in
 * app.json the way a custom scheme would require for `Linking.canOpenURL`.
 */
export function directionsUrl(address: string): string {
  const query = encodeURIComponent(address);
  if (Platform.OS === 'ios') return `https://maps.apple.com/?daddr=${query}`;
  if (Platform.OS === 'android') return `geo:0,0?q=${query}`;
  return `https://www.google.com/maps/search/?api=1&query=${query}`;
}
