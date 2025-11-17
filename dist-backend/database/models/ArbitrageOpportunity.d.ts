import { Database } from 'sqlite3';
import { ArbitrageOpportunity } from '../../exchanges/types/index.js';
import { ContractDataRecord } from '../types.js';
export declare class ArbitrageOpportunityModel {
    private db;
    constructor(db: Database);
    createTable(): Promise<void>;
    insert(opportunities: ArbitrageOpportunity[]): Promise<void>;
    getTopOpportunities(limit?: number): Promise<ArbitrageOpportunity[]>;
    getRecentOpportunities(minutes?: number): Promise<ArbitrageOpportunity[]>;
    cleanupOldData(hoursToKeep?: number): Promise<void>;
    clearAllOpportunities(): Promise<void>;
    getStatistics(): Promise<{
        total: number;
        avgProfit: number;
        maxProfit: number;
    }>;
    private runStatement;
    private ensureExtendedColumns;
    private mapRowToOpportunity;
    updateContractData(symbol: string, timestamp: number, data: ContractDataRecord): Promise<void>;
    getLatestOpportunityBySymbol(symbol: string): Promise<ArbitrageOpportunity | null>;
}
//# sourceMappingURL=ArbitrageOpportunity.d.ts.map