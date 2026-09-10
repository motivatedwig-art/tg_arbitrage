/**
 * BlockchainRescanService - Rescans opportunities with missing blockchain data
 *
 * CRITICAL: Every cryptocurrency token MUST exist on a blockchain.
 * This service identifies opportunities with missing/unknown blockchain data
 * and uses Claude AI to extract the correct chain and contract information.
 *
 * Triggers:
 * - Scheduled job (every hour)
 * - Manual API call
 * - After initial opportunity detection
 */
export declare class BlockchainRescanService {
    private static instance;
    private db;
    private readonly enabled;
    private isRunning;
    private constructor();
    static getInstance(): BlockchainRescanService;
    /**
     * Find opportunities with missing blockchain data
     * A token has "unknown" blockchain if:
     * - blockchain is null/undefined/empty
     * - blockchain is "UNKNOWN" or "unknown"
     * - contractAddress is null/undefined/empty
     * - chainId is null/undefined/empty
     * - contractDataExtracted is false
     */
    private getOpportunitiesWithUnknownBlockchain;
    /**
     * Rescan a single opportunity using Claude AI
     */
    private rescanOpportunity;
    /**
     * Update opportunity blockchain data in database
     */
    private updateOpportunityBlockchainData;
    /**
     * Run full rescan of all opportunities with unknown blockchain data
     */
    runRescan(): Promise<{
        total: number;
        successful: number;
        failed: number;
    }>;
    /**
     * Get count of opportunities with unknown blockchain data
     */
    getUnknownCount(): Promise<number>;
    /**
     * Check if rescan is currently running
     */
    isRescanRunning(): boolean;
    private delay;
}
export declare const blockchainRescanService: BlockchainRescanService;
//# sourceMappingURL=BlockchainRescanService.d.ts.map