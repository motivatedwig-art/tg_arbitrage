import { Ticker, ArbitrageOpportunity } from '../../exchanges/types/index.js';
import { TokenMetadataService } from '../../services/TokenMetadataService.js';
import { ExchangeManager } from '../../exchanges/ExchangeManager.js';
import { getTokenBlockchain } from '../../services/TokenMetadataDatabase.js';
import { BlockchainAggregator } from '../../services/BlockchainAggregator.js';
import { CoinApiService } from '../../services/CoinApiService.js';
import { IconResolver } from '../../services/IconResolver.js';

export class ArbitrageCalculator {
  private minProfitThreshold: number;
  private maxProfitThreshold: number;
  private minVolumeThreshold: number;
  private tradingFees: Map<string, number> = new Map();
  private chainTransferCosts: Map<string, number> = new Map();
  private tokenMetadataService: TokenMetadataService;
  private exchangeManager: ExchangeManager;
  private blockchainAggregator: BlockchainAggregator | null = null;
  private excludedBlockchains: Set<string> = new Set([]); // DISABLED: Blockchain filtering disabled due to inaccurate blockchain detection
  private coinApiService = CoinApiService.getInstance();
  private iconResolver = IconResolver.getInstance();

  constructor(minProfitThreshold: number = 0.5, maxProfitThreshold: number = 50, minVolumeThreshold: number = 100) {
    this.minProfitThreshold = minProfitThreshold;
    this.maxProfitThreshold = maxProfitThreshold;
    this.minVolumeThreshold = minVolumeThreshold;
    this.tokenMetadataService = TokenMetadataService.getInstance();
    this.exchangeManager = ExchangeManager.getInstance();
    
    // Initialize blockchain aggregator (lazy load to avoid circular deps)
    try {
      this.blockchainAggregator = new BlockchainAggregator();
    } catch (error) {
      console.warn('⚠️ Could not initialize BlockchainAggregator, using fallback detection');
    }
    
    this.initializeTradingFees();
    this.initializeChainTransferCosts();
    
    console.log(`📊 Arbitrage Calculator initialized with:`);
    console.log(`   Min Profit: ${minProfitThreshold}%`);
    console.log(`   Max Profit: ${maxProfitThreshold}%`);
    console.log(`   Min Volume: $${minVolumeThreshold}`);
    console.log(`   ⚠️  Blockchain filtering: DISABLED (showing all opportunities)`);
  }

  private initializeTradingFees(): void {
    // Default trading fees for each exchange (maker fees)
    this.tradingFees.set('binance', 0.1); // 0.1%
    this.tradingFees.set('okx', 0.1); // 0.1%
    this.tradingFees.set('bybit', 0.1); // 0.1%
    this.tradingFees.set('mexc', 0.2); // 0.2%
    this.tradingFees.set('gateio', 0.2); // 0.2%
    this.tradingFees.set('kucoin', 0.1); // 0.1%
  }

  private initializeChainTransferCosts(): void {
    // Estimated transfer costs between different blockchains (in USD)
    // These are rough estimates and should be updated based on current gas fees
    this.chainTransferCosts.set('ethereum-to-bsc', 10); // ~$5-15 depending on gas
    this.chainTransferCosts.set('ethereum-to-polygon', 5); // ~$2-10
    this.chainTransferCosts.set('ethereum-to-arbitrum', 3); // ~$1-8
    this.chainTransferCosts.set('ethereum-to-optimism', 3); // ~$1-8
    this.chainTransferCosts.set('bsc-to-ethereum', 15); // Higher cost for BSC→ETH
    this.chainTransferCosts.set('bsc-to-polygon', 8); // ~$3-12
    this.chainTransferCosts.set('polygon-to-ethereum', 12); // ~$5-20
    this.chainTransferCosts.set('polygon-to-bsc', 6); // ~$2-10
    this.chainTransferCosts.set('same-chain', 0); // No transfer cost for same blockchain
  }

  public async calculateArbitrageOpportunities(allTickers: Map<string, Ticker[]>): Promise<ArbitrageOpportunity[]> {
    console.log(`📊 Calculating arbitrage for ${allTickers.size} exchanges`);
    
    // Log ticker counts per exchange
    let totalTickers = 0;
    for (const [exchange, tickers] of allTickers) {
      console.log(`   ${exchange}: ${tickers.length} tickers`);
      totalTickers += tickers.length;
    }
    console.log(`   Total tickers across all exchanges: ${totalTickers}`);
    
    // Log first ticker sample to verify if data is real
    const firstExchange = Array.from(allTickers.keys())[0];
    const firstTickers = allTickers.get(firstExchange);
    if (firstTickers && firstTickers.length > 0) {
      console.log('📈 First ticker sample:', firstTickers[0]);
    }
    
    // Add validation for mock data - NEVER allow mock data
    if (this.isMockData(allTickers)) {
      console.error('❌ MOCK DATA DETECTED - Returning empty opportunities');
      return [];
    }
    
    const opportunities: ArbitrageOpportunity[] = [];
    
    // Group tickers by symbol and filter for compatible chains only
    const symbolGroups = this.groupTickersBySymbol(allTickers);
    console.log(`🔍 Grouped into ${symbolGroups.size} unique symbols`);
    
    let symbolsProcessed = 0;
    let symbolsSkipped = 0;
    
    for (const [uniqueKey, tickers] of symbolGroups) {
      // Extract base symbol from unique key (format: SYMBOL|blockchain|contractAddress)
      const baseSymbol = uniqueKey.split('|')[0];
      
      // No pre-filtering - let the transfer availability check handle blockchain compatibility
      // This allows us to find more opportunities and only filter when we definitively know transfer won't work
      
      if (tickers.length < 2) {
        symbolsSkipped++;
        continue; // Skip if not enough tickers across exchanges
      }
      
      symbolsProcessed++;
      // Use the original symbol from first ticker for display purposes
      const displaySymbol = tickers[0].symbol;
      const symbolOpportunities = await this.findArbitrageForSymbol(displaySymbol, tickers);
      
      // Filter out opportunities on excluded blockchains AFTER they're calculated
      // Only filter if blockchain is EXPLICITLY set (not defaulted)
      const filteredOpportunities = symbolOpportunities.filter(opp => {
        // Only exclude if we have CONFIRMED blockchain info from ticker data
        const hasExplicitBlockchain = tickers.some(t => t.blockchain);
        if (hasExplicitBlockchain && opp.blockchain && this.excludedBlockchains.has(opp.blockchain.toLowerCase())) {
          console.log(`   ⛔ Filtered out ${opp.symbol} - on excluded blockchain: ${opp.blockchain.toUpperCase()}`);
          return false;
        }
        return true;
      });
      
      if (filteredOpportunities.length > 0) {
        // Extract contract/blockchain info for logging
        const contracts = [...new Set(tickers.map(t => t.contractAddress).filter(Boolean))];
        const chains = [...new Set(tickers.map(t => t.blockchain).filter(Boolean))];
        const contractInfo = contracts.length > 0 ? ` | contracts=${contracts.length}` : '';
        const chainInfo = chains.length > 0 ? ` | chains=${chains.join(',')}` : '';
        console.log(`   ✅ ${baseSymbol}: Found ${filteredOpportunities.length} opportunities across ${tickers.length} exchanges${chainInfo}${contractInfo}`);
      }
      
      opportunities.push(...filteredOpportunities);
    }
    
    console.log(`📋 Processed ${symbolsProcessed} symbols (${symbolsSkipped} skipped due to single exchange)`);
    console.log(`💎 Found ${opportunities.length} total opportunities before filtering`);

    // Filter opportunities by profit thresholds and add logging for unrealistic profits
    let unrealisticCount = 0;
    let lowProfitCount = 0;
    
    const filteredOpportunities = opportunities.filter(opp => {
      if (opp.profitPercentage > this.maxProfitThreshold) {
        unrealisticCount++;
        console.log(`🚨 Filtered out unrealistic opportunity: ${opp.symbol} - ${opp.profitPercentage.toFixed(2)}% profit (${opp.buyExchange} → ${opp.sellExchange})`);
        return false;
      }
      if (opp.profitPercentage < this.minProfitThreshold) {
        lowProfitCount++;
        return false;
      }
      return true;
    });
    
    console.log(`🔽 Filtering results:`);
    console.log(`   Unrealistic profit (>${this.maxProfitThreshold}%): ${unrealisticCount}`);
    console.log(`   Too low profit (<${this.minProfitThreshold}%): ${lowProfitCount}`);
    console.log(`   ✅ Final opportunities: ${filteredOpportunities.length}`);

    // Patch: Use CoinAPI only with base asset symbol (left of slash)
    // Group the filtered opportunities by base asset CoinAPI asset_id
    const enrichedResults: ArbitrageOpportunity[] = [];
    for (const opp of filteredOpportunities) {
      const baseAsset = opp.symbol.split('/')[0];
      const coinApiBuy = await this.coinApiService.getAssetMetadata(baseAsset);
      console.log(`[CoinAPI] Symbol: ${baseAsset}`, JSON.stringify(coinApiBuy));
      const logoUrlDefault = await this.iconResolver.resolveIcon(baseAsset);

      // Fetch all chain candidates for authenticity (contract-level) grouping
      const candidates = await this.iconResolver.resolveTokenInfo(baseAsset)
        .then(async (single) => {
          if (single) return [single];
          // Fallback to multi if single not returned (back-compat)
          try {
            const { DexScreenerService } = await import('../../services/DexScreenerService.js');
            return await DexScreenerService.getInstance().resolveAllBySymbol(baseAsset);
          } catch {
            return [] as any[];
          }
        });

      // Debug: log resolved contracts per symbol
      try {
        const debugList = (candidates || []).map(c => `${c?.chainId || 'unknown'}:${c?.tokenAddress || 'n/a'}`).join(', ');
        console.log(`[CHAIN_RESOLVE] ${baseAsset} -> [${debugList || 'none'}]`);
      } catch {}

      // If no candidates, emit a single opportunity with default icon
      if (!candidates || candidates.length === 0) {
        enrichedResults.push({ ...(opp as any), logoUrl: logoUrlDefault } as any);
        continue;
      }

      // Expand one opportunity per chain/contract candidate
      for (const c of candidates) {
        const logoUrl = c?.imageUrl || logoUrlDefault;
        // Map DS chainId to readable blockchain label (fallback to chainId)
        const chainLabel = this.mapDexChainIdToBlockchain(c?.chainId);
        const contractDisplay = c?.tokenAddress ? c.tokenAddress.substring(0, 10) + '...' : 'none';
        console.log(`[OPP_ENRICH] ${baseAsset} | chain=${c?.chainId || 'unknown'} | contract=${contractDisplay} | buy=${opp.buyExchange} | sell=${opp.sellExchange} | profit=${opp.profitPercentage.toFixed(2)}%`);
        enrichedResults.push({
          ...(opp as any),
          logoUrl,
          chainId: c?.chainId,
          tokenAddress: c?.tokenAddress,
          blockchain: chainLabel,
        } as any);
      }
    }
    return enrichedResults.sort((a, b) => b.profitPercentage - a.profitPercentage);
  }

  private mapDexChainIdToBlockchain(chainId?: string): string | undefined {
    if (!chainId) return undefined;
    const id = chainId.toLowerCase();
    switch (id) {
      case 'ethereum':
      case 'eth':
        return 'ethereum';
      case 'bsc':
      case 'bnb':
        return 'bsc';
      case 'polygon':
      case 'matic':
        return 'polygon';
      case 'arbitrum':
        return 'arbitrum';
      case 'optimism':
        return 'optimism';
      case 'base':
        return 'base';
      case 'solana':
      case 'sol':
        return 'solana';
      case 'avalanche':
      case 'avax':
        return 'avalanche';
      default:
        return id;
    }
  }

  private isMockData(allTickers: Map<string, Ticker[]>): boolean {
    // Check for common mock data patterns - be very specific
    let mockExchangeCount = 0;
    let totalExchanges = 0;
    
    for (const [exchange, tickers] of allTickers.entries()) {
      totalExchanges++;
      
      // Check if this exchange is using mock data
      const mockTickers = tickers.filter(ticker => 
        ticker.exchange.includes('mock') ||
        ticker.exchange.includes('test') ||
        // Only flag as mock if it's exactly these specific mock values
        ticker.bid === 100.0 || 
        ticker.bid === 1000.0 ||
        ticker.bid === 50.0 ||
        ticker.bid === 200.0
      );
      
      // If more than 80% of this exchange's tickers are mock, consider the exchange mock
      if (tickers.length > 0 && (mockTickers.length / tickers.length) > 0.8) {
        mockExchangeCount++;
      }
    }
    
    // Only consider it mock data if more than 70% of exchanges are using mock data
    const mockExchangePercentage = totalExchanges > 0 ? (mockExchangeCount / totalExchanges) : 0;
    return mockExchangePercentage > 0.7;
  }

  /**
   * Pre-filter tickers to only include those on compatible blockchains
   * This reduces processing by eliminating incompatible pairs early
   */
  private filterCompatibleTickers(tickers: Ticker[]): Ticker[] {
    const compatibleTickers: Ticker[] = [];
    const blockchainGroups = new Map<string, Ticker[]>();
    
    // Group tickers by blockchain
    for (const ticker of tickers) {
      const blockchain = ticker.blockchain || this.tokenMetadataService.getTokenBlockchain(ticker.symbol, ticker.exchange);
      
      if (!blockchain) {
        // If we can't determine blockchain, assume it's compatible with others
        compatibleTickers.push(ticker);
        continue;
      }
      
      if (!blockchainGroups.has(blockchain)) {
        blockchainGroups.set(blockchain, []);
      }
      blockchainGroups.get(blockchain)!.push(ticker);
    }
    
    // Only include tickers from compatible blockchain groups
    const compatibleChains = ['ethereum', 'bsc', 'polygon', 'arbitrum', 'optimism'];
    const incompatibleChains = ['solana'];
    
    for (const [blockchain, blockchainTickers] of blockchainGroups) {
      if (compatibleChains.includes(blockchain)) {
        // Include all tickers from compatible chains
        compatibleTickers.push(...blockchainTickers);
      } else if (incompatibleChains.includes(blockchain)) {
        // Only include tickers from the same incompatible chain
        if (blockchainTickers.length > 1) {
          compatibleTickers.push(...blockchainTickers);
        }
      }
    }
    
    return compatibleTickers;
  }

  /**
   * Create a unique key for a ticker based on symbol, blockchain, and contract address
   * This ensures we only compare tickers that represent the same asset
   */
  private createTickerKey(ticker: Ticker): string {
    const baseSymbol = ticker.symbol.split('/')[0].toUpperCase();
    const blockchain = ticker.blockchain?.toLowerCase() || 'unknown';
    const contractAddress = ticker.contractAddress?.toLowerCase() || '';
    
    // Create unique key: symbol|blockchain|contractAddress
    // If contract address exists, use it; otherwise use blockchain
    if (contractAddress) {
      return `${baseSymbol}|${blockchain}|${contractAddress}`;
    }
    // For native tokens or tokens without contract address, use symbol + blockchain
    return `${baseSymbol}|${blockchain}|native`;
  }

  private groupTickersBySymbol(allTickers: Map<string, Ticker[]>): Map<string, Ticker[]> {
    const symbolGroups = new Map<string, Ticker[]>();

    for (const tickers of allTickers.values()) {
      for (const ticker of tickers) {
        // Use unique key that includes blockchain and contract address
        const uniqueKey = this.createTickerKey(ticker);
        
        if (!symbolGroups.has(uniqueKey)) {
          symbolGroups.set(uniqueKey, []);
        }
        symbolGroups.get(uniqueKey)!.push(ticker);
      }
    }

    // Log contract ID information for debugging
    console.log(`📋 Grouped tickers by unique asset keys:`);
    for (const [key, tickers] of symbolGroups.entries()) {
      if (tickers.length > 1) {
        const [blockchain, contract] = key.split('|').slice(1);
        const contractDisplay = contract && contract !== 'native' ? contract.substring(0, 10) + '...' : 'native';
        console.log(`   ${key.split('|')[0]}: ${tickers.length} tickers | blockchain=${blockchain} | contract=${contractDisplay}`);
        // Log contract addresses for each ticker in this group
        tickers.forEach(t => {
          const contractInfo = t.contractAddress ? `contract=${t.contractAddress.substring(0, 10)}...` : 'no contract';
          const chainInfo = t.blockchain ? `chain=${t.blockchain}` : 'no chain';
          console.log(`      - ${t.exchange}: ${chainInfo} | ${contractInfo}`);
        });
      }
    }

    return symbolGroups;
  }

  private async findArbitrageForSymbol(symbol: string, tickers: Ticker[]): Promise<ArbitrageOpportunity[]> {
    const promises: Promise<ArbitrageOpportunity | null>[] = [];

    // Compare each exchange pair (tickers are already pre-filtered for compatibility)
    for (let i = 0; i < tickers.length; i++) {
      for (let j = i + 1; j < tickers.length; j++) {
        const ticker1 = tickers[i];
        const ticker2 = tickers[j];

        // Check arbitrage opportunity in both directions (batch promises for better performance)
        promises.push(this.calculateOpportunity(symbol, ticker1, ticker2));
        promises.push(this.calculateOpportunity(symbol, ticker2, ticker1));
      }
    }

    // Execute all checks in parallel
    const results = await Promise.all(promises);
    
    // Filter out null results
    return results.filter((opp): opp is ArbitrageOpportunity => opp !== null);
  }

  /**
   * Verify that two tickers represent the same asset (same contract or same native token on same chain)
   */
  private areSameAsset(ticker1: Ticker, ticker2: Ticker): boolean {
    const baseSymbol1 = ticker1.symbol.split('/')[0].toUpperCase();
    const baseSymbol2 = ticker2.symbol.split('/')[0].toUpperCase();
    
    // Symbols must match
    if (baseSymbol1 !== baseSymbol2) {
      return false;
    }

    const blockchain1 = ticker1.blockchain?.toLowerCase();
    const blockchain2 = ticker2.blockchain?.toLowerCase();
    const contract1 = ticker1.contractAddress?.toLowerCase();
    const contract2 = ticker2.contractAddress?.toLowerCase();

    // If both have contract addresses, they must match exactly
    if (contract1 && contract2) {
      if (contract1 !== contract2) {
        console.log(`   ⚠️ [CONTRACT_MISMATCH] ${baseSymbol1}: ${ticker1.exchange} (${contract1.substring(0, 10)}...) vs ${ticker2.exchange} (${contract2.substring(0, 10)}...) - Different contracts, skipping`);
        return false;
      }
      // Same contract address = same asset
      return true;
    }

    // If both have blockchain info, they must match
    if (blockchain1 && blockchain2) {
      if (blockchain1 !== blockchain2) {
        console.log(`   ⚠️ [BLOCKCHAIN_MISMATCH] ${baseSymbol1}: ${ticker1.exchange} (${blockchain1}) vs ${ticker2.exchange} (${blockchain2}) - Different blockchains, skipping`);
        return false;
      }
      // Same blockchain + symbol = likely same asset (if both native tokens or both have no contract)
      return true;
    }

    // If one has contract/blockchain and other doesn't, be conservative - assume different
    if ((blockchain1 || contract1) && !(blockchain2 || contract2)) {
      console.log(`   ⚠️ [INFO_MISMATCH] ${baseSymbol1}: ${ticker1.exchange} has blockchain info but ${ticker2.exchange} doesn't - skipping for safety`);
      return false;
    }
    if ((blockchain2 || contract2) && !(blockchain1 || contract1)) {
      console.log(`   ⚠️ [INFO_MISMATCH] ${baseSymbol2}: ${ticker2.exchange} has blockchain info but ${ticker1.exchange} doesn't - skipping for safety`);
      return false;
    }

    // Both lack blockchain/contract info - assume same if symbol matches (legacy behavior)
    // This is less safe but maintains backward compatibility
    console.log(`   ⚠️ [LEGACY_MATCH] ${baseSymbol1}: Both tickers lack contract/blockchain info - assuming same asset (less safe)`);
    return true;
  }

  private async calculateOpportunity(
    symbol: string, 
    buyTicker: Ticker, 
    sellTicker: Ticker
  ): Promise<ArbitrageOpportunity | null> {
    // CRITICAL: Verify buy and sell are the same asset before calculating opportunity
    if (!this.areSameAsset(buyTicker, sellTicker)) {
      return null;
    }

    const buyPrice = buyTicker.ask; // Price to buy (ask price)
    const sellPrice = sellTicker.bid; // Price to sell (bid price)

    if (buyPrice >= sellPrice) return null; // No arbitrage opportunity

    // Extract currency from symbol (e.g., "BTC/USDT" -> "BTC")
    const currency = symbol.split('/')[0];

    // Log contract IDs for this opportunity
    const buyContract = buyTicker.contractAddress ? buyTicker.contractAddress.substring(0, 10) + '...' : 'native/no-contract';
    const sellContract = sellTicker.contractAddress ? sellTicker.contractAddress.substring(0, 10) + '...' : 'native/no-contract';
    const buyChain = buyTicker.blockchain || 'unknown';
    const sellChain = sellTicker.blockchain || 'unknown';
    console.log(`   ✅ [OPP] ${symbol}: ${buyTicker.exchange} (${buyChain}, ${buyContract}) → ${sellTicker.exchange} (${sellChain}, ${sellContract})`);

    // TRANSFER CHECK DISABLED - Finding all opportunities regardless of network compatibility
    // This allows us to identify ALL price discrepancies
    // User should manually verify transfer paths before trading
    
    // Previous transfer check logic commented out for reference:
    // const transferInfo = await this.exchangeManager.checkTransferAvailability(
    //   currency,
    //   buyTicker.exchange,
    //   sellTicker.exchange
    // );
    // if (bothDefinitelyNotAvailable || noCommonNetworks) {
    //   console.log(`⚠️ Skipping ${symbol}: No common transfer networks`);
    //   return null;
    // }

    // Calculate fees
    const buyFee = this.tradingFees.get(buyTicker.exchange.toLowerCase()) || 0.1;
    const sellFee = this.tradingFees.get(sellTicker.exchange.toLowerCase()) || 0.1;

    // Calculate transfer costs between blockchains
    const transferCost = this.calculateTransferCost(buyTicker.blockchain, sellTicker.blockchain);

    // Calculate net prices after fees and transfer costs
    const netBuyPrice = buyPrice * (1 + buyFee / 100);
    const netSellPrice = sellPrice * (1 - sellFee / 100);

    // Adjust sell price by transfer cost per unit
    const adjustedSellPrice = netSellPrice - transferCost;

    if (netBuyPrice >= adjustedSellPrice) return null; // No profit after fees and transfer costs

    // Calculate profit
    const profitAmount = adjustedSellPrice - netBuyPrice;
    const profitPercentage = (profitAmount / netBuyPrice) * 100;

    // Use minimum volume between exchanges and apply volume filtering
    const volume = Math.min(buyTicker.volume || 0, sellTicker.volume || 0);
    
    // Apply volume filtering - skip opportunities with insufficient volume
    if (volume < this.minVolumeThreshold) {
      return null;
    }

    return {
      symbol: symbol,
      buyExchange: buyTicker.exchange,
      sellExchange: sellTicker.exchange,
      buyPrice: buyPrice,
      sellPrice: sellPrice,
      profitPercentage: profitPercentage,
      profitAmount: profitAmount,
      volume: volume,
      volume_24h: buyTicker.volume_24h || sellTicker.volume_24h || volume,
      timestamp: Math.max(buyTicker.timestamp, sellTicker.timestamp),
      blockchain: await this.determineBlockchain(buyTicker, sellTicker),
      fees: {
        buyFee: buyFee,
        sellFee: sellFee,
        transferCost: transferCost
      },
      transferAvailability: {
        buyAvailable: undefined,  // Transfer check disabled
        sellAvailable: undefined,  // Transfer check disabled
        commonNetworks: []  // Transfer check disabled
      }
    };
  }

  public setMinProfitThreshold(threshold: number): void {
    this.minProfitThreshold = threshold;
  }

  public getMinProfitThreshold(): number {
    return this.minProfitThreshold;
  }

  public setMaxProfitThreshold(threshold: number): void {
    this.maxProfitThreshold = threshold;
  }

  public getMaxProfitThreshold(): number {
    return this.maxProfitThreshold;
  }

  public updateTradingFee(exchange: string, fee: number): void {
    this.tradingFees.set(exchange.toLowerCase(), fee);
  }

  public getTradingFee(exchange: string): number {
    return this.tradingFees.get(exchange.toLowerCase()) || 0.1;
  }

  // Calculate potential profit for a given investment amount
  public calculatePotentialProfit(opportunity: ArbitrageOpportunity, investmentAmount: number): number {
    return (opportunity.profitPercentage / 100) * investmentAmount;
  }

  // Validate if an opportunity is still valid (not too old)
  public isOpportunityValid(opportunity: ArbitrageOpportunity, maxAgeMs: number = 60000): boolean {
    return (Date.now() - opportunity.timestamp) <= maxAgeMs;
  }

  private calculateTransferCost(buyChain?: string, sellChain?: string): number {
    if (!buyChain || !sellChain) {
      return 0; // No blockchain info available or assume same chain
    }

    if (buyChain === sellChain) {
      return this.chainTransferCosts.get('same-chain') || 0;
    }

    // Create transfer cost key
    const transferKey = `${buyChain}-to-${sellChain}`;
    return this.chainTransferCosts.get(transferKey) || 5; // Default $5 cost for unknown transfers
  }

  public setMinVolumeThreshold(threshold: number): void {
    this.minVolumeThreshold = threshold;
  }

  public getMinVolumeThreshold(): number {
    return this.minVolumeThreshold;
  }

  public updateTransferCost(fromChain: string, toChain: string, cost: number): void {
    this.chainTransferCosts.set(`${fromChain}-to-${toChain}`, cost);
  }

  public getOpportunitiesByVolume(minVolume: number): ArbitrageOpportunity[] {
    // This would need to be implemented with database integration
    // For now, this is a placeholder for volume-based filtering
    return [];
  }

  /**
   * Determine the primary blockchain for an arbitrage opportunity
   * Uses comprehensive token database for accurate blockchain detection
   */
  private async determineBlockchain(buyTicker: Ticker, sellTicker: Ticker): Promise<string> {
    // If both tickers have blockchain info and they match, use that
    if (buyTicker.blockchain && sellTicker.blockchain && buyTicker.blockchain === sellTicker.blockchain) {
      return buyTicker.blockchain;
    }

    // If only one has blockchain info, use that
    if (buyTicker.blockchain) return buyTicker.blockchain;
    if (sellTicker.blockchain) return sellTicker.blockchain;

    // Try blockchain aggregator first (most accurate)
    const symbol = buyTicker.symbol || sellTicker.symbol || '';
    if (this.blockchainAggregator) {
      try {
        const blockchain = await this.blockchainAggregator.getBlockchainForToken(symbol);
        if (blockchain) {
          return blockchain;
        }
      } catch (error) {
        // Fall through to static database
      }
    }

    // Use comprehensive token database (Jacob)
    const blockchainFromDb = getTokenBlockchain(symbol);
    
    if (blockchainFromDb) {
      return blockchainFromDb;
    }

    // Fallback: Enhanced pattern-based detection
    const cleanSymbol = symbol
      .replace(/[\/\-_]/g, '')
      .replace(/USDT$|USDC$|BTC$|ETH$|BNB$|USD$|EUR$/i, '')
      .toUpperCase();
    
    // Native chain tokens (exact match first)
    if (cleanSymbol === 'SOL' || cleanSymbol.includes('WSOL')) return 'solana';
    if (cleanSymbol === 'TRX' || cleanSymbol.includes('TRON')) return 'tron';
    if (cleanSymbol === 'BNB' || cleanSymbol.includes('WBNB')) return 'bsc';
    if (cleanSymbol === 'MATIC' || cleanSymbol.includes('WMATIC')) return 'polygon';
    if (cleanSymbol === 'ARB' || (cleanSymbol.includes('ARB') && !cleanSymbol.includes('BARB'))) return 'arbitrum';
    if (cleanSymbol === 'OP' || (cleanSymbol.includes('OP') && cleanSymbol.length <= 8)) return 'optimism';
    if (cleanSymbol === 'AVAX' || cleanSymbol.includes('WAVAX')) return 'avalanche';
    if (cleanSymbol === 'TON') return 'ton';
    if (cleanSymbol === 'APT') return 'aptos';
    if (cleanSymbol === 'SUI') return 'sui';
    if (cleanSymbol === 'NEAR') return 'near';
    if (cleanSymbol === 'ATOM') return 'cosmos';
    if (cleanSymbol === 'DOT') return 'polkadot';
    if (cleanSymbol === 'ADA') return 'cardano';
    if (cleanSymbol === 'BTC') return 'bitcoin';
    if (cleanSymbol === 'XRP') return 'ripple';
    if (cleanSymbol === 'XLM') return 'stellar';
    if (cleanSymbol === 'DOGE') return 'dogecoin';
    if (cleanSymbol === 'LTC') return 'litecoin';
    
    // Wrapped tokens
    if (cleanSymbol.startsWith('W') && cleanSymbol.length > 4) {
      const unwrapped = cleanSymbol.substring(1);
      if (unwrapped === 'BTC' || unwrapped === 'ETH') return 'ethereum';
      if (unwrapped === 'SOL') return 'solana';
      if (unwrapped === 'BNB') return 'bsc';
      if (unwrapped === 'MATIC') return 'polygon';
    }

    // Log unknown tokens for future analysis instead of silently defaulting
    if (process.env.NODE_ENV === 'development') {
      console.log(`⚠️ Unknown blockchain for ${symbol}, defaulting to Ethereum`);
    }
    
    // Default to ethereum for unknown ERC-20 tokens
    return 'ethereum';
  }
}