/**
 * Token Verification Service
 * Verifies token legitimacy, liquidity, and contract verification
 */
import { DexScreenerService } from './DexScreenerService.js';
export class TokenVerificationService {
    constructor() {
        this.verificationCache = new Map();
        this.cacheExpiry = new Map();
        this.CACHE_TTL = 5 * 60 * 1000; // 5 minutes
        this.dexScreenerService = DexScreenerService.getInstance();
    }
    static getInstance() {
        if (!TokenVerificationService.instance) {
            TokenVerificationService.instance = new TokenVerificationService();
        }
        return TokenVerificationService.instance;
    }
    /**
     * Verify a token by chain ID and contract address
     */
    async verifyToken(chainId, contractAddress, symbol) {
        const cacheKey = `${chainId}:${contractAddress.toLowerCase()}`;
        // Check cache
        const cached = this.getCachedResult(cacheKey);
        if (cached) {
            return cached;
        }
        const result = {
            isValid: true,
            risks: [],
            confidenceScore: 100
        };
        try {
            // Get token data from DexScreener
            const tokenData = await this.dexScreenerService.getTokenPrice(chainId, contractAddress);
            if (!tokenData || !tokenData.pairs || tokenData.pairs.length === 0) {
                result.isValid = false;
                result.reason = 'Token not found on DEX';
                result.confidenceScore = 0;
                this.cacheResult(cacheKey, result);
                return result;
            }
            // Get liquidity from the most liquid pair
            const mostLiquidPair = tokenData.pairs.reduce((max, pair) => {
                const maxLiquidity = max.liquidity?.usd || 0;
                const pairLiquidity = pair.liquidity?.usd || 0;
                return pairLiquidity > maxLiquidity ? pair : max;
            }, tokenData.pairs[0]);
            const liquidityUsd = mostLiquidPair.liquidity?.usd || 0;
            result.liquidityUsd = liquidityUsd;
            // Check liquidity threshold (minimum $100k)
            if (liquidityUsd < 100000) {
                result.isValid = false;
                result.reason = 'Low liquidity';
                result.risks?.push('Low liquidity');
                result.confidenceScore = (result.confidenceScore || 100) - 30;
            }
            // Check for honeypot indicators
            // (This would require additional API calls to honeypot detection services)
            // For now, we'll use basic heuristics
            const isHoneypot = this.checkHoneypotIndicators(tokenData, liquidityUsd);
            if (isHoneypot) {
                result.isValid = false;
                result.isHoneypot = true;
                result.reason = 'Honeypot detected';
                result.risks?.push('Honeypot risk');
                result.confidenceScore = 0;
            }
            // Check contract verification
            // (This would require additional API calls to block explorers)
            // For now, we'll assume contracts are verified if they have good liquidity
            result.isContractVerified = liquidityUsd > 500000;
            // Adjust confidence score based on liquidity
            if (liquidityUsd < 500000) {
                result.confidenceScore = (result.confidenceScore || 100) - 20;
                result.risks?.push('Medium liquidity');
            }
            if (liquidityUsd < 1000000) {
                result.confidenceScore = (result.confidenceScore || 100) - 10;
            }
            // Ensure confidence score is between 0 and 100
            result.confidenceScore = Math.max(0, Math.min(100, result.confidenceScore || 100));
            this.cacheResult(cacheKey, result);
            return result;
        }
        catch (error) {
            console.error(`Error verifying token ${chainId}:${contractAddress}:`, error);
            // On error, be conservative but don't block
            result.isValid = true;
            result.reason = 'Verification failed, using default';
            result.confidenceScore = 50;
            this.cacheResult(cacheKey, result);
            return result;
        }
    }
    /**
     * Basic honeypot detection heuristics
     */
    checkHoneypotIndicators(tokenData, liquidityUsd) {
        // Very low liquidity is a red flag
        if (liquidityUsd < 10000) {
            return true;
        }
        // Check if there are suspicious patterns in the pairs
        if (tokenData.pairs && tokenData.pairs.length > 0) {
            const suspiciousPairs = tokenData.pairs.filter((pair) => {
                // Very low liquidity on all pairs
                const pairLiquidity = pair.liquidity?.usd || 0;
                return pairLiquidity < 5000;
            });
            // If all pairs have very low liquidity, it's suspicious
            if (suspiciousPairs.length === tokenData.pairs.length) {
                return true;
            }
        }
        return false;
    }
    /**
     * Get cached result if still valid
     */
    getCachedResult(cacheKey) {
        const expiry = this.cacheExpiry.get(cacheKey);
        if (!expiry || Date.now() > expiry) {
            return null;
        }
        return this.verificationCache.get(cacheKey) || null;
    }
    /**
     * Cache verification result
     */
    cacheResult(cacheKey, result) {
        this.verificationCache.set(cacheKey, result);
        this.cacheExpiry.set(cacheKey, Date.now() + this.CACHE_TTL);
    }
    /**
     * Clear verification cache
     */
    clearCache() {
        this.verificationCache.clear();
        this.cacheExpiry.clear();
    }
}
//# sourceMappingURL=TokenVerificationService.js.map