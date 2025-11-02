import { DatabaseManagerPostgres } from '../DatabasePostgres.js';
import { ArbitrageOpportunity } from '../../exchanges/types/index.js';

export class PostgresArbitrageOpportunityModel {
  private db: DatabaseManagerPostgres;

  constructor(db: DatabaseManagerPostgres) {
    this.db = db;
  }

  public async createTable(): Promise<void> {
    const sql = `
      CREATE TABLE IF NOT EXISTS arbitrage_opportunities (
        id SERIAL PRIMARY KEY,
        symbol VARCHAR(20) NOT NULL,
        buy_exchange VARCHAR(50) NOT NULL,
        sell_exchange VARCHAR(50) NOT NULL,
        buy_price NUMERIC(38,18) NOT NULL,
        sell_price NUMERIC(38,18) NOT NULL,
        profit_percentage NUMERIC(18,8) NOT NULL,
        profit_amount NUMERIC(38,18) NOT NULL,
        volume NUMERIC(38,18) NOT NULL DEFAULT 0,
        volume_24h NUMERIC(38,18),
        blockchain VARCHAR(50),
        chain_id VARCHAR(50),
        token_address VARCHAR(120),
        logo_url TEXT,
        timestamp BIGINT NOT NULL,
        created_at TIMESTAMP DEFAULT NOW()
      );
      
      CREATE INDEX IF NOT EXISTS idx_arbitrage_symbol ON arbitrage_opportunities(symbol);
      CREATE INDEX IF NOT EXISTS idx_arbitrage_profit ON arbitrage_opportunities(profit_percentage DESC);
      CREATE INDEX IF NOT EXISTS idx_arbitrage_timestamp ON arbitrage_opportunities(timestamp);
    `;
    
    await this.db.query(sql);
    
    // Attempt to migrate existing columns to wider precision and add new columns if missing
    try {
      await this.db.query(`
        DO $$ BEGIN
          -- Widen numeric precisions if columns exist with narrower types
          BEGIN ALTER TABLE arbitrage_opportunities ALTER COLUMN buy_price TYPE NUMERIC(38,18) USING buy_price::NUMERIC; EXCEPTION WHEN others THEN END;
          BEGIN ALTER TABLE arbitrage_opportunities ALTER COLUMN sell_price TYPE NUMERIC(38,18) USING sell_price::NUMERIC; EXCEPTION WHEN others THEN END;
          BEGIN ALTER TABLE arbitrage_opportunities ALTER COLUMN profit_amount TYPE NUMERIC(38,18) USING profit_amount::NUMERIC; EXCEPTION WHEN others THEN END;
          BEGIN ALTER TABLE arbitrage_opportunities ALTER COLUMN volume TYPE NUMERIC(38,18) USING volume::NUMERIC; EXCEPTION WHEN others THEN END;
          BEGIN ALTER TABLE arbitrage_opportunities ALTER COLUMN volume_24h TYPE NUMERIC(38,18) USING volume_24h::NUMERIC; EXCEPTION WHEN others THEN END;
          BEGIN ALTER TABLE arbitrage_opportunities ALTER COLUMN profit_percentage TYPE NUMERIC(18,8) USING profit_percentage::NUMERIC; EXCEPTION WHEN others THEN END;
          -- Add new metadata columns if they don't exist
          BEGIN ALTER TABLE arbitrage_opportunities ADD COLUMN IF NOT EXISTS chain_id VARCHAR(50); EXCEPTION WHEN others THEN END;
          BEGIN ALTER TABLE arbitrage_opportunities ADD COLUMN IF NOT EXISTS token_address VARCHAR(120); EXCEPTION WHEN others THEN END;
          BEGIN ALTER TABLE arbitrage_opportunities ADD COLUMN IF NOT EXISTS logo_url TEXT; EXCEPTION WHEN others THEN END;
        END $$;
      `);
      console.log('🔧 PostgreSQL arbitrage_opportunities schema migrated (numeric widths + metadata cols)');
    } catch (e) {
      console.warn('⚠️ Schema migration step skipped/failed:', e);
    }
    console.log('PostgreSQL arbitrage_opportunities table created/verified');
  }

  public async insert(opportunities: ArbitrageOpportunity[]): Promise<void> {
    if (opportunities.length === 0) return;

    const client = await this.db.getPool().connect();
    try {
      await client.query('BEGIN');
      
      const sql = `
        INSERT INTO arbitrage_opportunities 
        (symbol, buy_exchange, sell_exchange, buy_price, sell_price, profit_percentage, profit_amount, volume, volume_24h, blockchain, chain_id, token_address, logo_url, timestamp)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      `;
      
      let insertedCount = 0;
      let skippedCount = 0;
      
      for (const opp of opportunities) {
        try {
          // Validate and sanitize data before inserting
          const sanitizedOpportunity = this.sanitizeOpportunity(opp);
          
          // Skip invalid opportunities
          if (!this.isValidOpportunity(sanitizedOpportunity)) {
            console.warn(`⚠️ [INSERT] Skipping invalid opportunity: ${opp.symbol}`);
            skippedCount++;
            continue;
          }
          
          await client.query(sql, [
            sanitizedOpportunity.symbol,
            sanitizedOpportunity.buyExchange,
            sanitizedOpportunity.sellExchange,
            sanitizedOpportunity.buyPrice,
            sanitizedOpportunity.sellPrice,
            sanitizedOpportunity.profitPercentage,
            sanitizedOpportunity.profitAmount,
            sanitizedOpportunity.volume,
            sanitizedOpportunity.volume_24h || sanitizedOpportunity.volume,
            sanitizedOpportunity.blockchain || 'ethereum',
            (sanitizedOpportunity as any).chainId || null,
            (sanitizedOpportunity as any).tokenAddress || null,
            sanitizedOpportunity.logoUrl || null,
            sanitizedOpportunity.timestamp
          ]);
          
          insertedCount++;
        } catch (error: any) {
          // Log the specific opportunity that failed
          console.error(`❌ [INSERT] Failed to insert opportunity ${opp.symbol}:`, {
            symbol: opp.symbol,
            buyPrice: opp.buyPrice,
            sellPrice: opp.sellPrice,
            profitPercentage: opp.profitPercentage,
            profitAmount: opp.profitAmount,
            volume: opp.volume,
            volume_24h: opp.volume_24h,
            error: error.message,
            detail: error.detail
          });
          skippedCount++;
          // Continue with next opportunity instead of failing the whole batch
        }
      }
      
      if (skippedCount > 0) {
        console.warn(`⚠️ [INSERT] Skipped ${skippedCount} invalid/failed opportunities`);
      }
      
      await client.query('COMMIT');
      console.log(`💾 Stored ${insertedCount}/${opportunities.length} opportunities in PostgreSQL`);
      
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('❌ Failed to store opportunities in PostgreSQL:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  public async getTopOpportunities(limit: number = 10): Promise<ArbitrageOpportunity[]> {
    const sql = `
      SELECT * FROM arbitrage_opportunities 
      WHERE timestamp > $1 
      ORDER BY profit_percentage DESC 
      LIMIT $2
    `;
    
    const oneHourAgo = Date.now() - (60 * 60 * 1000);
    
    try {
      const result = await this.db.query(sql, [oneHourAgo, limit]);
      
      return result.rows.map(row => ({
        symbol: row.symbol,
        buyExchange: row.buy_exchange,
        sellExchange: row.sell_exchange,
        buyPrice: parseFloat(row.buy_price),
        sellPrice: parseFloat(row.sell_price),
        profitPercentage: parseFloat(row.profit_percentage),
        profitAmount: parseFloat(row.profit_amount),
        volume: parseFloat(row.volume),
        volume_24h: row.volume_24h ? parseFloat(row.volume_24h) : undefined,
        blockchain: 'ethereum', // Temporary fallback until database column is added
        timestamp: parseInt(row.timestamp)
      }));
    } catch (error) {
      console.error('Error getting top opportunities:', error);
      return [];
    }
  }

  public async getRecentOpportunities(minutes: number = 30): Promise<ArbitrageOpportunity[]> {
    const sql = `
      SELECT * FROM arbitrage_opportunities 
      WHERE timestamp > $1 
      ORDER BY profit_percentage DESC
      LIMIT 200
    `;
    
    const cutoffTime = Date.now() - (minutes * 60 * 1000);
    
    try {
      const result = await this.db.query(sql, [cutoffTime]);
      
      return result.rows.map(row => ({
        symbol: row.symbol,
        buyExchange: row.buy_exchange,
        sellExchange: row.sell_exchange,
        buyPrice: parseFloat(row.buy_price),
        sellPrice: parseFloat(row.sell_price),
        profitPercentage: parseFloat(row.profit_percentage),
        profitAmount: parseFloat(row.profit_amount),
        volume: parseFloat(row.volume),
        volume_24h: row.volume_24h ? parseFloat(row.volume_24h) : undefined,
        blockchain: row.blockchain || 'ethereum', // Use actual blockchain from database
        timestamp: parseInt(row.timestamp)
      }));
    } catch (error) {
      console.error('Error getting recent opportunities:', error);
      return [];
    }
  }

  public async cleanupOldData(hoursToKeep: number = 24): Promise<void> {
    const sql = `
      DELETE FROM arbitrage_opportunities 
      WHERE timestamp < $1
    `;
    
    const cutoffTime = Date.now() - (hoursToKeep * 60 * 60 * 1000);
    
    try {
      const result = await this.db.query(sql, [cutoffTime]);
      console.log(`🧹 Cleaned up ${result.rowCount || 0} old records from PostgreSQL`);
    } catch (error) {
      console.error('Error cleaning up old data:', error);
    }
  }

  public async clearAllOpportunities(): Promise<void> {
    const sql = `DELETE FROM arbitrage_opportunities`;
    
    try {
      const result = await this.db.query(sql);
      console.log(`🗑️ Cleared all ${result.rowCount || 0} opportunities from PostgreSQL`);
    } catch (error) {
      console.error('Error clearing all opportunities:', error);
      throw error;
    }
  }

  public async getStatistics(): Promise<{ total: number, avgProfit: number, maxProfit: number }> {
    const sql = `
      SELECT 
        COUNT(*) as total,
        AVG(profit_percentage) as avg_profit,
        MAX(profit_percentage) as max_profit
      FROM arbitrage_opportunities 
      WHERE timestamp > $1
    `;
    
    const oneDayAgo = Date.now() - (24 * 60 * 60 * 1000);
    
    try {
      const result = await this.db.query(sql, [oneDayAgo]);
      const row = result.rows[0];
      
      return {
        total: parseInt(row.total) || 0,
        avgProfit: parseFloat(row.avg_profit) || 0,
        maxProfit: parseFloat(row.max_profit) || 0
      };
    } catch (error) {
      console.error('Error getting statistics:', error);
      return {
        total: 0,
        avgProfit: 0,
        maxProfit: 0
      };
    }
  }

  public async getVolumeBasedOpportunities(
    minVolume: number = 10000,
    limit: number = 20
  ): Promise<ArbitrageOpportunity[]> {
    const sql = `
      SELECT * FROM arbitrage_opportunities 
      WHERE volume_24h >= $1 AND timestamp > $2
      ORDER BY profit_percentage DESC 
      LIMIT $3
    `;
    
    const oneHourAgo = Date.now() - (60 * 60 * 1000);
    
    try {
      const result = await this.db.query(sql, [minVolume, oneHourAgo, limit]);
      
      return result.rows.map(row => ({
        symbol: row.symbol,
        buyExchange: row.buy_exchange,
        sellExchange: row.sell_exchange,
        buyPrice: parseFloat(row.buy_price),
        sellPrice: parseFloat(row.sell_price),
        profitPercentage: parseFloat(row.profit_percentage),
        profitAmount: parseFloat(row.profit_amount),
        volume: parseFloat(row.volume),
        volume_24h: row.volume_24h ? parseFloat(row.volume_24h) : undefined,
        blockchain: 'ethereum', // Temporary fallback until database column is added
        timestamp: parseInt(row.timestamp)
      }));
    } catch (error) {
      console.error('Error getting volume-based opportunities:', error);
      return [];
    }
  }

  public async getUserFilteredOpportunities(
    userId: string,
    exchanges?: string[],
    minProfit?: number,
    maxVolume?: number
  ): Promise<ArbitrageOpportunity[]> {
    // Get user preferences first
    const userSql = 'SELECT preferences FROM users WHERE id = $1';
    const userResult = await this.db.query(userSql, [userId]);
    
    if (userResult.rows.length === 0) {
      return [];
    }
    
    const preferences = userResult.rows[0].preferences;
    const userExchanges = exchanges || preferences?.preferredExchanges || [];
    const userMinProfit = minProfit || preferences?.minProfitThreshold || 0.5;
    const userMaxVolume = maxVolume || preferences?.maxVolume || undefined;
    
    let sql = `
      SELECT * FROM arbitrage_opportunities 
      WHERE timestamp > $1 AND profit_percentage >= $2
    `;
    const params = [Date.now() - (60 * 60 * 1000), userMinProfit];
    
    if (userExchanges.length > 0) {
      sql += ` AND (buy_exchange = ANY($${params.length + 1}) OR sell_exchange = ANY($${params.length + 1}))`;
      params.push(userExchanges);
    }
    
    if (userMaxVolume) {
      sql += ` AND volume_24h <= $${params.length + 1}`;
      params.push(userMaxVolume);
    }
    
    sql += ` ORDER BY profit_percentage DESC LIMIT 50`;
    
    try {
      const result = await this.db.query(sql, params);
      
      return result.rows.map(row => ({
        symbol: row.symbol,
        buyExchange: row.buy_exchange,
        sellExchange: row.sell_exchange,
        buyPrice: parseFloat(row.buy_price),
        sellPrice: parseFloat(row.sell_price),
        profitPercentage: parseFloat(row.profit_percentage),
        profitAmount: parseFloat(row.profit_amount),
        volume: parseFloat(row.volume),
        volume_24h: row.volume_24h ? parseFloat(row.volume_24h) : undefined,
        blockchain: 'ethereum', // Temporary fallback until database column is added
        timestamp: parseInt(row.timestamp)
      }));
    } catch (error) {
      console.error('Error getting user-filtered opportunities:', error);
      return [];
    }
  }

  private sanitizeOpportunity(opp: ArbitrageOpportunity): ArbitrageOpportunity {
    // NUMERIC(20,8) max absolute value: must round to absolute value < 10^12
    // Using 999,999,999,999 (well below 10^12) to be safe with rounding
    const MAX_DECIMAL_20_8 = 999999999999; // Max for NUMERIC(20,8) - buy_price, sell_price, profit_amount, volume
    
    // NUMERIC(18,8) max absolute value: must round to absolute value < 10^10
    // Using 9,999,999,999 (well below 10^10) to be safe with rounding
    const MAX_DECIMAL_18_8 = 9999999999; // Max for NUMERIC(18,8) - profit_percentage
    
    const MIN_DECIMAL_20_8 = -999999999999;
    const MIN_DECIMAL_18_8 = -9999999999;
    
    // Helper function to clamp decimal values with detailed logging
    const clampDecimal = (value: any, maxValue: number, minValue: number, fieldName: string): number => {
      // Handle null/undefined
      if (value === null || value === undefined) {
        console.warn(`⚠️ [SANITIZE] ${fieldName} is null/undefined for ${opp.symbol}, defaulting to 0`);
        return 0;
      }
      
      // Convert to number (handle string inputs)
      let numValue = typeof value === 'string' ? parseFloat(value) : Number(value);
      
      // Handle NaN or Infinity
      if (isNaN(numValue) || !isFinite(numValue)) {
        console.warn(`⚠️ [SANITIZE] ${fieldName} is NaN/Infinity (${value}) for ${opp.symbol}, defaulting to 0`);
        return 0;
      }
      
      // Clamp to acceptable range
      if (numValue > maxValue) {
        console.warn(`⚠️ [SANITIZE] Clamping ${fieldName} from ${numValue} to ${maxValue} for ${opp.symbol}`);
        return maxValue;
      }
      if (numValue < minValue) {
        console.warn(`⚠️ [SANITIZE] Clamping ${fieldName} from ${numValue} to ${minValue} for ${opp.symbol}`);
        return minValue;
      }
      
      return numValue;
    };
    
    // Log extreme values before sanitization
    const needsWarning = 
      Math.abs(opp.profitPercentage || 0) > 100 ||
      Math.abs(opp.volume || 0) > 1000000000000 ||
      Math.abs(opp.profitAmount || 0) > 1000000000000;
    
    if (needsWarning) {
      console.warn(`⚠️ [SANITIZE] Extreme values detected for ${opp.symbol}:`, {
        profit: opp.profitPercentage,
        volume: opp.volume,
        profitAmount: opp.profitAmount,
        buyPrice: opp.buyPrice,
        sellPrice: opp.sellPrice
      });
    }
    
    // Sanitize all numeric fields
    const sanitized = {
      ...opp,
      buyPrice: Math.max(clampDecimal(opp.buyPrice, MAX_DECIMAL_20_8, MIN_DECIMAL_20_8, 'buyPrice'), 0.00000001),
      sellPrice: Math.max(clampDecimal(opp.sellPrice, MAX_DECIMAL_20_8, MIN_DECIMAL_20_8, 'sellPrice'), 0.00000001),
      profitPercentage: this.sanitizePercentage(opp.profitPercentage),
      profitAmount: Math.max(clampDecimal(opp.profitAmount, MAX_DECIMAL_20_8, MIN_DECIMAL_20_8, 'profitAmount'), 0),
      volume: clampDecimal(opp.volume || 0, MAX_DECIMAL_20_8, 0, 'volume'),
      volume_24h: opp.volume_24h ? clampDecimal(opp.volume_24h, MAX_DECIMAL_20_8, 0, 'volume_24h') : undefined,
      blockchain: opp.blockchain,
      timestamp: opp.timestamp || Date.now()
    };
    
    return sanitized;
  }

  private sanitizePercentage(percentage: number): number {
    // Handle null/undefined
    if (percentage === null || percentage === undefined) {
      console.warn(`⚠️ [SANITIZE] profitPercentage is null/undefined, setting to 0`);
      return 0;
    }
    
    // Convert to number (handle string inputs)
    let numValue = typeof percentage === 'string' ? parseFloat(percentage) : Number(percentage);
    
    // Handle infinity, NaN, and extreme values
    if (isNaN(numValue) || !isFinite(numValue)) {
      console.warn(`⚠️ [SANITIZE] Invalid profit percentage: ${percentage}, setting to 0`);
      return 0;
    }
    
    // NUMERIC(18,8) max absolute value: must round to absolute value < 10^10
    // Using 9,999,999,999 to be safe with rounding
    const MAX_PERCENTAGE = 9999999999; // Max safe value - well below 10^10
    const MIN_PERCENTAGE = -9999999999;
    
    // Cap extreme percentages to prevent database overflow
    if (numValue >= MAX_PERCENTAGE) {
      console.warn(`⚠️ [SANITIZE] Profit percentage too high: ${numValue}%, capping to ${MAX_PERCENTAGE}`);
      return MAX_PERCENTAGE;
    }
    
    if (numValue <= MIN_PERCENTAGE) {
      console.warn(`⚠️ [SANITIZE] Profit percentage too low: ${numValue}%, capping to ${MIN_PERCENTAGE}`);
      return MIN_PERCENTAGE;
    }
    
    // Round to 8 decimal places to match NUMERIC(18,8)
    const rounded = Math.round(numValue * 100000000) / 100000000;
    return rounded;
  }

  private isValidOpportunity(opp: ArbitrageOpportunity): boolean {
    const MAX_PERCENTAGE = 9999999999.99999999; // NUMERIC(18,8) safe limit
    const MAX_NUMERIC = 999999999999.99999999; // NUMERIC(20,8) safe limit
    
    return (
      opp.symbol && 
      opp.buyExchange && 
      opp.sellExchange &&
      opp.buyPrice > 0 && 
      opp.buyPrice < MAX_NUMERIC &&
      opp.sellPrice > 0 &&
      opp.sellPrice < MAX_NUMERIC &&
      isFinite(opp.profitPercentage) &&
      !isNaN(opp.profitPercentage) &&
      opp.profitPercentage >= -MAX_PERCENTAGE &&
      opp.profitPercentage <= MAX_PERCENTAGE &&
      isFinite(opp.profitAmount) &&
      opp.profitAmount >= 0 &&
      opp.profitAmount < MAX_NUMERIC &&
      (!opp.volume || (opp.volume >= 0 && opp.volume < MAX_NUMERIC)) &&
      (!opp.volume_24h || (opp.volume_24h >= 0 && opp.volume_24h < MAX_NUMERIC)) &&
      opp.timestamp > 0
    );
  }
}
