/* global document, console */

// @ts-expect-error - React DOM types may not be available in this context
import { createRoot } from 'react-dom/client';
import DocumentationLayout from './components/DocumentationLayout.js';

// @ts-check

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