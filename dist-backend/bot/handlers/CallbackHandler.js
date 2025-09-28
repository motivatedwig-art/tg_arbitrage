import { DatabaseManager } from '../../database/Database.js';
import { i18n } from '../../utils/i18n.js';
import { KeyboardManager } from '../keyboards/index.js';
export class CallbackHandler {
    constructor(bot) {
        this.bot = bot;
        this.db = DatabaseManager.getInstance();
    }
    registerCallbacks() {
        this.bot.on('callback_query', this.handleCallback.bind(this));
    }
    async handleCallback(query) {
        if (!query.data || !query.message)
            return;
        const chatId = query.message.chat.id;
        const messageId = query.message.message_id;
        const telegramId = query.from.id;
        const data = query.data;
        try {
            await this.bot.answerCallbackQuery(query.id);
            const user = await this.db.getUserModel().findByTelegramId(telegramId);
            const lng = user?.preferences.language || 'en';
            switch (data) {
                case 'subscription_management':
                    await this.handleSubscriptionManagementCallback(chatId, messageId, lng);
                    break;
                case 'settings':
                    await this.handleSettingsCallback(chatId, messageId, lng);
                    break;
                case 'language':
                    await this.handleLanguageCallback(chatId, messageId, lng);
                    break;
                case 'lang_en':
                    await this.handleLanguageChange(chatId, messageId, telegramId, 'en');
                    break;
                case 'lang_ru':
                    await this.handleLanguageChange(chatId, messageId, telegramId, 'ru');
                    break;
                case 'notifications':
                    await this.handleNotificationsCallback(chatId, messageId, lng, user?.preferences.notifications || false);
                    break;
                case 'notifications_enable':
                    await this.handleNotificationsToggle(chatId, messageId, telegramId, true);
                    break;
                case 'notifications_disable':
                    await this.handleNotificationsToggle(chatId, messageId, telegramId, false);
                    break;
                case 'refresh':
                    await this.handleRefreshCallback(chatId, messageId, lng);
                    break;
                case 'back_to_main':
                    await this.handleBackToMainCallback(chatId, messageId, lng);
                    break;
                default:
                    console.log('Unknown callback data:', data);
            }
        }
        catch (error) {
            console.error('Error handling callback:', error);
            const user = await this.db.getUserModel().findByTelegramId(telegramId);
            await this.bot.answerCallbackQuery(query.id, {
                text: i18n.t('errors.generic', user?.preferences.language || 'en'),
                show_alert: true
            });
        }
    }
    async handleSettingsCallback(chatId, messageId, lng) {
        const settingsMessage = i18n.t('commands.settings', lng);
        const keyboard = KeyboardManager.getSettingsKeyboard(lng);
        await this.bot.editMessageText(settingsMessage, {
            chat_id: chatId,
            message_id: messageId,
            reply_markup: keyboard
        });
    }
    async handleSubscriptionManagementCallback(chatId, messageId, lng) {
        const subscriptionMessage = lng === 'ru'
            ? "💳 Управление подпиской\n\nЭта функция будет доступна в ближайшее время."
            : "💳 Subscription Management\n\nThis feature will be available soon.";
        const keyboard = KeyboardManager.getMainMenuKeyboard(lng);
        await this.bot.editMessageText(subscriptionMessage, {
            chat_id: chatId,
            message_id: messageId,
            reply_markup: keyboard,
            parse_mode: 'HTML'
        });
    }
    async handleLanguageCallback(chatId, messageId, lng) {
        const languageMessage = i18n.t('buttons.choose_language', lng);
        const keyboard = KeyboardManager.getLanguageKeyboard(lng);
        await this.bot.editMessageText(languageMessage, {
            chat_id: chatId,
            message_id: messageId,
            reply_markup: keyboard
        });
    }
    async handleLanguageChange(chatId, messageId, telegramId, newLng) {
        console.log(`🔄 Changing language for user ${telegramId} to: ${newLng}`);
        await this.db.getUserModel().updateLanguage(telegramId, newLng);
        console.log(`✅ Language updated in database`);
        const confirmMessage = i18n.t('commands.language_changed', newLng);
        console.log(`📝 Confirmation message: ${confirmMessage}`);
        const keyboard = KeyboardManager.getMainMenuKeyboard(newLng);
        await this.bot.editMessageText(confirmMessage, {
            chat_id: chatId,
            message_id: messageId,
            reply_markup: keyboard,
            parse_mode: 'HTML'
        });
        console.log(`📤 Language change message sent`);
    }
    async handleNotificationsCallback(chatId, messageId, lng, currentStatus) {
        const notificationsMessage = `${i18n.t('buttons.notifications', lng)}\n\nCurrent status: ${currentStatus ? '🔔 Enabled' : '🔕 Disabled'}`;
        const keyboard = KeyboardManager.getNotificationsKeyboard(lng, currentStatus);
        await this.bot.editMessageText(notificationsMessage, {
            chat_id: chatId,
            message_id: messageId,
            reply_markup: keyboard
        });
    }
    async handleNotificationsToggle(chatId, messageId, telegramId, enable) {
        await this.db.getUserModel().updateNotifications(telegramId, enable);
        const user = await this.db.getUserModel().findByTelegramId(telegramId);
        const lng = user?.preferences.language || 'en';
        const message = enable
            ? i18n.t('commands.subscribe_enabled', lng)
            : i18n.t('commands.subscribe_disabled', lng);
        const keyboard = KeyboardManager.getSettingsKeyboard(lng);
        await this.bot.editMessageText(message, {
            chat_id: chatId,
            message_id: messageId,
            reply_markup: keyboard
        });
    }
    async handleRefreshCallback(chatId, messageId, lng) {
        // Get fresh arbitrage opportunities
        const opportunities = await this.db.getArbitrageModel().getTopOpportunities(5);
        let message = `🔄 ${i18n.t('table.loading', lng)}\n\n`;
        if (opportunities.length === 0) {
            message = i18n.t('table.no_opportunities', lng);
        }
        else {
            message = `${i18n.t('commands.top_opportunities', lng)}\n\n`;
            opportunities.forEach((opp, index) => {
                message += `${index + 1}. ${opp.symbol}\n`;
                message += `   📈 ${opp.profitPercentage.toFixed(2)}% profit\n`;
                message += `   💰 ${opp.buyExchange} → ${opp.sellExchange}\n`;
                message += `   💵 $${opp.buyPrice.toFixed(4)} → $${opp.sellPrice.toFixed(4)}\n\n`;
            });
        }
        const keyboard = KeyboardManager.getMainMenuKeyboard(lng);
        await this.bot.editMessageText(message, {
            chat_id: chatId,
            message_id: messageId,
            reply_markup: keyboard,
            parse_mode: 'HTML'
        });
    }
    async handleBackToMainCallback(chatId, messageId, lng) {
        const welcomeMessage = i18n.t('commands.start', lng);
        const keyboard = KeyboardManager.getMainMenuKeyboard(lng);
        await this.bot.editMessageText(welcomeMessage, {
            chat_id: chatId,
            message_id: messageId,
            reply_markup: keyboard,
            parse_mode: 'HTML'
        });
    }
}
//# sourceMappingURL=CallbackHandler.js.map