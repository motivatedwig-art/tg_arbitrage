import { Ticker, ArbitrageOpportunity } from '../../exchanges/types/index.js';
import { TokenMetadataService } from '../../services/TokenMetadataService.js';

export class ArbitrageCalculator {
  private minProfitThreshold: number;
  private maxProfitThreshold: number;
  private minVolumeThreshold: number;
  private tradingFees: Map<string, number> = new Map();
  private chainTransferCosts: Map<string, number> = new Map();
  private tokenMetadataService: TokenMetadataService;

  constructor(minProfitThreshold: number = 0.5, maxProfitThreshold: number = 50, minVolumeThreshold: number = 1000) {
    this.minProfitThreshold = minProfitThreshold;
    this.maxProfitThreshold = maxProfitThreshold;
    this.minVolumeThreshold = minVolumeThreshold;
    this.tokenMetadataService = TokenMetadataService.getInstance();
    this.initializeTradingFees();
    this.initializeChainTransferCosts();
  }

  private initializeTradingFees(): void {
    // Default trading fees for each exchange (maker fees)
    this.tradingFees.set('binance', 0.1); // 0.1%
    this.tradingFees.set('okx', 0.1); // 0.1%
    this.tradingFees.set('bybit', 0.1); // 0.1%
    this.tradingFees.set('bitget', 0.1); // 0.1%
    this.tradingFees.set('mexc', 0.2); // 0.2%
    this.tradingFees.set('bingx', 0.1); // 0.1%
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

  public calculateArbitrageOpportunities(allTickers: Map<string, Ticker[]>): ArbitrageOpportunity[] {
    console.log(`Calculating arbitrage for ${allTickers.size} exchanges`);
    
    // Log first ticker sample to verify if data is real
    const firstExchange = Array.from(allTickers.keys())[0];
    const firstTickers = allTickers.get(firstExchange);
    if (firstTickers && firstTickers.length > 0) {
      console.log('First ticker sample:', firstTickers[0]);
    }
    
    // Add validation for mock data
    if (this.isMockData(allTickers)) {
      console.warn('WARNING: Mock data detected in arbitrage calculation');
    }
    
    const opportunities: ArbitrageOpportunity[] = [];
    
    // Group tickers by symbol and filter for compatible chains only
    const symbolGroups = this.groupTickersBySymbol(allTickers);
    
    for (const [symbol, tickers] of symbolGroups) {
      // Pre-filter tickers to only include compatible chain pairs
      const compatibleTickers = this.filterCompatibleTickers(tickers);
      
      if (compatibleTickers.length < 2) {
        continue; // Skip if not enough compatible tickers
      }
      
      const symbolOpportunities = this.findArbitrageForSymbol(symbol, compatibleTickers);
      opportunities.push(...symbolOpportunities);
    }

    // Filter opportunities by profit thresholds and add logging for unrealistic profits
    const filteredOpportunities = opportunities.filter(opp => {
      if (opp.profitPercentage > this.maxProfitThreshold) {
        console.log(`🚨 Filtered out unrealistic opportunity: ${opp.symbol} - ${opp.profitPercentage.toFixed(2)}% profit (${opp.buyExchange} → ${opp.sellExchange})`);
        return false;
      }
      return opp.profitPercentage >= this.minProfitThreshold;
    });

    // Sort by profit percentage (highest first)
    return filteredOpportunities.sort((a, b) => b.profitPercentage - a.profitPercentage);
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

  private groupTickersBySymbol(allTickers: Map<string, Ticker[]>): Map<string, Ticker[]> {
    const symbolGroups = new Map<string, Ticker[]>();

    for (const tickers of allTickers.values()) {
      for (const ticker of tickers) {
        if (!symbolGroups.has(ticker.symbol)) {
          symbolGroups.set(ticker.symbol, []);
        }
        symbolGroups.get(ticker.symbol)!.push(ticker);
      }
    }

    return symbolGroups;
  }

  private findArbitrageForSymbol(symbol: string, tickers: Ticker[]): ArbitrageOpportunity[] {
    const opportunities: ArbitrageOpportunity[] = [];

    // Compare each exchange pair (tickers are already pre-filtered for compatibility)
    for (let i = 0; i < tickers.length; i++) {
      for (let j = i + 1; j < tickers.length; j++) {
        const ticker1 = tickers[i];
        const ticker2 = tickers[j];

        // Check arbitrage opportunity in both directions
        const opp1 = this.calculateOpportunity(symbol, ticker1, ticker2);
        const opp2 = this.calculateOpportunity(symbol, ticker2, ticker1);

        if (opp1) opportunities.push(opp1);
        if (opp2) opportunities.push(opp2);
      }
    }

    return opportunities;
  }

  private calculateOpportunity(
    symbol: string, 
    buyTicker: Ticker, 
    sellTicker: Ticker
  ): ArbitrageOpportunity | null {
    const buyPrice = buyTicker.ask; // Price to buy (ask price)
    const sellPrice = sellTicker.bid; // Price to sell (bid price)

    if (buyPrice >= sellPrice) return null; // No arbitrage opportunity

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
      fees: {
        buyFee: buyFee,
        sellFee: sellFee,
        transferCost: transferCost
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
}