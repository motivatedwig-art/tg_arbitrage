/**
 * Scheduled Job for Blockchain Scanning
 * Runs periodic scans to update blockchain mappings
 */
export declare class BlockchainScannerJob {
    private aggregator;
    private isRunning;
    constructor();
    /**
     * Schedule the blockchain scanner to run periodically
     */
    static schedule(): void;
    /**
     * Run scan immediately (for manual triggers)
     */
    static runNow(): Promise<void>;
    /**
     * Execute the blockchain scan
     */
    private runScan;
    /**
     * Save aggregated results to database
     */
    private saveToDatabase;
    /**
     * Get scan status
     */
    getStatus(): {
        isRunning: boolean;
        lastRun?: Date;
    };
}
//# sourceMappingURL=BlockchainScannerJob.d.ts.map