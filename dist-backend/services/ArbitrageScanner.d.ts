type Opportunity = {
    symbol: string;
    buyExchange: string;
    sellExchange: string;
    buyPrice: number;
    sellPrice: number;
    netPercent: number;
    profitAmount: number;
    volume: number;
    timestamp: number;
};
export declare class ArbitrageScanner {
    private db;
    private adapters;
    private feeRate;
    private profitThreshold;
    private isRunning;
    private scanInterval;
    constructor();
    start(): Promise<void>;
    stop(): void;
    isActive(): boolean;
    private scanForOpportunities;
    private findArbitrage;
    private storeOpportunities;
    getRecentOpportunities(minutes?: number): Promise<Opportunity[]>;
}
export {};
//# sourceMappingURL=ArbitrageScanner.d.ts.map