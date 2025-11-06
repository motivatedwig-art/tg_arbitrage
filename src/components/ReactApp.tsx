import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom/client';

interface ArbitrageOpportunity {
  symbol: string;
  buyExchange: string;
  sellExchange: string;
  buyPrice: number;
  sellPrice: number;
  profitPercentage: number;
  profitAmount: number;
  volume: number;
  timestamp: number;
  blockchain?: string; // e.g., 'ethereum', 'bsc', 'polygon', 'arbitrum', 'optimism', 'solana', 'tron'
}

const App: React.FC = () => {
  const [opportunities, setOpportunities] = useState<ArbitrageOpportunity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [language, setLanguage] = useState<'ru' | 'en'>('ru');
  const [currentPage, setCurrentPage] = useState(1);
  const [opportunitiesPerPage] = useState(20);

  useEffect(() => {
    fetchOpportunities();
    const interval = setInterval(fetchOpportunities, 600000);
    return () => clearInterval(interval);
  }, []);

  const fetchOpportunities = async () => {
    try {
      setError(null);
      const response = await fetch('/api/opportunities');
      if (!response.ok) throw new Error('Failed to fetch data');
      
      const data = await response.json();
      if (data.success && data.data) {
        // Filter to show only the most profitable opportunity per coin pair
        // CRITICAL: Include blockchain in key to prevent cross-chain duplicates
        const uniqueOpportunities = data.data.reduce((acc: ArbitrageOpportunity[], current: ArbitrageOpportunity) => {
          // Normalize blockchain for key (use null if not set, don't default to 'ethereum')
          const blockchainKey = (current.blockchain || 'null').toLowerCase();
          const key = `${current.symbol}-${blockchainKey}-${current.buyExchange}-${current.sellExchange}`;
          const existing = acc.find(opp => {
            const oppBlockchainKey = (opp.blockchain || 'null').toLowerCase();
            return opp.symbol === current.symbol && 
                   oppBlockchainKey === blockchainKey &&
                   opp.buyExchange === current.buyExchange && 
                   opp.sellExchange === current.sellExchange;
          });
          
          if (!existing || current.profitPercentage > existing.profitPercentage) {
            // Remove existing if it exists, then add current
            const filtered = acc.filter(opp => {
              const oppBlockchainKey = (opp.blockchain || 'null').toLowerCase();
              return !(opp.symbol === current.symbol && 
                      oppBlockchainKey === blockchainKey &&
                      opp.buyExchange === current.buyExchange && 
                      opp.sellExchange === current.sellExchange);
            });
            filtered.push(current);
            return filtered;
          }
          
          return acc;
        }, []);
        
        // Sort by profit percentage (highest first)
        uniqueOpportunities.sort((a, b) => b.profitPercentage - a.profitPercentage);
        
        setOpportunities(uniqueOpportunities);
        setLastUpdate(new Date());
      } else {
        throw new Error('Invalid data format');
      }
    } catch (error) {
      console.error('Failed to fetch opportunities:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 4
    }).format(price);
  };

  const getProfitColor = (profit: number) => {
    if (profit >= 2) return '#10b981';
    if (profit >= 1) return '#3b82f6';
    if (profit >= 0.5) return '#f59e0b';
    return '#6b7280';
  };

  const t = (key: string) => {
    const translations = {
      ru: {
        title: '🔄 Сканер Арбитража Криптовалют',
        lastUpdated: 'Последнее обновление:',
        error: 'Ошибка:',
        loading: 'Сканирование бирж для поиска арбитражных возможностей...',
        noOpportunities: 'Арбитражные возможности не найдены',
        noOpportunitiesDesc: 'Рынок в настоящее время сбалансирован. Проверьте через несколько минут для новых возможностей.',
        symbol: 'Символ',
        buyExchange: 'Биржа покупки',
        buyPrice: 'Цена покупки',
        sellExchange: 'Биржа продажи',
        sellPrice: 'Цена продажи',
        profit: 'Прибыль %',
        volume: 'Объем',
        refresh: 'Обновить',
        language: 'Язык',
        page: 'Страница',
        of: 'из',
        total: 'Всего',
        opportunities: 'возможностей'
      },
      en: {
        title: '🔄 Crypto Arbitrage Scanner',
        lastUpdated: 'Last updated:',
        error: 'Error:',
        loading: 'Scanning exchanges for arbitrage opportunities...',
        noOpportunities: 'No Arbitrage Opportunities Found',
        noOpportunitiesDesc: 'The market is currently balanced. Check back in a few moments for new opportunities.',
        symbol: 'Symbol',
        buyExchange: 'Buy Exchange',
        buyPrice: 'Buy Price',
        sellExchange: 'Sell Exchange',
        sellPrice: 'Sell Price',
        profit: 'Profit %',
        volume: 'Volume',
        refresh: 'Refresh',
        language: 'Language',
        page: 'Page',
        of: 'of',
        total: 'Total',
        opportunities: 'opportunities'
      }
    };
    return translations[language][key] || key;
  };

  // Pagination logic
  const totalPages = Math.ceil(opportunities.length / opportunitiesPerPage);
  const startIndex = (currentPage - 1) * opportunitiesPerPage;
  const endIndex = startIndex + opportunitiesPerPage;
  const currentOpportunities = opportunities.slice(startIndex, endIndex);

  const goToPage = (page: number) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)));
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      padding: '20px',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
    }}>
      <div style={{
        maxWidth: '1200px',
        margin: '0 auto'
      }}>
        {/* Header */}
        <div style={{
          background: 'white',
          borderRadius: '12px',
          padding: '20px',
          marginBottom: '20px',
          boxShadow: '0 10px 40px rgba(0,0,0,0.1)'
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '10px'
          }}>
            <h1 style={{
              margin: 0,
              fontSize: '24px',
              color: '#1f2937',
              display: 'flex',
              alignItems: 'center',
              gap: '10px'
            }}>
              <span>🔄</span>
              {t('title')}
            </h1>
            
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
              {/* Language Toggle */}
              <button
                onClick={() => setLanguage(language === 'ru' ? 'en' : 'ru')}
                style={{
                  background: language === 'ru' ? '#3b82f6' : '#6b7280',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  padding: '8px 12px',
                  fontSize: '12px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'background 0.2s'
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = language === 'ru' ? '#2563eb' : '#4b5563'}
                onMouseLeave={(e) => e.currentTarget.style.background = language === 'ru' ? '#3b82f6' : '#6b7280'}
              >
                {language === 'ru' ? 'RU' : 'EN'}
              </button>
              
              {/* Refresh Button */}
              <button
                onClick={fetchOpportunities}
                style={{
                  background: '#10b981',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  padding: '8px 12px',
                  fontSize: '12px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'background 0.2s',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = '#059669'}
                onMouseLeave={(e) => e.currentTarget.style.background = '#10b981'}
              >
                <span>🔄</span>
                {t('refresh')}
              </button>
            </div>
          </div>
          
          {lastUpdate && (
            <p style={{ margin: '10px 0 0', color: '#6b7280', fontSize: '14px' }}>
              {t('lastUpdated')} {lastUpdate.toLocaleTimeString()}
            </p>
          )}
        </div>

        {/* Error Message */}
        {error && (
          <div style={{
            background: '#fee2e2',
            border: '1px solid #fecaca',
            borderRadius: '8px',
            padding: '15px',
            marginBottom: '20px',
            color: '#dc2626'
          }}>
            ⚠️ {t('error')} {error}
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div style={{
            background: 'white',
            borderRadius: '12px',
            padding: '40px',
            textAlign: 'center'
          }}>
            <div style={{
              width: '50px',
              height: '50px',
              border: '3px solid #f3f4f6',
              borderTop: '3px solid #6366f1',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite',
              margin: '0 auto'
            }}>
            </div>
            <p style={{ marginTop: '20px', color: '#6b7280' }}>
              {t('loading')}
            </p>
          </div>
        )}

        {/* Opportunities Table */}
        {!loading && opportunities.length > 0 && (
          <>
            {/* Pagination Info and Controls - Top */}
            <div style={{
              background: 'white',
              borderRadius: '12px',
              padding: '15px 20px',
              marginBottom: '10px',
              boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <div style={{ color: '#6b7280', fontSize: '14px' }}>
                {t('total')}: {opportunities.length} {t('opportunities')} | {t('page')} {currentPage} {t('of')} {totalPages}
              </div>
              
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <button
                  onClick={() => goToPage(currentPage - 1)}
                  disabled={currentPage === 1}
                  style={{
                    background: currentPage === 1 ? '#f3f4f6' : '#3b82f6',
                    color: currentPage === 1 ? '#9ca3af' : 'white',
                    border: 'none',
                    borderRadius: '6px',
                    padding: '6px 12px',
                    fontSize: '12px',
                    fontWeight: '600',
                    cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                    transition: 'background 0.2s'
                  }}
                >
                  ← {language === 'ru' ? 'Предыдущая' : 'Previous'}
                </button>
                
                <span style={{ color: '#6b7280', fontSize: '12px' }}>
                  {currentPage} / {totalPages}
                </span>
                
                <button
                  onClick={() => goToPage(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  style={{
                    background: currentPage === totalPages ? '#f3f4f6' : '#3b82f6',
                    color: currentPage === totalPages ? '#9ca3af' : 'white',
                    border: 'none',
                    borderRadius: '6px',
                    padding: '6px 12px',
                    fontSize: '12px',
                    fontWeight: '600',
                    cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
                    transition: 'background 0.2s'
                  }}
                >
                  {language === 'ru' ? 'Следующая' : 'Next'} →
                </button>
              </div>
            </div>

            <div style={{
              background: 'white',
              borderRadius: '12px',
              overflow: 'hidden',
              boxShadow: '0 10px 40px rgba(0,0,0,0.1)'
            }}>
              <div style={{
                overflowX: 'auto'
              }}>
                <table style={{
                  width: '100%',
                  borderCollapse: 'collapse'
                }}>
                  <thead>
                    <tr style={{
                      background: '#f9fafb',
                      borderBottom: '2px solid #e5e7eb'
                    }}>
                      <th style={{ padding: '12px', textAlign: 'left', fontSize: '14px', fontWeight: '600', color: '#374151' }}>
                        {t('symbol')}
                      </th>
                      <th style={{ padding: '12px', textAlign: 'left', fontSize: '14px', fontWeight: '600', color: '#374151' }}>
                        {t('buyExchange')}
                      </th>
                      <th style={{ padding: '12px', textAlign: 'left', fontSize: '14px', fontWeight: '600', color: '#374151' }}>
                        {t('buyPrice')}
                      </th>
                      <th style={{ padding: '12px', textAlign: 'left', fontSize: '14px', fontWeight: '600', color: '#374151' }}>
                        {t('sellExchange')}
                      </th>
                      <th style={{ padding: '12px', textAlign: 'left', fontSize: '14px', fontWeight: '600', color: '#374151' }}>
                        {t('sellPrice')}
                      </th>
                      <th style={{ padding: '12px', textAlign: 'left', fontSize: '14px', fontWeight: '600', color: '#374151' }}>
                        {t('profit')}
                      </th>
                      <th style={{ padding: '12px', textAlign: 'left', fontSize: '14px', fontWeight: '600', color: '#374151' }}>
                        {t('volume')}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {currentOpportunities.map((opp, index) => (
                      <tr key={index} style={{
                        borderBottom: '1px solid #e5e7eb',
                        transition: 'background 0.2s',
                        cursor: 'pointer'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.background = '#f9fafb'}
                      onMouseLeave={(e) => e.currentTarget.style.background = 'white'}
                      >
                        <td style={{ padding: '12px', fontSize: '14px', fontWeight: '500' }}>
                          {opp.symbol}
                        </td>
                        <td style={{ padding: '12px', fontSize: '14px' }}>
                          <span style={{
                            background: '#dbeafe',
                            color: '#1e40af',
                            padding: '4px 8px',
                            borderRadius: '4px',
                            fontSize: '12px',
                            fontWeight: '500'
                          }}>
                            {opp.buyExchange}
                          </span>
                        </td>
                        <td style={{ padding: '12px', fontSize: '14px' }}>
                          {formatPrice(opp.buyPrice)}
                        </td>
                        <td style={{ padding: '12px', fontSize: '14px' }}>
                          <span style={{
                            background: '#dcfce7',
                            color: '#166534',
                            padding: '4px 8px',
                            borderRadius: '4px',
                            fontSize: '12px',
                            fontWeight: '500'
                          }}>
                            {opp.sellExchange}
                          </span>
                        </td>
                        <td style={{ padding: '12px', fontSize: '14px' }}>
                          {formatPrice(opp.sellPrice)}
                        </td>
                        <td style={{ padding: '12px', fontSize: '14px' }}>
                          <span style={{
                            color: getProfitColor(opp.profitPercentage),
                            fontWeight: '600'
                          }}>
                            +{opp.profitPercentage.toFixed(2)}%
                          </span>
                        </td>
                        <td style={{ padding: '12px', fontSize: '14px', color: '#6b7280' }}>
                          {opp.volume?.toFixed(2) || 'N/A'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Pagination Controls - Bottom */}
            <div style={{
              background: 'white',
              borderRadius: '12px',
              padding: '15px 20px',
              marginTop: '10px',
              boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              gap: '10px'
            }}>
              <button
                onClick={() => goToPage(1)}
                disabled={currentPage === 1}
                style={{
                  background: currentPage === 1 ? '#f3f4f6' : '#6b7280',
                  color: currentPage === 1 ? '#9ca3af' : 'white',
                  border: 'none',
                  borderRadius: '6px',
                  padding: '6px 12px',
                  fontSize: '12px',
                  fontWeight: '600',
                  cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                  transition: 'background 0.2s'
                }}
              >
                {language === 'ru' ? 'Первая' : 'First'}
              </button>
              
              <button
                onClick={() => goToPage(currentPage - 1)}
                disabled={currentPage === 1}
                style={{
                  background: currentPage === 1 ? '#f3f4f6' : '#3b82f6',
                  color: currentPage === 1 ? '#9ca3af' : 'white',
                  border: 'none',
                  borderRadius: '6px',
                  padding: '6px 12px',
                  fontSize: '12px',
                  fontWeight: '600',
                  cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                  transition: 'background 0.2s'
                }}
              >
                ←
              </button>
              
              <span style={{ color: '#6b7280', fontSize: '14px', fontWeight: '600' }}>
                {currentPage} / {totalPages}
              </span>
              
              <button
                onClick={() => goToPage(currentPage + 1)}
                disabled={currentPage === totalPages}
                style={{
                  background: currentPage === totalPages ? '#f3f4f6' : '#3b82f6',
                  color: currentPage === totalPages ? '#9ca3af' : 'white',
                  border: 'none',
                  borderRadius: '6px',
                  padding: '6px 12px',
                  fontSize: '12px',
                  fontWeight: '600',
                  cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
                  transition: 'background 0.2s'
                }}
              >
                →
              </button>
              
              <button
                onClick={() => goToPage(totalPages)}
                disabled={currentPage === totalPages}
                style={{
                  background: currentPage === totalPages ? '#f3f4f6' : '#6b7280',
                  color: currentPage === totalPages ? '#9ca3af' : 'white',
                  border: 'none',
                  borderRadius: '6px',
                  padding: '6px 12px',
                  fontSize: '12px',
                  fontWeight: '600',
                  cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
                  transition: 'background 0.2s'
                }}
              >
                {language === 'ru' ? 'Последняя' : 'Last'}
              </button>
            </div>
          </>
        )}

        {/* No Opportunities Message */}
        {!loading && opportunities.length === 0 && !error && (
          <div style={{
            background: 'white',
            borderRadius: '12px',
            padding: '40px',
            textAlign: 'center'
          }}>
            <span style={{ fontSize: '48px' }}>📊</span>
            <h3 style={{ color: '#374151', marginTop: '20px' }}>{t('noOpportunities')}</h3>
            <p style={{ color: '#6b7280', marginTop: '10px' }}>
              {t('noOpportunitiesDesc')}
            </p>
          </div>
        )}
      </div>

      {/* CSS Animation */}
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default App;

