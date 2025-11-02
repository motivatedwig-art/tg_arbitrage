/**
 * Blockchain Data Aggregator
 * Aggregates blockchain data from multiple sources and resolves conflicts
 */
interface TokenInfo {
    symbol: string;
    blockchain: string;
    contractAddress?: string;
    confidence: number;
    exchangeAgreement: number;
    contractVerified: boolean;
    isWellKnown: boolean;
    hasConsistentHistory: boolean;
    conflicts?: string[];
}
export declare class BlockchainAggregator {
    private scanner;
    private resolver;
    private contractAnalyzer;
    private cache;
    constructor();
    /**
     * Main aggregation function
     */
    aggregateBlockchainData(): Promise<Map<string, TokenInfo>>;
    /**
     * Collect network data from all exchanges
     */
    private collectFromExchanges;
    /**
     * Analyze contract addresses from exchange data
     */
    private analyzeContracts;
    /**
     * Enrich with known token mappings
     */
    private enrichWithKnownMappings;
    /**
     * Resolve conflicts in blockchain detection
     */
    private resolveConflicts;
    /**
     * Calculate confidence score for a token
     */
    private calculateConfidenceScore;
    /**
     * Get blockchain for a token (from cache or database)
     */
    getBlockchainForToken(symbol: string): Promise<string | null>;
    /**
     * Get statistics about aggregated data
     */
    private getStatistics;
    /**
     * Get all aggregated data
     */
    getAggregatedData(): Map<string, TokenInfo>;
    /**
     * Clear cache and force refresh
     */
    clearCache(): void;
}
export {};
//# sourceMappingURL=BlockchainAggregator.d.ts.map