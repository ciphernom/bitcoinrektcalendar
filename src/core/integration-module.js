/**
 * Enhanced Risk Model Integration Module
 * Connects the new on-chain metrics with the existing Calendar of Rekt application
 */

import { state } from '../app.js';
import { calculateEnhancedRisk, createOnChainDashboard, ensureOnChainDataInitialized } from './enhanced-risk-model.js';
import { initializeOnChainVisualizations, updateOnChainDashboard, dispatchOnChainDataLoaded, renderOnChainCharts } from './onchain-visualizations.js';

/**
 * Initialize the enhanced risk model
 */
export function initializeEnhancedModel() {
  console.log('Initializing enhanced risk model with on-chain metrics');
  
  try {
    // Only initialize visualizations if data is available
    if (state.bitcoinData && state.bitcoinData.length > 0) {
      const dataInitialized = ensureOnChainDataInitialized(state.bitcoinData);
      console.log('On-chain data initialization:', dataInitialized ? 'successful' : 'failed');
      
      if (dataInitialized) {
        // Initialize visualizations only after data is confirmed ready
        setTimeout(() => {
          initializeOnChainVisualizations();
          // Force render charts immediately
          renderOnChainCharts();
          dispatchOnChainDataLoaded();
        }, 1500);
      }
    } else {
      console.warn('Bitcoin data not available yet, waiting to initialize on-chain metrics');
      // Set up a polling mechanism to check for data
      const checkInterval = setInterval(() => {
        if (state.bitcoinData && state.bitcoinData.length > 0) {
          clearInterval(checkInterval);
          initializeEnhancedModel(); // Retry when data is available
        }
      }, 1000);
    }
    
    // Add enhanced model indicator regardless
    addEnhancedModelIndicator();
    
    // REMOVED: The duplicate initialization call that was here
    // This was causing multiple dashboards to be added to the page
    
    // Update the app description to mention the enhanced model
    updateAppDescription();
    
    // Modify the existing calculation function to use the enhanced model
    patchRiskCalculationFunction();
    
    // Update data info text
    updateDataInfoText();
    
    return true;
  } catch (error) {
    console.error('Error in enhanced model initialization:', error);
    return false;
  }
}

/**
 * Add enhanced model indicator
 */
function addEnhancedModelIndicator() {
  // Create badge container
  const badgeContainer = document.createElement('div');
  badgeContainer.className = 'enhanced-model-container';
  
  // Create badge element
  const badge = document.createElement('div');
  badge.className = 'enhanced-model-badge';
  badge.innerHTML = `
    <span class="badge-icon">⚡</span>
    <span class="badge-text">Enhanced Model</span>
  `;
  
  // Add tooltip
  badge.title = 'Using advanced on-chain metrics for improved crash risk prediction';
  
  // Add click functionality to show info about the enhanced model
  badge.addEventListener('click', showEnhancedModelInfo);
  
  // Add badge to container
  badgeContainer.appendChild(badge);
  
  // Add container to body (same level as YouTuber button)
  document.body.appendChild(badgeContainer);
}

/**
 * Show modal with enhanced model information
 */
function showEnhancedModelInfo() {
  // Get modal elements
  const modalOverlay = document.getElementById('modalOverlay');
  const popupInfo = document.getElementById('popupInfo');
  const popupTitle = document.getElementById('popupTitle');
  const popupContent = document.getElementById('popupContent');
  
  if (!modalOverlay || !popupInfo || !popupTitle || !popupContent) {
    console.error('Modal elements not found');
    return;
  }
  
  // Set modal content
  popupTitle.textContent = 'Enhanced Risk Model Information';
  
  popupContent.innerHTML = `
    <div class="enhanced-model-info">
      <p>The Enhanced Risk Model leverages on-chain metrics to significantly improve crash prediction accuracy.</p>
      
      <h4>Key Metrics Used:</h4>
      <ul>
        <li><strong>MVRV Ratio:</strong> Market Value to Realized Value ratio measures market overvaluation. Values above 3.5 historically signal market tops.</li>
        <li><strong>NVT Ratio:</strong> Network Value to Transactions ratio compares Bitcoin's market cap to economic activity. High values indicate overvaluation.</li>
        <li><strong>Active Addresses:</strong> A fundamental metric of network health and adoption. Divergence between price and address growth often precedes corrections.</li>
        <li><strong>Supply Distribution:</strong> Measures whale accumulation/distribution patterns which often predict market movements.</li>
        <li><strong>Market Cycle Position:</strong> Derived from multiple metrics to identify the current phase of the market cycle.</li>
      </ul>
      
      <h4>Methodology Improvements:</h4>
      <p>The enhanced model combines the original Poisson-Gamma Bayesian approach with:</p>
      <ul>
        <li>Volatility weighting to adjust for changing market dynamics</li>
        <li>Sentiment analysis integration from news and social media</li>
        <li>Cycle-specific risk adjustments</li>
        <li>On-chain metrics for fundamental valuation</li>
      </ul>
      
      <p>This approach has shown to increase prediction accuracy by identifying market conditions that historically preceded major crashes.</p>
    </div>
  `;
  
  // Add specific styling for the enhanced model info
  const styleElement = document.createElement('style');
  styleElement.textContent = `
    .enhanced-model-info {
      max-width: 100%;
      line-height: 1.6;
    }
    
    .enhanced-model-info h4 {
      color: var(--btc-orange);
      margin-top: 1.5rem;
      margin-bottom: 0.8rem;
    }
    
    .enhanced-model-info ul {
      padding-left: 1.5rem;
      margin-bottom: 1.5rem;
    }
    
    .enhanced-model-info li {
      margin-bottom: 0.5rem;
    }
    
    .enhanced-model-info strong {
      color: var(--btc-orange);
    }
  `;
  document.head.appendChild(styleElement);
  
  // Show modal
  modalOverlay.classList.add('active');
  popupInfo.classList.add('active');
  
  // Add scroll lock to body
  document.body.style.overflow = 'hidden';
}

/**
 * Update app description to mention the enhanced model
 */
function updateAppDescription() {
  const descriptionElement = document.querySelector('.description');
  
  if (descriptionElement) {
    // Add enhanced model information to the description
    const existingDescription = descriptionElement.innerHTML;
    
    // Check if the description already mentions the enhanced model
    if (!existingDescription.includes('enhanced model')) {
      // Update with enhanced model information
      descriptionElement.innerHTML = `
        <strong>
          What are your chances of getting REKT this month?
        </strong>
        This visualization reveals the monthly probability of experiencing at least one extreme Bitcoin price crash (daily returns below the 1st percentile). 
        Based on a comprehensive analysis of historical BTC price patterns using an <strong>enhanced model integrating on-chain metrics, sentiment analysis, and Bayesian statistics</strong>.
        <span style="font-style: italic; color: var(--btc-orange);">
          <br/>
          Click on any month to see historical crash events with detailed news &amp; analysis.
        </span>
      `;
    }
  }
}

/**
 * Update data info text to mention enhanced model
 */
function updateDataInfoText() {
  const dataInfoText = document.querySelector('#data-info .data-info-content p:last-of-type');
  
  if (dataInfoText) {
    dataInfoText.innerHTML = 'Risk calculation uses an enhanced Bayesian model with <strong>on-chain metrics integration</strong>, volatility weighting and sentiment analysis (a₀=1.0, b₀=1.0, τ=<span id="tauValue">30</span>) to predict extreme market events.';
  }
}

/**
 * Patch the original risk calculation function to use the enhanced model
 */
function patchRiskCalculationFunction() {
  // Import existing namespace
  const RiskModel = window.RiskModel || {};
  
  // Store the original function for reference
  const originalCalculateRiskForAllTimeframes = RiskModel.calculateRiskForAllTimeframes;
  
  // Create the patched function
  RiskModel.calculateRiskForAllTimeframes = function() {
    console.log('Using enhanced risk model with on-chain metrics');
    
    const timeframes = [1, 7, 14, 30, 90]; // days
    
    timeframes.forEach(timeframe => {
      // Use enhanced model instead of original
      state.riskByMonth[timeframe] = calculateEnhancedRisk(state.bitcoinData, timeframe);
      
      // Optional: Store original model results for comparison
      // state.originalRiskByMonth[timeframe] = originalCalculateRisk(state.bitcoinData, timeframe);
    });
    
    console.log("Risk calculation completed for all timeframes using enhanced model");
    
    // Update the on-chain metrics dashboard
    const dashboardHTML = createOnChainDashboard();
    updateOnChainDashboard(dashboardHTML);
    
    // Render on-chain charts when data is available
    if (state.onChainData && state.onChainData.length > 0) {
      renderOnChainCharts();
      dispatchOnChainDataLoaded();
    }
  };
  
  // Store the original initCrashPredictionChart function for reference
  const originalInitCrashPredictionChart = RiskModel.initCrashPredictionChart;
  
  // Create the patched function to add on-chain metrics to the prediction chart
  RiskModel.initCrashPredictionChart = function() {
    // Call original function first
    const chart = originalInitCrashPredictionChart();
    
    // If we have on-chain data and chart exists, enhance it
    if (state.onChainData && state.onChainData.length > 0 && chart) {
      enhancePredictionChart(chart);
    }
    
    return chart;
  };
  
  // Apply the patched functions to the global namespace
  window.RiskModel = RiskModel;
}

/**
 * Enhance the prediction chart with on-chain metrics
 * @param {Object} chart - Chart.js instance
 */
function enhancePredictionChart(chart) {
  if (!chart || !chart.data || !chart.data.datasets) return;
  
  // Get recent on-chain data
  const recentData = state.onChainData.slice(-730); // 2 years
  
  // Add MVRV dataset if available
  if (recentData.some(d => d.MVRV_Z_SCORE !== undefined)) {
    // Find MVRV z-score values that match the chart dates
    const mvrvData = [];
    
    chart.data.datasets[0].data.forEach(point => {
      const date = new Date(point.x);
      
      // Find closest on-chain data point
      const closest = findClosestDataPoint(recentData, date);
      
      if (closest && closest.MVRV_Z_SCORE !== undefined) {
        // Map z-score to 0-100 scale (like the risk)
        // Z-score -3 to +3 maps to 0-100
        const normalizedScore = Math.min(100, Math.max(0, (closest.MVRV_Z_SCORE + 3) / 6 * 100));
        
        mvrvData.push({
          x: point.x,
          y: normalizedScore
        });
      } else {
        mvrvData.push({
          x: point.x,
          y: null
        });
      }
    });
    
    // Add MVRV dataset
    chart.data.datasets.push({
      label: 'MVRV Z-Score',
      data: mvrvData,
      borderColor: 'rgba(255, 159, 64, 0.7)',
      backgroundColor: 'rgba(255, 159, 64, 0.1)',
      borderWidth: 1.5,
      borderDash: [5, 5],
      pointRadius: 0,
      yAxisID: 'y1',
      fill: false
    });
  }
  
  // Update the chart
  chart.update();
}

/**
 * Find the closest data point in time
 * @param {Array} data - Array of data points with date property
 * @param {Date} targetDate - Target date to match
 * @returns {Object|null} Closest data point or null if none found
 */
function findClosestDataPoint(data, targetDate) {
  if (!data || data.length === 0) return null;
  
  const targetTime = targetDate.getTime();
  
  let closestPoint = null;
  let minTimeDiff = Infinity;
  
  data.forEach(point => {
    const pointDate = point.date instanceof Date ? point.date : new Date(point.date);
    const timeDiff = Math.abs(pointDate.getTime() - targetTime);
    
    if (timeDiff < minTimeDiff) {
      minTimeDiff = timeDiff;
      closestPoint = point;
    }
  });
  
  // Only return if within 3 days
  return minTimeDiff <= 3 * 24 * 60 * 60 * 1000 ? closestPoint : null;
}

/**
 * Initialize the enhanced model when the DOM is fully loaded
 */
document.addEventListener('DOMContentLoaded', function() {
  // Wait a short time to ensure the original app is initialized
  setTimeout(initializeEnhancedModel, 1000);
});
