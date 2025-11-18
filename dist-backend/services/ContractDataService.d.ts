import { ArbitrageOpportunity } from '../exchanges/types/index.js';
import { ContractDataRecord } from '../database/types.js';
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
export declare class ContractDataService {
    private static instance;
    private db;
    private readonly enabled;
    private readonly batchSize;
    private readonly rateLimitDelay;
    private constructor();
    static getInstance(): ContractDataService;
    processBatch(opportunities: ArbitrageOpportunity[]): Promise<void>;
    ensureContractDataBySymbol(symbol: string): Promise<{
        opportunity: ArbitrageOpportunity | null;
        record: ContractDataRecord | null;
    }>;
    private extractAndEnrichOpportunity;
    private extractAndStoreContractData;
    private opportunityToRecord;
    private buildDescription;
    private delay;
}
//# sourceMappingURL=ContractDataService.d.ts.map