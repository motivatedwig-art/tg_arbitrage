import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

// Ensure the Telegram WebApp script is loaded
if (!window.Telegram) {
  const script = document.createElement('script');
  script.src = 'https://telegram.org/js/telegram-web-app.js';
  script.async = true;
  document.head.appendChild(script);
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
