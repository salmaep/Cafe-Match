import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { PreferencesProvider } from './context/PreferencesContext'
import { ShortlistProvider } from './context/ShortlistContext'
import './index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <PreferencesProvider>
          <ShortlistProvider>
            <App />
          </ShortlistProvider>
        </PreferencesProvider>
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
)
