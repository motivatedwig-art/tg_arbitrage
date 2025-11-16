"""
Integration bridge for calling Python contract resolver from TypeScript/Node.js
This can be used via subprocess or HTTP API
"""
import asyncio
import json
import sys
import os
from typing import Dict, Any, Optional
from sqlalchemy.orm import Session

from app.database import db_session
from app.handlers.contracts_handler import (
    handle_contracts_command_async,
    handle_api_stats_command_async
)


async def handle_contracts_request(
    pair: str,
    blockchain: str = 'ethereum',
    language: str = 'ru'
) -> Dict[str, Any]:
    """
    Handle contracts request (can be called from external processes)
    
    Args:
        pair: Trading pair (e.g., "USDT/ETH")
        blockchain: Blockchain name
        language: Language code ('ru' or 'en')
        
    Returns:
        Dictionary with response
    """
    try:
        with db_session() as session:
            message = await handle_contracts_command_async(
                session,
                pair,
                blockchain,
                language
            )
            return {
                'success': True,
                'message': message
            }
    except Exception as e:
        return {
            'success': False,
            'error': str(e)
        }


async def handle_api_stats_request(
    hours: int = 24,
    language: str = 'ru'
) -> Dict[str, Any]:
    """
    Handle API stats request
    
    Args:
        hours: Number of hours to look back
        language: Language code
        
    Returns:
        Dictionary with response
    """
    try:
        with db_session() as session:
            message = await handle_api_stats_command_async(
                session,
                hours,
                language
            )
            return {
                'success': True,
                'message': message
            }
    except Exception as e:
        return {
            'success': False,
            'error': str(e)
        }


def main():
    """
    CLI interface for calling from Node.js/TypeScript
    Usage: python app/integration_bridge.py contracts USDT/ETH ethereum ru
    """
    if len(sys.argv) < 2:
        print(json.dumps({
            'success': False,
            'error': 'Invalid arguments'
        }))
        sys.exit(1)
    
    command = sys.argv[1]
    
    if command == 'contracts':
        if len(sys.argv) < 3:
            print(json.dumps({
                'success': False,
                'error': 'Missing pair argument'
            }))
            sys.exit(1)
        
        pair = sys.argv[2]
        blockchain = sys.argv[3] if len(sys.argv) > 3 else 'ethereum'
        language = sys.argv[4] if len(sys.argv) > 4 else 'ru'
        
        result = asyncio.run(handle_contracts_request(pair, blockchain, language))
        print(json.dumps(result))
        
    elif command == 'api_stats':
        hours = int(sys.argv[2]) if len(sys.argv) > 2 else 24
        language = sys.argv[3] if len(sys.argv) > 3 else 'ru'
        
        result = asyncio.run(handle_api_stats_request(hours, language))
        print(json.dumps(result))
        
    else:
        print(json.dumps({
            'success': False,
            'error': f'Unknown command: {command}'
        }))
        sys.exit(1)


if __name__ == '__main__':
    main()

