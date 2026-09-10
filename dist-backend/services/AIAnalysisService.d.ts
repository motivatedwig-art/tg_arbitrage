import { ArbitrageOpportunity } from '../exchanges/types/index.js';
export declare class AIAnalysisService {
    private static instance;
    private analysisCache;
    private cacheTtl;
    private constructor();
    static getInstance(): AIAnalysisService;
    /**
     * Convert ArbitrageOpportunity to Claude format
     */
    private convertToClaudeFormat;
    /**
     * Get cached analysis for an opportunity
     */
    private getCachedAnalysis;
    /**
     * Generate cache key for an opportunity
     */
    private getCacheKey;
    /**
     * Analyze an arbitrage opportunity using Claude API
     * Returns analysis in Russian
     */
    analyzeOpportunity(opportunity: ArbitrageOpportunity): Promise<string>;
    /**
     * Batch analyze multiple opportunities
     */
    batchAnalyze(opportunities: ArbitrageOpportunity[]): Promise<Map<string, string>>;
    /**
     * Clear analysis cache
     */
    clearCache(): void;
    /**
     * Get cache statistics
     */
    getCacheStats(): {
        size: number;
        hitRate: number;
    };
}
//# sourceMappingURL=AIAnalysisService.d.ts.map