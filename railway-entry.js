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

// Handle unhandled rejections and exceptions
process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ [RAILWAY-ENTRY] Unhandled Rejection:', reason);
  console.error('   Promise:', promise);
  console.error('   Stack:', reason instanceof Error ? reason.stack : 'No stack trace');
});

process.on('uncaughtException', (error) => {
  console.error('❌ [RAILWAY-ENTRY] Uncaught Exception:', error);
  console.error('   Message:', error.message);
  console.error('   Stack:', error.stack);
  process.exit(1);
});

// Import and start the main application
console.log('📦 [RAILWAY-ENTRY] Importing dist-backend/index.js...');
import('./dist-backend/index.js').then(() => {
  console.log('✅ [RAILWAY-ENTRY] Module imported successfully - application should be starting');
}).catch(error => {
  console.error('❌ [RAILWAY-ENTRY] Failed to import main application:', error);
  console.error('   Error type:', error.constructor.name);
  console.error('   Error message:', error.message);
  console.error('   Error stack:', error.stack);
  console.error('   Error code:', error.code);
  console.error('   Full error:', JSON.stringify(error, null, 2));
  process.exit(1);
});
