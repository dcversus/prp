import React from 'react';
import { createRoot } from 'react-dom/client';
import DocumentationLayout from './components/DocumentationLayout.js';

// Global styles for documentation
import './styles/docs.css';

// Main documentation app component
function DocumentationApp() {
  return <DocumentationLayout />;
}

// Mount the app
const container = document.getElementById('root');
if (container) {
  const root = createRoot(container);
  root.render(<DocumentationApp />);
} else {
  console.warn('Root element not found');
}