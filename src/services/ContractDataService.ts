import { ArbitrageOpportunity } from '../exchanges/types/index.js';
import { DatabaseManager } from '../database/Database.js';
import { claudeAnalyzer } from './ClaudeAnalyzer.js';
import { DexScreenerService } from './DexScreenerService.js';
import { ContractDataRecord } from '../database/types.js';
import { config } from '../config/environment.js';

/** Where a piece of contract metadata came from. Drives how much we trust it. */
type ContractDataSource = 'dexscreener' | 'claude' | 'none';

/**
 * DexScreener identifies chains by slug. Map the common ones to the numeric
 * EVM chain ID and a display name so both resolution paths produce consistent
 * values downstream instead of one storing "ethereum" and the other "1".
 */
const CHAIN_SLUGS: Record<string, { chainId: string; chainName: string }> = {
  ethereum: { chainId: '1', chainName: 'Ethereum' },
  bsc: { chainId: '56', chainName: 'BNB Smart Chain' },
  polygon: { chainId: '137', chainName: 'Polygon' },
  arbitrum: { chainId: '42161', chainName: 'Arbitrum One' },
  optimism: { chainId: '10', chainName: 'Optimism' },
  base: { chainId: '8453', chainName: 'Base' },
  avalanche: { chainId: '43114', chainName: 'Avalanche C-Chain' },
  fantom: { chainId: '250', chainName: 'Fantom' },
  cronos: { chainId: '25', chainName: 'Cronos' },
  celo: { chainId: '42220', chainName: 'Celo' },
  linea: { chainId: '59144', chainName: 'Linea' },
  scroll: { chainId: '534352', chainName: 'Scroll' },
  zksync: { chainId: '324', chainName: 'zkSync Era' }
};

/**
 * ContractDataService - contract metadata enrichment
 *
 * Source priority, highest trust first:
 *
 * 1. DexScreener - a real index lookup. Returns an address that actually
 *    exists on a chain, and the answer is reproducible.
 * 2. Claude - recall only. No web_search or web_fetch tool is attached to
 *    these requests, so the model cannot consult Etherscan or any other
 *    explorer; it can only remember or guess. Used when DexScreener has
 *    nothing, and its output is never recorded as verified.
 *
 * This order was previously reversed: DexScreener was disabled by default and
 * the model was described as the primary source. Because a wrong contract
 * address costs a user real funds, an unknown address is preferred to a
 * confident guess.
 */
export class ContractDataService {
  private static instance: ContractDataService;
  private db: DatabaseManager;
  private readonly enabled: boolean;
  private readonly batchSize: number;
  private readonly rateLimitDelay: number;

  private constructor() {
    this.db = DatabaseManager.getInstance();
    this.enabled = config.contractData.enabled;
    this.batchSize = config.contractData.batchSize;
    this.rateLimitDelay = config.contractData.rateLimitDelay;
  }

  public static getInstance(): ContractDataService {
    if (!ContractDataService.instance) {
      ContractDataService.instance = new ContractDataService();
    }
    return ContractDataService.instance;
  }

  public async processBatch(opportunities: ArbitrageOpportunity[]): Promise<void> {
    if (!this.enabled) {
      console.log(`⚠️ [CONTRACT-SERVICE] Contract data extraction is DISABLED`);
      return;
    }

    if (opportunities.length === 0) {
      return;
    }

    console.log(`🔄 [CONTRACT-SERVICE] Processing batch of ${opportunities.length} opportunities (batch size: ${this.batchSize})`);
    const limited = opportunities.slice(0, this.batchSize);

    for (const opportunity of limited) {
      try {
        console.log(`🔍 [CONTRACT-SERVICE] Extracting contract data for ${opportunity.symbol}`);
        await this.extractAndEnrichOpportunity(opportunity);
      } catch (error) {
        console.error(`❌ [CONTRACT-SERVICE] Contract data extraction failed for ${opportunity.symbol}:`, error);
      }
      await this.delay(this.rateLimitDelay);
    }

    console.log(`✅ [CONTRACT-SERVICE] Batch processing complete`);
  }

  public async ensureContractDataBySymbol(symbol: string): Promise<{ opportunity: ArbitrageOpportunity | null, record: ContractDataRecord | null }> {
    const model: any = this.db.getArbitrageModel();
    if (typeof model.getLatestOpportunityBySymbol !== 'function') {
      return { opportunity: null, record: null };
    }

    const opportunity: ArbitrageOpportunity | null = await model.getLatestOpportunityBySymbol(symbol);
    if (!opportunity) {
      return { opportunity: null, record: null };
    }

    if (opportunity.contractDataExtracted && opportunity.contractAddress) {
      return { opportunity, record: this.opportunityToRecord(opportunity) };
    }

    const record = await this.extractAndStoreContractData(opportunity);
    return { opportunity, record };
  }

  private async extractAndEnrichOpportunity(opportunity: ArbitrageOpportunity): Promise<void> {
    if (!this.enabled) {
      return;
    }

    console.log(`🎯 [CONTRACT-SERVICE] Resolving contract data for ${opportunity.symbol}`);
    const { record, source, failed } = await this.resolveContractData(opportunity);

    // A failed lookup teaches us nothing about this token. Marking it as
    // extracted anyway - which is what used to happen - meant a single rate
    // limit or network blip permanently excluded the opportunity from every
    // later enrichment pass, because the rescan filter skips anything already
    // flagged as extracted.
    if (failed) {
      console.warn(`   Leaving contractDataExtracted=false for ${opportunity.symbol} so it is retried.`);
      return;
    }

    // CRITICAL: Enrich the opportunity object directly so it's inserted with enrichment data
    opportunity.contractAddress = record.contractAddress || undefined;
    opportunity.chainId = record.chainId || opportunity.chainId || undefined;
    opportunity.chainName = record.chainName || undefined;
    opportunity.isContractVerified = record.isVerified ?? undefined;
    opportunity.decimals = record.decimals ?? undefined;
    opportunity.contractDataExtracted = true;

    console.log(`✅ [CONTRACT-SERVICE] Opportunity enriched (source: ${source}):`, {
      symbol: opportunity.symbol,
      contractAddress: opportunity.contractAddress,
      chainId: opportunity.chainId,
      chainName: opportunity.chainName,
      isVerified: opportunity.isContractVerified,
      decimals: opportunity.decimals,
      contractDataExtracted: opportunity.contractDataExtracted
    });
  }

  private async extractAndStoreContractData(opportunity: ArbitrageOpportunity): Promise<ContractDataRecord | null> {
    if (!this.enabled) {
      return null;
    }

    console.log(`🎯 [CONTRACT-SERVICE] Resolving contract data for ${opportunity.symbol}`);
    const { record, source, failed } = await this.resolveContractData(opportunity);

    // Do not overwrite stored data with nulls produced by a failed lookup.
    if (failed) {
      console.warn(`   Nothing written to the database for ${opportunity.symbol}; existing data is left intact.`);
      return null;
    }

    console.log(`💾 [CONTRACT-SERVICE] Storing data (source: ${source}):`, {
      symbol: opportunity.symbol,
      contractAddress: record.contractAddress,
      chainId: record.chainId,
      chainName: record.chainName,
      isVerified: record.isVerified,
      decimals: record.decimals
    });

    const model: any = this.db.getArbitrageModel();
    if (typeof model.updateContractData === 'function') {
      await model.updateContractData(opportunity.symbol, opportunity.timestamp, record);
      console.log(`✅ [CONTRACT-SERVICE] Data stored successfully for ${opportunity.symbol}`);
    } else {
      console.warn(`⚠️ [CONTRACT-SERVICE] updateContractData method not available on model`);
    }

    return record;
  }

  private opportunityToRecord(opportunity: ArbitrageOpportunity): ContractDataRecord | null {
    if (!opportunity.contractAddress && !opportunity.chainId && !opportunity.chainName) {
      return null;
    }

    return {
      contractAddress: opportunity.contractAddress || null,
      chainId: opportunity.chainId || null,
      chainName: opportunity.chainName || null,
      isVerified: opportunity.isContractVerified ?? null,
      decimals: opportunity.decimals ?? null
    };
  }

  /**
   * Resolve contract metadata, preferring a source that can actually be checked.
   *
   * Order matters. DexScreener queries a real index and returns an address that
   * exists on a chain. A language model has no network access here - no
   * web_search or web_fetch tool is attached - so it can only recall or invent
   * one, and an invented contract address is worse than no address at all.
   * Claude therefore runs only when DexScreener has nothing.
   */
  public async resolveContractData(
    opportunity: ArbitrageOpportunity
  ): Promise<{ record: ContractDataRecord; source: ContractDataSource; failed: boolean }> {
    const empty: ContractDataRecord = {
      contractAddress: null,
      chainId: null,
      chainName: null,
      isVerified: null,
      decimals: null
    };

    // 1. Real, verifiable source.
    if (config.dexScreener.enabled) {
      try {
        const dex = await DexScreenerService.getInstance().resolveBySymbol(opportunity.symbol);
        if (dex?.tokenAddress && dex?.chainId) {
          const slug = dex.chainId.toLowerCase();
          const mapped = CHAIN_SLUGS[slug];
          console.log(`🔗 [CONTRACT-SERVICE] ${opportunity.symbol}: resolved from DexScreener (${slug})`);
          return {
            source: 'dexscreener',
            failed: false,
            record: {
              contractAddress: dex.tokenAddress,
              chainId: mapped?.chainId ?? slug,
              chainName: mapped?.chainName ?? dex.chainId,
              // DexScreener indexes liquidity, not explorer source verification,
              // so it cannot answer this. Unknown, rather than a guess.
              isVerified: null,
              decimals: null
            }
          };
        }
        console.log(`ℹ️ [CONTRACT-SERVICE] ${opportunity.symbol}: no DexScreener match, falling back to Claude`);
      } catch (error) {
        console.warn(`⚠️ [CONTRACT-SERVICE] DexScreener lookup failed for ${opportunity.symbol}:`, error);
      }
    }

    // 2. Fallback: model recall. Treated as a hint, never as verified fact.
    if (!claudeAnalyzer.isEnabled()) {
      console.warn(`⚠️ [CONTRACT-SERVICE] ${opportunity.symbol}: no contract data (DexScreener found nothing, Claude disabled)`);
      return { record: empty, source: 'none', failed: false };
    }

    const description = this.buildDescription(opportunity);
    const result = await claudeAnalyzer.extractContractData(opportunity.symbol, description);

    if (result.error) {
      console.warn(`⚠️ [CONTRACT-SERVICE] Claude lookup FAILED for ${opportunity.symbol}: ${result.error.kind} - ${result.error.detail}`);
      return { record: empty, source: 'none', failed: true };
    }

    return {
      source: result.contract_address ? 'claude' : 'none',
      failed: false,
      record: {
        contractAddress: result.contract_address,
        chainId: result.chain_id !== null ? String(result.chain_id) : (result.chain_name || opportunity.chainId || null),
        chainName: result.chain_name,
        // Never inherit is_verified from the model. "Verified on the explorer"
        // is a fact about a block explorer that the model cannot observe, and
        // recording a guess as verification is what made hallucinated
        // addresses look trustworthy downstream.
        isVerified: null,
        decimals: result.decimals
      }
    };
  }

  private buildDescription(opportunity: ArbitrageOpportunity): string {
    return `Symbol: ${opportunity.symbol}
Покупка: ${opportunity.buyExchange} по ${opportunity.buyPrice}
Продажа: ${opportunity.sellExchange} по ${opportunity.sellPrice}
Объем: ${opportunity.volume}
Сеть: ${opportunity.blockchain || 'unknown'}
Timestamp: ${opportunity.timestamp}`;
  }

  private delay(ms: number): Promise<void> {
    if (ms <= 0) return Promise.resolve();
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

