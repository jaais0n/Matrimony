import { createRoot } from 'react-dom/client';

import { setAuthTokenGetter } from '@workspace/api-client-react';

import App from './App';
import { ErrorBoundary } from '@/components/error-boundary';

import './index.css';

// Automatically provide current user token/ID to all API requests
setAuthTokenGetter(() => {
  try {
    const raw = localStorage.getItem('pm_auth_user');
    if (raw) {
      const u = JSON.parse(raw);
      return u?.id || null;
    }
  } catch {}
  return null;
});


createRoot(document.getElementById('root')!, {
  // Keeps caught errors off reportError(), which would raise the dev overlay.
  onCaughtError: (error, errorInfo) => {
    console.error(error, errorInfo.componentStack);
  },
}).render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>,
);
