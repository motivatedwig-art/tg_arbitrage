import { useEffect, useState, useCallback } from 'react';
import { TelegramWebApp, TelegramUser } from '../types';

export const useTelegramWebApp = () => {
  const [webApp, setWebApp] = useState<TelegramWebApp | null>(null);
  const [user, setUser] = useState<TelegramUser | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    try {
      // Check if running in Telegram
      if (typeof window === 'undefined') {
        setError('Not running in browser');
        return;
      }

      // Wait for Telegram WebApp to be available
      const checkTelegram = () => {
        if (window.Telegram?.WebApp) {
          const app = window.Telegram.WebApp;
          
          // Initialize the WebApp
          app.ready();
          app.expand();
          
          setWebApp(app);
          setUser(app.initDataUnsafe?.user || null);
          setIsReady(true);
          
          // Apply Telegram theme colors
          applyTelegramTheme(app);
          
          console.log('Telegram WebApp initialized:', {
            version: app.version,
            platform: app.platform,
            colorScheme: app.colorScheme,
            user: app.initDataUnsafe?.user
          });
          
        } else {
          // If not in Telegram, set development mode
          console.warn('Not running in Telegram WebApp - using development mode');
          setIsReady(true);
        }
      };

      // Check immediately
      checkTelegram();
      
      // If not found, wait a bit and try again
      if (!window.Telegram?.WebApp) {
        const timeout = setTimeout(checkTelegram, 100);
        return () => clearTimeout(timeout);
      }

    } catch (err) {
      console.error('Error initializing Telegram WebApp:', err);
      setError(err instanceof Error ? err.message : 'Failed to initialize Telegram WebApp');
    }
  }, []);

  const applyTelegramTheme = useCallback((app: TelegramWebApp) => {
    if (!app.themeParams) return;

    const root = document.documentElement;
    const theme = app.themeParams;
    
    // Apply theme variables with fallbacks
    root.style.setProperty('--tg-theme-bg-color', theme.bg_color || '#ffffff');
    root.style.setProperty('--tg-theme-text-color', theme.text_color || '#000000');
    root.style.setProperty('--tg-theme-hint-color', theme.hint_color || '#999999');
    root.style.setProperty('--tg-theme-link-color', theme.link_color || '#3390ec');
    root.style.setProperty('--tg-theme-button-color', theme.button_color || '#3390ec');
    root.style.setProperty('--tg-theme-button-text-color', theme.button_text_color || '#ffffff');
    root.style.setProperty('--tg-theme-secondary-bg-color', theme.secondary_bg_color || '#f1f1f1');
    root.style.setProperty('--tg-theme-header-bg-color', theme.header_bg_color || '#ffffff');
    root.style.setProperty('--tg-theme-accent-text-color', theme.accent_text_color || '#3390ec');
    root.style.setProperty('--tg-theme-section-bg-color', theme.section_bg_color || '#ffffff');
    root.style.setProperty('--tg-theme-section-header-text-color', theme.section_header_text_color || '#6d6d71');
    root.style.setProperty('--tg-theme-subtitle-text-color', theme.subtitle_text_color || '#999999');
    root.style.setProperty('--tg-theme-destructive-text-color', theme.destructive_text_color || '#ff3b30');

    // Apply background color to body
    document.body.style.backgroundColor = theme.bg_color || '#ffffff';
    document.body.style.color = theme.text_color || '#000000';
    
    // Set header color
    if (app.colorScheme === 'dark') {
      app.setHeaderColor(theme.secondary_bg_color || '#1c1c1d');
    } else {
      app.setHeaderColor(theme.bg_color || '#ffffff');
    }
  }, []);

  const hapticFeedback = useCallback((type: 'impact' | 'notification' | 'selection', style?: string) => {
    if (!webApp?.HapticFeedback) return;

    try {
      switch (type) {
        case 'impact':
          webApp.HapticFeedback.impactOccurred(style as any || 'medium');
          break;
        case 'notification':
          webApp.HapticFeedback.notificationOccurred(style as any || 'success');
          break;
        case 'selection':
          webApp.HapticFeedback.selectionChanged();
          break;
      }
    } catch (err) {
      console.warn('Haptic feedback error:', err);
    }
  }, [webApp]);

  const showMainButton = useCallback((text: string, onClick: () => void) => {
    if (!webApp?.MainButton) return;

    webApp.MainButton.setText(text);
    webApp.MainButton.onClick(onClick);
    webApp.MainButton.show();
  }, [webApp]);

  const hideMainButton = useCallback(() => {
    if (!webApp?.MainButton) return;
    webApp.MainButton.hide();
  }, [webApp]);

  const showBackButton = useCallback((onClick: () => void) => {
    if (!webApp?.BackButton) return;

    webApp.BackButton.onClick(onClick);
    webApp.BackButton.show();
  }, [webApp]);

  const hideBackButton = useCallback(() => {
    if (!webApp?.BackButton) return;
    webApp.BackButton.hide();
  }, [webApp]);

  const closeApp = useCallback(() => {
    if (!webApp) return;
    webApp.close();
  }, [webApp]);

  return {
    webApp,
    user,
    isReady,
    error,
    hapticFeedback,
    showMainButton,
    hideMainButton,
    showBackButton,
    hideBackButton,
    closeApp,
    // Helper properties
    isTelegramWebApp: !!webApp,
    colorScheme: webApp?.colorScheme || 'light',
    platform: webApp?.platform || 'unknown'
  };
};
