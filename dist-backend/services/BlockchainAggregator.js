/**
 * Blockchain Data Aggregator
 * Aggregates blockchain data from multiple sources and resolves conflicts
 */
import { BlockchainScanner } from './BlockchainScanner.js';
import { MultiChainResolver } from './MultiChainResolver.js';
import { ContractAnalyzer } from './ContractAnalyzer.js';
import { getTokenBlockchain } from '../services/TokenMetadataDatabase.js';
import { BLOCKCHAIN_CONFIG } from '../config/blockchain.config.js';
export class BlockchainAggregator {
    constructor() {
        this.cache = new Map();
        this.scanner = new BlockchainScanner();
        this.resolver = new MultiChainResolver();
        this.contractAnalyzer = new ContractAnalyzer();
    }
    /**
     * Main aggregation function
     */
    async aggregateBlockchainData() {
        console.log('🚀 Starting blockchain data aggregation...');
        try {
            // Step 1: Collect from all exchanges
            console.log('📡 Step 1: Collecting data from exchanges...');
            const exchangeData = await this.collectFromExchanges();
            // Step 2: Analyze contract addresses
            console.log('🔍 Step 2: Analyzing contract addresses...');
            const contractData = await this.analyzeContracts(exchangeData);
            // Step 3: Cross-reference with known mappings
            console.log('📚 Step 3: Enriching with known mappings...');
            const enrichedData = await this.enrichWithKnownMappings(contractData);
            // Step 4: Resolve conflicts and ambiguities
            console.log('🔧 Step 4: Resolving conflicts...');
            const resolvedData = await this.resolveConflicts(enrichedData);
            // Step 5: Calculate confidence scores
            console.log('📊 Step 5: Calculating confidence scores...');
            for (const [symbol, info] of resolvedData.entries()) {
                info.confidence = this.calculateConfidenceScore(info);
            }
            // Step 6: Update cache
            this.cache = resolvedData;
            console.log(`✅ Aggregated data for ${resolvedData.size} tokens`);
            // Step 7: Log statistics
            const stats = this.getStatistics(resolvedData);
            console.log('📈 Statistics:', stats);
            return resolvedData;
        }
        catch (error) {
            console.error('❌ Blockchain aggregation failed:', error);
            throw error;
        }
    }
    /**
     * Collect network data from all exchanges
     */
    async collectFromExchanges() {
        return await this.scanner.scanAllExchanges();
    }
    /**
     * Analyze contract addresses from exchange data
     */
    async analyzeContracts(exchangeData) {
        const tokenMap = new Map();
        for (const [exchange, networkInfos] of exchangeData.entries()) {
            for (const networkInfo of networkInfos) {
                const symbol = networkInfo.symbol.toUpperCase();
                if (!tokenMap.has(symbol)) {
                    tokenMap.set(symbol, {
                        symbol,
                        blockchain: networkInfo.mainNetwork || 'ethereum',
                        confidence: networkInfo.confidence,
                        exchangeAgreement: 0,
                        contractVerified: false,
                        isWellKnown: false,
                        hasConsistentHistory: true
                    });
                }
                const token = tokenMap.get(symbol);
                // Analyze contract addresses if available
                for (const network of networkInfo.networks) {
                    if (network.contractAddress) {
                        const detectedChain = this.contractAnalyzer.getBlockchainFromContract(network.contractAddress, {
                            exchange,
                            symbol,
                            networkHints: [network.blockchain]
                        });
                        // If contract detection confirms blockchain, increase confidence
                        if (detectedChain === network.blockchain) {
                            token.contractVerified = true;
                            token.contractAddress = network.contractAddress;
                        }
                    }
                }
            }
        }
        return tokenMap;
    }
    /**
     * Enrich with known token mappings
     */
    async enrichWithKnownMappings(tokenData) {
        for (const [symbol, info] of tokenData.entries()) {
            const upperSymbol = symbol.toUpperCase();
            // Check known tokens
            if (BLOCKCHAIN_CONFIG.knownTokens[upperSymbol]) {
                const known = BLOCKCHAIN_CONFIG.knownTokens[upperSymbol];
                info.blockchain = known.primary;
                info.isWellKnown = true;
                info.confidence = Math.max(info.confidence, 90);
            }
        }
        return tokenData;
    }
    /**
     * Resolve conflicts in blockchain detection
     */
    async resolveConflicts(tokenData) {
        const resolved = new Map();
        for (const [symbol, info] of tokenData.entries()) {
            // Check for known tokens first (highest priority)
            const upperSymbol = symbol.toUpperCase();
            if (BLOCKCHAIN_CONFIG.knownTokens[upperSymbol]) {
                const known = BLOCKCHAIN_CONFIG.knownTokens[upperSymbol];
                resolved.set(symbol, {
                    ...info,
                    blockchain: known.primary,
                    confidence: 100,
                    isWellKnown: true
                });
                continue;
            }
            // Resolve conflicts using multi-chain resolver
            if (info.conflicts && info.conflicts.length > 0) {
                // Use resolver to determine primary chain
                const exchangeData = []; // Would need to pass actual data
                const resolvedToken = await this.resolver.resolveTokenChains(symbol, exchangeData);
                resolved.set(symbol, {
                    ...info,
                    blockchain: resolvedToken.primaryChain,
                    confidence: resolvedToken.confidence
                });
            }
            else {
                // No conflicts, use as-is
                resolved.set(symbol, info);
            }
        }
        return resolved;
    }
    /**
     * Calculate confidence score for a token
     */
    calculateConfidenceScore(token) {
        let score = 0;
        // Multiple exchanges agreeing increases confidence
        if (token.exchangeAgreement > 0.8) {
            score += 40;
        }
        else if (token.exchangeAgreement > 0.5) {
            score += 25;
        }
        else if (token.exchangeAgreement > 0.2) {
            score += 10;
        }
        // Contract verified on chain
        if (token.contractVerified) {
            score += 30;
        }
        // High-profile token
        if (token.isWellKnown) {
            score += 20;
        }
        // Consistent historical data
        if (token.hasConsistentHistory) {
            score += 15;
        }
        return Math.min(score, 100);
    }
    /**
     * Get blockchain for a token (from cache or database)
     */
    async getBlockchainForToken(symbol) {
        const upperSymbol = symbol.toUpperCase();
        // Check cache first
        const cached = this.cache.get(upperSymbol);
        if (cached && cached.confidence >= BLOCKCHAIN_CONFIG.scanning.confidenceThreshold) {
            return cached.blockchain;
        }
        // Check known tokens
        if (BLOCKCHAIN_CONFIG.knownTokens[upperSymbol]) {
            return BLOCKCHAIN_CONFIG.knownTokens[upperSymbol].primary;
        }
        // Check static database as fallback
        const fromDb = getTokenBlockchain(symbol);
        if (fromDb) {
            return fromDb;
        }
        return null;
    }
    /**
     * Get statistics about aggregated data
     */
    getStatistics(data) {
        let highConfidence = 0;
        let verified = 0;
        let conflicts = 0;
        for (const info of data.values()) {
            if (info.confidence >= 80)
                highConfidence++;
            if (info.contractVerified)
                verified++;
            if (info.conflicts && info.conflicts.length > 0)
                conflicts++;
        }
        return {
            total: data.size,
            highConfidence,
            verified,
            conflicts
        };
    }
    /**
     * Get all aggregated data
     */
    getAggregatedData() {
        return new Map(this.cache);
    }
    /**
     * Clear cache and force refresh
     */
    clearCache() {
        this.cache.clear();
    }
}
//# sourceMappingURL=BlockchainAggregator.js.map