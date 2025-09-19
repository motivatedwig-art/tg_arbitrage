import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, RefreshCw, ExternalLink, TrendingUp, Clock } from 'lucide-react';
import styled from 'styled-components';
import { useArbitrageData } from '../hooks/useArbitrageData';
// import { ArbitrageOpportunity } from '../types';

interface TableScreenProps {
  selectedExchanges: string[];
  onBack: () => void;
}

const Container = styled.div`
  height: 100vh;
  display: flex;
  flex-direction: column;
  background: var(--bg-primary);
  overflow: hidden;
`;

const Header = styled.div`
  padding: var(--spacing-base) 20px;
  display: flex;
  align-items: center;
  gap: 16px;
  border-bottom: 1px solid var(--separator);
  background: var(--bg-primary);
  position: sticky;
  top: 0;
  z-index: 10;
`;

const BackButton = styled(motion.button)`
  width: 40px;
  height: 40px;
  border-radius: 20px;
  background: var(--surface-elevated);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-primary);
  cursor: pointer;
  border: none;
  transition: all 0.2s ease;
  
  &:hover {
    background: var(--accent-yellow);
    color: #000000;
    transform: scale(1.05);
  }
`;

const HeaderInfo = styled.div`
  flex: 1;
`;

const Title = styled.h1`
  font-family: var(--font-family-text);
  font-size: 20px;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 4px;
`;

const Subtitle = styled.div`
  font-family: var(--font-family-text);
  font-size: 13px;
  color: var(--text-secondary);
  display: flex;
  align-items: center;
  gap: 8px;
`;

const RefreshButton = styled(motion.button)<{ isRefreshing: boolean }>`
  width: 40px;
  height: 40px;
  border-radius: 20px;
  background: var(--accent-yellow);
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
  padding: var(--spacing-base);
`;

const StatsBar = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: 12px;
  margin-bottom: 20px;
`;

const StatCard = styled.div`
  background: rgba(255, 214, 10, 0.1);
  border-radius: 12px;
  padding: 16px;
  text-align: center;
`;

const StatValue = styled.div`
  font-family: var(--font-family-mono);
  font-size: 20px;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 4px;
`;

const StatLabel = styled.div`
  font-family: var(--font-family-text);
  font-size: 12px;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.5px;
`;

const OpportunityCard = styled(motion.div)`
  background: var(--bg-secondary);
  border-radius: var(--border-radius-card);
  padding: var(--spacing-base);
  margin-bottom: 12px;
  border-left: 4px solid var(--accent-yellow);
  transition: all 0.2s ease;
  
  &:hover {
    background: var(--surface-elevated);
    transform: translateY(-2px);
    box-shadow: var(--shadow-card);
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
  font-family: var(--font-family-text);
  font-size: 18px;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 4px;
`;

const PairDetails = styled.div`
  font-family: var(--font-family-text);
  font-size: 13px;
  color: var(--text-secondary);
`;

const ProfitBadge = styled.div<{ profitability: 'high' | 'medium' | 'low' }>`
  padding: 6px 12px;
  border-radius: 12px;
  font-size: 13px;
  font-weight: 600;
  background: var(--accent-green);
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
  font-family: var(--font-family-text);
  font-size: 11px;
  color: var(--text-secondary);
  margin-bottom: 4px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
`;

const ExchangeName = styled.div`
  font-family: var(--font-family-text);
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 4px;
`;

const ExchangePrice = styled.div`
  font-family: var(--font-family-mono);
  font-size: 16px;
  font-weight: 600;
  color: var(--accent-yellow);
`;

const ActionRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid var(--separator);
`;

const SpreadInfo = styled.div`
  font-family: var(--font-family-mono);
  font-size: 13px;
  color: var(--text-secondary);
`;

const ViewButton = styled(motion.button)`
  padding: 8px 16px;
  border-radius: 20px;
  background: var(--accent-yellow);
  color: #000000;
  font-family: var(--font-family-text);
  font-size: 13px;
  font-weight: 500;
  display: flex;
  align-items: center;
  gap: 4px;
  cursor: pointer;
  border: none;
  transition: all 0.2s ease;
  
  &:hover {
    background: #FFE55C;
    transform: scale(1.05);
  }
`;

const EmptyState = styled.div`
  text-align: center;
  padding: 40px 20px;
  color: var(--text-secondary);
`;

const LoadingCard = styled(motion.div)`
  background: var(--bg-secondary);
  border-radius: var(--border-radius-card);
  padding: var(--spacing-base);
  margin-bottom: 12px;
  height: 120px;
  display: flex;
  align-items: center;
  justify-content: center;
  animation: pulse 1.5s ease-in-out infinite;
`;

const CountdownTimer = styled.div`
  font-family: var(--font-family-mono);
  font-size: 12px;
  color: var(--text-secondary);
  display: flex;
  align-items: center;
  gap: 6px;
`;

const TableScreen: React.FC<TableScreenProps> = ({ selectedExchanges, onBack }) => {
  const { data, loading, error, refetch } = useArbitrageData(selectedExchanges);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [countdown, setCountdown] = useState(120); // 2 minutes

  // Countdown timer effect
  React.useEffect(() => {
    const timer = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          refetch();
          return 120;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [refetch]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refetch();
    setCountdown(120);
    setIsRefreshing(false);
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
        <BackButton
          onClick={onBack}
          whileTap={{ scale: 0.9 }}
        >
          <ArrowLeft size={20} />
        </BackButton>
        
        <HeaderInfo>
          <Title>Arbitrage Opportunities</Title>
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
            <StatLabel>Opportunities</StatLabel>
          </StatCard>
          <StatCard>
            <StatValue>{stats.avgProfit}%</StatValue>
            <StatLabel>Avg Profit</StatLabel>
          </StatCard>
          <StatCard>
            <StatValue>{stats.maxProfit}%</StatValue>
            <StatLabel>Max Profit</StatLabel>
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
              <p>Error loading data: {error}</p>
              <ViewButton onClick={handleRefresh} style={{ margin: '16px auto' }}>
                Try Again
              </ViewButton>
            </EmptyState>
          )}

          {!loading && !error && data.length === 0 && (
            <EmptyState>
              <TrendingUp size={48} style={{ marginBottom: '16px', opacity: 0.5 }} />
              <p>No arbitrage opportunities found</p>
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
                      <ExchangeLabel>Buy on</ExchangeLabel>
                      <ExchangeName>{opportunity.bestBuy.exchangeName}</ExchangeName>
                      <ExchangePrice>${opportunity.bestBuy.price.toFixed(4)}</ExchangePrice>
                    </ExchangeCard>
                    <ExchangeCard>
                      <ExchangeLabel>Sell on</ExchangeLabel>
                      <ExchangeName>{opportunity.bestSell.exchangeName}</ExchangeName>
                      <ExchangePrice>${opportunity.bestSell.price.toFixed(4)}</ExchangePrice>
                    </ExchangeCard>
                  </ExchangeRow>

                  <ActionRow>
                    <SpreadInfo>
                      Spread: ${opportunity.spreadAmount.toFixed(4)}
                    </SpreadInfo>
                    <ViewButton
                      whileTap={{ scale: 0.95 }}
                      onClick={() => {
                        // Open external link to exchange
                        window.open(opportunity.bestBuy.url, '_blank');
                      }}
                    >
                      View <ExternalLink size={12} />
                    </ViewButton>
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
