import sqlite3 from 'sqlite3';
const { Database: SQLiteDB } = sqlite3;
import { UserModel } from './models/User.js';
import { ArbitrageOpportunityModel } from './models/ArbitrageOpportunity.js';
import { PostgresUserModel } from './models/PostgresUserModel.js';
import { PostgresArbitrageOpportunityModel } from './models/PostgresArbitrageOpportunityModel.js';
import { PostgresDexScreenerCacheModel } from './models/PostgresDexScreenerCacheModel.js';
import { DatabaseManagerPostgres } from './DatabasePostgres.js';
export class DatabaseManager {
    constructor() {
        // Check if we have a PostgreSQL connection string
        if (process.env.DATABASE_URL && process.env.DATABASE_URL.startsWith('postgresql://')) {
            console.log('🔗 Using PostgreSQL database (Railway)');
            this.isPostgres = true;
            this.db = DatabaseManagerPostgres.getInstance();
        }
        else {
            console.log('💾 Using SQLite database (local)');
            this.isPostgres = false;
            const dbPath = process.env.DATABASE_URL || './database.sqlite';
            this.db = new SQLiteDB(dbPath);
        }
        // Initialize models based on database type
        if (this.isPostgres) {
            // Use real PostgreSQL models
            const postgresDb = this.db;
            this.userModel = new PostgresUserModel(postgresDb);
            this.arbitrageModel = new PostgresArbitrageOpportunityModel(postgresDb);
            this.dexscreenerCacheModel = new PostgresDexScreenerCacheModel(postgresDb);
        }
        else {
            this.userModel = new UserModel(this.db);
            this.arbitrageModel = new ArbitrageOpportunityModel(this.db);
            // DexScreener cache only available for PostgreSQL
        }
    }
    static getInstance() {
        if (!DatabaseManager.instance) {
            DatabaseManager.instance = new DatabaseManager();
        }
        return DatabaseManager.instance;
    }
    async init() {
        try {
            if (this.isPostgres) {
                // PostgreSQL initialization
                await this.db.init();
                await this.userModel.createTable();
                await this.arbitrageModel.createTable();
                if (this.dexscreenerCacheModel) {
                    await this.dexscreenerCacheModel.createTable();
                }
                console.log('✅ PostgreSQL database initialized successfully');
            }
            else {
                // SQLite initialization
                await this.userModel.createTable();
                await this.arbitrageModel.createTable();
                console.log('✅ SQLite database initialized successfully');
            }
        }
        catch (error) {
            console.error('❌ Failed to initialize database:', error);
            throw error;
        }
    }
    getUserModel() {
        return this.userModel;
    }
    getArbitrageModel() {
        return this.arbitrageModel;
    }
    getDexScreenerCacheModel() {
        return this.dexscreenerCacheModel;
    }
    getDatabase() {
        return this.db;
    }
    async close() {
        if (this.isPostgres) {
            await this.db.close();
        }
        else {
            return new Promise((resolve, reject) => {
                this.db.close((err) => {
                    if (err) {
                        reject(err);
                    }
                    else {
                        resolve();
                    }
                });
            });
        }
    }
    async runMigrations() {
        // Add migration logic here if needed
        console.log('Running database migrations...');
        // For now, just ensure tables exist
        await this.init();
    }
}
//# sourceMappingURL=Database.js.map