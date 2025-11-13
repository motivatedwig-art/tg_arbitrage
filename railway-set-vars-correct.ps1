# Railway Environment Variables Setup Script
# This script sets all required environment variables for the Arbitrage Bot

Write-Host "Setting Railway Environment Variables..." -ForegroundColor Green
Write-Host ""

Write-Host "Setting Exchange API Keys..." -ForegroundColor Yellow

# Set all variables in one command for better performance
railway variables `
  --set "BINANCE_API_KEY=ls9NqOuHbfNiOUco5mbgbM8Utks2T1vj77Kgnc1aEGqTr4tUtQMWaALYDxTE93IT" `
  --set "BINANCE_API_SECRET=POjVABftVlfw4INR9NfpmGQP6oRgEM2vqP5rZetHqQODaL6lvMd6sAa4tUApbpnL" `
  --set "OKX_API_KEY=275b74df-1d9b-4469-8cbe-7d062a29a116" `
  --set "OKX_API_SECRET=8BBD3257E6A0503CC72CE21C72461E9B" `
  --set "OKX_PASSPHRASE=Alednik8!" `
  --set "BYBIT_API_KEY=0aCyFAfx4npELU6cbm" `
  --set "BYBIT_API_SECRET=VLvUqCr3Ic1FNjuX0Ck1y6KG3UwYT6HCnkQg" `
  --set "MEXC_API_KEY=mx0vglUu1PyIAYSfcT" `
  --set "MEXC_API_SECRET=c5947b340d834cc9ad11262d8ad3eb15" `
  --set "KUCOIN_API_KEY=68ff2c9efa2aaa0001e53b6c" `
  --set "KUCOIN_API_SECRET=37b743a4-eed6-4c0e-be03-74bc41807e21" `
  --set "KUCOIN_PASSPHRASE=D4?FP5b6VeEw?d8" `
  --set "PORT=3000" `
  --set "NODE_ENV=production" `
  --set "UPDATE_INTERVAL=30000" `
  --set "MIN_PROFIT_THRESHOLD=0.5" `
  --set "MAX_OPPORTUNITIES=50" `
  --set "TELEGRAM_BOT_TOKEN=8467603449:AAFvY-Qy5aT4mYDwogA7tQnKirhBDyJ2Ios" `
  --set "WEBAPP_URL=https://webapp-production-c779.up.railway.app" `
  --set "BINANCE_ALL_PRICES_API=https://api.binance.com/api/v3/ticker/price" `
  --set "OKX_ALL_TICKERS_API=https://www.okx.com/api/v5/market/tickers?instType=SPOT" `
  --set "BYBIT_ALL_SPOT_API=https://api.bybit.com/v5/market/tickers?category=spot" `
  --set "MEXC_ALL_PRICES_API=https://api.mexc.com/api/v3/ticker/price" `
  --set "GATE_IO_ALL_TICKERS_API=https://api.gateio.ws/api/v4/spot/tickers" `
  --set "KUCOIN_ALL_TICKERS_API=https://api.kucoin.com/api/v1/market/allTickers"

Write-Host ""
Write-Host "All variables set successfully!" -ForegroundColor Green
Write-Host ""
Write-Host "Verifying variables..." -ForegroundColor Yellow
railway variables

Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "  1. Deploy: railway up" -ForegroundColor White
Write-Host "  2. View logs: railway logs" -ForegroundColor White
Write-Host ""
Write-Host "Look for these messages in logs:" -ForegroundColor Yellow
Write-Host "  Connected to Binance (authenticated)" -ForegroundColor White
Write-Host "  Connected to OKX (authenticated)" -ForegroundColor White
Write-Host "  Connected to Bybit (authenticated)" -ForegroundColor White
Write-Host "  Connected to MEXC (authenticated)" -ForegroundColor White
Write-Host "  Connected to KuCoin (authenticated)" -ForegroundColor White
Write-Host ""

