import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';

import '@personal-assistant-hub/i18n';

import { createAuth } from '@/services/auth';

import { App } from './App';
import './index.css';

// Create auth instance with API configuration
const auth = createAuth({
  apiBaseUrl: import.meta.env.VITE_API_URL,
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
);

// Export auth instance for use in components
export { auth };
