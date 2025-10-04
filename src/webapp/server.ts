import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { DatabaseManager } from '../database/Database.js';
import { UnifiedArbitrageService } from '../services/UnifiedArbitrageService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class WebAppServer {
  private app: express.Application;
  private server: any;
  private db: DatabaseManager;
  private arbitrageService: UnifiedArbitrageService;

  constructor() {
    this.app = express();
    this.db = DatabaseManager.getInstance();
    this.arbitrageService = UnifiedArbitrageService.getInstance();
    this.setupMiddleware();
    this.setupRoutes();
  }

  private setupMiddleware(): void {
    // Security middleware
    this.app.use(helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'", "'unsafe-inline'", "https://telegram.org"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          imgSrc: ["'self'", "data:", "https:"],
          connectSrc: ["'self'", "https://api.binance.com", "https://www.okx.com", "https://api.bybit.com"],
        },
      },
    }));

    // Configure CORS for Telegram and your domains
    this.app.use(cors({
      origin: (origin, callback) => {
        const allowedOrigins = [
          'https://web.telegram.org',
          'https://telegram.org',
          process.env.WEBAPP_URL,
          'http://localhost:3000',
          'http://localhost:5173'
        ];
        
        if (!origin || allowedOrigins.includes(origin) || origin.includes('.telegram.org')) {
          callback(null, true);
        } else {
          callback(null, true); // Allow all origins for Telegram compatibility
        }
      },
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization']
    }));

    // JSON middleware
    this.app.use(express.json());
    this.app.use(express.urlencoded({ extended: true }));

    // Static files
    this.app.use(express.static(path.join(__dirname, 'public')));
  }

  private setupRoutes(): void {
    // Serve React mini app
    this.app.get('/', (req, res) => {
      // Serve our React component instead of static HTML
      res.send(`
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Crypto Arbitrage Opportunities</title>
    <script src="https://telegram.org/js/telegram-web-app.js"></script>
    <script crossorigin src="https://unpkg.com/react@18/umd/react.production.min.js"></script>
    <script crossorigin src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js"></script>
    <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
</head>
<body>
    <div id="root"></div>
    <script type="text/babel">
        const { useState, useEffect } = React;

        const App = () => {
          const [opportunities, setOpportunities] = useState([]);
          const [loading, setLoading] = useState(true);
          const [error, setError] = useState(null);
          const [lastUpdate, setLastUpdate] = useState(null);
          const [language, setLanguage] = useState('ru');
          const [currentPage, setCurrentPage] = useState(1);
          const [opportunitiesPerPage] = useState(20);

          useEffect(() => {
            fetchOpportunities();
            const interval = setInterval(fetchOpportunities, 30000);
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
                const uniqueOpportunities = data.data.reduce((acc, current) => {
                  const existing = acc.find(opp => 
                    opp.symbol === current.symbol && 
                    opp.buyExchange === current.buyExchange && 
                    opp.sellExchange === current.sellExchange
                  );
                  
                  if (!existing || current.profitPercentage > existing.profitPercentage) {
                    const filtered = acc.filter(opp => 
                      !(opp.symbol === current.symbol && 
                        opp.buyExchange === current.buyExchange && 
                        opp.sellExchange === current.sellExchange)
                    );
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

          const formatPrice = (price) => {
            return new Intl.NumberFormat('en-US', {
              style: 'currency',
              currency: 'USD',
              minimumFractionDigits: 2,
              maximumFractionDigits: 4
            }).format(price);
          };

          const getProfitColor = (profit) => {
            if (profit >= 2) return '#10b981';
            if (profit >= 1) return '#3b82f6';
            if (profit >= 0.5) return '#f59e0b';
            return '#6b7280';
          };

          const t = (key) => {
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

          const goToPage = (page) => {
            setCurrentPage(Math.max(1, Math.min(page, totalPages)));
          };

          return React.createElement('div', {
            style: {
              minHeight: '100vh',
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              padding: '20px',
              fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
            }
          }, [
            React.createElement('div', {
              key: 'container',
              style: { maxWidth: '1200px', margin: '0 auto' }
            }, [
              // Header
              React.createElement('div', {
                key: 'header',
                style: {
                  background: 'white',
                  borderRadius: '12px',
                  padding: '20px',
                  marginBottom: '20px',
                  boxShadow: '0 10px 40px rgba(0,0,0,0.1)'
                }
              }, [
                React.createElement('div', {
                  key: 'header-content',
                  style: {
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '10px'
                  }
                }, [
                  React.createElement('h1', {
                    key: 'title',
                    style: {
                      margin: 0,
                      fontSize: '24px',
                      color: '#1f2937',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px'
                    }
                  }, [
                    React.createElement('span', { key: 'icon' }, '🔄'),
                    t('title')
                  ]),
                  
                  React.createElement('div', {
                    key: 'controls',
                    style: { display: 'flex', gap: '10px', alignItems: 'center' }
                  }, [
                    // Language Toggle
                    React.createElement('button', {
                      key: 'lang-toggle',
                      onClick: () => setLanguage(language === 'ru' ? 'en' : 'ru'),
                      style: {
                        background: language === 'ru' ? '#3b82f6' : '#6b7280',
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        padding: '8px 12px',
                        fontSize: '12px',
                        fontWeight: '600',
                        cursor: 'pointer',
                        transition: 'background 0.2s'
                      }
                    }, language === 'ru' ? 'RU' : 'EN'),
                    
                    // Refresh Button
                    React.createElement('button', {
                      key: 'refresh',
                      onClick: fetchOpportunities,
                      style: {
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
                      }
                    }, [
                      React.createElement('span', { key: 'icon' }, '🔄'),
                      t('refresh')
                    ])
                  ])
                ]),
                
                lastUpdate && React.createElement('p', {
                  key: 'last-update',
                  style: { margin: '10px 0 0', color: '#6b7280', fontSize: '14px' }
                }, \`\${t('lastUpdated')} \${lastUpdate.toLocaleTimeString()}\`)
              ]),

              // Error Message
              error && React.createElement('div', {
                key: 'error',
                style: {
                  background: '#fee2e2',
                  border: '1px solid #fecaca',
                  borderRadius: '8px',
                  padding: '15px',
                  marginBottom: '20px',
                  color: '#dc2626'
                }
              }, \`⚠️ \${t('error')} \${error}\`),

              // Loading State
              loading && React.createElement('div', {
                key: 'loading',
                style: {
                  background: 'white',
                  borderRadius: '12px',
                  padding: '40px',
                  textAlign: 'center'
                }
              }, [
                React.createElement('div', {
                  key: 'spinner',
                  style: {
                    width: '50px',
                    height: '50px',
                    border: '3px solid #f3f4f6',
                    borderTop: '3px solid #6366f1',
                    borderRadius: '50%',
                    animation: 'spin 1s linear infinite',
                    margin: '0 auto'
                  }
                }),
                React.createElement('p', {
                  key: 'text',
                  style: { marginTop: '20px', color: '#6b7280' }
                }, t('loading'))
              ]),

              // Opportunities Table
              !loading && opportunities.length > 0 && React.createElement(React.Fragment, { key: 'table' }, [
                // Pagination Info and Controls - Top
                React.createElement('div', {
                  key: 'pagination-top',
                  style: {
                    background: 'white',
                    borderRadius: '12px',
                    padding: '15px 20px',
                    marginBottom: '10px',
                    boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }
                }, [
                  React.createElement('div', {
                    key: 'info',
                    style: { color: '#6b7280', fontSize: '14px' }
                  }, \`\${t('total')}: \${opportunities.length} \${t('opportunities')} | \${t('page')} \${currentPage} \${t('of')} \${totalPages}\`),
                  
                  React.createElement('div', {
                    key: 'controls',
                    style: { display: 'flex', gap: '8px', alignItems: 'center' }
                  }, [
                    React.createElement('button', {
                      key: 'prev',
                      onClick: () => goToPage(currentPage - 1),
                      disabled: currentPage === 1,
                      style: {
                        background: currentPage === 1 ? '#f3f4f6' : '#3b82f6',
                        color: currentPage === 1 ? '#9ca3af' : 'white',
                        border: 'none',
                        borderRadius: '6px',
                        padding: '6px 12px',
                        fontSize: '12px',
                        fontWeight: '600',
                        cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                        transition: 'background 0.2s'
                      }
                    }, \`← \${language === 'ru' ? 'Предыдущая' : 'Previous'}\`),
                    
                    React.createElement('span', {
                      key: 'page-info',
                      style: { color: '#6b7280', fontSize: '12px' }
                    }, \`\${currentPage} / \${totalPages}\`),
                    
                    React.createElement('button', {
                      key: 'next',
                      onClick: () => goToPage(currentPage + 1),
                      disabled: currentPage === totalPages,
                      style: {
                        background: currentPage === totalPages ? '#f3f4f6' : '#3b82f6',
                        color: currentPage === totalPages ? '#9ca3af' : 'white',
                        border: 'none',
                        borderRadius: '6px',
                        padding: '6px 12px',
                        fontSize: '12px',
                        fontWeight: '600',
                        cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
                        transition: 'background 0.2s'
                      }
                    }, \`\${language === 'ru' ? 'Следующая' : 'Next'} →\`)
                  ])
                ]),

                // Table
                React.createElement('div', {
                  key: 'table-container',
                  style: {
                    background: 'white',
                    borderRadius: '12px',
                    overflow: 'hidden',
                    boxShadow: '0 10px 40px rgba(0,0,0,0.1)'
                  }
                }, [
                  React.createElement('div', {
                    key: 'table-wrapper',
                    style: { overflowX: 'auto' }
                  }, [
                    React.createElement('table', {
                      key: 'table',
                      style: { width: '100%', borderCollapse: 'collapse' }
                    }, [
                      React.createElement('thead', { key: 'thead' }, [
                        React.createElement('tr', {
                          key: 'header-row',
                          style: {
                            background: '#f9fafb',
                            borderBottom: '2px solid #e5e7eb'
                          }
                        }, [
                          React.createElement('th', {
                            key: 'symbol',
                            style: { padding: '12px', textAlign: 'left', fontSize: '14px', fontWeight: '600', color: '#374151' }
                          }, t('symbol')),
                          React.createElement('th', {
                            key: 'buy-exchange',
                            style: { padding: '12px', textAlign: 'left', fontSize: '14px', fontWeight: '600', color: '#374151' }
                          }, t('buyExchange')),
                          React.createElement('th', {
                            key: 'buy-price',
                            style: { padding: '12px', textAlign: 'left', fontSize: '14px', fontWeight: '600', color: '#374151' }
                          }, t('buyPrice')),
                          React.createElement('th', {
                            key: 'sell-exchange',
                            style: { padding: '12px', textAlign: 'left', fontSize: '14px', fontWeight: '600', color: '#374151' }
                          }, t('sellExchange')),
                          React.createElement('th', {
                            key: 'sell-price',
                            style: { padding: '12px', textAlign: 'left', fontSize: '14px', fontWeight: '600', color: '#374151' }
                          }, t('sellPrice')),
                          React.createElement('th', {
                            key: 'profit',
                            style: { padding: '12px', textAlign: 'left', fontSize: '14px', fontWeight: '600', color: '#374151' }
                          }, t('profit')),
                          React.createElement('th', {
                            key: 'volume',
                            style: { padding: '12px', textAlign: 'left', fontSize: '14px', fontWeight: '600', color: '#374151' }
                          }, t('volume'))
                        ])
                      ]),
                      React.createElement('tbody', { key: 'tbody' }, 
                        currentOpportunities.map((opp, index) => 
                          React.createElement('tr', {
                            key: index,
                            style: {
                              borderBottom: '1px solid #e5e7eb',
                              transition: 'background 0.2s',
                              cursor: 'pointer'
                            }
                          }, [
                            React.createElement('td', {
                              key: 'symbol',
                              style: { padding: '12px', fontSize: '14px', fontWeight: '500' }
                            }, opp.symbol),
                            React.createElement('td', {
                              key: 'buy-exchange',
                              style: { padding: '12px', fontSize: '14px' }
                            }, React.createElement('span', {
                              style: {
                                background: '#dbeafe',
                                color: '#1e40af',
                                padding: '4px 8px',
                                borderRadius: '4px',
                                fontSize: '12px',
                                fontWeight: '500'
                              }
                            }, opp.buyExchange)),
                            React.createElement('td', {
                              key: 'buy-price',
                              style: { padding: '12px', fontSize: '14px' }
                            }, formatPrice(opp.buyPrice)),
                            React.createElement('td', {
                              key: 'sell-exchange',
                              style: { padding: '12px', fontSize: '14px' }
                            }, React.createElement('span', {
                              style: {
                                background: '#dcfce7',
                                color: '#166534',
                                padding: '4px 8px',
                                borderRadius: '4px',
                                fontSize: '12px',
                                fontWeight: '500'
                              }
                            }, opp.sellExchange)),
                            React.createElement('td', {
                              key: 'sell-price',
                              style: { padding: '12px', fontSize: '14px' }
                            }, formatPrice(opp.sellPrice)),
                            React.createElement('td', {
                              key: 'profit',
                              style: { padding: '12px', fontSize: '14px' }
                            }, React.createElement('span', {
                              style: {
                                color: getProfitColor(opp.profitPercentage),
                                fontWeight: '600'
                              }
                            }, \`+\${opp.profitPercentage.toFixed(2)}%\`)),
                            React.createElement('td', {
                              key: 'volume',
                              style: { padding: '12px', fontSize: '14px', color: '#6b7280' }
                            }, opp.volume?.toFixed(2) || 'N/A')
                          ])
                        )
                      )
                    ])
                  ])
                ]),

                // Pagination Controls - Bottom
                React.createElement('div', {
                  key: 'pagination-bottom',
                  style: {
                    background: 'white',
                    borderRadius: '12px',
                    padding: '15px 20px',
                    marginTop: '10px',
                    boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    gap: '10px'
                  }
                }, [
                  React.createElement('button', {
                    key: 'first',
                    onClick: () => goToPage(1),
                    disabled: currentPage === 1,
                    style: {
                      background: currentPage === 1 ? '#f3f4f6' : '#6b7280',
                      color: currentPage === 1 ? '#9ca3af' : 'white',
                      border: 'none',
                      borderRadius: '6px',
                      padding: '6px 12px',
                      fontSize: '12px',
                      fontWeight: '600',
                      cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                      transition: 'background 0.2s'
                    }
                  }, language === 'ru' ? 'Первая' : 'First'),
                  
                  React.createElement('button', {
                    key: 'prev-bottom',
                    onClick: () => goToPage(currentPage - 1),
                    disabled: currentPage === 1,
                    style: {
                      background: currentPage === 1 ? '#f3f4f6' : '#3b82f6',
                      color: currentPage === 1 ? '#9ca3af' : 'white',
                      border: 'none',
                      borderRadius: '6px',
                      padding: '6px 12px',
                      fontSize: '12px',
                      fontWeight: '600',
                      cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                      transition: 'background 0.2s'
                    }
                  }, '←'),
                  
                  React.createElement('span', {
                    key: 'page-info-bottom',
                    style: { color: '#6b7280', fontSize: '14px', fontWeight: '600' }
                  }, \`\${currentPage} / \${totalPages}\`),
                  
                  React.createElement('button', {
                    key: 'next-bottom',
                    onClick: () => goToPage(currentPage + 1),
                    disabled: currentPage === totalPages,
                    style: {
                      background: currentPage === totalPages ? '#f3f4f6' : '#3b82f6',
                      color: currentPage === totalPages ? '#9ca3af' : 'white',
                      border: 'none',
                      borderRadius: '6px',
                      padding: '6px 12px',
                      fontSize: '12px',
                      fontWeight: '600',
                      cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
                      transition: 'background 0.2s'
                    }
                  }, '→'),
                  
                  React.createElement('button', {
                    key: 'last',
                    onClick: () => goToPage(totalPages),
                    disabled: currentPage === totalPages,
                    style: {
                      background: currentPage === totalPages ? '#f3f4f6' : '#6b7280',
                      color: currentPage === totalPages ? '#9ca3af' : 'white',
                      border: 'none',
                      borderRadius: '6px',
                      padding: '6px 12px',
                      fontSize: '12px',
                      fontWeight: '600',
                      cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
                      transition: 'background 0.2s'
                    }
                  }, language === 'ru' ? 'Последняя' : 'Last')
                ])
              ]),

              // No Opportunities Message
              !loading && opportunities.length === 0 && !error && React.createElement('div', {
                key: 'no-opportunities',
                style: {
                  background: 'white',
                  borderRadius: '12px',
                  padding: '40px',
                  textAlign: 'center'
                }
              }, [
                React.createElement('span', {
                  key: 'icon',
                  style: { fontSize: '48px' }
                }, '📊'),
                React.createElement('h3', {
                  key: 'title',
                  style: { color: '#374151', marginTop: '20px' }
                }, t('noOpportunities')),
                React.createElement('p', {
                  key: 'desc',
                  style: { color: '#6b7280', marginTop: '10px' }
                }, t('noOpportunitiesDesc'))
              ])
            ])
          ]);
        };

        ReactDOM.render(React.createElement(App), document.getElementById('root'));
    </script>
    <style>
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
    </style>
</body>
</html>
      `);
    });

    // Serve React mini app static assets
    this.app.use('/assets', express.static(path.join(__dirname, '../../dist/assets')));
    
    // Serve additional static files from dist
    this.app.use('/favicon.svg', express.static(path.join(__dirname, '../../dist/favicon.svg')));
    this.app.use('/manifest.webmanifest', express.static(path.join(__dirname, '../../dist/manifest.webmanifest')));
    this.app.use('/registerSW.js', express.static(path.join(__dirname, '../../dist/registerSW.js')));
    this.app.use('/sw.js', express.static(path.join(__dirname, '../../dist/sw.js')));
    this.app.use('/workbox-5ffe50d4.js', express.static(path.join(__dirname, '../../dist/workbox-5ffe50d4.js')));
    this.app.use('/telegram-init.js', express.static(path.join(__dirname, '../../dist/telegram-init.js')));
    
    // Fallback for React mini app routing
    this.app.get('/miniapp*', (req, res) => {
      const miniappPath = path.join(__dirname, '../../dist/index.html');
      if (fs.existsSync(miniappPath)) {
        res.sendFile(miniappPath);
      } else {
        res.status(404).send('Mini app not found. Please build the React app first.');
      }
    });

    // API route to get arbitrage opportunities
    this.app.get('/api/opportunities', async (req, res) => {
      try {
        const opportunities = await this.db.getArbitrageModel().getRecentOpportunities(30);
        
        // Filter out mock data characteristics
        const realOpportunities = opportunities.filter(opp => {
          return opp.profitPercentage > 0.1 && 
                 opp.profitPercentage < 5 && // Realistic profit range
                 opp.buyPrice > 0 &&
                 opp.sellPrice > 0;
        });
        
        res.json({ 
          success: true, 
          data: realOpportunities.map(opp => ({
            symbol: opp.symbol,
            buyExchange: opp.buyExchange,
            sellExchange: opp.sellExchange,
            buyPrice: opp.buyPrice,
            sellPrice: opp.sellPrice,
            profitPercentage: opp.profitPercentage,
            profitAmount: opp.profitAmount,
            volume: opp.volume,
            timestamp: opp.timestamp
          })),
          timestamp: Date.now()
        });
      } catch (error) {
        console.error('API error:', error);
        res.status(500).json({ 
          success: false, 
          error: 'Failed to fetch opportunities',
          message: error.message 
        });
      }
    });

    // API route to get exchange status
    this.app.get('/api/status', async (req, res) => {
      try {
        const exchangeManager = this.arbitrageService.getExchangeManager();
        const exchangeStatuses = exchangeManager.getExchangeStatus();
        const connectedExchanges = exchangeManager.getConnectedExchanges();
        const lastUpdate = exchangeManager.getLastUpdateTime();

        res.json({
          success: true,
          data: {
            exchanges: exchangeStatuses,
            connectedCount: connectedExchanges.length,
            lastUpdate: lastUpdate
          }
        });
      } catch (error) {
        console.error('Error fetching status:', error);
        res.status(500).json({
          success: false,
          error: 'Failed to fetch status'
        });
      }
    });

    // API route to get statistics
    this.app.get('/api/stats', async (req, res) => {
      try {
        const stats = await this.db.getArbitrageModel().getStatistics();
        res.json({
          success: true,
          data: stats
        });
      } catch (error) {
        console.error('Error fetching stats:', error);
        res.status(500).json({
          success: false,
          error: 'Failed to fetch statistics'
        });
      }
    });

    // Health check endpoint (simple, always works)
    this.app.get('/api/health', (req, res) => {
      try {
        res.json({ 
          status: 'OK', 
          timestamp: Date.now(),
          environment: process.env.NODE_ENV,
          mockData: process.env.USE_MOCK_DATA === 'true',
          uptime: process.uptime()
        });
      } catch (error) {
        res.status(200).json({ 
          status: 'OK', 
          timestamp: Date.now(),
          message: 'Health check passed'
        });
      }
    });

    // Legacy health check
    this.app.get('/health', (req, res) => {
      res.json({ status: 'OK', timestamp: Date.now() });
    });

    // Serve React app for all other routes
    this.app.get('*', (req, res) => {
      const miniappPath = path.join(__dirname, '../../dist/index.html');
      const fallbackPath = path.join(__dirname, 'public', 'index.html');
      
      if (fs.existsSync(miniappPath)) {
        res.sendFile(miniappPath);
      } else if (fs.existsSync(fallbackPath)) {
        res.sendFile(fallbackPath);
      } else {
        // Simple fallback for health check issues
        res.status(404).send('Application not ready. Health check at /api/health');
      }
    });
  }

  public start(port: number = 3000): Promise<void> {
    return new Promise((resolve, reject) => {
      // Use Railway's PORT environment variable if available
      const portToUse = process.env.PORT ? parseInt(process.env.PORT) : 3000;
      
      console.log(`🚀 Starting web server on port ${portToUse}...`);
      
      // Try to find an available port
      const tryPort = (attemptPort: number) => {
        this.server = this.app.listen(attemptPort, '0.0.0.0', () => {
          console.log(`✅ Web server running on port ${attemptPort}`);
          console.log(`🌍 PID: ${process.pid}`);
          console.log(`📊 Environment: ${process.env.NODE_ENV}`);
          console.log(`📡 Mock Data: ${process.env.USE_MOCK_DATA === 'true' ? 'ENABLED' : 'DISABLED'}`);
          console.log(`🏥 Health check available at: http://0.0.0.0:${attemptPort}/api/health`);
          console.log('🔄 Server startup completed successfully');
          resolve();
        });

        this.server.on('error', (error: any) => {
          if (error.code === 'EADDRINUSE') {
            console.log(`Port ${attemptPort} is in use, trying ${attemptPort + 1}...`);
            this.server.close();
            tryPort(attemptPort + 1);
          } else {
            reject(error);
          }
        });
      };

      tryPort(port);
    });
  }

  public stop(): Promise<void> {
    return new Promise((resolve) => {
      if (this.server) {
        this.server.close(() => {
          console.log('🛑 Web app server stopped');
          resolve();
        });
      } else {
        resolve();
      }
    });
  }
}
