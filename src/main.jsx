import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { HashRouter } from 'react-router-dom'
import App from './App'
import { HuntProvider } from './lib/HuntContext'
import './styles.css'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <HashRouter>
      <HuntProvider>
        <App />
      </HuntProvider>
    </HashRouter>
  </StrictMode>
)
