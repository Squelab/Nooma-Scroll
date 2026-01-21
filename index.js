// CRITICAL: This file MUST run BEFORE expo-router processes routes
// Lock the splash screen IMMEDIATELY, before any routes are evaluated
import * as SplashScreen from 'expo-splash-screen';
import * as SystemUI from 'expo-system-ui';

// Suppress keep awake errors from expo-router (internal to expo-router, non-critical)
// These errors are harmless and come from expo-router's internal keep awake functionality
if (typeof global !== 'undefined' && global.ErrorUtils) {
  const originalHandler = global.ErrorUtils.getGlobalHandler?.();
  if (global.ErrorUtils.setGlobalHandler) {
    global.ErrorUtils.setGlobalHandler((error, isFatal) => {
      const errorMessage = error?.message || error?.toString() || '';
      // Only suppress keep awake errors - let all other errors through
      if (errorMessage.includes('keep awake') || errorMessage.includes('keepAwake') || errorMessage.includes('Unable to activate keep awake')) {
        return; // Silently ignore keep awake errors
      }
      // Call original handler for all other errors
      if (originalHandler) {
        originalHandler(error, isFatal);
      }
    });
  }
}

// Set system UI background color to match app theme (prevents black flash on Android SDK 52)
// Delay slightly to ensure Android activity is ready (fixes "activity no longer available" error)
(async () => {
  try {
    // Small delay to ensure Android activity is ready
    await new Promise(resolve => setTimeout(resolve, 100));
    await SystemUI.setBackgroundColorAsync('#1A1B1E');
    if (__DEV__) {
      console.log('✅ System UI background color set to #1A1B1E');
    }
  } catch (error) {
    // Silently ignore - activity might not be ready yet, or app is closing
    // This is non-critical and happens during app lifecycle transitions
    const errorMessage = error?.message || error?.toString() || '';
    if (__DEV__ && !errorMessage.includes('no longer available')) {
      console.warn('⚠️ Failed to set system UI background color:', errorMessage);
    }
  }
})();

// Lock splash screen synchronously - this MUST happen before expo-router starts
// This prevents expo-router from auto-hiding the splash when it finds routes
SplashScreen.preventAutoHideAsync();

// Now import expo-router's entry point (this will execute it)
// The import happens AFTER preventAutoHideAsync, ensuring splash stays locked
import 'expo-router/entry-classic';
