import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ChevronRight, Check } from 'lucide-react';
import styled from 'styled-components';
import { Exchange } from '../types';
import { apiService } from '../services/api';
import { useTelegramWebApp } from '../hooks/useTelegramWebApp';

interface SelectionScreenProps {
  onExchangesSelected: (exchanges: string[]) => void;
}

const Container = styled.div`
  height: 100vh;
  display: flex;
  flex-direction: column;
  background: var(--bg-primary);
  overflow: hidden;
`;

const Header = styled.div`
  padding: var(--spacing-section) 20px 16px;
  text-align: center;
  border-bottom: 1px solid var(--separator);
  background: var(--bg-primary);
`;

const Title = styled.h1`
  font-family: var(--font-family-text);
  font-size: 22px;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 8px;
`;

const Subtitle = styled.p`
  font-family: var(--font-family-text);
  font-size: 15px;
  color: var(--text-secondary);
  line-height: 1.4;
`;

const ExchangeList = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: var(--spacing-base);
`;

const ExchangeCard = styled(motion.div)<{ isSelected: boolean }>`
  display: flex;
  align-items: center;
  padding: var(--spacing-base);
  margin-bottom: 12px;
  border-radius: var(--border-radius-card);
  background: ${props => props.isSelected 
    ? 'rgba(255, 214, 10, 0.1)' 
    : 'var(--bg-secondary)'};
  border: 2px solid ${props => props.isSelected 
    ? 'var(--accent-yellow)' 
    : 'transparent'};
  cursor: pointer;
  transition: all 0.2s ease;
  
  &:hover {
    background: var(--surface-elevated);
    transform: translateY(-1px);
    box-shadow: var(--shadow-card);
  }
  
  &:active {
    transform: scale(0.98);
  }
`;

const ExchangeLogo = styled.div`
  width: 48px;
  height: 48px;
  border-radius: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  margin-right: 16px;
  background: var(--surface-elevated);
  flex-shrink: 0;
`;

const ExchangeInfo = styled.div`
  flex: 1;
  min-width: 0;
`;

const ExchangeName = styled.div<{ isSelected: boolean }>`
  font-family: var(--font-family-text);
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 4px;
`;

const ExchangeStatus = styled.div<{ isSelected: boolean }>`
  font-family: var(--font-family-text);
  font-size: 13px;
  color: var(--text-secondary);
`;

const CheckIcon = styled(motion.div)<{ isSelected: boolean }>`
  width: 24px;
  height: 24px;
  border-radius: 12px;
  background: ${props => props.isSelected 
    ? 'var(--accent-yellow)' 
    : 'transparent'};
  display: flex;
  align-items: center;
  justify-content: center;
  color: #000000;
  opacity: ${props => props.isSelected ? 1 : 0};
  transform: ${props => props.isSelected ? 'scale(1)' : 'scale(0)'};
  transition: all 0.2s ease;
`;

const Footer = styled.div`
  padding: 20px;
  border-top: 1px solid var(--separator);
`;

const ContinueButton = styled(motion.button)<{ disabled: boolean }>`
  width: 100%;
  padding: 16px 24px;
  border-radius: var(--border-radius-button);
  background: ${props => props.disabled 
    ? 'var(--text-tertiary)' 
    : 'var(--accent-yellow)'};
  color: #000000;
  font-family: var(--font-family-text);
  font-size: 16px;
  font-weight: 500;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  cursor: ${props => props.disabled ? 'not-allowed' : 'pointer'};
  opacity: ${props => props.disabled ? 0.6 : 1};
  border: none;
  transition: all 0.2s ease;
  
  &:hover:not(:disabled) {
    background: #FFE55C;
    transform: translateY(-1px);
    box-shadow: var(--shadow-card);
  }
  
  &:active:not(:disabled) {
    transform: translateY(0);
  }
`;

const LoadingSpinner = styled(motion.div)`
  width: 40px;
  height: 40px;
  border: 3px solid var(--text-secondary);
  border-top: 3px solid var(--accent-yellow);
  border-radius: 50%;
  margin: 40px auto;
`;

const SelectionScreen: React.FC<SelectionScreenProps> = ({ onExchangesSelected }) => {
  const [exchanges, setExchanges] = useState<Exchange[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useTelegramWebApp();

  useEffect(() => {
    loadExchanges();
  }, []);

  const loadExchanges = async () => {
    try {
      setLoading(true);
      const exchangeData = await apiService.getAvailableExchanges();
      setExchanges(exchangeData);
    } catch (err) {
      setError('Failed to load exchanges');
      console.error('Error loading exchanges:', err);
    } finally {
      setLoading(false);
    }
  };

  const toggleExchange = (exchangeId: string) => {
    setExchanges(prev => 
      prev.map(exchange => 
        exchange.id === exchangeId 
          ? { ...exchange, isSelected: !exchange.isSelected }
          : exchange
      )
    );
  };

  const selectedExchanges = exchanges.filter(e => e.isSelected);

  const handleContinue = () => {
    const selectedIds = selectedExchanges.map(e => e.id);
    
    // Save preferences if user is available
    if (user?.id) {
      apiService.saveUserPreferences(user.id.toString(), selectedIds);
    }
    
    onExchangesSelected(selectedIds);
  };

  if (loading) {
    return (
      <Container>
        <Header>
          <Title>Loading Exchanges...</Title>
        </Header>
        <LoadingSpinner
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
        />
      </Container>
    );
  }

  if (error) {
    return (
      <Container>
        <Header>
          <Title>Error</Title>
          <Subtitle>{error}</Subtitle>
        </Header>
      </Container>
    );
  }

  return (
    <Container>
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <Header>
          <Title>Select Exchanges</Title>
          <Subtitle>
            Choose the exchanges you want to monitor for arbitrage opportunities
          </Subtitle>
        </Header>
      </motion.div>

      <ExchangeList>
        {exchanges.map((exchange, index) => (
          <ExchangeCard
            key={exchange.id}
            isSelected={exchange.isSelected}
            onClick={() => toggleExchange(exchange.id)}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3, delay: index * 0.05 }}
            whileTap={{ scale: 0.98 }}
          >
            <ExchangeLogo>
              {exchange.logo}
            </ExchangeLogo>
            <ExchangeInfo>
              <ExchangeName isSelected={exchange.isSelected}>
                {exchange.displayName}
              </ExchangeName>
              <ExchangeStatus isSelected={exchange.isSelected}>
                {exchange.isSelected ? 'Selected' : 'Tap to select'}
              </ExchangeStatus>
            </ExchangeInfo>
            <CheckIcon
              isSelected={exchange.isSelected}
              initial={{ scale: 0 }}
              animate={{ scale: exchange.isSelected ? 1 : 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 20 }}
            >
              {exchange.isSelected && <Check size={16} />}
            </CheckIcon>
          </ExchangeCard>
        ))}
      </ExchangeList>

      <Footer>
        <ContinueButton
          disabled={selectedExchanges.length === 0}
          onClick={handleContinue}
          whileTap={{ scale: selectedExchanges.length > 0 ? 0.98 : 1 }}
        >
          Continue with {selectedExchanges.length} exchange{selectedExchanges.length !== 1 ? 's' : ''}
          <ChevronRight size={20} />
        </ContinueButton>
      </Footer>
    </Container>
  );
};

export default SelectionScreen;
