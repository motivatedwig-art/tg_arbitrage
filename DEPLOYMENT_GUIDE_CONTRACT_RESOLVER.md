# Deployment Guide - Contract Resolver

## Prerequisites

1. **PostgreSQL Database** (Railway or other)
   - Ensure `DATABASE_URL` is set in environment variables

2. **Python 3.8+** installed on the server

3. **Required Python packages** (install via `pip install -r requirements.txt`)

## Deployment Steps

### 1. Install Dependencies

```bash
pip install -r requirements.txt
```

### 2. Set Environment Variables

Add to your `.env` file or Railway environment variables:

```env
# Required
DATABASE_URL=postgresql://user:password@host:port/database

# Optional (improves rate limits)
COINGECKO_API_KEY=your_key_here
ETHERSCAN_API_KEY=your_key_here
BSCSCAN_API_KEY=your_key_here
POLYGONSCAN_API_KEY=your_key_here
ONEINCH_API_KEY=your_key_here

# Configuration
CONTRACT_CACHE_TTL=86400
API_RATE_LIMIT_PER_MINUTE=10
```

### 3. Initialize Database

Run the initialization script:

```bash
python scripts/init_contract_tables.py
```

This will:
- Create all necessary tables
- Set up indexes
- Create triggers for `updated_at` timestamps

### 4. Verify Installation

Test the system:

```bash
python app/example_usage.py
```

### 5. Deploy Bot

The TypeScript bot will automatically detect and use the contracts handler if:
- Python is available in PATH
- `app/integration_bridge.py` is accessible
- Database tables are initialized

## Railway Deployment

### Option 1: Single Service (Node.js + Python)

1. Ensure both Node.js and Python are available
2. Add build commands:
   ```bash
   npm install
   pip install -r requirements.txt
   ```
3. Set environment variables in Railway dashboard
4. Run database migration:
   ```bash
   python scripts/init_contract_tables.py
   ```

### Option 2: Separate Services

1. **Node.js Service** (Bot)
   - Deploy as usual
   - Contracts handler will be optional

2. **Python Service** (Contract Resolver)
   - Deploy as separate service
   - Expose HTTP API (future enhancement)
   - Or use shared database

## Verification

After deployment, test the commands:

1. **In Telegram:**
   ```
   /contracts USDT/ETH ethereum
   /api_stats 24
   ```

2. **Check logs:**
   - Should see "✅ Contracts command handler initialized"
   - No errors about missing Python modules

## Troubleshooting

### "ContractsCommandHandler not available"
- **Cause**: Python not found or module not accessible
- **Solution**: Ensure Python is in PATH and dependencies installed

### "Database connection error"
- **Cause**: DATABASE_URL not set or incorrect
- **Solution**: Verify DATABASE_URL in environment variables

### "Table does not exist"
- **Cause**: Database not initialized
- **Solution**: Run `python scripts/init_contract_tables.py`

### "API rate limit exceeded"
- **Cause**: Too many API calls
- **Solution**: 
  - Add API keys to improve rate limits
  - Increase `API_RATE_LIMIT_PER_MINUTE` if needed
  - Wait for rate limit to reset

## Monitoring

Monitor the following:

1. **Cache hit rate** - Should increase over time
2. **API call statistics** - Use `/api_stats` command
3. **Error logs** - Check for failed lookups
4. **Database size** - Monitor table growth

## Maintenance

### Regular Tasks

1. **Clean up old logs** (optional):
   ```sql
   DELETE FROM api_call_logs 
   WHERE called_at < NOW() - INTERVAL '30 days';
   ```

2. **Review failed lookups**:
   ```sql
   SELECT * FROM failed_contract_lookups 
   ORDER BY failed_at DESC 
   LIMIT 100;
   ```

3. **Monitor cache performance**:
   - Check cache hit rate via `/api_stats`
   - Adjust `CONTRACT_CACHE_TTL` if needed

## Performance Tuning

### Increase Cache TTL
If you want longer cache duration:
```env
CONTRACT_CACHE_TTL=172800  # 48 hours
```

### Adjust Rate Limits
If you have API keys:
```env
API_RATE_LIMIT_PER_MINUTE=30  # Higher limit with API key
```

### Database Connection Pooling
Already configured in `app/database.py`:
- Pool size: 10
- Max overflow: 20
- Connection recycling: 1 hour

## Security Notes

1. **API Keys**: Store securely in environment variables
2. **Database**: Use SSL connections in production
3. **Rate Limiting**: Prevents abuse and API key exhaustion
4. **Input Validation**: All inputs are validated and sanitized

## Support

For issues or questions:
1. Check logs for error messages
2. Review `README_CONTRACT_RESOLVER.md` for usage
3. Check `IMPLEMENTATION_SUMMARY_CONTRACT_RESOLVER.md` for architecture

