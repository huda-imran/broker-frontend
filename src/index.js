import React from 'react';
import ReactDOM from 'react-dom/client';
import './styles/Theme.css'; // Import global styles

import App from './App';

// Create a root
const root = ReactDOM.createRoot(document.getElementById('root'));


root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

