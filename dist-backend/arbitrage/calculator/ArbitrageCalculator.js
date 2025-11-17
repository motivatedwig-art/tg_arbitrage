import { TokenMetadataService } from '../../services/TokenMetadataService.js';
import { ExchangeManager } from '../../exchanges/ExchangeManager.js';
import { getTokenBlockchain } from '../../services/TokenMetadataDatabase.js';
import { BlockchainAggregator } from '../../services/BlockchainAggregator.js';
import { CoinApiService } from '../../services/CoinApiService.js';
import { IconResolver } from '../../services/IconResolver.js';
import { normalizeChain } from '../../utils/chainNormalizer.js';
import { TokenVerificationService } from '../../services/TokenVerificationService.js';
export class ArbitrageCalculator {
    constructor(minProfitThreshold = 0.5, maxProfitThreshold = 100, minVolumeThreshold = 100) {
        this.tradingFees = new Map();
        this.chainTransferCosts = new Map();
        this.blockchainAggregator = null;
        this.excludedBlockchains = new Set([]); // DISABLED: Blockchain filtering disabled due to inaccurate blockchain detection
        this.coinApiService = CoinApiService.getInstance();
        this.iconResolver = IconResolver.getInstance();
        this.tokenVerificationService = TokenVerificationService.getInstance();
        this.minProfitThreshold = minProfitThreshold;
        this.maxProfitThreshold = maxProfitThreshold;
        this.minVolumeThreshold = minVolumeThreshold;
        this.tokenMetadataService = TokenMetadataService.getInstance();
        this.exchangeManager = ExchangeManager.getInstance();
        // Initialize blockchain aggregator (lazy load to avoid circular deps)
        try {
            this.blockchainAggregator = new BlockchainAggregator();
        }
        catch (error) {
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
    initializeTradingFees() {
        // Default trading fees for each exchange (maker fees)
        this.tradingFees.set('binance', 0.1); // 0.1%
        this.tradingFees.set('okx', 0.1); // 0.1%
        this.tradingFees.set('bybit', 0.1); // 0.1%
        this.tradingFees.set('mexc', 0.2); // 0.2%
        this.tradingFees.set('gateio', 0.2); // 0.2%
        this.tradingFees.set('kucoin', 0.1); // 0.1%
    }
    initializeChainTransferCosts() {
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
    async calculateArbitrageOpportunities(allTickers) {
        // CRITICAL LOG MARKER - If you see this, new code is running
        console.log('\n🚀🚀🚀 NEW STRUCTURED LOGGING VERSION - calculateArbitrageOpportunities START 🚀🚀🚀\n');
        console.log('\n' + '='.repeat(80));
        console.log('📊 [PHASE 0] INITIALIZATION');
        console.log('='.repeat(80));
        console.log(`📊 Calculating arbitrage for ${allTickers.size} exchanges`);
        // Log ticker counts per exchange
        let totalTickers = 0;
        for (const [exchange, tickers] of allTickers) {
            console.log(`   📈 ${exchange}: ${tickers.length} tickers`);
            totalTickers += tickers.length;
        }
        console.log(`   📊 Total tickers: ${totalTickers}`);
        // Log first ticker sample to verify if data is real
        const firstExchange = Array.from(allTickers.keys())[0];
        const firstTickers = allTickers.get(firstExchange);
        if (firstTickers && firstTickers.length > 0) {
            const sample = firstTickers[0];
            console.log(`   📋 Sample ticker: ${sample.symbol} (${sample.exchange}) - blockchain: ${sample.blockchain || 'undefined'}, contract: ${sample.contractAddress ? sample.contractAddress.substring(0, 10) + '...' : 'undefined'}`);
        }
        console.log('\n' + '-'.repeat(80));
        console.log('🔍 [PHASE 1] VALIDATION');
        console.log('-'.repeat(80));
        // Add validation for mock data - NEVER allow mock data
        if (this.isMockData(allTickers)) {
            console.error('❌ MOCK DATA DETECTED - Returning empty opportunities');
            return [];
        }
        console.log('✅ Mock data check passed');
        console.log('\n' + '-'.repeat(80));
        console.log('🔍 [PHASE 2] ENRICHMENT');
        console.log('-'.repeat(80));
        console.log(`📥 Input: ${allTickers.size} exchanges, ${totalTickers} total tickers`);
        // CRITICAL: Enrich tickers with blockchain/contract info BEFORE grouping
        // This ensures contract ID matching works properly
        let enrichedTickers;
        try {
            enrichedTickers = await this.enrichTickersWithBlockchainInfo(allTickers);
            const outputTotal = Array.from(enrichedTickers.values()).reduce((sum, tickers) => sum + tickers.length, 0);
            console.log(`📤 Output: ${enrichedTickers.size} exchanges, ${outputTotal} total tickers after enrichment`);
        }
        catch (error) {
            console.error('❌ Error during ticker enrichment:', error);
            console.error('   Stack:', error instanceof Error ? error.stack : 'No stack trace');
            // Fall back to original tickers if enrichment fails
            enrichedTickers = allTickers;
            console.log('   ⚠️ Using original tickers as fallback');
        }
        console.log('\n' + '-'.repeat(80));
        console.log('🔍 [PHASE 3] GROUPING');
        console.log('-'.repeat(80));
        const opportunities = [];
        // Group tickers by symbol and filter for compatible chains only
        const symbolGroups = this.groupTickersBySymbol(enrichedTickers);
        console.log(`📋 Grouped into ${symbolGroups.size} unique symbol/chain combinations`);
        console.log('\n' + '-'.repeat(80));
        console.log('🔍 [PHASE 4] ARBITRAGE CALCULATION');
        console.log('-'.repeat(80));
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
            opportunities.push(...filteredOpportunities);
            if (filteredOpportunities.length > 0 && (symbolsProcessed <= 10 || symbolsProcessed % 50 === 0)) {
                // Extract contract/blockchain info for logging
                const chains = [...new Set(tickers.map(t => t.blockchain).filter(Boolean))];
                const chainInfo = chains.length > 0 ? ` [${chains.join(',')}]` : '';
                console.log(`   ✅ ${baseSymbol}${chainInfo}: ${filteredOpportunities.length} opportunities across ${tickers.length} exchanges`);
            }
        }
        // Count opportunities by blockchain
        const oppBlockchainCount = new Map();
        opportunities.forEach(opp => {
            const chain = opp.blockchain || 'unknown';
            oppBlockchainCount.set(chain, (oppBlockchainCount.get(chain) || 0) + 1);
        });
        console.log(`\n📊 Summary: Processed ${symbolsProcessed} symbols (${symbolsSkipped} skipped)`);
        console.log(`💎 Found ${opportunities.length} total opportunities before filtering`);
        if (oppBlockchainCount.size > 0) {
            console.log(`   📊 Opportunities by blockchain:`);
            const sorted = Array.from(oppBlockchainCount.entries()).sort((a, b) => b[1] - a[1]);
            sorted.forEach(([blockchain, count]) => {
                console.log(`      - ${blockchain}: ${count} opportunities`);
            });
        }
        console.log('\n' + '-'.repeat(80));
        console.log('🔍 [PHASE 5] FILTERING');
        console.log('-'.repeat(80));
        // Filter opportunities by profit thresholds and add logging for unrealistic profits
        let unrealisticCount = 0;
        let lowProfitCount = 0;
        const filteredOpportunities = opportunities.filter(opp => {
            if (opp.profitPercentage > this.maxProfitThreshold) {
                unrealisticCount++;
                return false;
            }
            if (opp.profitPercentage < this.minProfitThreshold) {
                lowProfitCount++;
                return false;
            }
            return true;
        });
        console.log(`📊 Filtering results:`);
        console.log(`   • Unrealistic profit (>${this.maxProfitThreshold}%): ${unrealisticCount}`);
        console.log(`   • Too low profit (<${this.minProfitThreshold}%): ${lowProfitCount}`);
        console.log(`   ✅ Final opportunities: ${filteredOpportunities.length}`);
        // Sort by profit percentage descending
        const sortedOpportunities = filteredOpportunities.sort((a, b) => b.profitPercentage - a.profitPercentage);
        if (sortedOpportunities.length > 0) {
            console.log('\n📋 Top 5 opportunities:');
            sortedOpportunities.slice(0, 5).forEach((opp, index) => {
                const blockchainInfo = opp.blockchain ? ` [${opp.blockchain.toUpperCase()}]` : '';
                console.log(`   ${index + 1}.${blockchainInfo} ${opp.symbol} | ${opp.buyExchange} → ${opp.sellExchange} | ${opp.profitPercentage.toFixed(2)}%`);
            });
        }
        console.log('\n' + '='.repeat(80));
        console.log('✅ [COMPLETE] Arbitrage calculation finished');
        console.log('='.repeat(80) + '\n');
        return sortedOpportunities;
    }
    mapDexChainIdToBlockchain(chainId) {
        if (!chainId)
            return undefined;
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
    /**
     * Enrich tickers with blockchain and contract address information
     * This ensures contract ID matching works properly
     * Uses DexScreener to get contract addresses for accurate matching
     */
    async enrichTickersWithBlockchainInfo(allTickers) {
        const enriched = new Map();
        let enrichedCount = 0;
        let contractEnrichedCount = 0;
        let unchangedCount = 0;
        let totalTickers = 0;
        // Count total tickers for logging
        for (const tickers of allTickers.values()) {
            totalTickers += tickers.length;
        }
        console.log(`📊 Analyzing ${totalTickers} tickers across ${allTickers.size} exchanges...`);
        // STEP 2.1: Pattern-based blockchain detection
        console.log('\n   [STEP 2.1] Pattern-based blockchain detection');
        const symbolsNeedingContract = new Set();
        const symbolBlockchainMap = new Map(); // symbol -> blockchain
        // First pass: Get blockchain info for all symbols
        let symbolsWithBlockchain = 0;
        let symbolsNeedingEnrichment = 0;
        for (const tickers of allTickers.values()) {
            for (const ticker of tickers) {
                if (ticker.blockchain && ticker.contractAddress) {
                    unchangedCount++;
                    continue;
                }
                const baseSymbol = ticker.symbol.split('/')[0].toUpperCase();
                let blockchain = ticker.blockchain;
                // Fast pattern-based blockchain detection
                if (!blockchain) {
                    const symbolWithQuote = ticker.symbol;
                    const blockchainFromDb = getTokenBlockchain(symbolWithQuote);
                    if (blockchainFromDb) {
                        blockchain = blockchainFromDb;
                    }
                    else {
                        // Pattern-based detection
                        const cleanSymbol = baseSymbol
                            .replace(/[\/\-_]/g, '')
                            .replace(/USDT$|USDC$|BTC$|ETH$|BNB$|USD$|EUR$/i, '')
                            .toUpperCase();
                        if (cleanSymbol === 'SOL' || cleanSymbol.includes('WSOL'))
                            blockchain = 'solana';
                        else if (cleanSymbol === 'TRX' || cleanSymbol.includes('TRON'))
                            blockchain = 'tron';
                        else if (cleanSymbol === 'BNB' || cleanSymbol.includes('WBNB'))
                            blockchain = 'bsc';
                        else if (cleanSymbol === 'MATIC' || cleanSymbol.includes('WMATIC'))
                            blockchain = 'polygon';
                        else if (cleanSymbol === 'ARB' && !cleanSymbol.includes('BARB'))
                            blockchain = 'arbitrum';
                        else if (cleanSymbol === 'OP' && cleanSymbol.length <= 8)
                            blockchain = 'optimism';
                        else if (cleanSymbol === 'AVAX' || cleanSymbol.includes('WAVAX'))
                            blockchain = 'avalanche';
                        else if (cleanSymbol === 'BTC')
                            blockchain = 'bitcoin';
                        else if (cleanSymbol === 'ETH')
                            blockchain = 'ethereum';
                        // Don't default to ethereum - let DexScreener or other sources provide blockchain info
                        // If no blockchain is found, it will remain undefined and be handled later
                    }
                    if (blockchain) {
                        symbolBlockchainMap.set(baseSymbol, blockchain);
                        symbolsWithBlockchain++;
                    }
                }
                // Track symbols that need contract address
                if (blockchain && !ticker.contractAddress) {
                    symbolsNeedingContract.add(baseSymbol);
                    symbolsNeedingEnrichment++;
                }
            }
        }
        console.log(`   ✅ Detected blockchain for ${symbolsWithBlockchain} symbols via patterns`);
        console.log(`   🔍 ${symbolsNeedingContract.size} unique symbols need contract addresses`);
        // STEP 2.2: DexScreener API calls
        const symbolContractMap = new Map(); // symbol -> Map<chainId, contractAddress>
        const symbolsArray = Array.from(symbolsNeedingContract);
        if (symbolsArray.length > 0) {
            console.log(`\n   [STEP 2.2] DexScreener API calls (${symbolsArray.length} symbols, no limit - database cache enabled)`);
            console.log(`   ⏳ Calling DexScreener API for contract addresses (will use database cache when available)...`);
            try {
                const { DexScreenerService } = await import('../../services/DexScreenerService.js');
                const dexService = DexScreenerService.getInstance();
                // Initialize database for caching if available
                try {
                    const { DatabaseManager } = await import('../../database/Database.js');
                    const db = DatabaseManager.getInstance();
                    dexService.setDatabase(db);
                }
                catch (error) {
                    console.warn('⚠️ Could not initialize database for DexScreener cache:', error);
                }
                // Process ALL symbols (no limit) - database cache will reduce API calls
                const batchSize = 10;
                let processed = 0;
                let successful = 0;
                let failed = 0;
                let cached = 0;
                for (let i = 0; i < symbolsArray.length; i++) { // Process ALL symbols
                    const baseSymbol = symbolsArray[i];
                    try {
                        console.log(`      🔍 [${i + 1}/${symbolsArray.length}] Fetching contracts for ${baseSymbol}...`);
                        // Get all contract candidates for this symbol (checks database cache first)
                        const candidates = await dexService.resolveAllBySymbol(baseSymbol);
                        // Check if this was from cache (already logged in DexScreenerService)
                        if (candidates && candidates.length > 0) {
                            const contractMap = new Map();
                            let primaryBlockchain = null;
                            for (const candidate of candidates) {
                                if (candidate.chainId && candidate.tokenAddress) {
                                    contractMap.set(candidate.chainId.toLowerCase(), candidate.tokenAddress);
                                    // Extract blockchain from DexScreener chainId (e.g., 'ethereum', 'arbitrum', 'solana')
                                    // Use the first chain found as primary, or prefer known chains
                                    if (!primaryBlockchain ||
                                        (candidate.chainId.toLowerCase() === 'arbitrum' ||
                                            candidate.chainId.toLowerCase() === 'solana' ||
                                            candidate.chainId.toLowerCase() === 'base' ||
                                            candidate.chainId.toLowerCase() === 'optimism' ||
                                            candidate.chainId.toLowerCase() === 'polygon')) {
                                        // Map DexScreener chainId to our blockchain name format
                                        const chainId = candidate.chainId.toLowerCase();
                                        const blockchainMapping = {
                                            'ethereum': 'ethereum',
                                            'bsc': 'bsc',
                                            'polygon': 'polygon',
                                            'arbitrum': 'arbitrum',
                                            'optimism': 'optimism',
                                            'base': 'base',
                                            'solana': 'solana',
                                            'avalanche': 'avalanche',
                                            'fantom': 'fantom',
                                            'tron': 'tron',
                                            'aptos': 'aptos',
                                            'sui': 'sui',
                                            'near': 'near',
                                            'cosmos': 'cosmos',
                                            'polkadot': 'polkadot',
                                            'cardano': 'cardano',
                                            'bitcoin': 'bitcoin',
                                            'ripple': 'ripple',
                                            'stellar': 'stellar',
                                            'dogecoin': 'dogecoin',
                                            'litecoin': 'litecoin',
                                            'ton': 'ton'
                                        };
                                        primaryBlockchain = blockchainMapping[chainId] || chainId;
                                    }
                                }
                            }
                            if (contractMap.size > 0) {
                                symbolContractMap.set(baseSymbol, contractMap);
                                // CRITICAL: Update symbolBlockchainMap with blockchain from DexScreener
                                // This overrides the default Ethereum assignment from pattern matching
                                if (primaryBlockchain) {
                                    symbolBlockchainMap.set(baseSymbol, primaryBlockchain);
                                    console.log(`      ✅ ${baseSymbol}: Found ${contractMap.size} chain(s) [${Array.from(contractMap.keys()).join(', ')}] - Primary: ${primaryBlockchain}`);
                                }
                                else {
                                    console.log(`      ✅ ${baseSymbol}: Found ${contractMap.size} chain(s) [${Array.from(contractMap.keys()).join(', ')}]`);
                                }
                                successful++;
                            }
                            else {
                                failed++;
                                console.log(`      ⚠️  ${baseSymbol}: No valid contracts found`);
                            }
                        }
                        else {
                            failed++;
                            console.log(`      ⚠️  ${baseSymbol}: No results from DexScreener`);
                        }
                        processed++;
                        if (processed % batchSize === 0) {
                            console.log(`      📊 Progress: ${processed}/${symbolsArray.length} (${successful} success, ${cached} cached, ${failed} failed)`);
                        }
                    }
                    catch (error) {
                        failed++;
                        const errorMsg = error instanceof Error ? error.message : 'Unknown error';
                        console.log(`      ❌ ${baseSymbol}: Error - ${errorMsg}`);
                        // Continue with next symbol if this one fails
                    }
                }
                console.log(`\n   ✅ DexScreener API complete: ${successful} symbols found (with database cache), ${failed} failed`);
                console.log(`   📊 Contract addresses fetched for ${symbolContractMap.size} symbols`);
            }
            catch (error) {
                console.error(`   ❌ Fatal error in DexScreener API:`, error);
            }
        }
        else {
            console.log(`\n   [STEP 2.2] Skipped (no symbols need contract addresses)`);
        }
        // STEP 2.3: Apply enrichment to all tickers
        console.log(`\n   [STEP 2.3] Applying enrichment to tickers`);
        for (const [exchange, tickers] of allTickers.entries()) {
            const enrichedTickers = [];
            for (const ticker of tickers) {
                // If ticker already has blockchain and contract info, keep it
                if (ticker.blockchain && ticker.contractAddress) {
                    enrichedTickers.push(ticker);
                    unchangedCount++;
                    continue;
                }
                const baseSymbol = ticker.symbol.split('/')[0].toUpperCase();
                // CRITICAL: Prioritize DexScreener results (in symbolBlockchainMap) over ticker's existing blockchain
                // This ensures DexScreener's correct blockchain detection overrides any defaults
                let blockchain = symbolBlockchainMap.get(baseSymbol) || ticker.blockchain;
                let contractAddress = ticker.contractAddress;
                // If we have blockchain but no contract, try to get it from DexScreener results
                if (blockchain && !contractAddress) {
                    const contracts = symbolContractMap.get(baseSymbol);
                    if (contracts) {
                        // Try to find contract for this blockchain
                        const chainId = this.getChainIdFromBlockchain(blockchain);
                        if (chainId && contracts.has(chainId)) {
                            contractAddress = contracts.get(chainId);
                            contractEnrichedCount++;
                        }
                        else {
                            // If no exact match, use first contract (less ideal but better than nothing)
                            const firstContract = contracts.values().next().value;
                            if (firstContract) {
                                contractAddress = firstContract;
                                contractEnrichedCount++;
                            }
                        }
                    }
                }
                const enrichedTicker = {
                    ...ticker,
                    blockchain: blockchain || undefined,
                    contractAddress: contractAddress || undefined
                };
                // Track if we enriched this ticker
                if (blockchain && blockchain !== ticker.blockchain) {
                    enrichedCount++;
                }
                enrichedTickers.push(enrichedTicker);
            }
            enriched.set(exchange, enrichedTickers);
        }
        // Summary with blockchain distribution
        const blockchainDistribution = new Map();
        for (const tickers of enriched.values()) {
            for (const ticker of tickers) {
                if (ticker.blockchain) {
                    blockchainDistribution.set(ticker.blockchain, (blockchainDistribution.get(ticker.blockchain) || 0) + 1);
                }
            }
        }
        console.log(`\n   ✅ Enrichment Summary:`);
        console.log(`      • Blockchain enriched: ${enrichedCount} tickers`);
        console.log(`      • Contract enriched: ${contractEnrichedCount} tickers`);
        console.log(`      • Already complete: ${unchangedCount} tickers`);
        if (blockchainDistribution.size > 0) {
            console.log(`      • Blockchain distribution:`);
            const sortedBlockchains = Array.from(blockchainDistribution.entries())
                .sort((a, b) => b[1] - a[1]);
            sortedBlockchains.forEach(([blockchain, count]) => {
                console.log(`         - ${blockchain}: ${count} tickers`);
            });
        }
        if (enrichedCount === 0 && contractEnrichedCount === 0) {
            console.log(`      ⚠️  No enrichment performed (all tickers already had info or enrichment failed)`);
        }
        return enriched;
    }
    /**
     * Map blockchain name to DexScreener chainId
     */
    getChainIdFromBlockchain(blockchain) {
        const mapping = {
            'ethereum': 'ethereum',
            'eth': 'ethereum',
            'bsc': 'bsc',
            'bnb': 'bsc',
            'polygon': 'polygon',
            'matic': 'polygon',
            'arbitrum': 'arbitrum',
            'arb': 'arbitrum',
            'optimism': 'optimism',
            'op': 'optimism',
            'base': 'base',
            'solana': 'solana',
            'sol': 'solana',
            'avalanche': 'avalanche',
            'avax': 'avalanche',
            'fantom': 'fantom',
            'ftm': 'fantom',
            'tron': 'tron',
            'trx': 'tron',
        };
        return mapping[blockchain.toLowerCase()] || null;
    }
    isMockData(allTickers) {
        // Check for common mock data patterns - be very specific
        let mockExchangeCount = 0;
        let totalExchanges = 0;
        for (const [exchange, tickers] of allTickers.entries()) {
            totalExchanges++;
            // Check if this exchange is using mock data
            const mockTickers = tickers.filter(ticker => ticker.exchange.includes('mock') ||
                ticker.exchange.includes('test') ||
                // Only flag as mock if it's exactly these specific mock values
                ticker.bid === 100.0 ||
                ticker.bid === 1000.0 ||
                ticker.bid === 50.0 ||
                ticker.bid === 200.0);
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
    /**
     * Create a unique key for a ticker based on symbol, blockchain, and contract address
     * This ensures we only compare tickers that represent the same asset
     */
    createTickerKey(ticker) {
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
    groupTickersBySymbol(allTickers) {
        const symbolGroups = new Map();
        for (const tickers of allTickers.values()) {
            for (const ticker of tickers) {
                // Use unique key that includes blockchain and contract address
                const uniqueKey = this.createTickerKey(ticker);
                if (!symbolGroups.has(uniqueKey)) {
                    symbolGroups.set(uniqueKey, []);
                }
                symbolGroups.get(uniqueKey).push(ticker);
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
    async findArbitrageForSymbol(symbol, tickers) {
        const promises = [];
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
        return results.filter((opp) => opp !== null);
    }
    /**
     * Verify that two tickers represent the same asset (same contract or same native token on same chain)
     */
    areSameAsset(ticker1, ticker2) {
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
        // If one has contract/blockchain and other doesn't, allow the match if symbols match
        // This is more lenient to allow opportunities when enrichment is inconsistent across exchanges
        // The blockchain will be determined later from the ticker that has it
        if ((blockchain1 || contract1) && !(blockchain2 || contract2)) {
            // Allow match - use ticker1's blockchain info
            return true;
        }
        if ((blockchain2 || contract2) && !(blockchain1 || contract1)) {
            // Allow match - use ticker2's blockchain info
            return true;
        }
        // Both lack blockchain/contract info - assume same if symbol matches (legacy behavior)
        // This is less safe but maintains backward compatibility
        console.log(`   ⚠️ [LEGACY_MATCH] ${baseSymbol1}: Both tickers lack contract/blockchain info - assuming same asset (less safe)`);
        return true;
    }
    async calculateOpportunity(symbol, buyTicker, sellTicker) {
        // CRITICAL: Verify buy and sell are the same asset before calculating opportunity
        if (!this.areSameAsset(buyTicker, sellTicker)) {
            return null;
        }
        const buyPrice = buyTicker.ask; // Price to buy (ask price)
        const sellPrice = sellTicker.bid; // Price to sell (bid price)
        if (buyPrice >= sellPrice)
            return null; // No arbitrage opportunity
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
        if (netBuyPrice >= adjustedSellPrice)
            return null; // No profit after fees and transfer costs
        // Calculate profit
        const profitAmount = adjustedSellPrice - netBuyPrice;
        const profitPercentage = (profitAmount / netBuyPrice) * 100;
        // Use minimum volume between exchanges and apply volume filtering
        const volume = Math.min(buyTicker.volume || 0, sellTicker.volume || 0);
        // Apply volume filtering - skip opportunities with insufficient volume
        if (volume < this.minVolumeThreshold) {
            return null;
        }
        // Determine blockchain - prioritize ticker blockchain over fallback
        let determinedBlockchain = await this.determineBlockchain(buyTicker, sellTicker);
        // Normalize blockchain name
        if (determinedBlockchain) {
            determinedBlockchain = normalizeChain(determinedBlockchain) || determinedBlockchain;
        }
        // Log the final blockchain for debugging
        if (determinedBlockchain !== buyChain && determinedBlockchain !== sellChain) {
            console.log(`   🔍 [BLOCKCHAIN] ${symbol}: Using ${determinedBlockchain} (tickers: ${buyChain}/${sellChain})`);
        }
        // Get contract address from tickers
        const contractAddress = buyTicker.contractAddress || sellTicker.contractAddress;
        // Map blockchain to chainId
        const chainIdMap = {
            'ethereum': 'ethereum',
            'bsc': 'bsc',
            'polygon': 'polygon',
            'arbitrum': 'arbitrum',
            'optimism': 'optimism',
            'base': 'base',
            'solana': 'solana',
            'avalanche': 'avalanche',
            'tron': 'tron'
        };
        const chainId = determinedBlockchain ? chainIdMap[determinedBlockchain] : undefined;
        // Verify token if we have contract address and chainId
        let liquidityUsd;
        let confidenceScore = 85; // Default confidence
        let risks = [];
        let executable = true;
        if (contractAddress && chainId) {
            try {
                const verification = await this.tokenVerificationService.verifyToken(chainId, contractAddress, symbol);
                liquidityUsd = verification.liquidityUsd;
                confidenceScore = verification.confidenceScore || 85;
                risks = verification.risks || [];
                executable = verification.isValid !== false; // Only mark as non-executable if explicitly invalid
                if (!verification.isValid) {
                    console.log(`   ⚠️ [VERIFICATION] ${symbol} on ${chainId}: ${verification.reason}`);
                }
            }
            catch (error) {
                console.warn(`   ⚠️ [VERIFICATION] Failed to verify ${symbol} on ${chainId}:`, error);
                // Continue with default values if verification fails
            }
        }
        // Calculate net profit percentage (after fees and gas)
        const gasCostUsd = transferCost; // Use transfer cost as gas estimate
        const tradeSize = volume * buyPrice; // Estimated trade size
        const gasCostPercentage = tradeSize > 0 ? (gasCostUsd / tradeSize) * 100 : 0;
        const netProfitPercentage = profitPercentage - gasCostPercentage;
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
            blockchain: determinedBlockchain || undefined,
            contractAddress: contractAddress || undefined,
            chainId: chainId || undefined,
            liquidityUsd: liquidityUsd,
            gasCostUsd: gasCostUsd,
            netProfitPercentage: netProfitPercentage,
            confidenceScore: confidenceScore,
            risks: risks,
            executable: executable,
            fees: {
                buyFee: buyFee,
                sellFee: sellFee,
                transferCost: transferCost
            },
            transferAvailability: {
                buyAvailable: undefined, // Transfer check disabled
                sellAvailable: undefined, // Transfer check disabled
                commonNetworks: determinedBlockchain ? [determinedBlockchain] : [] // Use determined blockchain
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
    calculateTransferCost(buyChain, sellChain) {
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
    setMinVolumeThreshold(threshold) {
        this.minVolumeThreshold = threshold;
    }
    getMinVolumeThreshold() {
        return this.minVolumeThreshold;
    }
    updateTransferCost(fromChain, toChain, cost) {
        this.chainTransferCosts.set(`${fromChain}-to-${toChain}`, cost);
    }
    getOpportunitiesByVolume(minVolume) {
        // This would need to be implemented with database integration
        // For now, this is a placeholder for volume-based filtering
        return [];
    }
    /**
     * Determine the primary blockchain for an arbitrage opportunity
     * Uses comprehensive token database for accurate blockchain detection
     */
    async determineBlockchain(buyTicker, sellTicker) {
        // If both tickers have blockchain info and they match, use that
        if (buyTicker.blockchain && sellTicker.blockchain && buyTicker.blockchain === sellTicker.blockchain) {
            return normalizeChain(buyTicker.blockchain) || buyTicker.blockchain;
        }
        // If only one has blockchain info, use that
        if (buyTicker.blockchain) {
            const normalized = normalizeChain(buyTicker.blockchain);
            return normalized || buyTicker.blockchain;
        }
        if (sellTicker.blockchain) {
            const normalized = normalizeChain(sellTicker.blockchain);
            return normalized || sellTicker.blockchain;
        }
        // Try blockchain aggregator first (most accurate)
        const symbol = buyTicker.symbol || sellTicker.symbol || '';
        if (this.blockchainAggregator) {
            try {
                const blockchain = await this.blockchainAggregator.getBlockchainForToken(symbol);
                if (blockchain) {
                    return normalizeChain(blockchain) || blockchain;
                }
            }
            catch (error) {
                // Fall through to static database
            }
        }
        // Use comprehensive token database (Jacob)
        const blockchainFromDb = getTokenBlockchain(symbol);
        if (blockchainFromDb) {
            return normalizeChain(blockchainFromDb) || blockchainFromDb;
        }
        // Fallback: Enhanced pattern-based detection
        const cleanSymbol = symbol
            .replace(/[\/\-_]/g, '')
            .replace(/USDT$|USDC$|BTC$|ETH$|BNB$|USD$|EUR$/i, '')
            .toUpperCase();
        // Native chain tokens (exact match first)
        let detectedChain = null;
        if (cleanSymbol === 'SOL' || cleanSymbol.includes('WSOL'))
            detectedChain = 'solana';
        else if (cleanSymbol === 'TRX' || cleanSymbol.includes('TRON'))
            detectedChain = 'tron';
        else if (cleanSymbol === 'BNB' || cleanSymbol.includes('WBNB'))
            detectedChain = 'bsc';
        else if (cleanSymbol === 'MATIC' || cleanSymbol.includes('WMATIC'))
            detectedChain = 'polygon';
        else if (cleanSymbol === 'ARB' || (cleanSymbol.includes('ARB') && !cleanSymbol.includes('BARB')))
            detectedChain = 'arbitrum';
        else if (cleanSymbol === 'OP' || (cleanSymbol.includes('OP') && cleanSymbol.length <= 8))
            detectedChain = 'optimism';
        else if (cleanSymbol === 'AVAX' || cleanSymbol.includes('WAVAX'))
            detectedChain = 'avalanche';
        else if (cleanSymbol === 'TON')
            detectedChain = 'ton';
        else if (cleanSymbol === 'APT')
            detectedChain = 'aptos';
        else if (cleanSymbol === 'SUI')
            detectedChain = 'sui';
        else if (cleanSymbol === 'NEAR')
            detectedChain = 'near';
        else if (cleanSymbol === 'ATOM')
            detectedChain = 'cosmos';
        else if (cleanSymbol === 'DOT')
            detectedChain = 'polkadot';
        else if (cleanSymbol === 'ADA')
            detectedChain = 'cardano';
        else if (cleanSymbol === 'BTC')
            detectedChain = 'bitcoin';
        else if (cleanSymbol === 'XRP')
            detectedChain = 'ripple';
        else if (cleanSymbol === 'XLM')
            detectedChain = 'stellar';
        else if (cleanSymbol === 'DOGE')
            detectedChain = 'dogecoin';
        else if (cleanSymbol === 'LTC')
            detectedChain = 'litecoin';
        // Wrapped tokens
        if (!detectedChain && cleanSymbol.startsWith('W') && cleanSymbol.length > 4) {
            const unwrapped = cleanSymbol.substring(1);
            if (unwrapped === 'BTC' || unwrapped === 'ETH')
                detectedChain = 'ethereum';
            else if (unwrapped === 'SOL')
                detectedChain = 'solana';
            else if (unwrapped === 'BNB')
                detectedChain = 'bsc';
            else if (unwrapped === 'MATIC')
                detectedChain = 'polygon';
        }
        // Normalize detected chain
        if (detectedChain) {
            return normalizeChain(detectedChain) || detectedChain;
        }
        // Log unknown tokens for future analysis
        if (process.env.NODE_ENV === 'development') {
            console.log(`⚠️ Unknown blockchain for ${symbol}, using null (will be grouped as 'unknown')`);
        }
        // CRITICAL: Don't default to ethereum - return null instead
        // This allows opportunities to be grouped separately if blockchain can't be determined
        // The grouping function will handle null as 'unknown'
        return null;
    }
}
//# sourceMappingURL=ArbitrageCalculator.js.map