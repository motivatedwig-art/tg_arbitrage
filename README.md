# Crypto Arbitrage Telegram Bot

A comprehensive Telegram bot that identifies and displays profitable cryptocurrency arbitrage opportunities across multiple exchanges in real-time.

## Features

- 🚀 **Real-time Arbitrage Detection**: Monitors 8+ cryptocurrency exchanges for profitable arbitrage opportunities
- 🤖 **Telegram Bot Interface**: Interactive bot with multilingual support (English/Russian)
- 📱 **Mini Web App**: Interactive table showing arbitrage opportunities
- 🔔 **Smart Notifications**: Alerts for high-profit opportunities (>2%)
- 🌐 **Multi-language Support**: English and Russian interfaces
- 📊 **Historical Data**: Track and analyze arbitrage performance
- ⚙️ **Customizable Settings**: Adjust profit thresholds and preferences

## Supported Exchanges

- Binance
- OKX
- Bybit
- BitGet
- MEXC
- BingX
- Gate.io
- KuCoin

## Quick Start

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd crypto-arbitrage-bot
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment**
   ```bash
   cp .env.example .env
   # Edit .env with your API keys and bot token
   ```

4. **Build the project**
   ```bash
   npm run build
   ```

5. **Start the bot**
   ```bash
   npm start
   ```

   For development:
   ```bash
   npm run dev
   ```

## Bot Commands

- `/start` - Welcome message and setup
- `/help` - Show all available commands
- `/status` - Display system and exchange status
- `/settings` - Configure user preferences
- `/language` - Switch between English and Russian
- `/top` - Show top 10 arbitrage opportunities
- `/subscribe` - Toggle notifications on/off
- `/webapp` - Open the mini web application
- `/stats` - View your statistics

## Configuration

### Environment Variables

Create a `.env` file with the following variables:

```env
# Telegram Bot
TELEGRAM_BOT_TOKEN=your_bot_token_here
WEBAPP_URL=http://localhost:3000

# Exchange API Keys (optional for public data)
BINANCE_API_KEY=
BINANCE_API_SECRET=
OKX_API_KEY=
OKX_API_SECRET=
OKX_PASSPHRASE=
# ... other exchange keys

# Application Settings
PORT=3000
NODE_ENV=development
UPDATE_INTERVAL=30000
MIN_PROFIT_THRESHOLD=0.5
```

### Database

The bot uses SQLite by default. The database file will be created automatically at `./database.sqlite`.

## Architecture

```
src/
├── bot/                 # Telegram bot implementation
│   ├── handlers/        # Command and callback handlers
│   ├── keyboards/       # Inline keyboards
│   └── TelegramBot.ts   # Main bot class
├── exchanges/           # Exchange integration
│   ├── adapters/        # Exchange-specific adapters
│   ├── types/           # TypeScript interfaces
│   └── ExchangeManager.ts
├── arbitrage/           # Arbitrage calculation engine
│   └── calculator/
├── database/            # Database models and management
│   └── models/
├── utils/               # Utilities (i18n, etc.)
└── index.ts             # Application entry point
```

## Development

### Running in Development Mode

```bash
npm run dev
```

### Building for Production

```bash
npm run build
npm start
```

### Testing

```bash
npm test
```

## API Rate Limits

The bot respects exchange API rate limits:
- Updates every 30 seconds by default
- Implements proper rate limiting for each exchange
- Graceful handling of rate limit errors

## Security

- API keys are encrypted in the database
- Input validation and sanitization
- Secure WebSocket connections
- Rate limiting for bot commands

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

MIT License - see LICENSE file for details.

## Support

For support, please contact [your-contact-info] or create an issue in the repository.

## Disclaimer

This bot is for educational and informational purposes only. Cryptocurrency trading involves risk, and you should never invest more than you can afford to lose. Always do your own research before making trading decisions.
