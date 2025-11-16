"""
SQLAlchemy model for api_call_logs table
"""
from datetime import datetime
from sqlalchemy import Column, Integer, String, Boolean, Text, DateTime, Index
from sqlalchemy.sql import func
from app.database import Base


class ApiCallLog(Base):
    """
    Model for tracking API calls and usage
    """
    __tablename__ = 'api_call_logs'

    id = Column(Integer, primary_key=True, autoincrement=True)
    api_name = Column(String(50), nullable=False, index=True)
    endpoint = Column(String(200))
    status_code = Column(Integer)
    success = Column(Boolean, default=False, index=True)
    response_time_ms = Column(Integer)
    called_at = Column(DateTime, default=func.now(), nullable=False, index=True)
    error_message = Column(Text)

    # Indexes
    __table_args__ = (
        Index('idx_api_name', 'api_name'),
        Index('idx_called_at', 'called_at'),
        Index('idx_api_success', 'success', 'called_at'),
        {'extend_existing': True}
    )

    def __repr__(self):
        return f"<ApiCallLog(api={self.api_name}, success={self.success}, time={self.response_time_ms}ms)>"

    def to_dict(self) -> dict:
        """Convert model to dictionary"""
        return {
            'id': self.id,
            'api_name': self.api_name,
            'endpoint': self.endpoint,
            'status_code': self.status_code,
            'success': self.success,
            'response_time_ms': self.response_time_ms,
            'called_at': self.called_at.isoformat() if self.called_at else None,
            'error_message': self.error_message
        }

