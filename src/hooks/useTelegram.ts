import { useEffect } from 'react';

declare global {
  interface Window {
    Telegram: any;
  }
}

export function useTelegram() {
  useEffect(() => {
    if (typeof window !== 'undefined' && window.Telegram?.WebApp) {
      const tg = window.Telegram.WebApp;
      tg.ready();
      tg.expand();
      tg.setHeaderColor('#0b0e12');
      tg.setBackgroundColor('#0b0e12');
    }
  }, []);

  const sendHaptic = (type: 'light' | 'medium' | 'heavy' | 'success' | 'warning' | 'error' = 'light') => {
    if (typeof window !== 'undefined' && window.Telegram?.WebApp?.HapticFeedback) {
      const haptic = window.Telegram.WebApp.HapticFeedback;
      if (['success', 'warning', 'error'].includes(type)) {
        haptic.notificationOccurred(type);
      } else {
        haptic.impactOccurred(type);
      }
    }
  };

  return {
    tg: typeof window !== 'undefined' ? window.Telegram?.WebApp : null,
    sendHaptic,
  };
}
