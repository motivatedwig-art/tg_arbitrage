import { claudeAnalyzer } from './ClaudeAnalyzer.js';
import { ArbitrageOpportunity } from '../exchanges/types/index.js';
import { config } from '../config/environment.js';

export class AIAnalysisService {
  private static instance: AIAnalysisService;
  private analysisCache: Map<string, { analysis: string; timestamp: number }> = new Map();
  private cacheTtl: number = config.claudeCacheTtl * 1000; // Convert to milliseconds

  private constructor() {
    // Singleton pattern
  }

  public static getInstance(): AIAnalysisService {
    if (!AIAnalysisService.instance) {
      AIAnalysisService.instance = new AIAnalysisService();
    }
    return AIAnalysisService.instance;
  }

  /**
   * Convert ArbitrageOpportunity to Claude format
   */
  private convertToClaudeFormat(opportunity: ArbitrageOpportunity): any {
    return {
      symbol: opportunity.symbol,
      chain: opportunity.blockchain || 'ethereum',
      spread_percentage: opportunity.profitPercentage,
      buy_exchange: opportunity.buyExchange,
      buy_price: opportunity.buyPrice,
      sell_exchange: opportunity.sellExchange,
      sell_price: opportunity.sellPrice,
      liquidity_usd: opportunity.volume || 50000,
      volume_24h: opportunity.volume || 10000,
      gas_cost_usd: opportunity.gasCostUsd || 2.0
    };
  }

  /**
   * Get cached analysis for an opportunity
   */
  private getCachedAnalysis(opportunity: ArbitrageOpportunity): string | null {
    const cacheKey = this.getCacheKey(opportunity);
    const cached = this.analysisCache.get(cacheKey);

    if (cached && (Date.now() - cached.timestamp) < this.cacheTtl) {
      return cached.analysis + " 📌[кеш]";
    }

    return null;
  }

  /**
   * Generate cache key for an opportunity
   */
  private getCacheKey(opportunity: ArbitrageOpportunity): string {
    return `${opportunity.blockchain || 'unknown'}:${opportunity.symbol}:${opportunity.buyExchange}:${opportunity.sellExchange}`;
  }

  /**
   * Analyze an arbitrage opportunity using Claude API
   * Returns analysis in Russian
   */
  async analyzeOpportunity(opportunity: ArbitrageOpportunity): Promise<string> {
    // Check cache first
    const cachedAnalysis = this.getCachedAnalysis(opportunity);
    if (cachedAnalysis) {
      return cachedAnalysis;
    }

    try {
      // Convert to Claude format
      const claudeOpportunity = this.convertToClaudeFormat(opportunity);
      
      // Get analysis from Claude
      const analysis = await claudeAnalyzer.analyzeOpportunity(claudeOpportunity);

      // Cache the result
      const cacheKey = this.getCacheKey(opportunity);
      this.analysisCache.set(cacheKey, {
        analysis,
        timestamp: Date.now()
      });

      return analysis;
    } catch (error) {
      console.error('AI Analysis error:', error);
      return `❌ Ошибка AI анализа: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`;
    }
  }

  /**
   * Batch analyze multiple opportunities
   */
  async batchAnalyze(opportunities: ArbitrageOpportunity[]): Promise<Map<string, string>> {
    const results = new Map<string, string>();

    // Process opportunities in parallel (limited to 5 for rate limiting)
    const batch = opportunities.slice(0, 5);
    const promises = batch.map(async (opp) => {
      const analysis = await this.analyzeOpportunity(opp);
      results.set(opp.symbol, analysis);
    });

    await Promise.all(promises);
    return results;
  }

  /**
   * Clear analysis cache
   */
  clearCache(): void {
    this.analysisCache.clear();
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { size: number; hitRate: number } {
    // This would need proper hit tracking implementation
    return { size: this.analysisCache.size, hitRate: 0 };
  }
}
