import { ArbitrageOpportunity } from '../exchanges/types/index.js';
import { DatabaseManager } from '../database/Database.js';
import { claudeAnalyzer } from './ClaudeAnalyzer.js';
import { ContractDataRecord } from '../database/types.js';
import { config } from '../config/environment.js';

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
    if (!this.enabled || opportunities.length === 0) {
      return;
    }

    const limited = opportunities.slice(0, this.batchSize);
    for (const opportunity of limited) {
      try {
        await this.extractAndStoreContractData(opportunity);
      } catch (error) {
        console.warn(`⚠️ Contract data extraction failed for ${opportunity.symbol}:`, error);
      }
      await this.delay(this.rateLimitDelay);
    }
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

  private async extractAndStoreContractData(opportunity: ArbitrageOpportunity): Promise<ContractDataRecord | null> {
    if (!this.enabled) {
      return null;
    }

    const description = this.buildDescription(opportunity);
    const result = await claudeAnalyzer.extractContractData(opportunity.symbol, description);

    const record: ContractDataRecord = {
      contractAddress: result.contract_address,
      chainId: result.chain_id !== null && result.chain_id !== undefined ? String(result.chain_id) : (result.chain_name || opportunity.chainId || null),
      chainName: result.chain_name,
      isVerified: result.is_verified,
      decimals: result.decimals
    };

    const model: any = this.db.getArbitrageModel();
    if (typeof model.updateContractData === 'function') {
      await model.updateContractData(opportunity.symbol, opportunity.timestamp, record);
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

