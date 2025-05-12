/**
 * Enhanced Risk Model Integration
 * Combines on-chain metrics with Bayesian statistical model
 */

import { calculateStandardDeviation } from '../utils/statistics.js';
import { state } from '../app.js';
import { processOnChainData } from './onchain-processor.js';
import { updateGauge } from '../components/gauge.js';

// Define risk model constants
const a0 = 1.0; // baseline prior shape
const b0 = 1.0; // baseline prior scale

/**
 * Calculate credible intervals for crash risk using direct Bayesian approach
 * @param {number} alpha - Shape parameter (a0*S_m + N)
 * @param {number} beta - Rate parameter (b0 + T)
 * @param {number} tau - Time horizon in days
 * @returns {Object} Lower and upper bounds for 95% credible interval
 */
function calculateCredibleInterval(alpha, beta, tau) {
  try {
    // For Bayesian Poisson-Gamma model, we calculate quantiles 
    // of the posterior predictive distribution
    
    // Calculate probability of zero events in time tau for different rates
    const calculateProbability = function(lambda) {
      // Probability of at least one event = 1 - Probability of zero events
      // For Poisson: P(X=0) = e^(-lambda*tau)
      return 1 - Math.exp(-lambda * tau);
    };
    
    // For 95% credible interval
    const lowerQuantile = 0.025;
    const upperQuantile = 0.975;

    // Get the quantiles of the gamma distribution (posterior)
    const lowerLambda = jStat.gamma.inv(lowerQuantile, alpha, 1/beta);
    const upperLambda = jStat.gamma.inv(upperQuantile, alpha, 1/beta);
    
    // Convert to probabilities
    const lowerRisk = calculateProbability(lowerLambda);
    const upperRisk = calculateProbability(upperLambda);
    
    // Mean of the Gamma posterior is alpha/beta
    const meanLambda = alpha / beta;
    
    // Ensure upper bound is at least as high as the mean-based risk
    const meanBasedRisk = calculateProbability(meanLambda);
    if (upperRisk < meanBasedRisk) {
      upperRisk = Math.min(0.95, meanBasedRisk * 1.2);
    }
    console.log(`Credible interval calculation - Alpha: ${alpha}, Beta: ${beta}, Tau: ${tau}`);
    console.log(`Lambda quantiles: Lower ${lowerLambda.toFixed(6)}, Upper ${upperLambda.toFixed(6)}`);
    console.log(`Risk interval: (${(lowerRisk*100).toFixed(1)}%, ${(upperRisk*100).toFixed(1)}%)`);
    
    return {
      lower: Math.max(0, Math.min(1, lowerRisk)),
      upper: Math.max(0, Math.min(1, upperRisk))
    };
  } catch (error) {
    console.error('Error calculating credible interval:', error);
    // Return default interval centered on risk estimate
    return {
      lower: 0,
      upper: 0
    };
  }
}

/**
 * Calculate risk with full on-chain metrics integration
 * @param {Array} data - Bitcoin price and on-chain data
 * @param {number} timeframeDays - Prediction timeframe in days
 * @returns {Object} Risk by month
 */
export function calculateEnhancedRisk(data, timeframeDays) {
  console.log(`Calculating enhanced risk model for ${timeframeDays}-day timeframe using ${data.length} data points and on-chain metrics`);
  
  // 1. Process on-chain data and extract metrics
  const onChainResults = processOnChainData(data);
  const { enhancedData, riskIndicators, latestMetrics } = onChainResults;
  
  // Store the on-chain data in state for UI components
  state.onChainData = enhancedData;
  state.latestOnChainMetrics = latestMetrics;
  
  // 2. Group data by halving epoch (keeping original approach as foundation)
  const epochData = {};
  data.forEach(d => {
    if (!epochData[d.halvingEpoch]) {
      epochData[d.halvingEpoch] = [];
    }
    epochData[d.halvingEpoch].push(d);
  });
  
  // 3. Calculate thresholds for each epoch
  const thresholds = {};
  Object.keys(epochData).forEach(epoch => {
    const epochLogReturns = epochData[epoch]
      .map(d => d.logReturn)
      .filter(r => !isNaN(r) && isFinite(r));
    
    epochLogReturns.sort((a, b) => a - b);
    const threshold = epochLogReturns[Math.floor(epochLogReturns.length * 0.01)];
    thresholds[epoch] = threshold;
    
    console.log(`Epoch ${epoch} threshold (1st percentile): ${threshold.toFixed(6)}`);
  });
  
  // 4. Mark extreme events using epoch-specific thresholds
  data.forEach(d => {
    const threshold = thresholds[d.halvingEpoch];
    d.extremeEvent = d.logReturn < threshold ? 1 : 0;
  });
  
  // 5. Calculate overall extreme event frequency
  const totalExtremeEvents = data.reduce((sum, d) => sum + d.extremeEvent, 0);
  const overallFreq = totalExtremeEvents / data.length;
  console.log(`Overall extreme event frequency: ${(overallFreq * 100).toFixed(2)}% (${totalExtremeEvents} events in ${data.length} days)`);
  
  // 6. Calculate volatility metrics
  // 6.1. Recent volatility (last 30 days)
  const recentData = data.slice(-30);
  const recentLogReturns = recentData.map(d => d.logReturn).filter(r => !isNaN(r) && isFinite(r));
  const recentVolatility = calculateStandardDeviation(recentLogReturns);
  
  // 6.2. Medium-term volatility (last 90 days)
  const mediumTermData = data.slice(-90);
  const mediumTermLogReturns = mediumTermData.map(d => d.logReturn).filter(r => !isNaN(r) && isFinite(r));
  const mediumTermVolatility = calculateStandardDeviation(mediumTermLogReturns);
  
  // 6.3. Long-term historical volatility (all data)
  const allLogReturns = data.map(d => d.logReturn).filter(r => !isNaN(r) && isFinite(r));
  const historicalVolatility = calculateStandardDeviation(allLogReturns);
  
  // 6.4. Calculate volatility ratios
  const shortTermVolatilityRatio = recentVolatility / historicalVolatility;
  const mediumTermVolatilityRatio = mediumTermVolatility / historicalVolatility;
  
  console.log(`Volatility analysis:`, {
    recent30Day: recentVolatility.toFixed(6),
    medium90Day: mediumTermVolatility.toFixed(6),
    historical: historicalVolatility.toFixed(6),
    shortTermRatio: shortTermVolatilityRatio.toFixed(3),
    mediumTermRatio: mediumTermVolatilityRatio.toFixed(3)
  });
  
  // 7. Get global sentiment data as a baseline
  let globalSentimentFactor = 1.0;
  if (state.sentimentData) {
    // Convert sentiment from 0-100 scale to adjustment factor
    // 50 = neutral (1.0), 0 = very negative (1.5), 100 = very positive (0.7)
    const sentimentValue = state.sentimentData.value;
    
    if (sentimentValue <= 25) {
      // Very negative sentiment increases risk significantly
      globalSentimentFactor = 1.5;
    } else if (sentimentValue <= 40) {
      // Negative sentiment increases risk moderately
      globalSentimentFactor = 1.25;
    } else if (sentimentValue <= 60) {
      // Neutral sentiment - no adjustment
      globalSentimentFactor = 1.0;
    } else if (sentimentValue <= 75) {
      // Positive sentiment decreases risk moderately
      globalSentimentFactor = 0.85;
    } else {
      // Very positive sentiment decreases risk significantly
      globalSentimentFactor = 0.7;
    }
    
    console.log(`Global sentiment adjustment factor: ${globalSentimentFactor.toFixed(2)} based on sentiment value ${sentimentValue}/100`);
  } else {
    console.log(`No sentiment data available, using neutral sentiment factor`);
  }
  
  // 8. On-Chain metrics integration - global factor
  // 8.1. Get on-chain risk indicators
  let globalOnChainFactor = 1.0;
  
  // 8.2. If we have on-chain risk indicators from the data processing step, use them
  if (latestMetrics && latestMetrics.riskLevel) {
    // Map risk levels to factors
    const riskLevelFactors = {
      'Extreme': 1.75,
      'High': 1.4,
      'Moderate': 1.0,
      'Low': 0.75,
      'Very Low': 0.5
    };
    
    globalOnChainFactor = riskLevelFactors[latestMetrics.riskLevel] || 1.0;
    console.log(`Global On-Chain risk level: ${latestMetrics.riskLevel}, factor: ${globalOnChainFactor.toFixed(2)}`);
  }
  
  // 9. Analyze market cycle position - Global analysis
  const priceData = data.slice(-365).map(d => d.price);
  const maxPrice = Math.max(...priceData);
  const currentPrice = priceData[priceData.length - 1];
  const priceFromTop = currentPrice / maxPrice;
  const cyclePosition = Math.min(1, 2 - priceFromTop); // 0 = top, 1 = bottom
  
  // Global cycle factor - we'll adjust this per month
  let globalCycleFactor;
  if (priceFromTop > 0.95) {
    // Near all-time high - bubble risk
    globalCycleFactor = 1.3;
  } else if (priceFromTop > 0.8) {
    // Still in an uptrend - moderate risk
    globalCycleFactor = 1.15;
  } else if (priceFromTop < 0.5) {
    // More than 50% down from top - reduced risk
    globalCycleFactor = 0.85;
  } else {
    // Middle of cycle - normal risk
    globalCycleFactor = 1.0;
  }
  
  console.log(`Global market cycle analysis: Price is ${(priceFromTop*100).toFixed(1)}% of ATH, cycle factor: ${globalCycleFactor.toFixed(2)}`);
  
  // 10. Calculate seasonal factors by month
  const seasonalFactors = {};
  const monthlyStats = {};
  
  for (let m = 1; m <= 12; m++) {
    const monthlyData = data.filter(d => d.date.getMonth() + 1 === m);
    if (monthlyData.length === 0) continue;
    
    // Calculate standard seasonal factor based on historical distribution
    const monthlyExtremeEvents = monthlyData.reduce((sum, d) => sum + d.extremeEvent, 0);
    const monthlyFreq = monthlyExtremeEvents / monthlyData.length;
    const baseSeasonalFactor = overallFreq > 0 ? monthlyFreq / overallFreq : 1.0;
    
    // Calculate month-specific volatility
    const monthlyLogReturns = monthlyData.map(d => d.logReturn).filter(r => !isNaN(r) && isFinite(r));
    const monthlyVolatility = calculateStandardDeviation(monthlyLogReturns);
    const monthVolatilityRatio = monthlyVolatility / historicalVolatility;
    
    // Get on-chain risk indicators for this month if available
    const monthOnChainRisk = riskIndicators[m] || 0.5;
    
    // Calculate on-chain factor for this month
    // If the month's on-chain risk is high (>0.7), increase risk, if low (<0.3), decrease risk
    const monthOnChainFactor = monthOnChainRisk > 0.7 ? 1.5 : 
                           monthOnChainRisk < 0.3 ? 0.7 : 
                           1.0 + (monthOnChainRisk - 0.5) * 1.0;
    
    // 11. NEW: Month-specific sentiment analysis
    let monthSentimentFactor = calculateMonthSentimentFactor(m, globalSentimentFactor, monthlyData);
    
    // 12. NEW: Month-specific market cycle analysis
    let monthCycleFactor = calculateMonthCycleFactor(m, globalCycleFactor, monthlyData);
    
    // Calculate combined volatility adjustment
    const volatilityAdjustment = Math.sqrt(shortTermVolatilityRatio * 0.5 + monthVolatilityRatio * 0.5);
    
    // Now combine all factors: base seasonal × volatility × on-chain × sentiment × cycle
    const enhancedSeasonal = baseSeasonalFactor * volatilityAdjustment * monthOnChainFactor * monthSentimentFactor * monthCycleFactor;
    
    seasonalFactors[m] = enhancedSeasonal;
    
    monthlyStats[m] = {
      totalDays: monthlyData.length,
      extremeEvents: monthlyExtremeEvents,
      frequency: monthlyFreq,
      baseSeasonalFactor: baseSeasonalFactor,
      enhancedSeasonalFactor: enhancedSeasonal,
      monthlyVolatility: monthlyVolatility,
      volatilityRatio: monthVolatilityRatio,
      volatilityAdjustment: volatilityAdjustment,
      onChainRisk: monthOnChainRisk,
      onChainFactor: monthOnChainFactor,
      // Store the month-specific factors
      sentimentFactor: monthSentimentFactor,
      cycleFactor: monthCycleFactor
    };
  }
  
  // Initialize or reset the risk components storage
  if (!state.riskComponents) {
    state.riskComponents = {};
  }
  
  // Initialize for this timeframe
  if (!state.riskComponents[timeframeDays]) {
    state.riskComponents[timeframeDays] = {};
  }
  
    // 13. Calculate enhanced risk by month
    const riskByMonth = {};
    const currentMonth = new Date().getMonth() + 1;

    for (let m = 1; m <= 12; m++) {
      const stats = monthlyStats[m];
      if (!stats) {
        riskByMonth[m] = {
          risk: 0,
          lower: 0,
          upper: 0
        };
        // Store empty component data
        state.riskComponents[timeframeDays][m] = {
          baseSeasonalFactor: "1.00",
          volatilityAdjustment: "1.00",
          onChainFactor: "1.00",
          sentimentFactor: "1.00",
          cycleFactor: "1.00",
          enhancedSeasonalFactor: "1.00",
          extremeEvents: 0,
          totalDays: 0,
          credibleInterval: {
            lower: "0.0%",
            upper: "0.0%"
          }
        };
        continue;
      }
      
      const T = stats.totalDays;
      const N = stats.extremeEvents;
      const S_m = stats.enhancedSeasonalFactor;
      
      // Parameters for Gamma distribution
      const alpha = a0 * S_m + N;
      const beta = b0 + T;
      /**
       * the direct closed-form solution for the predictive probability of at least one extreme event in time period τ (tau), given that we observed N events in time T with our model parameters a0, b0, and seasonal factor S_m.
        It calculates this by integrating over all possible values of the rate parameter λ (lambda), weighted by the posterior probability of each value. This gives us the probability of at least one event while fully accounting for our uncertainty about the true event rate.
        */
      // Risk formula: 1 - (b0 + T)/(b0 + T + tau)^(a0*S_m + N)
     //const risk = 1 - Math.pow((b0 + T) / (b0 + T + timeframeDays), (a0 * S_m + N));
        /** BUT, we will use the posterior mean approach as a point estimate for lambda instead
         * to simplify the calculation of credible intervals
         */
      // Mean of the Gamma posterior is alpha/beta
        const meanLambda = alpha / beta;

        // Risk formula using the mean rate: P(at least one event) = 1 - exp(-lambda*tau)
        const risk = 1 - Math.exp(-meanLambda * timeframeDays);

      // Calculate credible interval
        let interval;
        try {
          interval = calculateCredibleInterval(alpha, beta, timeframeDays);
        } catch (error) {
          console.error('Failed to calculate interval:', error);
          interval = { lower: 0, upper: 0 };
        }
      
      
      // Store both the risk point estimate and the interval
      riskByMonth[m] = {
        risk: risk,
        lower: interval.lower,
        upper: interval.upper
      };
      
      // Store the component data for this month
      state.riskComponents[timeframeDays][m] = {
        baseSeasonalFactor: stats.baseSeasonalFactor.toFixed(2),
        volatilityAdjustment: stats.volatilityAdjustment.toFixed(2),
        onChainFactor: stats.onChainFactor.toFixed(2),
        sentimentFactor: stats.sentimentFactor.toFixed(2),
        cycleFactor: stats.cycleFactor.toFixed(2),
        enhancedSeasonalFactor: stats.enhancedSeasonalFactor.toFixed(2),
        extremeEvents: stats.extremeEvents,
        totalDays: stats.totalDays,
        credibleInterval: {
          lower: (interval.lower * 100).toFixed(1) + "%",
          upper: (interval.upper * 100).toFixed(1) + "%"
        }
      };
      
      // Log details for current month
      if (m === currentMonth) {
        console.log(`Current month (${m}) risk calculation:`, {
          baseRisk: 1 - Math.pow((b0 + T) / (b0 + T + timeframeDays), (a0 * stats.baseSeasonalFactor + N)),
          enhancedRisk: risk,
          credibleInterval: {
            lower: (interval.lower * 100).toFixed(1) + "%",
            upper: (interval.upper * 100).toFixed(1) + "%"
          },
          baseSeasonalFactor: stats.baseSeasonalFactor,
          enhancedSeasonalFactor: S_m,
          volatilityAdjustment: stats.volatilityAdjustment,
          onChainRisk: stats.onChainRisk,
          onChainFactor: stats.onChainFactor,
          sentimentFactor: stats.sentimentFactor,
          cycleFactor: stats.cycleFactor
        });
      }
    }
  
  // Store monthly stats for potential UI visualization
  state.monthlyRiskStats = monthlyStats;
  
  return riskByMonth;
}

/**
 * Calculate month-specific sentiment factor
 * @param {number} month - Month (1-12)
 * @param {number} globalSentimentFactor - Base sentiment factor
 * @param {Array} monthData - Data for this specific month
 * @returns {number} Month-specific sentiment factor
 */
function calculateMonthSentimentFactor(month, globalSentimentFactor, monthData) {
  // Start with the global sentiment as base
  let monthSentimentFactor = globalSentimentFactor;
  
  // Analyze historical performance of this month
  // Calculate average return for this month
  const returns = monthData.map(d => d.logReturn).filter(r => !isNaN(r) && isFinite(r));
  const avgReturn = returns.length > 0 ? 
    returns.reduce((sum, val) => sum + val, 0) / returns.length : 0;
  
  // Analyze historical trends by month
  switch(month) {
    // January - Often positive after year-end tax selling
    case 1:
      monthSentimentFactor *= 0.9; // More positive sentiment
      break;
      
    // February - Mixed, relatively neutral
    case 2:
      // Standard factor
      break;
      
    // March - Historically volatile, tax season in US
    case 3:
      monthSentimentFactor *= 1.1; // Slightly more negative sentiment
      break;
      
    // April - Tax deadline, often relief afterward
    case 4:
      // Standard factor
      break;
      
    // May - Often marks seasonal inflection "Sell in May and go away"
    case 5:
      monthSentimentFactor *= 1.15; // More negative sentiment
      break;
      
    // June - Summer doldrums begin
    case 6:
      monthSentimentFactor *= 1.05; // Slightly more negative
      break;
      
    // July - Summer doldrums continue
    case 7:
      // Standard factor
      break;
      
    // August - Late summer volatility
    case 8:
      monthSentimentFactor *= 1.1; // More negative sentiment
      break;
      
    // September - Historically worst month for markets
    case 9:
      monthSentimentFactor *= 1.2; // Most negative sentiment
      break;
      
    // October - Historical crash month, but often bottoms
    case 10:
      monthSentimentFactor *= 1.15; // More negative, but can signal bottoms
      break;
      
    // November - Beginning of seasonal strength
    case 11:
      monthSentimentFactor *= 0.95; // Slightly more positive
      break;
      
    // December - Holiday sentiment, tax considerations
    case 12:
      monthSentimentFactor *= 0.9; // More positive sentiment
      break;
  }
  
  // Further adjust based on historical returns for this month
  if (avgReturn < -0.001) {
    // Historical negative returns suggest higher risk
    monthSentimentFactor *= 1.1;
  } else if (avgReturn > 0.001) {
    // Historical positive returns suggest lower risk
    monthSentimentFactor *= 0.9;
  }
  
  // Ensure reasonable bounds (0.5 to 2.0)
  return Math.min(2.0, Math.max(0.5, monthSentimentFactor));
}

/**
 * Calculate month-specific market cycle factor
 * @param {number} month - Month (1-12)
 * @param {number} globalCycleFactor - Base cycle factor
 * @param {Array} monthData - Data for this specific month
 * @returns {number} Month-specific market cycle factor
 */
function calculateMonthCycleFactor(month, globalCycleFactor, monthData) {
  // Start with the global cycle factor
  let monthCycleFactor = globalCycleFactor;
  
  // Analyze if this month appears early or late in market cycles
  // This is based on empirical analysis of Bitcoin market cycles
  
  // Early-cycle months (typically stronger)
  if ([11, 12, 1, 2].includes(month)) {
    // Reduce cycle factor (less risk) in early-cycle months
    monthCycleFactor *= 0.9;
  }
  
  // Mid-cycle months (typically steady)
  else if ([3, 4, 5, 6].includes(month)) {
    // Neutral effect
  }
  
  // Late-cycle months (typically weaker)
  else if ([7, 8, 9, 10].includes(month)) {
    // Increase cycle factor (more risk) in late-cycle months
    monthCycleFactor *= 1.15;
  }
  
  // Further refine based on this month's position in previous halvings
  // Bitcoin halving months: May 2020, July 2016, November 2012
  // For months near halvings, adjust the cycle factor
  const halvingMonths = [5, 7, 11]; // May, July, November
  const postHalvingMonths = [6, 8, 12, 1]; // Months after halvings
  
  if (halvingMonths.includes(month)) {
    // Halving months often have increased interest and volatility
    monthCycleFactor *= 1.1;
  } else if (postHalvingMonths.includes(month)) {
    // Post-halving months often see positive momentum
    monthCycleFactor *= 0.95;
  }
  
  // Analyze historical extreme events frequency in this month
  const extremeEventsCount = monthData.filter(d => d.extremeEvent === 1).length;
  const extremeEventRate = extremeEventsCount / monthData.length;
  
  // If this month historically has more extreme events, increase the cycle factor
  if (extremeEventRate > 0.015) { // More than 1.5% of days have extreme events
    monthCycleFactor *= 1.1;
  } else if (extremeEventRate < 0.005) { // Less than 0.5% of days
    monthCycleFactor *= 0.9;
  }
  
  // Ensure reasonable bounds (0.5 to 2.0)
  return Math.min(2.0, Math.max(0.5, monthCycleFactor));
}

/**
 * Create an on-chain metrics dashboard for UI display
 * @returns {string} HTML markup for the dashboard
 */
export function createOnChainDashboard() {
  // Get latest metrics
  const metrics = state.latestOnChainMetrics;
  
  if (!metrics) {
    return `
      <div class="metrics-placeholder">
        <p>On-chain metrics data not available</p>
      </div>
    `;
  }
  
  // Format metrics values
  const formatValue = (value, decimals = 2) => {
    if (value === undefined || value === null) return 'N/A';
    return typeof value === 'number' ? value.toFixed(decimals) : value;
  };
  
  // Format change values with + or - prefix and % suffix
  const formatChange = (change, decimals = 2) => {
    if (change === undefined || change === null) return 'N/A';
    const prefix = change >= 0 ? '+' : '';
    return `${prefix}${change.toFixed(decimals)}%`;
  };
  
  // Determine class for change values (positive/negative)
  const getChangeClass = (change) => {
    if (change === undefined || change === null) return '';
    return change >= 0 ? 'positive' : 'negative';
  };
  
  // Determine risk level class
  const getRiskClass = (riskLevel) => {
    switch (riskLevel) {
      case 'Extreme': return 'extreme-risk';
      case 'High': return 'high-risk';
      case 'Moderate': return 'moderate-risk';
      case 'Low': return 'low-risk';
      case 'Very Low': return 'very-low-risk';
      default: return '';
    }
  };
  
  // Create the dashboard HTML
  return `
    <div class="on-chain-dashboard">
      <div class="dashboard-header">
        <h3>On-Chain Metrics Dashboard</h3>
        <div class="last-updated">Last updated: ${metrics.lastUpdated.toLocaleString()}</div>
      </div>
      
      <div class="metrics-risk-indicator ${getRiskClass(metrics.riskLevel)}">
        <div class="risk-level-label">Risk Level:</div>
        <div class="risk-level-value">${metrics.riskLevel}</div>
      </div>
      
      <div class="metrics-grid">
        <!-- Market Value to Realized Value (MVRV) -->
        <div class="metric-card">
          <div class="metric-title">MVRV Ratio</div>
          <div class="metric-value">${formatValue(metrics.mvrv.value)}</div>
          <div class="metric-details">
            <div class="metric-change ${getChangeClass(metrics.mvrv.change)}">
              ${formatChange(metrics.mvrv.change)}
            </div>
            <div class="metric-zscore">Z-Score: ${formatValue(metrics.mvrv.zScore)}</div>
          </div>
          <div class="metric-description">
            Shows market valuation vs. realized value. Values > 3.5 historically indicate overvaluation.
          </div>
        </div>
        
        <!-- Network Value to Transactions (NVT) -->
        <div class="metric-card">
          <div class="metric-title">NVT Ratio</div>
          <div class="metric-value">${formatValue(metrics.nvt.value)}</div>
          <div class="metric-details">
            <div class="metric-change ${getChangeClass(metrics.nvt.change)}">
              ${formatChange(metrics.nvt.change)}
            </div>
            <div class="metric-zscore">Z-Score: ${formatValue(metrics.nvt.zScore)}</div>
          </div>
          <div class="metric-description">
            Network Value to Transactions ratio. Higher values indicate potential overvaluation.
          </div>
        </div>
        
        <!-- Active Addresses -->
        <div class="metric-card">
          <div class="metric-title">Active Addresses</div>
          <div class="metric-value">${metrics.activeAddresses ? metrics.activeAddresses.value.toLocaleString() : 'N/A'}</div>
          <div class="metric-details">
            <div class="metric-change ${getChangeClass(metrics.activeAddresses ? metrics.activeAddresses.change : 0)}">
              ${formatChange(metrics.activeAddresses ? metrics.activeAddresses.change : 0)}
            </div>
          </div>
          <div class="metric-description">
            Daily active addresses. Indicates network utilization and adoption.
          </div>
        </div>
        
        <!-- Supply Shock -- still working this out!
        <div class="metric-card">
          <div class="metric-title">Supply Shock Ratio</div>
          <div class="metric-value">${formatValue(metrics.supplyShock ? metrics.supplyShock.value : null)}</div>
          <div class="metric-details">
            <div class="metric-change ${getChangeClass(metrics.supplyShock ? metrics.supplyShock.change : 0)}">
              ${formatChange(metrics.supplyShock ? metrics.supplyShock.change : 0)}
            </div>
          </div>
          <div class="metric-description">
            Ratio of short-term to long-term supply. Lower values can precede price increases.
          </div>
        </div> -->
        
        <!-- Volatility (Replace Supply Shock) -->
        <div class="metric-card">
          <div class="metric-title">Volatility</div>
          <div class="metric-value">${formatValue(metrics.volatility ? metrics.volatility.recent * 100 : 0, 2)}%</div>
          <div class="metric-details">
            <div class="metric-change ${metrics.volatility && metrics.volatility.ratio < 1 ? 'positive' : 'negative'}">
              ${metrics.volatility ? 
                `${Math.round(Math.abs(metrics.volatility.ratio - 1) * 100)}% ${metrics.volatility.ratio < 1 ? 'below' : 'above'} average` : 
                'No data'}
            </div>
          </div>
          <div class="metric-description">
            30-day price volatility, a key input to the risk model. ${metrics.volatility && metrics.volatility.ratio ? 
              `Current volatility ${metrics.volatility.ratio < 1 ? 'reduces' : 'increases'} crash risk.` : 
              'Lower volatility typically indicates reduced crash risk.'}
          </div>
        </div>
        
        
        <!-- Cycle Position -->
        <div class="metric-card">
          <div class="metric-title">Market Cycle Position</div>
          <div class="metric-value">${formatValue(metrics.cyclePosition * 100)}%</div>
          <div class="metric-details">
            <div class="cycle-progress-bar">
              <div class="cycle-progress" style="width:${(metrics.cyclePosition * 100).toFixed(2)}%"></div>
            </div>
          </div>
          <div class="metric-description">
            Position in the market cycle. 0% = cycle bottom, 100% = cycle top.
          </div>
        </div>
      </div>
      
      <div class="dashboard-footer">
        <div class="onchain-info-note">
          On-chain metrics provide fundamental insights into Bitcoin network health and valuation.
        </div>
      </div>
    </div>
  `;
}

// Determine trend class for volatility
const getVolatilityTrend = (volatility) => {
  if (!volatility) return '';
  // Lower volatility is generally positive for stable growth
  return volatility.recent < volatility.historical ? 'positive' : 'negative';
};

/**
 * Prepare on-chain metrics for chart visualization
 * @param {number} daysToShow - Number of days of data to include
 * @returns {Object} Chart data configuration
 */
export function prepareOnChainChartData(daysToShow = 365) {
  if (!state.onChainData || state.onChainData.length === 0) {
    console.error('No on-chain data available for chart preparation');
    return null;
  }
  
  // Limit to the requested number of days
  const data = state.onChainData.slice(-daysToShow);
  
  // Check for specific metrics in the data we're using for charts
  const metricCounts = {
    MVRV: data.filter(d => d.MVRV !== undefined).length,
    NVT: data.filter(d => d.NVT !== undefined).length,
    CYCLE_POSITION: data.filter(d => d.CYCLE_POSITION !== undefined).length,
    ACTIVE_ADDRESSES: data.filter(d => d.ACTIVE_ADDRESSES !== undefined).length
  };
  
  console.log('On-chain metrics availability for charts:', metricCounts);
  
  // Check the first 10 datapoints to see exact values
  if (data.length > 10) {
    console.log('First 10 data points metrics (sample):');
    data.slice(0, 10).forEach((d, i) => {
      console.log(`Point ${i}:`, {
        date: d.date,
        MVRV: d.MVRV,
        NVT: d.NVT, 
        CYCLE_POSITION: d.CYCLE_POSITION
      });
    });
  }
  
  // Create datasets for Chart.js
  const chartData = {
    labels: data.map(d => d.date),
    datasets: []
  };
  
  // Add price dataset
  chartData.datasets.push({
    label: 'Price (USD)',
    data: data.map(d => d.price),
    borderColor: 'rgba(75, 192, 192, 1)',
    backgroundColor: 'rgba(75, 192, 192, 0.2)',
    yAxisID: 'price',
    fill: false
  });
  
  // Add MVRV dataset if available
  if (metricCounts.MVRV > 0) {
    chartData.datasets.push({
      label: 'MVRV Ratio',
      data: data.map(d => d.MVRV),
      borderColor: 'rgba(255, 159, 64, 1)',
      backgroundColor: 'rgba(255, 159, 64, 0.2)',
      yAxisID: 'metrics',
      fill: false
    });
  }
  
  // Add NVT dataset if available
  if (metricCounts.NVT > 0) {
    chartData.datasets.push({
      label: 'NVT Ratio (scaled ÷10)',
      data: data.map(d => d.NVT ? d.NVT / 10 : null),
      borderColor: 'rgba(153, 102, 255, 1)',
      backgroundColor: 'rgba(153, 102, 255, 0.2)',
      yAxisID: 'metrics',
      fill: false
    });
  }
  
  // Add Active Addresses dataset if available
  if (metricCounts.ACTIVE_ADDRESSES > 0) {
    const maxAddresses = Math.max(...data.map(d => d.ACTIVE_ADDRESSES || 0));
    const scaleFactor = maxAddresses > 0 ? 3 / maxAddresses : 1; // Scale to fit on chart
    
    chartData.datasets.push({
      label: 'Active Addresses (scaled)',
      data: data.map(d => d.ACTIVE_ADDRESSES ? d.ACTIVE_ADDRESSES * scaleFactor : null),
      borderColor: 'rgba(54, 162, 235, 1)',
      backgroundColor: 'rgba(54, 162, 235, 0.2)',
      yAxisID: 'metrics',
      fill: false
    });
  }
  
  return chartData;
}
/**
 * Ensure on-chain data is properly initialized
 * @param {Array} data - Bitcoin price data to process 
 * @returns {boolean} - True if data was initialized successfully
 */
export function ensureOnChainDataInitialized(data) {
  console.log('Ensuring on-chain data is initialized');
  
  if (!state.onChainData || state.onChainData.length === 0) {
    console.log('On-chain data not found, generating from price data');
    try {
      // Process the data
      const onChainResults = processOnChainData(data);
      
      // Store the results in state
      state.onChainData = onChainResults.enhancedData;
      state.latestOnChainMetrics = onChainResults.latestMetrics;
      
      console.log('On-chain data initialized with', 
                 state.onChainData ? state.onChainData.length : 0, 'data points');
      
      // Explicitly trigger chart rendering and event dispatch
      try {
        // Import needed functions using a dynamic import if they're not in scope
        import('./onchain-visualizations.js').then(module => {
          console.log('Explicitly triggering chart rendering after data initialization');
          if (typeof module.renderOnChainCharts === 'function') {
            module.renderOnChainCharts();
          }
          if (typeof module.dispatchOnChainDataLoaded === 'function') {
            module.dispatchOnChainDataLoaded();
          }
        }).catch(err => {
          console.error('Failed to import visualization module:', err);
        });
      } catch (renderError) {
        console.error('Error triggering charts:', renderError);
      }
      
      return true;
    } catch (error) {
      console.error('Failed to initialize on-chain data:', error);
      return false;
    }
  } else {
    console.log('On-chain data already initialized with', state.onChainData.length, 'data points');
    return true;
  }
}

/**
 * Apply on-chain metrics to update the main risk gauge
 * Call this function after on-chain data is loaded and processed
 */
export function applyOnChainRiskToGauge() {
  console.log("Applying on-chain metrics to main risk gauge");
  
  // Check if we have the necessary data
  if (!state.latestOnChainMetrics || !state.riskByMonth || !state.currentTimeframe) {
    console.error("Cannot update gauge: missing required data");
    return;
  }
  
  // Get current timeframe and month
  const timeframe = state.currentTimeframe || 30; // Default to 30 days
  const currentMonthIndex = new Date().getMonth();
  
  // Get the current risk for this month from state
  let currentMonthRiskData = state.riskByMonth[timeframe][currentMonthIndex + 1] || 0;
  
  // Extract the risk value, handling both old and new formats
  let riskValue, lowerBound, upperBound;
  if (currentMonthRiskData && typeof currentMonthRiskData === 'object' && currentMonthRiskData.risk !== undefined) {
    riskValue = currentMonthRiskData.risk;
    lowerBound = currentMonthRiskData.lower;
    upperBound = currentMonthRiskData.upper;
    console.log(`Current month risk data is object with risk: ${riskValue}, bounds: [${lowerBound}, ${upperBound}]`);
  } else {
    riskValue = currentMonthRiskData;
    console.log(`Current month risk data is number: ${riskValue}`);
  }
  
  // Get on-chain metrics risk factor
  const metrics = state.latestOnChainMetrics;
  let onChainRiskFactor = 1.0;
  
  if (metrics && metrics.riskLevel) {
    // Map risk levels to adjustment factors
    // These factors are more aggressive to ensure visible impact
    const riskLevelFactors = {
      'Extreme': 1.5,    // 50% increase in risk
      'High': 1.3,       // 30% increase
      'Moderate': 1.0,   // No change
      'Low': 0.8,        // 20% decrease
      'Very Low': 0.7    // 30% decrease
    };
    
    onChainRiskFactor = riskLevelFactors[metrics.riskLevel] || 1.0;
    console.log(`Applying on-chain risk factor: ${onChainRiskFactor.toFixed(2)} (${metrics.riskLevel})`);
    
    // Apply additional metrics weighting if available
    if (metrics.mvrv && metrics.mvrv.zScore !== undefined) {
      // MVRV Z-score: Higher values mean higher risk
      const mvrvFactor = 1.0 + Math.min(0.2, Math.max(-0.2, metrics.mvrv.zScore / 10));
      onChainRiskFactor *= mvrvFactor;
      console.log(`MVRV Z-score adjustment: ${mvrvFactor.toFixed(2)}`);
    }
    
    if (metrics.nvt && metrics.nvt.zScore !== undefined) {
      // NVT Z-score: Higher values mean higher risk
      const nvtFactor = 1.0 + Math.min(0.15, Math.max(-0.15, metrics.nvt.zScore / 10));
      onChainRiskFactor *= nvtFactor;
      console.log(`NVT Z-score adjustment: ${nvtFactor.toFixed(2)}`);
    }
    
    if (metrics.cyclePosition !== undefined) {
      // Cycle position: Higher values mean higher risk
      const cycleFactor = 1.0 + Math.min(0.25, Math.max(-0.25, (metrics.cyclePosition - 0.5) * 0.5));
      onChainRiskFactor *= cycleFactor;
      console.log(`Cycle position adjustment: ${cycleFactor.toFixed(2)}`);
    }
    
    // Calculate on-chain enhanced risk
    const enhancedRisk = Math.min(0.95, Math.max(0.05, riskValue * onChainRiskFactor));
    console.log(`Original risk: ${(riskValue * 100).toFixed(1)}%, Enhanced risk: ${(enhancedRisk * 100).toFixed(1)}%`);
    
    // Update the risk value in state - handle both object and scalar formats
    if (typeof currentMonthRiskData === 'object' && currentMonthRiskData !== null) {
      // Calculate adjustment factor to preserve interval proportions
      const adjustmentFactor = enhancedRisk / riskValue;
      
      // Ensure lower bound doesn't exceed risk value
      let adjustedLower = Math.min(
        enhancedRisk * 0.9,  // Lower bound shouldn't exceed 90% of risk
        Math.max(0.05, lowerBound * adjustmentFactor)
      );
      
      // Ensure upper bound is at least as high as risk value
      let adjustedUpper = Math.max(
        enhancedRisk * 1.1,  // Upper bound should be at least 110% of risk
        Math.min(0.95, upperBound * adjustmentFactor)
      );
      
      console.log(`Credible interval adjustment: Original [${(lowerBound*100).toFixed(1)}%, ${(upperBound*100).toFixed(1)}%]`);
      console.log(`Adjusted to: [${(adjustedLower*100).toFixed(1)}%, ${(adjustedUpper*100).toFixed(1)}%] for risk ${(enhancedRisk*100).toFixed(1)}%`);
      
      state.riskByMonth[timeframe][currentMonthIndex + 1] = {
        risk: enhancedRisk,
        lower: adjustedLower,
        upper: adjustedUpper
      };
    } else {
      // For scalar format, just update the value
      state.riskByMonth[timeframe][currentMonthIndex + 1] = enhancedRisk;
    }
    
    // Format for display
    const riskPercentage = (enhancedRisk * 100).toFixed(1);
    
    // Update the gauge with the enhanced risk value and credible interval if available
    if (typeof currentMonthRiskData === 'object' && lowerBound !== undefined && upperBound !== undefined) {
      // Scale bounds by the same factor as the risk (approximately)
      const scaledLower = Math.min(0.95, Math.max(0.05, lowerBound * onChainRiskFactor));
      const scaledUpper = Math.min(0.95, Math.max(0.05, upperBound * onChainRiskFactor));
      
      const credibleInterval = {
        lower: (scaledLower * 100).toFixed(1) + '%',
        upper: (scaledUpper * 100).toFixed(1) + '%'
      };
      
      updateGauge(riskPercentage, credibleInterval);
    } else {
      updateGauge(riskPercentage);
    }
    
    // Update the prominent percentage display
    const prominentPercentage = document.getElementById('prominentPercentage');
    if (prominentPercentage) {
      prominentPercentage.textContent = `${riskPercentage}%`;
      
      // Update class based on risk level
      prominentPercentage.classList.remove('high-risk', 'medium-risk', 'low-risk');
      if (enhancedRisk >= 0.7) {
        prominentPercentage.classList.add('high-risk');
      } else if (enhancedRisk >= 0.4) {
        prominentPercentage.classList.add('medium-risk');
      } else {
        prominentPercentage.classList.add('low-risk');
      }
    }
    
    // Also update calendar cards to reflect the new risk
    updateCalendarWithEnhancedRisk(enhancedRisk, currentMonthIndex + 1);
    
    // Update the YouTuber mode risk display if it's visible
    updateYoutuberRiskDisplay(riskPercentage);
    
    return true;
  } else {
    console.warn("No on-chain risk level available");
    return false;
  }
}

/**
 * Update the specific month card in the calendar with enhanced risk
 */
function updateCalendarWithEnhancedRisk(risk, monthIndex) {
  const cards = document.querySelectorAll('.month-card');
  if (!cards || cards.length === 0) {
    console.warn("No month cards found to update");
    return;
  }
  
  // Find the card for the current month
  const currentMonthCard = cards[monthIndex - 1]; // 0-based array, 1-based month index
  if (!currentMonthCard) {
    console.warn(`Month card for index ${monthIndex} not found`);
    return;
  }
  
  const riskPercentage = (risk * 100).toFixed(1);
  
  // Update risk percentage
  const riskDisplay = currentMonthCard.querySelector('.risk-percentage');
  if (riskDisplay) {
    riskDisplay.textContent = `${riskPercentage}%`;
  }
  
  // Update progress fill
  const progressFill = currentMonthCard.querySelector('.progress-fill');
  if (progressFill) {
    progressFill.style.width = `${riskPercentage}%`;
  }
  
  // Update risk class
  const riskClass = `risk-${Math.floor(risk * 10) * 10}`;
  currentMonthCard.className = currentMonthCard.className.replace(/risk-\d+/, riskClass);
  
  // Update high-risk class
  if (risk > 0.6) {
    currentMonthCard.classList.add('high-risk');
  } else {
    currentMonthCard.classList.remove('high-risk');
  }
  
  console.log(`Updated calendar month ${monthIndex} with risk ${riskPercentage}%`);
}

/**
 * Update YouTuber mode risk display
 */
function updateYoutuberRiskDisplay(riskPercentage) {
  const youtuberRiskPercentage = document.getElementById('youtuberRiskPercentage');
  const youtuberProgressFill = document.getElementById('youtuberProgressFill');
  
  if (youtuberRiskPercentage) {
    youtuberRiskPercentage.textContent = `${riskPercentage}%`;
    youtuberRiskPercentage.style.animation = 'none';
    setTimeout(() => {
      youtuberRiskPercentage.style.animation = 'percentagePop 1s ease-out forwards';
    }, 10);
  }
  
  if (youtuberProgressFill) {
    youtuberProgressFill.style.width = `${riskPercentage}%`;
  }
}

// Global flag to prevent multiple updates

let isUpdatingRisk = false;

/**
 * Integrates on-chain risk data into the main risk gauge and prevents multiple updates
 */
export function integrateOnChainRiskIntoGauge() {
  // Remove any existing listener to prevent duplicates
  document.removeEventListener('onChainDataLoaded', onChainDataLoadedHandler);
  
  // Add the event listener with our debounced handler
  document.addEventListener('onChainDataLoaded', onChainDataLoadedHandler);
  
  // If on-chain data is already loaded, update immediately 
  // but only if we're not already updating
  if (!isUpdatingRisk && state.onChainData && state.onChainData.length > 0 && state.latestOnChainMetrics) {
    console.log("On-chain data already available, updating main risk gauge immediately");
    applyOnChainRiskToGauge();
  }
}

/**
 * Handler for onChainDataLoaded events with debouncing
 */
function onChainDataLoadedHandler() {
  console.log("onChainDataLoaded event detected");
  
  // If we're already processing an update, skip this one
  if (isUpdatingRisk) {
    console.log("Already updating risk, skipping redundant update");
    return;
  }
  
  // Set flag to prevent multiple updates
  isUpdatingRisk = true;
  
  // Use a setTimeout to ensure all data is ready
  setTimeout(() => {
    console.log("Applying on-chain risk to gauge");
    
    // Only update the current month gauge
    applyOnChainRiskToGauge();
    
    // Reset the flag after update
    isUpdatingRisk = false;
  }, 500);
}

// Function to recalculate risk for all months
function recalculateAllMonthsRisk() {
  try {
    // Import RiskModel from the correct location
    import('../core/risk-model.js').then(RiskModel => {
      // Recalculate risk for all timeframes and all months
      RiskModel.calculateRiskForAllTimeframes();
      
      // Update the current month's gauge display
      const currentMonthIndex = new Date().getMonth();
      const currentTimeframe = state.currentTimeframe || 30;
      const currentMonthRisk = state.riskByMonth[currentTimeframe][currentMonthIndex + 1] || 0;
      const riskPercentage = (currentMonthRisk * 100).toFixed(1);
      updateGauge(riskPercentage);
      
      // Re-render the calendar with the new risk values
      import('../components/calendar.js').then(Calendar => {
        if (Calendar.renderCalendar) {
          Calendar.renderCalendar(state.riskByMonth[state.currentTimeframe], state.historicalCrashes);
        } else {
          console.warn('Calendar.renderCalendar not found');
        }
      }).catch(err => {
        console.error('Error importing calendar module:', err);
      });
    }).catch(err => {
      console.error('Error importing risk model:', err);
    });
  } catch (error) {
    console.error('Error recalculating risks:', error);
  }
}
