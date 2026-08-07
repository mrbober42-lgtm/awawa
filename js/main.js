/**
 * Baklava - Main entry point
 * Initializes the BaklavaCore and exposes global API
 */

import { baklava } from './core/BaklavaCore.js';

// Initialize on DOM ready
document.addEventListener('DOMContentLoaded', async () => {
  try {
    await baklava.init();
    
    // Expose to window for debugging and app access
    window.baklava = baklava;
    window.BaklavaAPI = baklava.api;
    
    console.log('Baklava shell ready');
  } catch (error) {
    console.error('Failed to initialize Baklava:', error);
  }
});

// Export for module usage
export { baklava };
export default baklava;
