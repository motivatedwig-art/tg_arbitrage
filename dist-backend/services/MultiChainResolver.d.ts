/**
 * Multi-Chain Token Resolver
 * Resolves tokens that exist on multiple blockchains and determines primary chain
 */
import { ExchangeNetworkInfo } from './BlockchainScanner.js';
export interface MultiChainToken {
    symbol: string;
    primaryChain: string;
    availableChains: {
        blockchain: string;
        contractAddress?: string;
        isNative: boolean;
        isWrapped: boolean;
        liquidity: number;
        exchanges: string[];
        depositEnabled: boolean;
        withdrawEnabled: boolean;
    }[];
    confidence: number;
}
export declare class MultiChainResolver {
    /**
     * Resolve token chains from exchange data
     */
    resolveTokenChains(symbol: string, exchangeData: ExchangeNetworkInfo[]): Promise<MultiChainToken>;
    /**
     * Consolidate chain information from multiple exchanges
     */
    private consolidateChains;
    /**
     * Determine primary blockchain based on multiple factors
     */
    private determinePrimaryChain;
    /**
     * Check if token is native to a blockchain
     */
    private isNativeToken;
    /**
     * Check if token is wrapped
     */
    private isWrappedToken;
    /**
     * Get native blockchain for a symbol
     */
    private getNativeChainForSymbol;
    /**
     * Calculate liquidity score based on exchange support
     */
    private calculateLiquidityScore;
    /**
     * Calculate confidence score
     */
    private calculateConfidence;
    /**
     * Get default resolution when no data available
     */
    private getDefaultResolve;
}
//# sourceMappingURL=MultiChainResolver.d.ts.map