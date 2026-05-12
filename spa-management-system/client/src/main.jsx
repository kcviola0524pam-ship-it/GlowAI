import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'
import { cleanupStorage } from './utils/cleanupStorage'

// Clean up corrupted localStorage entries before rendering
cleanupStorage()

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
