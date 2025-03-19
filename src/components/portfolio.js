/**
 * Portfolio Component
 */

import { state } from '../app.js';

/**
 * Initialize portfolio calculator component
 */
function initialize() {
  const portfolioCalculator = document.getElementById('portfolioCalculator');
  const calculateRiskBtn = document.getElementById('calculateRisk');
  const portfolioInput = document.getElementById('portfolioInput');
  const portfolioResults = document.getElementById('portfolioResults');
  const portfolioRiskAmount = document.getElementById('portfolioRiskAmount');
  const portfolioRiskText = document.getElementById('portfolioRiskText');
  
  if (!portfolioCalculator || !calculateRiskBtn || !portfolioInput) {
    console.error('Portfolio calculator elements not found');
    return;
  }

  // Show portfolio calculator
  portfolioCalculator.style.display = 'block';
  
  // Portfolio calculator functionality
  calculateRiskBtn.addEventListener('click', function() {
    const portfolioValue = parseFloat(portfolioInput.value);
    
    if (!isNaN(portfolioValue) && portfolioValue > 0) {
      // Get current month risk
      const currentMonthIndex = new Date().getMonth();
      const currentMonthRisk = parseFloat(document.getElementById('gaugeValue').textContent.replace('%', '')) / 100;
      
      // Calculate expected loss based on historical crash data
      // Average BTC crash is around 15%
      const averageCrashPercent = 15;
      const expectedLoss = portfolioValue * (averageCrashPercent / 100) * currentMonthRisk;
      
      // Format as currency
      const formattedLoss = new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        maximumFractionDigits: 0
      }).format(expectedLoss);
      
      // Update portfolio results
      portfolioRiskAmount.textContent = formattedLoss;
      portfolioRiskText.innerHTML = `Based on a ${currentMonthRisk.toFixed(2) * 100}% chance of at least one extreme crash this month and historical crash data, this is your expected loss exposure. <strong>Remember to only invest what you can afford to lose.</strong>`;
      
      // Show results
      portfolioResults.style.display = 'block';
      
      // Add animation
      portfolioRiskAmount.style.animation = 'none';
      setTimeout(() => {
        portfolioRiskAmount.style.animation = 'fadeIn 0.5s forwards';
      }, 10);
    }
  });
  
  // Enter key for portfolio input
  portfolioInput.addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
      calculateRiskBtn.click();
    }
  });
}

export { initialize };
