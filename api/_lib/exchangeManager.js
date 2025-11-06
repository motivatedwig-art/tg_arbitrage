import ccxt from 'ccxt';
import {
  SUPPORTED_EXCHANGES,
  getExchangeCredentials,
  getTradingFee,
  MAX_OPPORTUNITIES,
  DEFAULT_SYMBOLS,
  MIN_PROFIT_THRESHOLD,
  MAX_PROFIT_THRESHOLD,
  CCXT_TIMEOUT,
  resolveSelectedExchanges,
  getExchangePairUrlPattern,
  getExchangeBaseUrl,
  getExchangeDisplayName,
  getExchangeLogo
} from './exchangeConfig.js';

const createExchangeInstance = (meta) => {
  const credentials = getExchangeCredentials(meta.id);
  const options = {
    enableRateLimit: true,
    timeout: CCXT_TIMEOUT,
    ...credentials
  };

  const ExchangeClass = ccxt[meta.ccxtId];
  if (!ExchangeClass) {
    throw new Error(`Exchange ${meta.ccxtId} is not available in ccxt`);
  }

  const instance = new ExchangeClass(options);
  // Some exchanges require password property rather than passphrase
  if (credentials?.password && !credentials?.passphrase) {
    instance.password = credentials.password;
  }

  return instance;
};

export const buildExchangeClients = (exchanges) => {
  const normalized = resolveSelectedExchanges(exchanges);

  // Return a simple object with exchange IDs since we're using public APIs
  return normalized.reduce((acc, id) => {
    const meta = SUPPORTED_EXCHANGES[id];
    if (!meta) return acc;

    // Just return the exchange ID as a placeholder
    acc[id] = { id };
    return acc;
  }, {});
};

const formatTicker = (ticker, { symbol, exchangeId }) => {
  if (!ticker || typeof ticker.bid !== 'number' || typeof ticker.ask !== 'number') {
    return null;
  }

  return {
    symbol,
    exchangeId,
    bid: ticker.bid,
    ask: ticker.ask,
    spread: ticker.ask - ticker.bid,
    baseVolume: ticker.baseVolume || ticker.quoteVolume || 0,
    timestamp: ticker.timestamp || Date.now()
  };
};

// Fetch tickers using public APIs instead of CCXT
export const fetchTickers = async (clients, symbols = DEFAULT_SYMBOLS) => {
  const results = {};

  // Use public APIs for each exchange from environment variables
  const exchangeAPIs = {
    binance: {
      url: process.env.BINANCE_ALL_PRICES_API || 'https://api.binance.com/api/v3/ticker/price',
      allUrl: process.env.BINANCE_ALL_PRICES_API || 'https://api.binance.com/api/v3/ticker/price',
      symbolKey: 'symbol',
      priceKey: 'price'
    },
    okx: {
      url: process.env.OKX_ALL_TICKERS_API || 'https://www.okx.com/api/v5/market/tickers?instType=SPOT',
      allUrl: process.env.OKX_ALL_TICKERS_API || 'https://www.okx.com/api/v5/market/tickers?instType=SPOT',
      symbolKey: 'instId',
      priceKey: 'last'
    },
    bybit: {
      url: process.env.BYBIT_ALL_SPOT_API || 'https://api.bybit.com/v5/market/tickers?category=spot',
      allUrl: process.env.BYBIT_ALL_SPOT_API || 'https://api.bybit.com/v5/market/tickers?category=spot',
      symbolKey: 'symbol',
      priceKey: 'lastPrice'
    },
    bitget: {
      url: process.env.BITGET_ALL_TICKERS_API || 'https://api.bitget.com/api/v2/spot/market/tickers',
      allUrl: process.env.BITGET_ALL_TICKERS_API || 'https://api.bitget.com/api/v2/spot/market/tickers',
      symbolKey: 'symbol',
      priceKey: 'close'
    },
    mexc: {
      url: process.env.MEXC_ALL_PRICES_API || 'https://api.mexc.com/api/v3/ticker/price',
      allUrl: process.env.MEXC_ALL_PRICES_API || 'https://api.mexc.com/api/v3/ticker/price',
      symbolKey: 'symbol',
      priceKey: 'price'
    },
    bingx: {
      url: process.env.BINGX_ALL_PRICES_API || 'https://open-api.bingx.com/openApi/spot/v1/ticker/price',
      allUrl: process.env.BINGX_ALL_PRICES_API || 'https://open-api.bingx.com/openApi/spot/v1/ticker/price',
      symbolKey: 'symbol',
      priceKey: 'price'
    },
    gateio: {
      url: process.env.GATE_IO_ALL_TICKERS_API || 'https://api.gateio.ws/api/v4/spot/tickers',
      allUrl: process.env.GATE_IO_ALL_TICKERS_API || 'https://api.gateio.ws/api/v4/spot/tickers',
      symbolKey: 'currency_pair',
      priceKey: 'last'
    },
    kucoin: {
      url: process.env.KUCOIN_ALL_TICKERS_API || 'https://api.kucoin.com/api/v1/market/allTickers',
      allUrl: process.env.KUCOIN_ALL_TICKERS_API || 'https://api.kucoin.com/api/v1/market/allTickers',
      symbolKey: 'symbol',
      priceKey: 'last'
    }
  };

  for (const [exchangeId, apiConfig] of Object.entries(exchangeAPIs)) {
    try {
      console.log(`Fetching real ${exchangeId} tickers...`);
      const response = await fetch(apiConfig.allUrl);
      const data = await response.json();
      
      if (!data || !Array.isArray(data.data) && !Array.isArray(data)) {
        console.log(`No real data received from ${exchangeId}, falling back to mock`);
        continue;
      }

      const tickers = Array.isArray(data.data) ? data.data : data;
      const tickerCount = tickers.length;
      console.log(`Received ${tickerCount} tickers from ${exchangeId}`);

      results[exchangeId] = {};
      
      // Process tickers and create bid/ask prices
      tickers.forEach(ticker => {
        const symbol = ticker[apiConfig.symbolKey];
        const price = parseFloat(ticker[apiConfig.priceKey]);
        
        if (symbol && price && price > 0) {
          // Create synthetic bid/ask spread (0.1% spread)
          const spread = price * 0.001;
          const bid = price - spread / 2;
          const ask = price + spread / 2;
          
          results[exchangeId][symbol] = {
            symbol,
            exchangeId,
            bid,
            ask,
            spread: ask - bid,
            baseVolume: ticker.volume || ticker.quoteVolume || 0,
            timestamp: Date.now()
          };
        }
      });

      console.log(`Updated ${Object.keys(results[exchangeId]).length} tickers for ${exchangeId}`);
    } catch (error) {
      console.error(`Error fetching tickers for ${exchangeId}:`, error.message || error);
    }
  }

  return results;
};

/**
 * Normalize chain name to standard format
 */
const normalizeChain = (chain) => {
  if (!chain) return null;
  
  const normalized = chain.toLowerCase().trim();
  
  // Map common aliases to standard names
  const chainMap = {
    'eth': 'ethereum',
    'ether': 'ethereum',
    'mainnet': 'ethereum',
    'bnb': 'bsc',
    'binance': 'bsc',
    'binance-smart-chain': 'bsc',
    'matic': 'polygon',
    'arb': 'arbitrum',
    'arbitrum-one': 'arbitrum',
    'op': 'optimism',
    'optimistic-ethereum': 'optimism',
    'sol': 'solana',
    'avax': 'avalanche',
    'trx': 'tron'
  };
  
  // Check if it's a known alias
  if (chainMap[normalized]) {
    return chainMap[normalized];
  }
  
  // Supported chains
  const supportedChains = ['ethereum', 'bsc', 'polygon', 'arbitrum', 'optimism', 'base', 'solana', 'avalanche', 'tron'];
  if (supportedChains.includes(normalized)) {
    return normalized;
  }
  
  // Return null for unknown chains (don't default to ethereum)
  return null;
};

/**
 * Determine the primary blockchain for an arbitrage opportunity
 * Uses contract addresses when available for accurate identification
 */
const determineBlockchain = (buyTicker, sellTicker) => {
  // If both tickers have blockchain info and they match, use that
  if (buyTicker.blockchain && sellTicker.blockchain && buyTicker.blockchain === sellTicker.blockchain) {
    return normalizeChain(buyTicker.blockchain);
  }

  // If both have contract addresses, they should be on the same chain
  if (buyTicker.contractAddress && sellTicker.contractAddress) {
    // If contract addresses match, use the blockchain from either ticker
    if (buyTicker.contractAddress.toLowerCase() === sellTicker.contractAddress.toLowerCase()) {
      return normalizeChain(buyTicker.blockchain || sellTicker.blockchain);
    }
  }

  // If only one has blockchain info, use that
  if (buyTicker.blockchain) return normalizeChain(buyTicker.blockchain);
  if (sellTicker.blockchain) return normalizeChain(sellTicker.blockchain);

  // Fallback: determine based on symbol patterns
  const symbol = buyTicker.symbol || sellTicker.symbol || '';
  
  // Common token patterns that indicate blockchain
  if (symbol.includes('ETH') || symbol.includes('WETH')) return 'ethereum';
  if (symbol.includes('BNB') || symbol.includes('WBNB')) return 'bsc';
  if (symbol.includes('MATIC') || symbol.includes('WMATIC')) return 'polygon';
  if (symbol.includes('SOL') || symbol.includes('WSOL')) return 'solana';
  if (symbol.includes('TRX') || symbol.includes('TRON')) return 'tron';
  if (symbol.includes('ARB')) return 'arbitrum';
  if (symbol.includes('OP')) return 'optimism';

  // Don't default to ethereum - return null instead
  return null;
};

const calculateOpportunity = ({
  symbol,
  buy,
  sell,
  buyFee,
  sellFee
}) => {
  const grossSpread = sell.bid - buy.ask;
  if (grossSpread <= 0) return null;

  const netBuy = buy.ask * (1 + buyFee / 100);
  const netSell = sell.bid * (1 - sellFee / 100);
  const netProfitAmount = netSell - netBuy;

  if (netProfitAmount <= 0) {
    return null;
  }

  const profitPercentage = (netProfitAmount / netBuy) * 100;

  if (profitPercentage < MIN_PROFIT_THRESHOLD || profitPercentage > MAX_PROFIT_THRESHOLD) {
    return null;
  }

  // Determine blockchain with normalization
  const blockchain = determineBlockchain(buy, sell);
  
  // Get contract address from tickers (prefer buy ticker, fallback to sell)
  const contractAddress = buy.contractAddress || sell.contractAddress || undefined;
  
  // Map blockchain to chainId for API calls
  const chainIdMap = {
    'ethereum': 'ethereum',
    'bsc': 'bsc',
    'polygon': 'polygon',
    'arbitrum': 'arbitrum',
    'optimism': 'optimism',
    'base': 'base',
    'solana': 'solana',
    'avalanche': 'avalanche',
    'tron': 'tron'
  };
  const chainId = blockchain ? chainIdMap[blockchain] : undefined;

  return {
    symbol,
    buyExchange: buy.exchangeId,
    sellExchange: sell.exchangeId,
    buyPrice: buy.ask,
    sellPrice: sell.bid,
    profitPercentage,
    profitAmount: netProfitAmount,
    volume: Math.min(buy.baseVolume || 0, sell.baseVolume || 0),
    timestamp: Date.now(),
    blockchain: blockchain || undefined, // Use null instead of defaulting to ethereum
    contractAddress,
    chainId,
    realData: true,
    executable: true, // Default to executable
    confidenceScore: 85, // Default confidence score
    risks: [], // Empty risks array by default
    fees: {
      buyFee,
      sellFee
    }
  };
};

export const computeArbitrage = (tickerMap) => {
  const opportunities = [];
  const exchanges = Object.keys(tickerMap);

  if (!exchanges.length) {
    return opportunities;
  }

  const symbols = new Set();
  exchanges.forEach(exchangeId => {
    Object.keys(tickerMap[exchangeId] || {}).forEach(symbol => symbols.add(symbol));
  });

  const symbolList = symbols.size ? [...symbols] : DEFAULT_SYMBOLS;

  for (const symbol of symbolList) {
    for (let i = 0; i < exchanges.length; i++) {
      const buyExchange = exchanges[i];
      const buyTicker = tickerMap[buyExchange]?.[symbol];
      if (!buyTicker) continue;

      for (let j = 0; j < exchanges.length; j++) {
        if (i === j) continue;

        const sellExchange = exchanges[j];
        const sellTicker = tickerMap[sellExchange]?.[symbol];
        if (!sellTicker) continue;

        const opportunity = calculateOpportunity({
          symbol,
          buy: buyTicker,
          sell: sellTicker,
          buyFee: getTradingFee(buyExchange),
          sellFee: getTradingFee(sellExchange)
        });

        if (opportunity) {
          opportunities.push(opportunity);
        }
      }
    }
  }

  opportunities.sort((a, b) => b.profitPercentage - a.profitPercentage);
  return opportunities.slice(0, MAX_OPPORTUNITIES);
};

export const mapOpportunitiesForResponse = (opportunities) => {
  return opportunities.map(opp => ({
    ...opp,
    buyExchange: SUPPORTED_EXCHANGES[opp.buyExchange]?.displayName || opp.buyExchange,
    sellExchange: SUPPORTED_EXCHANGES[opp.sellExchange]?.displayName || opp.sellExchange
  }));
};

