import { Ticker, ArbitrageOpportunity } from '../../exchanges/types/index.js';
export declare class ArbitrageCalculator {
    private minProfitThreshold;
    private maxProfitThreshold;
    private tradingFees;
    private tokenMetadataService;
    constructor(minProfitThreshold?: number, maxProfitThreshold?: number);
    private initializeTradingFees;
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
}
//# sourceMappingURL=ArbitrageCalculator.d.ts.map