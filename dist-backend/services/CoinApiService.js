import axios from 'axios';
const COINAPI_KEY = process.env.COINAPI_KEY
    || process.env.VITE_COINAPI_KEY
    || (typeof window === 'undefined' ? undefined : window.COINAPI_KEY);
// Prefer CoinAPI icons, but provide a CDN fallback for most symbols
const COINAPI_BASE = 'https://rest.coinapi.io/v1/';
export class CoinApiService {
    constructor() {
        this.assetCache = new Map();
        this.iconCache = new Map();
        this.iconBase = 'https://s3.eu-central-1.amazonaws.com/bbxt-static-icons/type-id/png_32/';
    }
    static getInstance() {
        if (!CoinApiService.instance) {
            CoinApiService.instance = new CoinApiService();
        }
        return CoinApiService.instance;
    }
    async getAssetMetadata(symbol) {
        const s = symbol.toUpperCase();
        if (this.assetCache.has(s))
            return this.assetCache.get(s);
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
        }
        catch (err) {
            // Quietly fail and allow fallback icon
            return null;
        }
    }
    getAssetIconUrl(asset) {
        if (!asset?.id_icon)
            return null;
        return `${this.iconBase}${asset.id_icon.replace(/-/g, '')}.png`;
    }
    getFallbackIconUrl(symbol) {
        const s = (symbol || '').toLowerCase();
        // CryptoIcons provides a generic icon for many tickers
        return `https://cryptoicons.org/api/icon/${s}/64`;
    }
    async getPlatformTokenAddress(symbol) {
        const meta = await this.getAssetMetadata(symbol);
        return meta?.platform?.token_address || null;
    }
    async getExplorerUrl(symbol) {
        const meta = await this.getAssetMetadata(symbol);
        if (!meta?.platform?.token_address || !meta.platform?.symbol)
            return null;
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
//# sourceMappingURL=CoinApiService.js.map