import axios from 'axios';

interface CoinApiAssetMetadata {
  asset_id: string;
  name: string;
  type_is_crypto: number; // 1=crypto, 0=fiat
  data_start?: string;
  data_end?: string;
  data_quote_start?: string;
  data_quote_end?: string;
  data_orderbook_start?: string;
  data_orderbook_end?: string;
  data_trade_start?: string;
  data_trade_end?: string;
  data_symbols_count?: number;
  volume_1hrs_usd?: number;
  volume_1day_usd?: number;
  volume_1mth_usd?: number;
  price_usd?: number;
  id_icon?: string;
  platform?: {
    name?: string;
    symbol?: string;
    token_address?: string;
  }
}

const COINAPI_KEY = process.env.COINAPI_KEY 
  || process.env.VITE_COINAPI_KEY 
  || (typeof window === 'undefined' ? undefined : (window as any).COINAPI_KEY);
// Prefer CoinAPI icons, but provide a CDN fallback for most symbols
const COINAPI_BASE = 'https://rest.coinapi.io/v1/';

export class CoinApiService {
  private static instance: CoinApiService;
  private assetCache: Map<string, CoinApiAssetMetadata> = new Map();
  private iconCache: Map<string, string> = new Map();
  private iconBase = 'https://s3.eu-central-1.amazonaws.com/bbxt-static-icons/type-id/png_32/';

  private constructor() {}

  public static getInstance(): CoinApiService {
    if (!CoinApiService.instance) {
      CoinApiService.instance = new CoinApiService();
    }
    return CoinApiService.instance;
  }

  async getAssetMetadata(symbol: string): Promise<CoinApiAssetMetadata | null> {
    const s = symbol.toUpperCase();
    if (this.assetCache.has(s)) return this.assetCache.get(s)!;

    try {
      if (!COINAPI_KEY) {
        console.warn('[CoinAPI] Missing API key. Skipping CoinAPI lookup for', s);
        return null;
      }
      const res = await axios.get(`${COINAPI_BASE}assets/${encodeURIComponent(s)}`, {
        headers: { 'X-CoinAPI-Key': COINAPI_KEY },
      });
      if (Array.isArray(res.data) && res.data.length > 0) {
        const asset = res.data[0];
        this.assetCache.set(s, asset);
        return asset;
      }
      return null;
    } catch (err) {
      // Quietly fail and allow fallback icon
      return null;
    }
  }

  getAssetIconUrl(asset: CoinApiAssetMetadata): string | null {
    if (!asset?.id_icon) return null;
    return `${this.iconBase}${asset.id_icon.replace(/-/g, '')}.png`;
  }

  getFallbackIconUrl(symbol: string): string {
    const s = (symbol || '').toLowerCase();
    // CryptoIcons provides a generic icon for many tickers
    return `https://cryptoicons.org/api/icon/${s}/64`;
  }

  async getPlatformTokenAddress(symbol: string): Promise<string | null> {
    const meta = await this.getAssetMetadata(symbol);
    return meta?.platform?.token_address || null;
  }

  async getExplorerUrl(symbol: string): Promise<string | null> {
    const meta = await this.getAssetMetadata(symbol);
    if (!meta?.platform?.token_address || !meta.platform?.symbol) return null;
    const chain = meta.platform.symbol.toLowerCase();
    switch (chain) {
      case 'eth':
        return `https://etherscan.io/token/${meta.platform.token_address}`;
      case 'bsc':
        return `https://bscscan.com/token/${meta.platform.token_address}`;
      case 'matic':
        return `https://polygonscan.com/token/${meta.platform.token_address}`;
      default:
        return null;
    }
  }
}

