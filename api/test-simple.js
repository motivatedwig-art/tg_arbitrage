// Simple test endpoint to verify Vercel function execution
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

  // Force log to appear in Vercel logs
  console.log('🧪 Simple test endpoint called');
  console.log('Request method:', req.method);
  console.log('Request URL:', req.url);
  console.log('Request headers:', req.headers);

  try {
    console.log('🔄 About to test CCXT...');
    
    // Test CCXT import
    const ccxt = require('ccxt');
    console.log('✅ CCXT imported successfully');
    
    // Test exchange creation
    const exchange = new ccxt.binance({
      apiKey: '',
      secret: '',
      sandbox: false,
      enableRateLimit: true,
      timeout: 10000
    });
    console.log('✅ Exchange created successfully');
    
    // Test simple API call
    console.log('🔄 Testing simple API call...');
    const ticker = await exchange.fetchTicker('BTC/USDT');
    console.log('✅ API call successful:', ticker);
    
    res.status(200).json({
      success: true,
      message: 'Simple test successful',
      data: {
        symbol: ticker.symbol,
        bid: ticker.bid,
        ask: ticker.ask,
        last: ticker.last,
        volume: ticker.baseVolume
      },
      timestamp: Date.now()
    });
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    console.error('Error details:', error.message);
    console.error('Error stack:', error.stack);
    
    res.status(500).json({
      success: false,
      error: 'Test failed',
      details: error.message,
      errorName: error.name,
      errorCode: error.code,
      stack: error.stack
    });
  }
}
