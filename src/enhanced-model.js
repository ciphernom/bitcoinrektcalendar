/**
 * Enhanced Model - Main Integration Module
 * The primary entry point for the enhanced risk model
 */

import { initializeEnhancedModel } from './core/integration-module.js';
import { integrateOnChainRiskIntoGauge } from './core/enhanced-risk-model.js';

// Export all enhanced model functionality
export * from './core/onchain-processor.js';
export * from './core/enhanced-risk-model.js';
export * from './core/onchain-visualizations.js';
export * from './core/integration-module.js';

// Initialize the enhanced model when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  console.log('Enhanced model module loaded, initializing after app startup...');
  
  // Wait for the original app to initialize first
  setTimeout(() => {
    try {
      initializeEnhancedModel();
      console.log('Enhanced model successfully initialized');
    } catch (error) {
      console.error('Error initializing enhanced model:', error);
    }
  }, 1000);
});
