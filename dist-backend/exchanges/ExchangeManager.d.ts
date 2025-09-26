import { Ticker, ExchangeStatus } from './types/index.js';
export declare class ExchangeManager {
    private static instance;
    private adapters;
    private tickerCache;
    private lastUpdate;
    private constructor();
    static getInstance(): ExchangeManager;
    initializeExchanges(): Promise<void>;
    private getExchangeConfigs;
    private createAdapter;
    updateAllTickers(): Promise<void>;
    private updateExchangeTickers;
    private generateMockTickers;
    getAllTickers(): Map<string, Ticker[]>;
    getExchangeStatus(): ExchangeStatus[];
    getConnectedExchanges(): string[];
    disconnect(): Promise<void>;
    getTickersForSymbol(symbol: string): Ticker[];
    getLastUpdateTime(): number;
}
//# sourceMappingURL=ExchangeManager.d.ts.map