import { DatabaseManagerPostgres } from '../DatabasePostgres.js';
import { User } from '../../exchanges/types/index.js';

export class PostgresUserModel {
  private db: DatabaseManagerPostgres;

  constructor(db: DatabaseManagerPostgres) {
    this.db = db;
  }

  public async createTable(): Promise<void> {
    const sql = `
      CREATE TABLE IF NOT EXISTS users (
        id VARCHAR(50) PRIMARY KEY,
        telegram_id BIGINT UNIQUE NOT NULL,
        username VARCHAR(100),
        created_at BIGINT NOT NULL,
        preferences JSONB NOT NULL DEFAULT '{}',
        api_keys_encrypted TEXT,
        is_active BOOLEAN NOT NULL DEFAULT TRUE,
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `;
    
    await this.db.query(sql);
    console.log('PostgreSQL users table created/verified');
  }

  public async findByTelegramId(telegramId: number): Promise<User | null> {
    const sql = 'SELECT * FROM users WHERE telegram_id = $1';
    
    try {
      const result = await this.db.query(sql, [telegramId]);
      
      if (result.rows.length === 0) {
        return null;
      }
      
      const row = result.rows[0];
      return {
        id: row.id,
        telegramId: parseInt(row.telegram_id),
        username: row.username,
        createdAt: parseInt(row.created_at),
        preferences: row.preferences || {},
        apiKeysEncrypted: row.api_keys_encrypted,
        isActive: Boolean(row.is_active)
      };
    } catch (error) {
      console.error('Error finding user by telegram ID:', error);
      return null;
    }
  }

  public async create(user: User): Promise<void> {
    const sql = `
      INSERT INTO users (id, telegram_id, username, created_at, preferences, api_keys_encrypted, is_active)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      ON CONFLICT (telegram_id) DO UPDATE SET
        username = EXCLUDED.username,
        preferences = EXCLUDED.preferences,
        api_keys_encrypted = EXCLUDED.api_keys_encrypted,
        is_active = EXCLUDED.is_active,
        updated_at = NOW()
    `;
    
    await this.db.query(sql, [
      user.id,
      user.telegramId,
      user.username,
      user.createdAt,
      JSON.stringify(user.preferences),
      user.apiKeysEncrypted,
      user.isActive
    ]);
  }

  public async update(user: User): Promise<void> {
    const sql = `
      UPDATE users 
      SET username = $1, preferences = $2, api_keys_encrypted = $3, is_active = $4, updated_at = NOW()
      WHERE telegram_id = $5
    `;
    
    await this.db.query(sql, [
      user.username,
      JSON.stringify(user.preferences),
      user.apiKeysEncrypted,
      user.isActive,
      user.telegramId
    ]);
  }

  public async updateLanguage(telegramId: number, language: 'en' | 'ru'): Promise<void> {
    const sql = `
      UPDATE users 
      SET preferences = jsonb_set(preferences, '{language}', $1), updated_at = NOW()
      WHERE telegram_id = $2
    `;
    
    await this.db.query(sql, [JSON.stringify(language), telegramId]);
  }

  public async updateNotifications(telegramId: number, notifications: boolean): Promise<void> {
    const sql = `
      UPDATE users 
      SET preferences = jsonb_set(preferences, '{notifications}', $1), updated_at = NOW()
      WHERE telegram_id = $2
    `;
    
    await this.db.query(sql, [JSON.stringify(notifications), telegramId]);
  }

  public async getAllActiveUsers(): Promise<User[]> {
    const sql = 'SELECT * FROM users WHERE is_active = TRUE';
    
    try {
      const result = await this.db.query(sql);
      
      return result.rows.map(row => ({
        id: row.id,
        telegramId: parseInt(row.telegram_id),
        username: row.username,
        createdAt: parseInt(row.created_at),
        preferences: row.preferences || {},
        apiKeysEncrypted: row.api_keys_encrypted,
        isActive: Boolean(row.is_active)
      }));
    } catch (error) {
      console.error('Error getting all active users:', error);
      return [];
    }
  }
}
