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
    /**
     * Get currency networks for a specific exchange
     */
    getCurrencyNetworks(exchangeName: string, currency: string): Promise<any[]>;
    /**
     * Check if a currency is available for transfer on both exchanges
     */
    checkTransferAvailability(currency: string, buyExchange: string, sellExchange: string): Promise<{
        buyAvailable: boolean;
        sellAvailable: boolean;
        commonNetworks: string[];
    }>;
    /**
     * Normalize network names to blockchain names
     */
    private normalizeNetworkToBlockchain;
}
//# sourceMappingURL=ExchangeManager.d.ts.map