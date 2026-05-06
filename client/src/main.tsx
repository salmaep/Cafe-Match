import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { APIProvider } from '@vis.gl/react-google-maps'
import { HelmetProvider } from 'react-helmet-async'
import { AuthProvider } from './context/AuthContext'
import { PreferencesProvider } from './context/PreferencesContext'
import { ShortlistProvider } from './context/ShortlistContext'
import { initGA } from './utils/analytics'
import './index.css'
import App from './App.tsx'

const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY ?? ''

initGA()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <HelmetProvider>
      <APIProvider apiKey={GOOGLE_MAPS_API_KEY}>
        <BrowserRouter>
          <AuthProvider>
            <PreferencesProvider>
              <ShortlistProvider>
                <App />
              </ShortlistProvider>
            </PreferencesProvider>
          </AuthProvider>
        </BrowserRouter>
      </APIProvider>
    </HelmetProvider>
  </StrictMode>,
)
