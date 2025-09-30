import sqlite3 from 'sqlite3';
type SQLiteDatabase = sqlite3.Database;
import { UserModel } from './models/User.js';
import { ArbitrageOpportunityModel } from './models/ArbitrageOpportunity.js';
import { DatabaseManagerPostgres } from './DatabasePostgres.js';
export declare class DatabaseManager {
    private static instance;
    private db;
    private userModel;
    private arbitrageModel;
    private isPostgres;
    private constructor();
    static getInstance(): DatabaseManager;
    init(): Promise<void>;
    getUserModel(): UserModel;
    getArbitrageModel(): ArbitrageOpportunityModel;
    getDatabase(): SQLiteDatabase | DatabaseManagerPostgres;
    close(): Promise<void>;
    runMigrations(): Promise<void>;
    private createPostgresUserModel;
    private createPostgresArbitrageModel;
}
export {};
//# sourceMappingURL=Database.d.ts.map