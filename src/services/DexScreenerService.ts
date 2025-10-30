import axios from 'axios';

export interface DexScreenerTokenInfo {
  chainId?: string;
  tokenAddress?: string;
  imageUrl?: string;
}

export class DexScreenerService {
  private static instance: DexScreenerService;
  private cache: Map<string, DexScreenerTokenInfo> = new Map();

  public static getInstance(): DexScreenerService {
    if (!DexScreenerService.instance) {
      DexScreenerService.instance = new DexScreenerService();
    }
    return DexScreenerService.instance;
  }

  /**
   * Try to resolve token data by symbol via DexScreener search.
   * We attempt common quote assets to maximize hit rate.
   */
  public async resolveBySymbol(symbol: string): Promise<DexScreenerTokenInfo | null> {
    const key = (symbol || '').toUpperCase();
    if (this.cache.has(key)) return this.cache.get(key)!;

    const queries = [`${key}/USDT`, `${key}/USDC`, `${key}/USD`];
    for (const q of queries) {
      try {
        const res = await axios.get('https://api.dexscreener.com/latest/dex/search', { params: { q } });
        const pairs: any[] = res.data?.pairs || [];
        if (!pairs.length) continue;
        // Prefer exact base symbol matches
        const best = pairs.find(p => (p.baseToken?.symbol || '').toUpperCase() === key) || pairs[0];
        const info: DexScreenerTokenInfo = {
          chainId: best?.chainId,
          tokenAddress: best?.baseToken?.address,
          imageUrl: best?.info?.imageUrl,
        };
        this.cache.set(key, info);
        return info;
      } catch {
        // continue to next query
      }
    }
    return null;
  }
}


