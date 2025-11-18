import { Pool } from 'pg';

export class DatabaseManagerPostgres {
  private static instance: DatabaseManagerPostgres;
  private pool: Pool;

  private constructor() {
    this.pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    });

    // Handle pool errors
    this.pool.on('error', (err) => {
      console.error('Unexpected error on idle client', err);
    });
  }

  public static getInstance(): DatabaseManagerPostgres {
    if (!DatabaseManagerPostgres.instance) {
      DatabaseManagerPostgres.instance = new DatabaseManagerPostgres();
    }
    return DatabaseManagerPostgres.instance;
  }

  public async init(): Promise<void> {
    try {
      // Test connection
      const client = await this.pool.connect();
      await client.query('SELECT 1');
      client.release();
      
      console.log('✅ PostgreSQL database connected successfully');
    } catch (error) {
      console.error('❌ Failed to connect to database:', error);
      throw error;
    }
  }

  public getPool(): Pool {
    return this.pool;
  }

  public async close(): Promise<void> {
    await this.pool.end();
  }

  public async query(text: string, params?: any[]): Promise<any> {
    const client = await this.pool.connect();
    try {
      const result = await client.query(text, params);
      return result;
    } finally {
      client.release();
    }
  }

  // Convenience methods for arbitrage opportunities
  public async insertOpportunities(opportunities: any[]): Promise<void> {
    if (opportunities.length === 0) return;

    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      const sql = `
        INSERT INTO arbitrage_opportunities
        (symbol, buy_exchange, sell_exchange, buy_price, sell_price, profit_percentage, profit_amount,
         volume, volume_24h, blockchain, chain_id, chain_name, contract_address, is_verified,
         decimals, contract_data_extracted, timestamp)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
        ON CONFLICT DO NOTHING
      `;

      for (const opp of opportunities) {
        console.log(`💾 [DATABASE] Inserting opportunity for ${opp.symbol} with enrichment data:`, {
          blockchain: opp.blockchain,
          chainId: opp.chainId,
          chainName: opp.chainName,
          contractAddress: opp.contractAddress,
          isVerified: opp.isContractVerified,
          decimals: opp.decimals,
          contractDataExtracted: opp.contractDataExtracted
        });

        await client.query(sql, [
          opp.symbol,
          opp.buyExchange,
          opp.sellExchange,
          opp.buyPrice,
          opp.sellPrice,
          opp.profitPercentage,
          opp.profitAmount,
          opp.volume || 0,
          opp.volume24h || null,
          opp.blockchain || null,
          opp.chainId || null,
          opp.chainName || null,
          opp.contractAddress || null,
          opp.isContractVerified || false,
          opp.decimals || null,
          opp.contractDataExtracted || false,
          new Date(opp.timestamp)
        ]);
      }

      await client.query('COMMIT');
      console.log(`✅ [DATABASE] Successfully inserted ${opportunities.length} opportunities with enrichment data`);
    } catch (error) {
      await client.query('ROLLBACK');
      console.error(`❌ [DATABASE] Failed to insert opportunities:`, error);
      throw error;
    } finally {
      client.release();
    }
  }

  public async getRecentOpportunities(minutes: number = 30): Promise<any[]> {
    const client = await this.pool.connect();
    try {
      const sql = `
        SELECT * FROM arbitrage_opportunities
        WHERE timestamp > NOW() - INTERVAL $1
        ORDER BY profit_percentage DESC
        LIMIT 100
      `;

      const result = await client.query(sql, [`${minutes} minutes`]);
      return result.rows.map(row => ({
        symbol: row.symbol,
        buyExchange: row.buy_exchange,
        sellExchange: row.sell_exchange,
        buyPrice: parseFloat(row.buy_price),
        sellPrice: parseFloat(row.sell_price),
        profitPercentage: parseFloat(row.profit_percentage),
        profitAmount: parseFloat(row.profit_amount),
        volume: row.volume_24h ? parseFloat(row.volume_24h) : 0,
        timestamp: new Date(row.timestamp).getTime()
      }));
    } finally {
      client.release();
    }
  }

  public async getStatistics(): Promise<{ total: number, avgProfit: number, maxProfit: number }> {
    const client = await this.pool.connect();
    try {
      const sql = `
        SELECT 
          COUNT(*) as total,
          AVG(profit_percentage) as avg_profit,
          MAX(profit_percentage) as max_profit
        FROM arbitrage_opportunities 
        WHERE timestamp > NOW() - INTERVAL '24 hours'
      `;
      
      const result = await client.query(sql);
      const row = result.rows[0];
      
      return {
        total: parseInt(row.total) || 0,
        avgProfit: parseFloat(row.avg_profit) || 0,
        maxProfit: parseFloat(row.max_profit) || 0
      };
    } finally {
      client.release();
    }
  }

  public async cleanupOldData(hoursToKeep: number = 24): Promise<void> {
    const client = await this.pool.connect();
    try {
      const sql = `
        DELETE FROM arbitrage_opportunities
        WHERE timestamp < NOW() - INTERVAL $1
      `;
      const result = await client.query(sql, [`${hoursToKeep} hours`]);
      console.log(`🧹 Cleaned up ${result.rowCount} old records`);
    } finally {
      client.release();
    }
  }
}

