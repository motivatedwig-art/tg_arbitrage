export interface Exchange {
  id: string;
  name: string;
  displayName: string;
  logo: string;
  isSelected: boolean;
  baseUrl: string;
  pairUrlPattern: string; // e.g., "https://binance.com/en/trade/{symbol}"
}

export interface CryptoPair {
  symbol: string;
  baseAsset: string;
  quoteAsset: string;
  displaySymbol: string;
}

export interface ExchangePrice {
  exchangeId: string;
  exchangeName: string;
  price: number;
  volume: number;
  url: string;
  lastUpdated: string;
}

export interface ArbitrageOpportunity {
  pair: CryptoPair;
  prices: ExchangePrice[];
  bestBuy: ExchangePrice;
  bestSell: ExchangePrice;
  spreadPercentage: number;
  spreadAmount: number;
  profitability: 'high' | 'medium' | 'low';
  blockchain?: string;
  logoUrl?: string;
}
 