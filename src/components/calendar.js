/**
 * Calendar Component
 */

import { state, monthNames } from '../app.js';
import { createRiskDisplay } from '../core/risk-model.js';

/**
 * Renders the risk calendar with month cards showing risk percentages
 * @param {Object} riskByMonth - Risk values by month (1-12)
 * @param {Object} historicalCrashes - Historical crash data by month
 */
function renderCalendar(riskByMonth, historicalCrashes) {
  // Clear existing content
  calendar.innerHTML = '';
  
  // Get current timeframe
  const currentTimeframe = state.currentTimeframe || 30;
  
  // Create month cards
  for (let month = 1; month <= 12; month++) {
    // Get risk data - NOTE: Now it's an object with risk, lower, upper properties
    const riskData = riskByMonth[month];
    
    // If it's still just a number (for backward compatibility)
    let riskPercentage, lowerBound, upperBound;
    if (typeof riskData === 'object' && riskData !== null) {
      riskPercentage = ((riskData.risk || 0) * 100).toFixed(1);
      lowerBound = ((riskData.lower || 0) * 100).toFixed(1);
      upperBound = ((riskData.upper || 0) * 100).toFixed(1);
    } else {
      riskPercentage = ((riskData || 0) * 100).toFixed(1);
      lowerBound = "N/A";
      upperBound = "N/A";
    }
    
    // Determine risk class based on percentage
    const riskClass = `risk-${Math.floor((typeof riskData === 'number' ? riskData : riskData.risk) * 10) * 10}`;
    const highRiskClass = (typeof riskData === 'number' ? riskData : riskData.risk) > 0.6 ? 'high-risk' : '';
    
    // Get component data for this month
    const components = state.riskComponents && 
                       state.riskComponents[currentTimeframe] && 
                       state.riskComponents[currentTimeframe][month];
    
    // Create component breakdown content if component data exists
    let breakdownContent = '';
    if (components) {
      breakdownContent = `
        <div class="risk-breakdown">
          <div class="component-grid">
            <div class="component-item">
              <span class="component-label">Seasonal:</span>
              <span class="component-value">${components.baseSeasonalFactor}×</span>
            </div>
            <div class="component-item">
              <span class="component-label">Volatility:</span>
              <span class="component-value">${components.volatilityAdjustment}×</span>
            </div>
            <div class="component-item">
              <span class="component-label">On-Chain:</span>
              <span class="component-value">${components.onChainFactor}×</span>
            </div>
            <div class="component-item">
              <span class="component-label">Sentiment:</span>
              <span class="component-value">${components.sentimentFactor}×</span>
            </div>
            <div class="component-item">
              <span class="component-label">Market Cycle:</span>
              <span class="component-value">${components.cycleFactor}×</span>
            </div>
            <div class="component-item total">
              <span class="component-label">Crashes:</span>
              <span class="component-value">${components.extremeEvents}/${components.totalDays}</span>
            </div>
            ${components.credibleInterval ? `
            <div class="component-item interval">
              <span class="component-label">95% CI:</span>
              <span class="component-value">${components.credibleInterval.lower}-${components.credibleInterval.upper}</span>
            </div>
            ` : ''}
          </div>
        </div>
      `;
    }
    
    // Create the month card
    const monthCard = document.createElement('div');
    monthCard.className = `month-card ${riskClass} ${highRiskClass}`;
    monthCard.style.setProperty('--delay', month);
    
    // Add the month name, risk display, and breakdown
    monthCard.innerHTML = `
      <div class="month-name">${monthNames[month-1]}</div>
      <div class="risk-container">
        <div class="risk-percentage">
          ${riskPercentage}%
          ${lowerBound !== "N/A" ? `<span class="credible-interval">(${lowerBound}%-${upperBound}%)</span>` : ''}
        </div>
        <div class="progress-container">
          <div class="progress-fill" style="width: 0%;"></div>
          ${lowerBound !== "N/A" ? `<div class="interval-range" style="left: ${lowerBound}%; width: ${upperBound - lowerBound}%;"></div>` : ''}
        </div>
        <div class="progress-labels">
          <span>0%</span>
          <span>100%</span>
        </div>
      </div>
      ${breakdownContent}
    `;
      // Force immediate animation completion after a very short delay
        setTimeout(() => {
          // Force immediate animation completion
          const progressFill = monthCard.querySelector('.progress-fill');
          if (progressFill) {
            progressFill.style.width = `${riskPercentage}%`;
          }
          
          // Set explicit final state for layout
          monthCard.style.opacity = "1";
          monthCard.style.transform = "none";
          monthCard.style.position = "relative";
          
          // Clear any transition delays that might be causing issues
          monthCard.style.transitionDelay = "0s";
          
          // Force grid layout refresh
          monthCard.style.display = "flex";
          monthCard.style.flexDirection = "column";
          
          // Force a reflow
          void monthCard.offsetHeight;
        }, 200); //  timeout to ensure animations have time to process
      
      
    // Add click event to open popup for the month card
    monthCard.addEventListener('click', function() {
      openMonthPopup(month, historicalCrashes[month] || []);
    });

    calendar.appendChild(monthCard);
  }

  // Animate the progress bars
  setTimeout(() => {
    const progressFills = document.querySelectorAll('.progress-fill');
    progressFills.forEach(fill => {
      const width = fill.parentElement.parentElement.querySelector('.risk-percentage').textContent.trim().split('%')[0];
      fill.style.width = `${width}%`;
    });
  }, 500);
}

function openMonthPopup(month, crashEvents) {
    // Set popup title
    popupTitle.textContent = `${monthNames[month-1]} Historical Crashes`;
    
    // Create popup content
    if (crashEvents.length > 0) {
      popupContent.innerHTML = crashEvents.map((event, index) => {
        // Create HTML for links if available
        const linksHTML = event.links && event.links.length > 0 
          ? `
            <div class="crash-links">
              <div class="links-title">📰 Related News:</div>
              <ul>
                ${event.links.map(link => `
                  <li><a href="${link.url}" target="_blank" rel="noopener noreferrer">${link.text}</a></li>
                `).join('')}
              </ul>
            </div>
          ` 
          : '';
        
        // Create HTML for context if available
        const contextHTML = event.context 
          ? `<div class="crash-context">${event.context}</div>` 
          : '';
        
        // Add animation delay based on index
        const style = `animation-delay: ${index * 0.15}s`;
        
        return `
          <div class="crash-event" style="${style}">
            <div class="crash-header">
              <span class="crash-date">${event.date}</span>
              <span class="crash-percentage">${event.percentage}%</span>
            </div>
            ${event.description ? `<div class="crash-description">${event.description}</div>` : ''}
            ${contextHTML}
            ${linksHTML}
          </div>
        `;
      }).join('');
    } else {
      popupContent.innerHTML = '<div>No significant historical crashes recorded for this month.</div>';
    }
    
    // Show modal overlay and popup
    modalOverlay.classList.add('active');
    popupInfo.classList.add('active');
    
    // Add scroll lock to body
    document.body.style.overflow = 'hidden';
  }

export { renderCalendar, openMonthPopup };
