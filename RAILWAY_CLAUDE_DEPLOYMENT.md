# Claude API Integration - Railway Deployment Guide

## 🚀 Quick Start

### 1. Install Claude SDK
```bash
npm install @anthropic-ai/sdk@^0.25.1
```

### 2. Get Claude API Key
1. Go to [Anthropic Console](https://console.anthropic.com/)
2. Sign up/Login to your account
3. Navigate to "API Keys" section
4. Create a new API key
5. Copy the key for Railway environment variables

### 3. Configure Railway Environment Variables

Copy `.env.railway.template` and set these variables in Railway:

#### Required Variables:
```
ANTHROPIC_API_KEY=sk-ant-api03-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TELEGRAM_BOT_TOKEN=1234567890:ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghij
```

#### Optional Variables (with defaults):
```
CLAUDE_MODEL=claude-3-5-haiku-20241022
CLAUDE_MAX_TOKENS=100
CLAUDE_CACHE_TTL=300
```

### 4. Deploy to Railway

The application will automatically:
- Install dependencies (including `@anthropic-ai/sdk`)
- Build the TypeScript code
- Start with Claude AI integration enabled

## 🤖 Telegram Commands

### New AI-Powered Commands:
- `/analyze [chain] [symbol]` - AI analysis of specific arbitrage opportunity
- `/ai` - AI-powered analysis of top 3 opportunities

### Example Usage:
```
/analyze ethereum USDC
/ai
```

## 💰 Cost Optimization

### Automatic Features:
- **5-minute caching** per token/chain pair
- **Parallel processing** of up to 5 opportunities
- **Token limits** (100 max tokens per response)
- **Cost tracking** with `/stats` command

### Estimated Costs:
- **Per analysis**: ~$0.0000375
- **1000 analyses**: $0.0375
- **10,000 analyses**: $0.375

## 📊 Features Implemented

### Core AI Integration:
- ✅ Russian-language analysis with emoji formatting
- ✅ Structured output: ПРИЧИНА → РИСКИ → ДЕЙСТВИЕ
- ✅ Cost-optimized Claude-3.5-Haiku model
- ✅ 5-minute intelligent caching

### Telegram Bot Enhancement:
- ✅ `/analyze` command for specific opportunities
- ✅ `/ai` command for batch analysis
- ✅ Cost tracking and statistics
- ✅ Error handling with fallbacks

### Railway Deployment:
- ✅ Automatic environment detection
- ✅ Production-ready configuration
- ✅ Health checks and monitoring

## 🔧 Technical Implementation

### Files Created/Modified:
1. `src/services/ClaudeAnalyzer.ts` - Core AI service
2. `src/bot/handlers/ClaudeCommandHandler.ts` - Telegram integration
3. `package.json` - Added `@anthropic-ai/sdk` dependency
4. `src/config/environment.ts` - Claude configuration
5. `railway.json` - Updated deployment config
6. `.env.railway.template` - Environment template

### Architecture:
```
User Request → Telegram Bot → ClaudeCommandHandler → ClaudeAnalyzer → Anthropic API
                      ↓
               Database Cache ← Cost Tracking ← Response Formatting
```

## 🎯 Usage Examples

### Successful Analysis:
```
🎯 USDT на polygon
📊 Спред: 0.85%
💰 Покупка: Binance ($0.9973)
💰 Продажа: QuickSwap ($1.0058)
💧 Ликвидность: $45,000

💡 AI Анализ Claude:
⚠️ Низкая ликвидность QuickSwap ($45K) создает премию. Риск: проскальзывание при объеме >$5K съест прибыль. ✅ Исполнимо малыми лотами с учетом gas $0.15.
```

### Cost Statistics:
```
/stats output:
📊 Статистика бота:
🤖 AI Анализы: 25
💾 Кешированных: 18
💰 Примерная стоимость: $0.0009
```

## 🚨 Troubleshooting

### Common Issues:

1. **Missing API Key**: `ANTHROPIC_API_KEY not found`
   - Solution: Add `ANTHROPIC_API_KEY` to Railway environment variables

2. **Rate Limiting**: `Claude API rate limit exceeded`
   - Solution: Increase cache TTL or reduce analysis frequency

3. **Cost Concerns**: Analysis too expensive
   - Solution: Reduce `CLAUDE_MAX_TOKENS` or increase `CLAUDE_CACHE_TTL`

4. **Telegram Commands Not Working**: Commands not registered
   - Solution: Check bot token and restart Railway deployment

### Monitoring:
- Check Railway logs for detailed error messages
- Use `/stats` command to monitor API usage and costs
- Cache hit rate should be 60-80% for optimal costs

## 🔄 Updates and Maintenance

### To Update Claude Configuration:
1. Modify environment variables in Railway dashboard
2. Redeploy automatically triggers

### To Update Prompts:
1. Edit `CLAUDE_PROMPTS.md` for documentation
2. Modify `src/services/ClaudeAnalyzer.ts` for implementation
3. Redeploy to apply changes

### Cost Monitoring:
- Monitor actual costs in Anthropic console
- Adjust cache TTL based on usage patterns
- Consider upgrading to Claude Sonnet for complex analysis (higher cost)

## 🎉 Success!

Your arbitrage bot now has intelligent Russian-language AI analysis powered by Claude API, running efficiently on Railway with automatic cost optimization and caching. The system is production-ready and will provide valuable insights for arbitrage opportunities with minimal operational overhead.
