# Crypto Arbitrage Telegram Bot Development Prompt for Cursor AI

## Project Overview

Develop a comprehensive Telegram bot with a mini app that identifies and displays profitable cryptocurrency arbitrage opportunities across multiple exchanges in real-time. The bot will collect cryptocurrency prices from various exchanges using their APIs and present users with an interactive table showing the most profitable arbitrage deals.

## Section 1: Project Setup and Dependencies

### 1.1 Initialize Project Structure
```
crypto-arbitrage-bot/
├── src/
│   ├── bot/
│   │   ├── handlers/
│   │   ├── middleware/
│   │   └── keyboards/
│   ├── exchanges/
│   │   ├── adapters/
│   │   └── types/
│   ├── arbitrage/
│   │   ├── calculator/
│   │   └── analyzer/
│   ├── database/
│   │   ├── models/
│   │   └── migrations/
│   ├── webapp/
│   │   ├── components/
│   │   ├── pages/
│   │   └── utils/
│   └── utils/
├── locales/
│   ├── en.json
│   └── ru.json
├── config/
├── tests/
├── package.json
├── .env.example
└── README.md
```

### 1.2 Install Required Dependencies
Create a Node.js project with the following dependencies:

**Core Dependencies:**
- `node-telegram-bot-api` - Telegram Bot API wrapper
- `express` - Web server for mini app
- `cors` - Cross-origin resource sharing
- `helmet` - Security middleware
- `dotenv` - Environment variables
- `axios` - HTTP client for API requests
- `ws` - WebSocket client for real-time data
- `sqlite3` or `mongoose` - Database (choose based on preference)
- `node-cron` - Scheduled tasks
- `i18next` - Internationalization framework
- `i18next-fs-backend` - File system backend for translations

**Exchange API Libraries:**
- `ccxt` - Unified cryptocurrency exchange API
- `binance-api-node` - Binance specific (if needed for advanced features)

**Development Dependencies:**
- `typescript` - Type safety
- `@types/node` - Node.js types
- `nodemon` - Development server
- `jest` - Testing framework

### 1.3 Environment Configuration
Create `.env.example` file with required API keys:
```env
# Telegram Bot Configuration
TELEGRAM_BOT_TOKEN=
WEBAPP_URL=

# Exchange API Keys
BINANCE_API_KEY=
BINANCE_API_SECRET=
OKX_API_KEY=
OKX_API_SECRET=
OKX_PASSPHRASE=
BYBIT_API_KEY=
BYBIT_API_SECRET=
BITGET_API_KEY=
BITGET_API_SECRET=
BITGET_PASSPHRASE=
MEXC_API_KEY=
MEXC_API_SECRET=
BINGX_API_KEY=
BINGX_API_SECRET=
GATE_IO_API_KEY=
GATE_IO_API_SECRET=
KUCOIN_API_KEY=
KUCOIN_API_SECRET=
KUCOIN_PASSPHRASE=

# Database Configuration
DATABASE_URL=
REDIS_URL=

# Application Settings
PORT=3000
NODE_ENV=development
UPDATE_INTERVAL=600000
MIN_PROFIT_THRESHOLD=0.5
```

## Section 2: Exchange Integration

### 2.1 Exchange Adapter Interface
Create a standardized interface for all exchanges:

```typescript
interface ExchangeAdapter {
  name: string;
  connect(): Promise<void>;
  getTickers(): Promise<Ticker[]>;
  getOrderBook(symbol: string): Promise<OrderBook>;
  disconnect(): void;
}

interface Ticker {
  symbol: string;
  bid: number;
  ask: number;
  timestamp: number;
  exchange: string;
}
```

### 2.2 Individual Exchange Adapters
Implement adapters for each exchange using CCXT library:

**Required Exchanges:**
1. Binance
2. OKX
3. Bybit
4. BitGet
5. MEXC
6. BingX
7. Gate.io
8. KuCoin

Each adapter should:
- Handle authentication with API keys
- Implement rate limiting
- Handle WebSocket connections for real-time data
- Normalize data format across exchanges
- Handle errors gracefully with retry mechanisms

### 2.3 Exchange Manager
Create a central manager to coordinate all exchanges:
- Initialize all exchange connections
- Aggregate data from all sources
- Handle connection failures
- Implement data caching strategy

## Section 3: Arbitrage Analysis Engine

### 3.1 Price Data Collection
Implement real-time price collection system:
- Collect bid/ask prices from all exchanges
- Store in memory cache with timestamps
- Update prices every 30 seconds (configurable)
- Handle API rate limits efficiently

### 3.2 Arbitrage Calculator
Create arbitrage opportunity detection:

```typescript
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
```

Algorithm should:
- Compare prices across all exchange pairs
- Calculate profit percentage and absolute profit
- Consider trading fees for each exchange
- Filter by minimum profit threshold
- Sort by profitability
- Check liquidity/volume requirements

### 3.3 Real-time Analysis
Implement continuous monitoring:
- Run analysis every 30 seconds
- Maintain top 50 opportunities
- Track historical performance
- Alert on high-profit opportunities (>2%)

## Section 4: Telegram Bot Implementation

### 4.1 Bot Setup and Authentication
Create Telegram bot with:
- Welcome message and instructions
- User registration flow
- API key collection and validation
- User preferences setup

### 4.2 Bot Commands
Implement the following commands:

```
/start - Welcome and registration
/help - Show available commands
/status - Show current system status
/settings - Configure user preferences
/language - Switch between English and Russian
/top - Show top 10 arbitrage opportunities
/subscribe - Enable/disable notifications
/webapp - Open mini app
/stats - Show user statistics
```

### 4.3 User Data Management
Create user management system:
- Store user preferences in database (including language)
- Manage API key encryption
- Handle user sessions
- Track user activity

### 4.4 Internationalization (i18n)
Implement multi-language support:
- Default language: English
- Supported languages: English, Russian
- Language files structure:
  ```
  locales/
  ├── en.json
  └── ru.json
  ```
- Store user language preference in database
- All bot messages, commands, and UI text should be translatable
- Use language keys for all user-facing text

### 4.5 Notification System
Implement alert system:
- High-profit opportunity alerts (>2%)
- System status notifications
- Daily summary reports
- Custom threshold alerts
- All notifications respect user's language preference

## Section 5: Mini App Development

### 5.1 Frontend Framework Setup
Use React or Vue.js for the mini app:
- Responsive design for mobile devices
- Telegram Web App integration
- Real-time data updates via WebSocket
- Interactive data tables
- Multi-language support (English/Russian)
- Language switcher component

### 5.2 Internationalization for Mini App
Implement i18n for the web interface:
- Use `react-i18next` or `vue-i18n` for frontend translations
- Language detection from Telegram user settings
- Persistent language preference storage
- All UI elements, labels, and messages translatable
- Right-to-left layout support preparation

### 5.3 Interactive Arbitrage Table
Create main interface with:

**Table Columns (translatable):**
- Cryptocurrency pair
- Buy exchange
- Sell exchange
- Buy price
- Sell price
- Profit %
- Profit amount
- Volume
- Last updated

**Features:**
- Real-time updates every 30 seconds
- Sort by any column
- Filter by cryptocurrency
- Filter by minimum profit
- Search functionality
- Export to CSV
- Language toggle button
- Localized number formatting
- Localized date/time display

### 5.4 Additional Pages
Implement supplementary pages:
- Dashboard with statistics
- Settings page for preferences (including language selection)
- Exchange status monitor
- Historical data viewer
- Portfolio tracker (optional)
- All pages fully localized

### 5.4 WebSocket Integration
Create real-time connection:
- Connect to backend WebSocket server
- Update table data automatically
- Show connection status
- Handle reconnection logic

## Section 6: Database Design

### 6.1 Database Schema
Design tables for:

**Users Table:**
```sql
users (
  id, telegram_id, username, created_at, 
  preferences, api_keys_encrypted, is_active,
  language_preference
)
```

**Arbitrage Opportunities Table:**
```sql
arbitrage_opportunities (
  id, symbol, buy_exchange, sell_exchange,
  buy_price, sell_price, profit_percentage,
  volume, created_at
)
```

**Exchange Status Table:**
```sql
exchange_status (
  id, exchange_name, is_online, last_update,
  error_count, response_time
)
```

### 6.2 Data Management
Implement:
- Data retention policies (keep 24 hours of opportunities)
- Automated cleanup tasks
- Database indexing for performance
- Backup and recovery procedures

## Section 7: Security and Performance

### 7.1 Security Measures
Implement security features:
- API key encryption in database
- Rate limiting for bot commands
- Input validation and sanitization
- Secure WebSocket connections
- Environment variable protection

### 7.2 Performance Optimization
Optimize for performance:
- Implement Redis caching
- Connection pooling for databases
- Efficient data structures
- Memory management
- API rate limit optimization

### 7.3 Error Handling
Create robust error handling:
- Exchange API failures
- Network connectivity issues
- Database connection errors
- Invalid user inputs
- Rate limit exceeded scenarios

## Section 8: Testing and Deployment

### 8.1 Testing Strategy
Implement comprehensive testing:
- Unit tests for arbitrage calculations
- Integration tests for exchange APIs
- Bot command testing
- WebApp functionality testing
- Performance testing under load

### 8.2 Deployment Configuration
Prepare for deployment:
- Docker containerization
- Environment-specific configurations
- Health check endpoints
- Logging and monitoring setup
- Process management with PM2

### 8.3 Monitoring and Logging
Implement monitoring:
- Exchange API health monitoring
- Bot performance metrics
- User activity tracking
- Error logging and alerting
- Uptime monitoring

## Section 9: Documentation and Maintenance

### 9.1 User Documentation
Create user guides:
- Bot setup instructions
- API key generation guides
- Mini app usage tutorial
- FAQ section
- Troubleshooting guide

### 9.2 Technical Documentation
Document technical aspects:
- API documentation
- Database schema documentation
- Deployment instructions
- Configuration guide
- Contributing guidelines

## Development Priority Order

1. **Phase 1:** Basic exchange integration and price collection
2. **Phase 2:** Arbitrage calculation engine
3. **Phase 3:** Internationalization setup and language files
4. **Phase 4:** Telegram bot with basic commands (multilingual)
5. **Phase 5:** Mini app with interactive table and language support
6. **Phase 6:** Real-time updates and WebSocket integration
7. **Phase 7:** Advanced features and optimizations
8. **Phase 8:** Testing, security, and deployment

## Internationalization Implementation Details

### Language File Structure
Create comprehensive language files:

**English (en.json):**
```json
{
  "commands": {
    "start": "Welcome to Crypto Arbitrage Bot!",
    "help": "Available commands:",
    "language_changed": "Language changed to English"
  },
  "table": {
    "headers": {
      "pair": "Pair",
      "buy_exchange": "Buy Exchange",
      "sell_exchange": "Sell Exchange",
      "profit": "Profit %"
    }
  },
  "buttons": {
    "settings": "Settings",
    "refresh": "Refresh"
  }
}
```

**Russian (ru.json):**
```json
{
  "commands": {
    "start": "Добро пожаловать в бота криптовалютного арбитража!",
    "help": "Доступные команды:",
    "language_changed": "Язык изменен на русский"
  },
  "table": {
    "headers": {
      "pair": "Пара",
      "buy_exchange": "Биржа покупки",
      "sell_exchange": "Биржа продажи",
      "profit": "Прибыль %"
    }
  },
  "buttons": {
    "settings": "Настройки",
    "refresh": "Обновить"
  }
}
```

## Key Requirements Checklist

- [ ] Support for all 8 specified exchanges
- [ ] Real-time price data collection
- [ ] Arbitrage opportunity calculation
- [ ] Interactive mini app table
- [ ] Telegram bot with commands
- [ ] User API key management
- [ ] Secure data handling
- [ ] Performance optimization
- [ ] Comprehensive error handling
- [ ] Documentation and testing

Start with Phase 1 and implement each section systematically, ensuring each component is fully functional before proceeding to the next phase.