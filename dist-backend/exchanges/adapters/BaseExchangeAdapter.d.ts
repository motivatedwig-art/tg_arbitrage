import { ExchangeAdapter, Ticker, OrderBook, ExchangeConfig, ExchangeStatus } from '../types/index.js';
import { TokenMetadataService } from '../../services/TokenMetadataService.js';
export declare abstract class BaseExchangeAdapter implements ExchangeAdapter {
    name: string;
    protected exchange: any;
    protected config: ExchangeConfig;
    protected connected: boolean;
    protected lastError?: string;
    protected errorCount: number;
    protected tokenMetadataService: TokenMetadataService;
    constructor(config: ExchangeConfig);
    protected abstract createExchange(): any;
    connect(): Promise<void>;
    getTickers(): Promise<Ticker[]>;
    private generateMockTickers;
    getOrderBook(symbol: string): Promise<OrderBook>;
    disconnect(): void;
    isConnected(): boolean;
    getStatus(): ExchangeStatus;
    protected sleep(ms: number): Promise<void>;
    testConnection(): Promise<boolean>;
}
//# sourceMappingURL=BaseExchangeAdapter.d.ts.map