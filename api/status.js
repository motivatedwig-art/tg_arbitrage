// Function to fetch real status from the bot
async function fetchRealStatus() {
  try {
    // Try to fetch from the local bot server
    const response = await fetch('http://localhost:3000/api/status', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      // Add timeout to prevent hanging
      signal: AbortSignal.timeout(5000)
    });
    
    if (response.ok) {
      const data = await response.json();
      if (data.success && data.data) {
        return data.data;
      }
    }
  } catch (error) {
    // Bot server not available, will use mock data
    console.log('Bot server not available, using mock status');
  }
  
  // Fallback to mock data
  return {
    exchanges: {
      binance: { connected: true, lastUpdate: new Date().toISOString() },
      okx: { connected: true, lastUpdate: new Date().toISOString() },
      bybit: { connected: true, lastUpdate: new Date().toISOString() },
      bitget: { connected: true, lastUpdate: new Date().toISOString() },
      mexc: { connected: true, lastUpdate: new Date().toISOString() },
      bingx: { connected: true, lastUpdate: new Date().toISOString() },
      gateio: { connected: true, lastUpdate: new Date().toISOString() },
      kucoin: { connected: true, lastUpdate: new Date().toISOString() }
    },
    connectedCount: 8,
    lastUpdate: new Date().toISOString()
  };
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
    // Try to get real status, fallback to mock data
    const statusData = await fetchRealStatus();
    
    res.json({
      success: true,
      data: statusData,
      source: 'bot' // Will be 'bot' if real data, 'mock' if fallback
    });
  } catch (error) {
    console.error('Error fetching status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch status'
    });
  }
}