// Get environment variable with fallback
const getEnvVar = (key, defaultValue) => {
    // Check if we're in a browser environment (Vite)
    const isBrowser = typeof window !== 'undefined';
    const value = isBrowser
        ? import.meta.env?.[key] || process.env[key] || defaultValue
        : process.env[key] || defaultValue;
    if (!value) {
        throw new Error(`Environment variable ${key} is required`);
    }
    return value;
};
// Get webapp URL with Railway auto-detection
const getWebappUrl = () => {
    const isBrowser = typeof window !== 'undefined';
    const envValue = isBrowser
        ? import.meta.env?.WEBAPP_URL || process.env.WEBAPP_URL
        : process.env.WEBAPP_URL;
    // If WEBAPP_URL is explicitly set, use it
    if (envValue) {
        return envValue;
    }
    // Check if we're on Railway
    // Railway typically sets these environment variables or we can detect by:
    // - RAILWAY_ENVIRONMENT, RAILWAY_SERVICE_NAME (Railway-specific)
    // - PORT is set (typical for Railway)
    // - NODE_ENV is production (typical for Railway)
    const isRailway = process.env.RAILWAY_ENVIRONMENT ||
        process.env.RAILWAY_SERVICE_NAME ||
        process.env.RAILWAY_PUBLIC_DOMAIN ||
        (process.env.NODE_ENV === 'production' && process.env.PORT);
    if (isRailway) {
        // Try to get Railway public domain
        const railwayDomain = process.env.RAILWAY_PUBLIC_DOMAIN ||
            process.env.RAILWAY_STATIC_URL ||
            process.env.RAILWAY_URL;
        if (railwayDomain) {
            // Ensure it starts with https://
            const url = railwayDomain.startsWith('http') ? railwayDomain : `https://${railwayDomain}`;
            return url;
        }
        // Fallback to default Railway URL
        return 'https://webapp-production-c779.up.railway.app';
    }
    // Default Railway URL
    return 'https://webapp-production-c779.up.railway.app';
};
// Get environment variable as number
const getEnvNumber = (key, defaultValue) => {
    const isBrowser = typeof window !== 'undefined';
    const value = isBrowser
        ? import.meta.env?.[key] || process.env[key]
        : process.env[key];
    return value ? parseInt(value, 10) : defaultValue;
};
// Get environment variable as boolean
const getEnvBoolean = (key, defaultValue) => {
    const isBrowser = typeof window !== 'undefined';
    const value = isBrowser
        ? import.meta.env?.[key] || process.env[key]
        : process.env[key];
    return value ? value.toLowerCase() === 'true' : defaultValue;
};
// Environment configuration
export const config = {
    // Telegram Bot
    telegramBotToken: getEnvVar('TELEGRAM_BOT_TOKEN'),
    webappUrl: getWebappUrl(),
    // API Configuration
    apiBaseUrl: getEnvVar('VITE_API_BASE_URL', 'https://web.telegram.org'),
    apiUrl: getEnvVar('VITE_API_URL', 'https://web.telegram.org'),
    // Application Settings
    port: getEnvNumber('PORT', 3000),
    nodeEnv: getEnvVar('NODE_ENV', 'development'),
    updateInterval: getEnvNumber('UPDATE_INTERVAL', 600000),
    minProfitThreshold: getEnvNumber('MIN_PROFIT_THRESHOLD', 0.5),
    maxOpportunities: getEnvNumber('MAX_OPPORTUNITIES', 50),
    // Database
    databasePath: getEnvVar('DATABASE_PATH', './database.sqlite'),
    // Rate Limiting
    rateLimitWindow: getEnvNumber('RATE_LIMIT_WINDOW', 15),
    rateLimitMaxRequests: getEnvNumber('RATE_LIMIT_MAX_REQUESTS', 100),
    // Development
    useMockData: getEnvBoolean('USE_MOCK_DATA', false),
    debug: getEnvBoolean('DEBUG', false),
    logLevel: getEnvVar('LOG_LEVEL', 'info'),
    // Exchange API Keys
    exchangeApiKeys: {
        binance: {
            key: getEnvVar('BINANCE_API_KEY', ''),
            secret: getEnvVar('BINANCE_API_SECRET', ''),
        },
        okx: {
            key: getEnvVar('OKX_API_KEY', ''),
            secret: getEnvVar('OKX_API_SECRET', ''),
            passphrase: getEnvVar('OKX_PASSPHRASE', ''),
        },
        bybit: {
            key: getEnvVar('BYBIT_API_KEY', ''),
            secret: getEnvVar('BYBIT_API_SECRET', ''),
        },
        mexc: {
            key: getEnvVar('MEXC_API_KEY', ''),
            secret: getEnvVar('MEXC_API_SECRET', ''),
        },
        gateio: {
            key: getEnvVar('GATE_IO_API_KEY', ''),
            secret: getEnvVar('GATE_IO_API_SECRET', ''),
        },
        kucoin: {
            key: getEnvVar('KUCOIN_API_KEY', ''),
            secret: getEnvVar('KUCOIN_API_SECRET', ''),
            passphrase: getEnvVar('KUCOIN_PASSPHRASE', ''),
        },
    },
    // CoinAPI Key for Metadata Lookup
    coinapiKey: getEnvVar('COINAPI_KEY', getEnvVar('VITE_COINAPI_KEY', '')),
    // Security
    adminApiKey: getEnvVar('ADMIN_API_KEY', ''),
    // Claude AI Configuration
    claudeApiKey: getEnvVar('ANTHROPIC_API_KEY'),
    claudeModel: getEnvVar('CLAUDE_MODEL', 'claude-3-5-haiku-20241022'),
    claudeMaxTokens: getEnvNumber('CLAUDE_MAX_TOKENS', 100),
    claudeCacheTtl: getEnvNumber('CLAUDE_CACHE_TTL', 300),
    // Contract Data Configuration
    contractData: {
        enabled: getEnvBoolean('CONTRACT_DATA_ENABLED', true),
        batchSize: getEnvNumber('CONTRACT_DATA_BATCH_SIZE', 5),
        rateLimitDelay: getEnvNumber('CONTRACT_DATA_DELAY_MS', 1000),
    },
    // Public API Endpoints
    publicApiEndpoints: {
        binance: {
            price: getEnvVar('BINANCE_PRICE_API', 'https://api.binance.com/api/v3/ticker/price?symbol={symbol}'),
            price24hr: getEnvVar('BINANCE_24HR_API', 'https://api.binance.com/api/v3/ticker/24hr?symbol={symbol}'),
            allPrices: getEnvVar('BINANCE_ALL_PRICES_API', 'https://api.binance.com/api/v3/ticker/price'),
        },
        okx: {
            price: getEnvVar('OKX_PRICE_API', 'https://www.okx.com/api/v5/market/ticker?instId={symbol}'),
            allTickers: getEnvVar('OKX_ALL_TICKERS_API', 'https://www.okx.com/api/v5/market/tickers?instType=SPOT'),
        },
        bybit: {
            spotPrice: getEnvVar('BYBIT_SPOT_PRICE_API', 'https://api.bybit.com/v5/market/tickers?category=spot&symbol={symbol}'),
            allSpot: getEnvVar('BYBIT_ALL_SPOT_API', 'https://api.bybit.com/v5/market/tickers?category=spot'),
        },
        mexc: {
            price: getEnvVar('MEXC_PRICE_API', 'https://api.mexc.com/api/v3/ticker/price?symbol={symbol}'),
            price24hr: getEnvVar('MEXC_24HR_API', 'https://api.mexc.com/api/v3/ticker/24hr?symbol={symbol}'),
            allPrices: getEnvVar('MEXC_ALL_PRICES_API', 'https://api.mexc.com/api/v3/ticker/price'),
        },
        gateio: {
            price: getEnvVar('GATE_IO_PRICE_API', 'https://api.gateio.ws/api/v4/spot/tickers?currency_pair={symbol}'),
            allTickers: getEnvVar('GATE_IO_ALL_TICKERS_API', 'https://api.gateio.ws/api/v4/spot/tickers'),
        },
        kucoin: {
            price: getEnvVar('KUCOIN_PRICE_API', 'https://api.kucoin.com/api/v1/market/stats?symbol={symbol}'),
            allTickers: getEnvVar('KUCOIN_ALL_TICKERS_API', 'https://api.kucoin.com/api/v1/market/allTickers'),
        },
    },
};
// Helper functions
export const isDevelopment = () => config.nodeEnv === 'development';
export const isProduction = () => config.nodeEnv === 'production';
export const isDebug = () => config.debug;
// Validate required configuration
export const validateConfig = () => {
    const requiredVars = ['TELEGRAM_BOT_TOKEN'];
    for (const varName of requiredVars) {
        if (!getEnvVar(varName, '')) {
            throw new Error(`Required environment variable ${varName} is not set`);
        }
    }
};
// Log configuration (without sensitive data)
export const logConfig = () => {
    if (isDebug()) {
        console.log('Environment Configuration:', {
            nodeEnv: config.nodeEnv,
            apiBaseUrl: config.apiBaseUrl,
            webappUrl: config.webappUrl,
            updateInterval: config.updateInterval,
            minProfitThreshold: config.minProfitThreshold,
            maxOpportunities: config.maxOpportunities,
            useMockData: config.useMockData,
            debug: config.debug,
            logLevel: config.logLevel,
        });
    }
};
//# sourceMappingURL=environment.js.map