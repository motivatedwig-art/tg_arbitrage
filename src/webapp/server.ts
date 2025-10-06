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
      try {
        const opportunities = await this.db.getArbitrageModel().getRecentOpportunities(30);
        
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
          }))
        });
      } catch (error) {
        console.error('Opportunities API error:', error);
        res.status(500).json({ 
          success: false, 
          error: 'Failed to fetch opportunities' 
        });
      }
    });

    // API route to get exchange status
    this.app.get('/api/status', async (req, res) => {
      try {
        const exchangeManager = this.arbitrageService.getExchangeManager();
        const exchangeStatuses = exchangeManager.getExchangeStatus();
        
        res.json({
          database: 'connected',
          exchanges: Object.keys(exchangeStatuses),
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
      try {
        const stats = await this.db.getArbitrageModel().getStatistics();
        res.json({
          success: true,
          ...stats
        });
      } catch (error) {
        console.error('Stats API error:', error);
        res.status(500).json({ 
          success: false, 
          error: 'Failed to get statistics' 
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
