import asyncio
import time
from typing import Dict, List, Optional, Set, TYPE_CHECKING
from dataclasses import dataclass
import logging

if TYPE_CHECKING:
    from utils.dexscreener import TokenPrice


logger = logging.getLogger(__name__)


@dataclass
class VerifiedToken:
    """Token with verification status"""
    chain_id: str
    address: str
    symbol: str
    name: str
    decimals: int
    liquidity_usd: float
    holder_count: int
    is_verified: bool
    is_scam: bool
    scam_reason: Optional[str]
    unique_key: str  # "chain:address"
    added_timestamp: float
    
    @property
    def is_tradeable(self) -> bool:
        """Check if token is safe to trade"""
        return (
            self.is_verified and 
            not self.is_scam and 
            self.liquidity_usd >= 100_000
        )


class TokenRegistry:
    """
    Registry for managing tokens with proper identification
    
    Key principles:
    - NEVER identify tokens by symbol alone
    - Always use chain:address as unique identifier
    - Verify legitimacy before adding to registry
    - Track scam tokens to warn users
    """
    
    def __init__(self, dex_client):
        self.dex_client = dex_client
        
        # Primary index: chain:address -> token data
        self.tokens_by_key: Dict[str, VerifiedToken] = {}
        
        # Secondary index: chain:symbol -> [addresses]
        # Multiple tokens can have same symbol!
        self.addresses_by_symbol: Dict[str, List[str]] = {}
        
        # Scam registry
        self.scam_tokens: Set[str] = set()
        
        # Known legitimate tokens (manually curated)
        self.whitelist = {
            "ethereum:0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48": "USDC",
            "ethereum:0xdac17f958d2ee523a2206206994597c13d831ec7": "USDT",
            "ethereum:0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2": "WETH",
            "bsc:0x55d398326f99059ff775485246999027b3197955": "USDT",
            "bsc:0x8ac76a51cc950d9822d68b83fe1ad97b32cd580d": "USDC",
        }
    
    def make_key(self, chain_id: str, address: str) -> str:
        """Create unique identifier"""
        return f"{chain_id.lower()}:{address.lower()}"
    
    async def add_token(
        self, 
        chain_id: str, 
        address: str,
        verify: bool = True
    ) -> VerifiedToken:
        """
        Add token to registry with verification
        
        Args:
            chain_id: Normalized chain identifier
            address: Contract address
            verify: Whether to verify legitimacy
            
        Returns:
            VerifiedToken object
            
        Raises:
            ScamTokenError if token fails verification
        """
        key = self.make_key(chain_id, address)
        
        # Check if already registered
        if key in self.tokens_by_key:
            return self.tokens_by_key[key]
        
        # Check scam list
        if key in self.scam_tokens:
            raise ScamTokenError(f"Token {key} is marked as scam")
        
        # Fetch token data from DexScreener
        token_data = await self.dex_client.get_token_price(chain_id, address)
        
        if not token_data:
            raise NoDataError(f"No data found for {key}")
        
        # Verify if requested
        is_verified = False
        is_scam = False
        scam_reason = None
        
        if verify:
            verification = await self._verify_token(chain_id, address, token_data)
            is_verified = verification['is_verified']
            is_scam = verification['is_scam']
            scam_reason = verification['scam_reason']
        
        # Check whitelist
        if key in self.whitelist:
            is_verified = True
            is_scam = False
        
        # Create token object
        token = VerifiedToken(
            chain_id=chain_id,
            address=address.lower(),
            symbol=token_data.symbol,
            name=token_data.name,
            decimals=18,  # Default, would need chain-specific lookup
            liquidity_usd=token_data.liquidity_usd,
            holder_count=0,  # Would need blockchain query
            is_verified=is_verified,
            is_scam=is_scam,
            scam_reason=scam_reason,
            unique_key=key,
            added_timestamp=time.time()
        )
        
        # Add to registries
        if is_scam:
            self.scam_tokens.add(key)
            logger.warning(f"Scam token detected: {key} - {scam_reason}")
        else:
            self.tokens_by_key[key] = token
            
            # Update symbol index
            symbol_key = f"{chain_id}:{token.symbol.upper()}"
            if symbol_key not in self.addresses_by_symbol:
                self.addresses_by_symbol[symbol_key] = []
            self.addresses_by_symbol[symbol_key].append(address.lower())
        
        return token
    
    async def _verify_token(
        self,
        chain_id: str,
        address: str,
        token_data: 'TokenPrice'
    ) -> dict:
        """
        Multi-factor token verification
        
        Returns:
            Dictionary with verification results
        """
        checks_passed = 0
        checks_total = 5
        scam_indicators = []
        
        # Check 1: Minimum liquidity
        if token_data.liquidity_usd >= 100_000:
            checks_passed += 1
        else:
            scam_indicators.append(f"Low liquidity: ${token_data.liquidity_usd:,.0f}")
        
        # Check 2: Trading volume
        if token_data.volume_24h >= 10_000:
            checks_passed += 1
        else:
            scam_indicators.append(f"Low volume: ${token_data.volume_24h:,.0f}")
        
        # Check 3: Not a honeypot pattern (massive one-way volume)
        if token_data.volume_24h > 0:
            liquidity_to_volume_ratio = token_data.liquidity_usd / token_data.volume_24h
            if 0.1 < liquidity_to_volume_ratio < 100:  # Normal range
                checks_passed += 1
            else:
                scam_indicators.append("Abnormal liquidity/volume ratio")
        
        # Check 4: Price not suspiciously high or low
        if 0.000001 < token_data.price_usd < 1_000_000:
            checks_passed += 1
        else:
            scam_indicators.append(f"Suspicious price: ${token_data.price_usd}")
        
        # Check 5: Has been trading for some time (pairs exist)
        if token_data.dex_id != 'unknown':
            checks_passed += 1
        else:
            scam_indicators.append("No DEX pairs found")
        
        # Determine verification status
        is_verified = checks_passed >= 4
        is_scam = checks_passed <= 2
        
        logger.info(
            f"Token verification for {chain_id}:{address}: "
            f"{checks_passed}/{checks_total} checks passed"
        )
        
        return {
            'is_verified': is_verified,
            'is_scam': is_scam,
            'scam_reason': ', '.join(scam_indicators) if scam_indicators else None,
            'checks_passed': checks_passed,
            'checks_total': checks_total
        }
    
    async def resolve_symbol(
        self,
        chain_id: str,
        symbol: str
    ) -> Optional[VerifiedToken]:
        """
        Resolve symbol to most likely token (highest liquidity)
        
        CRITICAL: This is a guess! Multiple tokens can have same symbol.
        Always confirm with user when ambiguous.
        """
        symbol_key = f"{chain_id}:{symbol.upper()}"
        addresses = self.addresses_by_symbol.get(symbol_key, [])
        
        if not addresses:
            logger.warning(f"No tokens found for symbol {symbol} on {chain_id}")
            return None
        
        if len(addresses) > 1:
            logger.warning(
                f"Multiple tokens for {symbol} on {chain_id}: {addresses}"
            )
        
        # Return highest liquidity token
        tokens = [
            self.tokens_by_key[self.make_key(chain_id, addr)]
            for addr in addresses
            if self.make_key(chain_id, addr) in self.tokens_by_key
        ]
        
        if not tokens:
            return None
        
        # Sort by liquidity
        tokens.sort(key=lambda t: t.liquidity_usd, reverse=True)
        
        best_token = tokens[0]
        
        logger.info(
            f"Resolved {symbol} on {chain_id} to {best_token.address} "
            f"(liquidity: ${best_token.liquidity_usd:,.0f})"
        )
        
        return best_token
    
    def get_token(self, chain_id: str, address: str) -> Optional[VerifiedToken]:
        """Get token by exact address"""
        key = self.make_key(chain_id, address)
        return self.tokens_by_key.get(key)
    
    def is_scam(self, chain_id: str, address: str) -> bool:
        """Check if token is known scam"""
        key = self.make_key(chain_id, address)
        return key in self.scam_tokens


class ScamTokenError(Exception):
    """Raised when token is identified as scam"""
    pass


class NoDataError(Exception):
    """Raised when no data available for token"""
    pass

