"""
Test script for DexScreener client and Token Registry

This demonstrates proper usage of the two foundational components.
"""

import asyncio
import logging
from utils.dexscreener import DexScreenerClient, InvalidChainError, NoLiquidityError
from models.token_registry import TokenRegistry, ScamTokenError, NoDataError

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)


async def test_chain_normalization():
    """Test chain ID normalization"""
    print("\n=== Testing Chain Normalization ===")
    
    async with DexScreenerClient() as client:
        test_cases = [
            ('ETH', 'ethereum'),
            ('Ethereum', 'ethereum'),
            ('ethereum', 'ethereum'),
            ('BSC', 'bsc'),
            ('bnb', 'bsc'),
            ('MATIC', 'polygon'),
            ('poly', 'polygon'),
        ]
        
        for input_chain, expected in test_cases:
            try:
                normalized = client.normalize_chain_id(input_chain)
                status = "✅" if normalized == expected else "❌"
                print(f"{status} '{input_chain}' -> '{normalized}' (expected: '{expected}')")
            except InvalidChainError as e:
                print(f"❌ '{input_chain}' -> Error: {e}")


async def test_token_lookup():
    """Test token price lookup with proper chain context"""
    print("\n=== Testing Token Lookup ===")
    
    async with DexScreenerClient() as client:
        # USDC on Ethereum
        usdc_eth = "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48"
        
        try:
            price = await client.get_token_price("ethereum", usdc_eth)
            if price:
                print(f"✅ USDC on Ethereum:")
                print(f"   Symbol: {price.symbol}")
                print(f"   Chain: {price.chain_id}")
                print(f"   Address: {price.contract_address}")
                print(f"   Price: ${price.price_usd:.4f}")
                print(f"   Liquidity: ${price.liquidity_usd:,.0f}")
                print(f"   Unique Key: {price.unique_key}")
        except Exception as e:
            print(f"❌ Error: {e}")


async def test_token_registry():
    """Test token registry with verification"""
    print("\n=== Testing Token Registry ===")
    
    async with DexScreenerClient() as client:
        registry = TokenRegistry(client)
        
        # Test adding a legitimate token
        usdc_eth = "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48"
        
        try:
            token = await registry.add_token("ethereum", usdc_eth, verify=True)
            print(f"✅ Added token to registry:")
            print(f"   Symbol: {token.symbol}")
            print(f"   Chain: {token.chain_id}")
            print(f"   Address: {token.address}")
            print(f"   Verified: {token.is_verified}")
            print(f"   Is Scam: {token.is_scam}")
            print(f"   Tradeable: {token.is_tradeable}")
            print(f"   Unique Key: {token.unique_key}")
        except ScamTokenError as e:
            print(f"❌ Scam token detected: {e}")
        except NoDataError as e:
            print(f"❌ No data: {e}")
        except Exception as e:
            print(f"❌ Error: {e}")


async def test_cross_chain_identification():
    """Test that tokens are properly identified by chain:address"""
    print("\n=== Testing Cross-Chain Identification ===")
    
    async with DexScreenerClient() as client:
        registry = TokenRegistry(client)
        
        # USDT exists on multiple chains
        usdt_eth = "0xdAC17F958D2ee523a2206206994597C13D831ec7"  # Ethereum
        usdt_bsc = "0x55d398326f99059fF775485246999027B3197955"  # BSC
        
        try:
            token_eth = await registry.add_token("ethereum", usdt_eth, verify=False)
            token_bsc = await registry.add_token("bsc", usdt_bsc, verify=False)
            
            print(f"✅ Ethereum USDT:")
            print(f"   Key: {token_eth.unique_key}")
            print(f"   Address: {token_eth.address}")
            
            print(f"✅ BSC USDT:")
            print(f"   Key: {token_bsc.unique_key}")
            print(f"   Address: {token_bsc.address}")
            
            # Verify they are different
            if token_eth.unique_key != token_bsc.unique_key:
                print("✅ Tokens correctly identified as different (different chains)")
            else:
                print("❌ Tokens incorrectly identified as same")
                
        except Exception as e:
            print(f"❌ Error: {e}")


async def test_metrics():
    """Test client metrics"""
    print("\n=== Testing Metrics ===")
    
    async with DexScreenerClient() as client:
        # Make some requests
        usdc_eth = "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48"
        
        try:
            await client.get_token_price("ethereum", usdc_eth)
            await client.get_token_price("ethereum", usdc_eth)  # Should hit cache
            
            metrics = client.get_metrics()
            print(f"✅ Metrics:")
            print(f"   Success: {metrics['requests_success']}")
            print(f"   Failed: {metrics['requests_failed']}")
            print(f"   Cache Hits: {metrics['cache_hits']}")
            print(f"   Cache Misses: {metrics['cache_misses']}")
            print(f"   Cache Size: {metrics['cache_size']}")
            print(f"   Circuit Breaker: {metrics['circuit_breaker_state']}")
        except Exception as e:
            print(f"❌ Error: {e}")


async def main():
    """Run all tests"""
    print("=" * 60)
    print("DexScreener Client & Token Registry Test Suite")
    print("=" * 60)
    
    await test_chain_normalization()
    await test_token_lookup()
    await test_token_registry()
    await test_cross_chain_identification()
    await test_metrics()
    
    print("\n" + "=" * 60)
    print("Tests completed!")
    print("=" * 60)


if __name__ == "__main__":
    asyncio.run(main())



