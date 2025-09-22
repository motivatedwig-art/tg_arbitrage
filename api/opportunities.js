// Mock data for Vercel deployment (since we can't use SQLite)
const mockOpportunities = [
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
  },
  {
    symbol: 'MATIC/USDT',
    buyExchange: 'KuCoin',
    sellExchange: 'Gate.io',
    buyPrice: 0.8750,
    sellPrice: 0.8825,
    profitPercentage: 0.86,
    profitAmount: 0.0075,
    volume: 8000.0,
    timestamp: new Date().toISOString()
  },
  {
    symbol: 'AVAX/USDT',
    buyExchange: 'Bybit',
    sellExchange: 'OKX',
    buyPrice: 35.20,
    sellPrice: 35.65,
    profitPercentage: 1.28,
    profitAmount: 0.45,
    volume: 3200.0,
    timestamp: new Date().toISOString()
  },
  {
    symbol: 'DOT/USDT',
    buyExchange: 'Binance',
    sellExchange: 'Kraken',
    buyPrice: 6.85,
    sellPrice: 6.95,
    profitPercentage: 1.46,
    profitAmount: 0.10,
    volume: 4500.0,
    timestamp: new Date().toISOString()
  }
];

export default function handler(req, res) {
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
    res.status(200).json({
      success: true,
      data: mockOpportunities,
      timestamp: Date.now()
    });
  } catch (error) {
    console.error('Error fetching opportunities:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch opportunities'
    });
  }
}
