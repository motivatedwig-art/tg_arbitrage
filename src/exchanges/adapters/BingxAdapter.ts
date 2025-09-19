import ccxt from 'ccxt';
import { BaseExchangeAdapter } from './BaseExchangeAdapter.js';
import { ExchangeConfig } from '../types/index.js';

export class BingxAdapter extends BaseExchangeAdapter {
  constructor(config: ExchangeConfig) {
    super(config);
  }

  protected createExchange(): any {
    return new ccxt.bingx({
      apiKey: this.config.apiKey,
      secret: this.config.apiSecret,
      sandbox: this.config.sandbox || false,
      rateLimit: this.config.rateLimit || 100,
      enableRateLimit: this.config.enableRateLimit !== false,
      options: {
        defaultType: 'spot'
      }
    });
  }
}
