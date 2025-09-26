import type { VercelRequest, VercelResponse } from '@vercel/node';

interface Diagnostics {
  environment: {
    NODE_ENV: string | undefined;
    VERCEL_ENV: string | undefined;
    USE_MOCK_DATA: string | undefined;
  };
  apiKeys: {
    telegram: boolean;
    binance: boolean;
    okx: boolean;
    bybit: boolean;
    bitget: boolean;
    mexc: boolean;
    bingx: boolean;
    gateio: boolean;
    kucoin: boolean;
  };
  timestamp: string;
  binanceApiReachable?: boolean;
  binanceTestTicker?: any;
  apiTestError?: string;
}

export default async function handler(_req: VercelRequest, res: VercelResponse) {
  const diagnostics: Diagnostics = {
    environment: {
      NODE_ENV: process.env.NODE_ENV,
      VERCEL_ENV: process.env.VERCEL_ENV,
      USE_MOCK_DATA: process.env.USE_MOCK_DATA,
    },
    apiKeys: {
      telegram: !!process.env.TELEGRAM_BOT_TOKEN,
      binance: !!process.env.BINANCE_API_KEY,
      okx: !!process.env.OKX_API_KEY,
      bybit: !!process.env.BYBIT_API_KEY,
      bitget: !!process.env.BITGET_API_KEY,
      mexc: !!process.env.MEXC_API_KEY,
      bingx: !!process.env.BINGX_API_KEY,
      gateio: !!process.env.GATE_IO_API_KEY,
      kucoin: !!process.env.KUCOIN_API_KEY,
    },
    timestamp: new Date().toISOString(),
  };

  // Test Binance public API
  try {
    const response = await fetch('https://api.binance.com/api/v3/ping');
    diagnostics.binanceApiReachable = response.ok;
    
    // Try to fetch actual ticker data
    const tickerResponse = await fetch('https://api.binance.com/api/v3/ticker/price?symbol=BTCUSDT');
    const tickerData = await tickerResponse.json();
    diagnostics.binanceTestTicker = tickerData;
  } catch (error) {
    diagnostics.apiTestError = error instanceof Error ? error.message : String(error);
  }

  res.status(200).json(diagnostics);
}
