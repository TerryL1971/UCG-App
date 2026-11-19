import { requireOptionalNativeModule } from 'expo';

interface UcgNativeModule {
  readText(uri: string): Promise<string[]>;
}

/**
 * The app's own native module (modules/ucg-native). Null in Expo Go,
 * which can't load custom native code; present in the EAS build.
 */
export const UcgNative = requireOptionalNativeModule<UcgNativeModule>('UcgNative');
