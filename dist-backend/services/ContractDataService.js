import { DatabaseManager } from '../database/Database.js';
import { claudeAnalyzer } from './ClaudeAnalyzer.js';
import { config } from '../config/environment.js';
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
        if (!this.enabled || opportunities.length === 0) {
            return;
        }
        const limited = opportunities.slice(0, this.batchSize);
        for (const opportunity of limited) {
            try {
                await this.extractAndStoreContractData(opportunity);
            }
            catch (error) {
                console.warn(`⚠️ Contract data extraction failed for ${opportunity.symbol}:`, error);
            }
            await this.delay(this.rateLimitDelay);
        }
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
    async extractAndStoreContractData(opportunity) {
        if (!this.enabled) {
            return null;
        }
        const description = this.buildDescription(opportunity);
        const result = await claudeAnalyzer.extractContractData(opportunity.symbol, description);
        const record = {
            contractAddress: result.contract_address,
            chainId: result.chain_id !== null && result.chain_id !== undefined ? String(result.chain_id) : (result.chain_name || opportunity.chainId || null),
            chainName: result.chain_name,
            isVerified: result.is_verified,
            decimals: result.decimals
        };
        const model = this.db.getArbitrageModel();
        if (typeof model.updateContractData === 'function') {
            await model.updateContractData(opportunity.symbol, opportunity.timestamp, record);
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