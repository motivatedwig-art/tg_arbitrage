/**
 * OKX Blockchain Network Adapter
 * Fetches network/blockchain information from OKX API
 */

import ccxt, { Exchange } from 'ccxt';

export interface OKXNetworkInfo {
  symbol: string;
  networks: {
    chain: string;
    blockchain: string;
    contractAddress?: string;
    canDeposit: boolean;
    canWithdraw: boolean;
    withdrawFee: number;
    minWithdraw: number;
    maxWithdraw?: number;
  }[];
}

export class OKXBlockchainAdapter {
  private exchange: Exchange;
  private apiKey: string;
  private apiSecret: string;
  private passphrase: string;

  constructor(apiKey?: string, apiSecret?: string, passphrase?: string) {
    this.apiKey = apiKey || process.env.OKX_API_KEY || '';
    this.apiSecret = apiSecret || process.env.OKX_API_SECRET || '';
    this.passphrase = passphrase || process.env.OKX_PASSPHRASE || '';
    
    this.exchange = new ccxt.okx({
      apiKey: this.apiKey,
      secret: this.apiSecret,
      password: this.passphrase,
      enableRateLimit: true,
      options: {
        defaultType: 'spot'
      }
    });
  }

  /**
   * Fetch currency chain information from OKX
   * Uses /api/v5/asset/currencies endpoint
   */
  async fetchCurrencyChains(): Promise<Map<string, OKXNetworkInfo>> {
    try {
      console.log('📡 Fetching OKX currency chains...');
      
      // OKX public endpoint - doesn't require authentication
      const response = await this.exchange.publicGetAssetCurrencies();
      
      const currencyMap = new Map<string, OKXNetworkInfo>();

      // Group currencies by symbol
      const grouped = new Map<string, any[]>();
      
      for (const currency of response.data) {
        const symbol = currency.ccy;
        if (!grouped.has(symbol)) {
          grouped.set(symbol, []);
        }
        grouped.get(symbol)!.push(currency);
      }

      // Process each currency
      for (const [symbol, currencies] of grouped.entries()) {
        const networks = currencies.map((currency: any) => {
          const chain = currency.chain || '';
          const blockchain = this.mapChainToBlockchain(chain);
          
          return {
            chain: chain,
            blockchain: blockchain,
            contractAddress: currency.contract || undefined,
            canDeposit: currency.canDep === '1' || currency.canDep === true,
            canWithdraw: currency.canWd === '1' || currency.canWd === true,
            withdrawFee: parseFloat(currency.minFee || '0'),
            minWithdraw: parseFloat(currency.minWd || '0'),
            maxWithdraw: currency.maxWd ? parseFloat(currency.maxWd) : undefined
          };
        });

        if (networks.length > 0) {
          currencyMap.set(symbol, {
            symbol,
            networks
          });
        }
      }

      console.log(`✅ OKX: Found chain info for ${currencyMap.size} currencies`);
      return currencyMap;

    } catch (error: any) {
      console.error('❌ Failed to fetch OKX chains:', error.message);
      return new Map();
    }
  }

  /**
   * Map OKX chain codes to standardized blockchain names
   */
  private mapChainToBlockchain(chain: string): string {
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

    // OKX sometimes uses format like "ETH-ERC20" or "USDT-TRC20"
    const parts = chain.split('-');
    const firstPart = parts[0].toUpperCase();
    const secondPart = parts[1]?.toUpperCase() || '';
    
    // Try second part first (more specific)
    if (secondPart && mapping[secondPart]) {
      return mapping[secondPart];
    }
    
    // Try first part
    if (mapping[firstPart]) {
      return mapping[firstPart];
    }

    return chain.toLowerCase();
  }

  /**
   * Get network info for a specific currency
   */
  async getCurrencyChains(symbol: string): Promise<OKXNetworkInfo | null> {
    const allChains = await this.fetchCurrencyChains();
    return allChains.get(symbol.toUpperCase()) || null;
  }
}

