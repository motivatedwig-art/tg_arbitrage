import { ExchangeAdapter, Ticker, OrderBook } from '../types/index.js';
export declare class OKXAdapter implements ExchangeAdapter {
    name: string;
    private connected;
    constructor();
    connect(): Promise<void>;
    getTickers(): Promise<Ticker[]>;
    getOrderBook(symbol: string): Promise<OrderBook>;
    disconnect(): void;
    isConnected(): boolean;
    private generateMockTickers;
}
//# sourceMappingURL=OKXAdapter.d.ts.map