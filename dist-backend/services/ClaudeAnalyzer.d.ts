interface ArbitrageOpportunity {
    symbol: string;
    chain: string;
    spread_percentage: number;
    buy_exchange: string;
    buy_price: number;
    sell_exchange: string;
    sell_price: number;
    liquidity_usd: number;
    volume_24h: number;
    gas_cost_usd: number;
}
interface ContractDataResponse {
    contract_address: string | null;
    chain_id: number | null;
    chain_name: string | null;
    is_verified: boolean | null;
    decimals: number | null;
}
interface CostMetrics {
    total_requests: number;
    cached_requests: number;
    estimated_cost: number;
    last_reset: number;
}
export declare class ClaudeAnalyzer {
    private client;
    private analysisPrompt;
    private contractPrompt;
    private config;
    private analysisCache;
    private cacheTtl;
    private costMetrics;
    constructor();
    private createAnalysisPrompt;
    private getCachedAnalysis;
    analyzeOpportunity(opportunity: ArbitrageOpportunity): Promise<string>;
    batchAnalyze(opportunities: ArbitrageOpportunity[]): Promise<Map<string, string>>;
    getCostMetrics(): CostMetrics;
    resetCostMetrics(): void;
    clearCache(): void;
    extractContractData(tokenSymbol: string, tokenDescription: string): Promise<ContractDataResponse>;
    private parseContractData;
}
export declare const claudeAnalyzer: ClaudeAnalyzer;
export {};
//# sourceMappingURL=ClaudeAnalyzer.d.ts.map