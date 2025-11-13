import TelegramBot from 'node-telegram-bot-api';
export declare class ClaudeCommandHandler {
    private bot;
    private db;
    constructor(bot: TelegramBot);
    registerCommands(): void;
    private getUserLanguage;
    private ensureUser;
    private getTopOpportunities;
    private handleAnalyze;
    private handleAI;
    getAIAnalysisForOpportunity(opportunity: any): Promise<string>;
    getCostMetrics(): {
        total_requests: number;
        cached_requests: number;
        estimated_cost: number;
        last_reset: number;
    };
    resetCostMetrics(): void;
}
//# sourceMappingURL=ClaudeCommandHandler.d.ts.map