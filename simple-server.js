const express = require('express');
const app = express();
const port = process.env.PORT || 3000;

// Simple health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: Date.now(),
    uptime: process.uptime(),
    port: port,
    environment: process.env.NODE_ENV
  });
});

// Start server
app.listen(port, '0.0.0.0', () => {
  console.log(`✅ Simple health check server running on port ${port}`);
  console.log(`🏥 Health endpoint: http://0.0.0.0:${port}/api/health`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('📡 SIGTERM received, shutting down gracefully');
  process.exit(0);
});
