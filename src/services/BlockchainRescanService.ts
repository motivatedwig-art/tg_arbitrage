import { DatabaseManager } from '../database/Database.js';
import { ArbitrageOpportunity } from '../exchanges/types/index.js';
import { claudeAnalyzer } from './ClaudeAnalyzer.js';
import { config } from '../config/environment.js';

/**
 * BlockchainRescanService - Rescans opportunities with missing blockchain data
 *
 * CRITICAL: Every cryptocurrency token MUST exist on a blockchain.
 * This service identifies opportunities with missing/unknown blockchain data
 * and uses Claude AI to extract the correct chain and contract information.
 *
 * Triggers:
 * - Scheduled job (every hour)
 * - Manual API call
 * - After initial opportunity detection
 */
export class BlockchainRescanService {
  private static instance: BlockchainRescanService;
  private db: DatabaseManager;
  private readonly enabled: boolean;
  private isRunning: boolean = false;

  private constructor() {
    this.db = DatabaseManager.getInstance();
    this.enabled = config.contractData.enabled;
  }

  public static getInstance(): BlockchainRescanService {
    if (!BlockchainRescanService.instance) {
      BlockchainRescanService.instance = new BlockchainRescanService();
    }
    return BlockchainRescanService.instance;
  }

  /**
   * Find opportunities with missing blockchain data
   * A token has "unknown" blockchain if:
   * - blockchain is null/undefined/empty
   * - blockchain is "UNKNOWN" or "unknown"
   * - contractAddress is null/undefined/empty
   * - chainId is null/undefined/empty
   * - contractDataExtracted is false
   */
  private async getOpportunitiesWithUnknownBlockchain(): Promise<ArbitrageOpportunity[]> {
    const model = this.db.getArbitrageModel();

    // Get all opportunities from last 24 hours
    const allOpportunities = await model.getRecentOpportunities(24 * 60);

    // Filter for opportunities with missing blockchain data
    const unknownOpportunities = allOpportunities.filter(opp => {
      const hasUnknownBlockchain = !opp.blockchain ||
                                    opp.blockchain.toLowerCase() === 'unknown' ||
                                    opp.blockchain.trim() === '';

      const hasMissingContract = !opp.contractAddress ||
                                  opp.contractAddress.trim() === '';

      const hasMissingChain = !opp.chainId ||
                              opp.chainId.trim() === '';

      const notExtracted = !opp.contractDataExtracted;

      return hasUnknownBlockchain || hasMissingContract || hasMissingChain || notExtracted;
    });

    return unknownOpportunities;
  }

  /**
   * Rescan a single opportunity using Claude AI
   */
  private async rescanOpportunity(opportunity: ArbitrageOpportunity): Promise<boolean> {
    console.log(`🔄 [RESCAN] Rescanning ${opportunity.symbol} (blockchain: ${opportunity.blockchain || 'UNKNOWN'})`);

    try {
      // Build comprehensive description for Claude
      const description = `Symbol: ${opportunity.symbol}
Exchange Buy: ${opportunity.buyExchange} at price ${opportunity.buyPrice}
Exchange Sell: ${opportunity.sellExchange} at price ${opportunity.sellPrice}
Volume: ${opportunity.volume}
Current Blockchain: ${opportunity.blockchain || 'UNKNOWN'}
Profit: ${opportunity.profitPercentage}%
Timestamp: ${opportunity.timestamp}

CRITICAL: Every cryptocurrency token MUST exist on a specific blockchain.
Please identify the correct blockchain network, chain ID, and contract address for this token.`;

      // Call Claude AI to extract blockchain data
      const result = await claudeAnalyzer.extractContractData(opportunity.symbol, description);

      // Check if we got valid data
      const hasValidData = result.contract_address &&
                          result.chain_id &&
                          result.chain_name;

      if (hasValidData) {
        console.log(`✅ [RESCAN] Successfully extracted blockchain data for ${opportunity.symbol}:`);
        console.log(`   Contract: ${result.contract_address}`);
        console.log(`   Chain ID: ${result.chain_id}`);
        console.log(`   Chain Name: ${result.chain_name}`);

        // Update the opportunity in database
        const updated = await this.updateOpportunityBlockchainData(
          opportunity,
          result.contract_address!,
          String(result.chain_id!),
          result.chain_name!,
          result.is_verified || false,
          result.decimals || 18
        );

        if (updated) {
          console.log(`💾 [RESCAN] Updated database for ${opportunity.symbol}`);
          return true;
        } else {
          console.warn(`⚠️ [RESCAN] Failed to update database for ${opportunity.symbol}`);
          return false;
        }
      } else {
        console.warn(`⚠️ [RESCAN] Claude AI could not find complete blockchain data for ${opportunity.symbol}`);
        console.warn(`   Extracted: contract=${result.contract_address}, chain_id=${result.chain_id}, chain_name=${result.chain_name}`);
        return false;
      }
    } catch (error) {
      console.error(`❌ [RESCAN] Error rescanning ${opportunity.symbol}:`, error);
      return false;
    }
  }

  /**
   * Update opportunity blockchain data in database
   */
  private async updateOpportunityBlockchainData(
    opportunity: ArbitrageOpportunity,
    contractAddress: string,
    chainId: string,
    chainName: string,
    isVerified: boolean,
    decimals: number
  ): Promise<boolean> {
    try {
      const model: any = this.db.getArbitrageModel();

      // Check if model has update method
      if (typeof model.updateContractData === 'function') {
        await model.updateContractData(opportunity.symbol, opportunity.timestamp, {
          contractAddress,
          chainId,
          chainName,
          isVerified,
          decimals
        });
        return true;
      } else {
        console.warn(`⚠️ [RESCAN] updateContractData method not available on model`);
        return false;
      }
    } catch (error) {
      console.error(`❌ [RESCAN] Database update error:`, error);
      return false;
    }
  }

  /**
   * Run full rescan of all opportunities with unknown blockchain data
   */
  public async runRescan(): Promise<{ total: number; successful: number; failed: number }> {
    if (!this.enabled) {
      console.log(`⚠️ [RESCAN] Rescan service is DISABLED (CONTRACT_DATA_ENABLED=false)`);
      return { total: 0, successful: 0, failed: 0 };
    }

    if (this.isRunning) {
      console.log(`⚠️ [RESCAN] Rescan already in progress, skipping...`);
      return { total: 0, successful: 0, failed: 0 };
    }

    this.isRunning = true;
    console.log('');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🔄 [RESCAN] STARTING BLOCKCHAIN RESCAN');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    try {
      // Get opportunities with unknown blockchain data
      const unknownOpportunities = await this.getOpportunitiesWithUnknownBlockchain();

      if (unknownOpportunities.length === 0) {
        console.log(`✅ [RESCAN] No opportunities with unknown blockchain data found`);
        this.isRunning = false;
        return { total: 0, successful: 0, failed: 0 };
      }

      console.log(`📊 [RESCAN] Found ${unknownOpportunities.length} opportunities with unknown/missing blockchain data`);
      console.log(`   Will rescan using Claude AI...`);
      console.log('');

      let successful = 0;
      let failed = 0;

      // Process each opportunity with rate limiting
      for (const opportunity of unknownOpportunities) {
        const success = await this.rescanOpportunity(opportunity);

        if (success) {
          successful++;
        } else {
          failed++;
        }

        // Rate limiting delay (1 second between calls)
        await this.delay(config.contractData.rateLimitDelay);
      }

      console.log('');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log(`✅ [RESCAN] RESCAN COMPLETE`);
      console.log(`   Total: ${unknownOpportunities.length}`);
      console.log(`   Successful: ${successful}`);
      console.log(`   Failed: ${failed}`);
      console.log(`   Success Rate: ${((successful / unknownOpportunities.length) * 100).toFixed(1)}%`);
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('');

      return {
        total: unknownOpportunities.length,
        successful,
        failed
      };
    } catch (error) {
      console.error(`❌ [RESCAN] Rescan failed:`, error);
      return { total: 0, successful: 0, failed: 0 };
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Get count of opportunities with unknown blockchain data
   */
  public async getUnknownCount(): Promise<number> {
    const unknownOpportunities = await this.getOpportunitiesWithUnknownBlockchain();
    return unknownOpportunities.length;
  }

  /**
   * Check if rescan is currently running
   */
  public isRescanRunning(): boolean {
    return this.isRunning;
  }

  private delay(ms: number): Promise<void> {
    if (ms <= 0) return Promise.resolve();
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

export const blockchainRescanService = BlockchainRescanService.getInstance();
