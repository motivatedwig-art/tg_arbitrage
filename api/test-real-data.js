// Test endpoint to verify real data fetching works
const ccxt = require('ccxt');

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
    console.log('🧪 Testing real data fetching...');
    
    // Test with just one exchange and one symbol
    const exchange = new ccxt.binance();
    const symbol = 'BTC/USDT';
    
    console.log(`🔌 Fetching ${symbol} from Binance...`);
    const ticker = await exchange.fetchTicker(symbol);
    
    console.log('✅ Successfully fetched real data:', ticker);
    
    res.status(200).json({
      success: true,
      data: {
        symbol: symbol,
        exchange: 'binance',
        bid: ticker.bid,
        ask: ticker.ask,
        last: ticker.last,
        volume: ticker.baseVolume,
        timestamp: new Date().toISOString(),
        realData: true
      },
      message: 'Real data fetching works!',
      timestamp: Date.now()
    });
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch real data',
      details: error.message,
      stack: error.stack
    });
  }
}
