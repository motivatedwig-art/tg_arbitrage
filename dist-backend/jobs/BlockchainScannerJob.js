/**
 * Scheduled Job for Blockchain Scanning
 * Runs periodic scans to update blockchain mappings
 */
import * as cron from 'node-cron';
import { BlockchainAggregator } from '../services/BlockchainAggregator.js';
import { DatabaseManager } from '../database/Database.js';
export class BlockchainScannerJob {
    constructor() {
        this.isRunning = false;
        this.aggregator = new BlockchainAggregator();
    }
    /**
     * Schedule the blockchain scanner to run periodically
     */
    static schedule() {
        const job = new BlockchainScannerJob();
        // Run every 6 hours
        cron.schedule('0 */6 * * *', async () => {
            console.log('⏰ Running scheduled blockchain detection scan...');
            await job.runScan();
        });
        console.log('✅ Blockchain scanner job scheduled (every 6 hours)');
    }
    /**
     * Run scan immediately (for manual triggers)
     */
    static async runNow() {
        const job = new BlockchainScannerJob();
        return await job.runScan();
    }
    /**
     * Execute the blockchain scan
     */
    async runScan() {
        if (this.isRunning) {
            console.log('⚠️ Blockchain scan already running, skipping...');
            return;
        }
        this.isRunning = true;
        const startTime = Date.now();
        try {
            console.log('🔍 Starting blockchain detection scan...');
            // Run aggregation
            const results = await this.aggregator.aggregateBlockchainData();
            // Update database
            await this.saveToDatabase(results);
            const duration = ((Date.now() - startTime) / 1000).toFixed(2);
            console.log(`✅ Blockchain scan complete in ${duration}s`);
            // Log statistics
            const stats = {
                total: results.size,
                highConfidence: 0,
                verified: 0
            };
            for (const info of results.values()) {
                if (info.confidence >= 80)
                    stats.highConfidence++;
                if (info.contractVerified)
                    stats.verified++;
            }
            console.log('📊 Scan statistics:', stats);
        }
        catch (error) {
            console.error('❌ Blockchain scan failed:', error);
            // Don't throw - allow next scheduled run to attempt again
        }
        finally {
            this.isRunning = false;
        }
    }
    /**
     * Save aggregated results to database
     */
    async saveToDatabase(results) {
        try {
            const db = DatabaseManager.getInstance();
            const dbInstance = db.getDatabase();
            // Check if using PostgreSQL or SQLite
            const isPostgres = process.env.DATABASE_URL?.startsWith('postgresql://');
            // This would need a TokenBlockchainModel similar to ArbitrageOpportunityModel
            // For now, just log that we would save
            console.log(`💾 Would save ${results.size} token blockchain mappings to database`);
            // TODO: Implement actual database save
            // await db.getTokenBlockchainModel().bulkUpsert(results);
        }
        catch (error) {
            console.error('❌ Failed to save blockchain data:', error);
        }
    }
    /**
     * Get scan status
     */
    getStatus() {
        return {
            isRunning: this.isRunning,
            // Would track lastRun time in production
        };
    }
}
//# sourceMappingURL=BlockchainScannerJob.js.map