// CRITICAL: This file MUST run BEFORE expo-router processes routes
// Lock the splash screen IMMEDIATELY, before any routes are evaluated
import * as SplashScreen from 'expo-splash-screen';
import * as SystemUI from 'expo-system-ui';

// Set system UI background color to match app theme (prevents black flash on Android SDK 52)
// This must happen BEFORE expo-router starts
// Use await to ensure it completes before React renders
(async () => {
  try {
    await SystemUI.setBackgroundColorAsync('#1A1B1E');
    if (__DEV__) {
      console.log('✅ System UI background color set to #1A1B1E');
    }
  } catch (error) {
    if (__DEV__) {
      console.warn('⚠️ Failed to set system UI background color:', error);
    }
  }
})();

// Lock splash screen synchronously - this MUST happen before expo-router starts
// This prevents expo-router from auto-hiding the splash when it finds routes
SplashScreen.preventAutoHideAsync();

// Now import expo-router's entry point (this will execute it)
// The import happens AFTER preventAutoHideAsync, ensuring splash stays locked
import 'expo-router/entry-classic';

