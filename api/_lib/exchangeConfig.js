// Exchange configuration shared across serverless functions.

const toNumber = (value, fallback) => {
  if (value === undefined || value === null || value === '') {
    return fallback;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

export const DEFAULT_SYMBOLS = (process.env.ARBITRAGE_SYMBOLS || '')
  .split(',')
  .map(symbol => symbol.trim().toUpperCase())
  .filter(Boolean);

if (!DEFAULT_SYMBOLS.length) {
  DEFAULT_SYMBOLS.push(
    'BTC/USDT',
    'ETH/USDT',
    'SOL/USDT',
    'XRP/USDT',
    'ADA/USDT',
    'DOGE/USDT',
    'LINK/USDT',
    'BNB/USDT'
  );
}

const buildCredentials = ({ apiKey, secret, password, uid }) => {
  const credentials = {};
  if (apiKey && process.env[apiKey]) {
    credentials.apiKey = process.env[apiKey];
  }
  if (secret && process.env[secret]) {
    credentials.secret = process.env[secret];
  }
  if (password && process.env[password]) {
    credentials.password = process.env[password];
  }
  if (uid && process.env[uid]) {
    credentials.uid = process.env[uid];
  }
  return credentials;
};

export const SUPPORTED_EXCHANGES = {
  binance: {
    id: 'binance',
    ccxtId: 'binance',
    displayName: 'Binance',
    website: 'https://www.binance.com',
    pairUrlPattern: 'https://www.binance.com/en/trade/{symbol}',
    logo: '🟡',
    tradeFee: toNumber(process.env.BINANCE_TRADING_FEE || process.env.BINANCE_TAKER_FEE, 0.1),
    credentials: buildCredentials({
      apiKey: 'BINANCE_API_KEY',
      secret: 'BINANCE_API_SECRET'
    })
  },
  okx: {
    id: 'okx',
    ccxtId: 'okx',
    displayName: 'OKX',
    website: 'https://www.okx.com',
    pairUrlPattern: 'https://www.okx.com/trade-spot/{symbol}',
    logo: '⚫',
    tradeFee: toNumber(process.env.OKX_TRADING_FEE || process.env.OKX_TAKER_FEE, 0.1),
    credentials: buildCredentials({
      apiKey: 'OKX_API_KEY',
      secret: 'OKX_API_SECRET',
      password: 'OKX_PASSPHRASE'
    })
  },
  bybit: {
    id: 'bybit',
    ccxtId: 'bybit',
    displayName: 'Bybit',
    website: 'https://www.bybit.com',
    pairUrlPattern: 'https://www.bybit.com/trade/spot/{symbol}',
    logo: '🟠',
    tradeFee: toNumber(process.env.BYBIT_TRADING_FEE || process.env.BYBIT_TAKER_FEE, 0.1),
    credentials: buildCredentials({
      apiKey: 'BYBIT_API_KEY',
      secret: 'BYBIT_API_SECRET'
    })
  },
  mexc: {
    id: 'mexc',
    ccxtId: 'mexc',
    displayName: 'MEXC',
    website: 'https://www.mexc.com',
    pairUrlPattern: 'https://www.mexc.com/exchange/{symbol}',
    logo: '🟢',
    tradeFee: toNumber(process.env.MEXC_TRADING_FEE || process.env.MEXC_TAKER_FEE, 0.2),
    credentials: buildCredentials({
      apiKey: 'MEXC_API_KEY',
      secret: 'MEXC_API_SECRET'
    })
  },
  gateio: {
    id: 'gateio',
    ccxtId: 'gateio',
    displayName: 'Gate.io',
    website: 'https://www.gate.io',
    pairUrlPattern: 'https://www.gate.io/trade/{symbol}',
    logo: '🟣',
    tradeFee: toNumber(process.env.GATE_IO_TRADING_FEE || process.env.GATE_IO_TAKER_FEE, 0.2),
    credentials: buildCredentials({
      apiKey: 'GATE_IO_API_KEY',
      secret: 'GATE_IO_API_SECRET'
    })
  },
  kucoin: {
    id: 'kucoin',
    ccxtId: 'kucoin',
    displayName: 'KuCoin',
    website: 'https://www.kucoin.com',
    pairUrlPattern: 'https://trade.kucoin.com/{symbol}',
    logo: '🟦',
    tradeFee: toNumber(process.env.KUCOIN_TRADING_FEE || process.env.KUCOIN_TAKER_FEE, 0.1),
    credentials: buildCredentials({
      apiKey: 'KUCOIN_API_KEY',
      secret: 'KUCOIN_API_SECRET',
      password: 'KUCOIN_PASSPHRASE'
    })
  }
};

export const SUPPORTED_EXCHANGE_IDS = Object.keys(SUPPORTED_EXCHANGES);

export const MIN_PROFIT_THRESHOLD = toNumber(process.env.MIN_PROFIT_THRESHOLD, 0.5);
export const MAX_PROFIT_THRESHOLD = toNumber(process.env.MAX_PROFIT_THRESHOLD, 110);
export const MAX_OPPORTUNITIES = Math.max(1, toNumber(process.env.MAX_OPPORTUNITIES, 50));
export const CCXT_TIMEOUT = Math.max(1000, toNumber(process.env.CCXT_TIMEOUT, 10000));

export const normalizeExchangeId = (value) => {
  if (!value) return '';
  return String(value).trim().toLowerCase();
};

export const resolveSelectedExchanges = (input) => {
  if (!input) {
    return [...SUPPORTED_EXCHANGE_IDS];
  }

  const list = Array.isArray(input)
    ? input
    : String(input).split(',');

  const normalized = [...new Set(list.map(normalizeExchangeId).filter(Boolean))]
    .filter(id => SUPPORTED_EXCHANGES[id]);

  return normalized.length ? normalized : [...SUPPORTED_EXCHANGE_IDS];
};

export const getExchangeMeta = (id) => SUPPORTED_EXCHANGES[normalizeExchangeId(id)] || null;

export const getTradingFee = (id) => {
  const meta = getExchangeMeta(id);
  return meta ? meta.tradeFee : 0.1;
};

export const getExchangeDisplayName = (id) => {
  const meta = getExchangeMeta(id);
  return meta ? meta.displayName : id;
};

export const getExchangeBaseUrl = (id) => {
  const meta = getExchangeMeta(id);
  if (!meta) {
    return `https://${normalizeExchangeId(id)}.com`;
  }
  return meta.website || `https://${normalizeExchangeId(id)}.com`;
};

export const getExchangeCredentials = (id) => {
  const meta = getExchangeMeta(id);
  if (!meta) return {};
  return meta.credentials || {};
};

export const getExchangePairUrlPattern = (id) => {
  const meta = getExchangeMeta(id);
  if (!meta) return null;
  return meta.pairUrlPattern || null;
};

export const getExchangeLogo = (id) => {
  const meta = getExchangeMeta(id);
  return meta?.logo || null;
};

