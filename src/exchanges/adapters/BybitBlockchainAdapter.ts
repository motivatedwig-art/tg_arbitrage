/**
 * Bybit Blockchain Network Adapter
 * Fetches network/blockchain information from Bybit API
 */

import ccxt from 'ccxt';

export interface BybitNetworkInfo {
  symbol: string;
  networks: {
    chain: string;
    blockchain: string;
    contractAddress?: string;
    depositEnabled: boolean;
    withdrawEnabled: boolean;
    withdrawFee: number;
    minWithdraw: number;
    confirmations: number;
    chainType: string;
  }[];
}

export class BybitBlockchainAdapter {
  private exchange: ccxt.bybit;
  private apiKey: string;
  private apiSecret: string;

  constructor(apiKey?: string, apiSecret?: string) {
    this.apiKey = apiKey || process.env.BYBIT_API_KEY || '';
    this.apiSecret = apiSecret || process.env.BYBIT_API_SECRET || '';
    
    this.exchange = new ccxt.bybit({
      apiKey: this.apiKey,
      secret: this.apiSecret,
      enableRateLimit: true,
      options: {
        defaultType: 'spot'
      }
    });
  }

  /**
   * Fetch coin information from Bybit
   * Uses /v5/asset/coin/query-info endpoint
   */
  async fetchCoinInfo(): Promise<Map<string, BybitNetworkInfo>> {
    try {
      console.log('📡 Fetching Bybit coin info...');
      
      // Bybit API endpoint
      const response = await this.exchange.v5GetAssetCoinQueryInfo({});
      
      const coinMap = new Map<string, BybitNetworkInfo>();

      if (response.result && response.result.rows) {
        for (const coin of response.result.rows) {
          const networks = coin.chains?.map((chain: any) => {
            const blockchain = this.normalizeChainName(chain.chain);
            
            return {
              chain: chain.chain,
              blockchain: blockchain,
              contractAddress: chain.chainContract || undefined,
              depositEnabled: chain.chainDeposit === 1 || chain.chainDeposit === '1',
              withdrawEnabled: chain.chainWithdraw === 1 || chain.chainWithdraw === '1',
              withdrawFee: parseFloat(chain.withdrawFee || '0'),
              minWithdraw: parseFloat(chain.withdrawMin || '0'),
              confirmations: chain.confirmation || 0,
              chainType: chain.chainType || ''
            };
          }) || [];

          if (networks.length > 0) {
            coinMap.set(coin.coin, {
              symbol: coin.coin,
              networks
            });
          }
        }
      }

      console.log(`✅ Bybit: Found network info for ${coinMap.size} coins`);
      return coinMap;

    } catch (error: any) {
      console.error('❌ Failed to fetch Bybit coin info:', error.message);
      return new Map();
    }
  }

  /**
   * Normalize Bybit chain names to standardized blockchain names
   */
  private normalizeChainName(chain: string): string {
    const mapping: { [key: string]: string } = {
      'ETH': 'ethereum',
      'ERC20': 'ethereum',
      'BSC': 'bsc',
      'BEP20': 'bsc',
      'POLYGON': 'polygon',
      'MATIC': 'polygon',
      'AVAX': 'avalanche',
      'AVAXC': 'avalanche',
      'ARB': 'arbitrum',
      'ARBITRUM': 'arbitrum',
      'OP': 'optimism',
      'OPTIMISM': 'optimism',
      'SOL': 'solana',
      'TRX': 'tron',
      'TRC20': 'tron',
      'FTM': 'fantom',
      'BASE': 'base',
      'SUI': 'sui',
      'APT': 'aptos',
      'TON': 'ton',
      'NEAR': 'near',
    };

    // Bybit uses various formats
    const normalized = chain.toUpperCase().trim();
    
    // Check direct mapping
    if (mapping[normalized]) {
      return mapping[normalized];
    }

    // Check if it contains a known network name
    for (const [key, value] of Object.entries(mapping)) {
      if (normalized.includes(key)) {
        return value;
      }
    }

    return chain.toLowerCase();
  }

  /**
   * Get network info for a specific coin
   */
  async getCoinInfo(symbol: string): Promise<BybitNetworkInfo | null> {
    const allCoins = await this.fetchCoinInfo();
    return allCoins.get(symbol.toUpperCase()) || null;
  }
}

