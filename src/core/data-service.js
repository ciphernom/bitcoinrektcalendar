/**
 * Data Service
 * Handles data fetching, processing, and management
 */

// Import state from app.js
import { state } from '../app.js';
import { analyzeHeadlinesWithNBC } from '../components/sentiment.js';

// Define risk model constants
const a0 = 1.0; // baseline prior shape
const b0 = 1.0; // baseline prior scale

/**
 * Fetch Bitcoin historical price data
 * @returns {Promise<Array>} Promise resolving to processed Bitcoin data
 */
async function fetchBitcoinData() {
    const response = await fetch('https://raw.githubusercontent.com/coinmetrics/data/master/csv/btc.csv');
    if (!response.ok) {
      throw new Error('Failed to fetch Bitcoin data');
    }
    const csvText = await response.text();
    return processData(csvText);
  }

/**
 * Fetch and analyze sentiment data from news headlines
 * @returns {Promise<Object>} Promise resolving to sentiment analysis results
 */
async function fetchSentimentAnalysis() {
    try {
      // Get crypto news headlines from Google News
      const newsData = await fetchCryptoNews();
      
      if (!newsData || !newsData.length) {
        throw new Error('No news data available');
      }
      
      // Perform sentiment analysis on the headlines using NBC
      const sentimentData = analyzeHeadlinesWithNBC(newsData, state.bitcoinData);
      
      return sentimentData;
    } catch (error) {
      console.error('Error analyzing sentiment:', error);
      // Attempt to fetch from alternative Sentiment API if analysis fails
      try {
        const alternativeData = await fetchAlternativeSentimentData();
        return alternativeData;
      } catch (backupError) {
        console.error('Backup sentiment fetch failed:', backupError);
        return {
          value: 50,
          sentiment: 'Neutral',
          timestamp: new Date().toISOString(),
          headlines: []
        };
      }
    }
  }

/**
 * Fetch crypto news headlines from various sources
 * @returns {Promise<Array>} Promise resolving to array of news headlines
 */
async function fetchCryptoNews() {
    try {
      // Google News RSS feed URLs for Bitcoin and Cryptocurrency
      const bitcoinRssUrl = 'https://news.google.com/rss/search?q=Bitcoin&hl=en-US&gl=US&ceid=US:en';
      const cryptoRssUrl = 'https://news.google.com/rss/search?q=Cryptocurrency&hl=en-US&gl=US&ceid=US:en';
      const cryptoMarketRssUrl = 'https://news.google.com/rss/search?q=Crypto+Market&hl=en-US&gl=US&ceid=US:en';
      const btcPriceRssUrl = 'https://news.google.com/rss/search?q=Bitcoin+Price&hl=en-US&gl=US&ceid=US:en';
      
      // Convert RSS to JSON using rss2json service
      const bitcoinApiUrl = `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(bitcoinRssUrl)}`;
      const cryptoApiUrl = `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(cryptoRssUrl)}`;
      const marketApiUrl = `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(cryptoMarketRssUrl)}`;
      const priceApiUrl = `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(btcPriceRssUrl)}`;
      
      // Fetch all feeds in parallel
      const [bitcoinResponse, cryptoResponse, marketResponse, priceResponse] = await Promise.all([
        fetch(bitcoinApiUrl),
        fetch(cryptoApiUrl),
        fetch(marketApiUrl),
        fetch(priceApiUrl)
      ]);
      
      if (!bitcoinResponse.ok && !cryptoResponse.ok && !marketResponse.ok && !priceResponse.ok) {
        throw new Error('All RSS feed requests failed');
      }
      
      // Process responses
      const newsItems = [];
      
      // Process Bitcoin news
      if (bitcoinResponse.ok) {
        const bitcoinData = await bitcoinResponse.json();
        if (bitcoinData.status === 'ok' && bitcoinData.items) {
          const bitcoinItems = bitcoinData.items.map(item => ({
            title: item.title || 'No title',
            timestamp: item.pubDate || new Date().toISOString(),
            url: item.link || '#',
            source: item.author || 'Google News'
          }));
          newsItems.push(...bitcoinItems);
        }
      }
      
      // Process Crypto news
      if (cryptoResponse.ok) {
        const cryptoData = await cryptoResponse.json();
        if (cryptoData.status === 'ok' && cryptoData.items) {
          const cryptoItems = cryptoData.items.map(item => ({
            title: item.title || 'No title',
            timestamp: item.pubDate || new Date().toISOString(),
            url: item.link || '#',
            source: item.author || 'Google News'
          }));
          newsItems.push(...cryptoItems);
        }
      }
      
      // Process Market news
      if (marketResponse.ok) {
        const marketData = await marketResponse.json();
        if (marketData.status === 'ok' && marketData.items) {
          const marketItems = marketData.items.map(item => ({
            title: item.title || 'No title',
            timestamp: item.pubDate || new Date().toISOString(),
            url: item.link || '#',
            source: item.author || 'Google News'
          }));
          newsItems.push(...marketItems);
        }
      }
      
      // Process Price news
      if (priceResponse.ok) {
        const priceData = await priceResponse.json();
        if (priceData.status === 'ok' && priceData.items) {
          const priceItems = priceData.items.map(item => ({
            title: item.title || 'No title',
            timestamp: item.pubDate || new Date().toISOString(),
            url: item.link || '#',
            source: item.author || 'Google News'
          }));
          newsItems.push(...priceItems);
        }
      }
      
      if (newsItems.length === 0) {
        throw new Error('No news items found in RSS feeds');
      }
      
      // Sort by date (newest first) and remove duplicates
      return newsItems
        .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
        .filter((item, index, self) => 
          index === self.findIndex(t => t.title === item.title)
        );
    } catch (error) {
      console.error('Error fetching news from Google News RSS:', error);
      
      // Try alternative news approach - fallback to recent headlines
      try {
        // Fallback to manual headlines when APIs fail
        const fallbackHeadlines = [
          "Bitcoin Faces Critical Resistance Level as Market Sentiment Shifts",
          "Investors Eye Bitcoin's Next Move Amid Macro Uncertainty",
          "Bitcoin Trading Volume Surges as Price Volatility Increases",
          "Analysts Divided on Bitcoin's Short-Term Direction After Recent Price Action",
          "Bitcoin Hash Rate Reaches New All-Time High, Network Security Strengthens",
          "Global Economic Tensions Create New Narrative for Bitcoin Investors",
          "Bitcoin HODLers Remain Unfazed Despite Market Fluctuations",
          "Bitcoin ETF Flows Show Mixed Investor Sentiment This Week",
          "Technical Indicators Point to Potential Bitcoin Price Consolidation",
          "Institutional Interest in Bitcoin Grows Despite Market Volatility",
          "Bitcoin Miners Show Resilience Amid Challenging Market Conditions",
          "On-Chain Data Reveals Interesting Patterns in Bitcoin Holder Behavior",
          "Bitcoin Enters Critical Support Zone After Recent Price Decline",
          "New Bitcoin Upgrade Proposal Gains Community Support",
          "Bitcoin Lightning Network Adoption Accelerates Despite Bear Market",
          "Global Regulatory Landscape for Bitcoin Continues to Evolve",
          "Bitcoin Dominance Rises as Altcoins Struggle to Maintain Momentum",
          "Long-Term Bitcoin Holders Show Confidence in Accumulation Phase",
          "Bitcoin Faces Correlation Shifts with Traditional Financial Markets",
          "New Bitcoin Mining Operations Launch Despite Energy Concerns",
          "Bitcoin Futures Market Shows Increasing Institutional Participation",
          "Central Banks' Policies Continue to Impact Bitcoin's Narrative",
          "Bitcoin's Energy Usage Debate Intensifies Among Industry Leaders",
          "Bitcoin Community Responds to Recent Regulatory Developments",
          "Bitcoin Volatility Index Reaches Significant Levels as Markets React"
        ];
        
        // Generate timestamps for fallback headlines
        const currentTime = new Date();
        return fallbackHeadlines.map((headline, index) => {
          const headlineDate = new Date(currentTime);
          headlineDate.setHours(headlineDate.getHours() - index);
          
          return {
            title: headline,
            timestamp: headlineDate.toISOString(),
            url: "#",
            source: "Market Analysis"
          };
        });
      } catch (fallbackError) {
        throw new Error('All news sources failed');
      }
    }
  }

/**
 * Fetch alternative sentiment data from external API
 * @returns {Promise<Object>} Promise resolving to sentiment data
 */
async function fetchAlternativeSentimentData() {
    try {
      // Alternative Fear & Greed API - free public endpoint
      const response = await fetch('https://api.alternative.me/fng/?limit=1');
      const data = await response.json();
      
      if (!data || !data.data || !data.data[0]) {
        throw new Error('Invalid sentiment data format');
      }
      
      const fngValue = parseInt(data.data[0].value);
      
      // Map sentiment labels from "fear/greed" to "negative/positive"
      let sentimentLabel;
      if (fngValue <= 25) {
        sentimentLabel = "Very Negative";
      } else if (fngValue <= 45) {
        sentimentLabel = "Negative";
      } else if (fngValue <= 55) {
        sentimentLabel = "Neutral";
      } else if (fngValue <= 75) {
        sentimentLabel = "Positive";
      } else {
        sentimentLabel = "Very Positive";
      }
      
      return {
        value: fngValue,
        sentiment: sentimentLabel,
        timestamp: new Date().toISOString(),
        headlines: [],
        source: 'Alternative.me Sentiment Index'
      };
    } catch (error) {
      console.error('Alternative Sentiment API failed:', error);
      throw error;
    }
  }

/**
 * Get the halving epoch for a given date
 * @param {Date} date - The date to check
 * @returns {number} Halving epoch number
 */
function getHalvingEpoch(date) {
    // Bitcoin halving dates
    const halvingDates = [
      new Date('2009-01-03'), // Genesis block (not an actual halving)
      new Date('2012-11-28'), // First halving
      new Date('2016-07-09'), // Second halving
      new Date('2020-05-11'), // Third halving
      new Date('2024-04-20')  // Fourth halving
    ];
    
    // Find the appropriate epoch
    for (let i = halvingDates.length - 1; i >= 0; i--) {
      if (date >= halvingDates[i]) {
        return i;
      }
    }
    
    return 0; // Default to first epoch if before first halving
  }

/**
 * Process raw CSV data into structured Bitcoin data objects
 * @param {string} csvText - Raw CSV text
 * @returns {Array} Array of processed data points
 */
function processData(csvText) {
  const lines = csvText.trim().split('\n');
  const headers = lines[0].split(',');
  
  // Find index of critical columns
  const timeIndex = headers.indexOf('time');
  const priceIndex = headers.indexOf('PriceUSD');
  
  // Find indices for on-chain metrics
  const mvrvIndex = headers.indexOf('CapMVRVCur');
  const nvtIndex = headers.indexOf('NVTAdj');
  const nvt90Index = headers.indexOf('NVTAdj90');
  const activeAddressesIndex = headers.indexOf('AdrActCnt');
  const txCountIndex = headers.indexOf('TxCnt');
  const txVolumeIndex = headers.indexOf('TxTfrValAdjUSD');
  const splyAct1dIndex = headers.indexOf('SplyAct1d');
  const splyAct1yrIndex = headers.indexOf('SplyAct1yr');
  
  if (timeIndex === -1 || priceIndex === -1) {
    throw new Error('CSV format is not as expected');
  }
  
  console.log('Found metric indices:', { 
    mvrvIndex, 
    nvtIndex, 
    nvt90Index, 
    activeAddressesIndex,
    txCountIndex,
    txVolumeIndex
  });
  
  // Parse ALL data
  const data = [];
  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',');
    const dateString = values[timeIndex];
    const price = parseFloat(values[priceIndex]);
    
    if (!isNaN(price)) {
      const date = new Date(dateString);
      const dataPoint = {
        date: date,
        price: price,
        halvingEpoch: getHalvingEpoch(date)
      };
      
      // Add on-chain metrics
      if (mvrvIndex !== -1 && values[mvrvIndex]) {
        dataPoint.MVRV = parseFloat(values[mvrvIndex]);
      }
      
      if (nvtIndex !== -1 && values[nvtIndex]) {
        dataPoint.NVT = parseFloat(values[nvtIndex]);
      }
      
      if (nvt90Index !== -1 && values[nvt90Index]) {
        dataPoint.NVT_90 = parseFloat(values[nvt90Index]);
      }
      
      if (activeAddressesIndex !== -1 && values[activeAddressesIndex]) {
        dataPoint.ACTIVE_ADDRESSES = parseFloat(values[activeAddressesIndex]);
      }
      
      if (txCountIndex !== -1 && values[txCountIndex]) {
        dataPoint.TX_COUNT = parseFloat(values[txCountIndex]);
      }
      
      if (txVolumeIndex !== -1 && values[txVolumeIndex]) {
        dataPoint.TX_VOLUME_USD = parseFloat(values[txVolumeIndex]);
      }

    if (splyAct1dIndex !== -1 && values[splyAct1dIndex]) {
      const rawValue = values[splyAct1dIndex];
      dataPoint.ACTIVE_SUPPLY_1D = parseFloat(rawValue);
      // Add a check for NaN
      if (isNaN(dataPoint.ACTIVE_SUPPLY_1D)) {
        console.error(`Failed to parse ACTIVE_SUPPLY_1D from '${rawValue}'`);
      }
    }
      
      if (splyAct1yrIndex !== -1 && values[splyAct1yrIndex]) {
        dataPoint.ACTIVE_SUPPLY_1YR = parseFloat(values[splyAct1yrIndex]);
      }

      data.push(dataPoint);
    }
    
  }
  
  // Sort by date to ensure chronological order
  data.sort((a, b) => a.date - b.date);
  
  // Calculate log returns
  for (let i = 1; i < data.length; i++) {
    data[i].logReturn = Math.log(data[i].price / data[i-1].price);
  }
  data[0].logReturn = 0;
  
  // Calculate cycle position for recent data (past 2 years)
  const recentData = data.slice(-730); // Last 2 years
  if (recentData.length > 0) {
    const priceMax = Math.max(...recentData.map(d => d.price));
    const priceMin = Math.min(...recentData.map(d => d.price));
    const range = priceMax - priceMin;
    
    // Add cycle position normalized from 0 to 1 (0=bottom, 1=top)
    recentData.forEach(d => {
      if (range > 0) {
        d.CYCLE_POSITION = (d.price - priceMin) / range;
      }
    });
    
    console.log(`Added cycle position to ${recentData.length} recent data points`);
  }
    console.log("First 5 data points:"); 
    data.slice(0, 5).forEach(d => console.log("ACTIVE_SUPPLY_1D:", d.ACTIVE_SUPPLY_1D, "ACTIVE_SUPPLY_1YR:", d.ACTIVE_SUPPLY_1YR));

    console.log("Last 5 data points:");
    data.slice(-5).forEach(d => console.log("ACTIVE_SUPPLY_1D:", d.ACTIVE_SUPPLY_1D, "ACTIVE_SUPPLY_1YR:", d.ACTIVE_SUPPLY_1YR));
  console.log(`Processed ${data.length} data points from ${data[0].date.toISOString().split('T')[0]} to ${data[data.length-1].date.toISOString().split('T')[0]}`);
  console.log('Sample processed data point with metrics:', data[data.length-1]);
  
  return data;
}

/**
 * Update the YouTuber crash data display
 * @param {number} month - Month number (1-12)
 */
function updateYoutuberCrashData(month) {
  // Get the crash data for the specified month
  const crashData = state.mostSevereMonthlyData[month];
  
  // Get the UI elements
  const youtuberCrashDate = document.getElementById('youtuberCrashDate');
  const youtuberCrashPercentage = document.getElementById('youtuberCrashPercentage');
  const youtuberCrashContext = document.getElementById('youtuberCrashContext');
  
  if (!youtuberCrashDate || !youtuberCrashPercentage || !youtuberCrashContext) {
    console.error('YouTuber crash elements not found');
    return;
  }
  
  // If crash data is available for this month, update the display
  if (crashData) {
    youtuberCrashDate.textContent = crashData.date;
    youtuberCrashPercentage.textContent = `${crashData.percentage}% in 24 hours`;
    youtuberCrashContext.textContent = crashData.context.replace(/\[.*?\]\s*/, ''); // Remove epoch prefix
  } else {
    // Check if there are any crashes at all for this month in the historical crashes data
    const monthCrashes = state.historicalCrashes[month];
    
    if (monthCrashes && monthCrashes.length > 0) {
      // CHANGE HERE: Sort crashes by percentage (most severe first)
      // Note: Since percentage is negative for crashes, we sort ascending
      const sortedCrashes = [...monthCrashes].sort((a, b) => 
        parseFloat(a.percentage) - parseFloat(b.percentage)
      );
      
      // Use the most severe crash (not just the first one)
      const worstCrash = sortedCrashes[0];
      
      youtuberCrashDate.textContent = worstCrash.date;
      youtuberCrashPercentage.textContent = `${worstCrash.percentage}% in 24 hours`;
      youtuberCrashContext.textContent = worstCrash.context.replace(/\[.*?\]\s*/, '');
    } else {
      // No crashes found for this month
      youtuberCrashDate.textContent = 'No historical crashes';
      youtuberCrashPercentage.textContent = '';
      youtuberCrashContext.textContent = 'No significant historical crash data available for this month.';
    }
  }
}

/**
 * Generate timeline data from Bitcoin data
 * @param {Array} data - Bitcoin historical data
 */
function generateTimelineData(data) {
    // Group data by year
    const yearlyData = {};
    
    // Process data from 2013 to current year
    const startYear = 2013;
    const endYear = new Date().getFullYear();
    
    for (let year = startYear; year <= endYear; year++) {
      const yearData = data.filter(d => d.date.getFullYear() === year);
      
      if (yearData.length > 0) {
        // Calculate risk by epoch and seasonal factors for this year
        const yearRisk = {};
        
        // Group data by epoch within this year
        const epochsInYear = [...new Set(yearData.map(d => d.halvingEpoch))];
        
        // For each epoch in this year, calculate thresholds
        let yearlyExtremeEvents = 0;
        
        epochsInYear.forEach(epoch => {
          const epochData = yearData.filter(d => d.halvingEpoch === epoch);
          
          if (epochData.length > 0) {
            // Calculate 1st percentile threshold for this epoch
            const epochLogReturns = epochData
              .map(d => d.logReturn)
              .filter(r => !isNaN(r) && isFinite(r));
            
            epochLogReturns.sort((a, b) => a - b);
            const threshold = epochLogReturns[Math.floor(epochLogReturns.length * 0.01)] || 0;
            
            // Mark extreme events for this epoch
            epochData.forEach(d => {
              d.yearlyExtreme = d.logReturn < threshold ? 1 : 0;
              if (d.yearlyExtreme) yearlyExtremeEvents++;
            });
          }
        });
        
        // Calculate monthly risk based on this year's data
        const yearlyFreq = yearlyExtremeEvents / yearData.length;
        const monthlyYearRisk = {};
        
        for (let m = 1; m <= 12; m++) {
          const monthData = yearData.filter(d => d.date.getMonth() + 1 === m);
          
          if (monthData.length > 0) {
            const monthlyExtremes = monthData.reduce((sum, d) => sum + (d.yearlyExtreme || 0), 0);
            const monthlyFreq = monthData.length > 0 ? monthlyExtremes / monthData.length : 0;
            const seasonalFactor = yearlyFreq > 0 ? monthlyFreq / yearlyFreq : 1.0;
            
            // Calculate risk using Poisson-Gamma model
            const T = monthData.length;
            const N = monthlyExtremes;
            const S_m = seasonalFactor;
            
            // Risk formula
            const risk = 1 - Math.pow((b0 + T) / (b0 + T + 30), (a0 * S_m + N));
            
            // Store calculated risk
            monthlyYearRisk[m] = risk;
          } else {
            // No data for this month in this year
            monthlyYearRisk[m] = 0;
          }
        }
        
        // Store yearly risk data
        yearlyData[year] = monthlyYearRisk;
      }
    }
    
    // Store in application state
    state.timelineData = yearlyData;
  }

/**
 * Get market phase description for a specific year and month
 * @param {number} year - Year
 * @param {number} month - Month (1-12)
 * @returns {string} Market phase description
 */
function getMarketPhase(year, month) {
    if (year === 2013 && month >= 11) return "bull market peak";
    if (year === 2014 || year === 2015) return "bear market";
    if (year === 2016) return "accumulation phase";
    if (year === 2017) return "bull market";
    if (year === 2018) return "bear market";
    if (year === 2019 && month <= 6) return "early recovery";
    if (year === 2019 && month > 6) return "consolidation phase";
    if (year === 2020 && month <= 3) return "pre-COVID period";
    if (year === 2020 && month > 3 && month < 10) return "post-halving rally";
    if (year === 2020 && month >= 10) return "early bull market";
    if (year === 2021 && month <= 4) return "bull market peak";
    if (year === 2021 && month > 4 && month <= 7) return "mid-year correction";
    if (year === 2021 && month > 7) return "second bull run";
    if (year === 2022 && month <= 5) return "market downturn";
    if (year === 2022 && month > 5) return "crypto winter";
    if (year === 2023 && month <= 3) return "banking crisis period";
    if (year === 2023 && month > 3) return "recovery phase";
    if (year === 2024 && month <= 3) return "pre-halving period";
    if (year === 2024 && month > 3) return "post-halving phase";
    
    // Default for any other periods
    return "market cycle";
  }

/**
 * Close the info popup
 */
function closePopup() {
    const modalOverlay = document.getElementById('modalOverlay');
    const popupInfo = document.getElementById('popupInfo');
    
    if (modalOverlay && popupInfo) {
      modalOverlay.classList.remove('active');
      popupInfo.classList.remove('active');
      
      // Remove scroll lock
      document.body.style.overflow = '';
    }
  }

/**
 * Initialize the Bitcoin canvas animation
 */
function initBitcoinCanvas() {
    const canvas = document.getElementById('bitcoinCanvas');
    if (!canvas) {
      console.error('Bitcoin canvas not found');
      return;
    }
    
    const ctx = canvas.getContext('2d');
    
    // Set canvas dimensions
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    
    // Bitcoin symbols and blood drops
    const symbols = ['🩸'];
    const particles = [];
    
    // Create particles
    for (let i = 0; i < 80; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        size: Math.random() * 20 + 15, 
        speed: Math.random() * 2 + 1, 
        symbol: symbols[0], // Always blood drop
        opacity: Math.random() * 0.3 + 0.2, 
        rotation: 0,
        rotationSpeed: 0 
      });
    }
    
    // Animation loop
    function animate() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // Draw blood drops
      particles.forEach(particle => {
        ctx.save();
        ctx.translate(particle.x, particle.y);
        ctx.rotate(particle.rotation * Math.PI / 180);
        ctx.font = `${particle.size}px Arial`;
        ctx.fillStyle = `rgba(255, 59, 48, ${particle.opacity})`; // Red color for blood
        ctx.fillText(particle.symbol, 0, 0);
        ctx.restore();
        
        // Move particles down
        particle.y += particle.speed;
        particle.rotation += particle.rotationSpeed;
        
        // Reset particles that go offscreen
        if (particle.y > canvas.height) {
          particle.y = -particle.size;
          particle.x = Math.random() * canvas.width;
        }
      });
      
      requestAnimationFrame(animate);
    }
    
    // Start animation
    animate();
    
    // Handle window resize
    window.addEventListener('resize', () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    });
  }

/**
 * Prepare data for crash prediction chart
 * @param {number} months - Number of months to show
 * @returns {Object} Chart data configuration
 */
function preparePredictionChartData(months) {
  const endDate = new Date();
  const startDate = new Date();
  startDate.setMonth(endDate.getMonth() - months);
  
  // Use state instead of window.state
  const filteredData = state.bitcoinData.filter(d => 
    d.date >= startDate && d.date <= endDate
  );
  
  // Extract and group crash events by date
  const crashes = [];
  Object.values(state.historicalCrashes).forEach(monthCrashes => {
    monthCrashes.forEach(crash => {
      const crashDate = new Date(crash.rawDate);
      if (crashDate >= startDate && crashDate <= endDate) {
        crashes.push({
          date: crashDate,
          percentage: parseFloat(crash.percentage)
        });
      }
    });
  });
  
  // Generate monthly risk data points
  const riskData = [];
  for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
    const month = d.getMonth() + 1;
    const risk = state.riskByMonth[state.currentTimeframe][month] || 0;
    riskData.push({
      date: new Date(d),
      risk: risk * 100  // Convert to percentage
    });
  }
  
  // Create datasets for Chart.js
  return {
    datasets: [
      {
        label: 'Bitcoin Price',
        data: filteredData.map(d => ({ x: d.date, y: d.price })),
        borderColor: 'rgba(75, 192, 192, 1)',
        backgroundColor: 'rgba(75, 192, 192, 0.2)',
        borderWidth: 2,
        fill: true,
        yAxisID: 'y'
      },
      {
        label: 'Crash Probability',
        data: riskData.map(d => ({ x: d.date, y: d.risk })),
        borderColor: 'rgba(255, 99, 132, 1)',
        backgroundColor: 'rgba(255, 99, 132, 0.2)',
        borderWidth: 2,
        pointRadius: 0,
        fill: true,
        yAxisID: 'y1'
      },
      {
        label: 'Actual Crashes',
        data: crashes.map(crash => ({
          x: crash.date,
          y: crash.percentage < -20 ? 90 : 80  // Position at top of chart
        })),
        backgroundColor: '#ff3b30',
        borderColor: '#ff3b30',
        pointRadius: 8,
        pointStyle: 'triangle',
        pointRotation: 180,  // Point downward
        showLine: false,
        yAxisID: 'y1'
      }
    ]
  };
}

export { 
  fetchBitcoinData, 
  fetchSentimentAnalysis, 
  fetchCryptoNews, 
  fetchAlternativeSentimentData, 
  getHalvingEpoch, 
  processData, 
  updateYoutuberCrashData, 
  generateTimelineData, 
  getMarketPhase, 
  closePopup, 
  preparePredictionChartData, 
  initBitcoinCanvas
};
