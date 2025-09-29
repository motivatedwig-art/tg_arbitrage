const { getDatabase } = require('./lib/database');

const mockStats = {
  total: 0,
  avgProfit: 0,
  maxProfit: 0,
  note: 'No real data available - using defaults'
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
    // Try to get real statistics from Railway database
    const db = getDatabase();
    const stats = await db.getStatistics();
    
    res.status(200).json({
      success: true,
      data: {
        ...stats,
        generatedAt: new Date().toISOString(),
        source: 'railway_database'
      }
    });
  } catch (error) {
    console.error('Error fetching stats from database:', error);
    
    // Fallback to mock stats
    res.status(200).json({
      success: true,
      data: {
        ...mockStats,
        generatedAt: new Date().toISOString(),
        source: 'mock_data'
      }
    });
  }
}
