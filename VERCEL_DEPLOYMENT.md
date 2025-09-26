# Crypto Arbitrage Telegram Bot - Vercel Deployment

## 🚀 Quick Deploy to Vercel

### Prerequisites
1. GitHub repository with your code
2. Vercel account (free)
3. Telegram Bot Token

### Step-by-Step Deployment

#### 1. Connect to Vercel
1. Go to [vercel.com](https://vercel.com)
2. Sign in with GitHub
3. Click "New Project"
4. Import your GitHub repository

#### 2. Configure Environment Variables
In Vercel dashboard, go to Settings > Environment Variables and add:

```
TELEGRAM_BOT_TOKEN=8467603449:AAFvY-Qy5aT4mYDwogA7tQnKirhBDyJ2Ios
MIN_PROFIT_THRESHOLD=0.5
MAX_PROFIT_THRESHOLD=110
UPDATE_INTERVAL=30000
NODE_ENV=production
```

#### 3. Build Settings
- **Framework Preset**: Other
- **Build Command**: `npm run vercel-build`
- **Output Directory**: `dist`
- **Install Command**: `npm ci`

#### 4. Deploy
Click "Deploy" and wait for the build to complete.

### 🔧 Important Notes

#### Limitations on Vercel
- **No SQLite Database**: Vercel is serverless, so SQLite won't work
- **No Persistent Storage**: Data is not saved between function calls
- **Function Timeout**: Max 30 seconds per function execution
- **No Background Processes**: Cron jobs won't work

#### What Works
- ✅ Static web interface
- ✅ API endpoints with mock data
- ✅ Telegram Web App integration
- ✅ Real-time UI updates

#### What Doesn't Work
- ❌ Persistent database storage
- ❌ Background arbitrage calculations
- ❌ Real-time exchange data fetching
- ❌ Telegram bot polling

### 🛠️ Alternative Deployment Options

For full functionality, consider:

1. **Railway** - Supports persistent storage and background processes
2. **Heroku** - Full Node.js support with add-ons
3. **DigitalOcean App Platform** - Container-based deployment
4. **AWS/GCP** - Full cloud infrastructure

### 📱 Telegram Bot Setup

1. Create a bot with [@BotFather](https://t.me/botfather)
2. Get your bot token
3. Set webhook URL to your Vercel domain
4. Configure web app URL in bot settings

### 🔍 Troubleshooting

#### Common Issues
- **Build Fails**: Check Node.js version (use 18.x)
- **API Errors**: Verify environment variables are set
- **Static Files Not Loading**: Check file paths in vercel.json
- **CORS Issues**: Verify CORS configuration

#### Debug Steps
1. Check Vercel function logs
2. Test API endpoints manually
3. Verify environment variables
4. Check file structure matches vercel.json

### 📊 Current Status
- ✅ Web interface deployed
- ✅ Mock API data working
- ⚠️ Real arbitrage data disabled (serverless limitation)
- ⚠️ Telegram bot functionality limited

For full functionality, deploy to a platform that supports persistent storage and background processes.

