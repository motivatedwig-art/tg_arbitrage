import { DatabaseManager } from '../database/Database.js';
export interface DexScreenerTokenInfo {
    chainId?: string;
    tokenAddress?: string;
    imageUrl?: string;
}
export declare class DexScreenerService {
    private static instance;
    private cache;
    private db;
    private readonly MAX_REQUESTS_PER_MINUTE;
    private readonly MINUTE_MS;
    private readonly MIN_REQUEST_INTERVAL;
    private rateLimiter;
    private readonly MAX_RETRIES;
    private readonly INITIAL_RETRY_DELAY;
    private readonly MAX_RETRY_DELAY;
    private axiosInstance;
    static getInstance(): DexScreenerService;
    /**
     * Initialize database connection for caching
     */
    setDatabase(db: DatabaseManager): void;
    /**
     * Rate limiter: ensures we stay under 60 requests per minute
     */
    private waitForRateLimit;
    /**
     * Sleep utility
     */
    private sleep;
    /**
     * Retry logic with exponential backoff
     */
    private retryWithBackoff;
    /**
     * Make HTTP request with rate limiting and retry logic
     */
    private makeRequest;
    /**
     * Try to resolve token data by symbol via DexScreener search.
     * We attempt common quote assets to maximize hit rate.
     */
    resolveBySymbol(symbol: string): Promise<DexScreenerTokenInfo | null>;
    /**
     * Fetch all candidate tokens for a symbol across chains (deduplicated by chainId+address)
     * Checks database cache first, then API if needed
     */
    resolveAllBySymbol(symbol: string): Promise<DexScreenerTokenInfo[]>;
    /**
     * Get token profile using the token-profiles endpoint (requires chainId and tokenAddress)
     * Rate limit: 60 requests per minute
     */
    getTokenProfile(chainId: string, tokenAddress: string): Promise<any | null>;
    /**
     * Get token price data using the pairs endpoint (requires chainId and tokenAddress)
     * Rate limit: 60 requests per minute
     */
    getTokenPrice(chainId: string, tokenAddress: string): Promise<any | null>;
    /**
     * Clear the cache (useful for testing or memory management)
     */
    clearCache(): void;
    /**
     * Get cache statistics
     */
    getCacheStats(): {
        size: number;
        keys: string[];
    };
}
//# sourceMappingURL=DexScreenerService.d.ts.map