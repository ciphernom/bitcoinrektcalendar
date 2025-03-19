/**
 * Rekt Legends Component
 * Displays legendary Bitcoin crashes
 */

import { state, monthNames } from '../app.js';

/**
 * Initialize the Rekt Legends component
 */
function initialize() {
  const rektLegends = document.getElementById('rektLegends');
  
  if (!rektLegends) {
    console.error('Rekt Legends element not found');
    return Promise.reject('Rekt Legends element not found');
  }
  
  // Show the component
  rektLegends.style.display = 'block';
  
  // Initial population with any existing data
  if (state.historicalCrashes && Object.keys(state.historicalCrashes).length > 0) {
    populateRektLegends(state.historicalCrashes);
  }
  
  return Promise.resolve();
}

/**
 * Populate Rekt Legends with the most severe crashes from history
 * 
 * @param {Object} crashesByMonth - Object containing crashes organized by month
 */
function populateRektLegends(crashesByMonth) {
  const legendCards = document.getElementById('legendCards');
  
  if (!legendCards) {
    console.error('Legend Cards container not found');
    return;
  }
  
  // Find the most significant crashes from all months
  let allCrashes = [];
  Object.keys(crashesByMonth).forEach(month => {
    crashesByMonth[month].forEach(crash => {
      allCrashes.push({
        ...crash,
        month: parseInt(month)
      });
    });
  });
  
  // Sort by crash percentage (most severe first)
  allCrashes.sort((a, b) => parseFloat(a.percentage) - parseFloat(b.percentage));
  
  // Take top 4 crashes
  const legendCrashes = allCrashes.slice(0, 4);
  
  // Create HTML for each legend
  legendCards.innerHTML = legendCrashes.map(crash => {
    return `
      <div class="legend-card">
        <div class="legend-date">${crash.date}</div>
        <div class="legend-title">${crash.description || monthNames[crash.month - 1] + ' Market Crash'}</div>
        <div class="legend-desc">${crash.context.split(' ').slice(0, 15).join(' ')}...</div>
        <div class="legend-stat">${crash.percentage}% in 24 hours</div>
      </div>
    `;
  }).join('');
  
  // Add hover effects or other interactivity
  document.querySelectorAll('.legend-card').forEach(card => {
    card.addEventListener('mouseenter', () => {
      card.style.transform = 'translateY(-5px)';
      card.style.boxShadow = '0 8px 20px rgba(0, 0, 0, 0.3)';
    });
    
    card.addEventListener('mouseleave', () => {
      card.style.transform = '';
      card.style.boxShadow = '';
    });
  });
}

/**
 * Update the Rekt Legends display with new crash data
 * 
 * @param {Object} crashesByMonth - Object containing crashes organized by month
 */
function updateRektLegends(crashesByMonth) {
  // Re-populate with new data
  populateRektLegends(crashesByMonth);
}

export { initialize, populateRektLegends, updateRektLegends };
