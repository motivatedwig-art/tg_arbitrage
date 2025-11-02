import { DatabaseManagerPostgres } from '../DatabasePostgres.js';
import { DexScreenerTokenInfo } from '../../services/DexScreenerService.js';
export interface DexScreenerCacheEntry {
    symbol: string;
    chainId: string;
    tokenAddress: string;
    imageUrl?: string;
    lastUpdated: number;
}
export declare class PostgresDexScreenerCacheModel {
    private db;
    private readonly CACHE_TTL_DAYS;
    constructor(db: DatabaseManagerPostgres);
    createTable(): Promise<void>;
    /**
     * Get all cached entries for a symbol (can have multiple chains)
     */
    getBySymbol(symbol: string): Promise<DexScreenerTokenInfo[]>;
    /**
     * Store DexScreener token info in cache
     */
    store(entries: DexScreenerTokenInfo[], symbol: string): Promise<void>;
    /**
     * Check if we have fresh cache for a symbol
     */
    hasFreshCache(symbol: string): Promise<boolean>;
    /**
     * Clean up expired cache entries (older than TTL)
     */
    cleanupExpired(): Promise<number>;
    /**
     * Get cache statistics
     */
    getStats(): Promise<{
        total: number;
        uniqueSymbols: number;
        oldestEntry: number;
    }>;
}
//# sourceMappingURL=PostgresDexScreenerCacheModel.d.ts.map