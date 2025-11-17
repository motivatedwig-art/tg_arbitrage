/**
 * TypeScript handler for /contracts and /api_stats commands
 * Integrates with Python contract resolver via subprocess
 */
import TelegramBot from 'node-telegram-bot-api';
export declare class ContractsCommandHandler {
    private bot;
    private db;
    constructor(bot: TelegramBot);
    registerCommands(): void;
    private getUserLanguage;
    private handleContractsCommand;
    private handleApiStatsCommand;
}
//# sourceMappingURL=ContractsCommandHandler.d.ts.map