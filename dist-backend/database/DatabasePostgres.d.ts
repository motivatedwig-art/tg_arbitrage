import { Pool } from 'pg';
export declare class DatabaseManagerPostgres {
    private static instance;
    private pool;
    private constructor();
    static getInstance(): DatabaseManagerPostgres;
    init(): Promise<void>;
    getPool(): Pool;
    close(): Promise<void>;
    query(text: string, params?: any[]): Promise<any>;
    insertOpportunities(opportunities: any[]): Promise<void>;
    getRecentOpportunities(minutes?: number): Promise<any[]>;
    getStatistics(): Promise<{
        total: number;
        avgProfit: number;
        maxProfit: number;
    }>;
    cleanupOldData(hoursToKeep?: number): Promise<void>;
}
//# sourceMappingURL=DatabasePostgres.d.ts.map