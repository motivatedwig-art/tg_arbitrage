import { i18n } from '../../utils/i18n.js';
export class KeyboardManager {
    static getMainMenuKeyboard(lng = 'en') {
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
                [
                    { text: i18n.t('buttons.web_application', lng), web_app: { url: process.env.WEBAPP_URL || 'https://tg-arbitrage.vercel.app' } }
                ]
            ]
        };
    }
    static getSettingsKeyboard(lng = 'en') {
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
    static getLanguageKeyboard(lng = 'en') {
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
    static getNotificationsKeyboard(lng = 'en', enabled = false) {
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
    static getWebAppKeyboard(lng = 'en') {
        return {
            inline_keyboard: [
                [
                    {
                        text: i18n.t('buttons.webapp', lng),
                        web_app: { url: process.env.WEBAPP_URL || 'https://tg-arbitrage.vercel.app' }
                    }
                ]
            ]
        };
    }
}
//# sourceMappingURL=index.js.map