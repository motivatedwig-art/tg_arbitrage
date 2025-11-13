/**
 * Service to identify blockchain networks and contract addresses for tokens
 * This helps prevent cross-chain arbitrage comparisons
 */
export interface TokenMetadata {
    symbol: string;
    blockchain: string;
    contractAddress?: string;
    isNative?: boolean;
}
export declare class TokenMetadataService {
    private static instance;
    private tokenMetadataCache;
    private exchangeBlockchainMap;
    private coinApiService;
    private constructor();
    static getInstance(): TokenMetadataService;
    /**
     * Map exchanges to their supported blockchains
     */
    private initializeExchangeBlockchainMap;
    /**
     * Get supported blockchains for an exchange
     */
    getSupportedBlockchains(exchangeId: string): string[];
    /**
     * Get all unique blockchains supported by all exchanges
     */
    getAllSupportedBlockchains(): string[];
    /**
     * Initialize common token metadata for known cross-chain tokens
     */
    private initializeCommonTokenMetadata;
    private addTokenMetadata;
    /**
     * Helper to add single-chain tokens
     */
    private addSingleChainToken;
    /**
     * Get blockchain information for a token on a specific exchange
     */
    getTokenBlockchain(symbol: string, exchange: string): string | null;
    /**
     * Get contract address for a token on a specific blockchain
     */
    getTokenContractAddress(symbol: string, blockchain: string): string | null;
    /**
     * Check if two tokens are on the same blockchain
     * OPTIMIZED: Only block obvious incompatibilities (Solana vs non-Solana)
     */
    areTokensOnSameBlockchain(symbol1: string, exchange1: string, symbol2: string, exchange2: string): boolean;
    /**
     * Extract base symbol from trading pair (e.g., "BTC/USDT" -> "BTC")
     */
    private extractBaseSymbol;
    /**
     * Get all known metadata for a token
     */
    getTokenMetadata(symbol: string): TokenMetadata[] | null;
    /**
     * Check if a token is known to exist on multiple blockchains
     */
    isMultiChainToken(symbol: string): boolean;
    /**
     * Extended: Try to get coin metadata from CoinAPI if not found in cache.
     * Will cache CoinAPI result for future requests.
     */
    getTokenMetadataWithCoinApi(symbol: string): Promise<TokenMetadata[] | null>;
}
//# sourceMappingURL=TokenMetadataService.d.ts.map