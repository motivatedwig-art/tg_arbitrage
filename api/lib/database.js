const { Pool } = require('pg');

class DatabaseManager {
  constructor() {
    this.pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
      max: 5,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    });
  }

  async query(text, params) {
    const client = await this.pool.connect();
    try {
      const result = await client.query(text, params);
      return result;
    } finally {
      client.release();
    }
  }

  // Insert arbitrage opportunities
  async insertOpportunities(opportunities) {
    if (opportunities.length === 0) return;

    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      
      const sql = `
        INSERT INTO arbitrage_opportunities 
        (symbol, buy_exchange, sell_exchange, buy_price, sell_price, profit_percentage, profit_amount, blockchain, timestamp)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        ON CONFLICT DO NOTHING
      `;
      
      for (const opp of opportunities) {
        await client.query(sql, [
          opp.symbol,
          opp.buyExchange,
          opp.sellExchange,
          opp.buyPrice,
          opp.sellPrice,
          opp.profitPercentage,
          opp.profitAmount,
          opp.blockchain || null,
          new Date(opp.timestamp)
        ]);
      }
      
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  // Get recent opportunities
  async getRecentOpportunities(minutes = 30) {
    const sql = `
      SELECT * FROM arbitrage_opportunities 
      WHERE timestamp > NOW() - INTERVAL '${minutes} minutes'
      ORDER BY profit_percentage DESC
      LIMIT 100
    `;
    
    const result = await this.query(sql);
    return result.rows.map(row => ({
      symbol: row.symbol,
      buyExchange: row.buy_exchange,
      sellExchange: row.sell_exchange,
      buyPrice: parseFloat(row.buy_price),
      sellPrice: parseFloat(row.sell_price),
      profitPercentage: parseFloat(row.profit_percentage),
      profitAmount: parseFloat(row.profit_amount),
      volume: row.volume_24h ? parseFloat(row.volume_24h) : 0,
      blockchain: row.blockchain,
      timestamp: new Date(row.timestamp).getTime()
    }));
  }

  // Get statistics
  async getStatistics() {
    const sql = `
      SELECT 
        COUNT(*) as total,
        AVG(profit_percentage) as avg_profit,
        MAX(profit_percentage) as max_profit
      FROM arbitrage_opportunities 
      WHERE timestamp > NOW() - INTERVAL '24 hours'
    `;
    
    const result = await this.query(sql);
    const row = result.rows[0];
    
    return {
      total: parseInt(row.total) || 0,
      avgProfit: parseFloat(row.avg_profit) || 0,
      maxProfit: parseFloat(row.max_profit) || 0
    };
  }

  async close() {
    await this.pool.end();
  };
}

let db;
const getDatabase = () => {
  if (!db) {
    db = new DatabaseManager();
  }
  return db;
};

module.exports = { getDatabase };
