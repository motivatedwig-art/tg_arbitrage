"""
Etherscan/BSCScan/PolygonScan API client for fetching contract addresses
"""
import os
import time
import asyncio
import aiohttp
import logging
from typing import Optional, Dict, Any
from datetime import datetime

logger = logging.getLogger(__name__)


class EtherscanClient:
    """
    Client for Etherscan-family APIs (Etherscan, BSCScan, PolygonScan)
    Free tier: 5 calls/second (with API key)
    """
    
    BASE_URLS = {
        'ethereum': 'https://api.etherscan.io/api',
        'bsc': 'https://api.bscscan.com/api',
        'polygon': 'https://api.polygonscan.com/api',
        'arbitrum': 'https://api.arbiscan.io/api',
        'optimism': 'https://api-optimistic.etherscan.io/api',
        'avalanche': 'https://api.snowtrace.io/api',
        'fantom': 'https://api.ftmscan.com/api',
        'base': 'https://api.basescan.org/api'
    }
    
    API_KEY_ENV_VARS = {
        'ethereum': 'ETHERSCAN_API_KEY',
        'bsc': 'BSCSCAN_API_KEY',
        'polygon': 'POLYGONSCAN_API_KEY',
        'arbitrum': 'ARBISCAN_API_KEY',
        'optimism': 'OPTIMISMSCAN_API_KEY',
        'avalanche': 'SNOWTRACE_API_KEY',
        'fantom': 'FTMSCAN_API_KEY',
        'base': 'BASESCAN_API_KEY'
    }
    
    def __init__(self):
        self.session: Optional[aiohttp.ClientSession] = None
        self.rate_limit_delay = 0.2  # 5 calls/second
        
    async def __aenter__(self):
        """Async context manager entry"""
        self.session = aiohttp.ClientSession()
        return self
        
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        """Async context manager exit"""
        if self.session:
            await self.session.close()
    
    def _get_base_url(self, blockchain: str) -> Optional[str]:
        """Get base URL for blockchain"""
        blockchain_lower = blockchain.lower()
        return self.BASE_URLS.get(blockchain_lower)
    
    def _get_api_key(self, blockchain: str) -> Optional[str]:
        """Get API key for blockchain"""
        blockchain_lower = blockchain.lower()
        env_var = self.API_KEY_ENV_VARS.get(blockchain_lower)
        if env_var:
            return os.getenv(env_var)
        return None
    
    async def get_contract_info(
        self, 
        contract_address: str, 
        blockchain: str
    ) -> Optional[Dict[str, Any]]:
        """
        Get contract information (ABI, name, symbol, decimals)
        
        Args:
            contract_address: Contract address
            blockchain: Blockchain name
            
        Returns:
            Dictionary with contract info or None if not found
        """
        base_url = self._get_base_url(blockchain)
        if not base_url:
            logger.warning(f"Unsupported blockchain for Etherscan: {blockchain}")
            return None
        
        api_key = self._get_api_key(blockchain)
        if not api_key:
            logger.debug(f"No API key for {blockchain} scan API")
            return None
        
        params = {
            'module': 'contract',
            'action': 'getsourcecode',
            'address': contract_address,
            'apikey': api_key
        }
        
        try:
            if not self.session:
                self.session = aiohttp.ClientSession()
            
            await asyncio.sleep(self.rate_limit_delay)
            
            async with self.session.get(base_url, params=params, timeout=10) as response:
                if response.status == 200:
                    data = await response.json()
                    if data.get('status') == '1' and data.get('result'):
                        result = data['result'][0]
                        
                        # Try to extract name and symbol from ABI or contract name
                        contract_name = result.get('ContractName', '')
                        source_code = result.get('SourceCode', '')
                        
                        # Basic parsing (can be enhanced)
                        name = contract_name or ''
                        symbol = ''
                        decimals = 18  # Default
                        
                        # Try to extract from source code if available
                        if source_code and 'symbol' in source_code.lower():
                            # Simple extraction (not perfect, but works for common cases)
                            import re
                            symbol_match = re.search(r'symbol\s*[:=]\s*["\']([^"\']+)["\']', source_code, re.IGNORECASE)
                            if symbol_match:
                                symbol = symbol_match.group(1).upper()
                        
                        return {
                            'contract_address': contract_address.lower(),
                            'name': name,
                            'symbol': symbol,
                            'decimals': decimals,
                            'verified': result.get('Proxy', '0') == '0' and bool(source_code),
                            'source': f'{blockchain}scan'
                        }
                return None
                
        except asyncio.TimeoutError:
            logger.error(f"Etherscan API timeout for {contract_address} on {blockchain}")
            return None
        except Exception as e:
            logger.error(f"Etherscan API error: {str(e)}")
            return None
    
    async def search_token_by_symbol(
        self, 
        symbol: str, 
        blockchain: str
    ) -> Optional[Dict[str, Any]]:
        """
        Search for token by symbol (limited - Etherscan doesn't have great search)
        This is a fallback method - not very reliable
        
        Args:
            symbol: Token symbol
            blockchain: Blockchain name
            
        Returns:
            Dictionary with token info or None
        """
        # Etherscan doesn't have a good symbol search API
        # This would require using their token list or other methods
        # For now, return None to indicate this method isn't available
        logger.debug(f"Etherscan doesn't support symbol search directly")
        return None

