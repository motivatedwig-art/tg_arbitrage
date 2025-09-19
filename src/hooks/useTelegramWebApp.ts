import { useEffect, useState } from 'react';
import { TelegramWebApp } from '../types';

export const useTelegramWebApp = () => {
  const [webApp, setWebApp] = useState<TelegramWebApp | null>(null);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const app = window.Telegram?.WebApp;
    if (app) {
      app.ready();
      app.expand();
      setWebApp(app);
      setUser(app.initDataUnsafe?.user);
      
      // Apply Telegram theme colors to CSS variables
      if (app.themeParams) {
        const root = document.documentElement;
        root.style.setProperty('--tg-theme-bg-color', app.themeParams.bg_color || '#ffffff');
        root.style.setProperty('--tg-theme-text-color', app.themeParams.text_color || '#000000');
        root.style.setProperty('--tg-theme-hint-color', app.themeParams.hint_color || '#999999');
        root.style.setProperty('--tg-theme-link-color', app.themeParams.link_color || '#3390ec');
        root.style.setProperty('--tg-theme-button-color', app.themeParams.button_color || '#3390ec');
        root.style.setProperty('--tg-theme-button-text-color', app.themeParams.button_text_color || '#ffffff');
      }
    }
  }, []);

  return { webApp, user, isReady: !!webApp };
};
