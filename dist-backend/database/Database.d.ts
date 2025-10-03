import sqlite3 from 'sqlite3';
type SQLiteDatabase = sqlite3.Database;
import { UserModel } from './models/User.js';
import { ArbitrageOpportunityModel } from './models/ArbitrageOpportunity.js';
import { PostgresUserModel } from './models/PostgresUserModel.js';
import { PostgresArbitrageOpportunityModel } from './models/PostgresArbitrageOpportunityModel.js';
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
    getUserModel(): UserModel | PostgresUserModel;
    getArbitrageModel(): ArbitrageOpportunityModel | PostgresArbitrageOpportunityModel;
    getDatabase(): SQLiteDatabase | DatabaseManagerPostgres;
    close(): Promise<void>;
    runMigrations(): Promise<void>;
}
export {};
//# sourceMappingURL=Database.d.ts.map