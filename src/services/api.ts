import axios, { AxiosError } from 'axios';
import { ApiResponse, Exchange, ArbitrageOpportunity } from '../types';

// Get API base URL with fallback
const getAPIBaseURL = (): string => {
  const envUrl = import.meta.env.VITE_API_BASE_URL;
  
  if (envUrl) {
    return envUrl.endsWith('/api') ? envUrl : `${envUrl}/api`;
  }
  
  // Development fallback
  if (import.meta.env.DEV) {
    return 'http://localhost:3000/api';
  }
  
  // Production - this should be set via env var
  throw new Error('VITE_API_BASE_URL not configured');
};

const API_BASE_URL = getAPIBaseURL();

console.log('API Base URL:', API_BASE_URL);

// Create axios instance with better configuration
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000, // Increased timeout
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add request interceptor for debugging
api.interceptors.request.use(
  (config) => {
    console.log(`API Request: ${config.method?.toUpperCase()} ${config.url}`, config.params);
    return config;
  },
  (error) => {
    console.error('API Request Error:', error);
    return Promise.reject(error);
  }
);

// Add response interceptor for error handling
api.interceptors.response.use(
  (response) => {
    console.log(`API Response: ${response.status}`, response.data);
    return response;
  },
  (error: AxiosError) => {
    console.error('API Response Error:', {
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data,
      message: error.message
    });
    
    // Handle common errors
    if (error.code === 'ECONNABORTED') {
      throw new Error('Request timeout - please try again');
    }
    
    if (error.response?.status === 404) {
      throw new Error('API endpoint not found');
    }
    
    if (error.response?.status >= 500) {
      throw new Error('Server error - please try again later');
    }
    
    if (error.response?.status === 429) {
      throw new Error('Too many requests - please wait a moment');
    }
    
    throw error;
  }
);

export const apiService = {
  async getArbitrageData(selectedExchanges: string[]): Promise<ApiResponse> {
    try {
      const params = selectedExchanges.length ? { exchanges: selectedExchanges.join(',') } : {};
      const response = await api.get('/opportunities', { params });
      
      // Validate response structure
      if (!response.data) {
        throw new Error('Invalid response format: missing data');
      }
      
      const responseData = response.data;
      
      // Handle different response formats
      let opportunities: ArbitrageOpportunity[] = [];
      
      if (responseData.data && Array.isArray(responseData.data)) {
        // Backend returns { data: [...], meta: {...} }
        opportunities = responseData.data.map((opp: any) => this.transformOpportunity(opp));
      } else if (Array.isArray(responseData)) {
        // Backend returns [...] directly
        opportunities = responseData.map((opp: any) => this.transformOpportunity(opp));
      } else if (responseData.opportunities && Array.isArray(responseData.opportunities)) {
        // Backend returns { opportunities: [...] }
        opportunities = responseData.opportunities.map((opp: any) => this.transformOpportunity(opp));
      } else {
        console.warn('Unexpected response format:', responseData);
        opportunities = [];
      }

      return {
        opportunities: opportunities.filter(opp => opp !== null), // Filter out invalid opportunities
        lastUpdate: responseData.meta?.generatedAt || responseData.lastUpdate || new Date().toISOString(),
        nextUpdate: new Date(Date.now() + 30000).toISOString() // 30 seconds from now
      };
    } catch (error) {
      console.error('API Error in getArbitrageData:', error);
      
      if (error instanceof Error) {
        throw error;
      }
      
      throw new Error('Failed to fetch arbitrage data');
    }
  },

  transformOpportunity(opp: any): ArbitrageOpportunity | null {
    try {
      // Validate required fields
      if (!opp.symbol || !opp.buyExchange || !opp.sellExchange || 
          typeof opp.buyPrice !== 'number' || typeof opp.sellPrice !== 'number') {
        console.warn('Invalid opportunity data:', opp);
        return null;
      }

      // Parse symbol
      const symbolParts = opp.symbol.includes('/') 
        ? opp.symbol.split('/')
        : [opp.symbol.replace('USDT', ''), 'USDT'];
        
      const baseAsset = symbolParts[0] || '';
      const quoteAsset = symbolParts[1] || 'USDT';

      const timestamp = opp.timestamp ? new Date(opp.timestamp).toISOString() : new Date().toISOString();

      return {
        pair: {
          symbol: opp.symbol,
          baseAsset,
          quoteAsset,
          displaySymbol: opp.symbol
        },
        prices: [
          {
            exchangeId: opp.buyExchange.toLowerCase(),
            exchangeName: opp.buyExchange,
            price: opp.buyPrice,
            volume: opp.volume || 0,
            url: this.getExchangeUrl(opp.buyExchange),
            lastUpdated: timestamp
          },
          {
            exchangeId: opp.sellExchange.toLowerCase(),
            exchangeName: opp.sellExchange,
            price: opp.sellPrice,
            volume: opp.volume || 0,
            url: this.getExchangeUrl(opp.sellExchange),
            lastUpdated: timestamp
          }
        ],
        bestBuy: {
          exchangeId: opp.buyExchange.toLowerCase(),
          exchangeName: opp.buyExchange,
          price: opp.buyPrice,
          volume: opp.volume || 0,
          url: this.getExchangeUrl(opp.buyExchange),
          lastUpdated: timestamp
        },
        bestSell: {
          exchangeId: opp.sellExchange.toLowerCase(),
          exchangeName: opp.sellExchange,
          price: opp.sellPrice,
          volume: opp.volume || 0,
          url: this.getExchangeUrl(opp.sellExchange),
          lastUpdated: timestamp
        },
        spreadPercentage: opp.profitPercentage || opp.spreadPercentage || 0,
        spreadAmount: opp.profitAmount || opp.spreadAmount || 0,
        profitability: this.getProfitability(opp.profitPercentage || opp.spreadPercentage || 0)
      };
    } catch (error) {
      console.error('Error transforming opportunity:', error, opp);
      return null;
    }
  },

  getExchangeUrl(exchangeName: string): string {
    const exchange = exchangeName.toLowerCase();
    const urls: Record<string, string> = {
      binance: 'https://binance.com',
      okx: 'https://okx.com',
      bybit: 'https://bybit.com',
      bitget: 'https://bitget.com',
      mexc: 'https://mexc.com',
      bingx: 'https://bingx.com',
      gateio: 'https://gate.io',
      kucoin: 'https://kucoin.com'
    };
    return urls[exchange] || `https://${exchange}.com`;
  },

  getProfitability(percentage: number): 'high' | 'medium' | 'low' {
    if (percentage >= 2) return 'high';
    if (percentage >= 1) return 'medium';
    return 'low';
  },

  async getAvailableExchanges(): Promise<Exchange[]> {
    try {
      // Try to get exchange status from backend
      const response = await api.get('/status');
      const statusData = response.data?.data || response.data;

      const exchanges: Exchange[] = [
        { id: 'binance', name: 'binance', displayName: 'Binance', logo: '🟡', baseUrl: 'https://binance.com' },
        { id: 'okx', name: 'okx', displayName: 'OKX', logo: '⚫', baseUrl: 'https://okx.com' },
        { id: 'bybit', name: 'bybit', displayName: 'Bybit', logo: '🟠', baseUrl: 'https://bybit.com' },
        { id: 'bitget', name: 'bitget', displayName: 'Bitget', logo: '🔵', baseUrl: 'https://bitget.com' },
        { id: 'mexc', name: 'mexc', displayName: 'MEXC', logo: '🟢', baseUrl: 'https://mexc.com' },
        { id: 'bingx', name: 'bingx', displayName: 'BingX', logo: '🔴', baseUrl: 'https://bingx.com' },
        { id: 'gateio', name: 'gateio', displayName: 'Gate.io', logo: '🟣', baseUrl: 'https://gate.io' },
        { id: 'kucoin', name: 'kucoin', displayName: 'KuCoin', logo: '🟦', baseUrl: 'https://kucoin.com' }
      ];

      return exchanges.map(exchange => ({
        ...exchange,
        isSelected: true, // Default all selected
        pairUrlPattern: `${exchange.baseUrl}/trade/{symbol}`,
        status: statusData?.[exchange.id] || 'unknown'
      }));
    } catch (error) {
      console.warn('Failed to fetch exchange status, using defaults:', error);
      
      // Return default exchanges if API fails
      const defaultExchanges: Exchange[] = [
        { id: 'binance', name: 'binance', displayName: 'Binance', logo: '🟡', isSelected: true, baseUrl: 'https://binance.com', pairUrlPattern: 'https://binance.com/trade/{symbol}' },
        { id: 'okx', name: 'okx', displayName: 'OKX', logo: '⚫', isSelected: true, baseUrl: 'https://okx.com', pairUrlPattern: 'https://okx.com/trade/{symbol}' },
        { id: 'bybit', name: 'bybit', displayName: 'Bybit', logo: '🟠', isSelected: true, baseUrl: 'https://bybit.com', pairUrlPattern: 'https://bybit.com/trade/{symbol}' },
        { id: 'bitget', name: 'bitget', displayName: 'Bitget', logo: '🔵', isSelected: true, baseUrl: 'https://bitget.com', pairUrlPattern: 'https://bitget.com/trade/{symbol}' },
        { id: 'mexc', name: 'mexc', displayName: 'MEXC', logo: '🟢', isSelected: true, baseUrl: 'https://mexc.com', pairUrlPattern: 'https://mexc.com/trade/{symbol}' },
        { id: 'bingx', name: 'bingx', displayName: 'BingX', logo: '🔴', isSelected: true, baseUrl: 'https://bingx.com', pairUrlPattern: 'https://bingx.com/trade/{symbol}' },
        { id: 'gateio', name: 'gateio', displayName: 'Gate.io', logo: '🟣', isSelected: true, baseUrl: 'https://gate.io', pairUrlPattern: 'https://gate.io/trade/{symbol}' },
        { id: 'kucoin', name: 'kucoin', displayName: 'KuCoin', logo: '🟦', isSelected: true, baseUrl: 'https://kucoin.com', pairUrlPattern: 'https://kucoin.com/trade/{symbol}' }
      ];

      return defaultExchanges;
    }
  },

  async saveUserPreferences(userId: string, exchanges: string[]): Promise<void> {
    try {
      await api.post('/user/preferences', {
        userId,
        selectedExchanges: exchanges
      });
      console.log('User preferences saved successfully');
    } catch (error) {
      console.warn('Failed to save user preferences:', error);
      // Silently fail for now - not critical for UI functionality
    }
  },

  // Health check method
  async healthCheck(): Promise<boolean> {
    try {
      const response = await api.get('/health', { timeout: 5000 });
      return response.status === 200;
    } catch (error) {
      console.warn('API health check failed:', error);
      return false;
    }
  }
};
