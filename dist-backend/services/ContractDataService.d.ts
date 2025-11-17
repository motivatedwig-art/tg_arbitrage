import { ArbitrageOpportunity } from '../exchanges/types/index.js';
import { ContractDataRecord } from '../database/types.js';
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
    private extractAndStoreContractData;
    private opportunityToRecord;
    private buildDescription;
    private delay;
}
//# sourceMappingURL=ContractDataService.d.ts.map