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

  // Return environment info (without sensitive data)
  res.status(200).json({
    status: 'OK',
    timestamp: Date.now(),
    environment: {
      NODE_ENV: process.env.NODE_ENV,
      WEBAPP_URL: process.env.WEBAPP_URL || 'NOT_SET',
      PORT: process.env.PORT || 'NOT_SET',
      // Don't expose sensitive tokens
      HAS_TELEGRAM_TOKEN: !!process.env.TELEGRAM_BOT_TOKEN,
      HAS_MIN_PROFIT: !!process.env.MIN_PROFIT_THRESHOLD,
      HAS_MAX_PROFIT: !!process.env.MAX_PROFIT_THRESHOLD
    },
    message: 'Environment variables check'
  });
}
