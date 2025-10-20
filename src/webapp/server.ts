import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { DatabaseManager } from '../database/Database.js';
import { UnifiedArbitrageService } from '../services/UnifiedArbitrageService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class WebAppServer {
  private app: express.Application;
  private server: any;
  private db: DatabaseManager;
  private arbitrageService: UnifiedArbitrageService;

  constructor() {
    this.app = express();
    this.db = DatabaseManager.getInstance();
    this.arbitrageService = UnifiedArbitrageService.getInstance();
    this.setupMiddleware();
    this.setupRoutes();
  }

  private setupMiddleware(): void {
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
        } else {
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

  private setupRoutes(): void {
    // Serve React mini app (updated to serve from dist/index.html)
    this.app.get('/', (req, res) => {
      const miniappPath = path.join(__dirname, '../../dist/index.html');
      if (fs.existsSync(miniappPath)) {
        res.sendFile(miniappPath);
      } else {
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
      } else {
        res.status(404).send('Mini app not found. Please build the React app first.');
      }
    });

    // API Routes

    // Debug API route to get all opportunities without filtering
    this.app.get('/api/debug/opportunities', async (req, res) => {
      try {
        const opportunities = await this.db.getArbitrageModel().getRecentOpportunities(60); // 60 minutes instead of 30
        
        res.json({ 
          success: true, 
          data: opportunities.map(opp => ({
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
          count: opportunities.length,
          cutoffTime: new Date(Date.now() - 60 * 60 * 1000).toISOString()
        });
      } catch (error) {
        console.error('Debug API error:', error);
        res.status(500).json({ 
          success: false, 
          error: 'Failed to fetch opportunities',
          count: 0
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
        
        if (liveOpportunities.length > 0) {
          // Deduplicate opportunities - keep only the most profitable per coin pair
          const uniqueOpportunities = liveOpportunities.reduce((acc: any[], current: any) => {
            const key = `${current.symbol}-${current.buyExchange}-${current.sellExchange}`;
            const existing = acc.find(opp => 
              opp.symbol === current.symbol && 
              opp.buyExchange === current.buyExchange && 
              opp.sellExchange === current.sellExchange
            );
            
            if (!existing || current.profitPercentage > existing.profitPercentage) {
              // Remove existing and add current (most profitable)
              const filtered = acc.filter(opp => 
                !(opp.symbol === current.symbol && 
                  opp.buyExchange === current.buyExchange && 
                  opp.sellExchange === current.sellExchange)
              );
              filtered.push(current);
              return filtered;
            }
            return acc;
          }, []);
          
          // Sort by profit percentage (highest first)
          uniqueOpportunities.sort((a, b) => b.profitPercentage - a.profitPercentage);
          
          console.log(`📊 Deduplicated to ${uniqueOpportunities.length} unique opportunities`);
          
          res.json({
            success: true,
            data: uniqueOpportunities.map(opp => ({
              symbol: opp.symbol,
              buyExchange: opp.buyExchange,
              sellExchange: opp.sellExchange,
              buyPrice: opp.buyPrice,
              sellPrice: opp.sellPrice,
              profitPercentage: opp.profitPercentage,
              profitAmount: opp.profitAmount,
              volume: opp.volume,
              blockchain: opp.blockchain || 'ethereum',
              timestamp: opp.timestamp
            }))
          });
          return;
        }
      } catch (liveError) {
        console.warn('Live opportunities API error:', liveError);
      }

      // Fallback: Try database with deduplication
      try {
        const opportunities = await this.db.getArbitrageModel().getRecentOpportunities(30); // Last 30 minutes
        
        if (opportunities && opportunities.length > 0) {
          console.log(`📊 Found ${opportunities.length} opportunities from database`);
          
          // Deduplicate opportunities - keep only the most profitable per coin pair
          const uniqueOpportunities = opportunities.reduce((acc: any[], current: any) => {
            const key = `${current.symbol}-${current.buyExchange}-${current.sellExchange}`;
            const existing = acc.find(opp => 
              opp.symbol === current.symbol && 
              opp.buyExchange === current.buyExchange && 
              opp.sellExchange === current.sellExchange
            );
            
            if (!existing || current.profitPercentage > existing.profitPercentage) {
              // Remove existing and add current (most profitable)
              const filtered = acc.filter(opp => 
                !(opp.symbol === current.symbol && 
                  opp.buyExchange === current.buyExchange && 
                  opp.sellExchange === current.sellExchange)
              );
              filtered.push(current);
              return filtered;
            }
            return acc;
          }, []);
          
          // Sort by profit percentage (highest first)
          uniqueOpportunities.sort((a, b) => b.profitPercentage - a.profitPercentage);
          
          console.log(`📊 Deduplicated to ${uniqueOpportunities.length} unique opportunities`);
          
          res.json({
            success: true,
            data: uniqueOpportunities.map(opp => ({
              symbol: opp.symbol,
              buyExchange: opp.buyExchange,
              sellExchange: opp.sellExchange,
              buyPrice: opp.buyPrice,
              sellPrice: opp.sellPrice,
              profitPercentage: opp.profitPercentage,
              profitAmount: opp.profitAmount,
              volume: opp.volume,
              blockchain: opp.blockchain || 'ethereum',
              timestamp: opp.timestamp
            }))
          });
          return;
        }
      } catch (dbError) {
        console.warn('Database query failed:', dbError.message);
      }

      // Final fallback: Generate some sample opportunities for UI testing
      console.log('⚠️ WARNING: No real opportunities found in database!');
      console.log('📊 Generating sample data for UI testing - THIS IS NOT REAL DATA');
      const sampleOpportunities = [
        {
          symbol: 'DEFIUSDT',
          buyExchange: 'mexc',
          sellExchange: 'bybit',
          buyPrice: 0.001912,
          sellPrice: 0.002497,
          profitPercentage: 30.14,
          profitAmount: 0.000585,
          volume: 1000000,
          blockchain: 'ethereum',
          timestamp: Date.now()
        },
        {
          symbol: 'COAUSDT',
          buyExchange: 'mexc',
          sellExchange: 'bybit',
          buyPrice: 0.00543,
          sellPrice: 0.005694,
          profitPercentage: 4.55,
          profitAmount: 0.000264,
          volume: 500000,
          blockchain: 'bsc',
          timestamp: Date.now()
        },
        {
          symbol: 'DUELUSDT',
          buyExchange: 'mexc',
          sellExchange: 'bybit',
          buyPrice: 0.000453,
          sellPrice: 0.0004613,
          profitPercentage: 1.53,
          profitAmount: 0.0000083,
          volume: 2000000,
          blockchain: 'polygon',
          timestamp: Date.now()
        },
        {
          symbol: 'UUSDT',
          buyExchange: 'mexc',
          sellExchange: 'bybit',
          buyPrice: 0.010279,
          sellPrice: 0.010408,
          profitPercentage: 0.95,
          profitAmount: 0.000129,
          volume: 3000000,
          blockchain: 'arbitrum',
          timestamp: Date.now()
        },
        {
          symbol: 'ELF-USDT',
          buyExchange: 'kucoin',
          sellExchange: 'okx',
          buyPrice: 0.1751,
          sellPrice: 0.1768,
          profitPercentage: 0.77,
          profitAmount: 0.0017,
          volume: 100000,
          blockchain: 'solana',
          timestamp: Date.now()
        }
      ];
      
      res.json({
        success: true,
        data: sampleOpportunities,
        meta: {
          isSampleData: true,
          message: 'Sample data - arbitrage scanner may not be running or no opportunities found'
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
      } catch (error) {
        console.error('Status API error:', error);
        res.status(500).json({ 
          success: false, 
          error: 'Failed to get status' 
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
          const uniqueOpportunities = liveOpportunities.reduce((acc: any[], current: any) => {
            const existing = acc.find(opp => 
              opp.symbol === current.symbol && 
              opp.buyExchange === current.buyExchange && 
              opp.sellExchange === current.sellExchange
            );
            
            if (!existing || current.profitPercentage > existing.profitPercentage) {
              const filtered = acc.filter(opp => 
                !(opp.symbol === current.symbol && 
                  opp.buyExchange === current.buyExchange && 
                  opp.sellExchange === current.sellExchange)
              );
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
        
      } catch (error) {
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

    // Health check endpoint (simple, always works)
    this.app.get('/api/health', (req, res) => {
      try {
        res.json({ 
          status: 'OK',
          timestamp: Date.now(),
          environment: process.env.NODE_ENV || 'development'
        });
      } catch (error) {
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
      } else if (fs.existsSync(fallbackPath)) {
        res.sendFile(fallbackPath);
      } else {
        res.status(404).send('Application not ready. Health check at /api/health');
      }
    });
  }

  public async start(port: number): Promise<void> {
    return new Promise((resolve, reject) => {
      this.server = this.app.listen(port, () => {
        console.log(`🌐 Web app server running on port ${port}`);
        console.log(`📱 Mini app URL: http://localhost:${port}`);
        console.log(`🔍 Health check: http://localhost:${port}/api/health`);
        resolve();
      });

      this.server.on('error', (error: any) => {
        if (error.code === 'EADDRINUSE') {
          console.error(`❌ Port ${port} is already in use`);
        } else {
          console.error('❌ Server error:', error);
        }
        reject(error);
      });
    });
  }

  public async stop(): Promise<void> {
    return new Promise((resolve) => {
      if (this.server) {
        this.server.close(() => {
          console.log('🛑 Web app server stopped');
          resolve();
        });
      } else {
        resolve();
      }
    });
  }
}
