# Railway Environment Variables Setup Script
# This script sets all required environment variables for the Arbitrage Bot

Write-Host "Setting Railway Environment Variables..." -ForegroundColor Green
Write-Host ""

# Link to Railway project first
Write-Host "Linking to Railway project..." -ForegroundColor Yellow
railway link

Write-Host ""
Write-Host "Setting Exchange API Keys..." -ForegroundColor Yellow

# Binance
railway variables set BINANCE_API_KEY="ls9NqOuHbfNiOUco5mbgbM8Utks2T1vj77Kgnc1aEGqTr4tUtQMWaALYDxTE93IT"
railway variables set BINANCE_API_SECRET="POjVABftVlfw4INR9NfpmGQP6oRgEM2vqP5rZetHqQODaL6lvMd6sAa4tUApbpnL"

# OKX
railway variables set OKX_API_KEY="275b74df-1d9b-4469-8cbe-7d062a29a116"
railway variables set OKX_API_SECRET="8BBD3257E6A0503CC72CE21C72461E9B"
railway variables set OKX_PASSPHRASE="Alednik8!"

# ByBit
railway variables set BYBIT_API_KEY="0aCyFAfx4npELU6cbm"
railway variables set BYBIT_API_SECRET="VLvUqCr3Ic1FNjuX0Ck1y6KG3UwYT6HCnkQg"

# MEXC
railway variables set MEXC_API_KEY="mx0vglUu1PyIAYSfcT"
railway variables set MEXC_API_SECRET="c5947b340d834cc9ad11262d8ad3eb15"

# KuCoin
railway variables set KUCOIN_API_KEY="68ff2c9efa2aaa0001e53b6c"
railway variables set KUCOIN_API_SECRET="37b743a4-eed6-4c0e-be03-74bc41807e21"
railway variables set KUCOIN_PASSPHRASE="D4?FP5b6VeEw?d8"

Write-Host ""
Write-Host "Setting Application Configuration..." -ForegroundColor Yellow

# Application Settings
railway variables set PORT="3000"
railway variables set NODE_ENV="production"
railway variables set UPDATE_INTERVAL="30000"
railway variables set MIN_PROFIT_THRESHOLD="0.5"
railway variables set MAX_OPPORTUNITIES="50"

# Telegram Bot
railway variables set TELEGRAM_BOT_TOKEN="8467603449:AAFvY-Qy5aT4mYDwogA7tQnKirhBDyJ2Ios"
railway variables set WEBAPP_URL="https://webapp-production-c779.up.railway.app"

Write-Host ""
Write-Host "Setting Public API Endpoints..." -ForegroundColor Yellow

# Public API Endpoints
railway variables set BINANCE_ALL_PRICES_API="https://api.binance.com/api/v3/ticker/price"
railway variables set OKX_ALL_TICKERS_API="https://www.okx.com/api/v5/market/tickers?instType=SPOT"
railway variables set BYBIT_ALL_SPOT_API="https://api.bybit.com/v5/market/tickers?category=spot"
railway variables set MEXC_ALL_PRICES_API="https://api.mexc.com/api/v3/ticker/price"
railway variables set GATE_IO_ALL_TICKERS_API="https://api.gateio.ws/api/v4/spot/tickers"
railway variables set KUCOIN_ALL_TICKERS_API="https://api.kucoin.com/api/v1/market/allTickers"

Write-Host ""
Write-Host "All variables set successfully!" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "  1. Verify variables: railway variables" -ForegroundColor White
Write-Host "  2. Deploy: railway up" -ForegroundColor White
Write-Host "  3. View logs: railway logs" -ForegroundColor White
Write-Host ""

