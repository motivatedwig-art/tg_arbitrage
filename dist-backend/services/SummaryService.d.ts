export declare class SummaryService {
    private static instance;
    private db;
    private confirmationService;
    private aiService;
    private constructor();
    static getInstance(): SummaryService;
    /**
     * Get opportunities from the last 4 hours
     */
    private getRecentOpportunities;
    /**
     * Get top 5 most profitable opportunities from recent data
     */
    private getTopOpportunities;
    /**
     * Format opportunity details for summary
     */
    private formatOpportunityDetails;
    /**
     * Generate 4-hour summary with confirmed opportunities and AI analysis
     */
    generate4HourSummary(): Promise<string>;
    /**
     * Calculate average profit from confirmed opportunities
     */
    private calculateAverageProfit;
    /**
     * Calculate maximum profit from confirmed opportunities
     */
    private calculateMaxProfit;
    /**
     * Calculate total volume from confirmed opportunities
     */
    private calculateTotalVolume;
    /**
     * Generate summary for Telegram message (with Markdown formatting)
     */
    generateTelegramSummary(): Promise<string>;
    /**
     * Get summary statistics for monitoring
     */
    getSummaryStats(): Promise<{
        totalOpportunities: number;
        confirmedOpportunities: number;
        averageProfit: number;
        maxProfit: number;
        totalVolume: number;
        confirmationRate: number;
    }>;
}
//# sourceMappingURL=SummaryService.d.ts.map