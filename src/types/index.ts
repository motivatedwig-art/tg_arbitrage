export interface Exchange {
  id: string;
  name: string;
  displayName: string;
  logo: string;
  isSelected: boolean;
  baseUrl: string;
  pairUrlPattern: string; // e.g., "https://binance.com/en/trade/{symbol}"
}

export interface CryptoPair {
  symbol: string;
  baseAsset: string;
  quoteAsset: string;
  displaySymbol: string;
}

export interface ExchangePrice {
  exchangeId: string;
  exchangeName: string;
  price: number;
  volume: number;
  url: string;
  lastUpdated: string;
}

export interface ArbitrageOpportunity {
  pair: CryptoPair;
  prices: ExchangePrice[];
  bestBuy: ExchangePrice;
  bestSell: ExchangePrice;
  spreadPercentage: number;
  spreadAmount: number;
  profitability: 'high' | 'medium' | 'low';
}

export interface ApiResponse {
  opportunities: ArbitrageOpportunity[];
  lastUpdate: string;
  nextUpdate: string;
  meta?: OpportunitiesMeta;
}

export interface ExchangeMeta {
  id: string;
  name: string;
  logo?: string | null;
  pairUrlPattern?: string | null;
}

export interface OpportunitiesMeta {
  exchanges: ExchangeMeta[];
  requestedSymbols: string[];
  returnedSymbols: string[];
  opportunityCount: number;
  generatedAt: string;
}

export interface TelegramUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  language_code?: string;
  is_premium?: boolean;
  photo_url?: string;
}

export interface TelegramThemeParams {
  bg_color?: string;
  text_color?: string;
  hint_color?: string;
  link_color?: string;
  button_color?: string;
  button_text_color?: string;
  secondary_bg_color?: string;
  header_bg_color?: string;
  accent_text_color?: string;
  section_bg_color?: string;
  section_header_text_color?: string;
  subtitle_text_color?: string;
  destructive_text_color?: string;
}

export interface TelegramWebAppInitData {
  query_id?: string;
  user?: TelegramUser;
  receiver?: TelegramUser;
  chat?: any;
  chat_type?: string;
  chat_instance?: string;
  start_param?: string;
  can_send_after?: number;
  auth_date: number;
  hash: string;
}

export interface TelegramWebApp {
  initData: string;
  initDataUnsafe: TelegramWebAppInitData;
  version: string;
  platform: string;
  colorScheme: 'light' | 'dark';
  themeParams: TelegramThemeParams;
  isExpanded: boolean;
  viewportHeight: number;
  viewportStableHeight: number;
  headerColor: string;
  backgroundColor: string;
  isClosingConfirmationEnabled: boolean;
  
  // Methods
  ready(): void;
  expand(): void;
  close(): void;
  setHeaderColor(color: string): void;
  setBackgroundColor(color: string): void;
  enableClosingConfirmation(): void;
  disableClosingConfirmation(): void;
  
  // Events
  onEvent(eventType: string, eventHandler: () => void): void;
  offEvent(eventType: string, eventHandler: () => void): void;
  
  // Haptic feedback
  HapticFeedback: {
    impactOccurred(style: 'light' | 'medium' | 'heavy' | 'rigid' | 'soft'): void;
    notificationOccurred(type: 'error' | 'success' | 'warning'): void;
    selectionChanged(): void;
  };
  
  // Main button
  MainButton: {
    text: string;
    color: string;
    textColor: string;
    isVisible: boolean;
    isActive: boolean;
    isProgressVisible: boolean;
    setText(text: string): void;
    onClick(callback: () => void): void;
    show(): void;
    hide(): void;
    enable(): void;
    disable(): void;
    showProgress(leaveActive?: boolean): void;
    hideProgress(): void;
  };
  
  // Back button
  BackButton: {
    isVisible: boolean;
    onClick(callback: () => void): void;
    show(): void;
    hide(): void;
  };
}

declare global {
  interface Window {
    Telegram?: {
      WebApp: TelegramWebApp;
    };
  }
}
