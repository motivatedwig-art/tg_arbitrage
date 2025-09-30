export declare class BackgroundProcessor {
    private db;
    private arbitrageScanner;
    private isProcessing;
    private healthcheckInterval;
    constructor();
    start(): Promise<void>;
    private startProcessingLoop;
    private startHealthcheck;
    private processArbitrageData;
    stop(): Promise<void>;
    getStatus(): any;
}
//# sourceMappingURL=BackgroundProcessor.d.ts.map