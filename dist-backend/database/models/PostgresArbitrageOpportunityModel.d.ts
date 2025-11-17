import { DatabaseManagerPostgres } from '../DatabasePostgres.js';
import { ArbitrageOpportunity } from '../../exchanges/types/index.js';
import { ContractDataRecord } from '../types.js';
export declare class PostgresArbitrageOpportunityModel {
    private db;
    constructor(db: DatabaseManagerPostgres);
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
    getVolumeBasedOpportunities(minVolume?: number, limit?: number): Promise<ArbitrageOpportunity[]>;
    updateContractData(symbol: string, timestamp: number, data: ContractDataRecord): Promise<void>;
    getLatestOpportunityBySymbol(symbol: string): Promise<ArbitrageOpportunity | null>;
    getUserFilteredOpportunities(userId: string, exchanges?: string[], minProfit?: number, maxVolume?: number): Promise<ArbitrageOpportunity[]>;
    private sanitizeOpportunity;
    private mapRowToOpportunity;
    private sanitizePercentage;
    private isValidOpportunity;
}
//# sourceMappingURL=PostgresArbitrageOpportunityModel.d.ts.map