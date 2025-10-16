import { ExchangeName } from './types/index.js';
import { BinanceAdapter } from './adapters/BinanceAdapter.js';
import { OKXAdapter } from './adapters/OKXAdapter.js';
import { BybitAdapter } from './adapters/BybitAdapter.js';
import { MexcAdapter } from './adapters/MexcAdapter.js';
import { GateioAdapter } from './adapters/GateioAdapter.js';
import { KucoinAdapter } from './adapters/KucoinAdapter.js';
export class ExchangeManager {
    constructor() {
        this.adapters = new Map();
        this.tickerCache = new Map();
        this.lastUpdate = 0;
    }
    static getInstance() {
        if (!ExchangeManager.instance) {
            ExchangeManager.instance = new ExchangeManager();
        }
        return ExchangeManager.instance;
    }
    async initializeExchanges() {
        const configs = this.getExchangeConfigs();
        for (const config of configs) {
            try {
                const adapter = this.createAdapter(config);
                this.adapters.set(config.name, adapter);
                // Try to connect (non-blocking)
                try {
                    await adapter.connect();
                }
                catch (error) {
                    console.warn(`Failed to connect to ${config.name}, will continue without it:`, error);
                }
            }
            catch (error) {
                console.error(`Failed to initialize ${config.name}:`, error);
            }
        }
        console.log(`Initialized ${this.adapters.size} exchanges`);
    }
    getExchangeConfigs() {
        return [
            {
                name: ExchangeName.BINANCE,
                apiKey: process.env.BINANCE_API_KEY || '',
                apiSecret: process.env.BINANCE_API_SECRET || '',
                enableRateLimit: true,
                rateLimit: 1200
            },
            {
                name: ExchangeName.OKX,
                apiKey: process.env.OKX_API_KEY || '',
                apiSecret: process.env.OKX_API_SECRET || '',
                passphrase: process.env.OKX_PASSPHRASE || '',
                enableRateLimit: true,
                rateLimit: 100
            },
            {
                name: ExchangeName.BYBIT,
                apiKey: process.env.BYBIT_API_KEY || '',
                apiSecret: process.env.BYBIT_API_SECRET || '',
                enableRateLimit: true,
                rateLimit: 120
            },
            {
                name: ExchangeName.MEXC,
                apiKey: process.env.MEXC_API_KEY || '',
                apiSecret: process.env.MEXC_API_SECRET || '',
                enableRateLimit: true,
                rateLimit: 50
            },
            {
                name: ExchangeName.GATE_IO,
                apiKey: process.env.GATE_IO_API_KEY || '',
                apiSecret: process.env.GATE_IO_API_SECRET || '',
                enableRateLimit: true,
                rateLimit: 200
            },
            {
                name: ExchangeName.KUCOIN,
                apiKey: process.env.KUCOIN_API_KEY || '',
                apiSecret: process.env.KUCOIN_API_SECRET || '',
                passphrase: process.env.KUCOIN_PASSPHRASE || '',
                enableRateLimit: true,
                rateLimit: 334
            }
        ];
    }
    createAdapter(config) {
        switch (config.name) {
            case ExchangeName.BINANCE:
                return new BinanceAdapter();
            case ExchangeName.OKX:
                return new OKXAdapter();
            case ExchangeName.BYBIT:
                return new BybitAdapter();
            case ExchangeName.MEXC:
                return new MexcAdapter();
            case ExchangeName.GATE_IO:
                return new GateioAdapter();
            case ExchangeName.KUCOIN:
                return new KucoinAdapter();
            default:
                throw new Error(`Unsupported exchange: ${config.name}`);
        }
    }
    async updateAllTickers() {
        // Check if we should use mock data
        if (process.env.USE_MOCK_DATA === 'true') {
            console.warn('Using mock data - USE_MOCK_DATA is true');
            this.generateMockTickers();
            this.lastUpdate = Date.now();
            return;
        }
        const promises = [];
        for (const [name, adapter] of this.adapters) {
            if (adapter.isConnected()) {
                promises.push(this.updateExchangeTickers(name, adapter));
            }
        }
        await Promise.allSettled(promises);
        this.lastUpdate = Date.now();
    }
    async updateExchangeTickers(name, adapter) {
        try {
            const tickers = await adapter.getTickers();
            this.tickerCache.set(name, tickers);
            console.log(`Updated ${tickers.length} tickers for ${name}`);
        }
        catch (error) {
            console.error(`Failed to update tickers for ${name}:`, error);
            // In production, throw the error instead of silently failing
            if (process.env.NODE_ENV === 'production') {
                throw new Error(`Failed to fetch real data from ${name}: ${error instanceof Error ? error.message : 'Unknown error'}`);
            }
        }
    }
    generateMockTickers() {
        const mockSymbols = ['BTC/USDT', 'ETH/USDT', 'BNB/USDT', 'ADA/USDT', 'SOL/USDT'];
        const exchanges = ['binance', 'okx', 'bybit', 'mexc', 'gateio', 'kucoin'];
        exchanges.forEach(exchange => {
            const mockTickers = mockSymbols.map(symbol => ({
                symbol,
                bid: 100 + Math.random() * 10,
                ask: 100 + Math.random() * 10,
                timestamp: Date.now(),
                exchange,
                volume: Math.random() * 1000000,
                blockchain: undefined,
                contractAddress: undefined
            }));
            this.tickerCache.set(exchange, mockTickers);
        });
        console.log('Generated mock tickers for all exchanges');
    }
    getAllTickers() {
        return new Map(this.tickerCache);
    }
    getExchangeStatus() {
        const statuses = [];
        for (const [name, adapter] of this.adapters) {
            statuses.push({
                name: name,
                isOnline: adapter.isConnected(),
                lastUpdate: this.lastUpdate,
                errorCount: 0,
                responseTime: 0
            });
        }
        return statuses;
    }
    getConnectedExchanges() {
        return Array.from(this.adapters.entries())
            .filter(([_, adapter]) => adapter.isConnected())
            .map(([name, _]) => name);
    }
    async disconnect() {
        for (const [name, adapter] of this.adapters) {
            try {
                adapter.disconnect();
            }
            catch (error) {
                console.error(`Error disconnecting from ${name}:`, error);
            }
        }
        this.adapters.clear();
        this.tickerCache.clear();
    }
    getTickersForSymbol(symbol) {
        const result = [];
        for (const tickers of this.tickerCache.values()) {
            const ticker = tickers.find(t => t.symbol === symbol);
            if (ticker) {
                result.push(ticker);
            }
        }
        return result;
    }
    getLastUpdateTime() {
        return this.lastUpdate;
    }
}
//# sourceMappingURL=ExchangeManager.js.map