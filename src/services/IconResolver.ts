import axios from 'axios';
import { CoinApiService } from './CoinApiService.js';

export class IconResolver {
  private static instance: IconResolver;
  private coinApi = CoinApiService.getInstance();
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

    // 1) Try CoinAPI
    try {
      const meta = await this.coinApi.getAssetMetadata(key);
      const coinApiIcon = meta ? this.coinApi.getAssetIconUrl(meta) : null;
      if (coinApiIcon) {
        this.cache.set(key, coinApiIcon);
        return coinApiIcon;
      }
    } catch {}

    // 2) Try CoinGecko search by symbol
    try {
      const search = await axios.get('https://api.coingecko.com/api/v3/search', {
        params: { query: key }
      });
      const coins: any[] = search.data?.coins || [];
      // Prefer exact symbol match, then first result
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

    // 3) Fallback generic icon
    const fallback = this.coinApi.getFallbackIconUrl(key);
    this.cache.set(key, fallback);
    return fallback;
  }
}


