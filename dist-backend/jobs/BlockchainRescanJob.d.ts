/**
 * BlockchainRescanJob - Scheduled job to rescan opportunities with unknown blockchain data
 *
 * Schedule: Every hour (0 * * * *)
 *
 * Purpose:
 * - Identifies opportunities with missing blockchain/contract data
 * - Uses Claude AI to extract correct blockchain information
 * - Ensures all opportunities have valid blockchain data before reaching UI
 */
export declare class BlockchainRescanJob {
    private static instance;
    private readonly enabled;
    private constructor();
    static getInstance(): BlockchainRescanJob;
    /**
     * Start the scheduled job
     */
    schedule(): void;
    /**
     * Run the rescan immediately
     */
    runRescan(): Promise<void>;
}
export declare const blockchainRescanJob: BlockchainRescanJob;
//# sourceMappingURL=BlockchainRescanJob.d.ts.map