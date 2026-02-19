
export type HapticType = 'light' | 'medium' | 'heavy' | 'success' | 'warning' | 'error' | 'selection';

/**
 * Triggers haptic feedback on supported devices.
 * Uses navigator.vibrate pattern.
 */
export const triggerHaptic = (type: HapticType = 'selection') => {
  if (typeof navigator === 'undefined' || !navigator.vibrate) return;

  try {
    switch (type) {
      case 'selection':
        // Very subtle tick for UI interactions
        navigator.vibrate(10);
        break;
      case 'light':
        // Light impact for buttons
        navigator.vibrate(15);
        break;
      case 'medium':
        // Medium impact for toggles/important buttons
        navigator.vibrate(30);
        break;
      case 'heavy':
        // Heavy impact for destructive actions
        navigator.vibrate(50);
        break;
      case 'success':
        // Distinct double tap
        navigator.vibrate([10, 50, 20]);
        break;
      case 'warning':
        // Warning buzz
        navigator.vibrate([30, 50, 30]);
        break;
      case 'error':
        // Error vibration (triple buzz)
        navigator.vibrate([50, 50, 50, 50, 50]);
        break;
    }
  } catch (e) {
    // Ignore errors on devices that don't support vibration or restrict it
    console.debug('Haptic feedback failed', e);
  }
};
