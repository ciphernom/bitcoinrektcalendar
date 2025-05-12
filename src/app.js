/**
 * Calendar of Rekt - Main Application
 */
// Ensure Chart.js is properly available globally
document.addEventListener('DOMContentLoaded', function() {
  if (typeof Chart === 'undefined' && typeof window.Chart !== 'undefined') {
    window.Chart = window.Chart;
    console.log('Made Chart.js available globally from window.Chart');
  }
});
// Import core modules
import * as DataService from './core/data-service.js';
import * as RiskModel from './core/risk-model.js';
import * as EventDatabase from './core/event-database.js';

import { initializeEnhancedModel } from './core/integration-module.js';
import { integrateOnChainRiskIntoGauge } from './core/enhanced-risk-model.js';

// Import components
import * as Calendar from './components/calendar.js';
import * as Gauge from './components/gauge.js';
import * as Timeline from './components/timeline.js';
import * as Portfolio from './components/portfolio.js';
import * as Sentiment from './components/sentiment.js';
import * as RektLegends from './components/rekt-legends.js'; 
import * as SocialShare from './components/social-share.js'; 
import * as RektBot from './components/rektbot.js';

// Import utilities
import * as Statistics from './utils/statistics.js';
import * as Formatting from './utils/formatting.js';
import * as Accessibility from './utils/accessibility.js';

// Import adblock detector
import * as AdblockDetector from './utils/adblock-detector.js';

// Global state (shared across components)
export const state = {
  bitcoinData: [],
  riskByMonth: {},
  historicalCrashes: {},
  timelineData: {},
  currentTimeframe: 30, // Default to 30 days
  sentimentData: null,
  mostSevereMonthlyData: {},
  // Constants for risk calculation
  riskConstants: {
    a0: 1.0,       // baseline prior shape
    b0: 1.0,       // baseline prior scale
  }
};

// Month names for global use
export const monthNames = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

// Application initialization
document.addEventListener('DOMContentLoaded', async function() {
  try {
    // 1. Load Bitcoin data
    const bitcoinData = await DataService.fetchBitcoinData();
    state.bitcoinData = bitcoinData;
    
    // 2. Calculate risk for all timeframes using enhanced model
    RiskModel.calculateRiskForAllTimeframes();
    
    // Force a refresh of all UI components with final data
    setTimeout(() => {
      console.log("Refreshing UI components with final data");
      // Update the gauge with final data
      const currentMonthIndex = new Date().getMonth();
      const currentMonthRiskData = state.riskByMonth[30][currentMonthIndex + 1];
      
      if (currentMonthRiskData && typeof currentMonthRiskData === 'object' && currentMonthRiskData.risk !== undefined) {
        const riskPercentage = (currentMonthRiskData.risk * 100).toFixed(1);
        const credibleInterval = {
          lower: ((currentMonthRiskData.lower || 0) * 100).toFixed(1) + '%',
          upper: ((currentMonthRiskData.upper || 0) * 100).toFixed(1) + '%'
        };
        Gauge.updateGauge(riskPercentage, credibleInterval);
      }
      
      // Re-render calendar to ensure all data is fresh
      Calendar.renderCalendar(state.riskByMonth[30], state.historicalCrashes);
    }, 1000);  // Longer timeout to ensure all async operations complete

    
    
    // 3. Add enhanced model indicator
    RiskModel.addEnhancedModelIndicator();
    
    // 4. Update the data info text to mention enhanced model
    const dataInfoText = document.querySelector('#data-info .data-info-content p:last-of-type');
    if (dataInfoText) {
      dataInfoText.innerHTML = 'Risk calculation uses an enhanced Poisson-Gamma Bayesian model with volatility weighting and sentiment integration (a₀=1.0, b₀=1.0, τ=<span id="tauValue">30</span>) to predict extreme market events.';
    }

    // 5. Find historical crashes
    state.historicalCrashes = EventDatabase.findHistoricalCrashes(state.bitcoinData);
    DataService.updateYoutuberCrashData(new Date().getMonth() + 1);
    
    // 6. Generate timeline data
    DataService.generateTimelineData(state.bitcoinData);
    
    // 7. Initialize components
    Calendar.renderCalendar(state.riskByMonth[30], state.historicalCrashes);
    
    // Initialize current month gauge
    let riskPercentage, credibleInterval;
    const currentMonthIndex = new Date().getMonth();
    const currentMonthRiskData = state.riskByMonth[30][currentMonthIndex + 1];
    if (currentMonthRiskData && typeof currentMonthRiskData === 'object' && currentMonthRiskData.risk !== undefined) {
      // New format - object with risk property
      riskPercentage = (currentMonthRiskData.risk * 100).toFixed(1);
      
      // Include credible interval if available
      if (currentMonthRiskData.lower !== undefined && currentMonthRiskData.upper !== undefined) {
        credibleInterval = {
          lower: (currentMonthRiskData.lower * 100).toFixed(1) + '%',
          upper: (currentMonthRiskData.upper * 100).toFixed(1) + '%'
        };
      }
      
      console.log("Current month risk object:", currentMonthRiskData);
      
    } else {
      // Old format - direct number
      riskPercentage = ((currentMonthRiskData || 0) * 100).toFixed(1);
    }
    // Update the gauge with appropriate parameters
    if (credibleInterval) {
      Gauge.updateGauge(riskPercentage, credibleInterval);
    } else {
      Gauge.updateGauge(riskPercentage);
    }
    // Force a second update with a slight delay to ensure CI appears
    setTimeout(() => {
      console.log("Re-updating gauge to ensure credible interval visibility");
      if (credibleInterval) {
        Gauge.updateGauge(riskPercentage, credibleInterval);
      }
    }, 200);
    
  // with proper error handling
  try {
    if (typeof window.AdblockDetector !== 'undefined' && typeof window.AdblockDetector.initialize === 'function') {
      window.AdblockDetector.initialize();
    } else if (typeof AdblockDetector !== 'undefined' && typeof AdblockDetector.initialize === 'function') {
      AdblockDetector.initialize();
    } else {
      console.warn('AdblockDetector not available yet, will try again in 1 second');
      // Retry after a delay
      setTimeout(function() {
        if (typeof window.AdblockDetector !== 'undefined' && typeof window.AdblockDetector.initialize === 'function') {
          window.AdblockDetector.initialize();
        } else if (typeof AdblockDetector !== 'undefined' && typeof AdblockDetector.initialize === 'function') {
          AdblockDetector.initialize();
        } else {
          console.warn('AdblockDetector still not available after delay, skipping initialization');
        }
      }, 1000);
    }
  } catch (e) {
    console.warn('Error initializing AdblockDetector, continuing without it:', e);
  }

    
    // Initialize other components
    try {
      await Timeline.initialize();
      await Portfolio.initialize();
      await RektLegends.initialize(); // Initialize new Rekt Legends component
      await SocialShare.initialize(); // Initialize new Social Share component
      

      
      // 8. Fetch sentiment data
      state.sentimentData = await DataService.fetchSentimentAnalysis();
      Sentiment.updateSentimentDisplay(state.sentimentData);
      
    //Force render on-chain charts if data is available
    if (state.onChainData && state.onChainData.length > 0) {
      console.log("Direct call to render on-chain charts from app initialization");
      try {
        // Try to dynamically import the module
        const OnchainModule = await import('./core/onchain-visualizations.js');
        if (typeof OnchainModule.renderOnChainCharts === 'function') {
          OnchainModule.renderOnChainCharts();
          OnchainModule.dispatchOnChainDataLoaded();
        }
      } catch (e) {
        console.error("Failed to render on-chain charts from app:", e);
      }
    }
      // 9. Initialize the Bitcoin canvas animation
      DataService.initBitcoinCanvas();
      
      // 10. Initialize the validation chart
      setTimeout(() => {
        RiskModel.initCrashPredictionChart();
      }, 2000);
      try {
          // Initialize the enhanced model
          await initializeEnhancedModel();
          
          // Integrate on-chain metrics with the main risk gauge
          integrateOnChainRiskIntoGauge();
        } catch (error) {
          console.error('Error initializing enhanced model:', error);
        }
      // 11. Populate the Rekt Legends section (using the new component)
      RektLegends.populateRektLegends(state.historicalCrashes);
      
      // 12. Add accessibility enhancements
      Accessibility.enhanceAccessibility();
      
      // 13. Update social sharing content
      SocialShare.updateShareLinks(riskPercentage);
      
    } catch (componentError) {
      console.error('Error initializing component:', componentError);
    }
    
    // 14. Hide loading indicator, show content
    document.getElementById('loading').style.display = 'none';
    document.getElementById('calendar').style.display = 'grid';
    document.getElementById('data-info').style.display = 'block';
    
    // 15. Add data summary
    const dataSummary = document.getElementById('data-summary');
    dataSummary.textContent = `Analysis based on ${state.bitcoinData.length.toLocaleString()} data points spanning from ${Formatting.formatDate(state.bitcoinData[0].date)} to ${Formatting.formatDate(state.bitcoinData[state.bitcoinData.length-1].date)}.`;
    
    // 16. Add event listener to recalculate risk when sentiment is updated
    document.addEventListener('sentimentUpdated', function() {
      // Recalculate risk with the new sentiment data
      RiskModel.calculateRiskForAllTimeframes();
      
      // Update the calendar display with new risk values
      Calendar.renderCalendar(state.riskByMonth[state.currentTimeframe], state.historicalCrashes);
      
    // Update gauge for current month
    const currentMonthIndex = new Date().getMonth();
    const currentMonthRiskData = state.riskByMonth[state.currentTimeframe][currentMonthIndex + 1];
          
    let riskPercentage, credibleInterval;
    if (currentMonthRiskData && typeof currentMonthRiskData === 'object' && currentMonthRiskData.risk !== undefined) {
      riskPercentage = (currentMonthRiskData.risk * 100).toFixed(1);
      
      if (currentMonthRiskData.lower !== undefined && currentMonthRiskData.upper !== undefined) {
        credibleInterval = {
          lower: (currentMonthRiskData.lower * 100).toFixed(1) + '%',
          upper: (currentMonthRiskData.upper * 100).toFixed(1) + '%'
        };
      }
    } else {
      riskPercentage = ((currentMonthRiskData || 0) * 100).toFixed(1);
    }

    if (credibleInterval) {
      Gauge.updateGauge(riskPercentage, credibleInterval);
    } else {
      Gauge.updateGauge(riskPercentage);
    }
    });
        await RektBot.initialize();
  } catch (error) {
    console.error('Error initializing application:', error);
    const loading = document.getElementById('loading');
    loading.innerHTML = `<div class="error-message">Error: ${error.message}. Please try refreshing the page.</div>`;
  }
});

// Set up event handlers for global elements
document.addEventListener('DOMContentLoaded', function() {
  // Popup close event
  const popupClose = document.getElementById('popupClose');
  const modalOverlay = document.getElementById('modalOverlay');
  
  if (popupClose && modalOverlay) {
    popupClose.addEventListener('click', DataService.closePopup);
    modalOverlay.addEventListener('click', DataService.closePopup);
  }
  

  
  // YouTuber mode toggle
  const youtuberToggle = document.getElementById('youtuberToggle');
  const youtuberMode = document.getElementById('youtuberMode');
  const youtuberClose = document.getElementById('youtuberClose');
  
    if (youtuberToggle && youtuberMode && youtuberClose) {
      youtuberToggle.addEventListener('click', function() {
        const currentMonthIndex = new Date().getMonth();
        const youtuberMonth = document.getElementById('youtuberMonth');
        const youtuberRiskPercentage = document.getElementById('youtuberRiskPercentage');
        const youtuberProgressFill = document.getElementById('youtuberProgressFill');
        
        // Get the current month's risk percentage
        const currentMonthRiskData = state.riskByMonth[state.currentTimeframe][currentMonthIndex + 1];
        let riskPercentage;
              
        if (currentMonthRiskData && typeof currentMonthRiskData === 'object' && currentMonthRiskData.risk !== undefined) {
          riskPercentage = (currentMonthRiskData.risk * 100).toFixed(1);
        } else {
          riskPercentage = ((currentMonthRiskData || 0) * 100).toFixed(1);
        }
        
        youtuberMonth.textContent = monthNames[currentMonthIndex];
        
        // Risk percentage element in YouTuber mode is different from the crash percentage element
        const youtuberModeRiskPercentage = document.getElementById('youtuberRiskPercentage');
        if (youtuberModeRiskPercentage) {
          youtuberModeRiskPercentage.textContent = `${riskPercentage}%`;
          youtuberModeRiskPercentage.style.animation = 'none';
          setTimeout(() => {
            youtuberModeRiskPercentage.style.animation = 'percentagePop 1s ease-out forwards';
          }, 10);
        }
        
        if (youtuberProgressFill) {
          youtuberProgressFill.style.width = `${riskPercentage}%`;
        }
        
        setTimeout(() => {
          youtuberMode.classList.add('active');
          
          // Update crash data - use 1-based month index
          DataService.updateYoutuberCrashData(currentMonthIndex + 1);
          
          // Check if crash data was loaded
          setTimeout(() => {
            const crashText = document.getElementById('youtuberCrashContext');
            if (crashText && crashText.textContent.includes('No significant historical crash data')) {
              console.log('No crash data found for month', currentMonthIndex + 1);
              
              // Try to load it a different way - directly from historical crashes
              const monthCrashes = state.historicalCrashes[currentMonthIndex + 1];
              if (monthCrashes && monthCrashes.length > 0) {
                const crashDate = document.getElementById('youtuberCrashDate');
                const crashPercentage = document.getElementById('youtuberCrashPercentage');
                
                if (crashDate) crashDate.textContent = monthCrashes[0].date;
                if (crashPercentage) crashPercentage.textContent = `${monthCrashes[0].percentage}% in 24 hours`;
                if (crashText) crashText.textContent = monthCrashes[0].context.replace(/\[.*?\]\s*/, '');
              }
            }
          }, 100);
        }, 100);
        
        document.body.style.overflow = 'hidden';
      });
      
      youtuberClose.addEventListener('click', function() {
        youtuberMode.classList.remove('active');
        document.body.style.overflow = '';
      });
    }
  
  // Show chart button
  const showChartBtn = document.getElementById('showChartBtn');
  const chartPopup = document.getElementById('chartPopup');
  const chartPopupClose = document.getElementById('chartPopupClose');
  
  if (showChartBtn && chartPopup && chartPopupClose) {
    showChartBtn.addEventListener('click', function(e) {
      e.preventDefault();
      
      modalOverlay.classList.add('active');
      chartPopup.classList.add('active');
      
      setTimeout(() => {
        RiskModel.initCrashPredictionChart();
      }, 100);
      
      document.body.style.overflow = 'hidden';
    });
    
    chartPopupClose.addEventListener('click', function() {
      modalOverlay.classList.remove('active');
      chartPopup.classList.remove('active');
      document.body.style.overflow = '';
    });
  }
  
  // Smooth scrolling for navigation links
  document.querySelectorAll('.nav-link').forEach(link => {
    link.addEventListener('click', function(e) {
      if (this.getAttribute('href').startsWith('#')) {
        e.preventDefault();
        const targetId = this.getAttribute('href').substring(1);
        const targetSection = document.getElementById(targetId);
        
        if (targetSection) {
          targetSection.scrollIntoView({
            behavior: 'smooth',
            block: 'start'
          });
        }
      }
    });
  });
  
  // Update active nav link on scroll
  window.addEventListener('scroll', function() {
    const sections = ['riskTemperature', 'calendar', 'portfolioCalculator', 'sentimentContainer', 'rektLegends', 'socialShare'];
    const scrollPosition = window.scrollY + 100; // Offset for header height

    sections.forEach(sectionId => {
      const section = document.getElementById(sectionId);
      const link = document.querySelector(`.nav-link[href="#${sectionId}"]`);
      if (section && link) {
        if (scrollPosition >= section.offsetTop && scrollPosition < section.offsetTop + section.offsetHeight) {
          link.classList.add('active');
        } else {
          link.classList.remove('active');
        }
      }
    });
  });
});
