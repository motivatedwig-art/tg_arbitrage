import { Pool } from 'pg';
export class DatabaseManagerPostgres {
    constructor() {
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
    static getInstance() {
        if (!DatabaseManagerPostgres.instance) {
            DatabaseManagerPostgres.instance = new DatabaseManagerPostgres();
        }
        return DatabaseManagerPostgres.instance;
    }
    async init() {
        try {
            // Test connection
            const client = await this.pool.connect();
            await client.query('SELECT 1');
            client.release();
            console.log('✅ PostgreSQL database connected successfully');
        }
        catch (error) {
            console.error('❌ Failed to connect to database:', error);
            throw error;
        }
    }
    getPool() {
        return this.pool;
    }
    async close() {
        await this.pool.end();
    }
    async query(text, params) {
        const client = await this.pool.connect();
        try {
            const result = await client.query(text, params);
            return result;
        }
        finally {
            client.release();
        }
    }
    // Convenience methods for arbitrage opportunities
    async insertOpportunities(opportunities) {
        if (opportunities.length === 0)
            return;
        const client = await this.pool.connect();
        try {
            await client.query('BEGIN');
            const sql = `
        INSERT INTO arbitrage_opportunities 
        (symbol, buy_exchange, sell_exchange, buy_price, sell_price, profit_percentage, profit_amount, timestamp)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
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
                    new Date(opp.timestamp)
                ]);
            }
            await client.query('COMMIT');
        }
        catch (error) {
            await client.query('ROLLBACK');
            throw error;
        }
        finally {
            client.release();
        }
    }
    async getRecentOpportunities(minutes = 30) {
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
        }
        finally {
            client.release();
        }
    }
    async getStatistics() {
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
        }
        finally {
            client.release();
        }
    }
    async cleanupOldData(hoursToKeep = 24) {
        const client = await this.pool.connect();
        try {
            const sql = `
        DELETE FROM arbitrage_opportunities
        WHERE timestamp < NOW() - INTERVAL $1
      `;
            const result = await client.query(sql, [`${hoursToKeep} hours`]);
            console.log(`🧹 Cleaned up ${result.rowCount} old records`);
        }
        finally {
            client.release();
        }
    }
}
//# sourceMappingURL=DatabasePostgres.js.map