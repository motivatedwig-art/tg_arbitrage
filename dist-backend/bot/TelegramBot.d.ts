import TelegramBot from 'node-telegram-bot-api';
import { ArbitrageOpportunity } from '../exchanges/types/index.js';
export declare class CryptoArbitrageBot {
    private bot;
    private db;
    private commandHandler;
    private callbackHandler;
    private isRunning;
    private summaryInterval;
    private highProfitDeals;
    constructor(token: string);
    private setupEnvironmentLogging;
    start(): Promise<void>;
    private startPolling;
    stop(): Promise<void>;
    private setupErrorHandling;
    private handleUnknownMessage;
    private setupBotCommands;
    collectHighProfitDeal(opportunity: ArbitrageOpportunity): void;
    private startSummaryInterval;
    private sendDailySummary;
    sendSystemNotification(message: string, isError?: boolean): Promise<void>;
    getBot(): TelegramBot;
    isRunningBot(): boolean;
}
//# sourceMappingURL=TelegramBot.d.ts.map