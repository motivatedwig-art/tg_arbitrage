"""
Contract Resolver Service
Main service for resolving token symbols to contract addresses
"""
import os
import time
import asyncio
import logging
from typing import Optional, Dict, Any, List
from datetime import datetime, timedelta
from sqlalchemy.orm import Session

from app.models.contract_address import ContractAddress
from app.models.pair_contract import PairContract
from app.models.failed_lookup import FailedContractLookup
from app.utils.contract_cache import ContractCache
from app.utils.rate_limiter import RateLimiterManager
from app.services.api_clients.coingecko_client import CoinGeckoClient
from app.services.api_clients.etherscan_client import EtherscanClient
from app.services.api_clients.oneinch_client import OneInchClient

# Fallback to DexScreener if available
try:
    from utils.dexscreener import DexScreenerClient
    DEXSCREENER_AVAILABLE = True
except ImportError:
    DEXSCREENER_AVAILABLE = False

logger = logging.getLogger(__name__)


class ContractResolver:
    """
    Main service for resolving token symbols to contract addresses
    with caching, rate limiting, and API fallback chain
    """
    
    # Native tokens (no contract address)
    NATIVE_TOKENS = {
        'ethereum': 'ETH',
        'bsc': 'BNB',
        'polygon': 'MATIC',
        'avalanche': 'AVAX',
        'fantom': 'FTM',
        'arbitrum': 'ETH',
        'optimism': 'ETH',
        'base': 'ETH'
    }
    
    def __init__(self, db_session: Session):
        self.db = db_session
        self.cache = ContractCache(db_session, cache_ttl_seconds=int(os.getenv('CONTRACT_CACHE_TTL', 86400)))
        self.rate_limiter = RateLimiterManager()
        
        # Initialize API clients
        self.coingecko = CoinGeckoClient()
        self.etherscan = EtherscanClient()
        self.oneinch = OneInchClient()
        
        # Metrics
        self.metrics = {
            'cache_hits': 0,
            'cache_misses': 0,
            'api_calls_saved': 0,
            'total_requests': 0
        }
    
    async def get_contract_address(
        self,
        token_symbol: str,
        blockchain: str = "ethereum",
        force_refresh: bool = False
    ) -> Dict[str, Any]:
        """
        Get contract address for a token symbol
        
        Args:
            token_symbol: Token symbol (e.g., 'USDT', 'ETH')
            blockchain: Blockchain name (e.g., 'ethereum', 'bsc')
            force_refresh: Force refresh from API even if cached
            
        Returns:
            Dictionary with contract information:
            {
                'symbol': str,
                'contract': str or None (for native tokens),
                'blockchain': str,
                'decimals': int,
                'name': str,
                'source': str  # 'cache' or 'api'
            }
        """
        self.metrics['total_requests'] += 1
        token_symbol = token_symbol.upper()
        blockchain = blockchain.lower()
        
        # Check if native token
        if blockchain in self.NATIVE_TOKENS and token_symbol == self.NATIVE_TOKENS[blockchain]:
            return {
                'symbol': token_symbol,
                'contract': None,  # Native token
                'blockchain': blockchain,
                'decimals': 18,
                'name': token_symbol,
                'source': 'native'
            }
        
        # Check cache first (unless force refresh)
        if not force_refresh:
            cached = self.cache.get_cached_contract(token_symbol, blockchain)
            if cached:
                self.metrics['cache_hits'] += 1
                return {
                    'symbol': cached.token_symbol,
                    'contract': cached.contract_address,
                    'blockchain': cached.blockchain,
                    'decimals': cached.decimals or 18,
                    'name': cached.token_name or token_symbol,
                    'source': 'cache',
                    'verified': cached.verified
                }
        
        # Cache miss - fetch from APIs
        self.metrics['cache_misses'] += 1
        contract_data = await self._fetch_from_apis(token_symbol, blockchain)
        
        if contract_data:
            # Save to cache
            try:
                saved_contract = self.cache.save_contract({
                    'symbol': token_symbol,
                    'contract': contract_data['contract'],
                    'blockchain': blockchain,
                    'decimals': contract_data.get('decimals', 18),
                    'name': contract_data.get('name', token_symbol),
                    'verified': contract_data.get('verified', False)
                })
                contract_data['source'] = 'api'
                return contract_data
            except Exception as e:
                logger.error(f"Error saving contract to cache: {e}")
                contract_data['source'] = 'api'
                return contract_data
        else:
            # All APIs failed - log failure
            await self._log_failed_lookup(token_symbol, blockchain, "All APIs failed")
            raise ValueError(f"Could not resolve contract address for {token_symbol} on {blockchain}")
    
    async def get_pair_contracts(
        self,
        pair: str,  # e.g., "USDT/ETH"
        blockchain: str = "ethereum"
    ) -> Dict[str, Any]:
        """
        Get contract addresses for both tokens in a pair
        
        Args:
            pair: Trading pair (e.g., "USDT/ETH", "BTC/USDT")
            blockchain: Blockchain name
            
        Returns:
            Dictionary with pair information:
            {
                'pair': str,
                'base_token': {...},
                'quote_token': {...},
                'blockchain': str
            }
        """
        # Parse pair
        parts = pair.split('/')
        if len(parts) != 2:
            raise ValueError(f"Invalid pair format: {pair}. Expected format: BASE/QUOTE")
        
        base_symbol, quote_symbol = parts[0].upper(), parts[1].upper()
        
        # Get contracts for both tokens
        base_token = await self.get_contract_address(base_symbol, blockchain)
        quote_token = await self.get_contract_address(quote_symbol, blockchain)
        
        return {
            'pair': pair,
            'base_token': base_token,
            'quote_token': quote_token,
            'blockchain': blockchain
        }
    
    async def _fetch_from_apis(
        self,
        token_symbol: str,
        blockchain: str
    ) -> Optional[Dict[str, Any]]:
        """
        Try APIs in sequence until successful
        
        Priority order:
        1. CoinGecko
        2. 1inch
        3. Etherscan (if we have contract address from other sources)
        4. DexScreener (fallback)
        """
        start_time = time.time()
        
        # Try CoinGecko first
        try:
            await self.rate_limiter.acquire('coingecko')
            async with self.coingecko:
                # First, search for coin ID
                coin_id = await self.coingecko.search_coin(token_symbol)
                if coin_id:
                    contract_data = await self.coingecko.get_contract_address(coin_id, blockchain)
                    if contract_data:
                        response_time = int((time.time() - start_time) * 1000)
                        self.cache.log_api_call(
                            'coingecko',
                            f'/coins/{coin_id}/contract/{blockchain}',
                            True,
                            response_time,
                            200
                        )
                        return contract_data
        except Exception as e:
            logger.warning(f"CoinGecko API error: {e}")
            response_time = int((time.time() - start_time) * 1000)
            self.cache.log_api_call(
                'coingecko',
                f'search/{token_symbol}',
                False,
                response_time,
                None,
                str(e)
            )
        
        # Try 1inch
        try:
            await self.rate_limiter.acquire('1inch')
            async with self.oneinch:
                tokens = await self.oneinch.search_tokens(token_symbol, blockchain, limit=1)
                if tokens:
                    token = tokens[0]  # Get first match
                    response_time = int((time.time() - start_time) * 1000)
                    self.cache.log_api_call(
                        '1inch',
                        f'/token/v1.2/{blockchain}/search',
                        True,
                        response_time,
                        200
                    )
                    return {
                        'symbol': token['symbol'],
                        'contract': token['contract_address'],
                        'blockchain': blockchain,
                        'decimals': token.get('decimals', 18),
                        'name': token.get('name', token_symbol),
                        'verified': False,
                        'source': '1inch'
                    }
        except Exception as e:
            logger.warning(f"1inch API error: {e}")
            response_time = int((time.time() - start_time) * 1000)
            self.cache.log_api_call(
                '1inch',
                f'/token/v1.2/{blockchain}/search',
                False,
                response_time,
                None,
                str(e)
            )
        
        # Try DexScreener as fallback
        if DEXSCREENER_AVAILABLE:
            try:
                await self.rate_limiter.acquire('dexscreener')
                async with DexScreenerClient() as dexscreener:
                    # Search for token
                    tokens = await dexscreener.search_tokens(token_symbol)
                    # Filter by blockchain
                    for token in tokens:
                        if token['chain_id'].lower() == blockchain.lower():
                            response_time = int((time.time() - start_time) * 1000)
                            self.cache.log_api_call(
                                'dexscreener',
                                f'/search?q={token_symbol}',
                                True,
                                response_time,
                                200
                            )
                            return {
                                'symbol': token['symbol'],
                                'contract': token['address'],
                                'blockchain': blockchain,
                                'decimals': 18,  # DexScreener doesn't always provide this
                                'name': token.get('name', token_symbol),
                                'verified': False,
                                'source': 'dexscreener'
                            }
            except Exception as e:
                logger.warning(f"DexScreener API error: {e}")
                response_time = int((time.time() - start_time) * 1000)
                self.cache.log_api_call(
                    'dexscreener',
                    f'/search?q={token_symbol}',
                    False,
                    response_time,
                    None,
                    str(e)
                )
        
        return None
    
    async def _log_failed_lookup(
        self,
        token_symbol: str,
        blockchain: str,
        error_message: str
    ):
        """Log failed lookup for analysis"""
        try:
            failed = self.db.query(FailedContractLookup).filter(
                FailedContractLookup.token_symbol == token_symbol.upper(),
                FailedContractLookup.blockchain == blockchain.lower()
            ).first()
            
            if failed:
                failed.retry_count += 1
                failed.error_message = error_message
                failed.failed_at = datetime.utcnow()
            else:
                failed = FailedContractLookup(
                    token_symbol=token_symbol.upper(),
                    blockchain=blockchain.lower(),
                    error_message=error_message,
                    retry_count=1
                )
                self.db.add(failed)
            
            self.db.commit()
        except Exception as e:
            logger.error(f"Error logging failed lookup: {e}")
            self.db.rollback()
    
    def get_metrics(self) -> Dict[str, Any]:
        """Get resolver metrics"""
        cache_hit_rate = 0
        if self.metrics['total_requests'] > 0:
            cache_hit_rate = (self.metrics['cache_hits'] / self.metrics['total_requests']) * 100
        
        return {
            **self.metrics,
            'cache_hit_rate': round(cache_hit_rate, 2),
            'api_calls_saved': self.metrics['cache_hits']
        }
    
    async def get_api_stats(self, hours: int = 24) -> Dict[str, Any]:
        """
        Get API usage statistics
        
        Args:
            hours: Number of hours to look back
            
        Returns:
            Dictionary with API stats
        """
        try:
            cutoff_time = datetime.utcnow() - timedelta(hours=hours)
            
            # Get stats from API logs
            logs = self.db.query(ApiCallLog).filter(
                ApiCallLog.called_at >= cutoff_time
            ).all()
            
            stats = {
                'total_calls': len(logs),
                'successful_calls': sum(1 for log in logs if log.success),
                'failed_calls': sum(1 for log in logs if not log.success),
                'by_api': {},
                'avg_response_time_ms': 0,
                'cache_hit_rate': 0
            }
            
            # Group by API
            api_stats = {}
            total_response_time = 0
            response_count = 0
            
            for log in logs:
                api_name = log.api_name
                if api_name not in api_stats:
                    api_stats[api_name] = {
                        'total': 0,
                        'success': 0,
                        'failed': 0,
                        'avg_response_time_ms': 0
                    }
                
                api_stats[api_name]['total'] += 1
                if log.success:
                    api_stats[api_name]['success'] += 1
                else:
                    api_stats[api_name]['failed'] += 1
                
                if log.response_time_ms:
                    total_response_time += log.response_time_ms
                    response_count += 1
            
            # Calculate averages
            for api_name, api_data in api_stats.items():
                api_logs = [log for log in logs if log.api_name == api_name and log.response_time_ms]
                if api_logs:
                    api_data['avg_response_time_ms'] = int(
                        sum(log.response_time_ms for log in api_logs) / len(api_logs)
                    )
            
            stats['by_api'] = api_stats
            if response_count > 0:
                stats['avg_response_time_ms'] = int(total_response_time / response_count)
            
            # Add cache metrics
            resolver_metrics = self.get_metrics()
            stats['cache_hit_rate'] = resolver_metrics['cache_hit_rate']
            stats['cache_hits'] = resolver_metrics['cache_hits']
            stats['cache_misses'] = resolver_metrics['cache_misses']
            stats['api_calls_saved'] = resolver_metrics['api_calls_saved']
            
            return stats
            
        except Exception as e:
            logger.error(f"Error getting API stats: {e}")
            return {
                'total_calls': 0,
                'successful_calls': 0,
                'failed_calls': 0,
                'by_api': {},
                'avg_response_time_ms': 0,
                'cache_hit_rate': 0
            }

