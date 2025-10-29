/**
 * Blockchain detection configuration
 */

export interface KnownTokenConfig {
  primary: string;
  supported: string[];
}

export const BLOCKCHAIN_CONFIG = {
  scanning: {
    enabled: true,
    interval: 6 * 60 * 60 * 1000, // 6 hours
    exchanges: ['binance', 'okx', 'bybit', 'mexc', 'kucoin', 'gateio'],
    confidenceThreshold: 70, // Minimum confidence to use detected chain
    cacheDuration: 3600000, // 1 hour cache for exchange data
  },
  
  knownTokens: {
    // Override for tokens with known issues or high-profile multi-chain tokens
    'USDT': {
      primary: 'tron', // Most USDT volume on Tron
      supported: ['ethereum', 'bsc', 'polygon', 'arbitrum', 'tron', 'solana', 'avalanche']
    } as KnownTokenConfig,
    'USDC': {
      primary: 'ethereum',
      supported: ['ethereum', 'polygon', 'arbitrum', 'solana', 'avalanche', 'bsc']
    } as KnownTokenConfig,
    'BTC': {
      primary: 'bitcoin',
      supported: ['bitcoin', 'ethereum', 'bsc', 'polygon', 'solana'] // Wrapped versions
    } as KnownTokenConfig,
    'ETH': {
      primary: 'ethereum',
      supported: ['ethereum', 'bsc', 'polygon', 'arbitrum', 'optimism', 'avalanche', 'solana']
    } as KnownTokenConfig,
  },
  
  chainPriority: [
    // When ambiguous, prefer chains in this order
    'ethereum',
    'bsc', 
    'solana',
    'polygon',
    'arbitrum',
    'avalanche',
    'tron',
    'optimism',
    'bitcoin',
    'litecoin',
    'ripple',
    'stellar',
    'dogecoin'
  ],

  exchangeNetworkMapping: {
    binance: {
      'ETH': 'ethereum',
      'ERC20': 'ethereum',
      'BSC': 'bsc',
      'BEP20': 'bsc',
      'BEP2': 'bnbchain',
      'POLYGON': 'polygon',
      'MATIC': 'polygon',
      'AVAX': 'avalanche',
      'AVAXC': 'avalanche',
      'AVALANCHE': 'avalanche',
      'ARB': 'arbitrum',
      'ARBITRUM': 'arbitrum',
      'OP': 'optimism',
      'OPTIMISM': 'optimism',
      'SOL': 'solana',
      'SOLANA': 'solana',
      'TRX': 'tron',
      'TRC20': 'tron',
      'TRON': 'tron',
      'FTM': 'fantom',
      'FANTOM': 'fantom',
      'BASE': 'base',
      'SUI': 'sui',
      'APT': 'aptos',
      'APTOS': 'aptos',
      'TON': 'ton',
      'NEAR': 'near',
    },
    okx: {
      'ETH': 'ethereum',
      'ERC20': 'ethereum',
      'BSC': 'bsc',
      'BEP20': 'bsc',
      'POLYGON': 'polygon',
      'MATIC': 'polygon',
      'AVAX': 'avalanche',
      'ARB': 'arbitrum',
      'OP': 'optimism',
      'SOL': 'solana',
      'TRX': 'tron',
      'TRC20': 'tron',
    },
    bybit: {
      'ETH': 'ethereum',
      'ERC20': 'ethereum',
      'BSC': 'bsc',
      'BEP20': 'bsc',
      'POLYGON': 'polygon',
      'MATIC': 'polygon',
      'AVAX': 'avalanche',
      'ARB': 'arbitrum',
      'OP': 'optimism',
      'SOL': 'solana',
      'TRX': 'tron',
    }
  }
};

