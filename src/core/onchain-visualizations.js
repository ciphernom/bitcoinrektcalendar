/**
 * On-Chain Metrics Visualizations
 * Creates interactive charts and dashboards for on-chain data
 */

import { state } from '../app.js';
import { prepareOnChainChartData } from './enhanced-risk-model.js';

console.log("Checking Chart.js availability:", typeof Chart !== 'undefined' ? 'Available' : 'Not loaded');
// Attempt to fix Chart if not defined
if (typeof Chart === 'undefined' && typeof window !== 'undefined') {
  console.warn("Chart.js not found on first check, attempting to reference from window");
  // Try to reference Chart from window
  if (window.Chart) {
    console.log("Found Chart.js on window object, using it instead");
    const Chart = window.Chart;  // Define a local reference
  }
}
let eventDispatched = false;

/**
 * Clean up all existing chart instances
 */
function cleanupExistingCharts() {
  console.log("Cleaning up existing chart instances");
  
  // List of all chart instance variables
  const chartInstances = [
    'primaryOnChainChart', 
    'mvrvChart', 
    'nvtChart', 
    'marketCycleChart'
  ];
  
  // Destroy each chart instance if it exists
  chartInstances.forEach(chartName => {
    if (window[chartName] && typeof window[chartName].destroy === 'function') {
      try {
        window[chartName].destroy();
        window[chartName] = null;
        console.log(`Destroyed ${chartName} instance`);
      } catch (error) {
        console.error(`Error destroying ${chartName}:`, error);
      }
    }
  });
}

/**
 * Initialize on-chain metrics visualizations
 */
export function initializeOnChainVisualizations() {
  console.log("Initializing on-chain visualizations");
  
  // Check if dashboard already exists to prevent duplication
  if (document.getElementById('onChainDashboard')) {
    console.log('On-chain dashboard already exists, updating instead of recreating');
    // If dashboard exists, just trigger a chart update
    if (state.onChainData && state.onChainData.length > 0) {
      renderOnChainCharts();
      forceUpdateDashboard();
    }
    return;
  }
  
  // Create dashboard container
  createDashboardContainer();
  
  // Create chart containers
  createChartContainers();
  
  // Remove existing event listener if any
  document.removeEventListener('onChainDataLoaded', onDataLoadedHandler);
  
  // Initialize charts when data is available
  if (state.onChainData && state.onChainData.length > 0) {
    renderOnChainCharts();
  } else {
    // Set up event listener for when data becomes available
    document.addEventListener('onChainDataLoaded', onDataLoadedHandler);
  }
  
  // Add navigation link
  addOnChainNavLink();
}

// Define handler separately to allow removal
function onDataLoadedHandler() {
  console.log("onChainDataLoaded event received");
  renderOnChainCharts();
  forceUpdateDashboard();
}

/**
 * Create dashboard container in the DOM
 */
function createDashboardContainer() {
  console.log("Creating dashboard container");
  const container = document.querySelector('.container');
  
  if (!container) {
    console.error('Container element not found');
    return;
  }
  
  // Check if dashboard already exists
  const existingDashboard = document.getElementById('onChainDashboard');
  if (existingDashboard) {
    console.log('Dashboard container already exists, skipping creation');
    return;
  }
  
  // Create dashboard section
  const dashboardSection = document.createElement('div');
  dashboardSection.id = 'onChainDashboard';
  dashboardSection.className = 'on-chain-container';
  
  // Add title
  const title = document.createElement('div');
  title.className = 'on-chain-title';
  title.innerHTML = '<h2>On-Chain Health Indicators</h2>';
  dashboardSection.appendChild(title);
  
  // Add description
  const description = document.createElement('div');
  description.className = 'on-chain-description';
  description.innerHTML = `
    <p>These indicators provide insight into Bitcoin's fundamental on-chain health metrics. 
    The model incorporates these into risk calculations to enhance predictive accuracy.</p>
  `;
  dashboardSection.appendChild(description);
  
  // Add metrics dashboard placeholder
  const metricsContainer = document.createElement('div');
  metricsContainer.id = 'onChainMetricsContainer';
  metricsContainer.className = 'on-chain-metrics-container';
  metricsContainer.innerHTML = '<div class="loading-indicator">Loading on-chain metrics...</div>';
  dashboardSection.appendChild(metricsContainer);
  
  // FIX: Insert the dashboard in the correct location
  // Option 1: Simply append to the container (safest fix)
  container.appendChild(dashboardSection);
  
  /* 
  // Option 2: If you want to insert before data-info in its parent:
  const dataInfo = document.getElementById('data-info');
  if (dataInfo && dataInfo.parentNode) {
    dataInfo.parentNode.insertBefore(dashboardSection, dataInfo);
  } else {
    container.appendChild(dashboardSection);
  }
  */
  
  // Add styles for the dashboard
  addOnChainStyles();
}

/**
 * Verify dashboard DOM structure was created properly
 */
function verifyDashboardDOM() {
  console.log("Verifying on-chain dashboard DOM structure...");
  
  // Check main containers
  const dashboard = document.getElementById('onChainDashboard');
  const metricsContainer = document.getElementById('onChainMetricsContainer');
  const chartGrid = dashboard ? dashboard.querySelector('.chart-grid') : null;
  
  console.log("Dashboard exists:", !!dashboard);
  console.log("Metrics container exists:", !!metricsContainer);
  console.log("Chart grid exists:", !!chartGrid);
  
  // Check individual chart canvases
  const primaryChart = document.getElementById('primaryOnChainChart');
  const mvrvChart = document.getElementById('mvrvChart');
  const nvtChart = document.getElementById('nvtChart');
  const marketCycleChart = document.getElementById('marketCycleChart');
  
  console.log("Chart canvases exist:", {
    primaryChart: !!primaryChart,
    mvrvChart: !!mvrvChart,
    nvtChart: !!nvtChart,
    marketCycleChart: !!marketCycleChart
  });
  
  if (!dashboard || !chartGrid || !primaryChart) {
    console.error("Critical DOM elements missing! Dashboard may not render correctly.");
  }
  
  return !!dashboard && !!chartGrid && !!primaryChart;
}

/**
 * Create chart containers for various on-chain metrics
 */
function createChartContainers() {
  const dashboardSection = document.getElementById('onChainDashboard');
  
  if (!dashboardSection) {
    console.error('Dashboard section not found');
    return;
  }
  
  // Create chart grid container
  const chartGrid = document.createElement('div');
  chartGrid.className = 'chart-grid';
  
  // Primary chart container (larger)
  const primaryChartContainer = document.createElement('div');
  primaryChartContainer.className = 'chart-container primary-chart';
  primaryChartContainer.innerHTML = `
    <div class="chart-header">
      <h3>Price & On-Chain Metrics Correlation</h3>
      <div class="chart-controls">
        <select id="timeframeSelector">
          <option value="90">90 Days</option>
          <option value="180">180 Days</option>
          <option value="365" selected>1 Year</option>
          <option value="730">2 Years</option>
          <option value="1825">5 Years</option>
          <option value="0">All Data</option>
        </select>
      </div>
    </div>
    <div class="chart-wrapper">
      <canvas id="primaryOnChainChart"></canvas>
    </div>
  `;
  chartGrid.appendChild(primaryChartContainer);
  
  // Secondary charts container
  const secondaryChartsContainer = document.createElement('div');
  secondaryChartsContainer.className = 'secondary-charts';
  
  // MVRV Chart
  const mvrvChartContainer = document.createElement('div');
  mvrvChartContainer.className = 'chart-container';
  mvrvChartContainer.innerHTML = `
    <div class="chart-header">
      <h3>MVRV Ratio History</h3>
    </div>
    <div class="chart-wrapper">
      <canvas id="mvrvChart"></canvas>
    </div>
  `;
  secondaryChartsContainer.appendChild(mvrvChartContainer);
  
  // NVT Chart
  const nvtChartContainer = document.createElement('div');
  nvtChartContainer.className = 'chart-container';
  nvtChartContainer.innerHTML = `
    <div class="chart-header">
      <h3>NVT Ratio History</h3>
    </div>
    <div class="chart-wrapper">
      <canvas id="nvtChart"></canvas>
    </div>
  `;
  secondaryChartsContainer.appendChild(nvtChartContainer);
  
  // Add secondary charts to grid
  chartGrid.appendChild(secondaryChartsContainer);
  
  // Add market cycle container
  const marketCycleContainer = document.createElement('div');
  marketCycleContainer.className = 'chart-container market-cycle-container';
  marketCycleContainer.innerHTML = `
    <div class="chart-header">
      <h3>Market Cycle Position</h3>
    </div>
    <div class="chart-wrapper">
      <canvas id="marketCycleChart"></canvas>
    </div>
  `;
  chartGrid.appendChild(marketCycleContainer);
  
  // Add chart grid to dashboard section
  dashboardSection.appendChild(chartGrid);
  
  // Add explanation section
  const explanationSection = document.createElement('div');
  explanationSection.className = 'on-chain-explanation';
  explanationSection.innerHTML = `
    <h3>How These Metrics Enhance Crash Prediction</h3>
    <div class="explanation-grid">
      <div class="explanation-item">
        <h4>MVRV Ratio</h4>
        <p>Market Value to Realized Value ratio measures the current market cap against the realized cap (price paid for all coins). 
        MVRV values above 3.5 have historically signaled market tops and increased crash risk.</p>
      </div>
      <div class="explanation-item">
        <h4>NVT Ratio</h4>
        <p>Network Value to Transactions ratio compares Bitcoin's market cap to its transaction volume. 
        High NVT values indicate the network isn't justifying its valuation with transaction activity, a warning sign.</p>
      </div>
      <div class="explanation-item">
        <h4>Active Addresses</h4>
        <p>The number of active addresses on the network is a fundamental health metric. 
        Sustained declines in active addresses during price increases often precede market corrections.</p>
      </div>
      <div class="explanation-item">
        <h4>Supply Distribution</h4>
        <p>These metrics track how Bitcoin is distributed among holders. 
        Sharp increases in whale dominance (top holders) often indicate increased risk of volatility.</p>
      </div>
    </div>
  `;
  dashboardSection.appendChild(explanationSection);
    // Verify DOM structure
  setTimeout(verifyDashboardDOM, 500);
}

/**
 * Add navigation link for on-chain dashboard
 */
function addOnChainNavLink() {
  const navMenu = document.querySelector('.nav-menu');
  
  if (!navMenu) {
    console.error('Navigation menu not found');
    return;
  }
  
  // Create new nav item
  const navItem = document.createElement('li');
  
  // Create link
  const navLink = document.createElement('a');
  navLink.className = 'nav-link';
  navLink.href = '#onChainDashboard';
  navLink.textContent = 'On-Chain Metrics';
  
  // Add event listener
  navLink.addEventListener('click', function(e) {
    e.preventDefault();
    document.getElementById('onChainDashboard').scrollIntoView({
      behavior: 'smooth',
      block: 'start'
    });
  });
  
  // Append link to nav item and nav item to menu
  navItem.appendChild(navLink);
  
  // Find where to insert the nav item (before the 'Share' link)
  const shareNavItem = Array.from(navMenu.children).find(item => 
    item.querySelector('a[href="#socialShare"]')
  );
  
  if (shareNavItem) {
    navMenu.insertBefore(navItem, shareNavItem);
  } else {
    navMenu.appendChild(navItem);
  }
}

/**
 * Add styles for on-chain visualizations
 */
function addOnChainStyles() {
  const styleElement = document.createElement('style');
  styleElement.textContent = `
    /* On-Chain Dashboard Styles */
    .on-chain-container {
      width: 100%;
      max-width: 1200px;
      margin: 2rem auto;
      background: rgba(0, 0, 0, 0.4);
      border-radius: 12px;
      padding: 2rem;
      box-shadow: 0 8px 20px rgba(0, 0, 0, 0.3);
      animation: fadeIn 2.2s ease;
    }
    
    .on-chain-title {
      text-align: center;
      margin-bottom: 1rem;
    }
    
    .on-chain-title h2 {
      font-size: 1.8rem;
      font-weight: 700;
      color: var(--btc-orange);
      text-shadow: 0 2px 4px rgba(0,0,0,0.3);
    }
    
    .on-chain-description {
      max-width: 800px;
      margin: 0 auto 2rem;
      text-align: center;
      font-size: 1.1rem;
      opacity: 0.9;
    }
    
    .on-chain-metrics-container {
      background: rgba(20, 20, 20, 0.6);
      border-radius: 10px;
      padding: 1.5rem;
      margin-bottom: 2rem;
      border-left: 3px solid var(--btc-orange);
    }
    
    /* Dashboard Styles */
    .on-chain-dashboard {
      width: 100%;
    }
    
    .dashboard-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 1.5rem;
      padding-bottom: 0.5rem;
      border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    }
    
    .dashboard-header h3 {
      font-size: 1.4rem;
      font-weight: 700;
      color: var(--btc-orange);
    }
    
    .last-updated {
      font-size: 0.85rem;
      opacity: 0.7;
    }
    
    .metrics-risk-indicator {
      display: flex;
      align-items: center;
      justify-content: center;
      margin-bottom: 1.5rem;
      padding: 1rem;
      border-radius: 8px;
      background: rgba(30, 30, 30, 0.7);
    }
    
    .risk-level-label {
      font-weight: 600;
      margin-right: 0.5rem;
    }
    
    .risk-level-value {
      font-weight: 700;
      font-size: 1.2rem;
    }
    
    /* Risk Level Colors */
    .extreme-risk .risk-level-value { color: #ff3b30; }
    .high-risk .risk-level-value { color: #ff9500; }
    .moderate-risk .risk-level-value { color: #ffcc00; }
    .low-risk .risk-level-value { color: #34c759; }
    .very-low-risk .risk-level-value { color: #30d158; }
    
    .metrics-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 1.5rem;
    }
    
    .metric-card {
      background: rgba(30, 30, 30, 0.7);
      border-radius: 10px;
      padding: 1.2rem;
      box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
      transition: all 0.3s ease;
    }
    
    .metric-card:hover {
      background: rgba(40, 40, 40, 0.8);
      transform: translateY(-3px);
      box-shadow: 0 6px 12px rgba(0, 0, 0, 0.2);
    }
    
    .metric-title {
      font-weight: 600;
      font-size: 1.1rem;
      margin-bottom: 0.5rem;
      color: #fff;
    }
    
    .metric-value {
      font-weight: 700;
      font-size: 1.6rem;
      margin-bottom: 0.8rem;
      color: var(--btc-orange);
    }
    
    .metric-details {
      display: flex;
      justify-content: space-between;
      margin-bottom: 0.8rem;
      font-size: 0.9rem;
    }
    
    .metric-change {
      padding: 2px 8px;
      border-radius: 4px;
      background: rgba(0, 0, 0, 0.2);
    }
    
    .positive {
      color: #34c759;
    }
    
    .negative {
      color: #ff3b30;
    }
    
    .metric-zscore {
      opacity: 0.8;
    }
    
    .metric-description {
      font-size: 0.85rem;
      opacity: 0.7;
      line-height: 1.4;
    }
    
    .cycle-progress-bar {
      width: 100%;
      height: 6px;
      background: rgba(0, 0, 0, 0.3);
      border-radius: 3px;
      overflow: hidden;
    }
    
    .cycle-progress {
      height: 100%;
      background: linear-gradient(90deg, #34c759, #ffcc00, #ff3b30);
      border-radius: 3px;
      transition: width 0.5s ease;
    }
    
    .dashboard-footer {
      margin-top: 1.5rem;
      text-align: center;
      font-size: 0.85rem;
      opacity: 0.7;
    }
    
    /* Chart Styling */
    .chart-grid {
      display: grid;
      grid-template-columns: 1fr;
      gap: 1.5rem;
      margin-top: 2rem;
    }
    
    .chart-container {
      background: rgba(20, 20, 20, 0.7);
      border-radius: 10px;
      padding: 1.2rem;
      box-shadow: 0 5px 15px rgba(0, 0, 0, 0.2);
      animation: fadeIn 0.5s ease;
    }
    
    .primary-chart {
      grid-column: 1 / -1;
      height: 400px;
    }
    
    .secondary-charts {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 1.5rem;
      grid-column: 1 / -1;
    }
    
    .chart-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 1rem;
    }
    
    .chart-header h3 {
      font-size: 1.2rem;
      font-weight: 600;
      color: var(--btc-orange);
    }
    
    .chart-controls select {
      background: rgba(30, 30, 30, 0.8);
      color: white;
      border: 1px solid rgba(255, 255, 255, 0.2);
      border-radius: 4px;
      padding: 5px 10px;
      font-size: 0.9rem;
    }
    
    .chart-wrapper {
      position: relative;
      width: 100%;
      height: calc(100% - 40px);
    }
    
    .market-cycle-container {
      grid-column: 1 / -1;
      height: 300px;
    }
    
    /* Explanation Section */
    .on-chain-explanation {
      margin-top: 2rem;
      padding-top: 1.5rem;
      border-top: 1px solid rgba(255, 255, 255, 0.1);
    }
    
    .on-chain-explanation h3 {
      text-align: center;
      font-size: 1.4rem;
      margin-bottom: 1.5rem;
      color: var(--btc-orange);
    }
    
    .explanation-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 1.5rem;
    }
    
    .explanation-item {
      background: rgba(30, 30, 30, 0.5);
      border-radius: 8px;
      padding: 1.2rem;
      box-shadow: 0 4px 10px rgba(0, 0, 0, 0.1);
    }
    
    .explanation-item h4 {
      color: var(--btc-orange);
      margin-bottom: 0.8rem;
      font-size: 1.1rem;
    }
    
    .explanation-item p {
      font-size: 0.9rem;
      line-height: 1.5;
      opacity: 0.8;
    }
    
    /* Loading Indicator */
    .loading-indicator {
      text-align: center;
      padding: 2rem;
      font-style: italic;
      opacity: 0.7;
    }
    
    /* Responsive Adjustments */
    @media (max-width: 900px) {
      .metrics-grid {
        grid-template-columns: 1fr;
      }
      
      .secondary-charts {
        grid-template-columns: 1fr;
      }
      
      .explanation-grid {
        grid-template-columns: 1fr;
      }
    }
    
    @media (max-width: 600px) {
      .on-chain-container {
        padding: 1.5rem;
      }
      
      .metric-value {
        font-size: 1.3rem;
      }
      
      .chart-container {
        padding: 1rem;
      }
      
      .primary-chart {
        height: 300px;
      }
    }
  `;
  
  document.head.appendChild(styleElement);
}

/**
 * Render on-chain metrics charts
 * @param {number} timeframe - Days of data to show (0 for all data)
 */
export function renderOnChainCharts(timeframe = 365) {
  console.log('Attempting to render on-chain charts with timeframe:', timeframe);
  console.log('onChainData available:', state.onChainData ? state.onChainData.length : 'none');
  console.log('onChainData state:', state.onChainData);
    // Clean up all existing chart instances first
  cleanupExistingCharts();
  // Make sure we have on-chain data
  if (!state.onChainData || state.onChainData.length === 0) {
    console.error('No on-chain data available for charts');
    
    // Add a message to the metrics container
    const container = document.getElementById('onChainMetricsContainer');
    if (container) {
      container.innerHTML = '<div class="loading-indicator">No on-chain data available. Please refresh the page.</div>';
    }
    return;
  }
  
  // Ensure chart containers exist before trying to render
  if (!document.getElementById('primaryOnChainChart')) {
    console.warn('Primary chart canvas not found in DOM, waiting...');
    
    // Check if the parent containers exist
    const dashboard = document.getElementById('onChainDashboard');
    const chartGrid = dashboard ? dashboard.querySelector('.chart-grid') : null;
    console.log('Dashboard container exists:', !!dashboard);
    console.log('Chart grid exists:', !!chartGrid);
    
    // Wait a bit longer and try again
    setTimeout(() => renderOnChainCharts(timeframe), 1000);
    return;
  }
  
  // More detailed checking for specific chart data
  const chartData = prepareOnChainChartData(timeframe === 0 ? 9999 : timeframe);
  console.log('Chart data prepared:', chartData ? 'yes' : 'no', chartData);
  
  try {
    // Create primary chart
    renderPrimaryChart(timeframe);
    
    // Create MVRV chart
    renderMVRVChart(timeframe);
    
    // Create NVT chart
    renderNVTChart(timeframe);
    
    // Create market cycle chart
    renderMarketCycleChart();
    
    // Set up event listener for timeframe selector
    const timeframeSelector = document.getElementById('timeframeSelector');
    if (timeframeSelector) {
      // Remove existing event listeners to prevent duplicates
      const newTimeframeSelector = timeframeSelector.cloneNode(true);
      timeframeSelector.parentNode.replaceChild(newTimeframeSelector, timeframeSelector);
      
      newTimeframeSelector.addEventListener('change', function() {
        const selectedTimeframe = parseInt(this.value);
        renderOnChainCharts(selectedTimeframe);
      });
    }
    
    console.log('All charts rendered successfully');
  } catch (error) {
    console.error('Error rendering charts:', error);
  }
}

/**
 * Render primary chart with price and on-chain metrics
 * @param {number} timeframe - Days of data to show (0 for all data)
 */
function renderPrimaryChart(timeframe) {
  const canvas = document.getElementById('primaryOnChainChart');
  if (!canvas) {
    console.error('Primary chart canvas not found');
    return;
  }
  
  console.log('Rendering primary chart with canvas:', canvas);
  
  // Get chart data
  const chartData = prepareOnChainChartData(timeframe === 0 ? 9999 : timeframe);
  if (!chartData || !chartData.datasets || chartData.datasets.length === 0) {
    console.error('No chart data available for primary chart');
    return;
  }
  
  // Safely destroy existing chart if it exists
  if (window.primaryOnChainChart && typeof window.primaryOnChainChart.destroy === 'function') {
    try {
      window.primaryOnChainChart.destroy();
      window.primaryOnChainChart = null;
    } catch (error) {
      console.error('Error destroying existing chart:', error);
    }
  }
  
  // Get context for the canvas
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    console.error('Could not get chart context');
    return;
  }
  
  try {
    // Verify Chart is available
    if (typeof Chart === 'undefined') {
      console.error('Chart.js is not loaded');
      return;
    }
    
    // Create new chart
    window.primaryOnChainChart = new Chart(ctx, {
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
              unit: getTimeUnit(timeframe),
              displayFormats: {
                day: 'MMM d',
                week: 'MMM d',
                month: 'MMM yyyy',
                quarter: 'MMM yyyy',
                year: 'yyyy'
              }
            },
            grid: {
              color: 'rgba(255, 255, 255, 0.1)'
            },
            ticks: {
              color: 'rgba(255, 255, 255, 0.7)'
            }
          },
          price: {
            type: 'logarithmic',
            position: 'left',
            title: {
              display: true,
              text: 'Price (USD - log scale)',
              color: 'rgba(75, 192, 192, 0.8)'
            },
            grid: {
              color: 'rgba(255, 255, 255, 0.1)'
            },
            ticks: {
              color: 'rgba(255, 255, 255, 0.7)'
            }
          },
          metrics: {
            type: 'linear',
            position: 'right',
            title: {
              display: true,
              text: 'Metrics Values',
              color: 'rgba(255, 159, 64, 0.8)'
            },
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
            labels: {
              color: 'rgba(255, 255, 255, 0.7)'
            }
          }
        }
      }
    });
    
    console.log('Primary chart created successfully');
  } catch (error) {
    console.error('Error creating primary chart:', error);
  }
}

/**
 * Render MVRV ratio chart
 * @param {number} timeframe - Days of data to show
 */
function renderMVRVChart(timeframe) {
  const canvas = document.getElementById('mvrvChart');
  if (!canvas) {
    console.error('MVRV chart canvas not found');
    return;
  }
  
  console.log('Rendering MVRV chart with canvas:', canvas);
  
  if (!state.onChainData || state.onChainData.length === 0) {
    console.error('No on-chain data available for MVRV chart');
    return;
  }
  
  // Determine data range
  const data = timeframe === 0 ? state.onChainData : state.onChainData.slice(-timeframe);
  
  // Filter data points with MVRV values
  const mvrvData = data.filter(d => d.MVRV !== undefined);
  if (mvrvData.length === 0) {
    console.warn('No MVRV data available');
    return;
  }
  
  console.log(`Found ${mvrvData.length} data points with MVRV values`);
  
  // Calculate reference levels for market tops and bottoms
  const mvrvTopLevel = 3.5;
  const mvrvMidLevel = 2.0;
  const mvrvBottomLevel = 1.0;
  
  // Prepare chart data
  const chartData = {
    labels: mvrvData.map(d => d.date),
    datasets: [
      {
        label: 'MVRV Ratio',
        data: mvrvData.map(d => d.MVRV),
        borderColor: 'rgba(255, 159, 64, 1)',
        backgroundColor: 'rgba(255, 159, 64, 0.2)',
        borderWidth: 2,
        fill: false
      },
      {
        label: 'Top Level (3.5)',
        data: mvrvData.map(() => mvrvTopLevel),
        borderColor: 'rgba(255, 59, 48, 0.7)',
        borderWidth: 1,
        borderDash: [5, 5],
        pointRadius: 0,
        fill: false
      },
      {
        label: 'Mid Level (2.0)',
        data: mvrvData.map(() => mvrvMidLevel),
        borderColor: 'rgba(255, 204, 0, 0.7)',
        borderWidth: 1,
        borderDash: [5, 5],
        pointRadius: 0,
        fill: false
      },
      {
        label: 'Bottom Level (1.0)',
        data: mvrvData.map(() => mvrvBottomLevel),
        borderColor: 'rgba(52, 199, 89, 0.7)',
        borderWidth: 1,
        borderDash: [5, 5],
        pointRadius: 0,
        fill: false
      }
    ]
  };
  
  // Safely destroy existing chart if it exists
  if (window.mvrvChart && typeof window.mvrvChart.destroy === 'function') {
    try {
      window.mvrvChart.destroy();
      window.mvrvChart = null;
    } catch (error) {
      console.error('Error destroying existing MVRV chart:', error);
    }
  }
  
  // Get context for the canvas
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    console.error('Could not get MVRV chart context');
    return;
  }
  
  try {
    // Verify Chart is available
    if (typeof Chart === 'undefined') {
      console.error('Chart.js is not loaded');
      return;
    }
    
    // Create new chart
    window.mvrvChart = new Chart(ctx, {
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
              unit: getTimeUnit(timeframe),
              displayFormats: {
                day: 'MMM d',
                week: 'MMM d',
                month: 'MMM yyyy',
                quarter: 'MMM yyyy',
                year: 'yyyy'
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
            title: {
              display: true,
              text: 'MVRV Ratio',
              color: 'rgba(255, 159, 64, 0.8)'
            },
            grid: {
              color: 'rgba(255, 255, 255, 0.1)'
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
            callbacks: {
              label: function(context) {
                let label = context.dataset.label || '';
                if (label) {
                  label += ': ';
                }
                label += context.parsed.y.toFixed(2);
                return label;
              }
            }
          },
          legend: {
            labels: {
              color: 'rgba(255, 255, 255, 0.7)'
            }
          }
        }
      }
    });
    
    console.log('MVRV chart created successfully');
  } catch (error) {
    console.error('Error creating MVRV chart:', error);
  }
}

/**
 * Render NVT ratio chart
 * @param {number} timeframe - Days of data to show
 */
function renderNVTChart(timeframe) {
  const canvas = document.getElementById('nvtChart');
  if (!canvas) {
    console.error('NVT chart canvas not found');
    return;
  }
  
  console.log('Rendering NVT chart with canvas:', canvas);
  
  if (!state.onChainData || state.onChainData.length === 0) {
    console.error('No on-chain data available for NVT chart');
    return;
  }
  
  // Determine data range
  const data = timeframe === 0 ? state.onChainData : state.onChainData.slice(-timeframe);
  
  // Filter data points with NVT values
  const nvtData = data.filter(d => d.NVT !== undefined);
  if (nvtData.length === 0) {
    console.warn('No NVT data available');
    return;
  }
  
  console.log(`Found ${nvtData.length} data points with NVT values`);
  
  // Calculate reference levels for NVT
  const nvtHighLevel = 65;
  const nvtMidLevel = 45;
  const nvtLowLevel = 30;
  
  // Prepare chart data
  const chartData = {
    labels: nvtData.map(d => d.date),
    datasets: [
      {
        label: 'NVT Ratio',
        data: nvtData.map(d => d.NVT),
        borderColor: 'rgba(153, 102, 255, 1)',
        backgroundColor: 'rgba(153, 102, 255, 0.2)',
        borderWidth: 2,
        fill: false
      },
      {
        label: 'High Level (65)',
        data: nvtData.map(() => nvtHighLevel),
        borderColor: 'rgba(255, 59, 48, 0.7)',
        borderWidth: 1,
        borderDash: [5, 5],
        pointRadius: 0,
        fill: false
      },
      {
        label: 'Mid Level (45)',
        data: nvtData.map(() => nvtMidLevel),
        borderColor: 'rgba(255, 204, 0, 0.7)',
        borderWidth: 1,
        borderDash: [5, 5],
        pointRadius: 0,
        fill: false
      },
      {
        label: 'Low Level (30)',
        data: nvtData.map(() => nvtLowLevel),
        borderColor: 'rgba(52, 199, 89, 0.7)',
        borderWidth: 1,
        borderDash: [5, 5],
        pointRadius: 0,
        fill: false
      }
    ]
  };
  
  // Safely destroy existing chart if it exists
  if (window.nvtChart && typeof window.nvtChart.destroy === 'function') {
    try {
      window.nvtChart.destroy();
      window.nvtChart = null;
    } catch (error) {
      console.error('Error destroying existing NVT chart:', error);
    }
  }
  
  // Get context for the canvas
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    console.error('Could not get NVT chart context');
    return;
  }
  
  try {
    // Verify Chart is available
    if (typeof Chart === 'undefined') {
      console.error('Chart.js is not loaded');
      return;
    }
    
    // Create new chart
    window.nvtChart = new Chart(ctx, {
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
              unit: getTimeUnit(timeframe),
              displayFormats: {
                day: 'MMM d',
                week: 'MMM d',
                month: 'MMM yyyy',
                quarter: 'MMM yyyy',
                year: 'yyyy'
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
            title: {
              display: true,
              text: 'NVT Ratio',
              color: 'rgba(153, 102, 255, 0.8)'
            },
            grid: {
              color: 'rgba(255, 255, 255, 0.1)'
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
            bodyColor: '#fff'
          },
          legend: {
            labels: {
              color: 'rgba(255, 255, 255, 0.7)'
            }
          }
        }
      }
    });
    
    console.log('NVT chart created successfully');
  } catch (error) {
    console.error('Error creating NVT chart:', error);
  }
}

/**
 * Render market cycle chart
 */
function renderMarketCycleChart() {
  const canvas = document.getElementById('marketCycleChart');
  if (!canvas) {
    console.error('Market cycle chart canvas not found');
    return;
  }
  
  console.log('Rendering market cycle chart with canvas:', canvas);
  
  if (!state.onChainData || state.onChainData.length === 0) {
    console.error('No on-chain data available for market cycle chart');
    return;
  }
  
  // Get the last year of data
  const yearData = state.onChainData.slice(-365);
  
  // Filter data points with cycle position values
  const cycleData = yearData.filter(d => d.CYCLE_POSITION !== undefined);
  if (cycleData.length === 0) {
    console.warn('No cycle position data available');
    return;
  }
  
  console.log(`Found ${cycleData.length} data points with cycle position values`);
  
  // Prepare chart data
  const chartData = {
    labels: cycleData.map(d => d.date),
    datasets: [
      {
        label: 'Market Cycle Position',
        data: cycleData.map(d => d.CYCLE_POSITION * 100), // Convert to percentage
        borderColor: 'rgba(255, 159, 64, 1)',
        backgroundColor: function(context) {
          const value = context.raw || 0;
          // Gradient based on cycle position: green -> yellow -> red
          if (value < 33) {
            return 'rgba(52, 199, 89, 0.5)'; // Green
          } else if (value < 66) {
            return 'rgba(255, 204, 0, 0.5)'; // Yellow
          } else {
            return 'rgba(255, 59, 48, 0.5)'; // Red
          }
        },
        borderWidth: 2,
        fill: true
      }
    ]
  };
  
  // Safely destroy existing chart if it exists
  if (window.marketCycleChart && typeof window.marketCycleChart.destroy === 'function') {
    try {
      window.marketCycleChart.destroy();
      window.marketCycleChart = null;
    } catch (error) {
      console.error('Error destroying existing market cycle chart:', error);
    }
  }
  
  // Get context for the canvas
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    console.error('Could not get market cycle chart context');
    return;
  }
  
  try {
    // Verify Chart is available
    if (typeof Chart === 'undefined') {
      console.error('Chart.js is not loaded');
      return;
    }
    
    // Create chart
    window.marketCycleChart = new Chart(ctx, {
      type: 'bar',
      data: chartData,
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          x: {
            type: 'time',
            time: {
              unit: 'month',
              displayFormats: {
                month: 'MMM yyyy'
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
            min: 0,
            max: 100,
            title: {
              display: true,
              text: 'Cycle Position (%)',
              color: 'rgba(255, 159, 64, 0.8)'
            },
            grid: {
              color: 'rgba(255, 255, 255, 0.1)'
            },
            ticks: {
              color: 'rgba(255, 255, 255, 0.7)'
            }
          }
        },
        plugins: {
          tooltip: {
            callbacks: {
              label: function(context) {
                const value = context.parsed.y;
                let riskLevel = 'Very Low Risk';
                if (value >= 80) riskLevel = 'Extreme Risk';
                else if (value >= 65) riskLevel = 'High Risk';
                else if (value >= 45) riskLevel = 'Moderate Risk';
                else if (value >= 30) riskLevel = 'Low Risk';
                
                return `Cycle Position: ${value.toFixed(1)}% (${riskLevel})`;
              }
            }
          }
        }
      }
    });
    
    console.log('Market cycle chart created successfully');
  } catch (error) {
    console.error('Error creating market cycle chart:', error);
  }
}

/**
 * Get appropriate time unit based on timeframe
 * @param {number} timeframe - Days of data to show
 * @returns {string} Chart.js time unit
 */
function getTimeUnit(timeframe) {
  if (timeframe <= 30) return 'day';
  if (timeframe <= 90) return 'week';
  if (timeframe <= 365) return 'month';
  if (timeframe <= 1825) return 'quarter';
  return 'year';
}

/**
 * Update the metrics dashboard with latest on-chain metrics
 * @param {Object} dashboardHTML - HTML content for the dashboard
 */
export function updateOnChainDashboard(dashboardHTML) {
  const container = document.getElementById('onChainMetricsContainer');
  if (container && dashboardHTML) {
    console.log('Updating on-chain dashboard content');
    container.innerHTML = dashboardHTML;
  } else {
    console.error('Cannot update on-chain dashboard: container or HTML missing', {
      containerExists: !!container,
      htmlExists: !!dashboardHTML,
      htmlLength: dashboardHTML ? dashboardHTML.length : 0
    });
  }
}

/** 
 * force dashboard update
 */
 export function forceUpdateDashboard() {
  if (state.latestOnChainMetrics) {
    console.log('Force updating dashboard with latest metrics');
    // Import createOnChainDashboard function if it's not in scope
    try {
      import('./enhanced-risk-model.js').then(module => {
        if (typeof module.createOnChainDashboard === 'function') {
          const dashboardHTML = module.createOnChainDashboard();
          updateOnChainDashboard(dashboardHTML);
        } else {
          console.error('createOnChainDashboard function not found in module');
        }
      }).catch(err => {
        console.error('Failed to import enhanced-risk-model module:', err);
      });
    } catch (error) {
      console.error('Error updating dashboard:', error);
    }
  } else {
    console.warn('Cannot update dashboard: latest metrics not available');
  }
}

/**
 * Custom event dispatcher for when on-chain data is loaded
 */
export function dispatchOnChainDataLoaded() {
  if (eventDispatched) {
    console.log("onChainDataLoaded event already dispatched, skipping");
    return;
  }
  
  console.log("Dispatching onChainDataLoaded event");
  document.dispatchEvent(new CustomEvent('onChainDataLoaded'));
  eventDispatched = true;
  
  // Reset flag after a short delay to allow for future updates
  setTimeout(() => {
    eventDispatched = false;
  }, 5000);
}
