# WebSocket Implementation Guide for Real-time Arbitrage Data

## Overview

This guide outlines how to implement real-time WebSocket feeds for faster updates in the crypto arbitrage bot.

## Current Architecture vs WebSocket Architecture

### Current REST API Approach:
- **Frequency**: 30-second polling
- **Latency**: High (30s + network delay)
- **Data freshness**: Stale by up to 30+ seconds
- **Resource usage**: Medium (periodic HTTP requests)

### WebSocket Approach:
- **Frequency**: Real-time (millisecond updates)
- **Latency**: Low (<100ms typically)
- **Data freshness**: Near real-time
- **Resource usage**: Low (persistent connection)

## Implementation Strategy

### 1. Exchange WebSocket APIs

Different exchanges provide different WebSocket endpoints:

#### Binance WebSocket API
```javascript
// Ticker stream for all symbols
const ws = new WebSocket('wss://stream.binance.com:9443/ws/!ticker@arr');

ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  // data contains bid/ask prices for all symbols
  // Update ticker cache immediately
};
```

#### OKX WebSocket API
```javascript
const ws = new WebSocket('wss://ws.okx.com:8443/ws/v5/public');

// Subscribe to ticker updates
ws.send(JSON.stringify({
  "op": "subscribe",
  "args": [{"channel": "tickers", "instType": "SPOT"}]
}));
```

### 2. Unified WebSocket Manager

Create a `WebSocketManager` class to handle multiple exchanges:

```typescript
export class WebSocketManager {
  private connections: Map<string, WebSocket> = new Map();
  private tickerCache: Map<string, Ticker[]> = new Map();
  private reconnectIntervals: Map<string, NodeJS.Timeout> = new Map();

  public async connectToAllExchanges(): Promise<void> {
    const exchanges = ['binance', 'okx', 'bybit', 'bitget'];
    
    for (const exchange of exchanges) {
      await this.connectToExchange(exchange);
    }
  }

  private async connectToExchange(exchange: string): Promise<void> {
    const ws = new WebSocket(this.getWebSocketUrl(exchange));
    
    ws.onopen = () => {
      console.log(`Connected to ${exchange} WebSocket`);
      this.subscribeToUpdates(ws, exchange);
    };

    ws.onmessage = (event) => {
      this.handleMessage(exchange, JSON.parse(event.data));
    };

    ws.onclose = () => {
      console.log(`Connection to ${exchange} closed, reconnecting...`);
      this.reconnect(exchange);
    };

    this.connections.set(exchange, ws);
  }
}
```

### 3. Integration with Current System

Modify the `ExchangeManager` to support WebSocket mode:

```typescript
class ExchangeManager {
  private webSocketManager?: WebSocketManager;
  private useWebSocket: boolean;

  public async initializeExchanges(): Promise<void> {
    this.useWebSocket = process.env.USE_WEBSOCKET === 'true';
    
    if (this.useWebSocket) {
      this.webSocketManager = new WebSocketManager();
      await this.webSocketManager.connectToAllExchanges();
      
      // Listen for real-time updates
      this.webSocketManager.on('tickerUpdate', (exchange, tickers) => {
        this.updateTickerCache(exchange, tickers);
        this.triggerRealTimeArbitrageCalculation();
      });
    } else {
      // Use existing REST API approach
      await this.initializeRestApis();
    }
  }
}
```

### 4. Real-time Arbitrage Calculation

Trigger arbitrage calculations immediately when new data arrives:

```typescript
private triggerRealTimeArbitrageCalculation(): void {
  const allTickers = this.getAllTickers();
  const opportunities = this.arbitrageCalculator.calculateArbitrageOpportunities(allTickers);
  
  if (opportunities.length > 0) {
    // Store in database
    this.storeOpportunities(opportunities);
    
    // Send real-time notifications to users
    this.notifyUsersOfTopOpportunities(opportunities.slice(0, 3));
  }
}
```

### 5. User Notifications

For premium users, send immediate notifications for high-profit opportunities:

```typescript
private async notifyUsersOfTopOpportunities(opportunities: ArbitrageOpportunity[]): Promise<void> {
  const users = await this.db.getUserModel().getPremiumUsers();
  
  for (const user of users) {
    for (const opp of opportunities) {
      if (opp.profitPercentage >= 2.0) { // High profit threshold
        await this.bot.sendMessage(user.telegramId, 
          `🚨 Real-time Arb Alert: ${opp.symbol} ${opp.profitPercentage.toFixed(2)}% profit!`
        );
      }
    }
  }
}
```

## Benefits of WebSocket Implementation

### 1. **Speed Advantages**
- **Instant Updates**: Receive price changes within milliseconds
- **First-mover advantage**: Catch arbitrage opportunities before they disappear
- **Reduced latency**: No 30-second polling delay

### 2. **Accuracy Improvements**
- **Live orderbook data**: Get actual bid/ask prices instead of stale data
- **Volume updates**: Real-time volume information for better filtering
- **Price movements**: Track rapid price changes across exchanges

### 3. **Resource Efficiency**
- **Lower bandwidth**: Single persistent connection vs repeated HTTP requests
- **Reduced server load**: Much fewer API calls to exchanges
- **Better rate limiting**: More predictable API usage patterns

## Implementation Phases

### Phase 1: Basic WebSocket (Week 1)
- Implement WebSocket connections for Binance and OKX
- Basic ticker updates and cache refresh
- Simple logging and monitoring

### Phase 2: Multi-Exchange Support (Week 2)
- Add support for Bybit, Bitget, MEXC, etc.
- Connection management and reconnection logic
- Error handling and fallback to REST API

### Phase 3: Real-time Notifications (Week 3)
- Integrate with Telegram bot for instant alerts
- User preference system for notification thresholds
- Premium users get real-time, free users get summary updates

### Phase 4: Advanced Features (Week 4)
- Orderbook depth analysis
- Spread analysis and trend detection
- Historical data storage for machine learning

## Configuration

Add environment variables:

```env
# WebSocket Configuration
USE_WEBSOCKET=true
WEBSOCKET_RECONNECT_INTERVAL=5000
WEBSOCKET_PING_INTERVAL=30000

# Notification Thresholds
REALTIME_NOTIFICATION_THRESHOLD=2.0
PREMIUM_USER_THRESHOLD=1.0
```

## Monitoring and Health Checks

```typescript
class WebSocketHealthMonitor {
  public checkConnectionsHealth(): void {
    for (const [exchange, ws] of this.connections) {
      if (ws.readyState !== WebSocket.OPEN) {
        console.warn(`⚠️ ${exchange} WebSocket disconnected`);
        this.reconnect(exchange);
      }
    }
  }

  private async reconnect(exchange: string): Promise<void> {
    // Implement exponential backoff
    await this.connectToExchange(exchange);
  }
}
```

## Next Steps

1. **Start with Binance**: Implement WebSocket for Binance first (most reliable)
2. **Add monitoring**: Track connection status and data freshness
3. **User testing**: Deploy with feature flags for gradual rollover
4. **Performance optimization**: Monitor memory usage and CPU impact
5. **Fallback strategy**: Ensure REST API fallback always works

## Resource Requirements

- **Memory**: +50MB for WebSocket connections and caching
- **CPU**: +10% for real-time processing
- **Network**: +20% bandwidth but much more efficient overall
- **Development time**: ~2-3 weeks for full implementation
