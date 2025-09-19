const dotenv = require('dotenv');
const { ExchangeManager } = require('./dist/exchanges/ExchangeManager');
const { ArbitrageCalculator } = require('./dist/arbitrage/calculator/ArbitrageCalculator');
const { DatabaseManager } = require('./dist/database/Database');

// Load environment variables
dotenv.config();

async function testAllExchanges() {
    console.log('🧪 Testing All Exchange Connections...\n');
    
    try {
        // Initialize components
        const exchangeManager = ExchangeManager.getInstance();
        const arbitrageCalculator = new ArbitrageCalculator(0.5);
        const db = DatabaseManager.getInstance();
        
        // Initialize database
        console.log('📊 Initializing database...');
        await db.init();
        console.log('✅ Database initialized\n');
        
        // Initialize exchanges
        console.log('🔌 Initializing exchanges...');
        await exchangeManager.initializeExchanges();
        
        // Get exchange status
        const exchangeStatuses = exchangeManager.getExchangeStatus();
        const connectedExchanges = exchangeManager.getConnectedExchanges();
        
        console.log('\n📊 Exchange Connection Status:');
        console.log('='.repeat(50));
        exchangeStatuses.forEach(status => {
            const statusIcon = status.isOnline ? '🟢' : '🔴';
            console.log(`${statusIcon} ${status.name.toUpperCase()}: ${status.isOnline ? 'Connected' : 'Offline'}`);
        });
        
        console.log(`\n✅ Connected exchanges: ${connectedExchanges.length}/${exchangeStatuses.length}`);
        console.log(`📋 Connected: ${connectedExchanges.join(', ')}\n`);
        
        if (connectedExchanges.length === 0) {
            console.log('❌ No exchanges connected. Cannot proceed with arbitrage calculation.');
            return;
        }
        
        // Update ticker data
        console.log('📈 Fetching ticker data from all connected exchanges...');
        await exchangeManager.updateAllTickers();
        
        // Get ticker data
        const allTickers = exchangeManager.getAllTickers();
        let totalTickers = 0;
        
        console.log('\n📊 Ticker Data Summary:');
        console.log('='.repeat(50));
        for (const [exchange, tickers] of allTickers) {
            console.log(`${exchange}: ${tickers.length} tickers`);
            totalTickers += tickers.length;
        }
        
        console.log(`\n📊 Total tickers collected: ${totalTickers}`);
        
        if (totalTickers === 0) {
            console.log('❌ No ticker data available. Cannot calculate arbitrage opportunities.');
            return;
        }
        
        // Calculate arbitrage opportunities
        console.log('\n🔍 Calculating arbitrage opportunities...');
        const opportunities = arbitrageCalculator.calculateArbitrageOpportunities(allTickers);
        
        console.log(`\n🏆 Found ${opportunities.length} arbitrage opportunities`);
        
        if (opportunities.length > 0) {
            console.log('\n📈 Top 10 Arbitrage Opportunities:');
            console.log('='.repeat(80));
            console.log('Rank | Symbol      | Buy Exchange | Sell Exchange | Profit % | Buy Price  | Sell Price');
            console.log('-'.repeat(80));
            
            opportunities.slice(0, 10).forEach((opp, index) => {
                console.log(
                    `${(index + 1).toString().padStart(4)} | ` +
                    `${opp.symbol.padEnd(11)} | ` +
                    `${opp.buyExchange.padEnd(12)} | ` +
                    `${opp.sellExchange.padEnd(13)} | ` +
                    `${opp.profitPercentage.toFixed(2).padStart(8)}% | ` +
                    `$${opp.buyPrice.toFixed(4).padStart(9)} | ` +
                    `$${opp.sellPrice.toFixed(4)}`
                );
            });
            
            // Store opportunities in database
            console.log('\n💾 Storing opportunities in database...');
            await db.getArbitrageModel().insert(opportunities);
            console.log('✅ Opportunities stored successfully');
            
            // High profit opportunities
            const highProfitOpps = opportunities.filter(opp => opp.profitPercentage >= 2.0);
            if (highProfitOpps.length > 0) {
                console.log(`\n🚨 High Profit Opportunities (>2%): ${highProfitOpps.length}`);
                highProfitOpps.forEach(opp => {
                    console.log(`   🔥 ${opp.symbol}: ${opp.profitPercentage.toFixed(2)}% (${opp.buyExchange} → ${opp.sellExchange})`);
                });
            }
            
        } else {
            console.log('❌ No profitable arbitrage opportunities found at this time.');
            console.log('💡 This could be due to:');
            console.log('   - Efficient markets (spreads too small)');
            console.log('   - High trading fees');
            console.log('   - Minimum profit threshold too high (currently 0.5%)');
        }
        
        // Get statistics
        const stats = await db.getArbitrageModel().getStatistics();
        console.log('\n📊 Database Statistics:');
        console.log('='.repeat(30));
        console.log(`Total opportunities (24h): ${stats.total}`);
        console.log(`Average profit: ${stats.avgProfit.toFixed(2)}%`);
        console.log(`Maximum profit: ${stats.maxProfit.toFixed(2)}%`);
        
        console.log('\n✅ Exchange test completed successfully!');
        
    } catch (error) {
        console.error('\n❌ Error during exchange test:', error.message);
        console.error('Stack trace:', error.stack);
    } finally {
        // Cleanup
        try {
            const exchangeManager = ExchangeManager.getInstance();
            const db = DatabaseManager.getInstance();
            
            await exchangeManager.disconnect();
            await db.close();
            console.log('\n🧹 Cleanup completed');
        } catch (cleanupError) {
            console.error('Cleanup error:', cleanupError.message);
        }
    }
}

// Run the test
testAllExchanges().then(() => {
    console.log('\n🎉 Test completed!');
    process.exit(0);
}).catch(error => {
    console.error('\n💥 Test failed:', error);
    process.exit(1);
});
