export interface ExchangeAdapter {
  name: string;
  connect(): Promise<void>;
  getTickers(): Promise<Ticker[]>;
  getOrderBook(symbol: string): Promise<OrderBook>;
  disconnect(): void;
  isConnected(): boolean;
}

export interface Ticker {
  symbol: string;
  bid: number;
  ask: number;
  timestamp: number;
  exchange: string;
  volume?: number;
  blockchain?: string; // e.g., 'ethereum', 'solana', 'bsc', 'polygon'
  contractAddress?: string; // Token contract address for verification
}

export interface OrderBook {
  symbol: string;
  bids: [number, number][]; // [price, amount]
  asks: [number, number][]; // [price, amount]
  timestamp: number;
  exchange: string;
}

export interface ArbitrageOpportunity {
  symbol: string;
  buyExchange: string;
  sellExchange: string;
  buyPrice: number;
  sellPrice: number;
  profitPercentage: number;
  profitAmount: number;
  volume: number;
  volume_24h?: number;
  timestamp: number;
  fees?: {
    buyFee: number;
    sellFee: number;
    transferCost?: number;
  };
}

export interface ExchangeConfig {
  name: string;
  apiKey?: string;
  apiSecret?: string;
  passphrase?: string;
  sandbox?: boolean;
  rateLimit?: number;
  enableRateLimit?: boolean;
}

export interface ExchangeStatus {
  name: string;
  isOnline: boolean;
  lastUpdate: number;
  errorCount: number;
  responseTime: number;
  lastError?: string;
}

export interface UserPreferences {
  language: 'en' | 'ru';
  notifications: boolean;
  minProfitThreshold: number;
  preferredExchanges: string[];
  alertThreshold: number;
}

export interface User {
  id: string;
  telegramId: number;
  username?: string;
  createdAt: number;
  preferences: UserPreferences;
  apiKeysEncrypted?: string;
  isActive: boolean;
}

export enum ExchangeName {
  BINANCE = 'binance',
  OKX = 'okx',
  BYBIT = 'bybit',
  BITGET = 'bitget',
  MEXC = 'mexc',
  BINGX = 'bingx',
  GATE_IO = 'gateio',
  KUCOIN = 'kucoin'
}

export interface WebSocketMessage {
  type: 'ticker' | 'orderbook' | 'arbitrage' | 'status';
  data: any;
  timestamp: number;
}

export interface TelegramUser {
  id: number;
  is_bot: boolean;
  first_name: string;
  last_name?: string;
  username?: string;
  language_code?: string;
}
