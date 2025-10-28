import { ExchangeAdapter, Ticker, OrderBook } from '../types/index.js';
export declare class BybitAdapter implements ExchangeAdapter {
    name: string;
    private connected;
    private exchange;
    constructor(apiKey?: string, apiSecret?: string);
    connect(): Promise<void>;
    getTickers(): Promise<Ticker[]>;
    getOrderBook(symbol: string): Promise<OrderBook>;
    disconnect(): void;
    isConnected(): boolean;
}
//# sourceMappingURL=BybitAdapter.d.ts.map