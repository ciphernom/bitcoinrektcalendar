 
/**
 * On-Chain Metrics Processor
 * Extracts and processes on-chain metrics from raw Bitcoin data
 */

import { calculateStandardDeviation } from '../utils/statistics.js';
import { state } from '../app.js';

// Define key on-chain metrics for crash prediction
const KEY_METRICS = {
  // Market Value to Realized Value ratio - overvaluation indicator
  MVRV: 'CapMVRVCur',
  
  // Network Value to Transactions ratio - fundamental valuation metric
  NVT: 'NVTAdj',
  NVT_90: 'NVTAdj90',
  
  // Address activity - network health indicators
  ACTIVE_ADDRESSES: 'AdrActCnt',
  
  // Supply distribution - whale metrics
  SUPPLY_TOP_1_PERCENT: 'SplyAdrTop1Pct',
  SUPPLY_TOP_10_PERCENT: 'SplyAdrTop10Pct',
  
  // Miners metrics - hashrate and selling pressure
  HASH_RATE: 'HashRate',
  MINER_REVENUE: 'RevNtv',
  
  // Transaction metrics
  TX_COUNT: 'TxCnt',
  TX_VOLUME_USD: 'TxTfrValAdjUSD',
  
  // Price and market metrics
  PRICE_USD: 'PriceUSD',
  MARKET_CAP: 'CapMrktCurUSD',
  
  // Volatility metrics
  VOLATILITY_30D: 'VtyDayRet30d',
  VOLATILITY_180D: 'VtyDayRet180d',
  
  // Supply metrics
  ACTIVE_SUPPLY_1D: 'SplyAct1d',
  ACTIVE_SUPPLY_1YR: 'SplyAct1yr',
  
  // Realized cap
  REALIZED_CAP: 'CapRealUSD',
  
  // ROI metrics - market momentum
  ROI_30D: 'ROI30d',
  ROI_1YR: 'ROI1yr'
};

/**
 * Process raw Bitcoin data to extract on-chain metrics
 * @param {Array} data - Raw Bitcoin data from the CSV
 * @returns {Object} Processed on-chain metrics
 */
export function extractOnChainMetrics(data) {
  if (!data || !data.length) {
    console.error('No data provided to extract on-chain metrics');
    return null;
  }
  
  console.log(`Extracting on-chain metrics from ${data.length} data points`);
  console.log('Checking if on-chain metrics exist in the data:');
  
  // Check if some on-chain metrics already exist in the data
  const hasMVRV = data.some(d => d.MVRV !== undefined);
  const hasNVT = data.some(d => d.NVT !== undefined);
  const hasCyclePosition = data.some(d => d.CYCLE_POSITION !== undefined);
  
  console.log('Metrics present in data:', { hasMVRV, hasNVT, hasCyclePosition });
  
  // Extract the relevant metrics for each data point
  const processedData = data.map(dataPoint => {
    const processed = {
      date: dataPoint.date instanceof Date ? dataPoint.date : new Date(dataPoint.date),
      price: parseFloat(dataPoint.PriceUSD) || parseFloat(dataPoint.price) || 0,
      timestamp: dataPoint.date instanceof Date ? dataPoint.date.getTime() : new Date(dataPoint.date).getTime()
    };
    
    // Preserve existing metrics if they're already there
    if (dataPoint.MVRV !== undefined) processed.MVRV = dataPoint.MVRV;
    if (dataPoint.NVT !== undefined) processed.NVT = dataPoint.NVT;
    if (dataPoint.NVT_90 !== undefined) processed.NVT_90 = dataPoint.NVT_90;
    if (dataPoint.ACTIVE_ADDRESSES !== undefined) processed.ACTIVE_ADDRESSES = dataPoint.ACTIVE_ADDRESSES;
    if (dataPoint.TX_COUNT !== undefined) processed.TX_COUNT = dataPoint.TX_COUNT;
    if (dataPoint.TX_VOLUME_USD !== undefined) processed.TX_VOLUME_USD = dataPoint.TX_VOLUME_USD;
    if (dataPoint.CYCLE_POSITION !== undefined) processed.CYCLE_POSITION = dataPoint.CYCLE_POSITION;
    
    // Extract any other metrics from KEY_METRICS mapping
    Object.entries(KEY_METRICS).forEach(([metricName, csvField]) => {

      
      if (dataPoint[csvField] !== undefined) {
        const value = parseFloat(dataPoint[csvField]);
        if (!isNaN(value)) {
          processed[metricName] = value;
        }
      }
    });
    
    return processed;
  });
  
  // Sort by date (ascending)
  processedData.sort((a, b) => a.timestamp - b.timestamp);
  
  // Check for metrics in processed data
  const processedHasMVRV = processedData.some(d => d.MVRV !== undefined);
  const processedHasNVT = processedData.some(d => d.NVT !== undefined);
  const processedHasCyclePosition = processedData.some(d => d.CYCLE_POSITION !== undefined);
  
  console.log('Metrics present in processed data:', { 
    processedHasMVRV, 
    processedHasNVT, 
    processedHasCyclePosition 
  });
  
  return processedData;
}

/**
 * Calculate derived metrics from raw on-chain data
 * @param {Array} processedData - Data with extracted metrics
 * @returns {Array} Enhanced data with derived metrics
 */
export function calculateDerivedMetrics(processedData) {
  if (!processedData || !processedData.length) {
    console.error('No processed data to calculate derived metrics');
    return [];
  }

  // Create a copy to avoid modifying the original data
  const enhancedData = [...processedData];

  // Calculate moving averages and momentum indicators
  const periods = [7, 14, 30, 60, 90, 180];
  
  enhancedData.forEach((dataPoint, index) => {
        if (index >= enhancedData.length - 5) { // Check last 5 data points
            console.log("Processing recent data point:", dataPoint.date);
            console.log("ACTIVE_SUPPLY_1D exists:", dataPoint.ACTIVE_SUPPLY_1D !== undefined);
            console.log("ACTIVE_SUPPLY_1YR exists:", dataPoint.ACTIVE_SUPPLY_1YR !== undefined);
            if (dataPoint.ACTIVE_SUPPLY_1D !== undefined && dataPoint.ACTIVE_SUPPLY_1YR !== undefined) {
              console.log("ACTIVE_SUPPLY_1D value:", dataPoint.ACTIVE_SUPPLY_1D);
              console.log("ACTIVE_SUPPLY_1YR value:", dataPoint.ACTIVE_SUPPLY_1YR);
            }
          }
    periods.forEach(period => {
      // Skip if we don't have enough historical data
      if (index < period) return;
      
      // Get historical window
      const window = enhancedData.slice(index - period, index);
      
      // Calculate price moving averages
      if (dataPoint.price) {
        const prices = window.map(d => d.price).filter(p => !isNaN(p));
        if (prices.length > 0) {
          dataPoint[`PRICE_MA_${period}`] = prices.reduce((sum, p) => sum + p, 0) / prices.length;
        }
      }
      
      // Calculate MVRV moving averages
      if (dataPoint.MVRV) {
        const mvrv = window.map(d => d.MVRV).filter(m => !isNaN(m));
        if (mvrv.length > 0) {
          dataPoint[`MVRV_MA_${period}`] = mvrv.reduce((sum, m) => sum + m, 0) / mvrv.length;
        }
      }
      
      // Calculate NVT moving averages
      if (dataPoint.NVT) {
        const nvt = window.map(d => d.NVT).filter(n => !isNaN(n));
        if (nvt.length > 0) {
          dataPoint[`NVT_MA_${period}`] = nvt.reduce((sum, n) => sum + n, 0) / nvt.length;
        }
      }
      
      // Calculate active addresses momentum
      if (dataPoint.ACTIVE_ADDRESSES) {
        const addresses = window.map(d => d.ACTIVE_ADDRESSES).filter(a => !isNaN(a));
        if (addresses.length > 0) {
          const avgAddresses = addresses.reduce((sum, a) => sum + a, 0) / addresses.length;
          dataPoint[`ADDR_MOMENTUM_${period}`] = dataPoint.ACTIVE_ADDRESSES / avgAddresses - 1;
        }
      }
    });
    
    // Calculate price momentum (percent change over different periods)
    periods.forEach(period => {
      if (index >= period && enhancedData[index - period].price) {
        dataPoint[`PRICE_CHANGE_${period}D`] = (dataPoint.price / enhancedData[index - period].price) - 1;
      }
    });
    
    // Calculate z-scores for key metrics (standard deviations from 90-day mean)
    if (index >= 90) {
      const window90 = enhancedData.slice(index - 90, index);
      
      // MVRV z-score
      if (dataPoint.MVRV) {
        const mvrvValues = window90.map(d => d.MVRV).filter(m => !isNaN(m));
        if (mvrvValues.length > 0) {
          const mvrvMean = mvrvValues.reduce((sum, m) => sum + m, 0) / mvrvValues.length;
          const mvrvStdDev = calculateStandardDeviation(mvrvValues);
          if (mvrvStdDev > 0) {
            dataPoint.MVRV_Z_SCORE = (dataPoint.MVRV - mvrvMean) / mvrvStdDev;
          }
        }
      }
      
      // NVT z-score
      if (dataPoint.NVT) {
        const nvtValues = window90.map(d => d.NVT).filter(n => !isNaN(n));
        if (nvtValues.length > 0) {
          const nvtMean = nvtValues.reduce((sum, n) => sum + n, 0) / nvtValues.length;
          const nvtStdDev = calculateStandardDeviation(nvtValues);
          if (nvtStdDev > 0) {
            dataPoint.NVT_Z_SCORE = (dataPoint.NVT - nvtMean) / nvtStdDev;
          }
        }
      }
    }
    
    // Calculate Market Cap to Thermocap Ratio (proxy using realized cap if thermocap not available)
    if (dataPoint.MARKET_CAP && dataPoint.REALIZED_CAP) {
      dataPoint.MCTC_RATIO = dataPoint.MARKET_CAP / dataPoint.REALIZED_CAP;
    }
    
    // Calculate Puell Multiple proxy (if miner revenue is available)
    if (dataPoint.MINER_REVENUE && index >= 365) {
      const yearWindow = enhancedData.slice(index - 365, index);
      const revenueValues = yearWindow.map(d => d.MINER_REVENUE).filter(r => !isNaN(r));
      if (revenueValues.length > 180) { // Need significant amount of data
        const avgRevenue = revenueValues.reduce((sum, r) => sum + r, 0) / revenueValues.length;
        if (avgRevenue > 0) {
          dataPoint.PUELL_MULTIPLE = dataPoint.MINER_REVENUE / avgRevenue;
        }
      }
    }

    // Calculate Supply Shock Ratio (active supply 1d / active supply 1yr)
    if (dataPoint.ACTIVE_SUPPLY_1D !== undefined && dataPoint.ACTIVE_SUPPLY_1YR !== undefined) {
      console.log("Supply metrics found for date:", dataPoint.date);
      console.log("ACTIVE_SUPPLY_1D:", dataPoint.ACTIVE_SUPPLY_1D);
      console.log("ACTIVE_SUPPLY_1YR:", dataPoint.ACTIVE_SUPPLY_1YR);
      
      if (dataPoint.ACTIVE_SUPPLY_1YR > 0) {
        dataPoint.SUPPLY_SHOCK_RATIO = dataPoint.ACTIVE_SUPPLY_1D / dataPoint.ACTIVE_SUPPLY_1YR;
        console.log("Created SUPPLY_SHOCK_RATIO:", dataPoint.SUPPLY_SHOCK_RATIO);
      } else {
        console.log("Skipped ratio calculation - denominator is zero");
      }
    }
    // Calculate whale dominance change
    if (dataPoint.SUPPLY_TOP_10_PERCENT && index > 0 && enhancedData[index - 1].SUPPLY_TOP_10_PERCENT) {
      dataPoint.WHALE_DOMINANCE_CHANGE = dataPoint.SUPPLY_TOP_10_PERCENT - enhancedData[index - 1].SUPPLY_TOP_10_PERCENT;
    }
  });
  
  // Add cyclical metrics (where appropriate values exist in recent data)
  addCyclicalMetrics(enhancedData);
  
  return enhancedData;
}

/**
 * Add cyclical metrics based on market cycles
 * @param {Array} data - Enhanced data with derived metrics
 */
function addCyclicalMetrics(data) {
  if (!data || data.length < 365) return;
  
  // Find the all-time high price before each data point
  let ath = 0;
  data.forEach((dataPoint, index) => {
    if (dataPoint.price > ath) {
      ath = dataPoint.price;
    }
    dataPoint.PRICE_FROM_ATH = ath > 0 ? dataPoint.price / ath : 1;
  });
  
  // Calculate cyclical metrics using MVRV and other indicators
  const recentData = data.slice(-730); // Last 2 years
  if (recentData.length > 365) {
    const mvrvValues = recentData.map(d => d.MVRV).filter(m => !isNaN(m));
    if (mvrvValues.length > 180) {
      const mvrvMax = Math.max(...mvrvValues);
      const mvrvMin = Math.min(...mvrvValues);
      const mvrvRange = mvrvMax - mvrvMin;
      
      // Add cycle position for recent data points (normalized 0-1 where 0 is bottom, 1 is top)
      recentData.forEach(dataPoint => {
        if (dataPoint.MVRV !== undefined && mvrvRange > 0) {
          dataPoint.CYCLE_POSITION = (dataPoint.MVRV - mvrvMin) / mvrvRange;
        }
      });
    }
  }
}

/**
 * Calculate crash risk indicators from on-chain metrics
 * @param {Array} enhancedData - Data with derived metrics
 * @returns {Object} Crash risk indicators by month
 */
export function calculateOnChainRiskIndicators(enhancedData) {
  if (!enhancedData || enhancedData.length < 90) {
    console.error('Insufficient data to calculate on-chain risk indicators');
    return {};
  }
  
  // Get the most recent 90 days of data for current conditions
  const recentData = enhancedData.slice(-90);
  
  // Create risk indicators for each month
  const riskByMonth = {};
  
  for (let month = 1; month <= 12; month++) {
    // Filter historical crash data for this month
    const monthData = enhancedData.filter(d => d.date.getMonth() + 1 === month);
    
    if (monthData.length === 0) {
      riskByMonth[month] = 0.5; // Neutral if no data
      continue;
    }
    
    // Calculate risk based on multiple on-chain metrics
    const riskFactors = [];
    
    // 1. MVRV risk - higher MVRV values indicate potential crash risk
    const mvrvValues = monthData.map(d => d.MVRV).filter(m => !isNaN(m));
    if (mvrvValues.length > 0) {
      const avgMvrv = mvrvValues.reduce((sum, m) => sum + m, 0) / mvrvValues.length;
      // MVRV > 3.5 historically indicates high risk, < 1 indicates low risk
      const mvrvRisk = Math.min(1, Math.max(0, (avgMvrv - 1) / 2.5));
      riskFactors.push({ factor: 'MVRV', risk: mvrvRisk, weight: 0.20 });
    }
    
    // 2. NVT risk - higher values indicate overvaluation
    const nvtValues = monthData.map(d => d.NVT).filter(n => !isNaN(n));
    if (nvtValues.length > 0) {
      const avgNvt = nvtValues.reduce((sum, n) => sum + n, 0) / nvtValues.length;
      // NVT > 65 historically indicates high risk, < 30 indicates low risk
      const nvtRisk = Math.min(1, Math.max(0, (avgNvt - 30) / 35));
      riskFactors.push({ factor: 'NVT', risk: nvtRisk, weight: 0.15 });
    }
    
    // 3. Z-score risks - extreme values indicate potential trend reversals
    const zScores = monthData.map(d => d.MVRV_Z_SCORE).filter(z => !isNaN(z));
    if (zScores.length > 0) {
      const avgZScore = zScores.reduce((sum, z) => sum + z, 0) / zScores.length;
      // Z-score > 2 historically indicates high risk, < -1 indicates low risk
      const zScoreRisk = Math.min(1, Math.max(0, (avgZScore + 1) / 3));
      riskFactors.push({ factor: 'Z_SCORE', risk: zScoreRisk, weight: 0.15 });
    }
    
    // 4. Supply shock risk - sudden changes indicate potential price movements
    const supplyShockValues = monthData.map(d => d.SUPPLY_SHOCK_RATIO).filter(s => !isNaN(s));
    if (supplyShockValues.length > 0) {
      const avgSupplyShock = supplyShockValues.reduce((sum, s) => sum + s, 0) / supplyShockValues.length;
      // Lower values (< 0.05) indicate risk of upward price shocks, higher values (> 0.2) indicate risk of crashes
      const supplyShockRisk = Math.min(1, Math.max(0, avgSupplyShock * 5));
      riskFactors.push({ factor: 'SUPPLY_SHOCK', risk: supplyShockRisk, weight: 0.10 });
    }
    
    // 5. Whale dominance change - significant increases can precede dumps
    const whaleDominanceChanges = monthData.map(d => d.WHALE_DOMINANCE_CHANGE).filter(w => !isNaN(w));
    if (whaleDominanceChanges.length > 0) {
      const avgWhaleDominanceChange = whaleDominanceChanges.reduce((sum, w) => sum + w, 0) / whaleDominanceChanges.length;
      // Positive changes (whale accumulation) can be followed by dumps
      const whaleDominanceRisk = Math.min(1, Math.max(0, (avgWhaleDominanceChange + 0.01) * 50));
      riskFactors.push({ factor: 'WHALE_DOMINANCE', risk: whaleDominanceRisk, weight: 0.10 });
    }
    
    // 6. Price momentum risk - rapid increases often precede crashes
    const priceChanges = monthData.map(d => d.PRICE_CHANGE_30D).filter(p => !isNaN(p));
    if (priceChanges.length > 0) {
      const avgPriceChange = priceChanges.reduce((sum, p) => sum + p, 0) / priceChanges.length;
      // Price increases > 50% in 30 days indicate high risk, decreases < -20% indicate low risk
      const momentumRisk = Math.min(1, Math.max(0, (avgPriceChange + 0.2) / 0.7));
      riskFactors.push({ factor: 'PRICE_MOMENTUM', risk: momentumRisk, weight: 0.15 });
    }
    
    // 7. Cycle position risk - late cycle positions have higher crash risk
    const cyclePositions = monthData.map(d => d.CYCLE_POSITION).filter(c => !isNaN(c));
    if (cyclePositions.length > 0) {
      const avgCyclePosition = cyclePositions.reduce((sum, c) => sum + c, 0) / cyclePositions.length;
      // Higher cycle positions indicate higher risk
      riskFactors.push({ factor: 'CYCLE_POSITION', risk: avgCyclePosition, weight: 0.15 });
    }
    
    // Calculate weighted average risk
    if (riskFactors.length > 0) {
      let totalRisk = 0;
      let totalWeight = 0;
      
      riskFactors.forEach(({ risk, weight }) => {
        totalRisk += risk * weight;
        totalWeight += weight;
      });
      
      const finalRisk = totalWeight > 0 ? totalRisk / totalWeight : 0.5;
      
      // Store the calculated risk
      riskByMonth[month] = finalRisk;
    } else {
      // Default risk if no factors could be calculated
      riskByMonth[month] = 0.5;
    }
  }
  
  return riskByMonth;
}

/**
 * Get the latest on-chain metrics for use in UI displays
 * @param {Array} enhancedData - Data with derived metrics
 * @returns {Object} Latest metrics for display
 */
export function getLatestOnChainMetrics(enhancedData) {
  if (!enhancedData || enhancedData.length === 0) {
    return null;
  }
  
  // Get the most recent data point
  const latest = enhancedData[enhancedData.length - 1];
  
  // Previous data point for comparison
  const previous = enhancedData.length > 1 ? enhancedData[enhancedData.length - 2] : null;
  
  // Find most recent data point with supply metrics
  let supplyShockData = null;
  for (let i = enhancedData.length - 1; i >= 0; i--) {
    if (enhancedData[i].ACTIVE_SUPPLY_1D !== undefined && 
        enhancedData[i].ACTIVE_SUPPLY_1YR !== undefined &&
        enhancedData[i].ACTIVE_SUPPLY_1YR > 0) {
      
      // Calculate supply shock ratio if not already there
      if (enhancedData[i].SUPPLY_SHOCK_RATIO === undefined) {
        enhancedData[i].SUPPLY_SHOCK_RATIO = 
          enhancedData[i].ACTIVE_SUPPLY_1D / enhancedData[i].ACTIVE_SUPPLY_1YR;
      }
      
      supplyShockData = {
        value: enhancedData[i].SUPPLY_SHOCK_RATIO,
        date: enhancedData[i].date
      };
      
      break;
    }
  }
  // Calculate volatility directly from price data
  const recentVolatility = calculateVolatility(state.bitcoinData, 30);
  const mediumVolatility = calculateVolatility(state.bitcoinData, 90);
  
  // Calculate historical average (1 year)
  const historicalVolatility = calculateVolatility(state.bitcoinData, 365);
  
  const volatilityData = {
    recent: recentVolatility,
    medium: mediumVolatility,
    historical: historicalVolatility,
    ratio: recentVolatility / historicalVolatility
  };
  // Calculate supply shock change if possible
  let supplyShockChange = 0;
  if (supplyShockData) {
    // Try to find a previous point with supply shock for comparison
    const currentIndex = enhancedData.findIndex(d => 
      d.date.getTime() === supplyShockData.date.getTime());
    
    if (currentIndex > 0) {
      for (let i = currentIndex - 1; i >= 0; i--) {
        if (enhancedData[i].SUPPLY_SHOCK_RATIO !== undefined) {
          supplyShockChange = 
            (supplyShockData.value / enhancedData[i].SUPPLY_SHOCK_RATIO - 1) * 100;
          break;
        }
      }
    }
    
    console.log(`Using Supply Shock data from ${supplyShockData.date.toISOString()}: ${supplyShockData.value}`);
  }
  
  // Extract key metrics for display
  return {
    lastUpdated: latest.date,
    price: {
      value: latest.price,
      change: previous ? (latest.price / previous.price - 1) * 100 : 0
    },
    mvrv: {
      value: latest.MVRV,
      zScore: latest.MVRV_Z_SCORE,
      change: previous && previous.MVRV ? (latest.MVRV / previous.MVRV - 1) * 100 : 0
    },
    nvt: {
      value: latest.NVT,
      zScore: latest.NVT_Z_SCORE,
      change: previous && previous.NVT ? (latest.NVT / previous.NVT - 1) * 100 : 0
    },
    activeAddresses: {
      value: latest.ACTIVE_ADDRESSES,
      change: previous && previous.ACTIVE_ADDRESSES ? 
        (latest.ACTIVE_ADDRESSES / previous.ACTIVE_ADDRESSES - 1) * 100 : 0
    },
    supplyShock: {
      value: supplyShockData ? supplyShockData.value : undefined,
      change: supplyShockChange,
      asOfDate: supplyShockData ? supplyShockData.date : null
    },
    volatility: volatilityData,
    cyclePosition: latest.CYCLE_POSITION,
    riskLevel: calculateCurrentRiskLevel(latest)
  };
}

/**
 * Calculate current risk level from latest metrics
 * @param {Object} latest - Latest data point with metrics
 * @returns {string} Risk level description
 */
function calculateCurrentRiskLevel(latest) {
  if (!latest) return 'Unknown';
  
  // Calculate composite risk score based on key metrics
  let riskScore = 0;
  let factorCount = 0;
  
  // MVRV Z-Score risk
  if (latest.MVRV_Z_SCORE !== undefined) {
    riskScore += Math.min(1, Math.max(0, (latest.MVRV_Z_SCORE + 1) / 3));
    factorCount++;
  }
  
  // NVT Z-Score risk
  if (latest.NVT_Z_SCORE !== undefined) {
    riskScore += Math.min(1, Math.max(0, (latest.NVT_Z_SCORE + 1) / 3));
    factorCount++;
  }
  
  // Cycle position risk
  if (latest.CYCLE_POSITION !== undefined) {
    riskScore += latest.CYCLE_POSITION;
    factorCount++;
  }
  
  // Supply shock risk
  if (latest.SUPPLY_SHOCK_RATIO !== undefined) {
    riskScore += Math.min(1, Math.max(0, latest.SUPPLY_SHOCK_RATIO * 5));
    factorCount++;
  }
  
  // Calculate average risk score
  const avgRisk = factorCount > 0 ? riskScore / factorCount : 0.5;
  
  // Map to risk level
  if (avgRisk >= 0.8) return 'Extreme';
  if (avgRisk >= 0.65) return 'High';
  if (avgRisk >= 0.45) return 'Moderate';
  if (avgRisk >= 0.3) return 'Low';
  return 'Very Low';
}

/**
 * Calculate volatility from price data in a way that matches the risk model calculation
 * @param {Array} priceData - Array of price data points with logReturn values
 * @param {number} days - Number of days to calculate volatility for
 * @returns {number} Volatility (standard deviation of log returns)
 */
function calculateVolatility(priceData, days = 30) {
  if (!priceData || priceData.length < days) {
    return 0;
  }
  
  // Get the most recent data points
  const recentData = priceData.slice(-days);
  
  // Extract log returns
  const logReturns = recentData
    .map(d => d.logReturn)
    .filter(r => !isNaN(r) && isFinite(r));
  
  // Calculate standard deviation
  const mean = logReturns.reduce((sum, val) => sum + val, 0) / logReturns.length;
  const squaredDiffs = logReturns.map(val => Math.pow(val - mean, 2));
  const variance = squaredDiffs.reduce((sum, val) => sum + val, 0) / squaredDiffs.length;
  const stdDev = Math.sqrt(variance);
  
  return stdDev;
}

/**
 * Process Bitcoin data to extract and analyze on-chain metrics
 * @param {Array} data - Raw Bitcoin data
 * @returns {Object} Processed metrics and indicators
 */
export function processOnChainData(data) {
  // 1. Extract relevant metrics
  const extractedData = extractOnChainMetrics(data);
  
  // 2. Calculate derived metrics
  const enhancedData = calculateDerivedMetrics(extractedData);
  
  // 3. Calculate risk indicators
  const riskIndicators = calculateOnChainRiskIndicators(enhancedData);
  
  // 4. Get latest metrics for display
  const latestMetrics = getLatestOnChainMetrics(enhancedData);
  
  // Return comprehensive results
  return {
    enhancedData,
    riskIndicators,
    latestMetrics
  };
}
