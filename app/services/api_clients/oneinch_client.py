"""
1inch API client for fetching contract addresses
"""
import os
import time
import asyncio
import aiohttp
import logging
from typing import Optional, Dict, Any, List
from datetime import datetime

logger = logging.getLogger(__name__)


class OneInchClient:
    """
    Client for 1inch API
    Free tier: Good rate limits, no key required for basic
    """
    
    BASE_URL = "https://api.1inch.dev"
    
    # Chain IDs mapping
    CHAIN_IDS = {
        'ethereum': 1,
        'bsc': 56,
        'polygon': 137,
        'arbitrum': 42161,
        'optimism': 10,
        'avalanche': 43114,
        'fantom': 250,
        'base': 8453,
        'zksync': 324,
        'scroll': 534352
    }
    
    def __init__(self):
        self.api_key = os.getenv('ONEINCH_API_KEY')
        self.session: Optional[aiohttp.ClientSession] = None
        self.rate_limit_delay = 0.1  # 10 calls/second
        
    async def __aenter__(self):
        """Async context manager entry"""
        headers = {}
        if self.api_key:
            headers['Authorization'] = f'Bearer {self.api_key}'
        self.session = aiohttp.ClientSession(headers=headers)
        return self
        
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        """Async context manager exit"""
        if self.session:
            await self.session.close()
    
    def _get_chain_id(self, blockchain: str) -> Optional[int]:
        """Convert blockchain name to 1inch chain ID"""
        blockchain_lower = blockchain.lower()
        return self.CHAIN_IDS.get(blockchain_lower)
    
    async def search_tokens(
        self, 
        query: str, 
        blockchain: str,
        limit: int = 10
    ) -> List[Dict[str, Any]]:
        """
        Search for tokens by symbol or name
        
        Args:
            query: Token symbol or name
            blockchain: Blockchain name
            limit: Maximum number of results
            
        Returns:
            List of token dictionaries
        """
        chain_id = self._get_chain_id(blockchain)
        if not chain_id:
            logger.warning(f"Unsupported blockchain for 1inch: {blockchain}")
            return []
        
        endpoint = f"/token/v1.2/{chain_id}/search"
        url = f"{self.BASE_URL}{endpoint}"
        params = {'query': query, 'limit': limit}
        
        try:
            if not self.session:
                headers = {}
                if self.api_key:
                    headers['Authorization'] = f'Bearer {self.api_key}'
                self.session = aiohttp.ClientSession(headers=headers)
            
            await asyncio.sleep(self.rate_limit_delay)
            
            async with self.session.get(url, params=params, timeout=10) as response:
                if response.status == 200:
                    data = await response.json()
                    tokens = data.get('tokens', [])
                    
                    results = []
                    for token in tokens:
                        results.append({
                            'contract_address': token.get('address', '').lower(),
                            'symbol': token.get('symbol', '').upper(),
                            'name': token.get('name', ''),
                            'decimals': token.get('decimals', 18),
                            'source': '1inch'
                        })
                    return results
                elif response.status == 404:
                    logger.debug(f"No tokens found for '{query}' on {blockchain} via 1inch")
                    return []
                else:
                    error_text = await response.text()
                    logger.warning(f"1inch API error {response.status}: {error_text}")
                    return []
                    
        except asyncio.TimeoutError:
            logger.error(f"1inch API timeout for {query} on {blockchain}")
            return []
        except Exception as e:
            logger.error(f"1inch API error: {str(e)}")
            return []
    
    async def get_token_info(
        self, 
        contract_address: str, 
        blockchain: str
    ) -> Optional[Dict[str, Any]]:
        """
        Get token information by contract address
        
        Args:
            contract_address: Contract address
            blockchain: Blockchain name
            
        Returns:
            Dictionary with token info or None
        """
        chain_id = self._get_chain_id(blockchain)
        if not chain_id:
            return None
        
        # 1inch doesn't have a direct token info endpoint
        # We can use the token list endpoint and filter
        endpoint = f"/token/v1.2/{chain_id}/token/{contract_address}"
        url = f"{self.BASE_URL}{endpoint}"
        
        try:
            if not self.session:
                headers = {}
                if self.api_key:
                    headers['Authorization'] = f'Bearer {self.api_key}'
                self.session = aiohttp.ClientSession(headers=headers)
            
            await asyncio.sleep(self.rate_limit_delay)
            
            async with self.session.get(url, timeout=10) as response:
                if response.status == 200:
                    token = await response.json()
                    return {
                        'contract_address': contract_address.lower(),
                        'symbol': token.get('symbol', '').upper(),
                        'name': token.get('name', ''),
                        'decimals': token.get('decimals', 18),
                        'source': '1inch'
                    }
                return None
                
        except Exception as e:
            logger.error(f"1inch token info error: {str(e)}")
            return None

