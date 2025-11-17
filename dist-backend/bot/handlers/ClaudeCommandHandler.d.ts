import TelegramBot from 'node-telegram-bot-api';
export declare class ClaudeCommandHandler {
    private bot;
    private db;
    private contractService;
    constructor(bot: TelegramBot);
    registerCommands(): void;
    private handleContractLookup;
    private getUserLanguage;
}
//# sourceMappingURL=ClaudeCommandHandler.d.ts.map