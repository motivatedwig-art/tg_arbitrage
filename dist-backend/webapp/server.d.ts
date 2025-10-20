export declare class WebAppServer {
    private app;
    private server;
    private db;
    private arbitrageService;
    private tokenMetadataService;
    constructor();
    private setupMiddleware;
    private setupRoutes;
    private applyChainDiversityFilter;
    start(port: number): Promise<void>;
    stop(): Promise<void>;
}
//# sourceMappingURL=server.d.ts.map