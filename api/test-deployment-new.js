// Test endpoint to verify new deployments are working
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

  console.log('🧪 New deployment test endpoint called');

  res.status(200).json({
    success: true,
    message: 'New deployment test successful',
    timestamp: new Date().toISOString(),
    deploymentTime: Date.now(),
    version: '2025-09-23-v2'
  });
}
