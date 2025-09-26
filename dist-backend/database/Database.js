import sqlite3 from 'sqlite3';
const { Database: SQLiteDB } = sqlite3;
import { UserModel } from './models/User.js';
import { ArbitrageOpportunityModel } from './models/ArbitrageOpportunity.js';
export class DatabaseManager {
    constructor() {
        const dbPath = process.env.DATABASE_URL || './database.sqlite';
        this.db = new SQLiteDB(dbPath);
        this.userModel = new UserModel(this.db);
        this.arbitrageModel = new ArbitrageOpportunityModel(this.db);
    }
    static getInstance() {
        if (!DatabaseManager.instance) {
            DatabaseManager.instance = new DatabaseManager();
        }
        return DatabaseManager.instance;
    }
    async init() {
        try {
            await this.userModel.createTable();
            await this.arbitrageModel.createTable();
            console.log('Database initialized successfully');
        }
        catch (error) {
            console.error('Failed to initialize database:', error);
            throw error;
        }
    }
    getUserModel() {
        return this.userModel;
    }
    getArbitrageModel() {
        return this.arbitrageModel;
    }
    getDatabase() {
        return this.db;
    }
    async close() {
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
    async runMigrations() {
        // Add migration logic here if needed
        console.log('Running database migrations...');
        // For now, just ensure tables exist
        await this.init();
    }
}
//# sourceMappingURL=Database.js.map