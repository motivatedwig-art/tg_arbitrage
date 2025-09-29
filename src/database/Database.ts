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
    
    // For now, we'll use mock models for PostgreSQL
    // TODO: Create PostgreSQL-compatible models
    this.userModel = new UserModel(this.db as SQLiteDatabase);
    this.arbitrageModel = new ArbitrageOpportunityModel(this.db as SQLiteDatabase);
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
        await this.userModel.createTable();
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

  public getDatabase(): SQLiteDatabase {
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
}
