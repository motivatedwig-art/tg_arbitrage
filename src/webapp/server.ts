import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
import { DatabaseManager } from '../database/Database.js';
import { ExchangeManager } from '../exchanges/ExchangeManager.js';

export class WebAppServer {
  private app: express.Application;
  private server: any;
  private db: DatabaseManager;
  private exchangeManager: ExchangeManager;

  constructor() {
    this.app = express();
    this.db = DatabaseManager.getInstance();
    this.exchangeManager = ExchangeManager.getInstance();
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
          connectSrc: ["'self'", "wss:", "https:"],
        },
      },
    }));

    // CORS middleware
    this.app.use(cors({
      origin: process.env.WEBAPP_URL || '*',
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
    // Serve React mini app
    this.app.get('/', (req, res) => {
      const miniappPath = path.join(__dirname, '../../dist/index.html');
      if (fs.existsSync(miniappPath)) {
        res.sendFile(miniappPath);
      } else {
        res.sendFile(path.join(__dirname, 'public', 'index.html'));
      }
    });

    // Serve React mini app static assets
    this.app.use('/assets', express.static(path.join(__dirname, '../../dist/assets')));
    
    // Fallback for React mini app routing
    this.app.get('/miniapp*', (req, res) => {
      const miniappPath = path.join(__dirname, '../../dist/index.html');
      if (fs.existsSync(miniappPath)) {
        res.sendFile(miniappPath);
      } else {
        res.status(404).send('Mini app not found. Please build the React app first.');
      }
    });

    // API route to get arbitrage opportunities
    this.app.get('/api/opportunities', async (req, res) => {
      try {
        const opportunities = await this.db.getArbitrageModel().getRecentOpportunities(30);
        res.json({
          success: true,
          data: opportunities,
          timestamp: Date.now()
        });
      } catch (error) {
        console.error('Error fetching opportunities:', error);
        res.status(500).json({
          success: false,
          error: 'Failed to fetch opportunities'
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
      } catch (error) {
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
      } catch (error) {
        console.error('Error fetching stats:', error);
        res.status(500).json({
          success: false,
          error: 'Failed to fetch statistics'
        });
      }
    });

    // Health check
    this.app.get('/health', (req, res) => {
      res.json({ status: 'OK', timestamp: Date.now() });
    });
  }

  public start(port: number = 3000): Promise<void> {
    return new Promise((resolve, reject) => {
      // Try to find an available port
      const tryPort = (attemptPort: number) => {
        this.server = this.app.listen(attemptPort, () => {
          console.log(`🌐 Web app server running on port ${attemptPort}`);
          const webAppUrl = process.env.WEBAPP_URL || `http://localhost:${attemptPort}`;
          console.log(`📱 Mini app URL: ${webAppUrl}`);
          resolve();
        });

        this.server.on('error', (error: any) => {
          if (error.code === 'EADDRINUSE') {
            console.log(`Port ${attemptPort} is in use, trying ${attemptPort + 1}...`);
            this.server.close();
            tryPort(attemptPort + 1);
          } else {
            reject(error);
          }
        });
      };

      tryPort(port);
    });
  }

  public stop(): Promise<void> {
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
