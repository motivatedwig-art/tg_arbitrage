/**
 * Service to identify blockchain networks and contract addresses for tokens
 * This helps prevent cross-chain arbitrage comparisons
 */

import { CoinApiService } from './CoinApiService.js';

export interface TokenMetadata {
  symbol: string;
  blockchain: string;
  contractAddress?: string;
  isNative?: boolean; // For native tokens like ETH, SOL, BNB
}

export class TokenMetadataService {
  private static instance: TokenMetadataService;
  private tokenMetadataCache: Map<string, TokenMetadata[]> = new Map();
  private exchangeBlockchainMap: Map<string, string[]> = new Map();

  private coinApiService = CoinApiService.getInstance();

  private constructor() {
    this.initializeExchangeBlockchainMap();
    this.initializeCommonTokenMetadata();
  }

  public static getInstance(): TokenMetadataService {
    if (!TokenMetadataService.instance) {
      TokenMetadataService.instance = new TokenMetadataService();
    }
    return TokenMetadataService.instance;
  }

  /**
   * Map exchanges to their supported blockchains
   */
  private initializeExchangeBlockchainMap(): void {
    // Most exchanges support multiple blockchains, but we'll be more conservative
    // Only filter out obvious cross-chain issues (like Ethereum vs Solana)
    this.exchangeBlockchainMap.set('binance', ['ethereum', 'bsc', 'polygon', 'arbitrum', 'optimism']);
    this.exchangeBlockchainMap.set('okx', ['ethereum', 'bsc', 'polygon', 'arbitrum', 'optimism', 'solana']);
    this.exchangeBlockchainMap.set('bybit', ['ethereum', 'bsc', 'polygon', 'arbitrum', 'optimism']);
    this.exchangeBlockchainMap.set('mexc', ['ethereum', 'bsc', 'polygon', 'arbitrum', 'optimism', 'solana']);
    this.exchangeBlockchainMap.set('gateio', ['ethereum', 'bsc', 'polygon', 'arbitrum', 'optimism', 'solana']);
    this.exchangeBlockchainMap.set('kucoin', ['ethereum', 'bsc', 'polygon', 'arbitrum', 'optimism', 'solana']);
  }

  /**
   * Initialize common token metadata for known cross-chain tokens
   */
  private initializeCommonTokenMetadata(): void {
    // TROLL token on different chains
    this.addTokenMetadata('TROLL', [
      { symbol: 'TROLL', blockchain: 'ethereum', contractAddress: '0xf8ebf4849F1Fa4FaF0DFF2106A173D3A6CB2eB3A' },
      { symbol: 'TROLL', blockchain: 'solana', contractAddress: '5UUH9RTDiSpq6HKS6bp4NdU9PNJpXRXuiw6ShBTBhgH2' }
    ]);

    // USDT on different chains
    this.addTokenMetadata('USDT', [
      { symbol: 'USDT', blockchain: 'ethereum', contractAddress: '0xdAC17F958D2ee523a2206206994597C13D831ec7' },
      { symbol: 'USDT', blockchain: 'bsc', contractAddress: '0x55d398326f99059fF775485246999027B3197955' },
      { symbol: 'USDT', blockchain: 'polygon', contractAddress: '0xc2132D05D31c914a87C6611C10748AEb04B58e8F' },
      { symbol: 'USDT', blockchain: 'solana', contractAddress: 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB' }
    ]);

    // USDC on different chains
    this.addTokenMetadata('USDC', [
      { symbol: 'USDC', blockchain: 'ethereum', contractAddress: '0xA0b86a33E6441b8C4C8C0E4A8b4b4b4b4b4b4b4b' },
      { symbol: 'USDC', blockchain: 'bsc', contractAddress: '0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d' },
      { symbol: 'USDC', blockchain: 'polygon', contractAddress: '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174' },
      { symbol: 'USDC', blockchain: 'solana', contractAddress: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v' }
    ]);

    // WETH on different chains
    this.addTokenMetadata('WETH', [
      { symbol: 'WETH', blockchain: 'ethereum', contractAddress: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2' },
      { symbol: 'WETH', blockchain: 'arbitrum', contractAddress: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1' },
      { symbol: 'WETH', blockchain: 'optimism', contractAddress: '0x4200000000000000000000000000000000000006' }
    ]);
  }

  private addTokenMetadata(symbol: string, metadata: TokenMetadata[]): void {
    this.tokenMetadataCache.set(symbol.toUpperCase(), metadata);
  }
  
  /**
   * Helper to add single-chain tokens
   */
  private addSingleChainToken(symbol: string, blockchain: string): void {
    this.addTokenMetadata(symbol, [{ symbol, blockchain }]);
  }

  /**
   * Get blockchain information for a token on a specific exchange
   */
  public getTokenBlockchain(symbol: string, exchange: string): string | null {
    const cleanSymbol = this.extractBaseSymbol(symbol);
    const exchangeBlockchains = this.exchangeBlockchainMap.get(exchange.toLowerCase());
    
    if (!exchangeBlockchains) {
      return null;
    }

    const tokenMetadata = this.tokenMetadataCache.get(cleanSymbol);
    if (!tokenMetadata) {
      // For unknown tokens, return null to avoid false filtering
      return null;
    }

    // Find the first matching blockchain for this exchange
    for (const metadata of tokenMetadata) {
      if (exchangeBlockchains.includes(metadata.blockchain)) {
        return metadata.blockchain;
      }
    }

    return null; // Don't assume blockchain for unknown tokens
  }

  /**
   * Get contract address for a token on a specific blockchain
   */
  public getTokenContractAddress(symbol: string, blockchain: string): string | null {
    const cleanSymbol = this.extractBaseSymbol(symbol);
    const tokenMetadata = this.tokenMetadataCache.get(cleanSymbol);
    
    if (!tokenMetadata) {
      return null;
    }

    const metadata = tokenMetadata.find(m => m.blockchain === blockchain);
    return metadata?.contractAddress || null;
  }

  /**
   * Check if two tokens are on the same blockchain
   * OPTIMIZED: Only block obvious incompatibilities (Solana vs non-Solana)
   */
  public areTokensOnSameBlockchain(symbol1: string, exchange1: string, symbol2: string, exchange2: string): boolean {
    const blockchain1 = this.getTokenBlockchain(symbol1, exchange1);
    const blockchain2 = this.getTokenBlockchain(symbol2, exchange2);

    // If we can't determine blockchain for either token, assume they're comparable
    if (!blockchain1 || !blockchain2) {
      return true;
    }

    // Only block Solana vs non-Solana comparisons
    const incompatibleChains = ['solana'];
    
    if (incompatibleChains.includes(blockchain1) || incompatibleChains.includes(blockchain2)) {
      return blockchain1 === blockchain2;
    }

    // Allow all other comparisons (Ethereum, BSC, Polygon, etc.)
    return true;
  }

  /**
   * Extract base symbol from trading pair (e.g., "BTC/USDT" -> "BTC")
   */
  private extractBaseSymbol(symbol: string): string {
    // Remove common separators and quote currencies
    const cleanSymbol = symbol
      .replace(/[\/\-_]/g, '')
      .replace(/USDT$|USDC$|BTC$|ETH$|BNB$/, '')
      .toUpperCase();
    
    return cleanSymbol;
  }


  /**
   * Get all known metadata for a token
   */
  public getTokenMetadata(symbol: string): TokenMetadata[] | null {
    const cleanSymbol = this.extractBaseSymbol(symbol);
    return this.tokenMetadataCache.get(cleanSymbol) || null;
  }

  /**
   * Check if a token is known to exist on multiple blockchains
   */
  public isMultiChainToken(symbol: string): boolean {
    const cleanSymbol = this.extractBaseSymbol(symbol);
    const metadata = this.tokenMetadataCache.get(cleanSymbol);
    return metadata ? metadata.length > 1 : false;
  }

  /**
   * Extended: Try to get coin metadata from CoinAPI if not found in cache.
   * Will cache CoinAPI result for future requests.
   */
  public async getTokenMetadataWithCoinApi(symbol: string): Promise<TokenMetadata[] | null> {
    // Check local cache first
    const cached = this.getTokenMetadata(symbol);
    if (cached && cached.length > 0) return cached;

    // Not found in internal cache, try CoinAPI
    const coinApiMeta = await this.coinApiService.getAssetMetadata(symbol);
    if (!coinApiMeta) return null;
    if (!coinApiMeta.asset_id) return null;

    // Form TokenMetadata object (for EVM tokens, grab contract address from .platform)
    const meta: TokenMetadata = {
      symbol: coinApiMeta.asset_id,
      blockchain: coinApiMeta.platform?.symbol ? coinApiMeta.platform.symbol.toLowerCase() : 'unknown',
      contractAddress: coinApiMeta.platform?.token_address,
      isNative: !(coinApiMeta.platform?.token_address),
    };
    // Enrich our cache for future use
    this.addTokenMetadata(meta.symbol, [meta]);
    return [meta];
  }
}
