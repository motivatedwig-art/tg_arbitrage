# Telegram Mini App Development Prompt for Cursor AI

## Project Overview

Develop a responsive Telegram Mini App that provides users with cryptocurrency arbitrage opportunities across selected exchanges. The app features a smooth two-screen experience: exchange selection and an interactive arbitrage table with real-time data updates.

## Section 1: Project Setup and Structure

### 1.1 Initialize Mini App Project
```
telegram-miniapp/
├── public/
│   ├── index.html
│   ├── manifest.json
│   └── favicon.ico
├── src/
│   ├── components/
│   │   ├── ExchangeSelector/
│   │   ├── ArbitrageTable/
│   │   ├── CountdownTimer/
│   │   └── common/
│   ├── screens/
│   │   ├── SelectionScreen.tsx
│   │   └── TableScreen.tsx
│   ├── hooks/
│   │   ├── useTelegramWebApp.ts
│   │   └── useArbitrageData.ts
│   ├── services/
│   │   ├── api.ts
│   │   └── telegram.ts
│   ├── types/
│   │   └── index.ts
│   ├── utils/
│   │   ├── animations.ts
│   │   └── formatters.ts
│   ├── styles/
│   │   ├── globals.css
│   │   └── animations.css
│   ├── App.tsx
│   └── index.tsx
├── package.json
├── tsconfig.json
└── .env
```

### 1.2 Install Dependencies
```json
{
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "typescript": "^5.0.0",
    "@types/react": "^18.2.0",
    "@types/react-dom": "^18.2.0",
    "framer-motion": "^10.16.0",
    "axios": "^1.5.0",
    "@telegram-apps/sdk": "^1.0.0",
    "react-query": "^3.39.0",
    "styled-components": "^6.0.0",
    "@types/styled-components": "^5.1.26",
    "lucide-react": "^0.263.0"
  },
  "devDependencies": {
    "@vitejs/plugin-react": "^4.0.0",
    "vite": "^4.4.0",
    "vite-plugin-pwa": "^0.16.0"
  }
}
```

### 1.3 Vite Configuration
Configure Vite for Telegram Mini App deployment:
```javascript
// vite.config.ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg}']
      }
    })
  ],
  base: './',
  build: {
    outDir: 'dist',
    assetsDir: 'assets'
  }
})
```

## Section 2: Telegram Web App Integration

### 2.1 Telegram WebApp Hook
Create custom hook for Telegram Web App integration:

```typescript
// src/hooks/useTelegramWebApp.ts
import { useEffect, useState } from 'react';

interface TelegramWebApp {
  ready: () => void;
  expand: () => void;
  close: () => void;
  MainButton: {
    text: string;
    show: () => void;
    hide: () => void;
    onClick: (callback: () => void) => void;
  };
  themeParams: {
    bg_color: string;
    text_color: string;
    hint_color: string;
    link_color: string;
    button_color: string;
    button_text_color: string;
  };
}

export const useTelegramWebApp = () => {
  const [webApp, setWebApp] = useState<TelegramWebApp | null>(null);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const app = (window as any).Telegram?.WebApp;
    if (app) {
      app.ready();
      app.expand();
      setWebApp(app);
      setUser(app.initDataUnsafe?.user);
    }
  }, []);

  return { webApp, user, isReady: !!webApp };
};
```

### 2.2 Theme Integration
Implement Telegram theme colors:
```typescript
// src/hooks/useTelegramTheme.ts
export const useTelegramTheme = () => {
  const { webApp } = useTelegramWebApp();
  
  return {
    backgroundColor: webApp?.themeParams.bg_color || '#ffffff',
    textColor: webApp?.themeParams.text_color || '#000000',
    buttonColor: webApp?.themeParams.button_color || '#3390ec',
    buttonTextColor: webApp?.themeParams.button_text_color || '#ffffff',
    hintColor: webApp?.themeParams.hint_color || '#999999',
    linkColor: webApp?.themeParams.link_color || '#3390ec',
  };
};
```

## Section 3: Data Types and API Integration

### 3.1 TypeScript Interfaces
Define comprehensive data types:

```typescript
// src/types/index.ts
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
}
```

### 3.2 API Service
Create API service for data fetching:

```typescript
// src/services/api.ts
import axios from 'axios';
import { ApiResponse, Exchange } from '../types';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:3000/api';

export const apiService = {
  async getArbitrageData(selectedExchanges: string[]): Promise<ApiResponse> {
    const response = await axios.post(`${API_BASE_URL}/arbitrage`, {
      exchanges: selectedExchanges
    });
    return response.data;
  },

  async getAvailableExchanges(): Promise<Exchange[]> {
    const response = await axios.get(`${API_BASE_URL}/exchanges`);
    return response.data;
  },

  async saveUserPreferences(userId: string, exchanges: string[]) {
    await axios.post(`${API_BASE_URL}/user/preferences`, {
      userId,
      selectedExchanges: exchanges
    });
  }
};
```

## Section 4: Exchange Selection Screen

### 4.1 Exchange Selection Component
Create the exchange selection interface:

```typescript
// src/components/ExchangeSelector/ExchangeSelector.tsx
import React from 'react';
import { motion } from 'framer-motion';
import styled from 'styled-components';
import { Exchange } from '../../types';
import { useTelegramTheme } from '../../hooks/useTelegramTheme';

interface Props {
  exchanges: Exchange[];
  onSelectionChange: (selectedExchanges: string[]) => void;
  onContinue: () => void;
  selectedExchanges: string[];
}

const ExchangeSelector: React.FC<Props> = ({
  exchanges,
  onSelectionChange,
  onContinue,
  selectedExchanges
}) => {
  const theme = useTelegramTheme();

  const toggleExchange = (exchangeId: string) => {
    const newSelection = selectedExchanges.includes(exchangeId)
      ? selectedExchanges.filter(id => id !== exchangeId)
      : [...selectedExchanges, exchangeId];
    
    onSelectionChange(newSelection);
  };

  return (
    <Container theme={theme}>
      <Title theme={theme}>Select Your Exchanges</Title>
      <Subtitle theme={theme}>
        Choose the exchanges you want to monitor for arbitrage opportunities
      </Subtitle>
      
      <ExchangeList>
        {exchanges.map((exchange, index) => (
          <motion.div
            key={exchange.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <ExchangeItem
              theme={theme}
              selected={selectedExchanges.includes(exchange.id)}
              onClick={() => toggleExchange(exchange.id)}
            >
              <ExchangeLogo src={exchange.logo} alt={exchange.name} />
              <ExchangeName theme={theme}>{exchange.displayName}</ExchangeName>
              <Checkbox selected={selectedExchanges.includes(exchange.id)} />
            </ExchangeItem>
          </motion.div>
        ))}
      </ExchangeList>

      <ContinueButton
        theme={theme}
        disabled={selectedExchanges.length === 0}
        onClick={onContinue}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
      >
        Continue ({selectedExchanges.length} selected)
      </ContinueButton>
    </Container>
  );
};
```

### 4.2 Styled Components for Exchange Selector
```typescript
const Container = styled.div<{ theme: any }>`
  padding: 20px;
  background: ${props => props.theme.backgroundColor};
  min-height: 100vh;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
`;

const Title = styled.h1<{ theme: any }>`
  color: ${props => props.theme.textColor};
  font-size: 24px;
  font-weight: 600;
  margin-bottom: 8px;
  text-align: center;
`;

const ExchangeList = styled.div`
  margin: 24px 0;
`;

const ExchangeItem = styled.div<{ theme: any; selected: boolean }>`
  display: flex;
  align-items: center;
  padding: 16px;
  margin-bottom: 12px;
  border-radius: 12px;
  background: ${props => props.selected ? props.theme.buttonColor + '20' : 'rgba(0,0,0,0.05)'};
  border: 2px solid ${props => props.selected ? props.theme.buttonColor : 'transparent'};
  cursor: pointer;
  transition: all 0.3s ease;

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0,0,0,0.1);
  }
`;

const ContinueButton = styled(motion.button)<{ theme: any; disabled: boolean }>`
  width: 100%;
  padding: 16px;
  border: none;
  border-radius: 12px;
  background: ${props => props.disabled ? props.theme.hintColor : props.theme.buttonColor};
  color: ${props => props.theme.buttonTextColor};
  font-size: 16px;
  font-weight: 600;
  cursor: ${props => props.disabled ? 'not-allowed' : 'pointer'};
  margin-top: 20px;
`;
```

## Section 5: Arbitrage Table Screen

### 5.1 Table Component Structure
Create the main arbitrage table:

```typescript
// src/components/ArbitrageTable/ArbitrageTable.tsx
import React from 'react';
import { motion } from 'framer-motion';
import styled from 'styled-components';
import { ArbitrageOpportunity } from '../../types';
import { CountdownTimer } from '../CountdownTimer/CountdownTimer';
import { useTelegramTheme } from '../../hooks/useTelegramTheme';

interface Props {
  opportunities: ArbitrageOpportunity[];
  selectedExchanges: string[];
  lastUpdate: string;
  nextUpdate: string;
  onRefresh: () => void;
  onBackToSelection: () => void;
}

const ArbitrageTable: React.FC<Props> = ({
  opportunities,
  selectedExchanges,
  lastUpdate,
  nextUpdate,
  onRefresh,
  onBackToSelection
}) => {
  const theme = useTelegramTheme();

  return (
    <motion.div
      initial={{ y: '100%' }}
      animate={{ y: 0 }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
    >
      <Container theme={theme}>
        <Header>
          <CountdownTimer nextUpdate={nextUpdate} onRefresh={onRefresh} />
          <BackButton onClick={onBackToSelection}>← Back</BackButton>
        </Header>

        <TableContainer>
          <Table>
            <TableHeader>
              <HeaderRow>
                <HeaderCell>Pair</HeaderCell>
                {selectedExchanges.map(exchange => (
                  <HeaderCell key={exchange}>{exchange}</HeaderCell>
                ))}
                <HeaderCell>Spread %</HeaderCell>
              </HeaderRow>
            </TableHeader>
            
            <TableBody>
              {opportunities.map((opportunity, index) => (
                <motion.tr
                  key={opportunity.pair.symbol}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <PairCell theme={theme}>
                    <CoinSymbol>{opportunity.pair.displaySymbol}</CoinSymbol>
                  </PairCell>
                  
                  {selectedExchanges.map(exchangeId => {
                    const price = opportunity.prices.find(p => p.exchangeId === exchangeId);
                    return (
                      <PriceCell key={exchangeId} theme={theme}>
                        {price ? (
                          <PriceLink 
                            href={price.url} 
                            target="_blank" 
                            theme={theme}
                            isBest={price.exchangeId === opportunity.bestBuy.exchangeId || 
                                   price.exchangeId === opportunity.bestSell.exchangeId}
                          >
                            ${price.price.toFixed(4)}
                          </PriceLink>
                        ) : (
                          <span>-</span>
                        )}
                      </PriceCell>
                    );
                  })}
                  
                  <SpreadCell 
                    theme={theme}
                    profitability={opportunity.profitability}
                  >
                    {opportunity.spreadPercentage.toFixed(2)}%
                  </SpreadCell>
                </motion.tr>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Container>
    </motion.div>
  );
};
```

### 5.2 Countdown Timer Component
Create refresh countdown timer:

```typescript
// src/components/CountdownTimer/CountdownTimer.tsx
import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { RefreshCw } from 'lucide-react';
import { useTelegramTheme } from '../../hooks/useTelegramTheme';

interface Props {
  nextUpdate: string;
  onRefresh: () => void;
}

export const CountdownTimer: React.FC<Props> = ({ nextUpdate, onRefresh }) => {
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const theme = useTelegramTheme();

  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date().getTime();
      const updateTime = new Date(nextUpdate).getTime();
      const difference = updateTime - now;
      
      if (difference > 0) {
        setTimeLeft(Math.floor(difference / 1000));
      } else {
        setTimeLeft(0);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [nextUpdate]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <TimerContainer theme={theme}>
      <RefreshIcon 
        size={16} 
        onClick={onRefresh}
        style={{ cursor: 'pointer', marginRight: '8px' }}
      />
      <TimerText theme={theme}>
        Next update: {formatTime(timeLeft)}
      </TimerText>
    </TimerContainer>
  );
};

const TimerContainer = styled.div<{ theme: any }>`
  display: flex;
  align-items: center;
  padding: 8px 12px;
  background: rgba(0,0,0,0.05);
  border-radius: 8px;
  font-size: 14px;
`;

const TimerText = styled.span<{ theme: any }>`
  color: ${props => props.theme.hintColor};
  font-weight: 500;
`;

const RefreshIcon = styled(RefreshCw)`
  color: ${props => props.theme.linkColor};
  transition: transform 0.2s;
  
  &:hover {
    transform: rotate(180deg);
  }
`;
```

## Section 6: Application State Management

### 6.1 Main App Component
```typescript
// src/App.tsx
import React, { useState, useEffect } from 'react';
import { QueryClient, QueryClientProvider } from 'react-query';
import { SelectionScreen } from './screens/SelectionScreen';
import { TableScreen } from './screens/TableScreen';
import { useTelegramWebApp } from './hooks/useTelegramWebApp';
import { Exchange } from './types';
import './styles/globals.css';

const queryClient = new QueryClient();

type Screen = 'selection' | 'table';

const App: React.FC = () => {
  const [currentScreen, setCurrentScreen] = useState<Screen>('selection');
  const [selectedExchanges, setSelectedExchanges] = useState<string[]>([]);
  const { webApp, user } = useTelegramWebApp();

  useEffect(() => {
    // Load user preferences if available
    if (user?.id) {
      // Load saved exchange preferences
    }
  }, [user]);

  const handleExchangeSelection = (exchanges: string[]) => {
    setSelectedExchanges(exchanges);
  };

  const handleContinueToTable = () => {
    setCurrentScreen('table');
  };

  const handleBackToSelection = () => {
    setCurrentScreen('selection');
  };

  return (
    <QueryClientProvider client={queryClient}>
      <div className="app">
        {currentScreen === 'selection' && (
          <SelectionScreen
            selectedExchanges={selectedExchanges}
            onSelectionChange={handleExchangeSelection}
            onContinue={handleContinueToTable}
          />
        )}
        
        {currentScreen === 'table' && (
          <TableScreen
            selectedExchanges={selectedExchanges}
            onBackToSelection={handleBackToSelection}
          />
        )}
      </div>
    </QueryClientProvider>
  );
};

export default App;
```

### 6.2 Custom Hooks for Data Management
```typescript
// src/hooks/useArbitrageData.ts
import { useQuery, useQueryClient } from 'react-query';
import { apiService } from '../services/api';
import { ArbitrageOpportunity } from '../types';

export const useArbitrageData = (selectedExchanges: string[]) => {
  const queryClient = useQueryClient();

  const { data, isLoading, error } = useQuery(
    ['arbitrage', selectedExchanges],
    () => apiService.getArbitrageData(selectedExchanges),
    {
      refetchInterval: 120000, // 2 minutes
      enabled: selectedExchanges.length > 0,
    }
  );

  const refetch = () => {
    queryClient.invalidateQueries(['arbitrage', selectedExchanges]);
  };

  return {
    opportunities: data?.opportunities || [],
    lastUpdate: data?.lastUpdate || '',
    nextUpdate: data?.nextUpdate || '',
    isLoading,
    error,
    refetch
  };
};
```

## Section 7: Animations and Transitions

### 7.1 Global Animation Styles
```css
/* src/styles/animations.css */
@keyframes slideUp {
  from {
    transform: translateY(100%);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}

@keyframes slideDown {
  from {
    transform: translateY(-100%);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}

@keyframes fadeInScale {
  from {
    opacity: 0;
    transform: scale(0.9);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

.screen-transition-enter {
  animation: slideUp 0.4s ease-out;
}

.screen-transition-exit {
  animation: slideDown 0.3s ease-in;
}

.table-row-enter {
  animation: fadeInScale 0.3s ease-out;
}

.profit-high {
  background: linear-gradient(135deg, #00ff88, #00cc70);
  color: white;
}

.profit-medium {
  background: linear-gradient(135deg, #ffaa00, #ff8800);
  color: white;
}

.profit-low {
  background: linear-gradient(135deg, #ff6b6b, #ff5252);
  color: white;
}
```

### 7.2 Framer Motion Variants
```typescript
// src/utils/animations.ts
export const screenVariants = {
  initial: { y: '100%', opacity: 0 },
  animate: { y: 0, opacity: 1 },
  exit: { y: '-100%', opacity: 0 }
};

export const listVariants = {
  initial: { opacity: 0 },
  animate: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1
    }
  }
};

export const itemVariants = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 }
};

export const tableRowVariants = {
  initial: { opacity: 0, x: -20 },
  animate: { opacity: 1, x: 0 }
};
```

## Section 8: Responsive Design and UX

### 8.1 Global Styles
```css
/* src/styles/globals.css */
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 
               'Helvetica Neue', Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  background: var(--tg-theme-bg-color, #ffffff);
  color: var(--tg-theme-text-color, #000000);
  overflow-x: hidden;
}

.app {
  min-height: 100vh;
  width: 100%;
}

/* Responsive breakpoints */
@media (max-width: 480px) {
  .table-container {
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
  }
  
  .exchange-item {
    padding: 12px;
  }
  
  .table-header {
    font-size: 14px;
  }
}

/* Telegram theme variables */
:root {
  --tg-theme-bg-color: #ffffff;
  --tg-theme-text-color: #000000;
  --tg-theme-hint-color: #999999;
  --tg-theme-link-color: #3390ec;
  --tg-theme-button-color: #3390ec;
  --tg-theme-button-text-color: #ffffff;
}

/* Dark theme support */
@media (prefers-color-scheme: dark) {
  :root {
    --tg-theme-bg-color: #212121;
    --tg-theme-text-color: #ffffff;
    --tg-theme-hint-color: #aaaaaa;
  }
}
```

### 8.2 Touch-Friendly Design
```typescript
// src/utils/touchHandlers.ts
export const addTouchFeedback = (element: HTMLElement) => {
  element.addEventListener('touchstart', () => {
    element.style.transform = 'scale(0.98)';
    element.style.transition = 'transform 0.1s ease';
  });

  element.addEventListener('touchend', () => {
    element.style.transform = 'scale(1)';
  });
};

export const preventZoom = () => {
  document.addEventListener('gesturestart', (e) => {
    e.preventDefault();
  });
  
  document.addEventListener('gesturechange', (e) => {
    e.preventDefault();
  });
};
```

## Section 9: Development Priority and Implementation

### 9.1 Development Phases
1. **Phase 1:** Basic project setup and Telegram Web App integration
2. **Phase 2:** Exchange selection screen with animations
3. **Phase 3:** API integration and data fetching
4. **Phase 4:** Arbitrage table implementation
5. **Phase 5:** Countdown timer and refresh functionality
6. **Phase 6:** Responsive design and mobile optimization
7. **Phase 7:** Performance optimization and caching
8. **Phase 8:** Testing and deployment

### 9.2 Key Features Checklist
- [ ] Telegram Web App integration with theme support
- [ ] Smooth exchange selection interface
- [ ] Animated transitions between screens
- [ ] Real-time arbitrage data table
- [ ] Clickable links to exchange pairs
- [ ] 2-minute refresh countdown timer
- [ ] Responsive mobile-first design
- [ ] Touch-friendly interactions
- [ ] Loading states and error handling
- [ ] Local state persistence
- [ ] Performance optimization

### 9.3 Testing Requirements
- Test on various mobile devices and screen sizes
- Verify Telegram Web App functionality
- Test touch interactions and gestures
- Validate API integration and error handling
- Performance testing with large datasets
- Cross-browser compatibility testing

### 9.4 Deployment Configuration
```json
{
  "name": "crypto-arbitrage-miniapp",
  "version": "1.0.0",
  "homepage": "https://yourdomain.com/miniapp",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview"
  }
}
```

Start with Phase 1 and implement each component systematically. Focus on creating smooth animations and responsive design from the beginning. The mini app should feel native to the Telegram environment while providing an exceptional user experience for crypto arbitrage trading.