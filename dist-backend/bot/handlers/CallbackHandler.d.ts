import TelegramBot from 'node-telegram-bot-api';
export declare class CallbackHandler {
    private bot;
    private db;
    constructor(bot: TelegramBot);
    registerCallbacks(): void;
    private handleCallback;
    private handleSettingsCallback;
    private handleSubscriptionManagementCallback;
    private handleLanguageCallback;
    private handleLanguageChange;
    private handleNotificationsCallback;
    private handleNotificationsToggle;
    private handleRefreshCallback;
    private handleBackToMainCallback;
}
//# sourceMappingURL=CallbackHandler.d.ts.map