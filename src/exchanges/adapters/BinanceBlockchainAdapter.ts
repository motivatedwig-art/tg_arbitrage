/**
 * Binance Blockchain Network Adapter
 * Fetches network/blockchain information from Binance API
 */

import ccxt from 'ccxt';

export interface BinanceNetworkInfo {
  symbol: string;
  networks: {
    network: string;
    blockchain: string;
    contractAddress?: string;
    isDefault: boolean;
    depositEnabled: boolean;
    withdrawEnabled: boolean;
    withdrawFee: number;
    minWithdraw: number;
    confirmations: number;
    name: string;
  }[];
}

export class BinanceBlockchainAdapter {
  private exchange: ccxt.Exchange;
  private apiKey: string;
  private apiSecret: string;

  constructor(apiKey?: string, apiSecret?: string) {
    this.apiKey = apiKey || process.env.BINANCE_API_KEY || '';
    this.apiSecret = apiSecret || process.env.BINANCE_API_SECRET || '';
    
    this.exchange = new ccxt.binance({
      apiKey: this.apiKey,
      secret: this.apiSecret,
      enableRateLimit: true,
      options: {
        defaultType: 'spot'
      }
    });
  }

  /**
   * Fetch coin network information from Binance
   * Uses /sapi/v1/capital/config/getall endpoint
   */
  async fetchCoinNetworks(): Promise<Map<string, BinanceNetworkInfo>> {
    try {
      console.log('📡 Fetching Binance coin networks...');
      
      // Binance API endpoint for getting all coin network configurations
      // This requires authenticated access
      const response = await this.exchange.sapiGetCapitalConfigGetall();
      
      const networkMap = new Map<string, BinanceNetworkInfo>();

      for (const coin of response) {
        const networks = coin.networkList?.map((network: any) => {
          const blockchain = this.mapNetworkToBlockchain(network.network);
          
          return {
            network: network.network,
            blockchain: blockchain,
            contractAddress: network.contractAddress || undefined,
            isDefault: network.isDefault || false,
            depositEnabled: network.depositEnable || false,
            withdrawEnabled: network.withdrawEnable || false,
            withdrawFee: parseFloat(network.withdrawFee || '0'),
            minWithdraw: parseFloat(network.withdrawMin || '0'),
            confirmations: network.minConfirm || 0,
            name: network.name || network.network
          };
        }) || [];

        if (networks.length > 0) {
          networkMap.set(coin.coin, {
            symbol: coin.coin,
            networks
          });
        }
      }

      console.log(`✅ Binance: Found network info for ${networkMap.size} coins`);
      return networkMap;

    } catch (error: any) {
      console.error('❌ Failed to fetch Binance networks:', error.message);
      
      // If authenticated endpoint fails, try public endpoint or return empty
      if (error.code === 401 || error.code === 403) {
        console.warn('⚠️ Binance API credentials may be invalid for network info');
      }
      
      return new Map();
    }
  }

  /**
   * Map Binance network codes to standardized blockchain names
   */
  private mapNetworkToBlockchain(network: string): string {
    const mapping: { [key: string]: string } = {
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
      'CCHAIN': 'avalanche',
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
      'COSMOS': 'cosmos',
      'ATOM': 'cosmos',
      'DOT': 'polkadot',
      'ADA': 'cardano',
      'BTC': 'bitcoin',
      'BITCOIN': 'bitcoin',
      'LTC': 'litecoin',
      'XRP': 'ripple',
      'XLM': 'stellar',
      'DOGE': 'dogecoin',
      'ZEC': 'zcash',
    };

    return mapping[network.toUpperCase()] || network.toLowerCase();
  }

  /**
   * Get network info for a specific coin
   */
  async getCoinNetworks(symbol: string): Promise<BinanceNetworkInfo | null> {
    const allNetworks = await this.fetchCoinNetworks();
    return allNetworks.get(symbol.toUpperCase()) || null;
  }
}

