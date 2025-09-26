# Crypto Arbitrage Telegram Bot

A Telegram Web App that provides real-time cryptocurrency arbitrage opportunities across multiple exchanges.

## Features

- 🔍 Real-time arbitrage opportunity detection
- 📱 Native Telegram Web App experience
- 🏪 Support for 8 major exchanges (Binance, OKX, Bybit, Bitget, MEXC, BingX, Gate.io, KuCoin)
- 📊 Interactive data visualization
- ⚡ Auto-refresh every 30 seconds
- 🎯 Profitability filtering
- 💾 User preference persistence
- 📱 Mobile-optimized interface

## Supported Exchanges

- **Binance** - World's largest crypto exchange
- **OKX** - Leading crypto exchange
- **Bybit** - Derivatives and spot trading
- **Bitget** - Global crypto exchange
- **MEXC** - Global digital asset trading platform
- **BingX** - Social trading platform
- **Gate.io** - Global cryptocurrency exchange
- **KuCoin** - Global cryptocurrency exchange

## Quick Start

### Prerequisites

- Node.js 18+ 
- npm or yarn
- Telegram Bot Token

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd crypto-arbitrage-telegram-bot
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env
```

4. Configure your `.env` file with your Telegram Bot Token:
```env
TELEGRAM_BOT_TOKEN=your_telegram_bot_token_here
WEBAPP_URL=https://your-domain.vercel.app
VITE_API_BASE_URL=https://your-domain.vercel.app/api
```

5. Start the development server:
```bash
npm run dev
```

## Environment Configuration

### Required Variables

```env
# Telegram Bot Configuration
TELEGRAM_BOT_TOKEN=your_telegram_bot_token_here
WEBAPP_URL=https://your-domain.vercel.app

# Frontend API Configuration
VITE_API_BASE_URL=https://your-domain.vercel.app/api
VITE_API_URL=https://your-domain.vercel.app/api
```

### Optional Variables

```env
# Application Settings
PORT=3000
NODE_ENV=development
UPDATE_INTERVAL=30000
MIN_PROFIT_THRESHOLD=0.5
MAX_OPPORTUNITIES=50

# Database
DATABASE_PATH=./database.sqlite

# Rate Limiting
RATE_LIMIT_WINDOW=15
RATE_LIMIT_MAX_REQUESTS=100

# Development
USE_MOCK_DATA=false
DEBUG=false
LOG_LEVEL=info
```

### Exchange API Keys (Optional)

For enhanced features, you can add exchange API keys:

```env
# Binance
BINANCE_API_KEY=your_binance_api_key
BINANCE_API_SECRET=your_binance_api_secret

# OKX
OKX_API_KEY=your_okx_api_key
OKX_API_SECRET=your_okx_api_secret
OKX_PASSPHRASE=your_okx_passphrase

# Add other exchanges as needed...
```

## Project Structure

```
src/
├── components/          # React components
│   ├── ArbitrageTable.tsx
│   ├── ExchangeSelector.tsx
│   ├── LoadingSpinner.tsx
│   └── ErrorMessage.tsx
├── hooks/              # Custom React hooks
│   ├── useTelegramWebApp.ts
│   └── useArbitrageData.ts
├── services/           # API services
│   └── api.ts
├── types/              # TypeScript type definitions
│   └── index.ts
├── config/             # Configuration
│   └── environment.ts
├── bot/                # Telegram bot logic
│   └── TelegramBot.ts
└── App.tsx             # Main App component
```

## Development

### Local Development

1. Start the backend server:
```bash
npm run dev:server
```

2. Start the frontend development server:
```bash
npm run dev
```

3. The app will be available at `http://localhost:3000`

### Environment Files

- `.env` - Main environment configuration
- `.env.development` - Development-specific settings
- `.env.production` - Production-specific settings
- `.env.example` - Template for environment variables

## Deployment

### Vercel (Recommended)

1. Connect your repository to Vercel
2. Set environment variables in Vercel dashboard
3. Deploy automatically on push to main branch

### Manual Deployment

1. Build the project:
```bash
npm run build
```

2. Start the production server:
```bash
npm start
```

## Telegram Bot Setup

1. Create a new bot with [@BotFather](https://t.me/botfather)
2. Get your bot token
3. Set the webhook URL to your deployed app
4. Configure the bot menu and commands

## API Endpoints

### Public Endpoints

- `GET /api/opportunities` - Get arbitrage opportunities
- `GET /api/status` - Get exchange status
- `GET /api/health` - Health check

### Parameters

- `exchanges` - Comma-separated list of exchange IDs to filter

### Example

```bash
curl "https://your-domain.vercel.app/api/opportunities?exchanges=binance,okx"
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

MIT License - see LICENSE file for details

## Support

For support, please open an issue on GitHub or contact the development team.

## Disclaimer

This tool is for educational and informational purposes only. Cryptocurrency trading involves significant risk. Always do your own research and never invest more than you can afford to lose.