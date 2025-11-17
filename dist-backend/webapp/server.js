import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { DatabaseManager } from '../database/Database.js';
import { UnifiedArbitrageService } from '../services/UnifiedArbitrageService.js';
import { TokenMetadataService } from '../services/TokenMetadataService.js';
import { config } from '../config/environment.js';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
export class WebAppServer {
    constructor() {
        this.app = express();
        this.db = DatabaseManager.getInstance();
        this.arbitrageService = UnifiedArbitrageService.getInstance();
        this.tokenMetadataService = TokenMetadataService.getInstance();
        this.setupMiddleware();
        this.setupRoutes();
    }
    setupMiddleware() {
        // Security middleware - CSP disabled to allow inline scripts for Telegram WebApp
        this.app.use(helmet({
            contentSecurityPolicy: false, // Disable CSP completely to fix inline script blocking
        }));
        // Configure CORS for Telegram and your domains
        this.app.use(cors({
            origin: (origin, callback) => {
                const allowedOrigins = [
                    'https://web.telegram.org',
                    'https://telegram.org',
                    config.webappUrl,
                    'http://localhost:3000',
                    'http://localhost:5173'
                ];
                if (!origin || allowedOrigins.includes(origin) || origin.includes('.telegram.org')) {
                    callback(null, true);
                }
                else {
                    callback(new Error('Not allowed by CORS'));
                }
            },
            credentials: true,
            methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
            allowedHeaders: ['Content-Type', 'Authorization']
        }));
        // JSON middleware
        this.app.use(express.json());
        this.app.use(express.urlencoded({ extended: true }));
        // Static files
        this.app.use(express.static(path.join(__dirname, 'public')));
    }
    // Authentication middleware for admin endpoints
    requireAuth(req, res, next) {
        const apiKey = req.headers.authorization?.replace('Bearer ', '');
        if (!config.adminApiKey || config.adminApiKey === '') {
            console.warn('⚠️ ADMIN_API_KEY not set - denying access to admin endpoint');
            res.status(401).json({
                success: false,
                error: 'Authentication required. Please set ADMIN_API_KEY environment variable.'
            });
            return;
        }
        if (!apiKey || apiKey !== config.adminApiKey) {
            console.warn('🚫 Unauthorized access attempt to admin endpoint');
            res.status(401).json({
                success: false,
                error: 'Unauthorized. Invalid or missing API key.'
            });
            return;
        }
        next();
    }
    setupRoutes() {
        // Serve React mini app (updated to serve from dist/index.html)
        this.app.get('/', (req, res) => {
            const miniappPath = path.join(__dirname, '../../dist/index.html');
            if (fs.existsSync(miniappPath)) {
                res.sendFile(miniappPath);
            }
            else {
                res.status(404).send('Mini app not found. Please build the React app first.');
            }
        });
        // Serve React mini app static assets
        this.app.use('/assets', express.static(path.join(__dirname, '../../dist/assets')));
        // Serve other static files
        this.app.use('/favicon.svg', express.static(path.join(__dirname, '../../dist/favicon.svg')));
        this.app.use('/manifest.webmanifest', express.static(path.join(__dirname, '../../dist/manifest.webmanifest')));
        this.app.use('/telegram-init.js', express.static(path.join(__dirname, '../../dist/telegram-init.js')));
        // Fallback for React mini app routing
        this.app.get('/miniapp*', (req, res) => {
            const miniappPath = path.join(__dirname, '../../dist/index.html');
            if (fs.existsSync(miniappPath)) {
                res.sendFile(miniappPath);
            }
            else {
                res.status(404).send('Mini app not found. Please build the React app first.');
            }
        });
        // API Routes
        // Debug API route to get all opportunities with diagnostic information
        this.app.get('/api/debug/opportunities', async (req, res) => {
            try {
                const opportunities = await this.db.getArbitrageModel().getRecentOpportunities(60); // 60 minutes instead of 30
                // Collect diagnostic information
                const chainsDetected = new Set();
                const uniqueTokens = new Set();
                let missingChainCount = 0;
                let missingAddressCount = 0;
                opportunities.forEach(opp => {
                    if (opp.blockchain) {
                        chainsDetected.add(opp.blockchain);
                    }
                    else {
                        missingChainCount++;
                    }
                    if (opp.contractAddress) {
                        const tokenKey = `${opp.blockchain || 'unknown'}:${opp.contractAddress.toLowerCase()}`;
                        uniqueTokens.add(tokenKey);
                    }
                    else {
                        missingAddressCount++;
                    }
                });
                const debugInfo = {
                    total_opportunities: opportunities.length,
                    chains_detected: Array.from(chainsDetected),
                    unique_tokens: Array.from(uniqueTokens).slice(0, 20), // Limit to first 20
                    missing_chain_count: missingChainCount,
                    missing_address_count: missingAddressCount,
                    chain_distribution: {},
                    sample_opportunity: opportunities[0] || null,
                    cutoffTime: new Date(Date.now() - 60 * 60 * 1000).toISOString()
                };
                // Calculate chain distribution
                opportunities.forEach(opp => {
                    const chain = opp.blockchain || 'unknown';
                    debugInfo.chain_distribution[chain] = (debugInfo.chain_distribution[chain] || 0) + 1;
                });
                res.json({
                    success: true,
                    ...debugInfo,
                    all_opportunities: opportunities.map(opp => ({
                        symbol: opp.symbol,
                        blockchain: opp.blockchain || null,
                        contractAddress: opp.contractAddress || null,
                        chainId: opp.chainId || null,
                        buyExchange: opp.buyExchange,
                        sellExchange: opp.sellExchange,
                        buyPrice: opp.buyPrice,
                        sellPrice: opp.sellPrice,
                        profitPercentage: opp.profitPercentage,
                        profitAmount: opp.profitAmount,
                        volume: opp.volume,
                        liquidityUsd: opp.liquidityUsd || null,
                        confidenceScore: opp.confidenceScore || null,
                        risks: opp.risks || [],
                        executable: opp.executable !== false,
                        timestamp: opp.timestamp
                    }))
                });
            }
            catch (error) {
                console.error('Debug API error:', error);
                res.status(500).json({
                    success: false,
                    error: 'Failed to fetch opportunities',
                    count: 0,
                    details: error instanceof Error ? error.message : 'Unknown error'
                });
            }
        });
        // API route to get arbitrage opportunities
        this.app.get('/api/opportunities', async (req, res) => {
            // Add cache-busting headers to prevent browser caching of stale data
            res.set({
                'Cache-Control': 'no-cache, no-store, must-revalidate',
                'Pragma': 'no-cache',
                'Expires': '0'
            });
            try {
                // Get live opportunities from the arbitrage service (most recent data)
                const liveOpportunities = await this.arbitrageService.getRecentOpportunities(30); // Last 30 minutes
                console.log(`📊 Found ${liveOpportunities.length} live opportunities from arbitrage service`);
                // Log blockchain distribution from database
                const dbBlockchainCount = new Map();
                liveOpportunities.forEach(opp => {
                    const chain = opp.blockchain || 'null';
                    dbBlockchainCount.set(chain, (dbBlockchainCount.get(chain) || 0) + 1);
                });
                if (dbBlockchainCount.size > 0) {
                    console.log(`   📊 Blockchain distribution from database:`);
                    const sorted = Array.from(dbBlockchainCount.entries()).sort((a, b) => b[1] - a[1]);
                    sorted.forEach(([blockchain, count]) => {
                        console.log(`      - ${blockchain}: ${count} opportunities`);
                    });
                }
                if (liveOpportunities.length > 0) {
                    // Deduplicate opportunities - keep only the most profitable per coin pair
                    // CRITICAL: Include blockchain in key to prevent cross-chain duplicates
                    const uniqueOpportunities = liveOpportunities.reduce((acc, current) => {
                        // Normalize blockchain for key (use null if not set, don't default to 'ethereum')
                        const blockchainKey = (current.blockchain || 'null').toLowerCase();
                        const key = `${current.symbol}-${blockchainKey}-${current.buyExchange}-${current.sellExchange}`;
                        const existing = acc.find(opp => {
                            const oppBlockchainKey = (opp.blockchain || 'null').toLowerCase();
                            return opp.symbol === current.symbol &&
                                oppBlockchainKey === blockchainKey &&
                                opp.buyExchange === current.buyExchange &&
                                opp.sellExchange === current.sellExchange;
                        });
                        if (!existing || current.profitPercentage > existing.profitPercentage) {
                            // Remove existing and add current (most profitable)
                            const filtered = acc.filter(opp => {
                                const oppBlockchainKey = (opp.blockchain || 'null').toLowerCase();
                                return !(opp.symbol === current.symbol &&
                                    oppBlockchainKey === blockchainKey &&
                                    opp.buyExchange === current.buyExchange &&
                                    opp.sellExchange === current.sellExchange);
                            });
                            filtered.push(current);
                            return filtered;
                        }
                        return acc;
                    }, []);
                    // Apply chain diversity filter: show all opportunities
                    const diverseOpportunities = this.applyChainDiversityFilter(uniqueOpportunities);
                    // Sort by profit percentage (highest first)
                    diverseOpportunities.sort((a, b) => b.profitPercentage - a.profitPercentage);
                    console.log(`📊 Filtered to ${diverseOpportunities.length} diverse chain opportunities`);
                    // Extract all unique blockchains from opportunities
                    const allBlockchainsSet = new Set();
                    diverseOpportunities.forEach(opp => {
                        if (opp.blockchain) {
                            allBlockchainsSet.add(opp.blockchain);
                        }
                    });
                    // Also get all supported blockchains from connected exchanges
                    try {
                        const exchangeManager = this.arbitrageService.getExchangeManager();
                        const exchangeStatuses = exchangeManager.getExchangeStatus();
                        const connectedExchanges = exchangeStatuses.filter(status => status.isOnline);
                        // Get all supported blockchains from TokenMetadataService
                        connectedExchanges.forEach(exchangeStatus => {
                            const exchangeId = exchangeStatus.name.toLowerCase();
                            try {
                                const supportedBlockchains = this.tokenMetadataService.getSupportedBlockchains(exchangeId);
                                if (supportedBlockchains && supportedBlockchains.length > 0) {
                                    supportedBlockchains.forEach(chain => allBlockchainsSet.add(chain));
                                }
                            }
                            catch (error) {
                                console.warn(`Could not get supported blockchains for ${exchangeId}:`, error);
                            }
                        });
                    }
                    catch (error) {
                        console.warn('Could not get blockchains from exchanges:', error);
                    }
                    // Also try to get blockchains from current tickers if available
                    try {
                        const exchangeManager = this.arbitrageService.getExchangeManager();
                        const allTickers = exchangeManager.getAllTickers();
                        for (const tickers of allTickers.values()) {
                            tickers.forEach(ticker => {
                                if (ticker.blockchain) {
                                    allBlockchainsSet.add(ticker.blockchain);
                                }
                            });
                        }
                    }
                    catch (error) {
                        console.warn('Could not get blockchains from tickers:', error);
                    }
                    const allBlockchains = Array.from(allBlockchainsSet);
                    console.log(`📊 Found ${allBlockchains.length} unique blockchains in scan: ${allBlockchains.join(', ')}`);
                    // Group opportunities by blockchain (top 5 per blockchain)
                    const groupedByBlockchain = this.groupOpportunitiesByBlockchain(diverseOpportunities, allBlockchains);
                    console.log(`📊 Grouped opportunities: ${Object.keys(groupedByBlockchain).length} blockchains`);
                    // Map opportunities for response
                    const mappedOpportunities = diverseOpportunities.map(opp => ({
                        symbol: opp.symbol,
                        buyExchange: opp.buyExchange,
                        sellExchange: opp.sellExchange,
                        buyPrice: opp.buyPrice,
                        sellPrice: opp.sellPrice,
                        profitPercentage: opp.profitPercentage,
                        profitAmount: opp.profitAmount,
                        volume: opp.volume,
                        // Multi-chain support
                        blockchains: (this.tokenMetadataService.getTokenMetadata(opp.symbol) || []).map(m => m.blockchain),
                        blockchain: opp.blockchain || (this.tokenMetadataService.getTokenMetadata(opp.symbol)?.[0]?.blockchain) || null, // Use actual blockchain, don't default to ethereum
                        timestamp: opp.timestamp,
                        transferAvailability: opp.transferAvailability || {
                            buyAvailable: true,
                            sellAvailable: true,
                            commonNetworks: opp.blockchain ? [opp.blockchain] : []
                        }
                    }));
                    // Map grouped opportunities for response
                    const mappedGrouped = {};
                    Object.keys(groupedByBlockchain).forEach(blockchain => {
                        mappedGrouped[blockchain] = groupedByBlockchain[blockchain].map(opp => ({
                            symbol: opp.symbol,
                            buyExchange: opp.buyExchange,
                            sellExchange: opp.sellExchange,
                            buyPrice: opp.buyPrice,
                            sellPrice: opp.sellPrice,
                            profitPercentage: opp.profitPercentage,
                            profitAmount: opp.profitAmount,
                            volume: opp.volume,
                            blockchains: (this.tokenMetadataService.getTokenMetadata(opp.symbol) || []).map(m => m.blockchain),
                            blockchain: opp.blockchain || (this.tokenMetadataService.getTokenMetadata(opp.symbol)?.[0]?.blockchain) || null, // Use actual blockchain, don't default to ethereum
                            timestamp: opp.timestamp,
                            transferAvailability: opp.transferAvailability || {
                                buyAvailable: true,
                                sellAvailable: true,
                                commonNetworks: opp.blockchain ? [opp.blockchain] : []
                            }
                        }));
                    });
                    res.json({
                        success: true,
                        data: mappedOpportunities,
                        grouped: mappedGrouped // Add grouped data for UI
                    });
                    return;
                }
            }
            catch (liveError) {
                console.warn('Live opportunities API error:', liveError);
            }
            // Fallback: Try database with deduplication
            try {
                const opportunities = await this.db.getArbitrageModel().getRecentOpportunities(30); // Last 30 minutes
                if (opportunities && opportunities.length > 0) {
                    console.log(`📊 Found ${opportunities.length} opportunities from database`);
                    // Deduplicate opportunities - keep only the most profitable per coin pair
                    // CRITICAL: Include blockchain in key to prevent cross-chain duplicates
                    const uniqueOpportunities = opportunities.reduce((acc, current) => {
                        // Normalize blockchain for key (use null if not set, don't default to 'ethereum')
                        const blockchainKey = (current.blockchain || 'null').toLowerCase();
                        const key = `${current.symbol}-${blockchainKey}-${current.buyExchange}-${current.sellExchange}`;
                        const existing = acc.find(opp => {
                            const oppBlockchainKey = (opp.blockchain || 'null').toLowerCase();
                            return opp.symbol === current.symbol &&
                                oppBlockchainKey === blockchainKey &&
                                opp.buyExchange === current.buyExchange &&
                                opp.sellExchange === current.sellExchange;
                        });
                        if (!existing || current.profitPercentage > existing.profitPercentage) {
                            // Remove existing and add current (most profitable)
                            const filtered = acc.filter(opp => {
                                const oppBlockchainKey = (opp.blockchain || 'null').toLowerCase();
                                return !(opp.symbol === current.symbol &&
                                    oppBlockchainKey === blockchainKey &&
                                    opp.buyExchange === current.buyExchange &&
                                    opp.sellExchange === current.sellExchange);
                            });
                            filtered.push(current);
                            return filtered;
                        }
                        return acc;
                    }, []);
                    // Apply chain diversity filter: show all opportunities
                    const diverseOpportunities = this.applyChainDiversityFilter(uniqueOpportunities);
                    // Sort by profit percentage (highest first)
                    diverseOpportunities.sort((a, b) => b.profitPercentage - a.profitPercentage);
                    console.log(`📊 Filtered to ${diverseOpportunities.length} diverse chain opportunities`);
                    // Extract all unique blockchains from opportunities
                    const allBlockchainsSet = new Set();
                    diverseOpportunities.forEach(opp => {
                        if (opp.blockchain) {
                            allBlockchainsSet.add(opp.blockchain);
                        }
                    });
                    // Also get all supported blockchains from connected exchanges
                    try {
                        const exchangeManager = this.arbitrageService.getExchangeManager();
                        const exchangeStatuses = exchangeManager.getExchangeStatus();
                        const connectedExchanges = exchangeStatuses.filter(status => status.isOnline);
                        // Get all supported blockchains from TokenMetadataService
                        connectedExchanges.forEach(exchangeStatus => {
                            const exchangeId = exchangeStatus.name.toLowerCase();
                            try {
                                const supportedBlockchains = this.tokenMetadataService.getSupportedBlockchains(exchangeId);
                                if (supportedBlockchains && supportedBlockchains.length > 0) {
                                    supportedBlockchains.forEach(chain => allBlockchainsSet.add(chain));
                                }
                            }
                            catch (error) {
                                console.warn(`Could not get supported blockchains for ${exchangeId}:`, error);
                            }
                        });
                    }
                    catch (error) {
                        console.warn('Could not get blockchains from exchanges:', error);
                    }
                    // Also try to get blockchains from current tickers if available
                    try {
                        const exchangeManager = this.arbitrageService.getExchangeManager();
                        const allTickers = exchangeManager.getAllTickers();
                        for (const tickers of allTickers.values()) {
                            tickers.forEach(ticker => {
                                if (ticker.blockchain) {
                                    allBlockchainsSet.add(ticker.blockchain);
                                }
                            });
                        }
                    }
                    catch (error) {
                        console.warn('Could not get blockchains from tickers:', error);
                    }
                    const allBlockchains = Array.from(allBlockchainsSet);
                    console.log(`📊 Found ${allBlockchains.length} unique blockchains in scan: ${allBlockchains.join(', ')}`);
                    // Group opportunities by blockchain (top 5 per blockchain)
                    const groupedByBlockchain = this.groupOpportunitiesByBlockchain(diverseOpportunities, allBlockchains);
                    console.log(`📊 Grouped opportunities: ${Object.keys(groupedByBlockchain).length} blockchains`);
                    // Map opportunities for response
                    const mappedOpportunities = diverseOpportunities.map(opp => ({
                        symbol: opp.symbol,
                        buyExchange: opp.buyExchange,
                        sellExchange: opp.sellExchange,
                        buyPrice: opp.buyPrice,
                        sellPrice: opp.sellPrice,
                        profitPercentage: opp.profitPercentage,
                        profitAmount: opp.profitAmount,
                        volume: opp.volume,
                        // Multi-chain support
                        blockchains: (this.tokenMetadataService.getTokenMetadata(opp.symbol) || []).map(m => m.blockchain),
                        blockchain: opp.blockchain || (this.tokenMetadataService.getTokenMetadata(opp.symbol)?.[0]?.blockchain) || null, // Use actual blockchain, don't default to ethereum
                        timestamp: opp.timestamp,
                        transferAvailability: opp.transferAvailability || {
                            buyAvailable: true,
                            sellAvailable: true,
                            commonNetworks: opp.blockchain ? [opp.blockchain] : []
                        }
                    }));
                    // Map grouped opportunities for response
                    const mappedGrouped = {};
                    Object.keys(groupedByBlockchain).forEach(blockchain => {
                        mappedGrouped[blockchain] = groupedByBlockchain[blockchain].map(opp => ({
                            symbol: opp.symbol,
                            buyExchange: opp.buyExchange,
                            sellExchange: opp.sellExchange,
                            buyPrice: opp.buyPrice,
                            sellPrice: opp.sellPrice,
                            profitPercentage: opp.profitPercentage,
                            profitAmount: opp.profitAmount,
                            volume: opp.volume,
                            blockchains: (this.tokenMetadataService.getTokenMetadata(opp.symbol) || []).map(m => m.blockchain),
                            blockchain: opp.blockchain || (this.tokenMetadataService.getTokenMetadata(opp.symbol)?.[0]?.blockchain) || null, // Use actual blockchain, don't default to ethereum
                            timestamp: opp.timestamp,
                            transferAvailability: opp.transferAvailability || {
                                buyAvailable: true,
                                sellAvailable: true,
                                commonNetworks: opp.blockchain ? [opp.blockchain] : []
                            }
                        }));
                    });
                    res.json({
                        success: true,
                        data: mappedOpportunities,
                        grouped: mappedGrouped // Add grouped data for UI
                    });
                    return;
                }
            }
            catch (dbError) {
                console.warn('Database query failed:', dbError.message);
            }
            // NO SAMPLE DATA - Return empty array if no real data
            console.log('⚠️ WARNING: No real opportunities found in database!');
            console.log('❌ NOT generating sample data - returning empty array');
            res.json({
                success: true,
                data: [],
                meta: {
                    message: 'No opportunities found - scanner is running but no profitable arbitrage detected'
                }
            });
        });
        // API route to get exchange status
        this.app.get('/api/status', async (req, res) => {
            // Add cache-busting headers to prevent browser caching of stale data
            res.set({
                'Cache-Control': 'no-cache, no-store, must-revalidate',
                'Pragma': 'no-cache',
                'Expires': '0'
            });
            try {
                const exchangeManager = this.arbitrageService.getExchangeManager();
                const exchangeStatuses = exchangeManager.getExchangeStatus();
                // Count connected exchanges
                const connectedExchanges = exchangeStatuses.filter(status => status.isOnline).length;
                res.json({
                    database: 'connected',
                    exchanges: exchangeStatuses.map(status => status.name),
                    connectedCount: connectedExchanges,
                    lastUpdate: new Date().toISOString(),
                    uptime: process.uptime()
                });
            }
            catch (error) {
                console.error('Status API error:', error);
                res.status(500).json({
                    success: false,
                    error: 'Failed to get status'
                });
            }
        });
        // API route to manually trigger a scan (for debugging/testing)
        this.app.post('/api/scan/trigger', async (req, res) => {
            try {
                console.log('🔄 [MANUAL TRIGGER] User requested manual scan via API');
                console.log('🔄 [MANUAL TRIGGER] Request headers:', req.headers);
                console.log('🔄 [MANUAL TRIGGER] Request method:', req.method);
                // Start scan in background (don't wait for it to complete)
                this.arbitrageService.triggerManualScan().catch(error => {
                    console.error('❌ Manual scan failed:', error);
                });
                console.log('✅ [MANUAL TRIGGER] Scan started successfully');
                res.json({
                    success: true,
                    message: 'Scan started! Check Railway logs for detailed progress. This will take 30-60 seconds.',
                    timestamp: new Date().toISOString()
                });
            }
            catch (error) {
                console.error('❌ [MANUAL TRIGGER] Error:', error);
                res.status(500).json({
                    success: false,
                    error: 'Failed to trigger scan',
                    details: error instanceof Error ? error.message : 'Unknown error'
                });
            }
        });
        // API route to clear all opportunities (for debugging) - REQUIRES AUTH
        this.app.post('/api/opportunities/clear', this.requireAuth.bind(this), async (req, res) => {
            try {
                console.log('🗑️ [CLEAR] Authenticated user requested to clear all opportunities');
                await this.db.getArbitrageModel().clearAllOpportunities();
                res.json({
                    success: true,
                    message: 'All opportunities cleared from database'
                });
            }
            catch (error) {
                console.error('Clear opportunities error:', error);
                res.status(500).json({
                    success: false,
                    error: 'Failed to clear opportunities'
                });
            }
        });
        // API route to get statistics
        this.app.get('/api/stats', async (req, res) => {
            // Add cache-busting headers to prevent browser caching of stale data
            res.set({
                'Cache-Control': 'no-cache, no-store, must-revalidate',
                'Pragma': 'no-cache',
                'Expires': '0'
            });
            try {
                // Get live opportunities to calculate real-time stats
                const liveOpportunities = await this.arbitrageService.getRecentOpportunities(30); // Last 30 minutes
                if (liveOpportunities && liveOpportunities.length > 0) {
                    // Deduplicate for accurate stats
                    // CRITICAL: Include blockchain in key to prevent cross-chain duplicates
                    const uniqueOpportunities = liveOpportunities.reduce((acc, current) => {
                        const blockchainKey = (current.blockchain || 'null').toLowerCase();
                        const existing = acc.find(opp => {
                            const oppBlockchainKey = (opp.blockchain || 'null').toLowerCase();
                            return opp.symbol === current.symbol &&
                                oppBlockchainKey === blockchainKey &&
                                opp.buyExchange === current.buyExchange &&
                                opp.sellExchange === current.sellExchange;
                        });
                        if (!existing || current.profitPercentage > existing.profitPercentage) {
                            const filtered = acc.filter(opp => {
                                const oppBlockchainKey = (opp.blockchain || 'null').toLowerCase();
                                return !(opp.symbol === current.symbol &&
                                    oppBlockchainKey === blockchainKey &&
                                    opp.buyExchange === current.buyExchange &&
                                    opp.sellExchange === current.sellExchange);
                            });
                            filtered.push(current);
                            return filtered;
                        }
                        return acc;
                    }, []);
                    // Calculate stats
                    const totalOpportunities = uniqueOpportunities.length;
                    const profitPercentages = uniqueOpportunities.map(opp => opp.profitPercentage);
                    const averageProfit = profitPercentages.length > 0
                        ? profitPercentages.reduce((sum, profit) => sum + profit, 0) / profitPercentages.length
                        : 0;
                    const maxProfit = profitPercentages.length > 0 ? Math.max(...profitPercentages) : 0;
                    // Count unique exchanges
                    const exchanges = new Set();
                    uniqueOpportunities.forEach(opp => {
                        exchanges.add(opp.buyExchange);
                        exchanges.add(opp.sellExchange);
                    });
                    const connectedExchanges = exchanges.size;
                    const stats = {
                        total: totalOpportunities,
                        avgProfit: Math.round(averageProfit * 100) / 100,
                        maxProfit: Math.round(maxProfit * 100) / 100,
                        connectedCount: connectedExchanges
                    };
                    console.log(`📊 Calculated stats: ${JSON.stringify(stats)}`);
                    res.json({
                        success: true,
                        data: stats
                    });
                    return;
                }
                // Fallback: Try database stats
                const dbStats = await this.db.getArbitrageModel().getStatistics();
                if (dbStats && Object.keys(dbStats).length > 0) {
                    res.json({
                        success: true,
                        data: dbStats
                    });
                    return;
                }
                // Final fallback: Return zero stats
                res.json({
                    success: true,
                    data: {
                        total: 0,
                        avgProfit: 0,
                        maxProfit: 0,
                        connectedCount: 0
                    }
                });
            }
            catch (error) {
                console.error('Stats API error:', error);
                res.status(500).json({
                    success: false,
                    error: 'Failed to get statistics',
                    data: {
                        total: 0,
                        avgProfit: 0,
                        maxProfit: 0,
                        connectedCount: 0
                    }
                });
            }
        });
        // Blockchain scan endpoint
        this.app.get('/api/blockchain-scan', async (req, res) => {
            try {
                const { BlockchainScannerJob } = await import('../jobs/BlockchainScannerJob.js');
                const { BlockchainAggregator } = await import('../services/BlockchainAggregator.js');
                const job = new BlockchainScannerJob();
                const status = job.getStatus();
                const aggregator = new BlockchainAggregator();
                const data = aggregator.getAggregatedData();
                res.json({
                    success: true,
                    status,
                    statistics: {
                        totalTokens: data.size,
                        highConfidence: Array.from(data.values()).filter(t => t.confidence >= 80).length,
                        verified: Array.from(data.values()).filter(t => t.contractVerified).length
                    }
                });
            }
            catch (error) {
                console.error('Blockchain scan status error:', error);
                res.status(500).json({
                    success: false,
                    error: error.message || 'Failed to get scan status'
                });
            }
        });
        this.app.post('/api/blockchain-scan', async (req, res) => {
            try {
                const { BlockchainScannerJob } = await import('../jobs/BlockchainScannerJob.js');
                const { BlockchainAggregator } = await import('../services/BlockchainAggregator.js');
                console.log('🔄 Manual blockchain scan triggered via API');
                const startTime = Date.now();
                try {
                    await BlockchainScannerJob.runNow();
                    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
                    const aggregator = new BlockchainAggregator();
                    const data = aggregator.getAggregatedData();
                    res.json({
                        success: true,
                        message: 'Blockchain scan completed successfully',
                        duration: `${duration}s`,
                        statistics: {
                            totalTokens: data.size,
                            highConfidence: Array.from(data.values()).filter(t => t.confidence >= 80).length,
                            verified: Array.from(data.values()).filter(t => t.contractVerified).length
                        }
                    });
                }
                catch (error) {
                    console.error('❌ Blockchain scan error:', error);
                    res.status(500).json({
                        success: false,
                        error: error.message || 'Failed to run blockchain scan',
                        details: error.stack
                    });
                }
            }
            catch (error) {
                console.error('Blockchain scan API error:', error);
                res.status(500).json({
                    success: false,
                    error: 'Internal server error',
                    details: error.message
                });
            }
        });
        // Health check endpoint (simple, always works)
        this.app.get('/api/health', (req, res) => {
            try {
                res.json({
                    status: 'OK',
                    timestamp: Date.now(),
                    environment: process.env.NODE_ENV || 'development'
                });
            }
            catch (error) {
                res.status(500).json({
                    status: 'ERROR',
                    error: error.message
                });
            }
        });
        // Serve React app for all other routes (fallback)
        this.app.get('*', (req, res) => {
            const miniappPath = path.join(__dirname, '../../dist/index.html');
            const fallbackPath = path.join(__dirname, 'public', 'index.html');
            if (fs.existsSync(miniappPath)) {
                res.sendFile(miniappPath);
            }
            else if (fs.existsSync(fallbackPath)) {
                res.sendFile(fallbackPath);
            }
            else {
                res.status(404).send('Application not ready. Health check at /api/health');
            }
        });
    }
    // Chain diversity filter: show ALL opportunities regardless of chain (removed limit)
    applyChainDiversityFilter(opportunities) {
        console.log(`🔍 [CHAIN FILTER] Input: ${opportunities.length} opportunities`);
        // Log blockchain distribution
        const chainCounts = {};
        opportunities.forEach(opp => {
            const chain = (opp.blockchain || 'unknown').toLowerCase();
            chainCounts[chain] = (chainCounts[chain] || 0) + 1;
        });
        console.log('📊 [CHAIN FILTER] Blockchain distribution:', chainCounts);
        // NO FILTERING - Show ALL real opportunities
        console.log(`✅ [CHAIN FILTER] Showing ALL ${opportunities.length} opportunities (no chain limit)`);
        return opportunities;
    }
    // Group opportunities by blockchain and return top 5 per blockchain
    // Also includes all blockchains found in tickers (even without opportunities)
    groupOpportunitiesByBlockchain(opportunities, allBlockchains = []) {
        const blockchainGroups = {};
        // Group by blockchain
        opportunities.forEach(opp => {
            // CRITICAL: Use actual blockchain from opportunity, don't default to ethereum
            // If blockchain is null/undefined, group as 'unknown' to see what's missing
            const blockchain = opp.blockchain || 'unknown';
            if (!blockchainGroups[blockchain]) {
                blockchainGroups[blockchain] = [];
            }
            blockchainGroups[blockchain].push(opp);
        });
        // Ensure all blockchains from scan are included (even if no opportunities)
        allBlockchains.forEach(blockchain => {
            if (!blockchainGroups[blockchain]) {
                blockchainGroups[blockchain] = []; // Empty array for blockchains with no opportunities
            }
        });
        // Sort each blockchain group by profit percentage and take top 5
        const result = {};
        Object.keys(blockchainGroups).forEach(blockchain => {
            result[blockchain] = blockchainGroups[blockchain]
                .sort((a, b) => b.profitPercentage - a.profitPercentage)
                .slice(0, 5); // Top 5 from each blockchain
        });
        return result;
    }
    async start(port) {
        return new Promise((resolve, reject) => {
            this.server = this.app.listen(port, () => {
                console.log(`🌐 Web app server running on port ${port}`);
                console.log(`📱 Mini app URL: http://localhost:${port}`);
                console.log(`🔍 Health check: http://localhost:${port}/api/health`);
                resolve();
            });
            this.server.on('error', (error) => {
                if (error.code === 'EADDRINUSE') {
                    console.error(`❌ Port ${port} is already in use`);
                }
                else {
                    console.error('❌ Server error:', error);
                }
                reject(error);
            });
        });
    }
    async stop() {
        return new Promise((resolve) => {
            if (this.server) {
                this.server.close(() => {
                    console.log('🛑 Web app server stopped');
                    resolve();
                });
            }
            else {
                resolve();
            }
        });
    }
}
//# sourceMappingURL=server.js.map