import { DatabaseManagerPostgres } from '../DatabasePostgres.js';
import { ArbitrageOpportunity } from '../../exchanges/types/index.js';
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
    getUserFilteredOpportunities(userId: string, exchanges?: string[], minProfit?: number, maxVolume?: number): Promise<ArbitrageOpportunity[]>;
    private sanitizeOpportunity;
    private sanitizePercentage;
    private isValidOpportunity;
}
//# sourceMappingURL=PostgresArbitrageOpportunityModel.d.ts.map