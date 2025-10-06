import { Database } from 'sqlite3';
import { ArbitrageOpportunity } from '../../exchanges/types';
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
}
//# sourceMappingURL=ArbitrageOpportunity.d.ts.map