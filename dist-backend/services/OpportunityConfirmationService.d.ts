import { ArbitrageOpportunity } from '../exchanges/types/index.js';
export interface ConfirmedOpportunity {
    opportunity: ArbitrageOpportunity;
    isConfirmed: boolean;
    confirmationData: {
        /** True only when an independent source agreed on the contract address. */
        contractIdMatch: boolean;
        /** True only when an independent source agreed on the chain. */
        chainIdMatch: boolean;
        liquidityValid: boolean;
        volumeValid: boolean;
        /**
         * Whether contract and chain were checked against anything at all.
         * False when DexScreener is switched off, in which case the two match
         * flags above are not evidence - they are simply unknown.
         */
        contractChecked: boolean;
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
     * contractIdMatch and chainIdMatch mean "an independent source agreed" and
     * nothing else. With DEXSCREENER_ENABLED=false, or when DexScreener returns
     * no data, there is nothing to agree with, so both stay false and
     * contractChecked records that no comparison happened - rather than the
     * enriched data being compared against itself.
     */
    private validateWithDexScreener;
    /**
     * Normalize chain IDs for comparison
     */
    private normalizeChainId;
    /**
     * Decide whether an opportunity counts as confirmed.
     *
     * This used to count "at least 2 of 4 criteria", which did not work as a
     * threshold for two reasons. liquidityValid and volumeValid are the same
     * measurement compared against two thresholds - volume > 1000 implies
     * volume > 500 - so any liquid token scored 2 on its own and passed without
     * anything being verified. And because a contradicted address simply scored
     * 0 on the two match flags rather than disqualifying anything, an
     * opportunity whose contract DexScreener explicitly disagreed with was
     * confirmed anyway.
     *
     * The rule now: adequate volume is necessary, and a contract that was
     * actually checked must not have been contradicted.
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