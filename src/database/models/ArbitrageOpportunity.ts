import { Database } from 'sqlite3';
import { ArbitrageOpportunity } from '../../exchanges/types/index.js';
import { ContractDataRecord } from '../types.js';

export class ArbitrageOpportunityModel {
  private db: Database;

  constructor(db: Database) {
    this.db = db;
  }

  public async createTable(): Promise<void> {
    const sql = `
      CREATE TABLE IF NOT EXISTS arbitrage_opportunities (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        symbol TEXT NOT NULL,
        buy_exchange TEXT NOT NULL,
        sell_exchange TEXT NOT NULL,
        buy_price REAL NOT NULL,
        sell_price REAL NOT NULL,
        profit_percentage REAL NOT NULL,
        profit_amount REAL NOT NULL,
        volume REAL NOT NULL,
        volume_24h REAL,
        blockchain TEXT,
        chain_id TEXT,
        chain_name TEXT,
        contract_address TEXT,
        is_verified INTEGER DEFAULT 0,
        decimals INTEGER,
        contract_data_extracted INTEGER DEFAULT 0,
        logo_url TEXT,
        timestamp INTEGER NOT NULL,
        created_at INTEGER DEFAULT (strftime('%s', 'now'))
      )
    `;

    await this.runStatement(sql);
    await this.ensureExtendedColumns();
  }

  public async insert(opportunities: ArbitrageOpportunity[]): Promise<void> {
    if (opportunities.length === 0) return;

    return new Promise((resolve, reject) => {
      const sql = `
        INSERT INTO arbitrage_opportunities 
        (symbol, buy_exchange, sell_exchange, buy_price, sell_price, profit_percentage, profit_amount, volume, volume_24h, blockchain, chain_id, chain_name, contract_address, is_verified, decimals, contract_data_extracted, logo_url, timestamp)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;
      
      const stmt = this.db.prepare(sql);
      
      opportunities.forEach(opp => {
        stmt.run([
          opp.symbol,
          opp.buyExchange,
          opp.sellExchange,
          opp.buyPrice,
          opp.sellPrice,
          opp.profitPercentage,
          opp.profitAmount,
          opp.volume,
          opp.volume_24h ?? opp.volume,
          opp.blockchain || null,
          opp.chainId || null,
          opp.chainName || null,
          opp.contractAddress || null,
          opp.isContractVerified ? 1 : 0,
          opp.decimals ?? null,
          opp.contractDataExtracted ? 1 : 0,
          opp.logoUrl || null,
          opp.timestamp
        ]);
      });
      
      stmt.finalize((err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }

  public async getTopOpportunities(limit: number = 10): Promise<ArbitrageOpportunity[]> {
    return new Promise((resolve, reject) => {
      const sql = `
        SELECT * FROM arbitrage_opportunities 
        WHERE timestamp > ? 
        ORDER BY profit_percentage DESC 
        LIMIT ?
      `;
      
      const oneHourAgo = Date.now() - (60 * 60 * 1000);
      
      this.db.all(sql, [oneHourAgo, limit], (err, rows: any[]) => {
        if (err) {
          reject(err);
        } else {
          const opportunities = rows.map(row => this.mapRowToOpportunity(row));
          resolve(opportunities);
        }
      });
    });
  }

  public async getRecentOpportunities(minutes: number = 30): Promise<ArbitrageOpportunity[]> {
    return new Promise((resolve, reject) => {
      const sql = `
        SELECT * FROM arbitrage_opportunities 
        WHERE timestamp > ? 
        ORDER BY profit_percentage DESC
      `;
      
      const cutoffTime = Date.now() - (minutes * 60 * 1000);
      
      this.db.all(sql, [cutoffTime], (err, rows: any[]) => {
        if (err) {
          reject(err);
        } else {
          const opportunities = rows.map(row => this.mapRowToOpportunity(row));
          resolve(opportunities);
        }
      });
    });
  }

  public async cleanupOldData(hoursToKeep: number = 24): Promise<void> {
    return new Promise((resolve, reject) => {
      const sql = 'DELETE FROM arbitrage_opportunities WHERE timestamp < ?';
      const cutoffTime = Date.now() - (hoursToKeep * 60 * 60 * 1000);
      
      this.db.run(sql, [cutoffTime], (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }

  public async clearAllOpportunities(): Promise<void> {
    return new Promise((resolve, reject) => {
      const sql = 'DELETE FROM arbitrage_opportunities';
      
      this.db.run(sql, (err) => {
        if (err) {
          console.error('Error clearing all opportunities:', err);
          reject(err);
        } else {
          console.log('🗑️ Cleared all opportunities from SQLite');
          resolve();
        }
      });
    });
  }

  public async getStatistics(): Promise<{ total: number, avgProfit: number, maxProfit: number }> {
    return new Promise((resolve, reject) => {
      const sql = `
        SELECT 
          COUNT(*) as total,
          AVG(profit_percentage) as avg_profit,
          MAX(profit_percentage) as max_profit
        FROM arbitrage_opportunities 
        WHERE timestamp > ?
      `;
      
      const oneDayAgo = Date.now() - (24 * 60 * 60 * 1000);
      
      this.db.get(sql, [oneDayAgo], (err, row: any) => {
        if (err) {
          reject(err);
        } else {
          resolve({
            total: row.total || 0,
            avgProfit: row.avg_profit || 0,
            maxProfit: row.max_profit || 0
          });
        }
      });
    });
  }

  private runStatement(sql: string): Promise<void> {
    return new Promise((resolve, reject) => {
      this.db.run(sql, (err) => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });
  }

  private async ensureExtendedColumns(): Promise<void> {
    const statements = [
      "ALTER TABLE arbitrage_opportunities ADD COLUMN volume_24h REAL",
      "ALTER TABLE arbitrage_opportunities ADD COLUMN blockchain TEXT",
      "ALTER TABLE arbitrage_opportunities ADD COLUMN chain_id TEXT",
      "ALTER TABLE arbitrage_opportunities ADD COLUMN chain_name TEXT",
      "ALTER TABLE arbitrage_opportunities ADD COLUMN contract_address TEXT",
      "ALTER TABLE arbitrage_opportunities ADD COLUMN is_verified INTEGER DEFAULT 0",
      "ALTER TABLE arbitrage_opportunities ADD COLUMN decimals INTEGER",
      "ALTER TABLE arbitrage_opportunities ADD COLUMN contract_data_extracted INTEGER DEFAULT 0",
      "ALTER TABLE arbitrage_opportunities ADD COLUMN logo_url TEXT"
    ];

    for (const statement of statements) {
      await new Promise<void>((resolve) => {
        this.db.run(statement, (err) => {
          if (err && !/duplicate column name/i.test(err.message || '')) {
            console.warn(`⚠️ SQLite schema update warning: ${err.message}`);
          }
          resolve();
        });
      });
    }
  }
  private mapRowToOpportunity(row: any): ArbitrageOpportunity {
    return {
      symbol: row.symbol,
      buyExchange: row.buy_exchange,
      sellExchange: row.sell_exchange,
      buyPrice: row.buy_price,
      sellPrice: row.sell_price,
      profitPercentage: row.profit_percentage,
      profitAmount: row.profit_amount,
      volume: row.volume,
      volume_24h: row.volume_24h,
      blockchain: row.blockchain || undefined,
      chainId: row.chain_id || undefined,
      chainName: row.chain_name || undefined,
      contractAddress: row.contract_address || undefined,
      isContractVerified: row.is_verified === 1,
      decimals: row.decimals ?? undefined,
      contractDataExtracted: row.contract_data_extracted === 1,
      logoUrl: row.logo_url || undefined,
      timestamp: row.timestamp
    };
  }

  public async updateContractData(symbol: string, timestamp: number, data: ContractDataRecord): Promise<void> {
    return new Promise((resolve, reject) => {
      const sql = `
        UPDATE arbitrage_opportunities
        SET contract_address = ?, 
            chain_id = ?, 
            chain_name = ?, 
            is_verified = ?, 
            decimals = ?, 
            contract_data_extracted = 1
        WHERE symbol = ? AND timestamp = ?
      `;

      this.db.run(sql, [
        data.contractAddress,
        data.chainId,
        data.chainName,
        data.isVerified ? 1 : 0,
        data.decimals,
        symbol,
        timestamp
      ], (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }

  public async getLatestOpportunityBySymbol(symbol: string): Promise<ArbitrageOpportunity | null> {
    return new Promise((resolve, reject) => {
      const sql = `
        SELECT * FROM arbitrage_opportunities
        WHERE symbol = ?
        ORDER BY timestamp DESC
        LIMIT 1
      `;

      this.db.get(sql, [symbol], (err, row) => {
        if (err) {
          reject(err);
        } else if (!row) {
          resolve(null);
        } else {
          resolve(this.mapRowToOpportunity(row));
        }
      });
    });
  }
}
