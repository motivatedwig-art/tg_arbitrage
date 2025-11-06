import axios, { AxiosError } from 'axios';
import { DatabaseManager } from '../database/Database.js';

export interface DexScreenerTokenInfo {
  chainId?: string;
  tokenAddress?: string;
  imageUrl?: string;
}

interface RateLimiter {
  lastRequestTime: number;
  requestCount: number;
  windowStartTime: number;
}

export class DexScreenerService {
  private static instance: DexScreenerService;
  private cache: Map<string, DexScreenerTokenInfo> = new Map();
  private db: DatabaseManager | null = null;
  
  // Rate limiting: 60 requests per minute = max 50 to be safe
  private readonly MAX_REQUESTS_PER_MINUTE = 50;
  private readonly MINUTE_MS = 60 * 1000;
  private readonly MIN_REQUEST_INTERVAL = 1000; // 1 second between requests to stay under limit (60 req/min)
  private rateLimiter: RateLimiter = {
    lastRequestTime: 0,
    requestCount: 0,
    windowStartTime: Date.now()
  };
  
  // Retry configuration
  private readonly MAX_RETRIES = 3;
  private readonly INITIAL_RETRY_DELAY = 1000; // 1 second
  private readonly MAX_RETRY_DELAY = 10000; // 10 seconds
  
  // HTTP client with timeout
  private axiosInstance = axios.create({
    timeout: 10000, // 10 second timeout
    headers: {
      'Accept': 'application/json',
    }
  });

  public static getInstance(): DexScreenerService {
    if (!DexScreenerService.instance) {
      DexScreenerService.instance = new DexScreenerService();
    }
    return DexScreenerService.instance;
  }

  /**
   * Initialize database connection for caching
   */
  public setDatabase(db: DatabaseManager): void {
    this.db = db;
  }

  /**
   * Rate limiter: ensures we stay under 60 requests per minute
   */
  private async waitForRateLimit(): Promise<void> {
    const now = Date.now();
    
    // Reset window if a minute has passed
    if (now - this.rateLimiter.windowStartTime >= this.MINUTE_MS) {
      this.rateLimiter.requestCount = 0;
      this.rateLimiter.windowStartTime = now;
    }
    
    // Check if we're at the limit
    if (this.rateLimiter.requestCount >= this.MAX_REQUESTS_PER_MINUTE) {
      const waitTime = this.MINUTE_MS - (now - this.rateLimiter.windowStartTime) + 100;
      if (waitTime > 0) {
        console.log(`⏳ Rate limit reached (${this.rateLimiter.requestCount}/${this.MAX_REQUESTS_PER_MINUTE}), waiting ${waitTime}ms...`);
        await this.sleep(waitTime);
        this.rateLimiter.requestCount = 0;
        this.rateLimiter.windowStartTime = Date.now();
      }
    }
    
    // Ensure minimum interval between requests
    const timeSinceLastRequest = now - this.rateLimiter.lastRequestTime;
    if (timeSinceLastRequest < this.MIN_REQUEST_INTERVAL) {
      await this.sleep(this.MIN_REQUEST_INTERVAL - timeSinceLastRequest);
    }
    
    this.rateLimiter.lastRequestTime = Date.now();
    this.rateLimiter.requestCount++;
  }

  /**
   * Sleep utility
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Retry logic with exponential backoff
   */
  private async retryWithBackoff<T>(
    fn: () => Promise<T>,
    retryCount = 0
  ): Promise<T> {
    try {
      return await fn();
    } catch (error) {
      const isAxiosError = error instanceof AxiosError;
      const status = isAxiosError ? error.response?.status : null;
      
      // Don't retry on 4xx errors (client errors) except 429 (rate limit)
      if (status && status >= 400 && status < 500 && status !== 429) {
        throw error;
      }
      
      // Don't retry if max retries reached
      if (retryCount >= this.MAX_RETRIES) {
        console.error(`❌ Max retries (${this.MAX_RETRIES}) reached for DexScreener request`);
        throw error;
      }
      
      // Calculate exponential backoff delay
      const delay = Math.min(
        this.INITIAL_RETRY_DELAY * Math.pow(2, retryCount),
        this.MAX_RETRY_DELAY
      );
      
      console.warn(`⚠️ DexScreener request failed (attempt ${retryCount + 1}/${this.MAX_RETRIES + 1}), retrying in ${delay}ms...`, 
        isAxiosError ? `Status: ${status}, Message: ${error.message}` : error);
      
      await this.sleep(delay);
      return this.retryWithBackoff(fn, retryCount + 1);
    }
  }

  /**
   * Make HTTP request with rate limiting and retry logic
   */
  private async makeRequest<T>(url: string, params?: any): Promise<T> {
    await this.waitForRateLimit();
    
    return this.retryWithBackoff(async () => {
      const response = await this.axiosInstance.get<T>(url, { params });
      
      // Check for rate limit in response headers
      const rateLimitRemaining = response.headers['x-ratelimit-remaining'];
      if (rateLimitRemaining && parseInt(rateLimitRemaining) < 10) {
        console.warn(`⚠️ DexScreener rate limit warning: ${rateLimitRemaining} requests remaining`);
      }
      
      return response.data;
    });
  }

  /**
   * Try to resolve token data by symbol via DexScreener search.
   * We attempt common quote assets to maximize hit rate.
   */
  public async resolveBySymbol(symbol: string): Promise<DexScreenerTokenInfo | null> {
    const key = (symbol || '').toUpperCase();
    if (!key) return null;
    
    if (this.cache.has(key)) {
      return this.cache.get(key)!;
    }

    const queries = [`${key}/USDT`, `${key}/USDC`, `${key}/USD`];
    
    for (const q of queries) {
      try {
        const res = await this.makeRequest<{ pairs?: any[] }>(
          'https://api.dexscreener.com/latest/dex/search',
          { q }
        );
        
        const pairs: any[] = res.pairs || [];
        if (!pairs.length) continue;
        
        // Prefer exact base symbol matches
        const best = pairs.find(p => (p.baseToken?.symbol || '').toUpperCase() === key) || pairs[0];
        const info: DexScreenerTokenInfo = {
          chainId: best?.chainId,
          tokenAddress: best?.baseToken?.address,
          imageUrl: best?.info?.imageUrl || best?.baseToken?.imageUrl,
        };
        
        this.cache.set(key, info);
        return info;
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Unknown error';
        console.warn(`⚠️ DexScreener search failed for query "${q}": ${errorMsg}`);
        // Continue to next query
      }
    }
    
    // Cache null result to avoid repeated failed lookups
    this.cache.set(key, {});
    return null;
  }

  /**
   * Fetch all candidate tokens for a symbol across chains (deduplicated by chainId+address)
   * Checks database cache first, then API if needed
   */
  public async resolveAllBySymbol(symbol: string): Promise<DexScreenerTokenInfo[]> {
    const key = (symbol || '').toUpperCase();
    if (!key) return [];

    // Try database cache first (avoids unnecessary API calls)
    if (this.db) {
      try {
        const cacheModel = this.db.getDexScreenerCacheModel();
        if (cacheModel) {
          const cached = await cacheModel.getBySymbol(key);
          if (cached && cached.length > 0) {
            // Return cached data - no API call needed
            return cached;
          }
        }
      } catch (error) {
        console.warn(`⚠️ Error checking DexScreener cache for ${key}:`, error);
      }
    }
    
    // Check in-memory cache
    if (this.cache.has(key)) {
      const cached = this.cache.get(key)!;
      if (cached.chainId && cached.tokenAddress) {
        return [cached];
      }
    }

    // Cache miss - fetch from API
    console.log(`🌐 [DEXSCREENER] Fetching from API for ${key} (cache miss)`);
    
    const out: DexScreenerTokenInfo[] = [];
    const seen = new Set<string>();
    const queries = [`${key}/USDT`, `${key}/USDC`, `${key}/USD`];
    
    for (const q of queries) {
      try {
        const res = await this.makeRequest<{ pairs?: any[] }>(
          'https://api.dexscreener.com/latest/dex/search',
          { q }
        );
        
        const pairs: any[] = res.pairs || [];
        for (const p of pairs) {
          const cid = p?.chainId;
          const addr = p?.baseToken?.address;
          const k = `${cid}:${addr}`;
          
          if (!cid || !addr || seen.has(k)) continue;
          
          seen.add(k);
          out.push({
            chainId: cid,
            tokenAddress: addr,
            imageUrl: p?.info?.imageUrl || p?.baseToken?.imageUrl,
          });
        }
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Unknown error';
        console.warn(`⚠️ DexScreener search failed for query "${q}": ${errorMsg}`);
        // Continue to next query
      }
    }
    
    // Store in database cache if we got results
    if (out.length > 0 && this.db) {
      try {
        const cacheModel = this.db.getDexScreenerCacheModel();
        if (cacheModel) {
          await cacheModel.store(out, key);
          console.log(`💾 [DEXSCREENER] Cached ${out.length} entries for ${key}`);
        }
      } catch (error) {
        console.warn(`⚠️ Error caching DexScreener results for ${key}:`, error);
      }
    }
    
    // Also store in in-memory cache (first result)
    if (out.length > 0) {
      this.cache.set(key, out[0]);
    }
    
    return out;
  }

  /**
   * Get token profile using the token-profiles endpoint (requires chainId and tokenAddress)
   * Rate limit: 60 requests per minute
   */
  public async getTokenProfile(chainId: string, tokenAddress: string): Promise<any | null> {
    if (!chainId || !tokenAddress) return null;
    
    const cacheKey = `profile:${chainId}:${tokenAddress}`;
    // Note: We don't cache profiles as they may change, but we could add TTL cache if needed
    
    try {
      const profile = await this.makeRequest<any>(
        `https://api.dexscreener.com/token-profiles/latest/v1/${chainId}/${tokenAddress}`
      );
      return profile;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      const status = error instanceof AxiosError ? error.response?.status : null;
      
      // Don't log 404s as errors (token profile might not exist)
      if (status === 404) {
        return null;
      }
      
      console.warn(`⚠️ Failed to fetch token profile for ${chainId}:${tokenAddress}: ${errorMsg}`);
      return null;
    }
  }

  /**
   * Clear the cache (useful for testing or memory management)
   */
  public clearCache(): void {
    this.cache.clear();
    console.log('🗑️ DexScreener cache cleared');
  }

  /**
   * Get cache statistics
   */
  public getCacheStats(): { size: number; keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys())
    };
  }
}


