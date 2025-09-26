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

  return normalized.reduce((acc, id) => {
    const meta = SUPPORTED_EXCHANGES[id];
    if (!meta) return acc;

    try {
      acc[id] = createExchangeInstance(meta);
    } catch (error) {
      console.error(`Failed to initialize exchange ${id}:`, error);
    }
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

export const fetchTickers = async (clients, symbols = DEFAULT_SYMBOLS) => {
  const results = {};

  for (const [exchangeId, client] of Object.entries(clients)) {
    try {
      await client.loadMarkets();
      const tickers = await client.fetchTickers(symbols);

      results[exchangeId] = Object.entries(tickers).reduce((acc, [symbol, ticker]) => {
        const data = formatTicker(ticker, { symbol, exchangeId });
        if (data) {
          acc[symbol] = data;
        }
        return acc;
      }, {});
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

