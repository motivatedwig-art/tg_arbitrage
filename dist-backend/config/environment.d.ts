export interface EnvironmentConfig {
    telegramBotToken: string;
    webappUrl: string;
    apiBaseUrl: string;
    apiUrl: string;
    port: number;
    nodeEnv: string;
    updateInterval: number;
    minProfitThreshold: number;
    maxOpportunities: number;
    databasePath: string;
    rateLimitWindow: number;
    rateLimitMaxRequests: number;
    useMockData: boolean;
    debug: boolean;
    logLevel: string;
    exchangeApiKeys: {
        binance: {
            key: string;
            secret: string;
        };
        okx: {
            key: string;
            secret: string;
            passphrase: string;
        };
        bybit: {
            key: string;
            secret: string;
        };
        mexc: {
            key: string;
            secret: string;
        };
        gateio: {
            key: string;
            secret: string;
        };
        kucoin: {
            key: string;
            secret: string;
            passphrase: string;
        };
    };
    coinapiKey: string;
    adminApiKey: string;
    claudeApiKey: string;
    claudeModel: string;
    claudeMaxTokens: number;
    claudeCacheTtl: number;
    contractData: {
        enabled: boolean;
        batchSize: number;
        rateLimitDelay: number;
    };
    publicApiEndpoints: {
        binance: {
            price: string;
            price24hr: string;
            allPrices: string;
        };
        okx: {
            price: string;
            allTickers: string;
        };
        bybit: {
            spotPrice: string;
            allSpot: string;
        };
        mexc: {
            price: string;
            price24hr: string;
            allPrices: string;
        };
        gateio: {
            price: string;
            allTickers: string;
        };
        kucoin: {
            price: string;
            allTickers: string;
        };
    };
}
export declare const config: EnvironmentConfig;
export declare const isDevelopment: () => boolean;
export declare const isProduction: () => boolean;
export declare const isDebug: () => boolean;
export declare const validateConfig: () => void;
export declare const logConfig: () => void;
//# sourceMappingURL=environment.d.ts.map