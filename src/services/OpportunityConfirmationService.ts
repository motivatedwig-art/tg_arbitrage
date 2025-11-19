import { DexScreenerService } from './DexScreenerService.js';
import { TokenMetadataService } from './TokenMetadataService.js';
import { ArbitrageOpportunity } from '../exchanges/types/index.js';
import { AIAnalysisService } from './AIAnalysisService.js';
import { config } from '../config/environment.js';

export interface ConfirmedOpportunity {
  opportunity: ArbitrageOpportunity;
  isConfirmed: boolean;
  confirmationData: {
    contractIdMatch: boolean;
    chainIdMatch: boolean;
    liquidityValid: boolean;
    volumeValid: boolean;
    dexScreenerData: any;
  };
  aiAnalysis?: string;
}

export class OpportunityConfirmationService {
  private static instance: OpportunityConfirmationService;
  private dexScreenerService: DexScreenerService;
  private tokenMetadataService: TokenMetadataService;
  private aiAnalysisService: AIAnalysisService;

  private constructor() {
    this.dexScreenerService = DexScreenerService.getInstance();
    this.tokenMetadataService = TokenMetadataService.getInstance();
    this.aiAnalysisService = AIAnalysisService.getInstance();
  }

  public static getInstance(): OpportunityConfirmationService {
    if (!OpportunityConfirmationService.instance) {
      OpportunityConfirmationService.instance = new OpportunityConfirmationService();
    }
    return OpportunityConfirmationService.instance;
  }

  /**
   * Validate opportunity using Claude AI data (DexScreener configurable via DEXSCREENER_ENABLED env var)
   *
   * IMPORTANT: DexScreener validation is DISABLED by default (config.dexScreener.enabled = false).
   * Claude AI is the PRIMARY enrichment tool.
   * Set DEXSCREENER_ENABLED=true to re-enable DexScreener validation.
   */
  private async validateWithDexScreener(opportunity: ArbitrageOpportunity): Promise<{
    contractIdMatch: boolean;
    chainIdMatch: boolean;
    liquidityValid: boolean;
    volumeValid: boolean;
    dexScreenerData: any;
  }> {
    const result = {
      contractIdMatch: false,
      chainIdMatch: false,
      liquidityValid: false,
      volumeValid: false,
      dexScreenerData: null
    };

    // Check if DexScreener is enabled
    if (!config.dexScreener.enabled) {
      console.log(`🚫 [VALIDATION] DexScreener validation DISABLED (config.dexScreener.enabled = false)`);
      console.log(`   Using Claude AI data exclusively for validation`);
      console.log(`   Token: ${opportunity.symbol}`);
      console.log(`   Contract Address (from Claude): ${opportunity.contractAddress || 'NOT SET'}`);
      console.log(`   Chain ID (from Claude): ${opportunity.chainId || 'NOT SET'}`);
      console.log(`   Chain Name (from Claude): ${opportunity.chainName || 'NOT SET'}`);

      // Use Claude AI extracted data for validation
      result.contractIdMatch = !!opportunity.contractAddress && opportunity.contractAddress !== 'NOT FOUND';
      result.chainIdMatch = !!opportunity.chainId && opportunity.chainId !== 'NOT FOUND';
      result.liquidityValid = opportunity.volume > 1000; // Minimum $1000 liquidity
      result.volumeValid = opportunity.volume > 500; // Minimum $500 volume

      console.log(`   ✅ Validation Results (Claude-based):`);
      console.log(`      Contract ID Match: ${result.contractIdMatch ? '✓' : '✗'}`);
      console.log(`      Chain ID Match:    ${result.chainIdMatch ? '✓' : '✗'}`);
      console.log(`      Liquidity Valid:   ${result.liquidityValid ? '✓' : '✗'} (${opportunity.volume.toFixed(2)} > 1000)`);
      console.log(`      Volume Valid:      ${result.volumeValid ? '✓' : '✗'} (${opportunity.volume.toFixed(2)} > 500)`);

      return result;
    }

    // DexScreener is ENABLED - use original validation logic
    console.log(`✅ [VALIDATION] DexScreener validation ENABLED (config.dexScreener.enabled = true)`);
    console.log(`   Token: ${opportunity.symbol}`);

    try {
      const dexData = await this.dexScreenerService.resolveBySymbol(opportunity.symbol);
      result.dexScreenerData = dexData;

      if (!dexData) {
        console.log(`   ⚠️  No DexScreener data found for ${opportunity.symbol}`);
        return result;
      }

      // Check contract ID match if available
      if (opportunity.contractAddress && dexData.tokenAddress) {
        result.contractIdMatch = opportunity.contractAddress.toLowerCase() ===
                                 dexData.tokenAddress.toLowerCase();
      }

      // Check chain ID match if available
      if (opportunity.chainId && dexData.chainId) {
        result.chainIdMatch = this.normalizeChainId(opportunity.chainId) ===
                              this.normalizeChainId(dexData.chainId);
      }

      // Validate liquidity and volume (basic checks)
      result.liquidityValid = opportunity.volume > 1000; // Minimum $1000 liquidity
      result.volumeValid = opportunity.volume > 500; // Minimum $500 volume

      console.log(`   ✅ DexScreener Validation Results:`);
      console.log(`      Contract ID Match: ${result.contractIdMatch ? '✓' : '✗'}`);
      console.log(`      Chain ID Match:    ${result.chainIdMatch ? '✓' : '✗'}`);
      console.log(`      Liquidity Valid:   ${result.liquidityValid ? '✓' : '✗'}`);
      console.log(`      Volume Valid:      ${result.volumeValid ? '✓' : '✗'}`);

    } catch (error) {
      console.error(`   ❌ DexScreener validation error for ${opportunity.symbol}:`, error);
    }

    return result;
  }

  /**
   * Normalize chain IDs for comparison
   */
  private normalizeChainId(chainId: string): string {
    return chainId.toLowerCase().replace(/[^a-z0-9]/g, '');
  }

  /**
   * Check if opportunity is confirmed based on validation criteria
   */
  private isOpportunityConfirmed(validationResult: any): boolean {
    // Require at least 2 out of 4 validation criteria
    const validCriteria = [
      validationResult.contractIdMatch,
      validationResult.chainIdMatch,
      validationResult.liquidityValid,
      validationResult.volumeValid
    ].filter(Boolean).length;

    return validCriteria >= 2;
  }

  /**
   * Confirm a single opportunity with DexScreener validation and AI analysis
   */
  async confirmOpportunity(opportunity: ArbitrageOpportunity): Promise<ConfirmedOpportunity> {
    // Run DexScreener validation and AI analysis in parallel
    const [validationResult, aiAnalysis] = await Promise.all([
      this.validateWithDexScreener(opportunity),
      this.aiAnalysisService.analyzeOpportunity(opportunity)
    ]);

    const isConfirmed = this.isOpportunityConfirmed(validationResult);

    return {
      opportunity,
      isConfirmed,
      confirmationData: validationResult,
      aiAnalysis
    };
  }

  /**
   * Batch confirm multiple opportunities with parallel processing
   */
  async batchConfirmOpportunities(
    opportunities: ArbitrageOpportunity[],
    maxParallel: number = 5
  ): Promise<ConfirmedOpportunity[]> {
    const results: ConfirmedOpportunity[] = [];
    
    // Process opportunities in batches to avoid rate limiting
    for (let i = 0; i < opportunities.length; i += maxParallel) {
      const batch = opportunities.slice(i, i + maxParallel);
      const batchPromises = batch.map(opp => this.confirmOpportunity(opp));
      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);
    }

    return results;
  }

  /**
   * Get only confirmed opportunities from a batch
   */
  async getConfirmedOpportunities(
    opportunities: ArbitrageOpportunity[]
  ): Promise<ConfirmedOpportunity[]> {
    const allResults = await this.batchConfirmOpportunities(opportunities);
    return allResults.filter(result => result.isConfirmed);
  }

  /**
   * Get confirmation statistics for monitoring
   */
  async getConfirmationStats(
    opportunities: ArbitrageOpportunity[]
  ): Promise<{
    total: number;
    confirmed: number;
    confirmationRate: number;
    averageValidationScore: number;
  }> {
    const results = await this.batchConfirmOpportunities(opportunities);
    
    const confirmedCount = results.filter(r => r.isConfirmed).length;
    const validationScores = results.map(result => {
      const validation = result.confirmationData;
      return [
        validation.contractIdMatch ? 1 : 0,
        validation.chainIdMatch ? 1 : 0,
        validation.liquidityValid ? 1 : 0,
        validation.volumeValid ? 1 : 0
      ].reduce((sum, score) => sum + score, 0) / 4;
    });

    const averageScore = validationScores.reduce((sum, score) => sum + score, 0) / validationScores.length;

    return {
      total: results.length,
      confirmed: confirmedCount,
      confirmationRate: results.length > 0 ? confirmedCount / results.length : 0,
      averageValidationScore: averageScore
    };
  }
}
