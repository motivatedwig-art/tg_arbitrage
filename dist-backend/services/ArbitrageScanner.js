import axios from "axios";
import { DatabaseManager } from '../database/Database.js';
/* ---------------- Helpers ---------------- */
const normalizeSymbol = (s) => s.replace(/[-_]/g, "").toUpperCase();
function safeNum(v) {
    const n = Number(v);
    return isNaN(n) ? 0 : n;
}
/* ---------------- Binance ---------------- */
class BinanceAdapter {
    constructor() {
        this.name = "BINANCE";
    }
    async fetchAllTickers() {
        const res = await axios.get("https://api.binance.com/api/v3/ticker/bookTicker");
        return res.data.map((t) => ({
            exchange: this.name,
            symbol: normalizeSymbol(t.symbol),
            bid: safeNum(t.bidPrice),
            ask: safeNum(t.askPrice),
        }));
    }
}
/* ---------------- OKX ---------------- */
class OkxAdapter {
    constructor() {
        this.name = "OKX";
    }
    async fetchAllTickers() {
        const res = await axios.get("https://www.okx.com/api/v5/market/tickers?instType=SPOT");
        return res.data.data.map((t) => ({
            exchange: this.name,
            symbol: normalizeSymbol(t.instId), // e.g. BTC-USDT
            bid: safeNum(t.bidPx),
            ask: safeNum(t.askPx),
        }));
    }
}
/* ---------------- Bybit ---------------- */
class BybitAdapter {
    constructor() {
        this.name = "BYBIT";
    }
    async fetchAllTickers() {
        const res = await axios.get("https://api.bybit.com/v5/market/tickers?category=spot");
        return res.data.result.list.map((t) => ({
            exchange: this.name,
            symbol: normalizeSymbol(t.symbol),
            bid: safeNum(t.bid1Price),
            ask: safeNum(t.ask1Price),
        }));
    }
}
/* ---------------- MEXC ---------------- */
class MexcAdapter {
    constructor() {
        this.name = "MEXC";
    }
    async fetchAllTickers() {
        // Using ticker/24hr for bid/ask since ticker/price has only last price
        const res = await axios.get("https://api.mexc.com/api/v3/ticker/bookTicker");
        return res.data.map((t) => ({
            exchange: this.name,
            symbol: normalizeSymbol(t.symbol),
            bid: safeNum(t.bidPrice),
            ask: safeNum(t.askPrice),
        }));
    }
}
/* ---------------- Gate.io ---------------- */
class GateioAdapter {
    constructor() {
        this.name = "GATEIO";
    }
    async fetchAllTickers() {
        const res = await axios.get("https://api.gateio.ws/api/v4/spot/tickers");
        return res.data.map((t) => ({
            exchange: this.name,
            symbol: normalizeSymbol(t.currency_pair),
            bid: safeNum(t.highest_bid),
            ask: safeNum(t.lowest_ask),
        }));
    }
}
/* ---------------- KuCoin ---------------- */
class KucoinAdapter {
    constructor() {
        this.name = "KUCOIN";
    }
    async fetchAllTickers() {
        const res = await axios.get("https://api.kucoin.com/api/v1/market/allTickers");
        return res.data.data.ticker.map((t) => ({
            exchange: this.name,
            symbol: normalizeSymbol(t.symbol), // e.g. BTC-USDT
            bid: safeNum(t.buy),
            ask: safeNum(t.sell),
        }));
    }
}
/* ---------------- Arbitrage Scanner Service ---------------- */
export class ArbitrageScanner {
    constructor() {
        this.isRunning = false;
        this.scanInterval = null;
        this.db = DatabaseManager.getInstance();
        this.feeRate = Number(process.env.FEE_RATE ?? 0.001);
        this.profitThreshold = Number(process.env.PROFIT_THRESHOLD ?? 0.002);
        this.adapters = [
            new BinanceAdapter(),
            new OkxAdapter(),
            new BybitAdapter(),
            new MexcAdapter(),
            new GateioAdapter(),
            new KucoinAdapter(),
        ];
    }
    async start() {
        if (this.isRunning) {
            console.log('Arbitrage scanner is already running');
            return;
        }
        console.log('🚀 Starting arbitrage scanner...');
        this.isRunning = true;
        // Initial scan
        await this.scanForOpportunities();
        // Set up interval scanning
        const scanIntervalMs = Number(process.env.SCAN_INTERVAL_MS ?? 15000);
        this.scanInterval = setInterval(async () => {
            await this.scanForOpportunities();
        }, scanIntervalMs);
        console.log(`✅ Arbitrage scanner started with ${scanIntervalMs}ms interval`);
    }
    stop() {
        if (!this.isRunning) {
            return;
        }
        console.log('🛑 Stopping arbitrage scanner...');
        this.isRunning = false;
        if (this.scanInterval) {
            clearInterval(this.scanInterval);
            this.scanInterval = null;
        }
        console.log('✅ Arbitrage scanner stopped');
    }
    isActive() {
        return this.isRunning;
    }
    async scanForOpportunities() {
        try {
            const opportunities = await this.findArbitrage();
            if (opportunities.length === 0) {
                console.log(new Date().toISOString(), "No arbitrage opportunities found");
                return;
            }
            // Store opportunities in database
            await this.storeOpportunities(opportunities);
            // Log top opportunities
            console.log(`🔍 Found ${opportunities.length} arbitrage opportunities`);
            for (const opp of opportunities.slice(0, 5)) {
                console.log(`[${opp.symbol}] Buy on ${opp.buyExchange} @ ${opp.buyPrice}, Sell on ${opp.sellExchange} @ ${opp.sellPrice} | Net ${(opp.netPercent * 100).toFixed(3)}%`);
            }
        }
        catch (error) {
            console.error("❌ Arbitrage scan error:", error.message);
        }
    }
    async findArbitrage() {
        const all = (await Promise.all(this.adapters.map(a => a.fetchAllTickers()))).flat();
        // Group tickers by symbol
        const bySymbol = new Map();
        all.forEach(t => {
            if (!bySymbol.has(t.symbol))
                bySymbol.set(t.symbol, []);
            bySymbol.get(t.symbol).push(t);
        });
        const opps = [];
        const timestamp = Date.now();
        for (const [symbol, list] of bySymbol.entries()) {
            if (list.length < 2)
                continue;
            for (const buy of list) {
                for (const sell of list) {
                    if (buy.exchange === sell.exchange)
                        continue;
                    const netSpread = sell.bid - buy.ask - (buy.ask * this.feeRate + sell.bid * this.feeRate);
                    const netPercent = netSpread / buy.ask;
                    if (netPercent >= this.profitThreshold) {
                        const profitAmount = netSpread; // Simplified calculation
                        const volume = 1000; // Default volume for now
                        opps.push({
                            symbol,
                            buyExchange: buy.exchange,
                            sellExchange: sell.exchange,
                            buyPrice: buy.ask,
                            sellPrice: sell.bid,
                            netPercent,
                            profitAmount,
                            volume,
                            timestamp
                        });
                    }
                }
            }
        }
        return opps.sort((a, b) => b.netPercent - a.netPercent);
    }
    async storeOpportunities(opportunities) {
        try {
            const arbitrageModel = this.db.getArbitrageModel();
            // Transform opportunities to match database schema
            const dbOpportunities = opportunities.map(opp => ({
                symbol: opp.symbol,
                buyExchange: opp.buyExchange,
                sellExchange: opp.sellExchange,
                buyPrice: opp.buyPrice,
                sellPrice: opp.sellPrice,
                profitPercentage: opp.netPercent * 100, // Convert to percentage
                profitAmount: opp.profitAmount,
                volume: opp.volume,
                timestamp: opp.timestamp
            }));
            await arbitrageModel.insert(dbOpportunities);
            console.log(`💾 Stored ${opportunities.length} opportunities in database`);
        }
        catch (error) {
            console.error('❌ Failed to store opportunities:', error);
        }
    }
    // Method to get recent opportunities (for API endpoints)
    async getRecentOpportunities(minutes = 30) {
        try {
            const arbitrageModel = this.db.getArbitrageModel();
            const recent = await arbitrageModel.getRecentOpportunities(minutes);
            return recent.map(opp => ({
                symbol: opp.symbol,
                buyExchange: opp.buyExchange,
                sellExchange: opp.sellExchange,
                buyPrice: opp.buyPrice,
                sellPrice: opp.sellPrice,
                netPercent: opp.profitPercentage / 100, // Convert back from percentage
                profitAmount: opp.profitAmount,
                volume: opp.volume,
                timestamp: opp.timestamp
            }));
        }
        catch (error) {
            console.error('❌ Failed to get recent opportunities:', error);
            return [];
        }
    }
}
//# sourceMappingURL=ArbitrageScanner.js.map