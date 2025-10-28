import { ExchangeAdapter, Ticker, OrderBook } from '../types/index.js';
export declare class OKXAdapter implements ExchangeAdapter {
    name: string;
    private connected;
    private exchange;
    constructor(apiKey?: string, apiSecret?: string, passphrase?: string);
    connect(): Promise<void>;
    getTickers(): Promise<Ticker[]>;
    getOrderBook(symbol: string): Promise<OrderBook>;
    disconnect(): void;
    isConnected(): boolean;
}
//# sourceMappingURL=OKXAdapter.d.ts.map