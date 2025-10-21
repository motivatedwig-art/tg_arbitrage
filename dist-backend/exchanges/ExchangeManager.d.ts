import { Ticker, ExchangeStatus } from './types/index.js';
export declare class ExchangeManager {
    private static instance;
    private adapters;
    private tickerCache;
    private lastUpdate;
    private networkCache;
    private readonly NETWORK_CACHE_DURATION;
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
    /**
     * Get currency networks for a specific exchange (with caching)
     */
    getCurrencyNetworks(exchangeName: string, currency: string): Promise<any[]>;
    /**
     * Check if a currency is available for transfer on both exchanges
     */
    checkTransferAvailability(currency: string, buyExchange: string, sellExchange: string): Promise<{
        buyAvailable: boolean | undefined;
        sellAvailable: boolean | undefined;
        commonNetworks: string[];
    }>;
    /**
     * Normalize network names to blockchain names
     */
    private normalizeNetworkToBlockchain;
}
//# sourceMappingURL=ExchangeManager.d.ts.map