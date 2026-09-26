import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { HashRouter } from 'react-router-dom'
import App from './App'
import { HuntProvider } from './lib/HuntContext'
import { ensureVersion } from './lib/storage'
import './styles.css'

ensureVersion()

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <HashRouter>
      <HuntProvider>
        <App />
      </HuntProvider>
    </HashRouter>
  </StrictMode>
)
