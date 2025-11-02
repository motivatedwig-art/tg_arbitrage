import { DexScreenerTokenInfo } from './DexScreenerService.js';
export declare class IconResolver {
    private static instance;
    private coinApi;
    private dex;
    private cache;
    static getInstance(): IconResolver;
    /**
     * Resolve best icon URL for a given base asset symbol.
     * Priority: CoinAPI icon (if available) > CoinGecko large thumb > CryptoIcons fallback
     */
    resolveIcon(symbol: string): Promise<string>;
    resolveTokenInfo(symbol: string): Promise<DexScreenerTokenInfo | null>;
}
//# sourceMappingURL=IconResolver.d.ts.map