import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, RefreshCw, TrendingUp, Clock } from 'lucide-react';
import styled from 'styled-components';
import { useTranslation } from 'react-i18next';
import { useArbitrageData } from '../hooks/useArbitrageData';
import LanguageSwitcher from '../components/LanguageSwitcher';
// import { ArbitrageOpportunity } from '../types';

interface TableScreenProps {
  selectedExchanges: string[];
  onBack: () => void;
}

const Container = styled.div`
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background: #1C1C1E;
  overflow-x: hidden;
`;

const Header = styled.div`
  padding: 16px 20px;
  display: flex;
  align-items: center;
  gap: 16px;
  border-bottom: 1px solid #38383A;
  background: #1C1C1E;
  position: sticky;
  top: 0;
  z-index: 10;
`;

const LanguageSwitcherWrapper = styled.div`
  position: absolute;
  top: 16px;
  right: 20px;
`;

const BackButton = styled(motion.button)`
  width: 40px;
  height: 40px;
  border-radius: 20px;
  background: #3A3A3C;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #FFFFFF;
  cursor: pointer;
  border: none;
  transition: all 0.2s ease;
  
  &:hover {
    background: #FFD60A;
    color: #000000;
    transform: scale(1.05);
  }
`;

const HeaderInfo = styled.div`
  flex: 1;
`;

const Title = styled.h1`
  font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Segoe UI', Roboto, sans-serif;
  font-size: 20px;
  font-weight: 600;
  color: #FFFFFF;
  margin-bottom: 4px;
`;

const Subtitle = styled.div`
  font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Segoe UI', Roboto, sans-serif;
  font-size: 13px;
  color: #8E8E93;
  display: flex;
  align-items: center;
  gap: 8px;
`;

const RefreshButton = styled(motion.button)<{ isRefreshing: boolean }>`
  width: 40px;
  height: 40px;
  border-radius: 20px;
  background: #FFD60A;
  color: #000000;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  opacity: ${props => props.isRefreshing ? 0.7 : 1};
  border: none;
  transition: all 0.2s ease;
  
  &:hover:not(:disabled) {
    background: #FFE55C;
    transform: scale(1.05);
  }
`;

const Content = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 16px;
`;

const StatsBar = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  gap: 12px;
  margin-bottom: 20px;
`;

const StatCard = styled.div`
  background: rgba(255, 214, 10, 0.1);
  border-radius: 12px;
  padding: 16px;
  text-align: center;
  border: 1px solid #38383A;
`;

const StatValue = styled.div`
  font-family: 'SF Mono', Monaco, 'Cascadia Code', 'Roboto Mono', Consolas, 'Courier New', monospace;
  font-size: 20px;
  font-weight: 600;
  color: #FFFFFF;
  margin-bottom: 4px;
`;

const StatLabel = styled.div`
  font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Segoe UI', Roboto, sans-serif;
  font-size: 12px;
  color: #8E8E93;
  text-transform: uppercase;
  letter-spacing: 0.5px;
`;

const OpportunityCard = styled(motion.div)`
  background: #2C2C2E;
  border-radius: 16px;
  padding: 16px;
  margin-bottom: 12px;
  border-left: 4px solid #FFD60A;
  transition: all 0.2s ease;
  border: 1px solid #38383A;
  
  &:hover {
    background: #3A3A3C;
    transform: translateY(-2px);
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
  }
`;

const OpportunityHeader = styled.div`
  display: flex;
  justify-content: between;
  align-items: flex-start;
  margin-bottom: 12px;
`;

const PairInfo = styled.div`
  flex: 1;
`;

const PairSymbol = styled.div`
  font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Segoe UI', Roboto, sans-serif;
  font-size: 18px;
  font-weight: 600;
  color: #FFFFFF;
  margin-bottom: 4px;
`;

const PairDetails = styled.div`
  font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Segoe UI', Roboto, sans-serif;
  font-size: 13px;
  color: #8E8E93;
`;

const ProfitBadge = styled.div<{ profitability: 'high' | 'medium' | 'low' }>`
  padding: 6px 12px;
  border-radius: 12px;
  font-size: 13px;
  font-weight: 600;
  background: ${props => 
    props.profitability === 'high' ? '#FF453A' :
    props.profitability === 'medium' ? '#FF9F0A' :
    '#30D158'};
  color: white;
  display: flex;
  align-items: center;
  gap: 4px;
`;

const ExchangeRow = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  margin-bottom: 12px;
`;

const ExchangeCard = styled.div`
  background: rgba(255, 255, 255, 0.05);
  border-radius: 8px;
  padding: 12px;
`;

const ExchangeLabel = styled.div`
  font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Segoe UI', Roboto, sans-serif;
  font-size: 11px;
  color: #8E8E93;
  margin-bottom: 4px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
`;

const ExchangeName = styled.div`
  font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Segoe UI', Roboto, sans-serif;
  font-size: 14px;
  font-weight: 600;
  color: #FFFFFF;
  margin-bottom: 4px;
`;

const ExchangePrice = styled.div`
  font-family: 'SF Mono', Monaco, 'Cascadia Code', 'Roboto Mono', Consolas, 'Courier New', monospace;
  font-size: 16px;
  font-weight: 600;
  color: #FFD60A;
`;

const ActionRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid #38383A;
`;

const SpreadInfo = styled.div`
  font-family: 'SF Mono', Monaco, 'Cascadia Code', 'Roboto Mono', Consolas, 'Courier New', monospace;
  font-size: 13px;
  color: #8E8E93;
`;

const ViewButton = styled(motion.a)`
  padding: 8px 16px;
  border-radius: 20px;
  background: #FFD60A;
  color: #000000;
  font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Segoe UI', Roboto, sans-serif;
  font-size: 13px;
  font-weight: 500;
  display: flex;
  align-items: center;
  gap: 4px;
  cursor: pointer;
  border: none;
  transition: all 0.2s ease;
  text-decoration: none;
  
  &:hover {
    background: #FFE55C;
    transform: scale(1.05);
  }
`;

const EmptyState = styled.div`
  text-align: center;
  padding: 40px 20px;
  color: #8E8E93;
`;

const LoadingCard = styled(motion.div)`
  background: #2C2C2E;
  border-radius: 16px;
  padding: 16px;
  margin-bottom: 12px;
  height: 120px;
  display: flex;
  align-items: center;
  justify-content: center;
  animation: pulse 1.5s ease-in-out infinite;
`;

const CountdownTimer = styled.div`
  font-family: 'SF Mono', Monaco, 'Cascadia Code', 'Roboto Mono', Consolas, 'Courier New', monospace;
  font-size: 12px;
  color: #8E8E93;
  display: flex;
  align-items: center;
  gap: 6px;
`;

// Exchange URL patterns
const exchangeUrls: Record<string, string> = {
  'binance': 'https://www.binance.com/en/trade/{symbol}',
  'okx': 'https://www.okx.com/trade-spot/{symbol}',
  'bybit': 'https://www.bybit.com/trade/spot/{symbol}',
  'bitget': 'https://www.bitget.com/en/spot/{symbol}',
  'mexc': 'https://www.mexc.com/exchange/{symbol}',
  'bingx': 'https://bingx.com/en-us/spot/{symbol}',
  'gateio': 'https://www.gate.io/trade/{symbol}',
  'kucoin': 'https://trade.kucoin.com/{symbol}'
};

const getExchangeUrl = (exchange: string, symbol: string): string => {
  const urlPattern = exchangeUrls[exchange.toLowerCase()];
  if (!urlPattern) {
    return `https://${exchange.toLowerCase()}.com`;
  }
  return urlPattern.replace('{symbol}', symbol);
};

const TableScreen: React.FC<TableScreenProps> = ({ selectedExchanges, onBack }) => {
  const { data, loading, error, refetch } = useArbitrageData(selectedExchanges);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [countdown, setCountdown] = useState(30); // 30 seconds
  const { t } = useTranslation();

  // Countdown timer effect
  React.useEffect(() => {
    const timer = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          refetch();
          return 30;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [refetch]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await refetch();
      setCountdown(30);
    } catch (error) {
      console.error('Refresh error:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getStats = () => {
    if (!data.length) return { total: 0, avgProfit: 0, maxProfit: 0 };
    
    const avgProfit = data.reduce((sum, opp) => sum + opp.spreadPercentage, 0) / data.length;
    const maxProfit = Math.max(...data.map(opp => opp.spreadPercentage));
    
    return {
      total: data.length,
      avgProfit: avgProfit.toFixed(2),
      maxProfit: maxProfit.toFixed(2)
    };
  };

  const stats = getStats();

  return (
    <Container>
      <Header>
        <LanguageSwitcherWrapper>
          <LanguageSwitcher />
        </LanguageSwitcherWrapper>
        
        <BackButton
          onClick={onBack}
          whileTap={{ scale: 0.9 }}
        >
          <ArrowLeft size={20} />
        </BackButton>
        
        <HeaderInfo>
          <Title>{t('webapp.title')}</Title>
          <Subtitle>
            <CountdownTimer>
              <Clock size={12} />
              Next update: {formatTime(countdown)}
            </CountdownTimer>
          </Subtitle>
        </HeaderInfo>
        
        <RefreshButton
          isRefreshing={isRefreshing}
          onClick={handleRefresh}
          whileTap={{ scale: 0.9 }}
        >
          <RefreshCw 
            size={18} 
            style={{ 
              transform: isRefreshing ? 'rotate(360deg)' : 'none',
              transition: 'transform 1s ease'
            }} 
          />
        </RefreshButton>
      </Header>

      <Content>
        <StatsBar>
          <StatCard>
            <StatValue>{stats.total}</StatValue>
            <StatLabel>{t('table.headers.opportunities')}</StatLabel>
          </StatCard>
          <StatCard>
            <StatValue>{stats.avgProfit}%</StatValue>
            <StatLabel>{t('table.headers.avg_profit')}</StatLabel>
          </StatCard>
          <StatCard>
            <StatValue>{stats.maxProfit}%</StatValue>
            <StatLabel>{t('table.headers.max_profit')}</StatLabel>
          </StatCard>
        </StatsBar>

        <AnimatePresence mode="wait">
          {loading && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              {[1, 2, 3].map(i => (
                <LoadingCard
                  key={i}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.1 }}
                >
                  <RefreshCw className="loading-spinner" size={24} />
                </LoadingCard>
              ))}
            </motion.div>
          )}

          {error && (
            <EmptyState>
              <p>{t('errors.generic')}: {error}</p>
              <ViewButton onClick={handleRefresh} style={{ margin: '16px auto' }}>
                {t('buttons.refresh')}
              </ViewButton>
            </EmptyState>
          )}

          {!loading && !error && data.length === 0 && (
            <EmptyState>
              <TrendingUp size={48} style={{ marginBottom: '16px', opacity: 0.5 }} />
              <p>{t('table.no_opportunities')}</p>
              <p style={{ fontSize: '0.8rem', marginTop: '8px' }}>
                Try selecting more exchanges or check back later
              </p>
            </EmptyState>
          )}

          {!loading && !error && data.length > 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              {data.map((opportunity, index) => (
                <OpportunityCard
                  key={`${opportunity.pair.symbol}-${index}`}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  whileHover={{ y: -2 }}
                >
                  <OpportunityHeader>
                    <PairInfo>
                      <PairSymbol>{opportunity.pair.displaySymbol}</PairSymbol>
                      <PairDetails>
                        {opportunity.pair.baseAsset}/{opportunity.pair.quoteAsset}
                      </PairDetails>
                    </PairInfo>
                    <ProfitBadge profitability={opportunity.profitability}>
                      <TrendingUp size={12} />
                      {opportunity.spreadPercentage.toFixed(2)}%
                    </ProfitBadge>
                  </OpportunityHeader>

                  <ExchangeRow>
                    <ExchangeCard>
                      <ExchangeLabel>{t('table.headers.buy_exchange')}</ExchangeLabel>
                      <ExchangeName>{opportunity.bestBuy.exchangeName}</ExchangeName>
                      <ExchangePrice>${opportunity.bestBuy.price.toFixed(4)}</ExchangePrice>
                    </ExchangeCard>
                    <ExchangeCard>
                      <ExchangeLabel>{t('table.headers.sell_exchange')}</ExchangeLabel>
                      <ExchangeName>{opportunity.bestSell.exchangeName}</ExchangeName>
                      <ExchangePrice>${opportunity.bestSell.price.toFixed(4)}</ExchangePrice>
                    </ExchangeCard>
                  </ExchangeRow>

                  <ActionRow>
                    <SpreadInfo>
                      Spread: ${opportunity.spreadAmount.toFixed(4)}
                    </SpreadInfo>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <ViewButton
                        href={getExchangeUrl(opportunity.bestBuy.exchangeName, opportunity.pair.symbol)}
                        target="_blank"
                        rel="noopener noreferrer"
                        whileTap={{ scale: 0.95 }}
                      >
                        Buy ↗️
                      </ViewButton>
                      <ViewButton
                        href={getExchangeUrl(opportunity.bestSell.exchangeName, opportunity.pair.symbol)}
                        target="_blank"
                        rel="noopener noreferrer"
                        whileTap={{ scale: 0.95 }}
                      >
                        Sell ↗️
                      </ViewButton>
                    </div>
                  </ActionRow>
                </OpportunityCard>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </Content>
    </Container>
  );
};

export default TableScreen;
