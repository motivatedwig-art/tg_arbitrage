# Claude AI Enrichment - Quick Reference Guide

## Current Status

### ✅ ENABLED (Claude AI - PRIMARY)
- **Contract Address Extraction** - Claude AI extracts 0x... addresses
- **Chain ID Extraction** - Claude AI identifies chain (1, 56, 137, etc.)
- **Chain Name Extraction** - Claude AI provides human-readable names (Ethereum, BSC, Polygon)
- **Verification Status** - Claude AI checks if contract is verified
- **Decimals Extraction** - Claude AI extracts token decimals
- **Cost Tracking** - Detailed cost breakdown per request
- **Response Caching** - 5-minute cache to reduce API calls
- **Comprehensive Logging** - Full visibility into extraction process

### 🚫 DISABLED (DexScreener - SECONDARY)
- **DexScreener Validation** - Disabled by default (use `DEXSCREENER_ENABLED=true` to enable)
- **Open API Stack** - CoinGecko, 1inch, Etherscan not used for contract enrichment

## Key Log Messages to Watch

### ✅ Success Messages

```
🤖 [CLAUDE-CONTRACT] EXTRACTING CONTRACT DATA
   → Claude AI is starting to extract contract data

⚡ CALLING ANTHROPIC API
   → API request sent to Claude

✅ EXTRACTION COMPLETED SUCCESSFULLY
   → Claude AI successfully extracted contract data

📦 CACHE HIT
   → Using cached data, no API call needed (saves money!)

💰 COST BREAKDOWN
   → Shows how much each call cost and total spend

✅ Validation Results (Claude-based)
   → Opportunity validation using Claude-extracted data
```

### ❌ Error Messages

```
❌ EXTRACTION FAILED
   → Claude AI failed to extract data (will return null values)

⚠️ DexScreener validation error
   → Only shows if DEXSCREENER_ENABLED=true (disabled by default)
```

### 🚫 Disabled Features

```
🚫 [VALIDATION] DexScreener validation DISABLED
   → Correct! DexScreener is disabled, using Claude AI only
```

## What to Expect in Logs

### During Arbitrage Scan

```
==================================================
📊 [ARBITRAGE SCAN] Starting scan at 2025-01-19T10:30:00Z
==================================================

🔄 Updating ticker data from all exchanges...
📈 Retrieved 6 exchanges with 1234 total tickers
🔍 Found 25 arbitrage opportunities

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🤖 [ENRICHMENT PRIORITY] Claude AI is PRIMARY enrichment tool
   DexScreener is used ONLY for images/logos/liquidity
   Claude AI extracts ALL contract metadata
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🤖 [ENRICHMENT] Extracting contract data using Claude AI (PRIMARY ENRICHMENT TOOL)...
```

### For Each Opportunity

```
🔄 [CONTRACT-SERVICE] Processing batch of 5 opportunities (batch size: 5)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🤖 [CLAUDE-CONTRACT][1737282600000-abc123] EXTRACTING CONTRACT DATA
   Token: BTC
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🌐 [CLAUDE-CONTRACT][1737282600000-abc123] ⚡ CALLING ANTHROPIC API
   Model: claude-3-5-haiku-20241022
   Max Tokens: 200
   Temperature: 0
   Full Description:
   Symbol: BTC
   Покупка: Binance по 42000.50
   Продажа: OKX по 42100.75
   Объем: 150000
   Сеть: Ethereum
   Timestamp: 1737282600000

⏳ [CLAUDE-CONTRACT][1737282600000-abc123] Waiting for API response...

✅ [CLAUDE-CONTRACT][1737282600000-abc123] 🎉 EXTRACTION COMPLETED SUCCESSFULLY
   ⏱️  Duration: 850ms
   📊 Token Usage:
      Input Tokens:  145
      Output Tokens: 42
   📝 Raw Claude Response:
      {
        "contract_address": "0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599",
        "chain_id": 1,
        "chain_name": "Ethereum",
        "is_verified": true,
        "decimals": 8
      }
   ✨ Parsed Contract Data:
      Contract Address: 0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599
      Chain ID:         1
      Chain Name:       Ethereum
      Is Verified:      true
      Decimals:         8

💾 [CLAUDE-CONTRACT][1737282600000-abc123] Result cached for 300s

💰 [CLAUDE-CONTRACT][1737282600000-abc123] COST BREAKDOWN:
   Input Cost:  $0.000036 (145 tokens @ $0.25/1M)
   Output Cost: $0.000053 (42 tokens @ $1.25/1M)
   This Call:   $0.000089
   Total Cost:  $0.000445 (5 requests, 0 cached)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✅ [CONTRACT-SERVICE] Opportunity enriched with Claude AI data: {
  symbol: 'BTC',
  contractAddress: '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599',
  chainId: '1',
  chainName: 'Ethereum',
  isVerified: true,
  decimals: 8,
  contractDataExtracted: true
}
```

### When Cache is Used (2nd time same token)

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🤖 [CLAUDE-CONTRACT][1737282660000-def456] EXTRACTING CONTRACT DATA
   Token: BTC
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📦 [CLAUDE-CONTRACT][1737282660000-def456] ✅ CACHE HIT for BTC
   Returning cached data without API call
   Cached data: {
     "contract_address": "0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599",
     "chain_id": 1,
     "chain_name": "Ethereum",
     "is_verified": true,
     "decimals": 8
   }
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

### During Validation (in Summaries)

```
🚫 [VALIDATION] DexScreener validation DISABLED (config.dexScreener.enabled = false)
   Using Claude AI data exclusively for validation
   Token: BTC
   Contract Address (from Claude): 0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599
   Chain ID (from Claude): 1
   Chain Name (from Claude): Ethereum
   ✅ Validation Results (Claude-based):
      Contract ID Match: ✓
      Chain ID Match:    ✓
      Liquidity Valid:   ✓ (150000.00 > 1000)
      Volume Valid:      ✓ (150000.00 > 500)
```

## Cost Tracking

### What the Numbers Mean

```
💰 [CLAUDE-CONTRACT] COST BREAKDOWN:
   Input Cost:  $0.000036 (145 tokens @ $0.25/1M)
   Output Cost: $0.000053 (42 tokens @ $1.25/1M)
   This Call:   $0.000089
   Total Cost:  $0.000445 (5 requests, 0 cached)
```

- **Input Cost:** Cost to send prompt to Claude (per million tokens)
- **Output Cost:** Cost for Claude's response (per million tokens)
- **This Call:** Total cost for this specific request
- **Total Cost:** Running total since service started
- **5 requests, 0 cached:** Made 5 API calls, 0 served from cache

### Typical Costs (claude-3-5-haiku-20241022)

- **Per opportunity:** ~$0.00008 - $0.00012 (less than 1 cent!)
- **Per scan (5 opportunities):** ~$0.0004 - $0.0006
- **Per day (144 scans @ 10min):** ~$0.06 - $0.09
- **Per month:** ~$1.80 - $2.70

**Very affordable!** Cache hits reduce costs further.

## Environment Variables Quick Reference

```bash
# Claude AI (always required)
ANTHROPIC_API_KEY=sk-ant-...

# Contract enrichment (enabled by default)
CONTRACT_DATA_ENABLED=true                    # Enable Claude AI enrichment
CONTRACT_DATA_BATCH_SIZE=5                    # Process 5 opportunities per scan
CONTRACT_DATA_DELAY_MS=1000                   # 1 second delay between calls

# Claude AI model (optional, has defaults)
CLAUDE_MODEL=claude-3-5-haiku-20241022       # Cost-optimized model
CLAUDE_MAX_TOKENS=200                         # Max response size
CLAUDE_CACHE_TTL=300                          # Cache for 5 minutes

# DexScreener (disabled by default)
DEXSCREENER_ENABLED=false                     # Keep disabled for Claude-only
```

## Quick Checks

### Is Claude AI Working?

✅ **Look for in logs:**
```
🤖 [CLAUDE-CONTRACT] EXTRACTING CONTRACT DATA
✅ EXTRACTION COMPLETED SUCCESSFULLY
```

✅ **Check database:**
```sql
SELECT COUNT(*) FROM arbitrage_opportunities
WHERE contract_data_extracted = true;
```
Should return > 0

### Is DexScreener Disabled?

✅ **Look for in logs:**
```
🚫 [VALIDATION] DexScreener validation DISABLED
```

❌ **Should NOT see:**
```
✅ [VALIDATION] DexScreener validation ENABLED
```

### Is Caching Working?

✅ **Look for in logs:**
```
📦 [CLAUDE-CONTRACT] ✅ CACHE HIT for BTC
```

Especially for popular tokens (BTC, ETH, USDT) seen multiple times.

### Are Costs Reasonable?

✅ **Check total cost in logs:**
```
Total Cost: $0.000445 (5 requests, 0 cached)
```

Should be:
- < $0.001 per scan (5 opportunities)
- < $0.10 per day (144 scans)
- < $3.00 per month

## Troubleshooting Quick Fixes

### Claude AI Not Extracting

```bash
# 1. Check API key is set
echo $ANTHROPIC_API_KEY

# 2. Check contract data is enabled
echo $CONTRACT_DATA_ENABLED  # Should be 'true'

# 3. Restart the bot
npm run start
```

### Still Seeing DexScreener Calls

```bash
# 1. Check environment variable
echo $DEXSCREENER_ENABLED  # Should be 'false' or empty

# 2. Ensure config is correct
grep -r "DEXSCREENER_ENABLED" .env

# 3. Restart the bot
npm run start
```

### Costs Too High

```bash
# 1. Increase cache TTL (default 300s = 5 minutes)
CLAUDE_CACHE_TTL=600  # 10 minutes

# 2. Reduce batch size (default 5)
CONTRACT_DATA_BATCH_SIZE=3

# 3. Increase scan interval (default 600s = 10 minutes)
SCAN_INTERVAL_MS=900000  # 15 minutes
```

## Log Prefixes Cheat Sheet

| Prefix | Meaning | Should See? |
|--------|---------|-------------|
| `🤖 [CLAUDE-CONTRACT]` | Claude AI contract extraction | ✅ Yes, frequently |
| `📦 [CLAUDE-CONTRACT]` | Cache hit (no API call) | ✅ Yes, for popular tokens |
| `💰 [CLAUDE-CONTRACT]` | Cost tracking | ✅ Yes, after each call |
| `✅ [CONTRACT-SERVICE]` | Enrichment completed | ✅ Yes, after extraction |
| `🚫 [VALIDATION]` | DexScreener disabled | ✅ Yes, during validation |
| `⚠️ [DEXSCREENER]` | DexScreener warning | ❌ No, should not see |
| `🌐 [DEXSCREENER]` | DexScreener API call | ❌ No, should not see |

## Need More Details?

See: [CLAUDE_AI_ENRICHMENT_UPGRADE.md](CLAUDE_AI_ENRICHMENT_UPGRADE.md)
