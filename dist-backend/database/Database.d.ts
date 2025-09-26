import sqlite3 from 'sqlite3';
type SQLiteDatabase = sqlite3.Database;
import { UserModel } from './models/User.js';
import { ArbitrageOpportunityModel } from './models/ArbitrageOpportunity.js';
export declare class DatabaseManager {
    private static instance;
    private db;
    private userModel;
    private arbitrageModel;
    private constructor();
    static getInstance(): DatabaseManager;
    init(): Promise<void>;
    getUserModel(): UserModel;
    getArbitrageModel(): ArbitrageOpportunityModel;
    getDatabase(): SQLiteDatabase;
    close(): Promise<void>;
    runMigrations(): Promise<void>;
}
export {};
//# sourceMappingURL=Database.d.ts.map