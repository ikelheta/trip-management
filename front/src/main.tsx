import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './shared/styles/index.css'
import App from './app/App.tsx'
import { connectSessionToApi } from './app/providers/connectSessionToApi.ts'
import { initLanguage } from './shared/i18n/language.ts'

// Before the first render: <html lang dir> is right from the first paint.
initLanguage()
connectSessionToApi()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
