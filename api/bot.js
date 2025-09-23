// Bot API endpoint for Vercel serverless functions
// This runs the arbitrage bot logic on Vercel

const ccxt = require('ccxt');

// Initialize exchanges with public API access
const exchanges = {
  binance: new ccxt.binance({
    apiKey: '', // No API key needed for public data
    secret: '', // No secret needed for public data
    sandbox: false,
    enableRateLimit: true,
    timeout: 10000
  }),
  okx: new ccxt.okx({
    apiKey: '', // No API key needed for public data
    secret: '', // No secret needed for public data
    passphrase: '', // No passphrase needed for public data
    sandbox: false,
    enableRateLimit: true,
    timeout: 10000
  }),
  bybit: new ccxt.bybit({
    apiKey: '', // No API key needed for public data
    secret: '', // No secret needed for public data
    sandbox: false,
    enableRateLimit: true,
    timeout: 10000
  }),
  bitget: new ccxt.bitget({
    apiKey: '', // No API key needed for public data
    secret: '', // No secret needed for public data
    passphrase: '', // No passphrase needed for public data
    sandbox: false,
    enableRateLimit: true,
    timeout: 10000
  }),
  mexc: new ccxt.mexc({
    apiKey: '', // No API key needed for public data
    secret: '', // No secret needed for public data
    sandbox: false,
    enableRateLimit: true,
    timeout: 10000
  }),
  bingx: new ccxt.bingx({
    apiKey: '', // No API key needed for public data
    secret: '', // No secret needed for public data
    sandbox: false,
    enableRateLimit: true,
    timeout: 10000
  }),
  gateio: new ccxt.gateio({
    apiKey: '', // No API key needed for public data
    secret: '', // No secret needed for public data
    sandbox: false,
    enableRateLimit: true,
    timeout: 10000
  }),
  kucoin: new ccxt.kucoin({
    apiKey: '', // No API key needed for public data
    secret: '', // No secret needed for public data
    passphrase: '', // No passphrase needed for public data
    sandbox: false,
    enableRateLimit: true,
    timeout: 10000
  })
};

// Trading fees for each exchange (maker fees)
const tradingFees = {
  binance: 0.1,
  okx: 0.1,
  bybit: 0.1,
  bitget: 0.1,
  mexc: 0.2,
  bingx: 0.1,
  gateio: 0.2,
  kucoin: 0.1
};

// Minimum profit threshold
const MIN_PROFIT_THRESHOLD = 0.5;
const MAX_PROFIT_THRESHOLD = 110;

// Function to calculate arbitrage opportunities
async function calculateArbitrageOpportunities() {
  try {
    console.log('🔄 Starting arbitrage calculation...');
    
    // Fetch tickers from all exchanges
    const allTickers = {};
    const symbols = [
      'BTC/USDT', 'ETH/USDT', 'ADA/USDT', 'SOL/USDT', 'DOGE/USDT',
      'BNB/USDT', 'XRP/USDT', 'MATIC/USDT', 'AVAX/USDT', 'LINK/USDT',
      'UNI/USDT', 'LTC/USDT', 'ATOM/USDT', 'DOT/USDT', 'NEAR/USDT'
    ];
    
    console.log(`📊 Fetching tickers for ${symbols.length} symbols from ${Object.keys(exchanges).length} exchanges...`);
    
    for (const [exchangeName, exchange] of Object.entries(exchanges)) {
      try {
        console.log(`🔌 Connecting to ${exchangeName}...`);
        const tickers = await exchange.fetchTickers(symbols);
        allTickers[exchangeName] = tickers;
        console.log(`✅ Fetched ${Object.keys(tickers).length} tickers from ${exchangeName}`);
      } catch (error) {
        console.log(`❌ Error fetching from ${exchangeName}:`, error.message);
      }
    }

    // Calculate arbitrage opportunities
    const opportunities = [];
    
    for (const symbol of symbols) {
      const symbolTickers = {};
      
      // Collect tickers for this symbol from all exchanges
      for (const [exchangeName, tickers] of Object.entries(allTickers)) {
        if (tickers[symbol] && tickers[symbol].bid && tickers[symbol].ask) {
          symbolTickers[exchangeName] = tickers[symbol];
        }
      }
      
      // Find arbitrage opportunities
      const exchangeNames = Object.keys(symbolTickers);
      for (let i = 0; i < exchangeNames.length; i++) {
        for (let j = i + 1; j < exchangeNames.length; j++) {
          const buyExchange = exchangeNames[i];
          const sellExchange = exchangeNames[j];
          const buyTicker = symbolTickers[buyExchange];
          const sellTicker = symbolTickers[sellExchange];
          
          // Check if we can buy low and sell high
          if (buyTicker.ask < sellTicker.bid) {
            const buyFee = tradingFees[buyExchange] || 0.1;
            const sellFee = tradingFees[sellExchange] || 0.1;
            
            // Calculate net prices after fees
            const netBuyPrice = buyTicker.ask * (1 + buyFee / 100);
            const netSellPrice = sellTicker.bid * (1 - sellFee / 100);
            
            if (netBuyPrice < netSellPrice) {
              const profitAmount = netSellPrice - netBuyPrice;
              const profitPercentage = (profitAmount / netBuyPrice) * 100;
              
              if (profitPercentage >= MIN_PROFIT_THRESHOLD && profitPercentage <= MAX_PROFIT_THRESHOLD) {
                opportunities.push({
                  symbol: symbol,
                  buyExchange: buyExchange,
                  sellExchange: sellExchange,
                  buyPrice: buyTicker.ask,
                  sellPrice: sellTicker.bid,
                  profitPercentage: profitPercentage,
                  profitAmount: profitAmount,
                  volume: Math.min(buyTicker.baseVolume || 0, sellTicker.baseVolume || 0),
                  timestamp: new Date().toISOString(),
                  fees: {
                    buyFee: buyFee,
                    sellFee: sellFee
                  }
                });
              }
            }
          }
          
          // Check reverse arbitrage (sell high, buy low)
          if (sellTicker.ask < buyTicker.bid) {
            const buyFee = tradingFees[sellExchange] || 0.1;
            const sellFee = tradingFees[buyExchange] || 0.1;
            
            // Calculate net prices after fees
            const netBuyPrice = sellTicker.ask * (1 + buyFee / 100);
            const netSellPrice = buyTicker.bid * (1 - sellFee / 100);
            
            if (netBuyPrice < netSellPrice) {
              const profitAmount = netSellPrice - netBuyPrice;
              const profitPercentage = (profitAmount / netBuyPrice) * 100;
              
              if (profitPercentage >= MIN_PROFIT_THRESHOLD && profitPercentage <= MAX_PROFIT_THRESHOLD) {
                opportunities.push({
                  symbol: symbol,
                  buyExchange: sellExchange,
                  sellExchange: buyExchange,
                  buyPrice: sellTicker.ask,
                  sellPrice: buyTicker.bid,
                  profitPercentage: profitPercentage,
                  profitAmount: profitAmount,
                  volume: Math.min(buyTicker.baseVolume || 0, sellTicker.baseVolume || 0),
                  timestamp: new Date().toISOString(),
                  fees: {
                    buyFee: buyFee,
                    sellFee: sellFee
                  }
                });
              }
            }
          }
        }
      }
    }
    
    // Sort by profit percentage and return top opportunities
    opportunities.sort((a, b) => b.profitPercentage - a.profitPercentage);
    
    console.log(`🎯 Found ${opportunities.length} arbitrage opportunities`);
    
    return opportunities;
    
  } catch (error) {
    console.error('❌ Error calculating arbitrage opportunities:', error);
    throw error;
  }
}

// Main API handler
export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    console.log('🚀 Bot API called - calculating arbitrage opportunities...');
    
    const opportunities = await calculateArbitrageOpportunities();
    
    // Get exchange status
    const exchangeStatus = {};
    for (const [exchangeName, exchange] of Object.entries(exchanges)) {
      try {
        await exchange.loadMarkets();
        exchangeStatus[exchangeName] = {
          connected: true,
          markets: Object.keys(exchange.markets).length
        };
      } catch (error) {
        exchangeStatus[exchangeName] = {
          connected: false,
          error: error.message
        };
      }
    }
    
    res.status(200).json({
      success: true,
      data: {
        opportunities: opportunities,
        exchangeStatus: exchangeStatus,
        totalOpportunities: opportunities.length,
        topOpportunity: opportunities[0] || null
      },
      timestamp: Date.now(),
      source: 'vercel-bot'
    });
    
  } catch (error) {
    console.error('❌ Bot API error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to calculate arbitrage opportunities',
      details: error.message
    });
  }
}
