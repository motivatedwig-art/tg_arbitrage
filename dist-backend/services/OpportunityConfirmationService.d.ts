import { ArbitrageOpportunity } from '../exchanges/types/index.js';
export interface ConfirmedOpportunity {
    opportunity: ArbitrageOpportunity;
    isConfirmed: boolean;
    confirmationData: {
        contractIdMatch: boolean;
        chainIdMatch: boolean;
        liquidityValid: boolean;
        volumeValid: boolean;
        dexScreenerData: any;
    };
    aiAnalysis?: string;
}
export declare class OpportunityConfirmationService {
    private static instance;
    private dexScreenerService;
    private tokenMetadataService;
    private aiAnalysisService;
    private constructor();
    static getInstance(): OpportunityConfirmationService;
    /**
     * Validate an opportunity against DexScreener (enabled by default).
     *
     * WARNING about the disabled branch below: with DEXSCREENER_ENABLED=false
     * there is no independent source to validate against, so it checks only that
     * the enriched fields are non-empty. That confirms the data exists, not that
     * it is correct - a fabricated contract address passes. Treat the results of
     * that branch as "present", never as "verified".
     */
    private validateWithDexScreener;
    /**
     * Normalize chain IDs for comparison
     */
    private normalizeChainId;
    /**
     * Check if opportunity is confirmed based on validation criteria
     */
    private isOpportunityConfirmed;
    /**
     * Confirm a single opportunity with DexScreener validation and AI analysis
     */
    confirmOpportunity(opportunity: ArbitrageOpportunity): Promise<ConfirmedOpportunity>;
    /**
     * Batch confirm multiple opportunities with parallel processing
     */
    batchConfirmOpportunities(opportunities: ArbitrageOpportunity[], maxParallel?: number): Promise<ConfirmedOpportunity[]>;
    /**
     * Get only confirmed opportunities from a batch
     */
    getConfirmedOpportunities(opportunities: ArbitrageOpportunity[]): Promise<ConfirmedOpportunity[]>;
    /**
     * Get confirmation statistics for monitoring
     */
    getConfirmationStats(opportunities: ArbitrageOpportunity[]): Promise<{
        total: number;
        confirmed: number;
        confirmationRate: number;
        averageValidationScore: number;
    }>;
}
//# sourceMappingURL=OpportunityConfirmationService.d.ts.map