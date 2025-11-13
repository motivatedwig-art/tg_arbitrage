/**
 * Chain normalization utility
 * Normalizes chain names to a consistent format
 */
export declare const SUPPORTED_CHAINS: readonly ["ethereum", "bsc", "polygon", "arbitrum", "optimism", "base", "solana", "avalanche", "tron"];
export type SupportedChain = typeof SUPPORTED_CHAINS[number];
/**
 * Normalize chain name to standard format
 */
export declare function normalizeChain(chain: string | null | undefined): string | null;
/**
 * Check if a chain is supported
 */
export declare function isSupportedChain(chain: string | null | undefined): boolean;
/**
 * Get chain display name
 */
export declare function getChainDisplayName(chain: string | null | undefined): string;
//# sourceMappingURL=chainNormalizer.d.ts.map