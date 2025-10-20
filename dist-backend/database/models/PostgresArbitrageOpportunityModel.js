export class PostgresArbitrageOpportunityModel {
    constructor(db) {
        this.db = db;
    }
    async createTable() {
        const sql = `
      CREATE TABLE IF NOT EXISTS arbitrage_opportunities (
        id SERIAL PRIMARY KEY,
        symbol VARCHAR(20) NOT NULL,
        buy_exchange VARCHAR(50) NOT NULL,
        sell_exchange VARCHAR(50) NOT NULL,
        buy_price DECIMAL(20,8) NOT NULL,
        sell_price DECIMAL(20,8) NOT NULL,
        profit_percentage DECIMAL(15,4) NOT NULL,
        profit_amount DECIMAL(20,8) NOT NULL,
        volume DECIMAL(20,8) NOT NULL DEFAULT 0,
        volume_24h DECIMAL(20,8),
        blockchain VARCHAR(50),
        timestamp BIGINT NOT NULL,
        created_at TIMESTAMP DEFAULT NOW()
      );
      
      CREATE INDEX IF NOT EXISTS idx_arbitrage_symbol ON arbitrage_opportunities(symbol);
      CREATE INDEX IF NOT EXISTS idx_arbitrage_profit ON arbitrage_opportunities(profit_percentage DESC);
      CREATE INDEX IF NOT EXISTS idx_arbitrage_timestamp ON arbitrage_opportunities(timestamp);
    `;
        await this.db.query(sql);
        console.log('PostgreSQL arbitrage_opportunities table created/verified');
    }
    async insert(opportunities) {
        if (opportunities.length === 0)
            return;
        const client = await this.db.getPool().connect();
        try {
            await client.query('BEGIN');
            const sql = `
        INSERT INTO arbitrage_opportunities 
        (symbol, buy_exchange, sell_exchange, buy_price, sell_price, profit_percentage, profit_amount, volume, volume_24h, blockchain, timestamp)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      `;
            for (const opp of opportunities) {
                // Validate and sanitize data before inserting
                const sanitizedOpportunity = this.sanitizeOpportunity(opp);
                // Skip invalid opportunities
                if (!this.isValidOpportunity(sanitizedOpportunity)) {
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
                    sanitizedOpportunity.timestamp
                ]);
            }
            await client.query('COMMIT');
            console.log(`💾 Stored ${opportunities.length} opportunities in PostgreSQL`);
        }
        catch (error) {
            await client.query('ROLLBACK');
            console.error('❌ Failed to store opportunities in PostgreSQL:', error);
            throw error;
        }
        finally {
            client.release();
        }
    }
    async getTopOpportunities(limit = 10) {
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
        }
        catch (error) {
            console.error('Error getting top opportunities:', error);
            return [];
        }
    }
    async getRecentOpportunities(minutes = 30) {
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
                blockchain: 'ethereum', // Temporary fallback until database column is added
                timestamp: parseInt(row.timestamp)
            }));
        }
        catch (error) {
            console.error('Error getting recent opportunities:', error);
            return [];
        }
    }
    async cleanupOldData(hoursToKeep = 24) {
        const sql = `
      DELETE FROM arbitrage_opportunities 
      WHERE timestamp < $1
    `;
        const cutoffTime = Date.now() - (hoursToKeep * 60 * 60 * 1000);
        try {
            const result = await this.db.query(sql, [cutoffTime]);
            console.log(`🧹 Cleaned up ${result.rowCount || 0} old records from PostgreSQL`);
        }
        catch (error) {
            console.error('Error cleaning up old data:', error);
        }
    }
    async clearAllOpportunities() {
        const sql = `DELETE FROM arbitrage_opportunities`;
        try {
            const result = await this.db.query(sql);
            console.log(`🗑️ Cleared all ${result.rowCount || 0} opportunities from PostgreSQL`);
        }
        catch (error) {
            console.error('Error clearing all opportunities:', error);
            throw error;
        }
    }
    async getStatistics() {
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
        }
        catch (error) {
            console.error('Error getting statistics:', error);
            return {
                total: 0,
                avgProfit: 0,
                maxProfit: 0
            };
        }
    }
    async getVolumeBasedOpportunities(minVolume = 10000, limit = 20) {
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
        }
        catch (error) {
            console.error('Error getting volume-based opportunities:', error);
            return [];
        }
    }
    async getUserFilteredOpportunities(userId, exchanges, minProfit, maxVolume) {
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
        }
        catch (error) {
            console.error('Error getting user-filtered opportunities:', error);
            return [];
        }
    }
    sanitizeOpportunity(opp) {
        return {
            ...opp,
            buyPrice: Math.max(opp.buyPrice, 0.00000001), // Prevent zero prices
            sellPrice: Math.max(opp.sellPrice, 0.00000001), // Prevent zero prices
            profitPercentage: this.sanitizePercentage(opp.profitPercentage),
            profitAmount: Math.max(opp.profitAmount, 0),
            volume: Math.max(opp.volume, 0),
            volume_24h: opp.volume_24h ? Math.max(opp.volume_24h, 0) : undefined,
            blockchain: opp.blockchain, // Preserve blockchain field
            timestamp: Date.now()
        };
    }
    sanitizePercentage(percentage) {
        // Handle infinity, NaN, and extreme values
        if (!isFinite(percentage) || isNaN(percentage)) {
            console.warn(`⚠️ Invalid profit percentage detected: ${percentage}, setting to 0`);
            return 0;
        }
        // Cap extreme percentages to prevent database overflow
        // DECIMAL(15,4) can hold up to 999,999,999,999.9999
        if (percentage > 999999999999) { // Max safe value for DECIMAL(15,4)
            console.warn(`⚠️ Profit percentage too high: ${percentage}%, capping to 999999999999%`);
            return 999999999999;
        }
        if (percentage < -999999999999) { // Min safe value for DECIMAL(15,4)
            console.warn(`⚠️ Profit percentage too low: ${percentage}%, capping to -999999999999%`);
            return -999999999999;
        }
        return Math.round(percentage * 10000) / 10000; // Round to 4 decimal places
    }
    isValidOpportunity(opp) {
        return (opp.symbol &&
            opp.buyExchange &&
            opp.sellExchange &&
            opp.buyPrice > 0 &&
            opp.sellPrice > 0 &&
            isFinite(opp.profitPercentage) &&
            !isNaN(opp.profitPercentage) &&
            opp.profitPercentage >= -999999999999 && // Reasonable lower bound
            opp.profitPercentage <= 999999999999 && // Cap at safe DECIMAL(15,4) limit
            opp.timestamp > 0);
    }
}
//# sourceMappingURL=PostgresArbitrageOpportunityModel.js.map