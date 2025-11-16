# Contract Address API Collection and Database Storage

This implementation provides a comprehensive contract address resolution system for the Telegram cryptocurrency arbitrage bot.

## Features

- ✅ Database-backed caching to minimize API calls
- ✅ Multiple API integrations (CoinGecko, 1inch, Etherscan, DexScreener fallback)
- ✅ Rate limiting and exponential backoff
- ✅ API usage tracking and metrics
- ✅ Telegram bot command integration
- ✅ Russian and English language support

## Installation

1. **Install dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

2. **Set up environment variables:**
   Add to your `.env` file:
   ```env
   DATABASE_URL=postgresql://user:password@host:port/database
   
   # Optional API keys (improves rate limits)
   COINGECKO_API_KEY=your_key_here
   ETHERSCAN_API_KEY=your_key_here
   BSCSCAN_API_KEY=your_key_here
   POLYGONSCAN_API_KEY=your_key_here
   ONEINCH_API_KEY=your_key_here
   
   # Configuration
   CONTRACT_CACHE_TTL=86400  # 24 hours
   API_RATE_LIMIT_PER_MINUTE=10
   ```

3. **Initialize database:**
   ```bash
   python scripts/init_contract_tables.py
   ```

## Database Schema

The system creates the following tables:

- `contract_addresses` - Stores token contract addresses
- `pair_contracts` - Maps trading pairs to contract addresses
- `failed_contract_lookups` - Tracks failed lookups for analysis
- `api_call_logs` - Logs all API calls for metrics

## Usage

### Python API

```python
from app.database import db_session
from app.services.contract_resolver import ContractResolver

async def example():
    with db_session() as session:
        resolver = ContractResolver(session)
        
        # Get contract address
        result = await resolver.get_contract_address('USDT', 'ethereum')
        print(result['contract'])
        
        # Get pair contracts
        pair = await resolver.get_pair_contracts('USDT/ETH', 'ethereum')
        print(pair['base_token']['contract'])
```

### Telegram Bot Integration

#### TypeScript/Node.js Integration

Add to your `CommandHandler.ts`:

```typescript
// Add command handler
this.bot.onText(/\/contracts (.+)/, async (msg, match) => {
  const args = match[1].split(' ');
  const pair = args[0];
  const blockchain = args[1] || 'ethereum';
  
  // Call Python bridge
  const { exec } = require('child_process');
  exec(
    `python app/integration_bridge.py contracts ${pair} ${blockchain} ru`,
    (error, stdout, stderr) => {
      if (error) {
        this.bot.sendMessage(msg.chat.id, '❌ Ошибка получения контрактов');
        return;
      }
      
      const result = JSON.parse(stdout);
      if (result.success) {
        this.bot.sendMessage(msg.chat.id, result.message);
      }
    }
  );
});

// Add API stats command
this.bot.onText(/\/api_stats/, async (msg) => {
  const { exec } = require('child_process');
  exec(
    'python app/integration_bridge.py api_stats 24 ru',
    (error, stdout, stderr) => {
      if (error) return;
      const result = JSON.parse(stdout);
      if (result.success) {
        this.bot.sendMessage(msg.chat.id, result.message);
      }
    }
  );
});
```

### CLI Usage

```bash
# Get contracts for a pair
python app/integration_bridge.py contracts USDT/ETH ethereum ru

# Get API statistics
python app/integration_bridge.py api_stats 24 ru
```

## API Priority

The system tries APIs in this order:

1. **CoinGecko** - Free tier, no key required
2. **1inch** - Good for multiple chains
3. **Etherscan/BSCScan** - If API key available
4. **DexScreener** - Fallback only

## Caching Strategy

- Contracts are cached in the database for 24 hours (configurable)
- Cache hit rate is tracked and displayed in `/api_stats`
- Stale cache is automatically refreshed on next request

## Rate Limiting

- Default: 10 API calls per minute per service
- Configurable via `API_RATE_LIMIT_PER_MINUTE`
- Token bucket algorithm with automatic backoff

## Metrics

Use `/api_stats` command to view:
- Total API calls
- Cache hit rate
- API calls saved
- Average response time
- Breakdown by API service

## Error Handling

- Failed lookups are logged to `failed_contract_lookups` table
- Exponential backoff on API failures
- Graceful fallback to DexScreener if other APIs fail
- User-friendly error messages in Russian/English

## Testing

Run example usage:
```bash
python app/example_usage.py
```

## File Structure

```
app/
├── models/              # SQLAlchemy models
│   ├── contract_address.py
│   ├── pair_contract.py
│   ├── failed_lookup.py
│   └── api_call_log.py
├── services/
│   ├── contract_resolver.py    # Main service
│   └── api_clients/            # API clients
│       ├── coingecko_client.py
│       ├── etherscan_client.py
│       └── oneinch_client.py
├── handlers/
│   └── contracts_handler.py    # Telegram handler
├── utils/
│   ├── rate_limiter.py
│   └── contract_cache.py
└── database.py                 # Database configuration
```

## Success Metrics

Target metrics:
- 80%+ cache hit rate after first week
- <100ms response time for cached contracts
- <2s response time for new contract lookups
- 90%+ reduction in external API calls

## Notes

- Native tokens (ETH, BNB, MATIC, etc.) return `null` for contract address
- All contract addresses are stored in lowercase
- Blockchain names are normalized to lowercase
- Token symbols are normalized to uppercase

## Troubleshooting

**Database connection errors:**
- Check `DATABASE_URL` environment variable
- Ensure PostgreSQL is running and accessible

**API errors:**
- Check API keys in `.env` file
- Verify rate limits haven't been exceeded
- Check network connectivity

**Cache not working:**
- Verify database tables were created
- Check `CONTRACT_CACHE_TTL` setting
- Ensure database connection is working

