"""
SQLAlchemy model for contract_addresses table
"""
from datetime import datetime
from typing import Optional
from sqlalchemy import Column, Integer, String, Boolean, DateTime, Index
from sqlalchemy.sql import func
from app.database import Base


class ContractAddress(Base):
    """
    Model representing a token contract address on a blockchain
    """
    __tablename__ = 'contract_addresses'

    id = Column(Integer, primary_key=True, autoincrement=True)
    token_symbol = Column(String(20), nullable=False, index=True)
    token_name = Column(String(100))
    contract_address = Column(String(100), nullable=False, index=True)
    blockchain = Column(String(50), nullable=False, index=True)
    decimals = Column(Integer)
    verified = Column(Boolean, default=False)
    created_at = Column(DateTime, default=func.now(), nullable=False)
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now(), nullable=False)
    last_verified_at = Column(DateTime, index=True)

    # Unique constraint on (token_symbol, blockchain, contract_address)
    __table_args__ = (
        Index('idx_token_blockchain', 'token_symbol', 'blockchain'),
        Index('idx_contract_address', 'contract_address'),
        Index('idx_last_verified_at', 'last_verified_at'),
        {'extend_existing': True}
    )

    def __repr__(self):
        return f"<ContractAddress(symbol={self.token_symbol}, blockchain={self.blockchain}, address={self.contract_address[:10]}...)>"

    def to_dict(self) -> dict:
        """Convert model to dictionary"""
        return {
            'id': self.id,
            'symbol': self.token_symbol,
            'name': self.token_name,
            'contract': self.contract_address,
            'blockchain': self.blockchain,
            'decimals': self.decimals,
            'verified': self.verified,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
            'last_verified_at': self.last_verified_at.isoformat() if self.last_verified_at else None
        }

    def is_cache_valid(self, cache_ttl_seconds: int = 86400) -> bool:
        """
        Check if cached data is still valid
        
        Args:
            cache_ttl_seconds: Cache TTL in seconds (default 24 hours)
            
        Returns:
            True if cache is valid, False otherwise
        """
        if not self.last_verified_at:
            return False
        
        age_seconds = (datetime.utcnow() - self.last_verified_at).total_seconds()
        return age_seconds < cache_ttl_seconds

