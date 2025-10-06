export class ArbitrageOpportunityModel {
    constructor(db) {
        this.db = db;
    }
    async createTable() {
        return new Promise((resolve, reject) => {
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
          timestamp INTEGER NOT NULL,
          created_at INTEGER DEFAULT (strftime('%s', 'now'))
        )
      `;
            this.db.run(sql, (err) => {
                if (err)
                    reject(err);
                else
                    resolve();
            });
        });
    }
    async insert(opportunities) {
        if (opportunities.length === 0)
            return;
        return new Promise((resolve, reject) => {
            const sql = `
        INSERT INTO arbitrage_opportunities 
        (symbol, buy_exchange, sell_exchange, buy_price, sell_price, profit_percentage, profit_amount, volume, timestamp)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
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
                    opp.timestamp
                ]);
            });
            stmt.finalize((err) => {
                if (err)
                    reject(err);
                else
                    resolve();
            });
        });
    }
    async getTopOpportunities(limit = 10) {
        return new Promise((resolve, reject) => {
            const sql = `
        SELECT * FROM arbitrage_opportunities 
        WHERE timestamp > ? 
        ORDER BY profit_percentage DESC 
        LIMIT ?
      `;
            const oneHourAgo = Date.now() - (60 * 60 * 1000);
            this.db.all(sql, [oneHourAgo, limit], (err, rows) => {
                if (err) {
                    reject(err);
                }
                else {
                    const opportunities = rows.map(row => ({
                        symbol: row.symbol,
                        buyExchange: row.buy_exchange,
                        sellExchange: row.sell_exchange,
                        buyPrice: row.buy_price,
                        sellPrice: row.sell_price,
                        profitPercentage: row.profit_percentage,
                        profitAmount: row.profit_amount,
                        volume: row.volume,
                        timestamp: row.timestamp
                    }));
                    resolve(opportunities);
                }
            });
        });
    }
    async getRecentOpportunities(minutes = 30) {
        return new Promise((resolve, reject) => {
            const sql = `
        SELECT * FROM arbitrage_opportunities 
        WHERE timestamp > ? 
        ORDER BY profit_percentage DESC
      `;
            const cutoffTime = Date.now() - (minutes * 60 * 1000);
            this.db.all(sql, [cutoffTime], (err, rows) => {
                if (err) {
                    reject(err);
                }
                else {
                    const opportunities = rows.map(row => ({
                        symbol: row.symbol,
                        buyExchange: row.buy_exchange,
                        sellExchange: row.sell_exchange,
                        buyPrice: row.buy_price,
                        sellPrice: row.sell_price,
                        profitPercentage: row.profit_percentage,
                        profitAmount: row.profit_amount,
                        volume: row.volume,
                        timestamp: row.timestamp
                    }));
                    resolve(opportunities);
                }
            });
        });
    }
    async cleanupOldData(hoursToKeep = 24) {
        return new Promise((resolve, reject) => {
            const sql = 'DELETE FROM arbitrage_opportunities WHERE timestamp < ?';
            const cutoffTime = Date.now() - (hoursToKeep * 60 * 60 * 1000);
            this.db.run(sql, [cutoffTime], (err) => {
                if (err)
                    reject(err);
                else
                    resolve();
            });
        });
    }
    async clearAllOpportunities() {
        return new Promise((resolve, reject) => {
            const sql = 'DELETE FROM arbitrage_opportunities';
            this.db.run(sql, (err) => {
                if (err) {
                    console.error('Error clearing all opportunities:', err);
                    reject(err);
                }
                else {
                    console.log('🗑️ Cleared all opportunities from SQLite');
                    resolve();
                }
            });
        });
    }
    async getStatistics() {
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
            this.db.get(sql, [oneDayAgo], (err, row) => {
                if (err) {
                    reject(err);
                }
                else {
                    resolve({
                        total: row.total || 0,
                        avgProfit: row.avg_profit || 0,
                        maxProfit: row.max_profit || 0
                    });
                }
            });
        });
    }
}
//# sourceMappingURL=ArbitrageOpportunity.js.map