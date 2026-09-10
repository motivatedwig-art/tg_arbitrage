import { DexScreenerService } from './DexScreenerService.js';
import { TokenMetadataService } from './TokenMetadataService.js';
import { AIAnalysisService } from './AIAnalysisService.js';
import { config } from '../config/environment.js';
export class OpportunityConfirmationService {
    constructor() {
        this.dexScreenerService = DexScreenerService.getInstance();
        this.tokenMetadataService = TokenMetadataService.getInstance();
        this.aiAnalysisService = AIAnalysisService.getInstance();
    }
    static getInstance() {
        if (!OpportunityConfirmationService.instance) {
            OpportunityConfirmationService.instance = new OpportunityConfirmationService();
        }
        return OpportunityConfirmationService.instance;
    }
    /**
     * Validate an opportunity against DexScreener (enabled by default).
     *
     * contractIdMatch and chainIdMatch mean "an independent source agreed" and
     * nothing else. With DEXSCREENER_ENABLED=false, or when DexScreener returns
     * no data, there is nothing to agree with, so both stay false and
     * contractChecked records that no comparison happened - rather than the
     * enriched data being compared against itself.
     */
    async validateWithDexScreener(opportunity) {
        const result = {
            contractIdMatch: false,
            chainIdMatch: false,
            liquidityValid: false,
            volumeValid: false,
            contractChecked: false,
            dexScreenerData: null
        };
        // Liquidity and volume come from the exchange tickers, so they are the same
        // evidence either way.
        result.liquidityValid = opportunity.volume > 1000; // Minimum $1000 liquidity
        result.volumeValid = opportunity.volume > 500; // Minimum $500 volume
        // Check if DexScreener is enabled
        if (!config.dexScreener.enabled) {
            // Nothing independent to compare against, so contract and chain stay
            // unmatched. They previously became true whenever the enriched fields
            // were merely non-empty - the enriched data confirming itself - which
            // meant a fabricated address scored two of the four criteria and passed
            // the >= 2 threshold on its own.
            console.log(`🚫 [VALIDATION] DexScreener disabled - contract and chain cannot be verified for ${opportunity.symbol}`);
            console.log(`   Enriched values (unverified): contract=${opportunity.contractAddress || 'NOT SET'}, chain=${opportunity.chainId || 'NOT SET'}`);
            console.log(`   Liquidity Valid: ${result.liquidityValid ? '✓' : '✗'} (${opportunity.volume.toFixed(2)} > 1000)`);
            console.log(`   Volume Valid:    ${result.volumeValid ? '✓' : '✗'} (${opportunity.volume.toFixed(2)} > 500)`);
            console.log(`   Set DEXSCREENER_ENABLED=true to verify the address against a real index.`);
            return result;
        }
        // DexScreener is ENABLED - use original validation logic
        console.log(`✅ [VALIDATION] DexScreener validation ENABLED (config.dexScreener.enabled = true)`);
        console.log(`   Token: ${opportunity.symbol}`);
        try {
            const dexData = await this.dexScreenerService.resolveBySymbol(opportunity.symbol);
            result.dexScreenerData = dexData;
            if (!dexData) {
                // No independent data arrived, so nothing was actually compared.
                console.log(`   ⚠️  No DexScreener data found for ${opportunity.symbol} - contract left unverified`);
                return result;
            }
            result.contractChecked = true;
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
            console.log(`   ✅ DexScreener Validation Results:`);
            console.log(`      Contract ID Match: ${result.contractIdMatch ? '✓' : '✗'}`);
            console.log(`      Chain ID Match:    ${result.chainIdMatch ? '✓' : '✗'}`);
            console.log(`      Liquidity Valid:   ${result.liquidityValid ? '✓' : '✗'}`);
            console.log(`      Volume Valid:      ${result.volumeValid ? '✓' : '✗'}`);
        }
        catch (error) {
            console.error(`   ❌ DexScreener validation error for ${opportunity.symbol}:`, error);
        }
        return result;
    }
    /**
     * Normalize chain IDs for comparison
     */
    normalizeChainId(chainId) {
        return chainId.toLowerCase().replace(/[^a-z0-9]/g, '');
    }
    /**
     * Decide whether an opportunity counts as confirmed.
     *
     * This used to count "at least 2 of 4 criteria", which did not work as a
     * threshold for two reasons. liquidityValid and volumeValid are the same
     * measurement compared against two thresholds - volume > 1000 implies
     * volume > 500 - so any liquid token scored 2 on its own and passed without
     * anything being verified. And because a contradicted address simply scored
     * 0 on the two match flags rather than disqualifying anything, an
     * opportunity whose contract DexScreener explicitly disagreed with was
     * confirmed anyway.
     *
     * The rule now: adequate volume is necessary, and a contract that was
     * actually checked must not have been contradicted.
     */
    isOpportunityConfirmed(validationResult) {
        // One measurement, so it counts once.
        if (!validationResult.liquidityValid || !validationResult.volumeValid) {
            return false;
        }
        // Where an independent source was consulted, it has to agree. Chain alone
        // is enough when the address itself was not available on both sides.
        if (validationResult.contractChecked) {
            return validationResult.contractIdMatch || validationResult.chainIdMatch;
        }
        // Nothing was verifiable; volume is all the evidence there is.
        return true;
    }
    /**
     * Confirm a single opportunity with DexScreener validation and AI analysis
     */
    async confirmOpportunity(opportunity) {
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
    async batchConfirmOpportunities(opportunities, maxParallel = 5) {
        const results = [];
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
    async getConfirmedOpportunities(opportunities) {
        const allResults = await this.batchConfirmOpportunities(opportunities);
        return allResults.filter(result => result.isConfirmed);
    }
    /**
     * Get confirmation statistics for monitoring
     */
    async getConfirmationStats(opportunities) {
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
//# sourceMappingURL=OpportunityConfirmationService.js.map