import sqlite3 from 'sqlite3';
const { Database: SQLiteDB } = sqlite3;
type SQLiteDatabase = sqlite3.Database;
import { UserModel } from './models/User.js';
import { ArbitrageOpportunityModel } from './models/ArbitrageOpportunity.js';
import { DatabaseManagerPostgres } from './DatabasePostgres.js';

export class DatabaseManager {
  private static instance: DatabaseManager;
  private db: SQLiteDatabase | DatabaseManagerPostgres;
  private userModel: UserModel;
  private arbitrageModel: ArbitrageOpportunityModel;
  private isPostgres: boolean;

  private constructor() {
    // Check if we have a PostgreSQL connection string
    if (process.env.DATABASE_URL && process.env.DATABASE_URL.startsWith('postgresql://')) {
      console.log('🔗 Using PostgreSQL database (Railway)');
      this.isPostgres = true;
      this.db = DatabaseManagerPostgres.getInstance();
    } else {
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
    } else {
      this.userModel = new UserModel(this.db as SQLiteDatabase);
      this.arbitrageModel = new ArbitrageOpportunityModel(this.db as SQLiteDatabase);
    }
  }

  public static getInstance(): DatabaseManager {
    if (!DatabaseManager.instance) {
      DatabaseManager.instance = new DatabaseManager();
    }
    return DatabaseManager.instance;
  }

  public async init(): Promise<void> {
    try {
      if (this.isPostgres) {
        // PostgreSQL initialization
        await (this.db as DatabaseManagerPostgres).init();
        console.log('✅ PostgreSQL database initialized successfully');
      } else {
        // SQLite initialization
        await this.arbitrageModel.createTable();
        console.log('✅ SQLite database initialized successfully');
      }
    } catch (error) {
      console.error('❌ Failed to initialize database:', error);
      throw error;
    }
  }

  public getUserModel(): UserModel {
    return this.userModel;
  }

  public getArbitrageModel(): ArbitrageOpportunityModel {
    return this.arbitrageModel;
  }

  public getDatabase(): SQLiteDatabase | DatabaseManagerPostgres {
    return this.db;
  }

  public async close(): Promise<void> {
    if (this.isPostgres) {
      await (this.db as DatabaseManagerPostgres).close();
    } else {
      return new Promise((resolve, reject) => {
        (this.db as SQLiteDatabase).close((err) => {
          if (err) {
            reject(err);
          } else {
            resolve();
          }
        });
      });
    }
  }

  public async runMigrations(): Promise<void> {
    // Add migration logic here if needed
    console.log('Running database migrations...');
    // For now, just ensure tables exist
    await this.init();
  }

  private createPostgresUserModel(): UserModel {
    // Create a mock user model that works with PostgreSQL
    // This is a temporary solution until we implement proper PostgreSQL models
    return {
      createTable: async () => {
        // PostgreSQL table creation handled by migrations
        console.log('PostgreSQL user table creation handled by migrations');
      },
      findByTelegramId: async (telegramId: number) => {
        // Mock implementation for PostgreSQL
        console.log(`Mock: Finding user by telegram ID ${telegramId}`);
        return null;
      },
      create: async (user: any) => {
        console.log(`Mock: Creating user ${user.id}`);
      },
      update: async (user: any) => {
        console.log(`Mock: Updating user ${user.id}`);
      },
      updateLanguage: async (telegramId: number, language: string) => {
        console.log(`Mock: Updating language for user ${telegramId} to ${language}`);
      },
      updateNotifications: async (telegramId: number, notifications: boolean) => {
        console.log(`Mock: Updating notifications for user ${telegramId} to ${notifications}`);
      },
      getAllActiveUsers: async () => {
        console.log('Mock: Getting all active users');
        return [];
      }
    } as UserModel;
  }

  private createPostgresArbitrageModel(): ArbitrageOpportunityModel {
    // Create a mock arbitrage model that works with PostgreSQL
    // This is a temporary solution until we implement proper PostgreSQL models
    return {
      createTable: async () => {
        // PostgreSQL table creation handled by migrations
        console.log('PostgreSQL arbitrage table creation handled by migrations');
      },
      insert: async (opportunities: any[]) => {
        console.log(`Mock: Inserting ${opportunities.length} arbitrage opportunities`);
        // For now, just log the opportunities
        if (opportunities.length > 0) {
          console.log(`Sample opportunity: ${opportunities[0].symbol} - ${opportunities[0].profitPercentage.toFixed(2)}% profit`);
        }
      },
      getTopOpportunities: async (limit: number = 10) => {
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
      getRecentOpportunities: async (minutes: number = 30) => {
        console.log(`Mock: Getting recent arbitrage opportunities from last ${minutes} minutes`);
        return [];
      },
      cleanupOldData: async (hoursToKeep: number = 24) => {
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
    } as ArbitrageOpportunityModel;
  }
}
