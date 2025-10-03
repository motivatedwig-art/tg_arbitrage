import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { DatabaseManager } from '../database/Database.js';
import { ExchangeManager } from '../exchanges/ExchangeManager.js';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
export class WebAppServer {
    constructor() {
        this.app = express();
        this.db = DatabaseManager.getInstance();
        this.exchangeManager = ExchangeManager.getInstance();
        this.setupMiddleware();
        this.setupRoutes();
    }
    setupMiddleware() {
        // Security middleware
        this.app.use(helmet({
            contentSecurityPolicy: {
                directives: {
                    defaultSrc: ["'self'"],
                    scriptSrc: ["'self'", "'unsafe-inline'", "https://telegram.org"],
                    styleSrc: ["'self'", "'unsafe-inline'"],
                    imgSrc: ["'self'", "data:", "https:"],
                    connectSrc: ["'self'", "https://api.binance.com", "https://www.okx.com", "https://api.bybit.com"],
                },
            },
        }));
        // Configure CORS for Telegram and your domains
        this.app.use(cors({
            origin: (origin, callback) => {
                const allowedOrigins = [
                    'https://web.telegram.org',
                    'https://telegram.org',
                    process.env.WEBAPP_URL,
                    'http://localhost:3000',
                    'http://localhost:5173'
                ];
                if (!origin || allowedOrigins.includes(origin) || origin.includes('.telegram.org')) {
                    callback(null, true);
                }
                else {
                    callback(null, true); // Allow all origins for Telegram compatibility
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
    setupRoutes() {
        // Serve React mini app
        this.app.get('/', (req, res) => {
            const miniappPath = path.join(__dirname, '../../dist/index.html');
            if (fs.existsSync(miniappPath)) {
                res.sendFile(miniappPath);
            }
            else {
                res.sendFile(path.join(__dirname, 'public', 'index.html'));
            }
        });
        // Serve React mini app static assets
        this.app.use('/assets', express.static(path.join(__dirname, '../../dist/assets')));
        // Serve additional static files from dist
        this.app.use('/favicon.svg', express.static(path.join(__dirname, '../../dist/favicon.svg')));
        this.app.use('/manifest.webmanifest', express.static(path.join(__dirname, '../../dist/manifest.webmanifest')));
        this.app.use('/registerSW.js', express.static(path.join(__dirname, '../../dist/registerSW.js')));
        this.app.use('/sw.js', express.static(path.join(__dirname, '../../dist/sw.js')));
        this.app.use('/workbox-5ffe50d4.js', express.static(path.join(__dirname, '../../dist/workbox-5ffe50d4.js')));
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
        // API route to get arbitrage opportunities
        this.app.get('/api/opportunities', async (req, res) => {
            try {
                const opportunities = await this.db.getArbitrageModel().getRecentOpportunities(30);
                // Filter out mock data characteristics
                const realOpportunities = opportunities.filter(opp => {
                    return opp.profitPercentage > 0.1 &&
                        opp.profitPercentage < 5 && // Realistic profit range
                        opp.buyPrice > 0 &&
                        opp.sellPrice > 0;
                });
                res.json({
                    success: true,
                    data: realOpportunities.map(opp => ({
                        symbol: opp.symbol,
                        buyExchange: opp.buyExchange,
                        sellExchange: opp.sellExchange,
                        buyPrice: opp.buyPrice,
                        sellPrice: opp.sellPrice,
                        profitPercentage: opp.profitPercentage,
                        profitAmount: opp.profitAmount,
                        volume: opp.volume,
                        timestamp: opp.timestamp
                    })),
                    timestamp: Date.now()
                });
            }
            catch (error) {
                console.error('API error:', error);
                res.status(500).json({
                    success: false,
                    error: 'Failed to fetch opportunities',
                    message: error.message
                });
            }
        });
        // API route to get exchange status
        this.app.get('/api/status', async (req, res) => {
            try {
                const exchangeStatuses = this.exchangeManager.getExchangeStatus();
                const connectedExchanges = this.exchangeManager.getConnectedExchanges();
                const lastUpdate = this.exchangeManager.getLastUpdateTime();
                res.json({
                    success: true,
                    data: {
                        exchanges: exchangeStatuses,
                        connectedCount: connectedExchanges.length,
                        lastUpdate: lastUpdate
                    }
                });
            }
            catch (error) {
                console.error('Error fetching status:', error);
                res.status(500).json({
                    success: false,
                    error: 'Failed to fetch status'
                });
            }
        });
        // API route to get statistics
        this.app.get('/api/stats', async (req, res) => {
            try {
                const stats = await this.db.getArbitrageModel().getStatistics();
                res.json({
                    success: true,
                    data: stats
                });
            }
            catch (error) {
                console.error('Error fetching stats:', error);
                res.status(500).json({
                    success: false,
                    error: 'Failed to fetch statistics'
                });
            }
        });
        // Health check endpoint
        this.app.get('/api/health', (req, res) => {
            res.json({
                status: 'OK',
                timestamp: Date.now(),
                environment: process.env.NODE_ENV,
                mockData: process.env.USE_MOCK_DATA === 'true'
            });
        });
        // Legacy health check
        this.app.get('/health', (req, res) => {
            res.json({ status: 'OK', timestamp: Date.now() });
        });
        // Serve React app for all other routes
        this.app.get('*', (req, res) => {
            res.sendFile(path.join(__dirname, '../../dist/index.html'));
        });
    }
    start(port = 3000) {
        return new Promise((resolve, reject) => {
            // Try to find an available port
            const tryPort = (attemptPort) => {
                this.server = this.app.listen(attemptPort, () => {
                    console.log(`🌐 Web server running on port ${attemptPort}`);
                    console.log(`📊 Environment: ${process.env.NODE_ENV}`);
                    console.log(`📡 Mock Data: ${process.env.USE_MOCK_DATA === 'true' ? 'ENABLED' : 'DISABLED'}`);
                    resolve();
                });
                this.server.on('error', (error) => {
                    if (error.code === 'EADDRINUSE') {
                        console.log(`Port ${attemptPort} is in use, trying ${attemptPort + 1}...`);
                        this.server.close();
                        tryPort(attemptPort + 1);
                    }
                    else {
                        reject(error);
                    }
                });
            };
            tryPort(port);
        });
    }
    stop() {
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