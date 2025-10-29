/**
 * API endpoint to trigger manual blockchain scan
 * GET /api/blockchain-scan - Trigger blockchain detection scan
 */

import { BlockchainScannerJob } from '../dist-backend/jobs/BlockchainScannerJob.js';
import { BlockchainAggregator } from '../dist-backend/services/BlockchainAggregator.js';

const withCors = (handler) => async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  return handler(req, res);
};

const handler = async (req, res) => {
  try {
    if (req.method === 'GET') {
      // Get scan status
      const job = new BlockchainScannerJob();
      const status = job.getStatus();
      
      const aggregator = new BlockchainAggregator();
      const data = aggregator.getAggregatedData();
      
      res.status(200).json({
        success: true,
        status,
        statistics: {
          totalTokens: data.size,
          highConfidence: Array.from(data.values()).filter(t => t.confidence >= 80).length,
          verified: Array.from(data.values()).filter(t => t.contractVerified).length
        }
      });
      return;
    }

    if (req.method === 'POST') {
      // Trigger manual scan
      console.log('🔄 Manual blockchain scan triggered via API');
      
      const startTime = Date.now();
      
      try {
        await BlockchainScannerJob.runNow();
        
        const duration = ((Date.now() - startTime) / 1000).toFixed(2);
        
        const aggregator = new BlockchainAggregator();
        const data = aggregator.getAggregatedData();
        
        res.status(200).json({
          success: true,
          message: 'Blockchain scan completed successfully',
          duration: `${duration}s`,
          statistics: {
            totalTokens: data.size,
            highConfidence: Array.from(data.values()).filter(t => t.confidence >= 80).length,
            verified: Array.from(data.values()).filter(t => t.contractVerified).length
          }
        });
      } catch (error) {
        console.error('❌ Blockchain scan error:', error);
        res.status(500).json({
          success: false,
          error: error.message || 'Failed to run blockchain scan',
          details: error.stack
        });
      }
      return;
    }

    res.status(405).json({
      success: false,
      error: 'Method not allowed'
    });
  } catch (error) {
    console.error('Blockchain scan API error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      details: error.message
    });
  }
};

export default withCors(handler);

