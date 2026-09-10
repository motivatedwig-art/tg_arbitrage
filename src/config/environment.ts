// Environment configuration utility
export interface EnvironmentConfig {
  // Telegram Bot
  telegramBotToken: string;
  webappUrl: string;
  
  // API Configuration
  apiBaseUrl: string;
  apiUrl: string;
  
  // Application Settings
  port: number;
  nodeEnv: string;
  updateInterval: number;
  minProfitThreshold: number;
  maxOpportunities: number;
  
  // Database
  databasePath: string;
  
  // Rate Limiting
  rateLimitWindow: number;
  rateLimitMaxRequests: number;
  
  // Development
  useMockData: boolean;
  debug: boolean;
  logLevel: string;
  
  // Exchange API Keys
  exchangeApiKeys: {
    binance: { key: string; secret: string };
    okx: { key: string; secret: string; passphrase: string };
    bybit: { key: string; secret: string };
    mexc: { key: string; secret: string };
    gateio: { key: string; secret: string };
    kucoin: { key: string; secret: string; passphrase: string };
  };
  
  // CoinAPI Key for Metadata Lookup
  coinapiKey: string;

  // Security
  adminApiKey: string;

  // Claude AI Configuration
  claudeApiKey: string;
  claudeModel: string;
  claudeMaxTokens: number;
  claudeCacheTtl: number;
  
  // Contract Data Configuration
  contractData: {
    enabled: boolean;
    batchSize: number;
    rateLimitDelay: number;
  };

  // DexScreener Configuration
  dexScreener: {
    enabled: boolean;
  };
  
  // Public API Endpoints
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

// Read process.env without assuming `process` exists.
// In a Vite browser bundle `process` is not defined at all, so touching it
// directly throws a ReferenceError instead of returning undefined.
const readProcessEnv = (key: string): string | undefined => {
  if (typeof process === 'undefined' || !process.env) {
    return undefined;
  }
  return process.env[key];
};

// Read a raw environment value from Vite (browser) or process.env (Node).
// A variable that is unset, empty, or whitespace-only is treated as absent:
// Railway and .env files both represent "not configured" as an empty value.
// The returned value is trimmed - every consumer here is a key, URL, number or
// boolean, and a stray trailing newline in a dashboard-entered secret is a far
// more likely bug than a value that legitimately ends in whitespace.
const readRawEnv = (key: string): string | undefined => {
  const fromVite = (import.meta as any)?.env?.[key];
  const raw = typeof fromVite === 'string' && fromVite !== '' ? fromVite : readProcessEnv(key);

  if (typeof raw !== 'string') {
    return undefined;
  }

  const trimmed = raw.trim();
  return trimmed === '' ? undefined : trimmed;
};

// Get environment variable with fallback.
//
// Throws ONLY when the variable is absent and no default was supplied.
// Passing an empty string as the default is how this codebase marks an optional
// variable (e.g. getEnvVar('BINANCE_API_KEY', '')), so '' must be returned as a
// legitimate value rather than treated as a missing variable.
const getEnvVar = (key: string, defaultValue?: string): string => {
  const value = readRawEnv(key);
  if (value !== undefined) {
    return value;
  }
  if (defaultValue !== undefined) {
    return defaultValue;
  }
  throw new Error(`Environment variable ${key} is required`);
};

// Get webapp URL, auto-detecting the Railway-assigned domain.
//
// Reads through readRawEnv so it does not touch process.env directly in a
// browser bundle, where `process` is undefined.
//
// Returns '' when nothing identifies the deployment. That is deliberate: the
// previous code fell back to a specific hardcoded deployment
// (webapp-production-c779.up.railway.app) for every unknown environment, so a
// fork or a new Railway project silently pointed its Telegram mini-app button
// at somebody else's instance. Callers must treat '' as "not configured".
const getWebappUrl = (): string => {
  const explicit = readRawEnv('WEBAPP_URL');
  if (explicit) {
    return explicit;
  }

  // Railway exposes the public domain without a scheme.
  const railwayDomain = readRawEnv('RAILWAY_PUBLIC_DOMAIN')
    || readRawEnv('RAILWAY_STATIC_URL')
    || readRawEnv('RAILWAY_URL');

  if (railwayDomain) {
    return railwayDomain.startsWith('http') ? railwayDomain : `https://${railwayDomain}`;
  }

  return '';
};

// Get environment variable as number.
//
// Uses Number(), not parseInt(): parseInt('0.5', 10) is 0, so
// MIN_PROFIT_THRESHOLD=0.5 silently became a threshold of 0 and every
// near-zero spread was reported as an opportunity. parseInt also accepted
// '12abc' as 12; Number() rejects it, and an unparseable value now falls back
// to the default with a warning rather than poisoning the config with NaN.
//
// Callers that need a whole number (a port, a token count) should truncate at
// the point of use - see `port` and `claudeMaxTokens` below.
const getEnvNumber = (key: string, defaultValue: number): number => {
  const raw = readRawEnv(key);
  if (raw === undefined) {
    return defaultValue;
  }

  const parsed = Number(raw);
  if (!Number.isFinite(parsed)) {
    console.warn(`⚠️ [CONFIG] ${key}="${raw}" is not a number - using default ${defaultValue}`);
    return defaultValue;
  }

  return parsed;
};

// Get environment variable as boolean.
// Accepts the common spellings rather than only "true", so DEBUG=1 and
// DEXSCREENER_ENABLED=yes behave as written instead of silently reading false.
const getEnvBoolean = (key: string, defaultValue: boolean): boolean => {
  const raw = readRawEnv(key);
  if (raw === undefined) {
    return defaultValue;
  }

  const value = raw.toLowerCase();
  if (['true', '1', 'yes', 'on'].includes(value)) return true;
  if (['false', '0', 'no', 'off'].includes(value)) return false;

  console.warn(`⚠️ [CONFIG] ${key}="${raw}" is not a boolean - using default ${defaultValue}`);
  return defaultValue;
};

// Environment configuration
export const config: EnvironmentConfig = {
  // Telegram Bot
  // Optional at import time on purpose: index.ts is written to start the web app
  // without a bot token, and webapp/server.ts imports this module. Throwing here
  // would kill the whole process before that fallback can run.
  // Use validateConfig() to assert it where a token is actually required.
  telegramBotToken: getEnvVar('TELEGRAM_BOT_TOKEN', ''),
  webappUrl: getWebappUrl(),
  
  // API Configuration
  // Empty means "not configured, use a same-origin relative path" - which is
  // what the frontend does. The previous default was https://web.telegram.org,
  // which is Telegram's own website and never serves this app's API; anything
  // that trusted it would have sent every request to the wrong host.
  apiBaseUrl: getEnvVar('VITE_API_BASE_URL', ''),
  apiUrl: getEnvVar('VITE_API_URL', ''),
  
  // Application Settings
  // Truncated: a port must be a whole number.
  port: Math.trunc(getEnvNumber('PORT', 3000)),
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
  // Optional at import time: a missing key must disable AI enrichment,
  // not crash the bot. ClaudeAnalyzer reports the missing key when first used.
  claudeApiKey: getEnvVar('ANTHROPIC_API_KEY', ''),
  // Keeps this project's deliberate choice of the Haiku tier for high-volume
  // extraction, moved to the current generation (claude-3-5-haiku-20241022 is
  // previous-generation). Set CLAUDE_MODEL=claude-opus-5 for markedly better
  // extraction accuracy at a higher per-token price.
  claudeModel: getEnvVar('CLAUDE_MODEL', 'claude-haiku-4-5'),
  // 100 was not enough for the contract-extraction JSON to finish rendering,
  // so responses were being truncated and failing to parse.
  // Truncated: the API rejects a non-integer max_tokens.
  claudeMaxTokens: Math.trunc(getEnvNumber('CLAUDE_MAX_TOKENS', 1024)),
  claudeCacheTtl: getEnvNumber('CLAUDE_CACHE_TTL', 300),

  // Contract Data Configuration
  contractData: {
    enabled: getEnvBoolean('CONTRACT_DATA_ENABLED', true),
    batchSize: getEnvNumber('CONTRACT_DATA_BATCH_SIZE', 5),
    rateLimitDelay: getEnvNumber('CONTRACT_DATA_DELAY_MS', 1000),
  },

  // DexScreener Configuration
  //
  // Enabled by default: DexScreener returns an actual on-chain token address
  // and chain from a real API, which a language model cannot do - it has no
  // network access and can only recall or guess. Disabling this left contract
  // metadata sourced entirely from guesses, and the "validation" step then
  // checked those guesses against themselves.
  dexScreener: {
    enabled: getEnvBoolean('DEXSCREENER_ENABLED', true),
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
export const validateConfig = (): void => {
  const requiredVars = ['TELEGRAM_BOT_TOKEN'];
  
  for (const varName of requiredVars) {
    if (!getEnvVar(varName, '')) {
      throw new Error(`Required environment variable ${varName} is not set`);
    }
  }
};

// Log configuration (without sensitive data)
export const logConfig = (): void => {
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

