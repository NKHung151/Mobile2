import { registerRootComponent } from 'expo';
import App from './App';

// Handle any errors during app initialization
if (!global.ErrorUtils) {
  global.ErrorUtils = {};
}

const originalHandler = global.ErrorUtils.setGlobalHandler || (() => {});

global.ErrorUtils.setGlobalHandler((error, isFatal) => {
  console.log('[AppEntry] Global Error Handler:', error, 'isFatal:', isFatal);
  // Don't crash the app, log and continue
  if (originalHandler) {
    originalHandler(error, isFatal);
  }
});

// Register app
try {
  registerRootComponent(App);
} catch (error) {
  console.log('[AppEntry] Error registering root component:', error);
  // Expo should handle this, but log it just in case
}
