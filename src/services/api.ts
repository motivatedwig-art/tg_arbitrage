import axios from 'axios';
import { ApiResponse, Exchange, ArbitrageOpportunity } from '../types';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://tg-arbitrage.vercel.app/api';

// Create axios instance with default config
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const apiService = {
  async getArbitrageData(_selectedExchanges: string[]): Promise<ApiResponse> {
    try {
      const response = await api.get('/opportunities');
      
      // Transform the backend data to match our frontend types
      const opportunities: ArbitrageOpportunity[] = response.data.data?.map((opp: any) => ({
        pair: {
          symbol: opp.symbol,
          baseAsset: opp.symbol.split('/')[0] || opp.symbol.split('USDT')[0],
          quoteAsset: opp.symbol.split('/')[1] || 'USDT',
          displaySymbol: opp.symbol
        },
        prices: [
          {
            exchangeId: opp.buyExchange.toLowerCase(),
            exchangeName: opp.buyExchange,
            price: opp.buyPrice,
            volume: opp.volume || 0,
            url: `https://${opp.buyExchange.toLowerCase()}.com`,
            lastUpdated: new Date(opp.timestamp).toISOString()
          },
          {
            exchangeId: opp.sellExchange.toLowerCase(),
            exchangeName: opp.sellExchange,
            price: opp.sellPrice,
            volume: opp.volume || 0,
            url: `https://${opp.sellExchange.toLowerCase()}.com`,
            lastUpdated: new Date(opp.timestamp).toISOString()
          }
        ],
        bestBuy: {
          exchangeId: opp.buyExchange.toLowerCase(),
          exchangeName: opp.buyExchange,
          price: opp.buyPrice,
          volume: opp.volume || 0,
          url: `https://${opp.buyExchange.toLowerCase()}.com`,
          lastUpdated: new Date(opp.timestamp).toISOString()
        },
        bestSell: {
          exchangeId: opp.sellExchange.toLowerCase(),
          exchangeName: opp.sellExchange,
          price: opp.sellPrice,
          volume: opp.volume || 0,
          url: `https://${opp.sellExchange.toLowerCase()}.com`,
          lastUpdated: new Date(opp.timestamp).toISOString()
        },
        spreadPercentage: opp.profitPercentage,
        spreadAmount: opp.profitAmount,
        profitability: opp.profitPercentage >= 2 ? 'high' : opp.profitPercentage >= 1 ? 'medium' : 'low'
      })) || [];

      return {
        opportunities,
        lastUpdate: new Date().toISOString(),
        nextUpdate: new Date(Date.now() + 30000).toISOString() // 30 seconds from now
      };
    } catch (error) {
      console.error('API Error:', error);
      throw new Error('Failed to fetch arbitrage data');
    }
  },

  async getAvailableExchanges(): Promise<Exchange[]> {
    try {
      const response = await api.get('/status');
      
      // Transform backend exchange data
      const exchanges = [
        { id: 'binance', name: 'binance', displayName: 'Binance', logo: '🟡', baseUrl: 'https://binance.com' },
        { id: 'okx', name: 'okx', displayName: 'OKX', logo: '⚫', baseUrl: 'https://okx.com' },
        { id: 'bybit', name: 'bybit', displayName: 'Bybit', logo: '🟠', baseUrl: 'https://bybit.com' },
        { id: 'bitget', name: 'bitget', displayName: 'Bitget', logo: '🔵', baseUrl: 'https://bitget.com' },
        { id: 'mexc', name: 'mexc', displayName: 'MEXC', logo: '🟢', baseUrl: 'https://mexc.com' },
        { id: 'bingx', name: 'bingx', displayName: 'BingX', logo: '🔴', baseUrl: 'https://bingx.com' },
        { id: 'gateio', name: 'gateio', displayName: 'Gate.io', logo: '🟣', baseUrl: 'https://gate.io' },
        { id: 'kucoin', name: 'kucoin', displayName: 'KuCoin', logo: '🟦', baseUrl: 'https://kucoin.com' }
      ];

      // Mark exchanges as selected by default and add status from backend
      // const statusData = response.data?.data;
      return exchanges.map(exchange => ({
        ...exchange,
        isSelected: true, // Default all selected
        pairUrlPattern: `${exchange.baseUrl}/trade/{symbol}`
      }));
    } catch (error) {
      console.error('Failed to fetch exchanges:', error);
      // Return default exchanges if API fails
      return [
        { id: 'binance', name: 'binance', displayName: 'Binance', logo: '🟡', isSelected: true, baseUrl: 'https://binance.com', pairUrlPattern: 'https://binance.com/trade/{symbol}' },
        { id: 'okx', name: 'okx', displayName: 'OKX', logo: '⚫', isSelected: true, baseUrl: 'https://okx.com', pairUrlPattern: 'https://okx.com/trade/{symbol}' },
        { id: 'bybit', name: 'bybit', displayName: 'Bybit', logo: '🟠', isSelected: true, baseUrl: 'https://bybit.com', pairUrlPattern: 'https://bybit.com/trade/{symbol}' },
        { id: 'bitget', name: 'bitget', displayName: 'Bitget', logo: '🔵', isSelected: true, baseUrl: 'https://bitget.com', pairUrlPattern: 'https://bitget.com/trade/{symbol}' },
        { id: 'mexc', name: 'mexc', displayName: 'MEXC', logo: '🟢', isSelected: true, baseUrl: 'https://mexc.com', pairUrlPattern: 'https://mexc.com/trade/{symbol}' },
        { id: 'bingx', name: 'bingx', displayName: 'BingX', logo: '🔴', isSelected: true, baseUrl: 'https://bingx.com', pairUrlPattern: 'https://bingx.com/trade/{symbol}' },
        { id: 'gateio', name: 'gateio', displayName: 'Gate.io', logo: '🟣', isSelected: true, baseUrl: 'https://gate.io', pairUrlPattern: 'https://gate.io/trade/{symbol}' },
        { id: 'kucoin', name: 'kucoin', displayName: 'KuCoin', logo: '🟦', isSelected: true, baseUrl: 'https://kucoin.com', pairUrlPattern: 'https://kucoin.com/trade/{symbol}' }
      ];
    }
  },

  async saveUserPreferences(userId: string, exchanges: string[]) {
    try {
      await api.post('/user/preferences', {
        userId,
        selectedExchanges: exchanges
      });
    } catch (error) {
      console.error('Failed to save preferences:', error);
      // Silently fail for now
    }
  }
};
