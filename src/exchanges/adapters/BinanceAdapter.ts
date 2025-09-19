import ccxt from 'ccxt';
import { BaseExchangeAdapter } from './BaseExchangeAdapter.js';
import { ExchangeConfig } from '../types/index.js';

export class BinanceAdapter extends BaseExchangeAdapter {
  constructor(config: ExchangeConfig) {
    super(config);
  }

  protected createExchange(): any {
    return new ccxt.binance({
      apiKey: this.config.apiKey,
      secret: this.config.apiSecret,
      sandbox: this.config.sandbox || false,
      rateLimit: this.config.rateLimit || 1200,
      enableRateLimit: this.config.enableRateLimit !== false,
      options: {
        defaultType: 'spot', // Use spot trading instead of futures
        adjustForTimeDifference: true // Handle time sync issues
      }
    });
  }
}
