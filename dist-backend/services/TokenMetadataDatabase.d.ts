/**
 * Comprehensive token-to-blockchain mapping database
 * This provides blockchain information for common tokens
 */
export interface TokenBlockchainMapping {
    [token: string]: string;
}
/**
 * Get blockchain for a token based on comprehensive database
 */
export declare function getTokenBlockchain(symbol: string): string | null;
/**
 * Comprehensive token-to-blockchain database
 * Based on native chains and primary listings
 */
export declare const tokenBlockchainDatabase: TokenBlockchainMapping;
//# sourceMappingURL=TokenMetadataDatabase.d.ts.map