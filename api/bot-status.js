// Bot status API endpoint for Vercel
// This provides information about the bot's health and status

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
