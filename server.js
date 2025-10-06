const express = require('express');
const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(express.json());

// Health check endpoint (Railway requirement)
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    timestamp: Date.now(),
    uptime: process.uptime(),
    service: 'crypto-arbitrage-app',
    environment: process.env.NODE_ENV || 'production',
    message: 'Health check passed'
  });
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    service: 'Crypto Arbitrage Bot',
    status: 'running',
    timestamp: new Date().toISOString(),
    endpoints: {
      health: '/api/health'
    }
  });
});

// Start server
console.log('🚀 SIMPLE SERVER.JS STARTING...');
console.log('🔧 Environment:', process.env.NODE_ENV);
console.log('🌐 Port:', port);

app.listen(port, '0.0.0.0', () => {
  console.log(`✅ Simple Express server running on port ${port}`);
  console.log(`🏥 Health endpoint: http://0.0.0.0:${port}/api/health`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('📡 SIGTERM received, shutting down gracefully');
  process.exit(0);
});



