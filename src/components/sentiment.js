/**
 * Enhanced Sentiment Component
 * Shows the full power of the Naive Bayes Classifier
 */

import { state } from '../app.js';
import { NaiveBayesClassifier } from '../core/naive-bayes-classifier.js';

/**
 * Analyze headlines with the Naive Bayes Classifier
 * @param {Array} headlines - Array of headline objects
 * @param {Array} bitcoinData - Bitcoin price data
 * @returns {Object} - Sentiment analysis results
 */
function analyzeHeadlinesWithNBC(headlines, bitcoinData) {
  // Process price data if available
  let processedPriceData = null;
  if (bitcoinData && bitcoinData.length > 0) {
    processedPriceData = bitcoinData.map(dataPoint => {
      return {
        date: dataPoint.date instanceof Date ? dataPoint.date : new Date(dataPoint.date),
        price: parseFloat(dataPoint.price),
        volume: dataPoint.volume ? parseFloat(dataPoint.volume) : 0
      };
    });
  }
  
  // Initialize classifier with price data
  const classifier = new NaiveBayesClassifier(processedPriceData);
  
  // Calculate price change (still needed for compatibility with existing code)
  let priceChange = 0;
  if (processedPriceData && processedPriceData.length > 0) {
    // Use the calculated price trends from the classifier
    priceChange = classifier.priceTrends.longTerm; // 30-day change
    console.log(`Monthly price change from trends: ${priceChange.toFixed(2)}%`);
    
    // Additional market insight logging
    if (classifier.priceTrends.trendDirection) {
      console.log(`Market context: ${classifier.priceTrends.trendDirection} trend, ` +
                  `${classifier.priceTrends.volatility.toFixed(2)}% volatility, ` +
                  `${classifier.priceTrends.shortTerm.toFixed(2)}% 1-day change`);
    }
  }
  
  // Set up recency-weighted analysis
  let totalSentiment = 0;
  let headlineWeightSum = 0;
  const headlineWeights = [];
  for (let i = 0; i < Math.min(50, headlines.length); i++) {
    const weight = Math.exp(-0.05 * i);
    headlineWeights.push(weight);
  }
  
  // Process each headline with context-aware sentiment analysis
  const analyzedHeadlines = [];
  headlines.slice(0, 50).forEach((headline, index) => {
    const text = typeof headline.title === 'string' ? headline.title : '';
    
    // Store both raw sentiment score and price-adjusted score
    const rawScore = classifier.getSentimentScore(text);
    const sentimentScore = classifier.getSentimentWithPrice(text, priceChange);
    
    const weight = headlineWeights[index];
    
    totalSentiment += sentimentScore * weight;
    headlineWeightSum += weight;
    
    // Store the tokens used in analysis for the first few headlines
    const tokens = index < 3 ? classifier.preprocess(text) : [];
    
    // Extract high-value tokens for display
    const highValueTokens = tokens.filter(token => 
      classifier.highValueTokens.has(token) ||
      token.startsWith('NOT_') ||
      token.includes('_') ||
      token.startsWith('price_') ||
      token.startsWith('percent_')
    );
    
    analyzedHeadlines.push({
      headline: text,
      rawScore: rawScore,
      score: sentimentScore,
      weight: parseFloat(weight.toFixed(2)),
      tokens: highValueTokens.slice(0, 5) // Store up to 5 high-value tokens
    });
    
    console.log(`Headline: "${text}" => Score: ${sentimentScore}, Weight: ${weight.toFixed(2)}`);
  });
  
  // Reality check - if many headlines are negative, adjust the score
  const negativeHeadlineCount = analyzedHeadlines.filter(h => h.score < 40).length;
  let finalSentiment = totalSentiment / headlineWeightSum;
  
  if (negativeHeadlineCount / analyzedHeadlines.length > 0.4) {
    const adjustmentFactor = Math.min(0.7, 0.5 + (negativeHeadlineCount / analyzedHeadlines.length) * 0.5);
    const rawFinalSentiment = finalSentiment;
    finalSentiment = finalSentiment * adjustmentFactor;
    console.log(`Adjusting sentiment due to high negative headline ratio (${negativeHeadlineCount}/${analyzedHeadlines.length}): ${rawFinalSentiment.toFixed(2)} → ${finalSentiment.toFixed(2)}`);
  }
  
  const normalizedSentiment = Math.round(finalSentiment);
  
  // Determine sentiment label
  let sentimentLabel;
  if (normalizedSentiment <= 25) {
    sentimentLabel = "Very Negative";
  } else if (normalizedSentiment <= 45) {
    sentimentLabel = "Negative";
  } else if (normalizedSentiment <= 55) {
    sentimentLabel = "Neutral";
  } else if (normalizedSentiment <= 75) {
    sentimentLabel = "Positive";
  } else {
    sentimentLabel = "Very Positive";
  }
  
  console.log(`Final sentiment: ${normalizedSentiment}/100 (${sentimentLabel})`);
  
  // Return enhanced result with market context and feature examples
  return {
    value: normalizedSentiment,
    rawScore: finalSentiment,
    sentiment: sentimentLabel,
    priceChangeInfluence: priceChange,
    timestamp: new Date().toISOString(),
    headlines: headlines.slice(0, 25),
    marketContext: classifier.priceTrends ? {
      trend: classifier.priceTrends.trendDirection,
      shortTermChange: classifier.priceTrends.shortTerm,
      mediumTermChange: classifier.priceTrends.mediumTerm,
      longTermChange: classifier.priceTrends.longTerm,
      volatility: classifier.priceTrends.volatility,
      isLocalHigh: classifier.priceTrends.isLocalHigh,
      isLocalLow: classifier.priceTrends.isLocalLow
    } : null,
    detailedHeadlines: analyzedHeadlines.slice(0, 10),
    classifierFeatures: {
      emojiProcessing: Object.keys(classifier.emojiMap).slice(0, 5),
      highValueTokens: Array.from(classifier.highValueTokens).slice(0, 5),
      significantBigrams: Array.from(classifier.significantBigrams).slice(0, 5),
      negationTerms: Array.from(classifier.negationTerms).slice(0, 5)
    }
  };
}

/**
 * Update sentiment display with detailed NBC features
 * @param {Object} sentimentData - Sentiment analysis results
 */
function updateSentimentDisplay(sentimentData) {
  // Get DOM elements
  const sentimentContainer = document.getElementById('sentimentContainer');
  const sentimentNeedle = document.getElementById('sentimentNeedle');
  const sentimentValue = document.getElementById('sentimentValue');
  const sentimentText = document.getElementById('sentimentText');
  
  // Verify elements exist
  if (!sentimentContainer || !sentimentNeedle || !sentimentValue || !sentimentText) {
    console.error('Sentiment elements not found in the DOM');
    return;
  }
  
  if (!sentimentData) {
    // Default values if API fails
    sentimentData = {
      value: 50,
      sentiment: 'Neutral',
      timestamp: new Date().toISOString()
    };
  }
  
  // Make sure container is visible
  sentimentContainer.style.display = 'block';
  
  // Set needle position
  sentimentNeedle.style.left = `${sentimentData.value}%`;
  
  // Set value
  sentimentValue.textContent = sentimentData.value;
  
  // Set text description
  sentimentText.textContent = sentimentData.sentiment;
  
  // Set color based on sentiment
  if (sentimentData.value <= 25) {
    sentimentText.style.color = "#ff3b30";
  } else if (sentimentData.value <= 45) {
    sentimentText.style.color = "#ff9500";
  } else if (sentimentData.value <= 55) {
    sentimentText.style.color = "#ffcc00";
  } else if (sentimentData.value <= 75) {
    sentimentText.style.color = "#90ee90";
  } else {
    sentimentText.style.color = "#34c759";
  }
  
  // Add headlines if available
  if (sentimentData.headlines && sentimentData.headlines.length > 0) {
    // Create a container for headlines if it doesn't exist
    let headlinesContainer = document.getElementById('sentimentHeadlines');
    if (!headlinesContainer) {
      headlinesContainer = document.createElement('div');
      headlinesContainer.id = 'sentimentHeadlines';
      headlinesContainer.className = 'sentiment-headlines';
      
      // Add a title
      const headlinesTitle = document.createElement('div');
      headlinesTitle.className = 'sentiment-headlines-title';
      headlinesTitle.textContent = 'Recent Headlines Analyzed:';
      headlinesContainer.appendChild(headlinesTitle);
      
      // Add the headlines container to the Sentiment section
      sentimentContainer.appendChild(headlinesContainer);
    } else {
      // Clear existing headlines
      headlinesContainer.innerHTML = '';
      const headlinesTitle = document.createElement('div');
      headlinesTitle.className = 'sentiment-headlines-title';
      headlinesTitle.textContent = 'Recent Headlines Analyzed:';
      headlinesContainer.appendChild(headlinesTitle);
    }
    
    // Add the headlines
    const headlinesList = document.createElement('ul');
    headlinesList.className = 'sentiment-headlines-list';
    
    sentimentData.headlines.slice(0, 10).forEach(headline => {
      const headlineItem = document.createElement('li');
      headlineItem.textContent = headline.title;
      headlinesList.appendChild(headlineItem);
    });
    
    headlinesContainer.appendChild(headlinesList);
  }
  
  // Add the NBC features display if we have detailed data
  if (sentimentData.detailedHeadlines || sentimentData.classifierFeatures) {
    // Remove previous NBC features display if it exists
    const existingFeatures = document.getElementById('nbcFeaturesContainer');
    if (existingFeatures) {
      existingFeatures.remove();
    }
    
    // Create the NBC features display
    const featuresContainer = document.createElement('div');
    featuresContainer.id = 'nbcFeaturesContainer';
    featuresContainer.className = 'nbc-features-container';
    
    // Add a toggle button
    const toggleButton = document.createElement('button');
    toggleButton.id = 'toggleNbcFeatures';
    toggleButton.className = 'toggle-features-btn';
    toggleButton.textContent = 'Show Sentiment Analysis Engine Details';
    featuresContainer.appendChild(toggleButton);
    
    // Create a container for the features (initially hidden)
    const featuresContent = document.createElement('div');
    featuresContent.id = 'nbcFeaturesContent';
    featuresContent.className = 'nbc-features-content';
    featuresContent.style.display = 'none';
    
    // Add the heading
    const featuresHeading = document.createElement('h3');
    featuresHeading.className = 'nbc-features-heading';
    featuresHeading.textContent = 'Naive Bayes Classifier Features';
    featuresContent.appendChild(featuresHeading);
    
    // Add the features grid
    const featuresGrid = document.createElement('div');
    featuresGrid.className = 'nbc-features-grid';
    
    // 1. Market Context feature
    if (sentimentData.marketContext) {
      const marketContext = document.createElement('div');
      marketContext.className = 'nbc-feature-card';
      
      const marketTitle = document.createElement('h4');
      marketTitle.textContent = 'Market Context Integration';
      marketContext.appendChild(marketTitle);
      
      const marketDesc = document.createElement('p');
      marketDesc.textContent = 'Sentiment is analyzed in the context of current market conditions:';
      marketContext.appendChild(marketDesc);
      
      const marketInfo = document.createElement('div');
      marketInfo.className = 'market-info';
      
      const trendDirection = sentimentData.marketContext.trend || 'neutral';
      const trendClass = trendDirection === 'bullish' ? 'positive' : 
                        trendDirection === 'bearish' ? 'negative' : 'neutral';
      
      marketInfo.innerHTML = `
        <div class="market-stat">
          <span class="stat-label">Market Trend:</span>
          <span class="stat-value ${trendClass}">${trendDirection}</span>
        </div>
        <div class="market-stat">
          <span class="stat-label">7-Day Change:</span>
          <span class="stat-value ${sentimentData.marketContext.mediumTermChange > 0 ? 'positive' : 'negative'}">
            ${sentimentData.marketContext.mediumTermChange.toFixed(2)}%
          </span>
        </div>
        <div class="market-stat">
          <span class="stat-label">Volatility:</span>
          <span class="stat-value">
            ${sentimentData.marketContext.volatility.toFixed(2)}%
          </span>
        </div>
      `;
      
      marketContext.appendChild(marketInfo);
      featuresGrid.appendChild(marketContext);
    }
    
    // 2. Headline Analysis feature
    if (sentimentData.detailedHeadlines && sentimentData.detailedHeadlines.length > 0) {
      const headlineAnalysis = document.createElement('div');
      headlineAnalysis.className = 'nbc-feature-card';
      
      const headlineTitle = document.createElement('h4');
      headlineTitle.textContent = 'Headline Sentiment Analysis';
      headlineAnalysis.appendChild(headlineTitle);
      
      const headlineDesc = document.createElement('p');
      headlineDesc.textContent = 'Selected headline analysis with relevance weighting:';
      headlineAnalysis.appendChild(headlineDesc);
      
      const headlineList = document.createElement('ul');
      headlineList.className = 'headline-analysis-list';
      
      sentimentData.detailedHeadlines.slice(0, 3).forEach(headline => {
        const item = document.createElement('li');
        
        // Create the headline text with score
        const headlineText = document.createElement('div');
        headlineText.className = 'headline-text';
        headlineText.textContent = headline.headline;
        
        // Create the score display
        const scoreDisplay = document.createElement('div');
        scoreDisplay.className = 'headline-score';
        
        const scoreClass = headline.score >= 70 ? 'very-positive' : 
                          headline.score >= 60 ? 'positive' :
                          headline.score >= 40 ? 'neutral' :
                          headline.score >= 30 ? 'negative' : 'very-negative';
        
        scoreDisplay.innerHTML = `<span class="${scoreClass}">${headline.score}/100</span> (weight: ${headline.weight})`;
        
        // Add tokens if available
        let tokensDisplay = '';
        if (headline.tokens && headline.tokens.length > 0) {
          tokensDisplay = '<div class="headline-tokens">Key tokens: ' + 
            headline.tokens.map(token => `<span class="token">${token}</span>`).join(', ') +
            '</div>';
        }
        
        item.appendChild(headlineText);
        item.appendChild(scoreDisplay);
        
        if (tokensDisplay) {
          item.innerHTML += tokensDisplay;
        }
        
        headlineList.appendChild(item);
      });
      
      headlineAnalysis.appendChild(headlineList);
      featuresGrid.appendChild(headlineAnalysis);
    }
    
    // 3. Crypto-Specific Features
    if (sentimentData.classifierFeatures) {
      const cryptoFeatures = document.createElement('div');
      cryptoFeatures.className = 'nbc-feature-card';
      
      const cryptoTitle = document.createElement('h4');
      cryptoTitle.textContent = 'Crypto-Specific Features';
      cryptoFeatures.appendChild(cryptoTitle);
      
      const cryptoDesc = document.createElement('p');
      cryptoDesc.textContent = 'Specialized cryptocurrency language processing:';
      cryptoFeatures.appendChild(cryptoDesc);
      
      const featuresList = document.createElement('div');
      featuresList.className = 'crypto-features-list';
      
      // Emoji processing
      if (sentimentData.classifierFeatures.emojiProcessing) {
        const emojiFeature = document.createElement('div');
        emojiFeature.className = 'crypto-feature';
        emojiFeature.innerHTML = `
          <span class="feature-title">Emoji Processing:</span>
          <span class="feature-examples">${sentimentData.classifierFeatures.emojiProcessing.join(' ')}</span>
          <span class="feature-desc">Interprets crypto Twitter language</span>
        `;
        featuresList.appendChild(emojiFeature);
      }
      
      // Bigrams
      if (sentimentData.classifierFeatures.significantBigrams) {
        const bigramFeature = document.createElement('div');
        bigramFeature.className = 'crypto-feature';
        bigramFeature.innerHTML = `
          <span class="feature-title">Advanced Bigram Analysis:</span>
          <span class="feature-examples">${sentimentData.classifierFeatures.significantBigrams.join(', ').replace(/_/g, ' ')}</span>
          <span class="feature-desc">Understands multi-word patterns</span>
        `;
        featuresList.appendChild(bigramFeature);
      }
      
      // Negation handling
      if (sentimentData.classifierFeatures.negationTerms) {
        const negationFeature = document.createElement('div');
        negationFeature.className = 'crypto-feature';
        negationFeature.innerHTML = `
          <span class="feature-title">Negation Handling:</span>
          <span class="feature-examples">${sentimentData.classifierFeatures.negationTerms.join(', ')}</span>
          <span class="feature-desc">Flips sentiment for negated phrases</span>
        `;
        featuresList.appendChild(negationFeature);
      }
      
      cryptoFeatures.appendChild(featuresList);
      featuresGrid.appendChild(cryptoFeatures);
    }
    
    // 4. Sentiment Model Explanation
    const modelExplanation = document.createElement('div');
    modelExplanation.className = 'nbc-feature-card';
    
    const modelTitle = document.createElement('h4');
    modelTitle.textContent = 'Sentiment Model Architecture';
    modelExplanation.appendChild(modelTitle);
    
    const modelDesc = document.createElement('p');
    modelDesc.textContent = 'How the NBC combines different signals to determine sentiment:';
    modelExplanation.appendChild(modelDesc);
    
    const modelDetails = document.createElement('div');
    modelDetails.className = 'model-details';
    
    modelDetails.innerHTML = `
      <div class="model-component">
        <div class="component-name">Base Classifier</div>
        <div class="component-desc">Probabilistic model trained on crypto headlines</div>
      </div>
      <div class="model-component">
        <div class="component-name">Lexicon Enhancement</div>
        <div class="component-desc">Crypto-specific sentiment dictionary with 150+ terms</div>
      </div>
      <div class="model-component">
        <div class="component-name">Pattern Matching</div>
        <div class="component-desc">Regex patterns to identify price movements</div>
      </div>
      <div class="model-component">
        <div class="component-name">Price Context Integration</div>
        <div class="component-desc">Adjusts sentiment based on current market trends</div>
      </div>
    `;
    
    modelExplanation.appendChild(modelDetails);
    featuresGrid.appendChild(modelExplanation);
    
    // Add the grid to the content
    featuresContent.appendChild(featuresGrid);
    
    // Add the content to the container
    featuresContainer.appendChild(featuresContent);
    
    // Add the container to the sentiment container
    sentimentContainer.appendChild(featuresContainer);
    
    // Add the toggle functionality
    toggleButton.addEventListener('click', function() {
      const isHidden = featuresContent.style.display === 'none';
      featuresContent.style.display = isHidden ? 'block' : 'none';
      this.textContent = isHidden ? 'Hide Sentiment Analysis Engine Details' : 'Show Sentiment Analysis Engine Details';
    });
  }
}
document.dispatchEvent(new CustomEvent('sentimentUpdated'));



export { analyzeHeadlinesWithNBC, updateSentimentDisplay };
