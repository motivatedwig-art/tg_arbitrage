import sqlite3 from 'sqlite3';
const { Database: SQLiteDB } = sqlite3;
import { UserModel } from './models/User.js';
import { ArbitrageOpportunityModel } from './models/ArbitrageOpportunity.js';
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
            // For PostgreSQL, we need to create compatible models
            // For now, create mock models that work with PostgreSQL
            this.userModel = this.createPostgresUserModel();
            this.arbitrageModel = this.createPostgresArbitrageModel();
        }
        else {
            this.userModel = new UserModel(this.db);
            this.arbitrageModel = new ArbitrageOpportunityModel(this.db);
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
                console.log('✅ PostgreSQL database initialized successfully');
            }
            else {
                // SQLite initialization
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
    createPostgresUserModel() {
        // Create a mock user model that works with PostgreSQL
        // This is a temporary solution until we implement proper PostgreSQL models
        return {
            createTable: async () => {
                // PostgreSQL table creation handled by migrations
                console.log('PostgreSQL user table creation handled by migrations');
            },
            findByTelegramId: async (telegramId) => {
                // Mock implementation for PostgreSQL
                console.log(`Mock: Finding user by telegram ID ${telegramId}`);
                return null;
            },
            create: async (user) => {
                console.log(`Mock: Creating user ${user.id}`);
            },
            update: async (user) => {
                console.log(`Mock: Updating user ${user.id}`);
            },
            updateLanguage: async (telegramId, language) => {
                console.log(`Mock: Updating language for user ${telegramId} to ${language}`);
            },
            updateNotifications: async (telegramId, notifications) => {
                console.log(`Mock: Updating notifications for user ${telegramId} to ${notifications}`);
            },
            getAllActiveUsers: async () => {
                console.log('Mock: Getting all active users');
                return [];
            }
        };
    }
    createPostgresArbitrageModel() {
        // Create a mock arbitrage model that works with PostgreSQL
        // This is a temporary solution until we implement proper PostgreSQL models
        return {
            createTable: async () => {
                // PostgreSQL table creation handled by migrations
                console.log('PostgreSQL arbitrage table creation handled by migrations');
            },
            insert: async (opportunities) => {
                console.log(`Mock: Inserting ${opportunities.length} arbitrage opportunities`);
                // For now, just log the opportunities
                if (opportunities.length > 0) {
                    console.log(`Sample opportunity: ${opportunities[0].symbol} - ${opportunities[0].profitPercentage.toFixed(2)}% profit`);
                }
            },
            getTopOpportunities: async (limit = 10) => {
                console.log(`Mock: Getting top ${limit} arbitrage opportunities`);
                // Return mock data for testing
                return [
                    {
                        symbol: 'BTC/USDT',
                        buyExchange: 'Binance',
                        sellExchange: 'OKX',
                        buyPrice: 45000,
                        sellPrice: 45100,
                        profitPercentage: 0.22,
                        profitAmount: 100,
                        volume: 1000000,
                        timestamp: Date.now()
                    },
                    {
                        symbol: 'ETH/USDT',
                        buyExchange: 'Bybit',
                        sellExchange: 'MEXC',
                        buyPrice: 3000,
                        sellPrice: 3005,
                        profitPercentage: 0.17,
                        profitAmount: 5,
                        volume: 500000,
                        timestamp: Date.now()
                    }
                ];
            },
            getRecentOpportunities: async (minutes = 30) => {
                console.log(`Mock: Getting recent arbitrage opportunities from last ${minutes} minutes`);
                return [];
            },
            cleanupOldData: async (hoursToKeep = 24) => {
                console.log(`Mock: Cleaning up old data older than ${hoursToKeep} hours`);
            },
            getStatistics: async () => {
                console.log('Mock: Getting arbitrage statistics');
                return {
                    total: 12,
                    avgProfit: 1.35,
                    maxProfit: 1.62
                };
            }
        };
    }
}
//# sourceMappingURL=Database.js.map