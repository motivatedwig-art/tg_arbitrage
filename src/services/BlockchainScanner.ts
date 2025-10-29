/**
 * Blockchain Scanner Service
 * Scans exchanges to determine which blockchain each token belongs to
 */

import { ExchangeManager } from '../exchanges/ExchangeManager.js';
import { ExchangeAdapter } from '../exchanges/types/index.js';
import { BLOCKCHAIN_CONFIG } from '../config/blockchain.config.js';

export interface NetworkInfo {
  network: string;        // Exchange-specific network code (e.g., 'ETH', 'BSC', 'SOL')
  blockchain: string;     // Normalized blockchain name (e.g., 'ethereum', 'bsc')
  contractAddress?: string;
  chainId?: number;
  depositEnabled: boolean;
  withdrawEnabled: boolean;
  isDefault: boolean;
  withdrawFee: number;
  minWithdraw: number;
  confirmations: number;
  name?: string;          // Human-readable network name
}

export interface ExchangeNetworkInfo {
  symbol: string;
  networks: NetworkInfo[];
  mainNetwork?: string;   // Primary/native blockchain
  timestamp: Date;
  exchange: string;
  confidence: number;     // 0-100 confidence score
}

export class BlockchainScanner {
  private exchangeManager: ExchangeManager;
  private networkCache: Map<string, ExchangeNetworkInfo[]> = new Map();
  private contractToChain: Map<string, string> = new Map();
  private lastScanTime: Date | null = null;

  constructor() {
    this.exchangeManager = ExchangeManager.getInstance();
  }

  /**
   * Scan all connected exchanges for network/blockchain information
   */
  async scanAllExchanges(): Promise<Map<string, ExchangeNetworkInfo[]>> {
    console.log('🔍 Starting blockchain scan across all exchanges...');
    const results = new Map<string, ExchangeNetworkInfo[]>();

    const adapters = this.exchangeManager['adapters'] as Map<string, ExchangeAdapter>;
    
    // Parallel scan all exchanges
    const scanPromises = Array.from(adapters.entries()).map(async ([exchangeName, adapter]) => {
      try {
        if (!adapter.isConnected()) {
          console.log(`   ⚠️ ${exchangeName} not connected, skipping...`);
          return null;
        }

        console.log(`   📡 Scanning ${exchangeName}...`);
        const networkInfo = await this.scanExchangeNetworks(exchangeName, adapter);
        
        if (networkInfo && networkInfo.length > 0) {
          results.set(exchangeName, networkInfo);
          console.log(`   ✅ ${exchangeName}: Found network info for ${networkInfo.length} tokens`);
        }
        
        return networkInfo;
      } catch (error) {
        console.error(`   ❌ Failed to scan ${exchangeName}:`, error);
        return null;
      }
    });

    await Promise.allSettled(scanPromises);
    this.lastScanTime = new Date();

    // Build contract address to chain mapping
    this.buildContractMapping(results);

    console.log(`✅ Blockchain scan complete. Scanned ${results.size} exchanges`);
    return results;
  }

  /**
   * Scan a specific exchange for network information
   */
  private async scanExchangeNetworks(
    exchange: string,
    adapter: ExchangeAdapter
  ): Promise<ExchangeNetworkInfo[] | null> {
    // Check cache first
    const cacheKey = `${exchange}-${Date.now()}`;
    const cached = this.networkCache.get(cacheKey);
    if (cached) {
      return cached;
    }

    // Exchange-specific implementation
    // For now, we'll use the exchange adapters with enhanced blockchain detection
    // TODO: Implement exchange-specific API calls when blockchain adapters are created
    
    // This is a placeholder - will be enhanced with exchange-specific adapters
    const networks: ExchangeNetworkInfo[] = [];
    
    // Try to get network info from exchange if available
    try {
      // Access the underlying CCXT exchange if available
      const ccxtExchange = (adapter as any).exchange;
      if (ccxtExchange && typeof ccxtExchange.loadMarkets === 'function') {
        await ccxtExchange.loadMarkets();
        
        // Extract network information from markets if available
        // This is exchange-specific and will be enhanced later
        for (const [symbol, market] of Object.entries(ccxtExchange.markets)) {
          if (market.active && market.type === 'spot') {
            // Some exchanges include network info in market data
            const networkInfo = this.extractNetworkFromMarket(market, exchange);
            if (networkInfo) {
              networks.push(networkInfo);
            }
          }
        }
      }
    } catch (error) {
      console.warn(`Could not extract network info from ${exchange}:`, error);
    }

    // Cache results
    if (networks.length > 0) {
      this.networkCache.set(cacheKey, networks);
    }

    return networks.length > 0 ? networks : null;
  }

  /**
   * Extract network information from CCXT market object
   */
  private extractNetworkFromMarket(market: any, exchange: string): ExchangeNetworkInfo | null {
    // Market may have network info depending on exchange
    // This is a basic implementation - will be enhanced per exchange
    
    if (!market || !market.base) {
      return null;
    }

    const symbol = market.symbol;
    const networks: NetworkInfo[] = [];

    // Try to infer from market structure
    // Some exchanges store network info in market.info
    if (market.info) {
      // Exchange-specific parsing will be handled by blockchain adapters
      // For now, return null and let adapters handle it
      return null;
    }

    // Fallback: use symbol-based detection
    const blockchain = this.detectBlockchainFromSymbol(symbol);
    if (blockchain) {
      networks.push({
        network: blockchain,
        blockchain: blockchain,
        depositEnabled: market.active,
        withdrawEnabled: market.active,
        isDefault: true,
        withdrawFee: 0,
        minWithdraw: 0,
        confirmations: 0
      });

      return {
        symbol,
        networks,
        mainNetwork: blockchain,
        timestamp: new Date(),
        exchange,
        confidence: 50 // Low confidence for symbol-based detection
      };
    }

    return null;
  }

  /**
   * Detect blockchain from contract address format
   */
  private detectChainFromContract(address: string): string | null {
    if (!address || address.length === 0) {
      return null;
    }

    // Ethereum-compatible (0x prefixed, 40 hex chars)
    if (/^0x[a-fA-F0-9]{40}$/.test(address)) {
      // Could be ETH, BSC, Polygon, etc.
      // Will need additional context
      return null; // Ambiguous - needs context
    }
    
    // Solana (base58, 32-44 chars)
    if (/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(address)) {
      return 'solana';
    }
    
    // Tron (base58, starts with T)
    if (/^T[1-9A-HJ-NP-Za-km-z]{33}$/.test(address)) {
      return 'tron';
    }

    return null;
  }

  /**
   * Basic blockchain detection from symbol (fallback)
   */
  private detectBlockchainFromSymbol(symbol: string): string | null {
    const cleanSymbol = symbol.replace(/[\/\-_]/g, '').replace(/USDT$|USDC$/i, '').toUpperCase();
    
    // Native tokens
    if (cleanSymbol === 'BTC') return 'bitcoin';
    if (cleanSymbol === 'ETH') return 'ethereum';
    if (cleanSymbol === 'BNB') return 'bsc';
    if (cleanSymbol === 'SOL') return 'solana';
    if (cleanSymbol === 'TRX') return 'tron';
    if (cleanSymbol === 'MATIC') return 'polygon';
    if (cleanSymbol === 'AVAX') return 'avalanche';
    if (cleanSymbol === 'ARB') return 'arbitrum';
    if (cleanSymbol === 'OP') return 'optimism';
    
    return null;
  }

  /**
   * Reconcile network data from multiple exchanges
   */
  reconcileNetworkData(
    allData: Map<string, ExchangeNetworkInfo[]>
  ): Map<string, ExchangeNetworkInfo> {
    const reconciled = new Map<string, ExchangeNetworkInfo>();

    // Group by symbol
    const symbolGroups = new Map<string, ExchangeNetworkInfo[]>();
    
    for (const exchangeData of allData.values()) {
      for (const info of exchangeData) {
        if (!symbolGroups.has(info.symbol)) {
          symbolGroups.set(info.symbol, []);
        }
        symbolGroups.get(info.symbol)!.push(info);
      }
    }

    // Reconcile each symbol
    for (const [symbol, exchangeInfos] of symbolGroups.entries()) {
      const reconciledInfo = this.reconcileSymbolData(symbol, exchangeInfos);
      if (reconciledInfo) {
        reconciled.set(symbol, reconciledInfo);
      }
    }

    return reconciled;
  }

  /**
   * Reconcile data for a single symbol across exchanges
   */
  private reconcileSymbolData(
    symbol: string,
    exchangeInfos: ExchangeNetworkInfo[]
  ): ExchangeNetworkInfo | null {
    if (exchangeInfos.length === 0) {
      return null;
    }

    // Collect all networks from all exchanges
    const networkMap = new Map<string, NetworkInfo[]>();
    
    for (const info of exchangeInfos) {
      for (const network of info.networks) {
        const blockchain = network.blockchain;
        if (!networkMap.has(blockchain)) {
          networkMap.set(blockchain, []);
        }
        networkMap.get(blockchain)!.push(network);
      }
    }

    // Aggregate networks
    const aggregatedNetworks: NetworkInfo[] = [];
    
    for (const [blockchain, networks] of networkMap.entries()) {
      // Use the most common network info
      const bestNetwork = this.selectBestNetwork(networks);
      aggregatedNetworks.push(bestNetwork);
    }

    // Determine primary network
    const primaryNetwork = this.determinePrimaryNetwork(aggregatedNetworks, exchangeInfos);

    // Calculate confidence score
    const confidence = this.calculateConfidence(exchangeInfos, aggregatedNetworks);

    return {
      symbol,
      networks: aggregatedNetworks,
      mainNetwork: primaryNetwork,
      timestamp: new Date(),
      exchange: 'multi', // Multiple exchanges
      confidence
    };
  }

  /**
   * Select the best network info from multiple sources
   */
  private selectBestNetwork(networks: NetworkInfo[]): NetworkInfo {
    // Prefer networks that are default, have lower fees, and more confirmations
    const scored = networks.map(network => ({
      network,
      score: (network.isDefault ? 10 : 0) + 
             (10 / (network.withdrawFee + 1)) + 
             (network.confirmations / 10)
    }));

    scored.sort((a, b) => b.score - a.score);
    return scored[0].network;
  }

  /**
   * Determine primary blockchain for a token
   */
  private determinePrimaryNetwork(
    networks: NetworkInfo[],
    exchangeInfos: ExchangeNetworkInfo[]
  ): string {
    // Check known tokens first
    const symbol = exchangeInfos[0].symbol.toUpperCase();
    if (BLOCKCHAIN_CONFIG.knownTokens[symbol]) {
      return BLOCKCHAIN_CONFIG.knownTokens[symbol].primary;
    }

    // Score networks based on various factors
    const scores = new Map<string, number>();

    for (const network of networks) {
      const blockchain = network.blockchain;
      let score = scores.get(blockchain) || 0;

      // Default network gets higher score
      if (network.isDefault) score += 50;

      // More confirmations = more established
      score += Math.min(network.confirmations, 20);

      // Lower fees = more active
      score += 10 / (network.withdrawFee + 1);

      // Active on both deposit and withdraw
      if (network.depositEnabled && network.withdrawEnabled) score += 20;

      scores.set(blockchain, score);
    }

    // Add priority bonus
    BLOCKCHAIN_CONFIG.chainPriority.forEach((chain, index) => {
      if (scores.has(chain)) {
        scores.set(chain, (scores.get(chain) || 0) + (BLOCKCHAIN_CONFIG.chainPriority.length - index));
      }
    });

    // Return highest scoring blockchain
    const sorted = Array.from(scores.entries()).sort((a, b) => b[1] - a[1]);
    return sorted.length > 0 ? sorted[0][0] : networks[0]?.blockchain || 'ethereum';
  }

  /**
   * Calculate confidence score for blockchain detection
   */
  private calculateConfidence(
    exchangeInfos: ExchangeNetworkInfo[],
    networks: NetworkInfo[]
  ): number {
    let score = 0;

    // More exchanges agreeing increases confidence
    score += Math.min(exchangeInfos.length * 15, 60);

    // More networks found increases confidence
    score += Math.min(networks.length * 5, 20);

    // Check if known token
    const symbol = exchangeInfos[0].symbol.toUpperCase();
    if (BLOCKCHAIN_CONFIG.knownTokens[symbol]) {
      score += 20;
    }

    return Math.min(score, 100);
  }

  /**
   * Build contract address to blockchain mapping
   */
  private buildContractMapping(
    exchangeData: Map<string, ExchangeNetworkInfo[]>
  ): void {
    for (const exchangeInfos of exchangeData.values()) {
      for (const info of exchangeInfos) {
        for (const network of info.networks) {
          if (network.contractAddress) {
            const detected = this.detectChainFromContract(network.contractAddress);
            if (detected) {
              this.contractToChain.set(network.contractAddress.toLowerCase(), detected);
            } else {
              // Use the network's blockchain if contract detection failed
              this.contractToChain.set(
                network.contractAddress.toLowerCase(),
                network.blockchain
              );
            }
          }
        }
      }
    }
  }

  /**
   * Get blockchain from contract address
   */
  getBlockchainFromContract(address: string): string | null {
    return this.contractToChain.get(address.toLowerCase()) || null;
  }

  /**
   * Get last scan time
   */
  getLastScanTime(): Date | null {
    return this.lastScanTime;
  }
}

