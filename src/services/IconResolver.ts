import axios from 'axios';
import { CoinApiService } from './CoinApiService.js';
import { DexScreenerService, DexScreenerTokenInfo } from './DexScreenerService.js';

export class IconResolver {
  private static instance: IconResolver;
  private coinApi = CoinApiService.getInstance();
  private dex = DexScreenerService.getInstance();
  private cache: Map<string, string> = new Map();

  public static getInstance(): IconResolver {
    if (!IconResolver.instance) {
      IconResolver.instance = new IconResolver();
    }
    return IconResolver.instance;
  }

  /**
   * Resolve best icon URL for a given base asset symbol.
   * Priority: CoinAPI icon (if available) > CoinGecko large thumb > CryptoIcons fallback
   */
  public async resolveIcon(symbol: string): Promise<string> {
    const key = (symbol || '').toUpperCase();
    if (this.cache.has(key)) return this.cache.get(key)!;

    // 0) DexScreener first
    try {
      const ds = await this.dex.resolveBySymbol(key);
      if (ds?.imageUrl) {
        this.cache.set(key, ds.imageUrl);
        return ds.imageUrl;
      }
    } catch {}

    // 1) CoinAPI
    try {
      const meta = await this.coinApi.getAssetMetadata(key);
      const coinApiIcon = meta ? this.coinApi.getAssetIconUrl(meta) : null;
      if (coinApiIcon) {
        this.cache.set(key, coinApiIcon);
        return coinApiIcon;
      }
    } catch {}

    // 2) CoinGecko
    try {
      const search = await axios.get('https://api.coingecko.com/api/v3/search', { params: { query: key } });
      const coins: any[] = search.data?.coins || [];
      const match = coins.find(c => (c.symbol || '').toUpperCase() === key) || coins[0];
      if (match?.id) {
        const coin = await axios.get(`https://api.coingecko.com/api/v3/coins/${match.id}`, {
          params: { localization: 'false', tickers: 'false', market_data: 'false', community_data: 'false', developer_data: 'false', sparkline: 'false' }
        });
        const image = coin.data?.image;
        const cgIcon = image?.large || image?.small || image?.thumb;
        if (cgIcon) {
          this.cache.set(key, cgIcon);
          return cgIcon;
        }
      }
    } catch {}

    // 3) Fallback
    const fallback = this.coinApi.getFallbackIconUrl(key);
    this.cache.set(key, fallback);
    return fallback;
  }

  public async resolveTokenInfo(symbol: string): Promise<DexScreenerTokenInfo | null> {
    return await this.dex.resolveBySymbol(symbol);
  }
}



