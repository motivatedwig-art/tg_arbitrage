import { Ticker, ArbitrageOpportunity } from '../../exchanges/types/index.js';
export declare class ArbitrageCalculator {
    private minProfitThreshold;
    private maxProfitThreshold;
    private minVolumeThreshold;
    private tradingFees;
    private chainTransferCosts;
    private tokenMetadataService;
    constructor(minProfitThreshold?: number, maxProfitThreshold?: number, minVolumeThreshold?: number);
    private initializeTradingFees;
    private initializeChainTransferCosts;
    calculateArbitrageOpportunities(allTickers: Map<string, Ticker[]>): ArbitrageOpportunity[];
    private isMockData;
    /**
     * Pre-filter tickers to only include those on compatible blockchains
     * This reduces processing by eliminating incompatible pairs early
     */
    private filterCompatibleTickers;
    private groupTickersBySymbol;
    private findArbitrageForSymbol;
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
     * If both tickers have the same blockchain, use that; otherwise use the most common one
     */
    private determineBlockchain;
}
//# sourceMappingURL=ArbitrageCalculator.d.ts.map