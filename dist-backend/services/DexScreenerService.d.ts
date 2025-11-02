export interface DexScreenerTokenInfo {
    chainId?: string;
    tokenAddress?: string;
    imageUrl?: string;
}
export declare class DexScreenerService {
    private static instance;
    private cache;
    static getInstance(): DexScreenerService;
    /**
     * Try to resolve token data by symbol via DexScreener search.
     * We attempt common quote assets to maximize hit rate.
     */
    resolveBySymbol(symbol: string): Promise<DexScreenerTokenInfo | null>;
    /**
     * Fetch all candidate tokens for a symbol across chains (deduplicated by chainId+address)
     */
    resolveAllBySymbol(symbol: string): Promise<DexScreenerTokenInfo[]>;
}
//# sourceMappingURL=DexScreenerService.d.ts.map