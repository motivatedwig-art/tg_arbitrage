import sqlite3 from 'sqlite3';
const { Database: SQLiteDB } = sqlite3;
type SQLiteDatabase = sqlite3.Database;
import path from 'path';
import { UserModel } from './models/User.js';
import { ArbitrageOpportunityModel } from './models/ArbitrageOpportunity.js';

export class DatabaseManager {
  private static instance: DatabaseManager;
  private db: SQLiteDatabase;
  private userModel: UserModel;
  private arbitrageModel: ArbitrageOpportunityModel;

  private constructor() {
    const dbPath = process.env.DATABASE_URL || './database.sqlite';
    this.db = new SQLiteDB(dbPath);
    this.userModel = new UserModel(this.db);
    this.arbitrageModel = new ArbitrageOpportunityModel(this.db);
  }

  public static getInstance(): DatabaseManager {
    if (!DatabaseManager.instance) {
      DatabaseManager.instance = new DatabaseManager();
    }
    return DatabaseManager.instance;
  }

  public async init(): Promise<void> {
    try {
      await this.userModel.createTable();
      await this.arbitrageModel.createTable();
      console.log('Database initialized successfully');
    } catch (error) {
      console.error('Failed to initialize database:', error);
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
    return new Promise((resolve, reject) => {
      this.db.close((err) => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });
  }

  public async runMigrations(): Promise<void> {
    // Add migration logic here if needed
    console.log('Running database migrations...');
    // For now, just ensure tables exist
    await this.init();
  }
}
