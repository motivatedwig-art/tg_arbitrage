/**
 * Token Verification Service
 * Verifies token legitimacy, liquidity, and contract verification
 */
export interface TokenVerificationResult {
    isValid: boolean;
    reason?: string;
    liquidityUsd?: number;
    isHoneypot?: boolean;
    isContractVerified?: boolean;
    confidenceScore?: number;
    risks?: string[];
}
export declare class TokenVerificationService {
    private static instance;
    private dexScreenerService;
    private verificationCache;
    private cacheExpiry;
    private readonly CACHE_TTL;
    private constructor();
    static getInstance(): TokenVerificationService;
    /**
     * Verify a token by chain ID and contract address
     */
    verifyToken(chainId: string, contractAddress: string, symbol?: string): Promise<TokenVerificationResult>;
    /**
     * Basic honeypot detection heuristics
     */
    private checkHoneypotIndicators;
    /**
     * Get cached result if still valid
     */
    private getCachedResult;
    /**
     * Cache verification result
     */
    private cacheResult;
    /**
     * Clear verification cache
     */
    clearCache(): void;
}
//# sourceMappingURL=TokenVerificationService.d.ts.map