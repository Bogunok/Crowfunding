globalThis.global = globalThis;
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { Web3ContextProvider } from './context/Web3Context.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Web3ContextProvider>
    <App />
    </Web3ContextProvider>
  </StrictMode>,
)
