import { DatabaseManagerPostgres } from '../DatabasePostgres.js';
import { DexScreenerTokenInfo } from '../../services/DexScreenerService.js';

export interface DexScreenerCacheEntry {
  symbol: string;
  chainId: string;
  tokenAddress: string;
  imageUrl?: string;
  lastUpdated: number;
}

export class PostgresDexScreenerCacheModel {
  private db: DatabaseManagerPostgres;
  private readonly CACHE_TTL_DAYS = 7; // Cache expires after 7 days

  constructor(db: DatabaseManagerPostgres) {
    this.db = db;
  }

  public async createTable(): Promise<void> {
    const sql = `
      CREATE TABLE IF NOT EXISTS dexscreener_cache (
        id SERIAL PRIMARY KEY,
        symbol VARCHAR(50) NOT NULL,
        chain_id VARCHAR(50) NOT NULL,
        token_address VARCHAR(120) NOT NULL,
        image_url TEXT,
        last_updated BIGINT NOT NULL,
        created_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(symbol, chain_id, token_address)
      );
      
      CREATE INDEX IF NOT EXISTS idx_dexscreener_symbol ON dexscreener_cache(symbol);
      CREATE INDEX IF NOT EXISTS idx_dexscreener_last_updated ON dexscreener_cache(last_updated);
      CREATE INDEX IF NOT EXISTS idx_dexscreener_symbol_chain ON dexscreener_cache(symbol, chain_id);
    `;
    
    await this.db.query(sql);
    console.log('✅ PostgreSQL dexscreener_cache table created/verified');
  }

  /**
   * Get all cached entries for a symbol (can have multiple chains)
   */
  public async getBySymbol(symbol: string): Promise<DexScreenerTokenInfo[]> {
    const key = (symbol || '').toUpperCase();
    if (!key) return [];

    const sql = `
      SELECT chain_id, token_address, image_url, last_updated
      FROM dexscreener_cache
      WHERE symbol = $1
        AND last_updated > $2
      ORDER BY last_updated DESC
    `;

    const expiryTime = Date.now() - (this.CACHE_TTL_DAYS * 24 * 60 * 60 * 1000);

    try {
      const result = await this.db.query(sql, [key, expiryTime]);
      
      return result.rows.map(row => ({
        chainId: row.chain_id,
        tokenAddress: row.token_address,
        imageUrl: row.image_url || undefined,
      }));
    } catch (error) {
      console.error('Error fetching DexScreener cache:', error);
      return [];
    }
  }

  /**
   * Store DexScreener token info in cache
   */
  public async store(entries: DexScreenerTokenInfo[], symbol: string): Promise<void> {
    if (entries.length === 0) return;

    const key = (symbol || '').toUpperCase();
    if (!key) return;

    const client = await this.db.getPool().connect();
    try {
      await client.query('BEGIN');

      const sql = `
        INSERT INTO dexscreener_cache (symbol, chain_id, token_address, image_url, last_updated)
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (symbol, chain_id, token_address) 
        DO UPDATE SET 
          image_url = EXCLUDED.image_url,
          last_updated = EXCLUDED.last_updated
      `;

      const now = Date.now();

      for (const entry of entries) {
        if (!entry.chainId || !entry.tokenAddress) continue;

        await client.query(sql, [
          key,
          entry.chainId.toLowerCase(),
          entry.tokenAddress,
          entry.imageUrl || null,
          now
        ]);
      }

      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error storing DexScreener cache:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Check if we have fresh cache for a symbol
   */
  public async hasFreshCache(symbol: string): Promise<boolean> {
    const key = (symbol || '').toUpperCase();
    if (!key) return false;

    const sql = `
      SELECT COUNT(*) as count
      FROM dexscreener_cache
      WHERE symbol = $1
        AND last_updated > $2
    `;

    const expiryTime = Date.now() - (this.CACHE_TTL_DAYS * 24 * 60 * 60 * 1000);

    try {
      const result = await this.db.query(sql, [key, expiryTime]);
      return parseInt(result.rows[0]?.count || '0') > 0;
    } catch (error) {
      console.error('Error checking DexScreener cache:', error);
      return false;
    }
  }

  /**
   * Clean up expired cache entries (older than TTL)
   */
  public async cleanupExpired(): Promise<number> {
    const expiryTime = Date.now() - (this.CACHE_TTL_DAYS * 24 * 60 * 60 * 1000);

    const sql = `
      DELETE FROM dexscreener_cache
      WHERE last_updated < $1
    `;

    try {
      const result = await this.db.query(sql, [expiryTime]);
      const deleted = result.rowCount || 0;
      if (deleted > 0) {
        console.log(`🧹 Cleaned up ${deleted} expired DexScreener cache entries`);
      }
      return deleted;
    } catch (error) {
      console.error('Error cleaning up DexScreener cache:', error);
      return 0;
    }
  }

  /**
   * Get cache statistics
   */
  public async getStats(): Promise<{ total: number; uniqueSymbols: number; oldestEntry: number }> {
    const sql = `
      SELECT 
        COUNT(*) as total,
        COUNT(DISTINCT symbol) as unique_symbols,
        MIN(last_updated) as oldest_entry
      FROM dexscreener_cache
    `;

    try {
      const result = await this.db.query(sql);
      const row = result.rows[0];

      return {
        total: parseInt(row.total) || 0,
        uniqueSymbols: parseInt(row.unique_symbols) || 0,
        oldestEntry: parseInt(row.oldest_entry) || 0,
      };
    } catch (error) {
      console.error('Error getting DexScreener cache stats:', error);
      return { total: 0, uniqueSymbols: 0, oldestEntry: 0 };
    }
  }
}





