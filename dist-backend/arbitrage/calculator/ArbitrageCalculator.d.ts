import { Ticker, ArbitrageOpportunity } from '../../exchanges/types/index.js';
export declare class ArbitrageCalculator {
    private minProfitThreshold;
    private maxProfitThreshold;
    private minVolumeThreshold;
    private tradingFees;
    private chainTransferCosts;
    private tokenMetadataService;
    private exchangeManager;
    private blockchainAggregator;
    private excludedBlockchains;
    private coinApiService;
    private iconResolver;
    private tokenVerificationService;
    constructor(minProfitThreshold?: number, maxProfitThreshold?: number, minVolumeThreshold?: number);
    private initializeTradingFees;
    private initializeChainTransferCosts;
    calculateArbitrageOpportunities(allTickers: Map<string, Ticker[]>): Promise<ArbitrageOpportunity[]>;
    private mapDexChainIdToBlockchain;
    /**
     * Enrich tickers with blockchain and contract address information
     * This ensures contract ID matching works properly
     * Uses DexScreener to get contract addresses for accurate matching
     */
    private enrichTickersWithBlockchainInfo;
    /**
     * Map blockchain name to DexScreener chainId
     */
    private getChainIdFromBlockchain;
    private isMockData;
    /**
     * Pre-filter tickers to only include those on compatible blockchains
     * This reduces processing by eliminating incompatible pairs early
     */
    private filterCompatibleTickers;
    /**
     * Create a unique key for a ticker based on symbol, blockchain, and contract address
     * This ensures we only compare tickers that represent the same asset
     */
    private createTickerKey;
    private groupTickersBySymbol;
    private findArbitrageForSymbol;
    /**
     * Verify that two tickers represent the same asset (same contract or same native token on same chain)
     */
    private areSameAsset;
    private calculateOpportunity;
    setMinProfitThreshold(threshold: number): void;
    getMinProfitThreshold(): number;
    setMaxProfitThreshold(threshold: number): void;
    getMaxProfitThreshold(): number;
    updateTradingFee(exchange: string, fee: number): void;
    getTradingFee(exchange: string): number;
    calculatePotentialProfit(opportunity: ArbitrageOpportunity, investmentAmount: number): number;
    isOpportunityValid(opportunity: ArbitrageOpportunity, maxAgeMs?: number): boolean;
    private calculateTransferCost;
    setMinVolumeThreshold(threshold: number): void;
    getMinVolumeThreshold(): number;
    updateTransferCost(fromChain: string, toChain: string, cost: number): void;
    getOpportunitiesByVolume(minVolume: number): ArbitrageOpportunity[];
    /**
     * Determine the primary blockchain for an arbitrage opportunity
     * Uses comprehensive token database for accurate blockchain detection
     */
    private determineBlockchain;
}
//# sourceMappingURL=ArbitrageCalculator.d.ts.map