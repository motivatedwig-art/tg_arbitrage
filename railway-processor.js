import dotenv from 'dotenv';
import express from 'express';
import { BackgroundProcessor } from './src/services/BackgroundProcessor.js';

// Load environment variables
dotenv.config();

console.log('🚀 RAILWAY-PROCESSOR.JS STARTING...');
console.log('🔧 Environment:', process.env.NODE_ENV);
console.log('🌐 Port:', process.env.PORT || 3000);

// Create Express app for Railway health checks
const app = express();
const port = process.env.PORT || 3000;

// Health check endpoint (required by Railway)
app.get('/api/health', (req, res) => {
  try {
    const status = processor ? processor.getStatus() : { status: 'starting' };
    res.status(200).json({
      status: 'OK',
      timestamp: Date.now(),
      uptime: process.uptime(),
      service: 'crypto-arbitrage-processor',
      ...status
    });
  } catch (error) {
    res.status(500).json({ 
      status: 'error', 
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Legacy health endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: Date.now() });
});

// Root endpoint with status
app.get('/', (req, res) => {
  res.json({
    service: 'Crypto Arbitrage Background Processor',
    status: 'running',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    endpoints: {
      health: '/health'
    }
  });
});

// Initialize processor
const processor = new BackgroundProcessor();

// Handle shutdown gracefully
process.on('SIGINT', async () => {
  console.log('\n📡 Received SIGINT signal');
  await processor.stop();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n📡 Received SIGTERM signal');
  await processor.stop();
  process.exit(0);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});

// Start the processor
processor.start().catch(error => {
  console.error('Failed to start processor:', error);
  process.exit(1);
});

// Start Express server (Railway requires this)
app.listen(port, '0.0.0.0', () => {
  console.log(`🌐 Background processor health check server running on port ${port}`);
});

