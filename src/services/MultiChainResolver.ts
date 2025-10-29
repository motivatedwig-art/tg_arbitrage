/**
 * Multi-Chain Token Resolver
 * Resolves tokens that exist on multiple blockchains and determines primary chain
 */

import { ExchangeNetworkInfo, NetworkInfo } from './BlockchainScanner.js';
import { BLOCKCHAIN_CONFIG } from '../config/blockchain.config.js';

export interface MultiChainToken {
  symbol: string;
  primaryChain: string;
  availableChains: {
    blockchain: string;
    contractAddress?: string;
    isNative: boolean;
    isWrapped: boolean;
    liquidity: number;  // Relative liquidity score (0-100)
    exchanges: string[]; // Which exchanges support this chain
    depositEnabled: boolean;
    withdrawEnabled: boolean;
  }[];
  confidence: number; // 0-100
}

export class MultiChainResolver {
  /**
   * Resolve token chains from exchange data
   */
  async resolveTokenChains(
    symbol: string,
    exchangeData: ExchangeNetworkInfo[]
  ): Promise<MultiChainToken> {
    if (exchangeData.length === 0) {
      // No data available, use known tokens or default
      return this.getDefaultResolve(symbol);
    }

    // Check if it's a known token with predefined config
    const upperSymbol = symbol.toUpperCase();
    if (BLOCKCHAIN_CONFIG.knownTokens[upperSymbol]) {
      const known = BLOCKCHAIN_CONFIG.knownTokens[upperSymbol];
      return {
        symbol,
        primaryChain: known.primary,
        availableChains: known.supported.map(chain => ({
          blockchain: chain,
          isNative: chain === known.primary,
          isWrapped: false,
          liquidity: chain === known.primary ? 100 : 50,
          exchanges: [],
          depositEnabled: true,
          withdrawEnabled: true
        })),
        confidence: 100 // Known tokens have high confidence
      };
    }

    // Aggregate chains from all exchanges
    const availableChains = this.consolidateChains(symbol, exchangeData);
    
    // Determine primary chain
    const primaryChain = this.determinePrimaryChain(symbol, exchangeData, availableChains);

    // Calculate confidence
    const confidence = this.calculateConfidence(exchangeData, availableChains);

    return {
      symbol,
      primaryChain,
      availableChains,
      confidence
    };
  }

  /**
   * Consolidate chain information from multiple exchanges
   */
  private consolidateChains(
    symbol: string,
    exchangeData: ExchangeNetworkInfo[]
  ): MultiChainToken['availableChains'] {
    const chainMap = new Map<string, {
      blockchain: string;
      contractAddress?: string;
      isNative: boolean;
      isWrapped: boolean;
      liquidity: number;
      exchanges: string[];
      depositEnabled: boolean;
      withdrawEnabled: boolean;
    }>();

    for (const exchangeInfo of exchangeData) {
      for (const network of exchangeInfo.networks) {
        const blockchain = network.blockchain;
        
        if (!chainMap.has(blockchain)) {
          chainMap.set(blockchain, {
            blockchain,
            contractAddress: network.contractAddress,
            isNative: this.isNativeToken(symbol, blockchain),
            isWrapped: this.isWrappedToken(symbol, blockchain),
            liquidity: 0,
            exchanges: [],
            depositEnabled: network.depositEnabled,
            withdrawEnabled: network.withdrawEnabled
          });
        }

        const chainInfo = chainMap.get(blockchain)!;
        
        // Add exchange to list
        if (!chainInfo.exchanges.includes(exchangeInfo.exchange)) {
          chainInfo.exchanges.push(exchangeInfo.exchange);
        }

        // Update enabled status (true if ANY exchange enables it)
        if (network.depositEnabled) chainInfo.depositEnabled = true;
        if (network.withdrawEnabled) chainInfo.withdrawEnabled = true;

        // Update contract address if not set
        if (!chainInfo.contractAddress && network.contractAddress) {
          chainInfo.contractAddress = network.contractAddress;
        }
      }
    }

    // Calculate liquidity scores
    for (const chainInfo of chainMap.values()) {
      chainInfo.liquidity = this.calculateLiquidityScore(chainInfo, exchangeData);
    }

    return Array.from(chainMap.values());
  }

  /**
   * Determine primary blockchain based on multiple factors
   */
  private determinePrimaryChain(
    symbol: string,
    exchangeData: ExchangeNetworkInfo[],
    availableChains: MultiChainToken['availableChains']
  ): string {
    // Check known tokens first
    const upperSymbol = symbol.toUpperCase();
    if (BLOCKCHAIN_CONFIG.knownTokens[upperSymbol]) {
      return BLOCKCHAIN_CONFIG.knownTokens[upperSymbol].primary;
    }

    // Score each chain
    const scores = new Map<string, number>();

    for (const chain of availableChains) {
      let score = 0;

      // Native tokens get highest priority
      if (chain.isNative) {
        score += 100;
      }

      // Number of exchanges supporting this chain
      score += chain.exchanges.length * 20;

      // Liquidity score
      score += chain.liquidity * 0.3;

      // Both deposit and withdraw enabled
      if (chain.depositEnabled && chain.withdrawEnabled) {
        score += 30;
      }

      // Lower fees indicate more active network
      // (this would need fee data from networks)

      scores.set(chain.blockchain, score);
    }

    // Add priority bonus from config
    BLOCKCHAIN_CONFIG.chainPriority.forEach((chain, index) => {
      if (scores.has(chain)) {
        const bonus = BLOCKCHAIN_CONFIG.chainPriority.length - index;
        scores.set(chain, (scores.get(chain) || 0) + bonus);
      }
    });

    // Return highest scoring chain
    const sorted = Array.from(scores.entries()).sort((a, b) => b[1] - a[1]);
    return sorted.length > 0 ? sorted[0][0] : 'ethereum';
  }

  /**
   * Check if token is native to a blockchain
   */
  private isNativeToken(symbol: string, blockchain: string): boolean {
    const upperSymbol = symbol.replace(/[\/\-_]/g, '').toUpperCase();
    
    const nativeTokens: { [key: string]: string } = {
      'BTC': 'bitcoin',
      'ETH': 'ethereum',
      'BNB': 'bsc',
      'SOL': 'solana',
      'TRX': 'tron',
      'MATIC': 'polygon',
      'AVAX': 'avalanche',
      'ARB': 'arbitrum',
      'OP': 'optimism',
      'FTM': 'fantom',
      'TON': 'ton',
      'APT': 'aptos',
      'SUI': 'sui',
      'NEAR': 'near',
      'ATOM': 'cosmos',
      'DOT': 'polkadot',
      'ADA': 'cardano',
    };

    return nativeTokens[upperSymbol] === blockchain;
  }

  /**
   * Check if token is wrapped
   */
  private isWrappedToken(symbol: string, blockchain: string): boolean {
    const upperSymbol = symbol.replace(/[\/\-_EPS]/g, '').toUpperCase();
    
    // Wrapped tokens typically start with W
    if (upperSymbol.startsWith('W')) {
      // Check if it's wrapping a native token of a different chain
      const unwrapped = upperSymbol.substring(1);
      const nativeChain = this.getNativeChainForSymbol(unwrapped);
      return nativeChain !== null && nativeChain !== blockchain;
    }

    return false;
  }

  /**
   * Get native blockchain for a symbol
   */
  private getNativeChainForSymbol(symbol: string): string | null {
    const upperSymbol = symbol.toUpperCase();
    
    const nativeMap: { [key: string]: string } = {
      'BTC': 'bitcoin',
      'ETH': 'ethereum',
      'BNB': 'bsc',
      'SOL': 'solana',
      'TRX': 'tron',
      'MATIC': 'polygon',
      'AVAX': 'avalanche',
      'ARB': 'arbitrum',
      'OP': 'optimism',
    };

    return nativeMap[upperSymbol] || null;
  }

  /**
   * Calculate liquidity score based on exchange support
   */
  private calculateLiquidityScore(
    chain: MultiChainToken['availableChains'][0],
    exchangeData: ExchangeNetworkInfo[]
  ): number {
    // More exchanges = higher liquidity (rough estimate)
    const exchangeScore = chain.exchanges.length * 20;
    
    // Native tokens typically have higher liquidity
    const nativeBonus = chain.isNative ? 30 : 0;
    
    // Both deposit/withdraw enabled indicates active network
    const activityBonus = (chain.depositEnabled && chain.withdrawEnabled) ? 20 : 0;

    return Math.min(exchangeScore + nativeBonus + activityBonus, 100);
  }

  /**
   * Calculate confidence score
   */
  private calculateConfidence(
    exchangeData: ExchangeNetworkInfo[],
    availableChains: MultiChainToken['availableChains']
  ): number {
    let score = 0;

    // More exchanges agreeing increases confidence
    score += Math.min(exchangeData.length * 15, 60);

    // More chains found (not necessarily higher confidence, but data is available)
    score += Math.min(availableChains.length * 5, 20);

    // High exchange confidence scores
    const avgExchangeConfidence = exchangeData.reduce((sum, e) => sum + e.confidence, 0) / exchangeData.length;
    score += avgExchangeConfidence * 0.2;

    return Math.min(score, 100);
  }

  /**
   * Get default resolution when no data available
   */
  private getDefaultResolve(symbol: string): MultiChainToken {
    const upperSymbol = symbol.toUpperCase();
    
    // Try known tokens
    if (BLOCKCHAIN_CONFIG.knownTokens[upperSymbol]) {
      const known = BLOCKCHAIN_CONFIG.knownTokens[upperSymbol];
      return {
        symbol,
        primaryChain: known.primary,
        availableChains: known.supported.map(chain => ({
          blockchain: chain,
          isNative: chain === known.primary,
          isWrapped: false,
          liquidity: 50,
          exchanges: [],
          depositEnabled: true,
          withdrawEnabled: true
        })),
        confidence: 80 // Known but no exchange data
      };
    }

    // Default to Ethereum with low confidence
    return {
      symbol,
      primaryChain: 'ethereum',
      availableChains: [{
        blockchain: 'ethereum',
        isNative: false,
        isWrapped: false,
        liquidity: 0,
        exchanges: [],
        depositEnabled: false,
        withdrawEnabled: false
      }],
      confidence: 30 // Low confidence default
    };
  }
}

