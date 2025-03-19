/**
 * Social Share Component
 * Handles social sharing functionality
 */

import { state } from '../app.js';

/**
 * Initialize the Social Share component
 */
function initialize() {
  const socialShare = document.getElementById('socialShare');
  const XShare = document.getElementById('XShare');
  
  if (!socialShare) {
    console.error('Social Share element not found');
    return Promise.reject('Social Share element not found');
  }
  
  // Show the component
  socialShare.style.display = 'block';
  
  // Set up event listeners
  if (XShare) {
    XShare.addEventListener('click', shareOnX);
  }
  
  // You can add other social platforms here (e.g., Reddit, LinkedIn, etc.)
  
  return Promise.resolve();
}

/**
 * Share the current risk data on X (formerly Twitter)
 */
function shareOnX() {
  // Get current month risk
  const currentMonth = new Date().getMonth();
  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];
  
  // Get risk percentage from gauge or state
  let currentRisk = document.getElementById('gaugeValue');
  currentRisk = currentRisk ? currentRisk.textContent : '?%';
  
  // Create share text
  const shareText = `My Bitcoin crash risk for ${monthNames[currentMonth]} is ${currentRisk}! Check out the Calendar of Rekt to see yours: https://example.com/calendar-of-rekt/`;
  
  // Open X sharing dialog
  window.open(`https://x.com/intent/tweet?text=${encodeURIComponent(shareText)}`, '_blank');
}

/**
 * Update sharing links with the latest risk data
 * 
 * @param {number} riskPercentage - Current risk percentage
 */
function updateShareLinks(riskPercentage) {
  // Update any dynamic content in the sharing section
  const shareDescription = document.querySelector('.social-text');
  
  if (shareDescription) {
    // You can customize the message based on risk level
    if (riskPercentage > 70) {
      shareDescription.textContent = `Warning! Bitcoin crash risk is extremely high at ${riskPercentage}%! Share this analysis to help others prepare for potential market volatility.`;
    } else if (riskPercentage > 40) {
      shareDescription.textContent = `Bitcoin crash risk is moderate at ${riskPercentage}%. Share this analysis to help others stay informed about market risks.`;
    } else {
      shareDescription.textContent = `Bitcoin crash risk is currently low at ${riskPercentage}%. Share this analysis with your followers to help them understand market conditions.`;
    }
  }
}

export { initialize, shareOnX, updateShareLinks };
