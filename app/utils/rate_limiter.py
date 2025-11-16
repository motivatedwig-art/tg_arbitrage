"""
Rate limiter for API calls
"""
import asyncio
import time
from typing import Dict
from collections import defaultdict


class TokenBucketRateLimiter:
    """
    Token bucket rate limiter for API calls
    """
    def __init__(self, requests_per_minute: int = 10):
        self.capacity = requests_per_minute
        self.tokens = requests_per_minute
        self.last_update = time.time()
        self.lock = asyncio.Lock()
    
    async def acquire(self):
        """Wait if necessary and consume one token"""
        async with self.lock:
            now = time.time()
            elapsed = now - self.last_update
            
            # Refill tokens based on time passed
            refill = elapsed * (self.capacity / 60)
            self.tokens = min(self.capacity, self.tokens + refill)
            self.last_update = now
            
            if self.tokens < 1:
                # Calculate wait time
                wait_time = (1 - self.tokens) * 60 / self.capacity
                await asyncio.sleep(wait_time)
                self.tokens = 0
            else:
                self.tokens -= 1


class RateLimiterManager:
    """
    Manages rate limiters for multiple APIs
    """
    def __init__(self):
        self.limiters: Dict[str, TokenBucketRateLimiter] = {}
        self.default_rpm = 10
    
    def get_limiter(self, api_name: str, requests_per_minute: int = None) -> TokenBucketRateLimiter:
        """Get or create rate limiter for API"""
        if api_name not in self.limiters:
            rpm = requests_per_minute or self.default_rpm
            self.limiters[api_name] = TokenBucketRateLimiter(rpm)
        return self.limiters[api_name]
    
    async def acquire(self, api_name: str):
        """Acquire rate limit token for API"""
        limiter = self.get_limiter(api_name)
        await limiter.acquire()

