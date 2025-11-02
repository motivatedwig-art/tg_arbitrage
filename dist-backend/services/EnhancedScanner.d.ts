/**
 * Enhanced Scanner Service
 * Fetches ALL available trading pairs from exchanges instead of a limited set
 * Improves blockchain detection by using exchange metadata
 */
import { ArbitrageOpportunity } from '../exchanges/types/index.js';
export declare class EnhancedScanner {
    private exchangeManager;
    private calculator;
    private db;
    private exchangeSymbolsCache;
    private readonly SYMBOLS_CACHE_DURATION;
    constructor();
    /**
     * Enhanced scanning that fetches ALL pairs from each exchange
     */
    scanAllPairs(): Promise<ArbitrageOpportunity[]>;
    /**
     * Fetch all available trading pairs from all exchanges
     */
    private fetchAllTradingPairs;
    /**
     * Enhance tickers with blockchain information from multiple sources
     */
    private enhanceTickersWithBlockchain;
    /**
     * Enhanced blockchain detection using multiple heuristics
     */
    private detectBlockchainFromSymbol;
}
//# sourceMappingURL=EnhancedScanner.d.ts.map