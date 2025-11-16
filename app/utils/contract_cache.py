"""
Caching utilities for contract addresses
"""
import time
from typing import Optional, Dict, Any
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from app.models.contract_address import ContractAddress
from app.models.api_call_log import ApiCallLog


class ContractCache:
    """
    Database-backed cache for contract addresses
    """
    def __init__(self, db_session: Session, cache_ttl_seconds: int = 86400):
        self.db = db_session
        self.cache_ttl = cache_ttl_seconds
    
    def get_cached_contract(
        self, 
        token_symbol: str, 
        blockchain: str
    ) -> Optional[ContractAddress]:
        """
        Get cached contract address if valid
        
        Args:
            token_symbol: Token symbol
            blockchain: Blockchain name
            
        Returns:
            ContractAddress if found and valid, None otherwise
        """
        try:
            contract = self.db.query(ContractAddress).filter(
                ContractAddress.token_symbol == token_symbol.upper(),
                ContractAddress.blockchain == blockchain.lower()
            ).first()
            
            if contract and contract.is_cache_valid(self.cache_ttl):
                return contract
            
            return None
        except Exception as e:
            print(f"Error getting cached contract: {e}")
            return None
    
    def save_contract(
        self, 
        contract_data: Dict[str, Any]
    ) -> ContractAddress:
        """
        Save or update contract address in cache
        
        Args:
            contract_data: Dictionary with contract information
            
        Returns:
            ContractAddress instance
        """
        try:
            # Check if exists
            contract = self.db.query(ContractAddress).filter(
                ContractAddress.token_symbol == contract_data['symbol'].upper(),
                ContractAddress.blockchain == contract_data['blockchain'].lower(),
                ContractAddress.contract_address == contract_data['contract'].lower()
            ).first()
            
            if contract:
                # Update existing
                contract.token_name = contract_data.get('name', contract.token_name)
                contract.decimals = contract_data.get('decimals', contract.decimals)
                contract.verified = contract_data.get('verified', contract.verified)
                contract.last_verified_at = datetime.utcnow()
            else:
                # Create new
                contract = ContractAddress(
                    token_symbol=contract_data['symbol'].upper(),
                    token_name=contract_data.get('name'),
                    contract_address=contract_data['contract'].lower(),
                    blockchain=contract_data['blockchain'].lower(),
                    decimals=contract_data.get('decimals'),
                    verified=contract_data.get('verified', False),
                    last_verified_at=datetime.utcnow()
                )
                self.db.add(contract)
            
            self.db.commit()
            return contract
            
        except Exception as e:
            self.db.rollback()
            print(f"Error saving contract: {e}")
            raise
    
    def log_api_call(
        self,
        api_name: str,
        endpoint: str,
        success: bool,
        response_time_ms: int,
        status_code: Optional[int] = None,
        error_message: Optional[str] = None
    ):
        """
        Log API call for metrics tracking
        
        Args:
            api_name: Name of the API
            endpoint: API endpoint called
            success: Whether call was successful
            response_time_ms: Response time in milliseconds
            status_code: HTTP status code
            error_message: Error message if failed
        """
        try:
            log_entry = ApiCallLog(
                api_name=api_name,
                endpoint=endpoint,
                status_code=status_code,
                success=success,
                response_time_ms=response_time_ms,
                error_message=error_message
            )
            self.db.add(log_entry)
            self.db.commit()
        except Exception as e:
            self.db.rollback()
            print(f"Error logging API call: {e}")

