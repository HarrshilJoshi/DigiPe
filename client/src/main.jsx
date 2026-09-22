import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './services/apiClient.js'
import App from './App.jsx'

// Automated Service Worker Cleanup:
// This script unregisters any service workers previously registered on this port (localhost).
// Why? Service workers cache resources aggressively. If another project (like an old React app) was run 
// on localhost:5173, its service worker might hijack network requests for this app, serving cached 
// HTML/JS files from the other project and causing unexpected white screens or API failures in development.
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then((registrations) => {
    for (const registration of registrations) {
      registration.unregister().then((success) => {
        if (success) {
          console.log('Stale service worker found and unregistered to prevent caching conflict.');
          window.location.reload();
        }
      });
    }
  });
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
