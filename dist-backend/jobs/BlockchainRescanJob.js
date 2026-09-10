import * as cron from 'node-cron';
import { blockchainRescanService } from '../services/BlockchainRescanService.js';
/**
 * BlockchainRescanJob - Scheduled job to rescan opportunities with unknown blockchain data
 *
 * Schedule: Every hour (0 * * * *)
 *
 * Purpose:
 * - Identifies opportunities with missing blockchain/contract data
 * - Uses Claude AI to extract correct blockchain information
 * - Ensures all opportunities have valid blockchain data before reaching UI
 */
export class BlockchainRescanJob {
    constructor() {
        // Enable by default (controlled by CONTRACT_DATA_ENABLED)
        this.enabled = process.env.BLOCKCHAIN_RESCAN_ENABLED !== 'false';
    }
    static getInstance() {
        if (!BlockchainRescanJob.instance) {
            BlockchainRescanJob.instance = new BlockchainRescanJob();
        }
        return BlockchainRescanJob.instance;
    }
    /**
     * Start the scheduled job
     */
    schedule() {
        if (!this.enabled) {
            console.log('⚠️ [RESCAN-JOB] Blockchain rescan job is DISABLED');
            return;
        }
        // Run every hour: 0 * * * *
        // This ensures opportunities get rescanned regularly
        cron.schedule('0 * * * *', async () => {
            console.log('🕐 [RESCAN-JOB] Triggered scheduled blockchain rescan');
            await this.runRescan();
        });
        console.log('✅ [RESCAN-JOB] Blockchain rescan job scheduled (every hour at :00)');
    }
    /**
     * Run the rescan immediately
     */
    async runRescan() {
        if (!this.enabled) {
            console.log('⚠️ [RESCAN-JOB] Blockchain rescan job is DISABLED');
            return;
        }
        try {
            // Check if there are any opportunities with unknown blockchain
            const unknownCount = await blockchainRescanService.getUnknownCount();
            if (unknownCount === 0) {
                console.log('✅ [RESCAN-JOB] No opportunities with unknown blockchain data');
                return;
            }
            console.log(`📊 [RESCAN-JOB] Found ${unknownCount} opportunities with unknown blockchain data`);
            console.log(`🔄 [RESCAN-JOB] Starting rescan...`);
            const result = await blockchainRescanService.runRescan();
            console.log(`✅ [RESCAN-JOB] Rescan complete: ${result.successful}/${result.total} successful`);
        }
        catch (error) {
            console.error('❌ [RESCAN-JOB] Error running rescan:', error);
        }
    }
}
export const blockchainRescanJob = BlockchainRescanJob.getInstance();
//# sourceMappingURL=BlockchainRescanJob.js.map