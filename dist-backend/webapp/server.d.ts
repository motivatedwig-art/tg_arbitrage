export declare class WebAppServer {
    private app;
    private server;
    private db;
    private arbitrageService;
    private tokenMetadataService;
    constructor();
    private setupMiddleware;
    private requireAuth;
    private setupRoutes;
    private applyChainDiversityFilter;
    private groupOpportunitiesByBlockchain;
    start(port: number): Promise<void>;
    stop(): Promise<void>;
}
//# sourceMappingURL=server.d.ts.map