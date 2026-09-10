import TelegramBot from 'node-telegram-bot-api';
import { i18n } from '../../utils/i18n.js';
import { config } from '../../config/environment.js';

export class KeyboardManager {

  /**
   * Telegram rejects a web_app button whose url is empty, which would fail the
   * whole sendMessage call rather than just that button. config.webappUrl is ''
   * when WEBAPP_URL is unset and no Railway domain was detected, so the button
   * is omitted instead of being sent broken.
   */
  private static webAppButtonRows(lng: string): TelegramBot.InlineKeyboardButton[][] {
    if (!config.webappUrl) {
      console.warn('⚠️ [KEYBOARD] WEBAPP_URL is not configured - omitting the web app button');
      return [];
    }
    return [[
      { text: i18n.t('buttons.web_application', lng), web_app: { url: config.webappUrl } }
    ]];
  }


  public static getMainMenuKeyboard(lng: string = 'en'): TelegramBot.InlineKeyboardMarkup {
    // Debug logging to see what language is being used
    console.log(`🌐 Generating main menu keyboard for language: ${lng}`);
    console.log(`🔍 Subscription text: ${i18n.t('buttons.subscription_management', lng)}`);
    console.log(`🔍 Language text: ${i18n.t('buttons.language', lng)}`);
    console.log(`🔍 Web app text: ${i18n.t('buttons.web_application', lng)}`);
    
    return {
      inline_keyboard: [
        [
          { text: i18n.t('buttons.subscription_management', lng), callback_data: 'subscription_management' }
        ],
        [
          { text: i18n.t('buttons.language', lng), callback_data: 'language' }
        ],
        ...KeyboardManager.webAppButtonRows(lng)
      ]
    };
  }

  public static getSettingsKeyboard(lng: string = 'en'): TelegramBot.InlineKeyboardMarkup {
    return {
      inline_keyboard: [
        [
          { text: i18n.t('buttons.language', lng), callback_data: 'language' },
          { text: i18n.t('buttons.notifications', lng), callback_data: 'notifications' }
        ],
        [
          { text: i18n.t('buttons.back', lng), callback_data: 'back_to_main' }
        ]
      ]
    };
  }

  public static getLanguageKeyboard(lng: string = 'en'): TelegramBot.InlineKeyboardMarkup {
    return {
      inline_keyboard: [
        [
          { text: i18n.t('buttons.english', lng), callback_data: 'lang_en' },
          { text: i18n.t('buttons.russian', lng), callback_data: 'lang_ru' }
        ],
        [
          { text: i18n.t('buttons.back', lng), callback_data: 'back_to_main' }
        ]
      ]
    };
  }

  public static getNotificationsKeyboard(lng: string = 'en', enabled: boolean = false): TelegramBot.InlineKeyboardMarkup {
    return {
      inline_keyboard: [
        [
          { 
            text: enabled ? i18n.t('buttons.disable', lng) : i18n.t('buttons.enable', lng), 
            callback_data: enabled ? 'notifications_disable' : 'notifications_enable'
          }
        ],
        [
          { text: i18n.t('buttons.back', lng), callback_data: 'settings' }
        ]
      ]
    };
  }

  public static getWebAppKeyboard(lng: string = 'en'): TelegramBot.InlineKeyboardMarkup {
    if (!config.webappUrl) {
      console.warn('⚠️ [KEYBOARD] WEBAPP_URL is not configured - web app keyboard will be empty');
      return { inline_keyboard: [] };
    }

    return {
      inline_keyboard: [
        [
          {
            text: i18n.t('buttons.webapp', lng),
            web_app: { url: config.webappUrl }
          }
        ]
      ]
    };
  }
}
