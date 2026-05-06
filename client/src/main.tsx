import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { HelmetProvider } from 'react-helmet-async'
import { AuthProvider } from './context/AuthContext'
import { PreferencesProvider } from './context/PreferencesContext'
import { ShortlistProvider } from './context/ShortlistContext'
import { initGA } from './utils/analytics'
import './index.css'
import App from './App.tsx'

initGA()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <HelmetProvider>
      <BrowserRouter>
        <AuthProvider>
          <PreferencesProvider>
            <ShortlistProvider>
              <App />
            </ShortlistProvider>
          </PreferencesProvider>
        </AuthProvider>
      </BrowserRouter>
    </HelmetProvider>
  </StrictMode>,
)
