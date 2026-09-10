import TelegramBot from 'node-telegram-bot-api';
export declare class KeyboardManager {
    /**
     * Telegram rejects a web_app button whose url is empty, which would fail the
     * whole sendMessage call rather than just that button. config.webappUrl is ''
     * when WEBAPP_URL is unset and no Railway domain was detected, so the button
     * is omitted instead of being sent broken.
     */
    private static webAppButtonRows;
    static getMainMenuKeyboard(lng?: string): TelegramBot.InlineKeyboardMarkup;
    static getSettingsKeyboard(lng?: string): TelegramBot.InlineKeyboardMarkup;
    static getLanguageKeyboard(lng?: string): TelegramBot.InlineKeyboardMarkup;
    static getNotificationsKeyboard(lng?: string, enabled?: boolean): TelegramBot.InlineKeyboardMarkup;
    static getWebAppKeyboard(lng?: string): TelegramBot.InlineKeyboardMarkup;
}
//# sourceMappingURL=index.d.ts.map