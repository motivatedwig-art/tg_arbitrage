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

  // Use public APIs for each exchange
  const exchangeAPIs = {
    binance: {
      url: 'https://api.binance.com/api/v3/ticker/price',
      allUrl: 'https://api.binance.com/api/v3/ticker/price',
      symbolKey: 'symbol',
      priceKey: 'price'
    },
    okx: {
      url: 'https://www.okx.com/api/v5/market/tickers?instType=SPOT',
      allUrl: 'https://www.okx.com/api/v5/market/tickers?instType=SPOT',
      symbolKey: 'instId',
      priceKey: 'last'
    },
    bybit: {
      url: 'https://api.bybit.com/v5/market/tickers?category=spot',
      allUrl: 'https://api.bybit.com/v5/market/tickers?category=spot',
      symbolKey: 'symbol',
      priceKey: 'lastPrice'
    },
    bitget: {
      url: 'https://api.bitget.com/api/v2/spot/market/tickers',
      allUrl: 'https://api.bitget.com/api/v2/spot/market/tickers',
      symbolKey: 'symbol',
      priceKey: 'close'
    },
    mexc: {
      url: 'https://api.mexc.com/api/v3/ticker/price',
      allUrl: 'https://api.mexc.com/api/v3/ticker/price',
      symbolKey: 'symbol',
      priceKey: 'price'
    },
    bingx: {
      url: 'https://open-api.bingx.com/openApi/spot/v1/ticker/price',
      allUrl: 'https://open-api.bingx.com/openApi/spot/v1/ticker/price',
      symbolKey: 'symbol',
      priceKey: 'price'
    },
    gateio: {
      url: 'https://api.gateio.ws/api/v4/spot/tickers',
      allUrl: 'https://api.gateio.ws/api/v4/spot/tickers',
      symbolKey: 'currency_pair',
      priceKey: 'last'
    },
    kucoin: {
      url: 'https://api.kucoin.com/api/v1/market/allTickers',
      allUrl: 'https://api.kucoin.com/api/v1/market/allTickers',
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
    realData: true,
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

