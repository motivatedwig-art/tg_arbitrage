import { DatabaseManager } from '../database/Database.js';
import { claudeAnalyzer } from './ClaudeAnalyzer.js';
import { config } from '../config/environment.js';
/**
 * ContractDataService - PRIMARY ENRICHMENT SERVICE
 *
 * CRITICAL: This service uses Claude AI (Anthropic API) as the PRIMARY enrichment tool
 * for extracting contract metadata (contract address, chain ID, verification status, etc.)
 *
 * DexScreener is used ONLY for:
 * - Token images/logos
 * - Price data
 * - Liquidity information
 *
 * Claude AI is used for ALL contract metadata extraction.
 */
export class ContractDataService {
    constructor() {
        this.db = DatabaseManager.getInstance();
        this.enabled = config.contractData.enabled;
        this.batchSize = config.contractData.batchSize;
        this.rateLimitDelay = config.contractData.rateLimitDelay;
    }
    static getInstance() {
        if (!ContractDataService.instance) {
            ContractDataService.instance = new ContractDataService();
        }
        return ContractDataService.instance;
    }
    async processBatch(opportunities) {
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
            }
            catch (error) {
                console.error(`❌ [CONTRACT-SERVICE] Contract data extraction failed for ${opportunity.symbol}:`, error);
            }
            await this.delay(this.rateLimitDelay);
        }
        console.log(`✅ [CONTRACT-SERVICE] Batch processing complete`);
    }
    async ensureContractDataBySymbol(symbol) {
        const model = this.db.getArbitrageModel();
        if (typeof model.getLatestOpportunityBySymbol !== 'function') {
            return { opportunity: null, record: null };
        }
        const opportunity = await model.getLatestOpportunityBySymbol(symbol);
        if (!opportunity) {
            return { opportunity: null, record: null };
        }
        if (opportunity.contractDataExtracted && opportunity.contractAddress) {
            return { opportunity, record: this.opportunityToRecord(opportunity) };
        }
        const record = await this.extractAndStoreContractData(opportunity);
        return { opportunity, record };
    }
    async extractAndEnrichOpportunity(opportunity) {
        if (!this.enabled) {
            return;
        }
        console.log(`🎯 [CONTRACT-SERVICE] Building description for ${opportunity.symbol}`);
        const description = this.buildDescription(opportunity);
        console.log(`🤖 [CONTRACT-SERVICE] Calling Claude AI (PRIMARY ENRICHMENT) to extract contract data...`);
        const result = await claudeAnalyzer.extractContractData(opportunity.symbol, description);
        // CRITICAL: Enrich the opportunity object directly so it's inserted with enrichment data
        opportunity.contractAddress = result.contract_address || undefined;
        opportunity.chainId = result.chain_id !== null && result.chain_id !== undefined ? String(result.chain_id) : (result.chain_name || opportunity.chainId || undefined);
        opportunity.chainName = result.chain_name || undefined;
        opportunity.isContractVerified = result.is_verified || undefined;
        opportunity.decimals = result.decimals || undefined;
        opportunity.contractDataExtracted = true;
        console.log(`✅ [CONTRACT-SERVICE] Opportunity enriched with Claude AI data:`, {
            symbol: opportunity.symbol,
            contractAddress: opportunity.contractAddress,
            chainId: opportunity.chainId,
            chainName: opportunity.chainName,
            isVerified: opportunity.isContractVerified,
            decimals: opportunity.decimals,
            contractDataExtracted: opportunity.contractDataExtracted
        });
    }
    async extractAndStoreContractData(opportunity) {
        if (!this.enabled) {
            return null;
        }
        console.log(`🎯 [CONTRACT-SERVICE] Building description for ${opportunity.symbol}`);
        const description = this.buildDescription(opportunity);
        console.log(`🤖 [CONTRACT-SERVICE] Calling Claude AI to extract contract data...`);
        const result = await claudeAnalyzer.extractContractData(opportunity.symbol, description);
        const record = {
            contractAddress: result.contract_address,
            chainId: result.chain_id !== null && result.chain_id !== undefined ? String(result.chain_id) : (result.chain_name || opportunity.chainId || null),
            chainName: result.chain_name,
            isVerified: result.is_verified,
            decimals: result.decimals
        };
        console.log(`💾 [CONTRACT-SERVICE] Storing extracted data:`, {
            symbol: opportunity.symbol,
            contractAddress: record.contractAddress,
            chainId: record.chainId,
            chainName: record.chainName,
            isVerified: record.isVerified,
            decimals: record.decimals
        });
        const model = this.db.getArbitrageModel();
        if (typeof model.updateContractData === 'function') {
            await model.updateContractData(opportunity.symbol, opportunity.timestamp, record);
            console.log(`✅ [CONTRACT-SERVICE] Data stored successfully for ${opportunity.symbol}`);
        }
        else {
            console.warn(`⚠️ [CONTRACT-SERVICE] updateContractData method not available on model`);
        }
        return record;
    }
    opportunityToRecord(opportunity) {
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
    buildDescription(opportunity) {
        return `Symbol: ${opportunity.symbol}
Покупка: ${opportunity.buyExchange} по ${opportunity.buyPrice}
Продажа: ${opportunity.sellExchange} по ${opportunity.sellPrice}
Объем: ${opportunity.volume}
Сеть: ${opportunity.blockchain || 'unknown'}
Timestamp: ${opportunity.timestamp}`;
    }
    delay(ms) {
        if (ms <= 0)
            return Promise.resolve();
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}
//# sourceMappingURL=ContractDataService.js.map