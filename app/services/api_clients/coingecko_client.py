"""
CoinGecko API client for fetching contract addresses
"""
import os
import time
import asyncio
import aiohttp
import logging
from typing import Optional, Dict, Any
from datetime import datetime

logger = logging.getLogger(__name__)


class CoinGeckoClient:
    """
    Client for CoinGecko API
    Free tier: 10-50 calls/minute (no API key required for basic)
    """
    
    BASE_URL = "https://api.coingecko.com/api/v3"
    
    # Platform IDs mapping
    PLATFORM_IDS = {
        'ethereum': 'ethereum',
        'bsc': 'binance-smart-chain',
        'polygon': 'polygon-pos',
        'arbitrum': 'arbitrum-one',
        'optimism': 'optimistic-ethereum',
        'avalanche': 'avalanche',
        'fantom': 'fantom',
        'base': 'base',
        'zksync': 'zksync',
        'scroll': 'scroll'
    }
    
    def __init__(self):
        self.api_key = os.getenv('COINGECKO_API_KEY')
        self.session: Optional[aiohttp.ClientSession] = None
        self.rate_limit_delay = 0.1  # 10 calls/second default (no key)
        
    async def __aenter__(self):
        """Async context manager entry"""
        self.session = aiohttp.ClientSession()
        return self
        
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        """Async context manager exit"""
        if self.session:
            await self.session.close()
    
    def _get_platform_id(self, blockchain: str) -> Optional[str]:
        """Convert blockchain name to CoinGecko platform ID"""
        blockchain_lower = blockchain.lower()
        return self.PLATFORM_IDS.get(blockchain_lower)
    
    async def get_contract_address(
        self, 
        coin_id: str, 
        blockchain: str
    ) -> Optional[Dict[str, Any]]:
        """
        Get contract address for a coin on a specific blockchain
        
        Args:
            coin_id: CoinGecko coin ID (e.g., 'tether', 'ethereum')
            blockchain: Blockchain name (e.g., 'ethereum', 'bsc')
            
        Returns:
            Dictionary with contract info or None if not found
        """
        platform_id = self._get_platform_id(blockchain)
        if not platform_id:
            logger.warning(f"Unsupported blockchain for CoinGecko: {blockchain}")
            return None
        
        endpoint = f"/coins/{coin_id}/contract/{platform_id}"
        url = f"{self.BASE_URL}{endpoint}"
        
        try:
            if not self.session:
                self.session = aiohttp.ClientSession()
            
            # Rate limiting
            await asyncio.sleep(self.rate_limit_delay)
            
            headers = {}
            if self.api_key:
                headers['x-cg-demo-api-key'] = self.api_key
            
            async with self.session.get(url, headers=headers, timeout=10) as response:
                if response.status == 200:
                    data = await response.json()
                    return {
                        'contract_address': data.get('contract_address', '').lower(),
                        'platform': data.get('platform', {}).get('id', blockchain),
                        'name': data.get('name', ''),
                        'symbol': data.get('symbol', '').upper(),
                        'decimals': data.get('detail_platforms', {}).get(platform_id, {}).get('decimal_place'),
                        'source': 'coingecko'
                    }
                elif response.status == 404:
                    logger.debug(f"Coin {coin_id} not found on {blockchain} via CoinGecko")
                    return None
                else:
                    error_text = await response.text()
                    logger.warning(f"CoinGecko API error {response.status}: {error_text}")
                    return None
                    
        except asyncio.TimeoutError:
            logger.error(f"CoinGecko API timeout for {coin_id} on {blockchain}")
            return None
        except Exception as e:
            logger.error(f"CoinGecko API error: {str(e)}")
            return None
    
    async def search_coin(self, query: str) -> Optional[str]:
        """
        Search for coin ID by symbol or name
        
        Args:
            query: Token symbol or name (e.g., 'USDT', 'Tether')
            
        Returns:
            CoinGecko coin ID or None if not found
        """
        url = f"{self.BASE_URL}/search"
        params = {'query': query}
        
        try:
            if not self.session:
                self.session = aiohttp.ClientSession()
            
            await asyncio.sleep(self.rate_limit_delay)
            
            headers = {}
            if self.api_key:
                headers['x-cg-demo-api-key'] = self.api_key
            
            async with self.session.get(url, params=params, headers=headers, timeout=10) as response:
                if response.status == 200:
                    data = await response.json()
                    coins = data.get('coins', [])
                    if coins:
                        # Return first match (usually most relevant)
                        return coins[0].get('id')
                return None
                
        except Exception as e:
            logger.error(f"CoinGecko search error: {str(e)}")
            return None

