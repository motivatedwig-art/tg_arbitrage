// Simple bot API endpoint for Vercel
// This provides a lightweight version of the arbitrage bot

const ccxt = require('ccxt');

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

  try {
    console.log('🚀 Simple bot API called...');
    
    // Initialize a few key exchanges with public API access
    const exchanges = {
      binance: new ccxt.binance({
        apiKey: '', // No API key needed for public data
        secret: '', // No secret needed for public data
        sandbox: false,
        enableRateLimit: true,
        timeout: 10000
      }),
      okx: new ccxt.okx({
        apiKey: '', // No API key needed for public data
        secret: '', // No secret needed for public data
        passphrase: '', // No passphrase needed for public data
        sandbox: false,
        enableRateLimit: true,
        timeout: 10000
      }),
      bybit: new ccxt.bybit({
        apiKey: '', // No API key needed for public data
        secret: '', // No secret needed for public data
        sandbox: false,
        enableRateLimit: true,
        timeout: 10000
      })
    };

    const opportunities = [];
    const symbols = ['BTC/USDT', 'ETH/USDT', 'ADA/USDT'];
    
    // Fetch data from exchanges
    for (const [exchangeName, exchange] of Object.entries(exchanges)) {
      try {
        const tickers = await exchange.fetchTickers(symbols);
        
        for (const symbol of symbols) {
          if (tickers[symbol] && tickers[symbol].bid && tickers[symbol].ask) {
            const ticker = tickers[symbol];
            opportunities.push({
              symbol: symbol,
              exchange: exchangeName,
              bid: ticker.bid,
              ask: ticker.ask,
              volume: ticker.baseVolume || 0,
              timestamp: new Date().toISOString()
            });
          }
        }
      } catch (error) {
        console.log(`Error fetching from ${exchangeName}:`, error.message);
      }
    }
    
    // Simple arbitrage calculation
    const arbitrageOpportunities = [];
    const symbolGroups = {};
    
    // Group by symbol
    for (const opp of opportunities) {
      if (!symbolGroups[opp.symbol]) {
        symbolGroups[opp.symbol] = [];
      }
      symbolGroups[opp.symbol].push(opp);
    }
    
    // Find arbitrage opportunities
    for (const [symbol, symbolOpps] of Object.entries(symbolGroups)) {
      if (symbolOpps.length >= 2) {
        for (let i = 0; i < symbolOpps.length; i++) {
          for (let j = i + 1; j < symbolOpps.length; j++) {
            const opp1 = symbolOpps[i];
            const opp2 = symbolOpps[j];
            
            // Check if we can buy low and sell high
            if (opp1.ask < opp2.bid) {
              const profitAmount = opp2.bid - opp1.ask;
              const profitPercentage = (profitAmount / opp1.ask) * 100;
              
              if (profitPercentage > 0.1) {
                arbitrageOpportunities.push({
                  symbol: symbol,
                  buyExchange: opp1.exchange,
                  sellExchange: opp2.exchange,
                  buyPrice: opp1.ask,
                  sellPrice: opp2.bid,
                  profitPercentage: profitPercentage,
                  profitAmount: profitAmount,
                  volume: Math.min(opp1.volume, opp2.volume),
                  timestamp: new Date().toISOString()
                });
              }
            }
            
            // Check reverse arbitrage
            if (opp2.ask < opp1.bid) {
              const profitAmount = opp1.bid - opp2.ask;
              const profitPercentage = (profitAmount / opp2.ask) * 100;
              
              if (profitPercentage > 0.1) {
                arbitrageOpportunities.push({
                  symbol: symbol,
                  buyExchange: opp2.exchange,
                  sellExchange: opp1.exchange,
                  buyPrice: opp2.ask,
                  sellPrice: opp1.bid,
                  profitPercentage: profitPercentage,
                  profitAmount: profitAmount,
                  volume: Math.min(opp1.volume, opp2.volume),
                  timestamp: new Date().toISOString()
                });
              }
            }
          }
        }
      }
    }
    
    // Sort by profit percentage
    arbitrageOpportunities.sort((a, b) => b.profitPercentage - a.profitPercentage);
    
    res.status(200).json({
      success: true,
      data: {
        opportunities: arbitrageOpportunities,
        totalOpportunities: arbitrageOpportunities.length,
        exchanges: Object.keys(exchanges),
        symbols: symbols
      },
      timestamp: Date.now(),
      source: 'simple-bot'
    });
    
  } catch (error) {
    console.error('❌ Simple bot error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to calculate arbitrage opportunities',
      details: error.message
    });
  }
}
