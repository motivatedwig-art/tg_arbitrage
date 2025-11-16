"""
SQLAlchemy model for pair_contracts table
"""
from datetime import datetime
from typing import Optional
from sqlalchemy import Column, Integer, String, Numeric, DateTime, ForeignKey, Index
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base


class PairContract(Base):
    """
    Model representing a trading pair with contract addresses
    """
    __tablename__ = 'pair_contracts'

    id = Column(Integer, primary_key=True, autoincrement=True)
    pair_symbol = Column(String(50), nullable=False, index=True)
    base_token_id = Column(Integer, ForeignKey('contract_addresses.id', ondelete='CASCADE'), nullable=True)
    quote_token_id = Column(Integer, ForeignKey('contract_addresses.id', ondelete='CASCADE'), nullable=True)
    blockchain = Column(String(50), nullable=False, index=True)
    dex_name = Column(String(50))
    liquidity_usd = Column(Numeric(20, 2))
    created_at = Column(DateTime, default=func.now(), nullable=False)
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now(), nullable=False)

    # Relationships
    base_token = relationship('ContractAddress', foreign_keys=[base_token_id], backref='base_pairs')
    quote_token = relationship('ContractAddress', foreign_keys=[quote_token_id], backref='quote_pairs')

    # Unique constraint on (pair_symbol, blockchain, dex_name)
    __table_args__ = (
        Index('idx_pair_symbol', 'pair_symbol'),
        Index('idx_pair_blockchain', 'blockchain'),
        Index('idx_base_token_id', 'base_token_id'),
        Index('idx_quote_token_id', 'quote_token_id'),
        {'extend_existing': True}
    )

    def __repr__(self):
        return f"<PairContract(pair={self.pair_symbol}, blockchain={self.blockchain}, dex={self.dex_name})>"

    def to_dict(self) -> dict:
        """Convert model to dictionary"""
        return {
            'id': self.id,
            'pair': self.pair_symbol,
            'base_token_id': self.base_token_id,
            'quote_token_id': self.quote_token_id,
            'blockchain': self.blockchain,
            'dex_name': self.dex_name,
            'liquidity_usd': float(self.liquidity_usd) if self.liquidity_usd else None,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }

