"""
Integration bridge between Python components and Node.js bot

This provides a clean interface that can be called from Node.js
via subprocess or HTTP API calls.
"""

import asyncio
import json
import logging
import sys
from typing import Dict, List, Optional, Any
import os

# Add the current directory to Python path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from utils.dexscreener import DexScreenerClient, InvalidChainError, NoLiquidityError
from models.token_registry import TokenRegistry, ScamTokenError, NoDataError

logger = logging.getLogger(__name__)

class PythonIntegrationBridge:
    """
    Bridge to integrate Python components with Node.js bot
    
    This provides a clean interface that can be called from Node.js
    via subprocess or HTTP API
    """
    
    def __init__(self):
        self.dex_client = DexScreenerClient()
        self.token_registry = TokenRegistry(self.dex_client)
        self.is_initialized = False
    
    async def initialize(self):
        """Initialize the Python components"""
        if not self.is_initialized:
            await self.dex_client.__aenter__()
            self.is_initialized = True
            logger.info("Python integration bridge initialized")
    
    async def shutdown(self):
        """Cleanup resources"""
        if self.is_initialized:
            await self.dex_client.__aexit__(None, None, None)
            self.is_initialized = False
            logger.info("Python integration bridge shutdown")
    
    async def get_dex_price(self, chain: str, token_address: str) -> Optional[Dict]:
        """Get DEX price with full context"""
        try:
            price = await self.dex_client.get_token_price(chain, token_address)
            if price:
                return {
                    'chain_id': price.chain_id,
                    'address': price.contract_address,
                    'symbol': price.symbol,
                    'price_usd': price.price_usd,
                    'liquidity_usd': price.liquidity_usd,
                    'volume_24h': price.volume_24h,
                    'dex_id': price.dex_id,
                    'unique_key': price.unique_key,
                    'is_liquid': price.is_liquid,
                    'age_seconds': price.age_seconds
                }
            return None
        except Exception as e:
            logger.error(f"Error getting DEX price: {e}")
            return None
    
    async def verify_token(self, chain: str, address: str) -> Dict:
        """Verify token legitimacy and add to registry"""
        try:
            token = await self.token_registry.add_token(chain, address, verify=True)
            return {
                'chain_id': token.chain_id,
                'address': token.address,
                'symbol': token.symbol,
                'is_verified': token.is_verified,
                'is_scam': token.is_scam,
                'scam_reason': token.scam_reason,
                'liquidity_usd': token.liquidity_usd,
                'is_tradeable': token.is_tradeable,
                'unique_key': token.unique_key
            }
        except Exception as e:
            logger.error(f"Error verifying token: {e}")
            return {
                'error': str(e),
                'chain_id': chain,
                'address': address,
                'is_verified': False,
                'is_scam': True,
                'scam_reason': f"Verification failed: {e}"
            }
    
    async def resolve_symbol(self, chain: str, symbol: str) -> Optional[Dict]:
        """Resolve symbol to token (with warning about ambiguity)"""
        try:
            token = await self.token_registry.resolve_symbol(chain, symbol)
            if token:
                return {
                    'chain_id': token.chain_id,
                    'address': token.address,
                    'symbol': token.symbol,
                    'is_verified': token.is_verified,
                    'liquidity_usd': token.liquidity_usd,
                    'unique_key': token.unique_key,
                    'warning': "Multiple tokens may share this symbol"
                }
            return None
        except Exception as e:
            logger.error(f"Error resolving symbol: {e}")
            return None
    
    async def compare_dex_prices(self, chain: str, address: str) -> List[Dict]:
        """Compare prices across different DEXes"""
        try:
            prices = await self.dex_client.compare_prices_across_dexes(chain, address)
            return [{
                'dex_id': price.dex_id,
                'price_usd': price.price_usd,
                'liquidity_usd': price.liquidity_usd,
                'volume_24h': price.volume_24h,
                'pair_address': price.pair_address
            } for price in prices]
        except Exception as e:
            logger.error(f"Error comparing DEX prices: {e}")
            return []
    
    async def search_tokens(self, query: str) -> List[Dict]:
        """Search for tokens across all chains"""
        try:
            results = await self.dex_client.search_tokens(query)
            return [{
                'chain_id': token['chain_id'],
                'address': token['address'],
                'symbol': token['symbol'],
                'name': token['name'],
                'total_liquidity': token['total_liquidity'],
                'pairs_count': token['pairs_count'],
                'unique_key': token['unique_key']
            } for token in results]
        except Exception as e:
            logger.error(f"Error searching tokens: {e}")
            return []

# Global instance for easy access
integration_bridge = PythonIntegrationBridge()

async def main():
    """Main function for testing the integration"""
    await integration_bridge.initialize()
    
    # Test the integration
    try:
        # Test USDC on Ethereum
        usdc_price = await integration_bridge.get_dex_price("ethereum", "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48")
        if usdc_price:
            print(f"USDC Price: ${usdc_price['price_usd']:.4f}")
            print(f"Liquidity: ${usdc_price['liquidity_usd']:,.0f}")
        
        # Test token verification
        usdc_verification = await integration_bridge.verify_token("ethereum", "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48")
        print(f"USDC Verified: {usdc_verification['is_verified']}")
        
    finally:
        await integration_bridge.shutdown()

if __name__ == "__main__":
    asyncio.run(main())
