import { Database } from 'sqlite3';
import { User } from '../../exchanges/types';

export class UserModel {
  private db: Database;

  constructor(db: Database) {
    this.db = db;
  }

  public async createTable(): Promise<void> {
    return new Promise((resolve, reject) => {
      const sql = `
        CREATE TABLE IF NOT EXISTS users (
          id TEXT PRIMARY KEY,
          telegram_id INTEGER UNIQUE NOT NULL,
          username TEXT,
          created_at INTEGER NOT NULL,
          preferences TEXT NOT NULL,
          api_keys_encrypted TEXT,
          is_active BOOLEAN NOT NULL DEFAULT 1
        )
      `;
      
      this.db.run(sql, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }

  public async findByTelegramId(telegramId: number): Promise<User | null> {
    return new Promise((resolve, reject) => {
      const sql = 'SELECT * FROM users WHERE telegram_id = ?';
      
      this.db.get(sql, [telegramId], (err, row: any) => {
        if (err) {
          reject(err);
        } else if (!row) {
          resolve(null);
        } else {
          resolve({
            id: row.id,
            telegramId: row.telegram_id,
            username: row.username,
            createdAt: row.created_at,
            preferences: JSON.parse(row.preferences),
            apiKeysEncrypted: row.api_keys_encrypted,
            isActive: Boolean(row.is_active)
          });
        }
      });
    });
  }

  public async create(user: User): Promise<void> {
    return new Promise((resolve, reject) => {
      const sql = `
        INSERT INTO users (id, telegram_id, username, created_at, preferences, api_keys_encrypted, is_active)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `;
      
      this.db.run(sql, [
        user.id,
        user.telegramId,
        user.username,
        user.createdAt,
        JSON.stringify(user.preferences),
        user.apiKeysEncrypted,
        user.isActive ? 1 : 0
      ], (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }

  public async update(user: User): Promise<void> {
    return new Promise((resolve, reject) => {
      const sql = `
        UPDATE users 
        SET username = ?, preferences = ?, api_keys_encrypted = ?, is_active = ?
        WHERE telegram_id = ?
      `;
      
      this.db.run(sql, [
        user.username,
        JSON.stringify(user.preferences),
        user.apiKeysEncrypted,
        user.isActive ? 1 : 0,
        user.telegramId
      ], (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }

  public async updateLanguage(telegramId: number, language: 'en' | 'ru'): Promise<void> {
    const user = await this.findByTelegramId(telegramId);
    if (user) {
      user.preferences.language = language;
      await this.update(user);
    }
  }

  public async updateNotifications(telegramId: number, notifications: boolean): Promise<void> {
    const user = await this.findByTelegramId(telegramId);
    if (user) {
      user.preferences.notifications = notifications;
      await this.update(user);
    }
  }

  public async getAllActiveUsers(): Promise<User[]> {
    return new Promise((resolve, reject) => {
      const sql = 'SELECT * FROM users WHERE is_active = 1';
      
      this.db.all(sql, [], (err, rows: any[]) => {
        if (err) {
          reject(err);
        } else {
          const users = rows.map(row => ({
            id: row.id,
            telegramId: row.telegram_id,
            username: row.username,
            createdAt: row.created_at,
            preferences: JSON.parse(row.preferences),
            apiKeysEncrypted: row.api_keys_encrypted,
            isActive: Boolean(row.is_active)
          }));
          resolve(users);
        }
      });
    });
  }
}
