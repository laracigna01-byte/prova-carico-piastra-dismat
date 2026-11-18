import { StrictMode, Suspense, lazy } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
const OfficeApp = lazy(() => import('./office/OfficeApp.jsx'))
const officeRoute = window.location.pathname.replace(/\/+$/, '') === '/ufficio'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    {officeRoute ? <Suspense fallback={<div style={{padding:24}}>Caricamento area ufficio…</div>}><OfficeApp /></Suspense> : <App />}
  </StrictMode>,
)
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("/service-worker.js")
      .then(() => console.log("Service Worker registrato"))
      .catch((err) => console.error("Errore Service Worker:", err));
  });
}