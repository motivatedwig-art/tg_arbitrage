import dotenv from 'dotenv';
import { DatabaseManager } from '../database/Database.js';
import { ArbitrageScanner } from './ArbitrageScanner.js';

dotenv.config();

export class BackgroundProcessor {
  private db: DatabaseManager;
  private arbitrageScanner: ArbitrageScanner;
  private isProcessing = false;
  private healthcheckInterval: NodeJS.Timeout;

  constructor() {
    this.db = DatabaseManager.getInstance();
    this.arbitrageScanner = new ArbitrageScanner();
  }

  public async start(): Promise<void> {
    try {
      console.log('🚀 Starting Background Arbitrage Processor...');

      // Initialize database
      await this.db.init();

      // Start arbitrage scanner
      console.log('🔌 Starting arbitrage scanner...');
      await this.arbitrageScanner.start();

      // Start healthcheck (for Railway monitoring)
      this.startHealthcheck();

      console.log('✅ Background Processor is running!');
      console.log(`📊 Scanner running with ${process.env.SCAN_INTERVAL_MS || '15000'}ms interval`);
      console.log(`💰 Profit threshold: ${process.env.PROFIT_THRESHOLD || '0.002'} (${(Number(process.env.PROFIT_THRESHOLD || '0.002') * 100).toFixed(2)}%)`);

    } catch (error) {
      console.error('❌ Failed to start processor:', error);
      process.exit(1);
    }
  }

  // Processing loop is now handled by ArbitrageScanner
  // This method is kept for compatibility but does nothing
  private startProcessingLoop(): void {
    // No longer needed - ArbitrageScanner handles its own interval
  }

  private startHealthcheck(): void {
    // Log health status every 5 minutes
    this.healthcheckInterval = setInterval(() => {
      const memoryUsage = process.memoryUsage();
      console.log('💚 Health Check:', {
        timestamp: new Date().toISOString(),
        memory: Math.round(memoryUsage.heapUsed / 1024 / 1024) + 'MB',
        uptime: Math.round(process.uptime()) + 's',
        scannerActive: this.arbitrageScanner.isActive()
      });
    }, 5 * 60 * 1000);
  }

  // This method is no longer needed - ArbitrageScanner handles all processing
  private async processArbitrageData(): Promise<void> {
    // No longer needed - ArbitrageScanner handles all processing
  }

  public async stop(): Promise<void> {
    console.log('🛑 Stopping Background Processor...');
    
    try {
      // Stop arbitrage scanner
      this.arbitrageScanner.stop();

      // Clear intervals
      if (this.healthcheckInterval) {
        clearInterval(this.healthcheckInterval);
      }
      
      // Close database connection
      await this.db.close();
      
      console.log('✅ Background Processor stopped successfully');
    } catch (error) {
      console.error('Error stopping processor:', error);
    }
  }

  public getStatus(): any {
    const memoryUsage = process.memoryUsage();
    return {
      status: 'running',
      uptime: process.uptime(),
      memory: {
        heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024) + 'MB',
        heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024) + 'MB'
      },
      scannerActive: this.arbitrageScanner.isActive(),
      timestamp: new Date().toISOString()
    };
  }
}

