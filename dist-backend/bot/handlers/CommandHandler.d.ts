import TelegramBot from 'node-telegram-bot-api';
export declare class CommandHandler {
    private bot;
    private db;
    constructor(bot: TelegramBot);
    registerCommands(): void;
    private getUserLanguage;
    private ensureUser;
    private handleStart;
    private handleHelp;
    private handleStatus;
    private handleSettings;
    private handleLanguage;
    private handleTop;
    private detectMockData;
    private handleSubscribe;
    private handleWebApp;
    private handleStats;
}
//# sourceMappingURL=CommandHandler.d.ts.map