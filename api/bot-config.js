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

  // Simulate the bot keyboard configuration
  const webAppUrl = process.env.WEBAPP_URL || 'https://tg-arbitrage.vercel.app';
  
  res.status(200).json({
    status: 'OK',
    timestamp: Date.now(),
    bot_config: {
      webapp_url: webAppUrl,
      fallback_url: 'https://tg-arbitrage.vercel.app',
      environment_loaded: !!process.env.WEBAPP_URL
    },
    message: 'Bot configuration check'
  });
}
