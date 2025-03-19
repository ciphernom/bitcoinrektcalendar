/**
 * Timeline Component
 */

import { state } from '../app.js';
import { updateGauge } from './gauge.js';

/**
 * Initialize timeline component
 */
function initialize() {
  const timelineSlider = document.getElementById('timelineSlider');
  const timelineValue = document.getElementById('timelineValue');
  
  if (timelineSlider) {
    timelineSlider.addEventListener('input', function() {
      const year = parseInt(this.value);
      timelineValue.textContent = `${year}: Bitcoin's Risk Profile`;
      
      // If we have historical data for this year, use it
      if (state.timelineData[year]) {
        // Get risk data for this year
        const yearRisk = state.timelineData[year];
        
        // Update the calendar cards with the historical risk data
        const cards = document.querySelectorAll('.month-card');
        cards.forEach((card, index) => {
          const month = index + 1;
          const riskPercentage = (yearRisk[month] * 100).toFixed(1);
          
          // Update risk class
          const riskClass = `risk-${Math.floor(yearRisk[month] * 10) * 10}`;
          card.className = card.className.replace(/risk-\d+/, riskClass);
          
          // Update risk percentage
          const riskDisplay = card.querySelector('.risk-percentage');
          riskDisplay.textContent = `${riskPercentage}%`;
          
          // Update progress fill (with animation)
          const progressFill = card.querySelector('.progress-fill');
          progressFill.style.width = `${riskPercentage}%`;
          
          // Update high-risk class
          if (yearRisk[month] > 0.6) {
            card.classList.add('high-risk');
          } else {
            card.classList.remove('high-risk');
          }
        });
      } else {
        // If no data, project based on current patterns
        const currentRisk = state.riskByMonth[state.currentTimeframe];
        
        // Apply a year-specific modifier to simulate different market cycles
        let yearModifier = 1.0;
        
        // Bull market years get higher risk
        if (year === 2013 || year === 2017 || year === 2021) {
          yearModifier = 1.3; 
        }
        // Bear market years get lower risk
        else if (year === 2014 || year === 2015 || year === 2018 || year === 2022) {
          yearModifier = 0.8;
        }
        // Recovery years get medium risk
        else if (year === 2016 || year === 2019 || year === 2023) {
          yearModifier = 1.0;
        }
        // Halving years get higher volatility
        else if (year === 2012 || year === 2016 || year === 2020 || year === 2024) {
          yearModifier = 1.2;
        }
        
        // Update the calendar cards with the projected risk data
        const cards = document.querySelectorAll('.month-card');
        cards.forEach((card, index) => {
          const month = index + 1;
          const baseRisk = currentRisk[month];
          const modifiedRisk = Math.min(0.95, baseRisk * yearModifier); // Cap at 95%
          const riskPercentage = (modifiedRisk * 100).toFixed(1);
          
          // Update risk class
          const riskClass = `risk-${Math.floor(modifiedRisk * 10) * 10}`;
          card.className = card.className.replace(/risk-\d+/, riskClass);
          
          // Update risk percentage
          const riskDisplay = card.querySelector('.risk-percentage');
          riskDisplay.textContent = `${riskPercentage}%`;
          
          // Update progress fill (with animation)
          const progressFill = card.querySelector('.progress-fill');
          progressFill.style.width = `${riskPercentage}%`;
          
          // Update high-risk class
          if (modifiedRisk > 0.6) {
            card.classList.add('high-risk');
          } else {
            card.classList.remove('high-risk');
          }
        });
      }
    });
  }
  
  // Initialize timeframe tabs
  const timeframeTabs = document.querySelectorAll('.timeframe-tab');
  timeframeTabs.forEach(tab => {
    tab.addEventListener('click', function() {
      // Remove active class from all tabs
      timeframeTabs.forEach(t => t.classList.remove('active'));
      
      // Add active class to clicked tab
      this.classList.add('active');
      
      // Get timeframe days
      const timeframeDays = parseInt(this.dataset.days);
     
      // Update state
      state.currentTimeframe = timeframeDays;
      
      // Update UI elements
      const forecastPeriod = document.getElementById('forecastPeriod');
      const tauValue = document.getElementById('tauValue');
      
      if (forecastPeriod) forecastPeriod.textContent = timeframeDays;
      if (tauValue) tauValue.textContent = timeframeDays;
      
      // Get risk data for this timeframe
      const timeframeRisk = state.riskByMonth[timeframeDays];
      
  if (timeframeRisk) {
    // Update all cards with the risk data for this timeframe
    document.querySelectorAll('.month-card').forEach((card, index) => {
      const month = index + 1;
      const riskData = timeframeRisk[month];
      
      // Handle both old and new format
      let risk, riskPercentage;
      if (typeof riskData === 'object' && riskData !== null) {
        risk = riskData.risk;
        riskPercentage = (risk * 100).toFixed(1);
        
        // Update credible interval if available
        const intervalElement = card.querySelector('.credible-interval');
        if (intervalElement) {
          intervalElement.textContent = `(${(riskData.lower * 100).toFixed(1)}%-${(riskData.upper * 100).toFixed(1)}%)`;
        }
        
        // Update interval range if available
        const rangeElement = card.querySelector('.interval-range');
        if (rangeElement) {
          rangeElement.style.left = `${(riskData.lower * 100).toFixed(1)}%`;
          rangeElement.style.width = `${((riskData.upper - riskData.lower) * 100).toFixed(1)}%`;
        }
      } else {
        risk = riskData;
        riskPercentage = (risk * 100).toFixed(1);
      }
      
    // Update risk percentage without destroying child elements
    const riskDisplay = card.querySelector('.risk-percentage');
    // First, remove any existing text nodes
    Array.from(riskDisplay.childNodes).forEach(node => {
      if (node.nodeType === Node.TEXT_NODE) {
        node.remove();
      }
    });
    // Add new text node at the beginning
    riskDisplay.prepend(`${riskPercentage}%`);

    // Update or create the credible interval element
    if (typeof riskData === 'object' && riskData !== null && 
        riskData.lower !== undefined && riskData.upper !== undefined) {
      let intervalElement = riskDisplay.querySelector('.credible-interval');
      if (!intervalElement) {
        intervalElement = document.createElement('span');
        intervalElement.className = 'credible-interval';
        riskDisplay.appendChild(intervalElement);
      }
      intervalElement.textContent = `(${(riskData.lower * 100).toFixed(1)}%-${(riskData.upper * 100).toFixed(1)}%)`;
    }
      
      // Update progress fill
      card.querySelector('.progress-fill').style.width = `${riskPercentage}%`;
      
      // Update risk class
      const riskClass = `risk-${Math.floor(risk * 10) * 10}`;
      card.className = card.className.replace(/risk-\d+/, riskClass);
      
      // Update high-risk class
      if (risk > 0.6) {
        card.classList.add('high-risk');
      } else {
        card.classList.remove('high-risk');
      }
    });
    
    // Update the gauge for current month
    const currentMonthIndex = new Date().getMonth();
    const currentMonthRiskData = timeframeRisk[currentMonthIndex + 1];

    let riskPercentage, credibleInterval;
    if (currentMonthRiskData && typeof currentMonthRiskData === 'object') {
      riskPercentage = ((currentMonthRiskData.risk || 0) * 100).toFixed(1);
      credibleInterval = {
        lower: ((currentMonthRiskData.lower || 0) * 100).toFixed(1) + '%',
        upper: ((currentMonthRiskData.upper || 0) * 100).toFixed(1) + '%'
      };
    } else {
      riskPercentage = ((currentMonthRiskData || 0) * 100).toFixed(1);
      credibleInterval = null;
    }

    // Use gauge component to update
    updateGauge(riskPercentage, credibleInterval);
        
        // Update YouTuber mode data
        const youtuberRiskPercentage = document.getElementById('youtuberRiskPercentage');
        const youtuberProgressFill = document.getElementById('youtuberProgressFill');
        const youtuberDescription = document.getElementById('youtuberDescription');
        
        if (youtuberRiskPercentage) youtuberRiskPercentage.textContent = `${riskPercentage}%`;
        if (youtuberProgressFill) youtuberProgressFill.style.width = `${riskPercentage}%`;
        if (youtuberDescription) youtuberDescription.textContent = 
          `The odds of an extreme Bitcoin price crash in the next ${timeframeDays} days, based on historical chaos and market mayhem.`;
      }
    });
  });

  return Promise.resolve(); // Return a resolved promise to maintain compatibility
}

export { initialize };
