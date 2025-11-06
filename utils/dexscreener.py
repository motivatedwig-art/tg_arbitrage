import asyncio
import time
from typing import Dict, List, Optional, Set
from dataclasses import dataclass
import aiohttp
from enum import Enum


# CRITICAL: DexScreener requires exact lowercase chain identifiers
DEXSCREENER_CHAINS = {
    'ethereum', 'bsc', 'polygon', 'arbitrum', 'optimism', 'base',
    'avalanche', 'fantom', 'solana', 'sui', 'aptos', 'zksync',
    'scroll', 'linea', 'blast', 'sonic', 'berachain'
}


# Common user inputs that need normalization
CHAIN_ALIASES = {
    'eth': 'ethereum',
    'ether': 'ethereum',
    'mainnet': 'ethereum',
    'bnb': 'bsc',
    'binance': 'bsc',
    'matic': 'polygon',
    'poly': 'polygon',
    'arb': 'arbitrum',
    'op': 'optimism',
    'avax': 'avalanche',
    'ftm': 'fantom',
    'sol': 'solana'
}


class DexScreenerError(Exception):
    """Base exception for DexScreener API errors"""
    pass


class InvalidChainError(DexScreenerError):
    """Raised when invalid chain identifier is provided"""
    pass


class RateLimitError(DexScreenerError):
    """Raised when rate limit is exceeded"""
    pass


class NoLiquidityError(DexScreenerError):
    """Raised when token has no liquidity"""
    pass


@dataclass
class TokenPrice:
    """Structured token price data with full context"""
    chain_id: str
    contract_address: str
    symbol: str
    name: str
    price_usd: float
    price_native: float
    liquidity_usd: float
    volume_24h: float
    price_change_24h: float
    dex_id: str
    pair_address: str
    unique_key: str  # Format: "chain:address"
    timestamp: int
    
    @property
    def is_liquid(self) -> bool:
        """Check if token has sufficient liquidity"""
        return self.liquidity_usd >= 100_000
    
    @property
    def age_seconds(self) -> float:
        """How old is this price data"""
        return time.time() - self.timestamp


class TokenBucketRateLimiter:
    """
    Rate limiter for DexScreener API
    - Pair endpoints: 300 requests/minute
    - Profile endpoints: 60 requests/minute
    """
    def __init__(self, requests_per_minute: int):
        self.capacity = requests_per_minute
        self.tokens = requests_per_minute
        self.last_update = time.time()
        self.lock = asyncio.Lock()
    
    async def acquire(self):
        """Wait if necessary and consume one token"""
        async with self.lock:
            now = time.time()
            elapsed = now - self.last_update
            
            # Refill tokens based on time passed
            refill = elapsed * (self.capacity / 60)
            self.tokens = min(self.capacity, self.tokens + refill)
            self.last_update = now
            
            if self.tokens < 1:
                # Calculate wait time
                wait_time = (1 - self.tokens) * 60 / self.capacity
                await asyncio.sleep(wait_time)
                self.tokens = 0
            else:
                self.tokens -= 1


class CircuitBreaker:
    """Prevents death spiral when API is failing"""
    def __init__(self, failure_threshold: int = 5, timeout_seconds: int = 60):
        self.failure_threshold = failure_threshold
        self.timeout_seconds = timeout_seconds
        self.failures = 0
        self.last_failure_time = None
        self.state = 'closed'  # closed, open, half-open
    
    @property
    def is_open(self) -> bool:
        if self.state == 'closed':
            return False
        
        if self.state == 'open':
            # Check if timeout has passed
            if time.time() - self.last_failure_time > self.timeout_seconds:
                self.state = 'half-open'
                return False
            return True
        
        return False
    
    def record_success(self):
        """Reset circuit breaker on success"""
        self.failures = 0
        self.state = 'closed'
    
    def record_failure(self):
        """Track failures and open circuit if threshold reached"""
        self.failures += 1
        self.last_failure_time = time.time()
        
        if self.failures >= self.failure_threshold:
            self.state = 'open'


class DexScreenerClient:
    """
    Production-ready DexScreener API client with:
    - Proper chain ID normalization
    - Rate limiting
    - Circuit breaker pattern
    - Full context preservation
    - Comprehensive error handling
    """
    
    BASE_URL = "https://api.dexscreener.com/latest/dex"
    
    def __init__(self):
        self.session: Optional[aiohttp.ClientSession] = None
        self.pair_limiter = TokenBucketRateLimiter(300)  # 300/min for pairs
        self.profile_limiter = TokenBucketRateLimiter(60)  # 60/min for profiles
        self.circuit_breaker = CircuitBreaker()
        
        # Cache for successful lookups (5 minute TTL)
        self.cache: Dict[str, tuple] = {}
        self.cache_ttl = 300  # 5 minutes
        
        # Metrics tracking
        self.metrics = {
            'requests_success': 0,
            'requests_failed': 0,
            'cache_hits': 0,
            'cache_misses': 0,
            'rate_limit_waits': 0,
            'chain_errors': {}  # Track errors per chain
        }
    
    async def __aenter__(self):
        """Async context manager entry"""
        self.session = aiohttp.ClientSession()
        return self
    
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        """Async context manager exit"""
        if self.session:
            await self.session.close()
    
    def normalize_chain_id(self, chain_input: str) -> str:
        """
        Normalize chain identifier to DexScreener format
        
        Examples:
            'ETH' -> 'ethereum'
            'Ethereum' -> 'ethereum'
            'bnb' -> 'bsc'
            'MATIC' -> 'polygon'
        """
        if not chain_input:
            raise InvalidChainError("Chain identifier cannot be empty")
        
        # Convert to lowercase and strip whitespace
        normalized = chain_input.lower().strip()
        
        # Check aliases first
        if normalized in CHAIN_ALIASES:
            normalized = CHAIN_ALIASES[normalized]
        
        # Validate against known chains
        if normalized not in DEXSCREENER_CHAINS:
            raise InvalidChainError(
                f"Invalid chain: '{chain_input}'. "
                f"Valid chains: {', '.join(sorted(DEXSCREENER_CHAINS))}"
            )
        
        return normalized
    
    def make_unique_key(self, chain_id: str, address: str) -> str:
        """Create unique identifier for token"""
        return f"{chain_id.lower()}:{address.lower()}"
    
    async def _fetch(self, endpoint: str, is_profile: bool = False) -> dict:
        """Internal fetch with retry logic and circuit breaker"""
        
        if self.circuit_breaker.is_open:
            raise DexScreenerError("Circuit breaker is open due to repeated failures")
        
        # Select appropriate rate limiter
        limiter = self.profile_limiter if is_profile else self.pair_limiter
        
        max_retries = 3
        last_error = None
        
        for attempt in range(max_retries):
            try:
                # Rate limiting
                await limiter.acquire()
                
                if not self.session:
                    self.session = aiohttp.ClientSession()
                
                url = f"{self.BASE_URL}/{endpoint}"
                
                async with self.session.get(url, timeout=10) as response:
                    if response.status == 200:
                        self.circuit_breaker.record_success()
                        self.metrics['requests_success'] += 1
                        return await response.json()
                    
                    elif response.status == 429:
                        # Rate limit hit
                        self.metrics['rate_limit_waits'] += 1
                        wait_time = min(2 ** attempt * 2, 30)  # Exponential backoff, max 30s
                        
                        print(f"Rate limited. Waiting {wait_time}s...")
                        await asyncio.sleep(wait_time)
                        continue
                    
                    elif response.status == 404:
                        # Chain or token not found
                        error_text = await response.text()
                        raise DexScreenerError(f"Not found: {endpoint}. Response: {error_text}")
                    
                    else:
                        error_text = await response.text()
                        raise DexScreenerError(
                            f"API error {response.status}: {error_text}"
                        )
                        
            except asyncio.TimeoutError:
                last_error = DexScreenerError(f"Request timeout for {endpoint}")
                
            except aiohttp.ClientError as e:
                last_error = DexScreenerError(f"Network error: {str(e)}")
            
            # Wait before retry
            if attempt < max_retries - 1:
                await asyncio.sleep(2 ** attempt)
        
        # All retries failed
        self.circuit_breaker.record_failure()
        self.metrics['requests_failed'] += 1
        
        if last_error:
            raise last_error
        else:
            raise DexScreenerError(f"Failed to fetch {endpoint} after {max_retries} attempts")
    
    async def get_token_pairs(self, chain: str, token_address: str) -> List[TokenPrice]:
        """
        Get all pairs for a specific token on a specific chain
        
        Args:
            chain: Chain identifier (will be normalized)
            token_address: Contract address of token
            
        Returns:
            List of TokenPrice objects for all pairs
        """
        # Normalize chain
        chain_normalized = self.normalize_chain_id(chain)
        
        # Check cache
        cache_key = self.make_unique_key(chain_normalized, token_address)
        if cache_key in self.cache:
            cached_data, cached_time = self.cache[cache_key]
            if time.time() - cached_time < self.cache_ttl:
                self.metrics['cache_hits'] += 1
                return [cached_data]
        
        self.metrics['cache_misses'] += 1
        
        # Fetch from API
        endpoint = f"tokens/{token_address}"
        
        try:
            data = await self._fetch(endpoint)
            
            if not data.get('pairs'):
                raise NoLiquidityError(
                    f"No pairs found for {token_address} on {chain_normalized}"
                )
            
            results = []
            
            for pair in data['pairs']:
                # CRITICAL: Only include pairs from the requested chain
                pair_chain = pair.get('chainId', '').lower()
                
                if pair_chain != chain_normalized:
                    continue
                
                # Parse token data with full context
                token_price = TokenPrice(
                    chain_id=chain_normalized,
                    contract_address=token_address.lower(),
                    symbol=pair['baseToken']['symbol'],
                    name=pair['baseToken']['name'],
                    price_usd=float(pair.get('priceUsd', 0)),
                    price_native=float(pair.get('priceNative', 0)),
                    liquidity_usd=float(pair.get('liquidity', {}).get('usd', 0)),
                    volume_24h=float(pair.get('volume', {}).get('h24', 0)),
                    price_change_24h=float(pair.get('priceChange', {}).get('h24', 0)),
                    dex_id=pair.get('dexId', 'unknown'),
                    pair_address=pair.get('pairAddress', ''),
                    unique_key=cache_key,
                    timestamp=int(time.time())
                )
                
                results.append(token_price)
            
            # Sort by liquidity (highest first)
            results.sort(key=lambda x: x.liquidity_usd, reverse=True)
            
            # Cache the most liquid pair
            if results:
                self.cache[cache_key] = (results[0], time.time())
            
            return results
            
        except DexScreenerError:
            # Track chain-specific errors
            if chain_normalized not in self.metrics['chain_errors']:
                self.metrics['chain_errors'][chain_normalized] = 0
            self.metrics['chain_errors'][chain_normalized] += 1
            raise
    
    async def search_tokens(self, query: str) -> List[dict]:
        """
        Search for tokens by symbol or name
        
        IMPORTANT: This returns tokens from ALL chains.
        You must filter by chain_id in the results.
        """
        endpoint = f"search?q={query}"
        
        data = await self._fetch(endpoint, is_profile=True)
        
        if not data.get('pairs'):
            return []
        
        # Group by unique token (same token can have multiple pairs)
        tokens_by_key = {}
        
        for pair in data['pairs']:
            chain_id = pair.get('chainId', '').lower()
            base_address = pair['baseToken']['address'].lower()
            key = self.make_unique_key(chain_id, base_address)
            
            if key not in tokens_by_key:
                tokens_by_key[key] = {
                    'chain_id': chain_id,
                    'address': base_address,
                    'symbol': pair['baseToken']['symbol'],
                    'name': pair['baseToken']['name'],
                    'pairs_count': 0,
                    'total_liquidity': 0,
                    'unique_key': key
                }
            
            tokens_by_key[key]['pairs_count'] += 1
            tokens_by_key[key]['total_liquidity'] += float(
                pair.get('liquidity', {}).get('usd', 0)
            )
        
        return list(tokens_by_key.values())
    
    async def get_token_price(self, chain: str, token_address: str) -> Optional[TokenPrice]:
        """
        Get the best (most liquid) price for a token
        
        Args:
            chain: Chain identifier
            token_address: Contract address
            
        Returns:
            TokenPrice for most liquid pair, or None if no pairs exist
        """
        try:
            pairs = await self.get_token_pairs(chain, token_address)
            return pairs[0] if pairs else None
        except NoLiquidityError:
            return None
    
    async def compare_prices_across_dexes(self, chain: str, token_address: str) -> List[TokenPrice]:
        """
        Get prices from all DEXes for the same token
        Useful for finding DEX-to-DEX arbitrage
        """
        all_pairs = await self.get_token_pairs(chain, token_address)
        
        # Group by DEX and keep only best price per DEX
        dex_prices = {}
        
        for pair in all_pairs:
            if pair.dex_id not in dex_prices or pair.liquidity_usd > dex_prices[pair.dex_id].liquidity_usd:
                dex_prices[pair.dex_id] = pair
        
        return list(dex_prices.values())
    
    def get_metrics(self) -> dict:
        """Get client metrics for monitoring"""
        return {
            **self.metrics,
            'cache_size': len(self.cache),
            'circuit_breaker_state': self.circuit_breaker.state,
            'circuit_breaker_failures': self.circuit_breaker.failures
        }


# Usage example for monitoring bot
async def monitor_token_example():
    async with DexScreenerClient() as client:
        # Monitor USDC on Ethereum
        try:
            # CORRECT: Use chain name and contract address
            usdc_address = "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48"
            
            # Get price with full context
            price_data = await client.get_token_price("ethereum", usdc_address)
            
            if price_data:
                print(f"Token: {price_data.symbol}")
                print(f"Chain: {price_data.chain_id}")
                print(f"Price: ${price_data.price_usd:.4f}")
                print(f"Liquidity: ${price_data.liquidity_usd:,.0f}")
                print(f"DEX: {price_data.dex_id}")
                print(f"Unique Key: {price_data.unique_key}")
                print(f"Data Age: {price_data.age_seconds:.1f} seconds")
            
            # Compare prices across DEXes
            all_dex_prices = await client.compare_prices_across_dexes("ethereum", usdc_address)
            
            print(f"\nFound {len(all_dex_prices)} DEXes with USDC pairs:")
            for dex_price in all_dex_prices:
                print(f"  {dex_price.dex_id}: ${dex_price.price_usd:.4f} "
                      f"(Liquidity: ${dex_price.liquidity_usd:,.0f})")
            
            # Check metrics
            metrics = client.get_metrics()
            print(f"\nAPI Metrics:")
            print(f"  Success: {metrics['requests_success']}")
            print(f"  Failed: {metrics['requests_failed']}")
            print(f"  Cache Hits: {metrics['cache_hits']}")
            print(f"  Cache Misses: {metrics['cache_misses']}")
            
        except InvalidChainError as e:
            print(f"Chain error: {e}")
        except NoLiquidityError as e:
            print(f"Liquidity error: {e}")
        except DexScreenerError as e:
            print(f"API error: {e}")


if __name__ == "__main__":
    asyncio.run(monitor_token_example())

