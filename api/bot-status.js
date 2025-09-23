// Bot status API endpoint for Vercel
// This provides information about the bot's health and status

const ccxt = require('ccxt');

// Initialize exchanges
const exchanges = {
  binance: new ccxt.binance(),
  okx: new ccxt.okx(),
  bybit: new ccxt.bybit(),
  bitget: new ccxt.bitget(),
  mexc: new ccxt.mexc(),
  bingx: new ccxt.bingx(),
  gateio: new ccxt.gateio(),
  kucoin: new ccxt.kucoin()
};

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
    console.log('🔍 Checking bot status...');
    
    const exchangeStatus = {};
    let connectedExchanges = 0;
    
    // Check each exchange
    for (const [exchangeName, exchange] of Object.entries(exchanges)) {
      try {
        const startTime = Date.now();
        await exchange.loadMarkets();
        const responseTime = Date.now() - startTime;
        
        exchangeStatus[exchangeName] = {
          connected: true,
          markets: Object.keys(exchange.markets).length,
          responseTime: responseTime,
          status: 'healthy'
        };
        connectedExchanges++;
        
        console.log(`✅ ${exchangeName}: ${Object.keys(exchange.markets).length} markets, ${responseTime}ms`);
      } catch (error) {
        exchangeStatus[exchangeName] = {
          connected: false,
          error: error.message,
          status: 'error'
        };
        console.log(`❌ ${exchangeName}: ${error.message}`);
      }
    }
    
    const botStatus = {
      status: 'running',
      timestamp: new Date().toISOString(),
      environment: 'vercel',
      connectedExchanges: connectedExchanges,
      totalExchanges: Object.keys(exchanges).length,
      exchangeStatus: exchangeStatus,
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      version: '1.0.0'
    };
    
    res.status(200).json({
      success: true,
      data: botStatus
    });
    
  } catch (error) {
    console.error('❌ Bot status error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to check bot status',
      details: error.message
    });
  }
}
