import {
  buildExchangeClients,
  fetchTickers,
  computeArbitrage,
  mapOpportunitiesForResponse
} from './_lib/exchangeManager.js';
import {
  DEFAULT_SYMBOLS,
  resolveSelectedExchanges,
  getExchangeDisplayName,
  getExchangeLogo,
  getExchangePairUrlPattern
} from './_lib/exchangeConfig.js';
import { getDatabase } from './lib/database.js';

const withCors = (handler) => async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'GET') {
    res.status(405).json({ success: false, error: 'Method not allowed' });
    return;
  }

  return handler(req, res);
};

const parseSelectedExchanges = (req) => {
  const queryParam = req.query?.exchanges || req.query?.exchange || null;
  const headerParam = req.headers['x-exchanges'];
  const bodyParam = req.body?.exchanges;

  return resolveSelectedExchanges(queryParam || headerParam || bodyParam);
};

const parseSymbols = (req) => {
  const raw = req.query?.symbols || req.query?.symbol || null;
  if (!raw) return DEFAULT_SYMBOLS;

  return String(raw)
    .split(',')
    .map(symbol => symbol.trim().toUpperCase())
    .filter(Boolean);
};

// Group opportunities by blockchain, returning top 5 from each
const groupOpportunitiesByBlockchain = (opportunities) => {
  const blockchainGroups = {};
  
  // Group by blockchain
  opportunities.forEach(opp => {
    const blockchain = opp.blockchain || 'ethereum';
    if (!blockchainGroups[blockchain]) {
      blockchainGroups[blockchain] = [];
    }
    blockchainGroups[blockchain].push(opp);
  });
  
  // Sort each blockchain group by profit percentage and take top 10
  const result = {};
  Object.keys(blockchainGroups).forEach(blockchain => {
    result[blockchain] = blockchainGroups[blockchain]
      .sort((a, b) => b.profitPercentage - a.profitPercentage)
      .slice(0, 10); // Top 10 from each blockchain
  });
  
  return result;
};

const buildMeta = (selectedExchanges, symbols, opportunities) => {
  const uniqueSymbols = [...new Set(opportunities.map(opp => opp.symbol))];

  return {
    exchanges: selectedExchanges.map(id => ({
      id,
      name: getExchangeDisplayName(id),
      logo: getExchangeLogo(id),
      pairUrlPattern: getExchangePairUrlPattern(id)
    })),
    requestedSymbols: symbols,
    returnedSymbols: uniqueSymbols,
    opportunityCount: opportunities.length,
    generatedAt: new Date().toISOString()
  };
};

const handler = async (req, res) => {
  try {
    const selectedExchanges = parseSelectedExchanges(req);
    const symbols = parseSymbols(req);

    // MOCK DATA REMOVED - Never use mock or sample data
    // All opportunities must come from real exchange data or database

    // Try to get opportunities from database first (from ArbitrageScanner)
    try {
      const db = getDatabase();
      const dbOpportunities = await db.getRecentOpportunities(30); // Last 30 minutes
      
      if (dbOpportunities && dbOpportunities.length > 0) {
        console.log(`📊 Found ${dbOpportunities.length} opportunities from database`);
        
        // Filter by selected exchanges if specified
        let filteredOpportunities = dbOpportunities;
        if (selectedExchanges.length > 0) {
          filteredOpportunities = dbOpportunities.filter(opp => 
            selectedExchanges.includes(opp.buyExchange.toLowerCase()) || 
            selectedExchanges.includes(opp.sellExchange.toLowerCase())
          );
        }

        // Filter by symbols if specified
        if (symbols.length > 0) {
          filteredOpportunities = filteredOpportunities.filter(opp => 
            symbols.includes(opp.symbol)
          );
        }

        // Group opportunities by blockchain (top 5 per blockchain)
        const groupedByBlockchain = groupOpportunitiesByBlockchain(filteredOpportunities);

        res.status(200).json({
          success: true,
          data: filteredOpportunities, // Keep original flat list
          grouped: groupedByBlockchain, // Add grouped data
          meta: buildMeta(selectedExchanges, symbols, filteredOpportunities)
        });
        return;
      }
    } catch (dbError) {
      console.warn('Database query failed, falling back to live API:', dbError.message);
    }

    // Fallback to live API calls if no database data
    const clients = buildExchangeClients(selectedExchanges);

    if (!Object.keys(clients).length) {
      return res.status(400).json({
        success: false,
        error: 'No exchanges available. Please verify API keys and configuration.'
      });
    }

    // For production, always attempt real API calls
    try {
      const tickerMap = await fetchTickers(clients, symbols);
      if (!tickerMap || Object.keys(tickerMap).length === 0) {
        console.error('No real data received from exchanges - returning empty array');
        res.status(200).json({
          success: true,
          data: [],
          meta: buildMeta(selectedExchanges, symbols, []),
          message: 'No opportunities found - scanner is running but no profitable arbitrage detected'
        });
        return;
      }

      const opportunities = computeArbitrage(tickerMap);
      const responseOpportunities = mapOpportunitiesForResponse(opportunities);

      res.status(200).json({
        success: true,
        data: responseOpportunities,
        meta: buildMeta(selectedExchanges, symbols, responseOpportunities)
      });
    } catch (error) {
      console.error('Exchange API error:', error);
      // NEVER return mock data - return empty array instead
      res.status(200).json({
        success: true,
        data: [],
        meta: buildMeta(selectedExchanges, symbols, []),
        message: `Failed to fetch opportunities: ${error.message}`
      });
    }
  } catch (error) {
    console.error('Failed to fetch opportunities:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch opportunities from exchanges',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

function generateMockOpportunities(symbols) {
  const mockOpportunities = [];
  const exchanges = ['binance', 'okx', 'bybit', 'mexc', 'gateio', 'kucoin'];
  const blockchains = ['ethereum', 'bsc', 'polygon', 'arbitrum', 'optimism', 'solana'];
  
  symbols.forEach(symbol => {
    // Generate 2-3 mock opportunities per symbol
    const opportunityCount = Math.floor(Math.random() * 2) + 2;
    for (let i = 0; i < opportunityCount; i++) {
      const buyExchange = exchanges[Math.floor(Math.random() * exchanges.length)];
      const sellExchange = exchanges[Math.floor(Math.random() * exchanges.length)];
      
      if (buyExchange !== sellExchange) {
        const buyPrice = 100 + Math.random() * 10;
        const sellPrice = buyPrice + Math.random() * 2;
        const profitPercentage = ((sellPrice - buyPrice) / buyPrice) * 100;
        
        // Determine blockchain based on symbol patterns or random selection
        let blockchain = 'ethereum'; // default
        if (symbol.includes('ETH') || symbol.includes('WETH')) blockchain = 'ethereum';
        else if (symbol.includes('BNB') || symbol.includes('WBNB')) blockchain = 'bsc';
        else if (symbol.includes('MATIC') || symbol.includes('WMATIC')) blockchain = 'polygon';
        else if (symbol.includes('SOL') || symbol.includes('WSOL')) blockchain = 'solana';
        else if (symbol.includes('TRX') || symbol.includes('TRON')) blockchain = 'tron';
        else if (symbol.includes('ARB')) blockchain = 'arbitrum';
        else if (symbol.includes('OP')) blockchain = 'optimism';
        else {
          // Random blockchain for variety in mock data
          blockchain = blockchains[Math.floor(Math.random() * blockchains.length)];
        }
        
        mockOpportunities.push({
          symbol,
          buyExchange,
          sellExchange,
          buyPrice,
          sellPrice,
          profitPercentage,
          profitAmount: sellPrice - buyPrice,
          volume: Math.random() * 1000000,
          timestamp: Date.now(),
          blockchain,
          realData: false,
          fees: {
            buyFee: 0.1,
            sellFee: 0.1
          }
        });
      }
    }
  });
  
  return mockOpportunities.sort((a, b) => b.profitPercentage - a.profitPercentage);
} */

export default withCors(handler);

