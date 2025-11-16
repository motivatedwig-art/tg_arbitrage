"""
Example usage of ContractResolver service
"""
import asyncio
import os
from dotenv import load_dotenv
from app.database import db_session
from app.services.contract_resolver import ContractResolver

# Load environment variables
load_dotenv()


async def example_get_contract():
    """Example: Get contract address for a token"""
    with db_session() as session:
        resolver = ContractResolver(session)
        
        # Get USDT contract on Ethereum
        try:
            result = await resolver.get_contract_address('USDT', 'ethereum')
            print("✅ Contract found:")
            print(f"   Symbol: {result['symbol']}")
            print(f"   Contract: {result['contract']}")
            print(f"   Blockchain: {result['blockchain']}")
            print(f"   Source: {result['source']}")
        except Exception as e:
            print(f"❌ Error: {e}")


async def example_get_pair():
    """Example: Get contracts for a trading pair"""
    with db_session() as session:
        resolver = ContractResolver(session)
        
        # Get contracts for USDT/ETH pair
        try:
            result = await resolver.get_pair_contracts('USDT/ETH', 'ethereum')
            print("✅ Pair contracts found:")
            print(f"   Pair: {result['pair']}")
            print(f"   Base token: {result['base_token']['symbol']} - {result['base_token'].get('contract', 'Native')}")
            print(f"   Quote token: {result['quote_token']['symbol']} - {result['quote_token'].get('contract', 'Native')}")
        except Exception as e:
            print(f"❌ Error: {e}")


async def example_get_stats():
    """Example: Get API statistics"""
    with db_session() as session:
        resolver = ContractResolver(session)
        
        # Get stats for last 24 hours
        stats = await resolver.get_api_stats(24)
        print("✅ API Statistics:")
        print(f"   Total calls: {stats['total_calls']}")
        print(f"   Successful: {stats['successful_calls']}")
        print(f"   Failed: {stats['failed_calls']}")
        print(f"   Cache hit rate: {stats['cache_hit_rate']}%")
        print(f"   API calls saved: {stats['api_calls_saved']}")


async def main():
    """Run examples"""
    print("🚀 Contract Resolver Examples\n")
    
    print("1. Getting contract address for USDT on Ethereum...")
    await example_get_contract()
    print()
    
    print("2. Getting contracts for USDT/ETH pair...")
    await example_get_pair()
    print()
    
    print("3. Getting API statistics...")
    await example_get_stats()
    print()
    
    print("✅ Examples completed!")


if __name__ == '__main__':
    asyncio.run(main())

