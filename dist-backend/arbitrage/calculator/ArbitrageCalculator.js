import { TokenMetadataService } from '../../services/TokenMetadataService.js';
export class ArbitrageCalculator {
    constructor(minProfitThreshold = 0.5, maxProfitThreshold = 110) {
        this.tradingFees = new Map();
        this.minProfitThreshold = minProfitThreshold;
        this.maxProfitThreshold = maxProfitThreshold;
        this.tokenMetadataService = TokenMetadataService.getInstance();
        this.initializeTradingFees();
    }
    initializeTradingFees() {
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
    calculateArbitrageOpportunities(allTickers) {
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
        const opportunities = [];
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
    isMockData(allTickers) {
        // Check for common mock data patterns
        for (const tickers of allTickers.values()) {
            const suspiciousPrices = tickers.filter(ticker => ticker.bid === 100 ||
                ticker.bid === 1000 ||
                ticker.exchange.includes('mock') ||
                ticker.exchange.includes('test') ||
                (ticker.bid >= 100 && ticker.bid <= 110) // Mock data range
            );
            if (suspiciousPrices.length > 0) {
                return true;
            }
        }
        return false;
    }
    /**
     * Pre-filter tickers to only include those on compatible blockchains
     * This reduces processing by eliminating incompatible pairs early
     */
    filterCompatibleTickers(tickers) {
        const compatibleTickers = [];
        const blockchainGroups = new Map();
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
            blockchainGroups.get(blockchain).push(ticker);
        }
        // Only include tickers from compatible blockchain groups
        const compatibleChains = ['ethereum', 'bsc', 'polygon', 'arbitrum', 'optimism'];
        const incompatibleChains = ['solana'];
        for (const [blockchain, blockchainTickers] of blockchainGroups) {
            if (compatibleChains.includes(blockchain)) {
                // Include all tickers from compatible chains
                compatibleTickers.push(...blockchainTickers);
            }
            else if (incompatibleChains.includes(blockchain)) {
                // Only include tickers from the same incompatible chain
                if (blockchainTickers.length > 1) {
                    compatibleTickers.push(...blockchainTickers);
                }
            }
        }
        return compatibleTickers;
    }
    groupTickersBySymbol(allTickers) {
        const symbolGroups = new Map();
        for (const tickers of allTickers.values()) {
            for (const ticker of tickers) {
                if (!symbolGroups.has(ticker.symbol)) {
                    symbolGroups.set(ticker.symbol, []);
                }
                symbolGroups.get(ticker.symbol).push(ticker);
            }
        }
        return symbolGroups;
    }
    findArbitrageForSymbol(symbol, tickers) {
        const opportunities = [];
        // Compare each exchange pair (tickers are already pre-filtered for compatibility)
        for (let i = 0; i < tickers.length; i++) {
            for (let j = i + 1; j < tickers.length; j++) {
                const ticker1 = tickers[i];
                const ticker2 = tickers[j];
                // Check arbitrage opportunity in both directions
                const opp1 = this.calculateOpportunity(symbol, ticker1, ticker2);
                const opp2 = this.calculateOpportunity(symbol, ticker2, ticker1);
                if (opp1)
                    opportunities.push(opp1);
                if (opp2)
                    opportunities.push(opp2);
            }
        }
        return opportunities;
    }
    calculateOpportunity(symbol, buyTicker, sellTicker) {
        const buyPrice = buyTicker.ask; // Price to buy (ask price)
        const sellPrice = sellTicker.bid; // Price to sell (bid price)
        if (buyPrice >= sellPrice)
            return null; // No arbitrage opportunity
        // Calculate fees
        const buyFee = this.tradingFees.get(buyTicker.exchange.toLowerCase()) || 0.1;
        const sellFee = this.tradingFees.get(sellTicker.exchange.toLowerCase()) || 0.1;
        // Calculate net prices after fees
        const netBuyPrice = buyPrice * (1 + buyFee / 100);
        const netSellPrice = sellPrice * (1 - sellFee / 100);
        if (netBuyPrice >= netSellPrice)
            return null; // No profit after fees
        // Calculate profit
        const profitAmount = netSellPrice - netBuyPrice;
        const profitPercentage = (profitAmount / netBuyPrice) * 100;
        // Use minimum volume between exchanges
        const volume = Math.min(buyTicker.volume || 0, sellTicker.volume || 0);
        return {
            symbol: symbol,
            buyExchange: buyTicker.exchange,
            sellExchange: sellTicker.exchange,
            buyPrice: buyPrice,
            sellPrice: sellPrice,
            profitPercentage: profitPercentage,
            profitAmount: profitAmount,
            volume: volume,
            timestamp: Math.max(buyTicker.timestamp, sellTicker.timestamp),
            fees: {
                buyFee: buyFee,
                sellFee: sellFee
            }
        };
    }
    setMinProfitThreshold(threshold) {
        this.minProfitThreshold = threshold;
    }
    getMinProfitThreshold() {
        return this.minProfitThreshold;
    }
    setMaxProfitThreshold(threshold) {
        this.maxProfitThreshold = threshold;
    }
    getMaxProfitThreshold() {
        return this.maxProfitThreshold;
    }
    updateTradingFee(exchange, fee) {
        this.tradingFees.set(exchange.toLowerCase(), fee);
    }
    getTradingFee(exchange) {
        return this.tradingFees.get(exchange.toLowerCase()) || 0.1;
    }
    // Calculate potential profit for a given investment amount
    calculatePotentialProfit(opportunity, investmentAmount) {
        return (opportunity.profitPercentage / 100) * investmentAmount;
    }
    // Validate if an opportunity is still valid (not too old)
    isOpportunityValid(opportunity, maxAgeMs = 60000) {
        return (Date.now() - opportunity.timestamp) <= maxAgeMs;
    }
}
//# sourceMappingURL=ArbitrageCalculator.js.map