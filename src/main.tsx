import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import { ErrorBoundary } from './components/ErrorBoundary.tsx';
import './index.css';

// Safe cleanup of legacy service workers and clear cache storage
if (typeof window !== 'undefined') {
  try {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistrations().then((registrations) => {
        if (registrations && registrations.length) {
          for (const registration of registrations) {
            registration.unregister().catch(() => {});
          }
        }
      }).catch(() => {});
    }
  } catch (e) {}

  try {
    if ('caches' in window) {
      caches.keys().then((names) => {
        if (names && names.length) {
          for (const name of names) {
            caches.delete(name).catch(() => {});
          }
        }
      }).catch(() => {});
    }
  } catch (e) {}
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary fallbackTitle="خطای کلی در بارگذاری سامانه اشک ۲۴">
      <App />
    </ErrorBoundary>
  </StrictMode>,
);
