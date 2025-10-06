# Railway Deployment Troubleshooting Guide

## ⚠️ Deployment Failed - Here's How to Fix It

Based on the logs, the Railway deployment failed during the build process. Here are the most likely causes and solutions:

## 🔧 Required Environment Variables in Railway

**Go to your Railway project dashboard → Variables tab and add these:**

```env
# Required Variables
TELEGRAM_BOT_TOKEN=your_actual_bot_token_here
NODE_ENV=production  
USE_MOCK_DATA=false

# Database (Railway provides this automatically)
DATABASE_URL=postgresql://username:password@hostname:port/database

# Optional Configuration  
PORT=3000
MIN_PROFIT_THRESHOLD=0.5
MAX_PROFIT_THRESHOLD=110
UPDATE_INTERVAL=30000
WEBAPP_URL=https://your-railway-domain.up.railway.app
```

## 🛠️ Common Issues & Solutions

### Issue 1: Missing Telegram Bot Token
**Error**: Bot won't start without valid token
**Solution**: 
1. Get your bot token from @BotFather
2. Add `TELEGRAM_BOT_TOKEN` to Railway variables
3. Redeploy

### Issue 2: Database Connection
**Error**: PostgreSQL connection failed
**Solution**:
1. Go to Railway dashboard
2. Add PostgreSQL database
3. Railway automatically sets `DATABASE_URL`
4. Redeploy

### Issue 3: Build Failures
**Error**: npm install or build command fails
**Solution**:
```bash
# Test local build first
npm install
npm run build

# If that works, the issue is environment-related in Railway
```

## 📋 Deployment Checklist

### Before Deploying:
- [ ] ✅ All changes pushed to GitHub
- [ ] ✅ Railway PostgreSQL database added  
- [ ] ✅ Environment variables set in Railway
- [ ] ✅ Local build successful: `npm run build`

### Railway Environment Variables:
- [ ] `TELEGRAM_BOT_TOKEN` = your actual bot token
- [ ] `NODE_ENV` = production  
- [ ] `USE_MOCK_DATA` = false
- [ ] `DATABASE_URL` = auto-set by Railway PostgreSQL

## 🚀 Manual Deployment Steps

1. **Set Environment Variables**:
   ```bash
   railway variables set TELEGRAM_BOT_TOKEN=your_token_here
   railway variables set NODE_ENV=production
   railway variables set USE_MOCK_DATA=false
   ```

2. **Deploy**:
   ```bash
   railway deploy
   ```

3. **Check Health**:
   ```bash
   curl https://your-railway-domain.up.railway.app/api/health
   ```

## 🔍 Debug Information

**If you're still seeing failures, check:**

1. **Railway Logs** - Click "Deployments" tab → View logs
2. **Build Logs** - Look for npm install/build errors  
3. **Runtime Logs** - Check for environment variable issues

**Common Log Patterns to Look For:**
- `TELEGRAM_BOT_TOKEN is required` → Missing bot token
- `Database connection failed` → PostgreSQL not set up
- `Error: Cannot find module` → Missing dependencies
- `Deploy failed` → Usually missing environment variables

## 🔄 After Successful Deploy

1. **Test WebApp**: Visit `https://your-domain.up.railway.app`
2. **Update Bot URL**: Set webhook in Telegram Bot API
3. **Check Database**: Verify data is being stored
4. **Monitor Logs**: Watch for real arbitrage opportunities

## 📞 Still Having Issues?

The deployment likely failed due to missing environment variables. Make sure:
- `TELEGRAM_BOT_TOKEN` is set with your actual bot token
- `NODE_ENV=production` 
- `USE_MOCK_DATA=false`
- PostgreSQL database is added to Railway project



