/**
 * Risk Model
 */

import { preparePredictionChartData } from './data-service.js';
import { calculateEnhancedRisk } from './enhanced-risk-model.js';
import { state } from '../app.js';

// Define the risk model constants
const a0 = 1.0; // baseline prior shape
const b0 = 1.0; // baseline prior scale

/**
 * Calculate risk for all timeframes using the enhanced model
 */
function calculateRiskForAllTimeframes() {
  const timeframes = [1, 7, 14, 30, 90]; // days
  
  timeframes.forEach(timeframe => {
    // Use enhanced model instead of original
    state.riskByMonth[timeframe] = calculateEnhancedRisk(state.bitcoinData, timeframe);
  });
  
  console.log("Risk calculation completed for all timeframes using enhanced model");
  
  // CRITICAL FIX: Force the onChainDataLoaded event if data exists
  if (state.onChainData && state.onChainData.length > 0) {
    console.log("Manually dispatching onChainDataLoaded event");
    try {
      // Try direct reference first
      if (typeof dispatchOnChainDataLoaded === 'function') {
        dispatchOnChainDataLoaded();
      } else {
        // Create and dispatch the event directly
        document.dispatchEvent(new CustomEvent('onChainDataLoaded'));
      }
      
      // Also try directly rendering charts
      if (typeof renderOnChainCharts === 'function') {
        console.log("Directly calling renderOnChainCharts");
        renderOnChainCharts();
      }
    } catch (e) {
      console.error("Error dispatching event:", e);
    }
  }
}

/**
 * Original risk calculation (kept for backwards compatibility)
 * @param {Array} data - Bitcoin price data
 * @param {number} timeframeDays - Prediction timeframe in days
 * @returns {Object} Risk by month
 */
function calculateRisk(data, timeframeDays) {
    // Group data by halving epoch
    const epochData = {};
    data.forEach(d => {
      if (!epochData[d.halvingEpoch]) {
        epochData[d.halvingEpoch] = [];
      }
      epochData[d.halvingEpoch].push(d);
    });
    
    // Calculate 1st percentile thresholds for each epoch
    const thresholds = {};
    Object.keys(epochData).forEach(epoch => {
      const epochLogReturns = epochData[epoch]
        .map(d => d.logReturn)
        .filter(r => !isNaN(r) && isFinite(r));
      
      epochLogReturns.sort((a, b) => a - b);
      const threshold = epochLogReturns[Math.floor(epochLogReturns.length * 0.01)];
      thresholds[epoch] = threshold;
    });
    
    // Mark extreme events using epoch-specific thresholds
    data.forEach(d => {
      const threshold = thresholds[d.halvingEpoch];
      d.extremeEvent = d.logReturn < threshold ? 1 : 0;
    });
    
    // Calculate overall extreme event frequency
    const totalExtremeEvents = data.reduce((sum, d) => sum + d.extremeEvent, 0);
    const overallFreq = totalExtremeEvents / data.length;
    
    // Calculate seasonal factors by month
    const seasonalFactors = {};
    const monthlyStats = {};
    
    for (let m = 1; m <= 12; m++) {
      const monthlyData = data.filter(d => d.date.getMonth() + 1 === m);
      if (monthlyData.length === 0) continue;
      
      const monthlyExtremeEvents = monthlyData.reduce((sum, d) => sum + d.extremeEvent, 0);
      const monthlyFreq = monthlyExtremeEvents / monthlyData.length;
      seasonalFactors[m] = overallFreq > 0 ? monthlyFreq / overallFreq : 1.0;
      
      monthlyStats[m] = {
        totalDays: monthlyData.length,
        extremeEvents: monthlyExtremeEvents,
        frequency: monthlyFreq,
        seasonalFactor: seasonalFactors[m]
      };
    }
    
    // Calculate risk by month using the Poisson-Gamma Bayesian formula
    const riskByMonth = {};
    for (let m = 1; m <= 12; m++) {
      const stats = monthlyStats[m];
      if (!stats) {
        riskByMonth[m] = 0;
        continue;
      }
      
      const T = stats.totalDays;
      const N = stats.extremeEvents;
      const S_m = stats.seasonalFactor;
      
      // Risk formula: 1 - (b0 + T)/(b0 + T + tau)^(a0*S_m + N)
      const risk = 1 - Math.pow((b0 + T) / (b0 + T + timeframeDays), (a0 * S_m + N));
      riskByMonth[m] = risk;
    }
    
    return riskByMonth;
}

function createRiskDisplay(percentage) {
    return `
      <div class="risk-container">
        <div class="risk-percentage">
          ${percentage}%
        </div>
        <div class="progress-container">
          <div class="progress-fill" style="width: 0%;"></div>
        </div>
        <div class="progress-labels">
          <span>0%</span>
          <span>100%</span>
        </div>
      </div>
    `;
}

function initCrashPredictionChart() {
  // Get chart element
  const chartCanvas = document.getElementById('crashPredictionChart');
  
  // If a chart already exists on this canvas, destroy it first
  if (window.predictionChart) {
    window.predictionChart.destroy();
    window.predictionChart = null;
  }
  
  // Prepare data - hardcoded to 24 months
  const chartData = preparePredictionChartData(24);
  
  // Create chart
  const chart = new Chart(chartCanvas, {
    type: 'line',
    data: chartData,
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        mode: 'index',
        intersect: false,
      },
      scales: {
        x: {
          type: 'time',
          time: {
            unit: 'month',
            displayFormats: {
              month: 'MMM YYYY'
            }
          },
          grid: {
            color: 'rgba(255, 255, 255, 0.1)'
          },
          ticks: {
            color: 'rgba(255, 255, 255, 0.7)'
          }
        },
        y: {
          type: 'linear',
          display: true,
          position: 'left',
          title: {
            display: true,
            text: 'Price (USD)',
            color: 'rgba(75, 192, 192, 0.8)'
          },
          grid: {
            color: 'rgba(255, 255, 255, 0.1)'
          },
          ticks: {
            color: 'rgba(255, 255, 255, 0.7)'
          }
        },
        y1: {
          type: 'linear',
          display: true,
          position: 'right',
          title: {
            display: true,
            text: 'Crash Probability (%)',
            color: 'rgba(255, 99, 132, 0.8)'
          },
          min: 0,
          max: 100,
          grid: {
            drawOnChartArea: false
          },
          ticks: {
            color: 'rgba(255, 255, 255, 0.7)'
          }
        }
      },
      plugins: {
        tooltip: {
          mode: 'index',
          intersect: false,
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          titleColor: '#fff',
          bodyColor: '#fff',
          borderColor: 'rgba(255, 255, 255, 0.2)',
          borderWidth: 1
        },
        legend: {
          display: false
        }
      }
    }
  });
  
  window.predictionChart = chart;
  return chart;
}

// Add a small badge to indicate enhanced model is active
function addEnhancedModelIndicator() {
  // Create badge container (similar to YouTuber container)
  const badgeContainer = document.createElement('div');
  badgeContainer.className = 'enhanced-model-container';
  
  // Create badge element
  const badge = document.createElement('div');
  badge.className = 'enhanced-model-badge';
  badge.innerHTML = `
    <span class="badge-icon">⚡</span>
    <span class="badge-text">Enhanced Model</span>
  `;
  
  // Add badge to container
  badgeContainer.appendChild(badge);
  
  // Add container to body (same level as YouTuber button)
  document.body.appendChild(badgeContainer);
}
export { calculateRiskForAllTimeframes, calculateRisk, createRiskDisplay, initCrashPredictionChart, addEnhancedModelIndicator };
