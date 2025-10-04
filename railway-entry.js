#!/usr/bin/env node

// Railway entry point - forces Railway to run the main web application
// This file ensures Railway runs the full app instead of auto-detecting background processor

import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

console.log('🚀 Railway Entry Point - Starting Main Web Application');
console.log('🔧 Environment:', process.env.NODE_ENV || 'development');
console.log('🌐 Port:', process.env.PORT || 3000);

// Force production mode for Railway
process.env.NODE_ENV = 'production';
process.env.USE_MOCK_DATA = 'false';

// Import and start the main application
import('./dist-backend/index.js').then(() => {
  console.log('✅ Main application started successfully');
}).catch(error => {
  console.error('❌ Failed to start main application:', error);
  process.exit(1);
});
