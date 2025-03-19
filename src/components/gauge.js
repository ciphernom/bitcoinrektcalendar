/**
 * Gauge Component
 */

import { state } from '../app.js';

function updateGauge(riskPercentage, credibleInterval = null) {
  // Add error checking for the gauge elements
  const gaugeCurrentFill = document.getElementById('gaugeCurrentFill');
  const gaugeMarker = document.getElementById('gaugeMarker');
  const gaugeValue = document.getElementById('gaugeValue');
  
  if (!gaugeCurrentFill || !gaugeMarker || !gaugeValue) {
    console.error('Gauge elements not found!');
    return;
  }
  
  // Check for valid percentage
  if (isNaN(parseFloat(riskPercentage))) {
    console.error('Invalid risk percentage:', riskPercentage);
    riskPercentage = "0.0";
  }
  
  // Log what we're updating with
  console.log(`Updating gauge with: ${riskPercentage}%, CI:`, credibleInterval);
  
  // Update existing gauge elements
  gaugeCurrentFill.style.width = `${riskPercentage}%`;
  gaugeMarker.style.left = `${riskPercentage}%`;
  gaugeValue.style.left = `${riskPercentage}%`;
  gaugeValue.textContent = `${riskPercentage}%`;
  
  // Update the prominent percentage
  const prominentPercentage = document.getElementById('prominentPercentage');
  if (prominentPercentage) {
    prominentPercentage.textContent = `${riskPercentage}%`;
  }
  
  // If we have credible interval data, add it to the gauge
  if (credibleInterval && typeof credibleInterval === 'object') {
    console.log('Adding credible interval to gauge:', credibleInterval);
    
    try {
      // First, remove any existing interval display
      const existingInterval = document.getElementById('gaugeInterval');
      if (existingInterval) existingInterval.remove();
      
      // Add the interval to the gauge value
      const intervalText = document.createElement('span');
      intervalText.id = 'gaugeInterval';
      intervalText.className = 'gauge-interval';
      intervalText.textContent = `(${credibleInterval.lower}-${credibleInterval.upper})`;
      gaugeValue.appendChild(intervalText);
      
      // Add credible interval range to the gauge
      const existingRange = document.getElementById('gaugeIntervalRange');
      if (existingRange) existingRange.remove();
      
      const lowerBound = parseFloat(credibleInterval.lower.toString().replace('%', ''));
      const upperBound = parseFloat(credibleInterval.upper.toString().replace('%', ''));
      
      if (isNaN(lowerBound) || isNaN(upperBound)) {
        console.error('Invalid bounds:', lowerBound, upperBound);
      } else {
        const rangeElement = document.createElement('div');
        rangeElement.id = 'gaugeIntervalRange';
        rangeElement.className = 'gauge-interval-range';
        rangeElement.style.left = `${lowerBound}%`;
        rangeElement.style.width = `${upperBound - lowerBound}%`;
        
        const gauge = document.querySelector('.gauge');
        if (gauge) {
          gauge.appendChild(rangeElement);
        } else {
          console.error('Gauge element not found');
        }
      }
      
      // Add interval to prominent percentage
      if (prominentPercentage) {
        const existingPromInterval = document.getElementById('prominentInterval');
        if (existingPromInterval) existingPromInterval.remove();
        
        const prominentInterval = document.createElement('span');
        prominentInterval.id = 'prominentInterval';
        prominentInterval.className = 'prominent-interval';
        prominentInterval.textContent = `(${credibleInterval.lower}-${credibleInterval.upper})`;
        prominentPercentage.appendChild(prominentInterval);
      }
    } catch (error) {
      console.error('Error adding credible interval:', error);
    }
  } else {
    console.log('No credible interval provided or invalid format');
  }
  
  // Apply color classes based on risk level
  const risk = parseFloat(riskPercentage);
  
  // Remove existing classes
  gaugeValue.classList.remove('high-risk', 'medium-risk', 'low-risk');
  if (prominentPercentage) {
    prominentPercentage.classList.remove('high-risk', 'medium-risk', 'low-risk');
  }
  
  // Add appropriate class based on risk level
  if (risk >= 70) {
    gaugeValue.classList.add('high-risk');
    if (prominentPercentage) prominentPercentage.classList.add('high-risk');
  } else if (risk >= 40) {
    gaugeValue.classList.add('medium-risk');
    if (prominentPercentage) prominentPercentage.classList.add('medium-risk');
  } else {
    gaugeValue.classList.add('low-risk');
    if (prominentPercentage) prominentPercentage.classList.add('low-risk');
  }
}

export { updateGauge };
