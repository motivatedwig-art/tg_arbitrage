import { useTelegramWebApp } from './useTelegramWebApp';

export const useTelegramTheme = () => {
  const { webApp } = useTelegramWebApp();
  
  return {
    backgroundColor: webApp?.themeParams.bg_color || '#ffffff',
    textColor: webApp?.themeParams.text_color || '#000000',
    buttonColor: webApp?.themeParams.button_color || '#3390ec',
    buttonTextColor: webApp?.themeParams.button_text_color || '#ffffff',
    hintColor: webApp?.themeParams.hint_color || '#999999',
    linkColor: webApp?.themeParams.link_color || '#3390ec',
  };
};
