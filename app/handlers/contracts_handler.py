"""
Telegram bot handler for contract address commands
"""
import asyncio
import logging
from typing import Optional
from datetime import datetime, timedelta
from sqlalchemy.orm import Session

from app.services.contract_resolver import ContractResolver

logger = logging.getLogger(__name__)


class ContractsHandler:
    """
    Handler for /contracts and /api_stats Telegram commands
    """
    
    # Russian translations
    MESSAGES_RU = {
        'contracts_title': '🔍 Адреса контрактов для {pair} на {blockchain}',
        'token_info': '📌 {name} ({symbol})',
        'contract_address': 'Контракт: {address}',
        'native_token': 'Нативный токен (без контракта)',
        'decimals': 'Десятичные знаки: {decimals}',
        'cached': '✅ Кэшировано',
        'last_verified': 'Последняя проверка: {time}',
        'error_not_found': '❌ Не удалось найти контракт для {symbol} на {blockchain}',
        'error_invalid_pair': '❌ Неверный формат пары. Используйте: BASE/QUOTE (например, USDT/ETH)',
        'api_stats_title': '📊 Статистика API (за последние {hours} часов)',
        'total_calls': 'Всего вызовов: {count}',
        'successful_calls': '✅ Успешных: {count}',
        'failed_calls': '❌ Неудачных: {count}',
        'cache_hit_rate': '📈 Процент попаданий в кэш: {rate}%',
        'cache_hits': 'Кэш попаданий: {count}',
        'cache_misses': 'Кэш промахов: {count}',
        'api_calls_saved': '💰 Сэкономлено API вызовов: {count}',
        'avg_response_time': '⚡ Среднее время ответа: {time}ms',
        'by_api': 'По API:',
        'api_stats': '{api}: {success}/{total} успешных, {avg_time}ms',
        'error_generic': '❌ Произошла ошибка. Попробуйте позже.'
    }
    
    # English translations
    MESSAGES_EN = {
        'contracts_title': '🔍 Contract Addresses for {pair} on {blockchain}',
        'token_info': '📌 {name} ({symbol})',
        'contract_address': 'Contract: {address}',
        'native_token': 'Native token (no contract)',
        'decimals': 'Decimals: {decimals}',
        'cached': '✅ Cached',
        'last_verified': 'Last verified: {time}',
        'error_not_found': '❌ Could not find contract for {symbol} on {blockchain}',
        'error_invalid_pair': '❌ Invalid pair format. Use: BASE/QUOTE (e.g., USDT/ETH)',
        'api_stats_title': '📊 API Statistics (last {hours} hours)',
        'total_calls': 'Total calls: {count}',
        'successful_calls': '✅ Successful: {count}',
        'failed_calls': '❌ Failed: {count}',
        'cache_hit_rate': '📈 Cache hit rate: {rate}%',
        'cache_hits': 'Cache hits: {count}',
        'cache_misses': 'Cache misses: {count}',
        'api_calls_saved': '💰 API calls saved: {count}',
        'avg_response_time': '⚡ Avg response time: {time}ms',
        'by_api': 'By API:',
        'api_stats': '{api}: {success}/{total} successful, {avg_time}ms',
        'error_generic': '❌ An error occurred. Please try again later.'
    }
    
    def __init__(self, db_session: Session, language: str = 'ru'):
        self.resolver = ContractResolver(db_session)
        self.language = language
        self.messages = self.MESSAGES_RU if language == 'ru' else self.MESSAGES_EN
    
    def set_language(self, language: str):
        """Set handler language"""
        self.language = language
        self.messages = self.MESSAGES_RU if language == 'ru' else self.MESSAGES_EN
    
    async def handle_contracts_command(
        self,
        pair: str,
        blockchain: str = 'ethereum'
    ) -> str:
        """
        Handle /contracts command
        
        Args:
            pair: Trading pair (e.g., "USDT/ETH")
            blockchain: Blockchain name (default: ethereum)
            
        Returns:
            Formatted message string
        """
        try:
            # Get pair contracts
            pair_data = await self.resolver.get_pair_contracts(pair, blockchain)
            
            # Format message
            lines = [
                self.messages['contracts_title'].format(
                    pair=pair,
                    blockchain=blockchain.capitalize()
                ),
                ''
            ]
            
            # Base token
            base = pair_data['base_token']
            lines.append(self.messages['token_info'].format(
                name=base.get('name', base['symbol']),
                symbol=base['symbol']
            ))
            
            if base.get('contract'):
                lines.append(self.messages['contract_address'].format(
                    address=base['contract']
                ))
                if base.get('decimals'):
                    lines.append(self.messages['decimals'].format(
                        decimals=base['decimals']
                    ))
            else:
                lines.append(self.messages['native_token'])
            
            lines.append('')
            
            # Quote token
            quote = pair_data['quote_token']
            lines.append(self.messages['token_info'].format(
                name=quote.get('name', quote['symbol']),
                symbol=quote['symbol']
            ))
            
            if quote.get('contract'):
                lines.append(self.messages['contract_address'].format(
                    address=quote['contract']
                ))
                if quote.get('decimals'):
                    lines.append(self.messages['decimals'].format(
                        decimals=quote['decimals']
                    ))
            else:
                lines.append(self.messages['native_token'])
            
            lines.append('')
            
            # Cache status
            if base.get('source') == 'cache' or quote.get('source') == 'cache':
                lines.append(self.messages['cached'])
                # Try to get last verified time from cache
                # This would require querying the database, simplified for now
                lines.append(self.messages['last_verified'].format(
                    time='недавно' if self.language == 'ru' else 'recently'
                ))
            
            return '\n'.join(lines)
            
        except ValueError as e:
            if 'Invalid pair format' in str(e):
                return self.messages['error_invalid_pair']
            return self.messages['error_not_found'].format(
                symbol=pair.split('/')[0] if '/' in pair else pair,
                blockchain=blockchain
            )
        except Exception as e:
            logger.error(f"Error handling contracts command: {e}")
            return self.messages['error_generic']
    
    async def handle_api_stats_command(self, hours: int = 24) -> str:
        """
        Handle /api_stats command
        
        Args:
            hours: Number of hours to look back
            
        Returns:
            Formatted message string
        """
        try:
            stats = await self.resolver.get_api_stats(hours)
            
            lines = [
                self.messages['api_stats_title'].format(hours=hours),
                '',
                self.messages['total_calls'].format(count=stats['total_calls']),
                self.messages['successful_calls'].format(count=stats['successful_calls']),
                self.messages['failed_calls'].format(count=stats['failed_calls']),
                '',
                self.messages['cache_hit_rate'].format(rate=stats['cache_hit_rate']),
                self.messages['cache_hits'].format(count=stats.get('cache_hits', 0)),
                self.messages['cache_misses'].format(count=stats.get('cache_misses', 0)),
                self.messages['api_calls_saved'].format(count=stats.get('api_calls_saved', 0)),
                ''
            ]
            
            if stats['avg_response_time_ms'] > 0:
                lines.append(self.messages['avg_response_time'].format(
                    time=stats['avg_response_time_ms']
                ))
                lines.append('')
            
            # By API breakdown
            if stats['by_api']:
                lines.append(self.messages['by_api'])
                for api_name, api_stats in stats['by_api'].items():
                    lines.append(self.messages['api_stats'].format(
                        api=api_name.upper(),
                        success=api_stats['success'],
                        total=api_stats['total'],
                        avg_time=api_stats.get('avg_response_time_ms', 0)
                    ))
            
            return '\n'.join(lines)
            
        except Exception as e:
            logger.error(f"Error handling api_stats command: {e}")
            return self.messages['error_generic']


# Integration function for TypeScript bot
async def handle_contracts_command_async(
    db_session: Session,
    pair: str,
    blockchain: str = 'ethereum',
    language: str = 'ru'
) -> str:
    """
    Async function to handle contracts command
    Can be called from TypeScript bot via Python bridge
    """
    handler = ContractsHandler(db_session, language)
    return await handler.handle_contracts_command(pair, blockchain)


async def handle_api_stats_command_async(
    db_session: Session,
    hours: int = 24,
    language: str = 'ru'
) -> str:
    """
    Async function to handle api_stats command
    Can be called from TypeScript bot via Python bridge
    """
    handler = ContractsHandler(db_session, language)
    return await handler.handle_api_stats_command(hours)

