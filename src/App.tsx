import React, { useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import SelectionScreen from './screens/SelectionScreen';
import TableScreen from './screens/TableScreen';
import { useTelegramWebApp } from './hooks/useTelegramWebApp';
import './styles/globals.css';

type Screen = 'selection' | 'table';

const App: React.FC = () => {
  const [currentScreen, setCurrentScreen] = useState<Screen>('selection');
  const [selectedExchanges, setSelectedExchanges] = useState<string[]>([]);
  const { webApp, isReady } = useTelegramWebApp();

  useEffect(() => {
    if (webApp) {
      // Configure Telegram WebApp
      webApp.ready();
      webApp.expand();
      
      // Set up main button if needed
      webApp.MainButton.hide();
    }
  }, [webApp]);

  const handleExchangesSelected = (exchanges: string[]) => {
    setSelectedExchanges(exchanges);
    setCurrentScreen('table');
  };

  const handleBack = () => {
    setCurrentScreen('selection');
  };

  // Show loading screen while Telegram WebApp is initializing
  if (!isReady) {
    return (
      <div style={{
        height: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--tg-theme-bg-color)',
        color: 'var(--tg-theme-text-color)'
      }}>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          style={{ textAlign: 'center' }}
        >
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            style={{
              width: 40,
              height: 40,
              border: '3px solid var(--tg-theme-hint-color)',
              borderTop: '3px solid var(--tg-theme-button-color)',
              borderRadius: '50%',
              margin: '0 auto 16px'
            }}
          />
          <p>Loading Crypto Arbitrage...</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="app">
      <AnimatePresence mode="wait">
        {currentScreen === 'selection' && (
          <motion.div
            key="selection"
            initial={{ opacity: 0, x: -100 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -100 }}
            transition={{ duration: 0.3 }}
          >
            <SelectionScreen onExchangesSelected={handleExchangesSelected} />
          </motion.div>
        )}

        {currentScreen === 'table' && (
          <motion.div
            key="table"
            initial={{ opacity: 0, x: 100 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 100 }}
            transition={{ duration: 0.3 }}
          >
            <TableScreen 
              selectedExchanges={selectedExchanges}
              onBack={handleBack}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default App;
