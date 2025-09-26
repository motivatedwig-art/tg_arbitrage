import TelegramBot from 'node-telegram-bot-api';
export declare class KeyboardManager {
    static getMainMenuKeyboard(lng?: string): TelegramBot.InlineKeyboardMarkup;
    static getSettingsKeyboard(lng?: string): TelegramBot.InlineKeyboardMarkup;
    static getLanguageKeyboard(lng?: string): TelegramBot.InlineKeyboardMarkup;
    static getNotificationsKeyboard(lng?: string, enabled?: boolean): TelegramBot.InlineKeyboardMarkup;
    static getWebAppKeyboard(lng?: string): TelegramBot.InlineKeyboardMarkup;
}
//# sourceMappingURL=index.d.ts.map