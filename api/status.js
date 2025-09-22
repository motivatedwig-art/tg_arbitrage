const mockStatus = {
  exchanges: [
    { name: 'Binance', connected: true },
    { name: 'Coinbase', connected: true },
    { name: 'Kraken', connected: true },
    { name: 'Gate.io', connected: true },
    { name: 'KuCoin', connected: true },
    { name: 'OKX', connected: true },
    { name: 'Bybit', connected: true }
  ],
  connectedCount: 7,
  lastUpdate: new Date().toISOString()
};

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
      data: mockStatus
    });
  } catch (error) {
    console.error('Error fetching status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch status'
    });
  }
}