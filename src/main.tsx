import React from 'react';
import { createRoot } from 'react-dom/client';
import 'leaflet/dist/leaflet.css';
import './styles.css';
import App from './App';

<<<<<<< HEAD
createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);

// Cache only this static app shell. Road tiles, Firebase data and credentials
// never enter the service worker's cache.
if (import.meta.env.PROD && "serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    void navigator.serviceWorker.register("/sw.js").catch(() => {
      // Device/browser policy can disable offline shell caching.
    });
  });
}
=======
createRoot(document.getElementById('root')!).render(<React.StrictMode><App /></React.StrictMode>);
>>>>>>> 3361aa4154425a8c6e1712ef2bf88f55419d7048
