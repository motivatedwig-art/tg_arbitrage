// Debug endpoint to manually trigger scan and show detailed logs

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
    // Dynamically import the service
    const { UnifiedArbitrageService } = await import('../dist-backend/services/UnifiedArbitrageService.js');
    const { ExchangeManager } = await import('../dist-backend/exchanges/ExchangeManager.js');
    
    const service = UnifiedArbitrageService.getInstance();
    const exchangeManager = ExchangeManager.getInstance();
    
    console.log('='.repeat(60));
    console.log('🔍 DEBUG SCAN TRIGGERED VIA API');
    console.log('='.repeat(60));
    
    // Get current tickers before scan
    const tickersBefore = exchangeManager.getAllTickers();
    let totalTickersBefore = 0;
    const exchangeTickerCounts = {};
    
    for (const [exchange, tickers] of tickersBefore.entries()) {
      totalTickersBefore += tickers.length;
      exchangeTickerCounts[exchange] = tickers.length;
    }
    
    console.log(`📊 Tickers BEFORE scan: ${totalTickersBefore} total`);
    console.log('Exchange breakdown:', exchangeTickerCounts);
    
    // Trigger manual scan
    await service.triggerManualScan();
    
    // Get opportunities from database
    const { DatabaseManager } = await import('../dist-backend/database/Database.js');
    const db = DatabaseManager.getInstance();
    const opportunities = await db.getArbitrageModel().getRecentOpportunities(5);
    
    // Get tickers after scan
    const tickersAfter = exchangeManager.getAllTickers();
    let totalTickersAfter = 0;
    const exchangeTickerCountsAfter = {};
    
    for (const [exchange, tickers] of tickersAfter.entries()) {
      totalTickersAfter += tickers.length;
      exchangeTickerCountsAfter[exchange] = tickers.length;
    }
    
    console.log(`📊 Tickers AFTER scan: ${totalTickersAfter} total`);
    console.log('Exchange breakdown:', exchangeTickerCountsAfter);
    
    // Sample ticker data
    const sampleTickers = [];
    for (const [exchange, tickers] of tickersAfter.entries()) {
      if (tickers.length > 0) {
        sampleTickers.push({
          exchange,
          sample: tickers.slice(0, 2).map(t => ({
            symbol: t.symbol,
            bid: t.bid,
            ask: t.ask,
            volume: t.volume,
            blockchain: t.blockchain
          }))
        });
      }
    }
    
    res.status(200).json({
      success: true,
      debug: {
        scanCompleted: true,
        tickersBeforeScan: totalTickersBefore,
        tickersAfterScan: totalTickersAfter,
        exchangeTickerCounts: exchangeTickerCountsAfter,
        sampleTickers,
        opportunitiesFound: opportunities.length,
        opportunities: opportunities.slice(0, 5).map(opp => ({
          symbol: opp.symbol,
          buyExchange: opp.buyExchange,
          sellExchange: opp.sellExchange,
          buyPrice: opp.buyPrice,
          sellPrice: opp.sellPrice,
          profitPercentage: opp.profitPercentage,
          blockchain: opp.blockchain
        }))
      },
      message: `Scan completed. Found ${opportunities.length} opportunities. Check server logs for details.`
    });
    
  } catch (error) {
    console.error('❌ Debug scan error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      stack: error.stack
    });
  }
};

export default withCors(handler);

