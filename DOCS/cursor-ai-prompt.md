# Cursor AI Prompt: Fix Telegram Crypto Arbitrage Bot Issues

## Context
I have a Telegram crypto arbitrage bot hosted on Railway that fetches price data from public APIs (Binance, OKX, Bybit) and displays arbitrage opportunities. The bot has critical issues with UI rendering, data fetching, and mock data appearing instead of real exchange data.

## Current Issues to Fix

### 1. UI Not Rendering Properly in Telegram WebApp
**Problem**: The webapp shows plain text instead of styled UI components when accessed through Telegram.
**Symptoms**: No CSS styles applied, React components not rendering, plain HTML visible.

### 2. Mock Data Showing Instead of Real Exchange Data
**Problem**: The bot displays mock/fake data instead of fetching real prices from exchanges.
**Symptoms**: Unrealistic profit percentages, same prices across exchanges, mock data in terminal.

### 3. Frontend Not Loading on Vercel
**Problem**: When deployed to Vercel, the frontend doesn't load or display anything.
**Symptoms**: Blank page, CORS errors, API connection failures.

## Required Fixes

### Fix 1: Update React App for Telegram WebApp Compatibility
**File**: `src/ReactApp.tsx`

Replace the current ReactApp with this enhanced version that properly renders in Telegram:

```typescript
import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom/client';

interface ArbitrageOpportunity {
  symbol: string;
  buyExchange: string;
  sellExchange: string;
  buyPrice: number;
  sellPrice: number;
  profitPercentage: number;
  profitAmount: number;
  volume: number;
  timestamp: number;
}

const App: React.FC = () => {
  const [opportunities, setOpportunities] = useState<ArbitrageOpportunity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  useEffect(() => {
    fetchOpportunities();
    const interval = setInterval(fetchOpportunities, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchOpportunities = async () => {
    try {
      setError(null);
      const response = await fetch('/api/opportunities');
      if (!response.ok) throw new Error('Failed to fetch data');
      
      const data = await response.json();
      if (data.success && data.data) {
        setOpportunities(data.data);
        setLastUpdate(new Date());
      } else {
        throw new Error('Invalid data format');
      }
    } catch (error) {
      console.error('Failed to fetch opportunities:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 4
    }).format(price);
  };

  const getProfitColor = (profit: number) => {
    if (profit >= 2) return '#10b981';
    if (profit >= 1) return '#3b82f6';
    if (profit >= 0.5) return '#f59e0b';
    return '#6b7280';
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      padding: '20px',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
    }}>
      <div style={{
        maxWidth: '1200px',
        margin: '0 auto'
      }}>
        {/* Header */}
        <div style={{
          background: 'white',
          borderRadius: '12px',
          padding: '20px',
          marginBottom: '20px',
          boxShadow: '0 10px 40px rgba(0,0,0,0.1)'
        }}>
          <h1 style={{
            margin: 0,
            fontSize: '24px',
            color: '#1f2937',
            display: 'flex',
            alignItems: 'center',
            gap: '10px'
          }}>
            <span>🔄</span>
            Crypto Arbitrage Scanner
          </h1>
          {lastUpdate && (
            <p style={{ margin: '10px 0 0', color: '#6b7280', fontSize: '14px' }}>
              Last updated: {lastUpdate.toLocaleTimeString()}
            </p>
          )}
        </div>

        {/* Error Message */}
        {error && (
          <div style={{
            background: '#fee2e2',
            border: '1px solid #fecaca',
            borderRadius: '8px',
            padding: '15px',
            marginBottom: '20px',
            color: '#dc2626'
          }}>
            ⚠️ Error: {error}
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div style={{
            background: 'white',
            borderRadius: '12px',
            padding: '40px',
            textAlign: 'center'
          }}>
            <div style={{
              width: '50px',
              height: '50px',
              border: '3px solid #f3f4f6',
              borderTop: '3px solid #6366f1',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite',
              margin: '0 auto'
            }}>
            </div>
            <p style={{ marginTop: '20px', color: '#6b7280' }}>
              Scanning exchanges for arbitrage opportunities...
            </p>
          </div>
        )}

        {/* Opportunities Table */}
        {!loading && opportunities.length > 0 && (
          <div style={{
            background: 'white',
            borderRadius: '12px',
            overflow: 'hidden',
            boxShadow: '0 10px 40px rgba(0,0,0,0.1)'
          }}>
            <div style={{
              overflowX: 'auto'
            }}>
              <table style={{
                width: '100%',
                borderCollapse: 'collapse'
              }}>
                <thead>
                  <tr style={{
                    background: '#f9fafb',
                    borderBottom: '2px solid #e5e7eb'
                  }}>
                    <th style={{ padding: '12px', textAlign: 'left', fontSize: '14px', fontWeight: '600', color: '#374151' }}>
                      Symbol
                    </th>
                    <th style={{ padding: '12px', textAlign: 'left', fontSize: '14px', fontWeight: '600', color: '#374151' }}>
                      Buy Exchange
                    </th>
                    <th style={{ padding: '12px', textAlign: 'left', fontSize: '14px', fontWeight: '600', color: '#374151' }}>
                      Buy Price
                    </th>
                    <th style={{ padding: '12px', textAlign: 'left', fontSize: '14px', fontWeight: '600', color: '#374151' }}>
                      Sell Exchange
                    </th>
                    <th style={{ padding: '12px', textAlign: 'left', fontSize: '14px', fontWeight: '600', color: '#374151' }}>
                      Sell Price
                    </th>
                    <th style={{ padding: '12px', textAlign: 'left', fontSize: '14px', fontWeight: '600', color: '#374151' }}>
                      Profit %
                    </th>
                    <th style={{ padding: '12px', textAlign: 'left', fontSize: '14px', fontWeight: '600', color: '#374151' }}>
                      Volume
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {opportunities.map((opp, index) => (
                    <tr key={index} style={{
                      borderBottom: '1px solid #e5e7eb',
                      transition: 'background 0.2s',
                      cursor: 'pointer'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = '#f9fafb'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'white'}
                    >
                      <td style={{ padding: '12px', fontSize: '14px', fontWeight: '500' }}>
                        {opp.symbol}
                      </td>
                      <td style={{ padding: '12px', fontSize: '14px' }}>
                        <span style={{
                          background: '#dbeafe',
                          color: '#1e40af',
                          padding: '4px 8px',
                          borderRadius: '4px',
                          fontSize: '12px',
                          fontWeight: '500'
                        }}>
                          {opp.buyExchange}
                        </span>
                      </td>
                      <td style={{ padding: '12px', fontSize: '14px' }}>
                        {formatPrice(opp.buyPrice)}
                      </td>
                      <td style={{ padding: '12px', fontSize: '14px' }}>
                        <span style={{
                          background: '#dcfce7',
                          color: '#166534',
                          padding: '4px 8px',
                          borderRadius: '4px',
                          fontSize: '12px',
                          fontWeight: '500'
                        }}>
                          {opp.sellExchange}
                        </span>
                      </td>
                      <td style={{ padding: '12px', fontSize: '14px' }}>
                        {formatPrice(opp.sellPrice)}
                      </td>
                      <td style={{ padding: '12px', fontSize: '14px' }}>
                        <span style={{
                          color: getProfitColor(opp.profitPercentage),
                          fontWeight: '600'
                        }}>
                          +{opp.profitPercentage.toFixed(2)}%
                        </span>
                      </td>
                      <td style={{ padding: '12px', fontSize: '14px', color: '#6b7280' }}>
                        {opp.volume?.toFixed(2) || 'N/A'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* No Opportunities Message */}
        {!loading && opportunities.length === 0 && !error && (
          <div style={{
            background: 'white',
            borderRadius: '12px',
            padding: '40px',
            textAlign: 'center'
          }}>
            <span style={{ fontSize: '48px' }}>📊</span>
            <h3 style={{ color: '#374151', marginTop: '20px' }}>No Arbitrage Opportunities Found</h3>
            <p style={{ color: '#6b7280', marginTop: '10px' }}>
              The market is currently balanced. Check back in a few moments for new opportunities.
            </p>
          </div>
        )}
      </div>

      {/* CSS Animation */}
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

ReactDOM.createRoot(document.getElementById('root')!).render(<App />);
```

### Fix 2: Disable Mock Data and Fix Exchange Adapters
**File**: `.env`

Ensure your environment variables are set correctly:
```env
TELEGRAM_BOT_TOKEN=your_actual_bot_token_here
WEBAPP_URL=https://your-railway-app.up.railway.app
PORT=3000
USE_MOCK_DATA=false
NODE_ENV=production
```

### Fix 3: Update Exchange Adapters to Fetch Real Data
**File**: `src/exchanges/adapters/BinanceAdapter.ts`

Update the getTickers method to ensure real data fetching:

```typescript
async getTickers(): Promise<Ticker[]> {
  // Force real data in production
  if (process.env.NODE_ENV === 'production' || process.env.USE_MOCK_DATA === 'false') {
    if (!this.connected) {
      await this.connect();
    }

    try {
      const response = await fetch('https://api.binance.com/api/v3/ticker/24hr', {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        }
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      // Filter and parse real ticker data
      const tickers = data
        .filter((item: any) => {
          return item.symbol.endsWith('USDT') && 
                 parseFloat(item.volume) > 0 &&
                 parseFloat(item.bidPrice) > 0 &&
                 parseFloat(item.askPrice) > 0;
        })
        .slice(0, 20) // Get more pairs for better opportunities
        .map((item: any) => ({
          symbol: this.formatSymbol(item.symbol),
          bid: parseFloat(item.bidPrice),
          ask: parseFloat(item.askPrice),
          timestamp: Date.now(),
          exchange: 'binance',
          volume: parseFloat(item.volume)
        }));

      console.log(`Binance: Fetched ${tickers.length} real tickers`);
      return tickers;
      
    } catch (error) {
      console.error('Binance API error:', error);
      // Only return empty array in production to avoid mock data
      return [];
    }
  }
  
  // Only use mock data in development
  return this.generateMockTickers();
}

private formatSymbol(symbol: string): string {
  // Convert BTCUSDT to BTC/USDT
  return symbol.replace('USDT', '/USDT');
}
```

Apply similar changes to `OKXAdapter.ts` and `BybitAdapter.ts`.

### Fix 4: Update Web Server CORS and Static File Serving
**File**: `src/webapp/server.ts`

```typescript
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import path from 'path';
import { fileURLToPath } from 'url';
import { DatabaseManager } from '../database/Database.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class WebAppServer {
  private app: express.Application;
  private server: any;
  private db: DatabaseManager;

  constructor() {
    this.app = express();
    this.db = DatabaseManager.getInstance();
    this.setupMiddleware();
    this.setupRoutes();
  }

  private setupMiddleware(): void {
    // Configure helmet for Telegram WebApp
    this.app.use(helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", "https://telegram.org"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          imgSrc: ["'self'", "data:", "https:"],
          connectSrc: ["'self'", "https://api.binance.com", "https://www.okx.com", "https://api.bybit.com"],
        },
      },
      crossOriginEmbedderPolicy: false,
    }));

    // Configure CORS for Telegram and your domains
    this.app.use(cors({
      origin: (origin, callback) => {
        const allowedOrigins = [
          'https://web.telegram.org',
          'https://telegram.org',
          process.env.WEBAPP_URL,
          'http://localhost:3000',
          'http://localhost:5173'
        ];
        
        if (!origin || allowedOrigins.includes(origin) || origin.includes('.telegram.org')) {
          callback(null, true);
        } else {
          callback(null, true); // Allow all origins for Telegram compatibility
        }
      },
      credentials: true
    }));

    this.app.use(express.json());
    
    // Serve static files properly
    this.app.use(express.static(path.join(__dirname, '../../dist')));
  }

  private setupRoutes(): void {
    // API endpoint for opportunities
    this.app.get('/api/opportunities', async (req, res) => {
      try {
        const opportunities = await this.db.getArbitrageModel().getRecentOpportunities();
        
        // Filter out mock data characteristics
        const realOpportunities = opportunities.filter(opp => {
          return opp.profit_percentage > 0.1 && 
                 opp.profit_percentage < 5 && // Realistic profit range
                 opp.buy_price > 0 &&
                 opp.sell_price > 0;
        });
        
        res.json({ 
          success: true, 
          data: realOpportunities.map(opp => ({
            symbol: opp.symbol,
            buyExchange: opp.buy_exchange,
            sellExchange: opp.sell_exchange,
            buyPrice: opp.buy_price,
            sellPrice: opp.sell_price,
            profitPercentage: opp.profit_percentage,
            profitAmount: opp.profit_amount,
            volume: opp.volume,
            timestamp: opp.timestamp
          }))
        });
      } catch (error) {
        console.error('API error:', error);
        res.status(500).json({ 
          success: false, 
          error: 'Failed to fetch opportunities',
          message: error.message 
        });
      }
    });

    // Health check endpoint
    this.app.get('/api/health', (req, res) => {
      res.json({ 
        status: 'OK', 
        timestamp: Date.now(),
        environment: process.env.NODE_ENV,
        mockData: process.env.USE_MOCK_DATA === 'true'
      });
    });

    // Serve React app for all other routes
    this.app.get('*', (req, res) => {
      res.sendFile(path.join(__dirname, '../../dist/index.html'));
    });
  }

  public start(port: number): Promise<void> {
    return new Promise((resolve, reject) => {
      this.server = this.app.listen(port, () => {
        console.log(`🌐 Web server running on port ${port}`);
        console.log(`📊 Environment: ${process.env.NODE_ENV}`);
        console.log(`📡 Mock Data: ${process.env.USE_MOCK_DATA === 'true' ? 'ENABLED' : 'DISABLED'}`);
        resolve();
      });
      this.server.on('error', reject);
    });
  }
}
```

### Fix 5: Update Main Index File
**File**: `src/index.ts`

Add environment validation and ensure real data fetching:

```typescript
import dotenv from 'dotenv';
dotenv.config();

// Validate environment
if (process.env.NODE_ENV === 'production') {
  process.env.USE_MOCK_DATA = 'false'; // Force disable mock data in production
}

console.log('🔧 Configuration:');
console.log(`  - Environment: ${process.env.NODE_ENV || 'development'}`);
console.log(`  - Mock Data: ${process.env.USE_MOCK_DATA === 'true' ? 'ENABLED' : 'DISABLED'}`);
console.log(`  - Port: ${process.env.PORT || 3000}`);

// Rest of your existing code...
```

### Fix 6: Update Vite Configuration for Production Build
**File**: `vite.config.ts`

```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  root: '.',
  publicDir: 'public',
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    sourcemap: false,
    rollupOptions: {
      input: {
        main: path.resolve(__dirname, 'public/index.html'),
      },
    },
  },
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
});
```

### Fix 7: Update Package.json Build Scripts
**File**: `package.json`

```json
{
  "scripts": {
    "dev": "USE_MOCK_DATA=false tsx watch src/index.ts",
    "build": "npm run build:frontend && npm run build:backend",
    "build:frontend": "vite build",
    "build:backend": "tsc",
    "start": "NODE_ENV=production USE_MOCK_DATA=false node dist/index.js",
    "start:production": "NODE_ENV=production USE_MOCK_DATA=false node dist/index.js"
  }
}
```

## Deployment Steps for Railway

1. **Update Railway Environment Variables:**
   - Go to Railway dashboard
   - Add these variables:
     ```
     NODE_ENV=production
     USE_MOCK_DATA=false
     TELEGRAM_BOT_TOKEN=your_actual_token
     PORT=3000
     ```

2. **Update Railway.json:**
   ```json
   {
     "build": {
       "builder": "NIXPACKS",
       "buildCommand": "npm install && npm run build"
     },
     "deploy": {
       "startCommand": "npm run start:production",
       "healthcheckPath": "/api/health"
     }
   }
   ```

3. **Deploy to Railway:**
   ```bash
   git add .
   git commit -m "Fix UI rendering and real data fetching"
   git push origin main
   ```

## Testing Instructions

1. **Test locally first:**
   ```bash
   USE_MOCK_DATA=false npm run dev
   ```

2. **Check the health endpoint:**
   ```bash
   curl http://localhost:3000/api/health
   ```

3. **Verify real data is being fetched:**
   - Check console logs for "Fetched X real tickers"
   - Ensure no mock data messages appear

4. **Test Telegram WebApp:**
   - Open your bot in Telegram
   - Click the WebApp button
   - Verify the styled table appears with real data

## Expected Results After Fixes

1. ✅ Styled UI with proper table formatting in Telegram WebApp
2. ✅ Real exchange data showing actual price differences
3. ✅ Profit percentages between 0.1% - 5% (realistic range)
4. ✅ No mock data in production environment
5. ✅ Responsive design that works on mobile devices
6. ✅ Auto-refresh every 30 seconds with live data

## Additional Debugging Commands

```bash
# Check if real APIs are accessible
curl https://api.binance.com/api/v3/ping
curl https://www.okx.com/api/v5/public/time
curl https://api.bybit.com/v5/market/time

# Test your API endpoint
curl https://your-railway-app.up.railway.app/api/opportunities

# Check Railway logs
railway logs
```

## Common Issues and Solutions

**If still seeing mock data:**
- Check Railway environment variables
- Ensure USE_MOCK_DATA=false is set
- Restart the Railway deployment

**If UI not rendering:**
- Check browser console for errors
- Verify dist folder contains built files
- Check CORS settings in server.ts

**If no opportunities found:**
- Lower MIN_PROFIT_THRESHOLD to 0.1
- Increase number of tickers fetched (change slice(0, 10) to slice(0, 50))
- Check if exchanges are returning data
