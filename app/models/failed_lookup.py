"""
SQLAlchemy model for failed_contract_lookups table
"""
from datetime import datetime
from sqlalchemy import Column, Integer, String, Text, DateTime, Index
from sqlalchemy.sql import func
from app.database import Base


class FailedContractLookup(Base):
    """
    Model for tracking failed contract address lookups
    """
    __tablename__ = 'failed_contract_lookups'

    id = Column(Integer, primary_key=True, autoincrement=True)
    token_symbol = Column(String(20), nullable=False, index=True)
    blockchain = Column(String(50), nullable=False, index=True)
    error_message = Column(Text)
    failed_at = Column(DateTime, default=func.now(), nullable=False)
    retry_count = Column(Integer, default=0)

    # Unique constraint on (token_symbol, blockchain)
    __table_args__ = (
        Index('idx_failed_lookups', 'token_symbol', 'blockchain'),
        {'extend_existing': True}
    )

    def __repr__(self):
        return f"<FailedContractLookup(symbol={self.token_symbol}, blockchain={self.blockchain}, retries={self.retry_count})>"

    def to_dict(self) -> dict:
        """Convert model to dictionary"""
        return {
            'id': self.id,
            'symbol': self.token_symbol,
            'blockchain': self.blockchain,
            'error_message': self.error_message,
            'failed_at': self.failed_at.isoformat() if self.failed_at else None,
            'retry_count': self.retry_count
        }

