import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import 'bootstrap/dist/css/bootstrap.min.css'
import './assets/css/slick.css'
import './assets/css/slick-theme.css'
import './assets/css/helpers.css'
import './assets/css/style.css'
import './assets/css/custom_adpr.css'
import './index.css'

import App from './App.jsx'

createRoot(document.getElementById('root')).render(
    <StrictMode>
        <App />
    </StrictMode>,
)
