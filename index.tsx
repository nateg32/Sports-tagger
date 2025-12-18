import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';

// We bypass AppRegistry.runApplication because it uses legacy React DOM methods
// that are missing or renamed in React 19's ESM entry points.
// React Native Web components will still work correctly.
const rootElement = document.getElementById('root');
if (rootElement) {
  const root = createRoot(rootElement);
  root.render(<App />);
}
