export declare class WebAppServer {
    private app;
    private server;
    private db;
    private exchangeManager;
    constructor();
    private setupMiddleware;
    private setupRoutes;
    start(port?: number): Promise<void>;
    stop(): Promise<void>;
}
//# sourceMappingURL=server.d.ts.map