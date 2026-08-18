import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { WindroidSystemBridge } from './services/WindroidSystemBridge.ts';

// Initialize Windroid System Bridge (populates window.windroid)
WindroidSystemBridge.getInstance();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

