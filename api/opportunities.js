// Real arbitrage opportunities from the running bot
// This will fetch data from the local bot server when available
let realOpportunities = [];

// Function to fetch real opportunities from the bot
async function fetchRealOpportunities() {
  try {
    // Try to fetch from the local bot server
    const response = await fetch('http://localhost:3000/api/opportunities', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      // Add timeout to prevent hanging
      signal: AbortSignal.timeout(5000)
    });
    
    if (response.ok) {
      const data = await response.json();
      if (data.success && data.data && data.data.length > 0) {
        realOpportunities = data.data;
        return realOpportunities;
      }
    }
  } catch (error) {
    // Bot server not available, will use mock data
    console.log('Bot server not available, using mock data');
  }
  
  // Fallback to mock data
  return [
    {
      symbol: 'BTC/USDT',
      buyExchange: 'Binance',
      sellExchange: 'Coinbase',
      buyPrice: 43250.50,
      sellPrice: 43320.75,
      profitPercentage: 1.62,
      profitAmount: 70.25,
      volume: 1250.5,
      timestamp: new Date().toISOString()
    },
    {
      symbol: 'ETH/USDT',
      buyExchange: 'Kraken',
      sellExchange: 'Binance',
      buyPrice: 2650.30,
      sellPrice: 2680.45,
      profitPercentage: 1.14,
      profitAmount: 30.15,
      volume: 850.2,
      timestamp: new Date().toISOString()
    },
    {
      symbol: 'ADA/USDT',
      buyExchange: 'Gate.io',
      sellExchange: 'KuCoin',
      buyPrice: 0.4850,
      sellPrice: 0.4920,
      profitPercentage: 1.44,
      profitAmount: 0.007,
      volume: 5000.0,
      timestamp: new Date().toISOString()
    },
    {
      symbol: 'SOL/USDT',
      buyExchange: 'OKX',
      sellExchange: 'Bybit',
      buyPrice: 98.50,
      sellPrice: 99.25,
      profitPercentage: 0.76,
      profitAmount: 0.75,
      volume: 2500.0,
      timestamp: new Date().toISOString()
    },
    {
      symbol: 'DOGE/USDT',
      buyExchange: 'MEXC',
      sellExchange: 'BingX',
      buyPrice: 0.0825,
      sellPrice: 0.0835,
      profitPercentage: 1.21,
      profitAmount: 0.001,
      volume: 15000.0,
      timestamp: new Date().toISOString()
    }
  ];
}

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
    // Try to get real opportunities, fallback to mock data
    const opportunities = await fetchRealOpportunities();
    
    res.status(200).json({
      success: true,
      data: opportunities,
      timestamp: Date.now(),
      source: opportunities === realOpportunities ? 'bot' : 'mock'
    });
  } catch (error) {
    console.error('Error fetching opportunities:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch opportunities'
    });
  }
}
