import { router } from 'expo-router';

/**
 * Back, or home to My Deal when there's nothing behind this screen — for
 * example when a ucg:// link opened it directly, where a plain
 * router.back() does nothing ("GO_BACK was not handled").
 */
export function goBack() {
  if (router.canGoBack()) router.back();
  else router.replace('/');
}
