export default function handler(req, res) {
  // Set CORS headers for Telegram WebApp
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  // Security headers for Telegram WebApp
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('Content-Security-Policy', "frame-ancestors 'self' https://web.telegram.org");
  
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  res.status(200).json({ 
    status: 'OK', 
    timestamp: Date.now(),
    message: 'Crypto Arbitrage API is running',
    telegram_webapp: 'ready',
    version: '2025-09-23-updated',
    deploymentTest: true
  });
}