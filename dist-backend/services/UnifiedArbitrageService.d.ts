import { ExchangeManager } from '../exchanges/ExchangeManager.js';
import { ArbitrageCalculator } from '../arbitrage/calculator/ArbitrageCalculator.js';
import { ArbitrageOpportunity } from '../exchanges/types/index.js';
export declare class UnifiedArbitrageService {
    private static instance;
    private db;
    private exchangeManager;
    private arbitrageCalculator;
    private contractDataService;
    private isRunning;
    private scanInterval;
    private constructor();
    private getBlockchainTag;
    static getInstance(): UnifiedArbitrageService;
    start(): Promise<void>;
    stop(): void;
    isActive(): boolean;
    triggerManualScan(): Promise<void>;
    private scanForOpportunities;
    private storeOpportunities;
    getRecentOpportunities(minutes?: number): Promise<ArbitrageOpportunity[]>;
    getTopOpportunities(limit?: number): Promise<ArbitrageOpportunity[]>;
    getVolumeBasedOpportunities(minVolume?: number, limit?: number): Promise<ArbitrageOpportunity[]>;
    getUserFilteredOpportunities(userId: string, exchanges?: string[], minProfit?: number, maxVolume?: number): Promise<ArbitrageOpportunity[]>;
    getArbitrageCalculator(): ArbitrageCalculator;
    getExchangeManager(): ExchangeManager;
}
//# sourceMappingURL=UnifiedArbitrageService.d.ts.map