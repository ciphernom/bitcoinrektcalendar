/**
 * RektBot - Bitcoin Risk Analysis Chatbot
 * 
 * An advanced conversational interface for interpreting the Calendar of Rekt
 * risk model outputs and providing actionable insights.
 * 
 * @version 2.0.0
 * @copyright 2025 Ciphernom
 */

import { state, monthNames } from '../app.js';
import { formatDate, formatPercentage } from '../utils/formatting.js';
import { calculateStandardDeviation } from '../utils/statistics.js';
import { NaiveBayesClassifier } from '../core/naive-bayes-classifier.js';
import { ConversationContext } from './conversationContext.js';
import { knowledgeGraph } from './knowledgeGraph.js';
import { EnhancedNLU } from './enhancedNLU.js';

/**
 * Get month name from index
 * @param {number} monthIndex - Month index (0-11)
 * @returns {string} Month name
 */
function getMonthName(monthIndex) {
  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];
  return months[monthIndex % 12];
}

/**
 * Utility function to ensure Chart.js is available and create charts safely
 * @param {HTMLElement} container - The container to append the chart to
 * @param {string} chartType - Type of chart to create
 * @param {Object} chartConfig - Chart configuration object
 * @returns {Object|null} Chart instance or null if creation failed
 */
function createSafeChart(container, chartType, chartConfig) {
  // Clear the container first
  container.innerHTML = '';
  
  // Create new canvas with a unique ID
  const canvas = document.createElement('canvas');
  canvas.id = `rektbot-chart-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
  canvas.style.width = '100%';
  canvas.style.height = '250px';
  
  // Add canvas to container
  container.appendChild(canvas);
  
  // Delay chart creation to ensure canvas is fully rendered
  return new Promise((resolve) => {
    setTimeout(() => {
      try {
        // Check if Chart is accessible
        if (typeof Chart === 'undefined') {
          if (typeof window.Chart !== 'undefined') {
            window.Chart = window.Chart;
          } else {
            throw new Error("Chart.js library not available");
          }
        }
        
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          throw new Error("Cannot get canvas context");
        }
        
        // Create and return chart with the provided config
        const chart = new Chart(ctx, chartConfig);
        console.log(`Chart created successfully: ${chartType}`);
        resolve(chart);
        return chart;
      } catch (e) {
        console.error(`Error creating ${chartType} chart:`, e);
        container.innerHTML = `<div style="color: red; text-align: center; margin-top: 20px;">Error creating chart: ${e.message}</div>`;
        resolve(null);
        return null;
      }
    }, 200); // Short delay to ensure the canvas is in the DOM
  });
}


/**
 * Bot configuration and state management
 */
const REKTBOT_CONFIG = {
  name: "RektBot",
  version: "2.0.0",
  icon: "⚠️",
  defaultAvatar: null, // We'll use our own SVG avatar now
  typingSpeed: 20, // ms per character
  initialMessage: "Hi there! I'm RektBot, your Bitcoin crash risk assistant. Ask me anything about the current risk metrics or how to interpret the model.",
  suggestionPrompts: [
    "Explain the current risk level",
    "What factors are driving risk?",
    "What if Bitcoin drops 20%?",
    "Explain the on-chain metrics",
    "Show historical crash comparison",
    "Predict next month's risk",
    "Explore knowledge graph" // Add this new option

  ],
  knowledgeTopics: [
    { id: "risk-model", name: "Risk Model", keywords: ["model", "calculation", "algorithm", "bayesian", "poisson"] },
    { id: "on-chain", name: "On-Chain Metrics", keywords: ["mvrv", "nvt", "metrics", "on-chain", "blockchain"] },
    { id: "cycles", name: "Market Cycles", keywords: ["cycle", "halving", "bull", "bear", "top", "bottom"] },
    { id: "strategy", name: "Trading Strategy", keywords: ["strategy", "trade", "position", "risk", "management"] },
    { id: "technical", name: "Technical Analysis", keywords: ["technical", "chart", "support", "resistance", "indicator"] }
  ]
};


// Additional constants for enhanced functionality
const CLARIFICATION_CONFIDENCE_THRESHOLD = 0.65;
const MAX_CLARIFICATION_CHIPS = 4;
const CHART_CREATION_DELAY = 200; // ms delay for chart creation

// Enhanced avatar moods
const AVATAR_MOODS = {
  BULLISH: 'avatar-mood-bullish',
  BEARISH: 'avatar-mood-bearish', 
  NEUTRAL: 'avatar-mood-neutral',
  THINKING: 'avatar-mood-thinking',
  ALERT: 'avatar-mood-alert'
};

// Intent confidence thresholds for clarification
const INTENT_CONFIDENCE_THRESHOLDS = {
  HIGH: 0.80,
  MEDIUM: 0.50,
  LOW: 0.30
};

const FUZZY_MATCH_THRESHOLD = 0.70; // For typo indication - NLU might have its own for matching



// Bot state - scoped to this module
const botState = {
  conversationHistory: [],
  isOpen: false,
  isTyping: false,
  messageQueue: [],
  context: {
    currentRisk: null,
    timeframe: 30,
    recentTopics: [],
    userSentiment: "neutral",
    lastQuestionType: null
  },
  // New properties for enhanced RektBot
  nbc: null,
  intentPatterns: null,
  avatar: null
};

// Initialize the enhanced components after botState declaration
const conversationContext = new ConversationContext();
const enhancedNLU = new EnhancedNLU();

/**
 * Initialize the RektBot component
 * @returns {Promise} Promise that resolves when initialization is complete
 */
export function initialize() {
  console.log("Initializing Enhanced RektBot...");
  
  // Create and inject the bot interface
  createBotInterface();
  
  // Initialize the NBC for intent and sentiment analysis
  initializeNBC();
  
  // Set up intent patterns for query analysis
  setupIntentPatterns();
  
  // Get current risk assessment
  updateRiskContext();
  
  // Set up event listeners
  setupEventListeners();
  
  // Add custom styles
  addBotStyles();
  
  // Subscribe to application state changes
  subscribeToAppEvents();
  
    // Initialize knowledge graph with current application data
  initializeKnowledgeGraph();
  
  // Start with a collapsed state
  setTimeout(() => {
    // Show the bot tab
    const botTab = document.getElementById('rektBot-tab');
    if (botTab) botTab.classList.add('visible');
  }, 1500);
  
  // Ensure all charts render properly
setTimeout(async () => {
  // Fix any existing charts in the conversation
  const chartContainers = document.querySelectorAll('.rektbot-visual');
  if (chartContainers.length > 0) {
    console.log(`Found ${chartContainers.length} chart containers to initialize`);
    
    for (const container of chartContainers) {
      const chartType = container.classList.contains('scenario-simulation') ? 'scenario' : 
                      container.classList.contains('market-analysis-chart') ? 'prediction' : 
                      'generic';
      
      // Only reinitialize containers that don't have working charts
      const hasCanvas = container.querySelector('canvas');
      const hasErrorMsg = container.querySelector('div[style*="color: red"]');
      
      if (!hasCanvas || hasErrorMsg) {
        console.log(`Reinitializing chart container for ${chartType}`);
        
        // Try to recreate charts based on container type
        if (chartType === 'scenario' || chartType === 'prediction') {
          try {
            // Provide a basic placeholder chart
            const defaultConfig = {
              type: 'line',
              data: {
                labels: ['Day 0', 'Day 1', 'Day 2', 'Day 3', 'Day 4'],
                datasets: [{
                  label: 'Placeholder Data',
                  data: [0, 10, 5, 15, 10],
                  borderColor: '#f7931a',
                  backgroundColor: 'rgba(247, 147, 26, 0.1)'
                }]
              },
              options: {
                responsive: true,
                maintainAspectRatio: false
              }
            };
            
            await createSafeChart(container, chartType, defaultConfig);
          } catch (e) {
            console.error(`Failed to create placeholder chart: ${e.message}`);
            // Fallback to placeholder text
            container.innerHTML = `<div style="text-align: center; padding: 20px; color: #aaa; font-style: italic;">
              Chart will appear when you interact with this message again
            </div>`;
          }
        } else {
          // Just use placeholder text for unknown chart types
          container.innerHTML = `<div style="text-align: center; padding: 20px; color: #aaa; font-style: italic;">
            Chart will appear when you interact with this message again
          </div>`;
        }
      }
    }
  }
}, 1000);
  initializeNlpSupport();

  
  // Return a resolved promise to maintain compatibility with app initialization chain
  return Promise.resolve(botState);
}

/**
 * Check and initialize compromise.js for enhanced NLP features
 * @returns {boolean} Whether compromise.js is available
 */
function initializeNlpSupport() {
  const isCompromiseAvailable = typeof window.nlp === 'function';
  
  if (isCompromiseAvailable) {
    console.log('Enhanced NLP: compromise.js detected and ready for use 🎯');
    
    // Register additional plugins if they exist
    if (typeof window.compromiseNumbers === 'function') {
      window.nlp.extend(window.compromiseNumbers);
      console.log('Enhanced NLP: compromise-numbers plugin loaded 🔢');
    }
    
    if (typeof window.compromiseDates === 'function') {
      window.nlp.extend(window.compromiseDates);
      console.log('Enhanced NLP: compromise-dates plugin loaded 📅');
    }
    
    return true;
  } else {
    console.log('Enhanced NLP: compromise.js not detected, falling back to standard NLP features 🔍');
    return false;
  }
}

function initializeKnowledgeGraph() {
  // Link knowledge graph to application state for dynamic updates
  if (state.latestOnChainMetrics) {
    // Update MVRV data in knowledge graph if available
    if (state.latestOnChainMetrics.mvrv) {
      const mvrvEntity = knowledgeGraph.getEntity('MVRV_Ratio');
      if (mvrvEntity) {
        mvrvEntity.currentValue = state.latestOnChainMetrics.mvrv.value;
        mvrvEntity.currentZScore = state.latestOnChainMetrics.mvrv.zScore;
      }
    }
    
    // Update NVT data in knowledge graph if available
    if (state.latestOnChainMetrics.nvt) {
      const nvtEntity = knowledgeGraph.getEntity('NVT_Ratio');
      if (nvtEntity) {
        nvtEntity.currentValue = state.latestOnChainMetrics.nvt.value;
        nvtEntity.currentZScore = state.latestOnChainMetrics.nvt.zScore;
      }
    }
    
    // Update cycle position in knowledge graph if available
    if (state.latestOnChainMetrics.cyclePosition !== undefined) {
      const cycleEntity = knowledgeGraph.getEntity('market_cycle_position');
      if (cycleEntity) {
        cycleEntity.currentValue = state.latestOnChainMetrics.cyclePosition;
      }
    }
  }
  
  console.log("Knowledge Graph initialized with current application state");
}
/**
 * Routes the request to the appropriate intent handler.
 * @param {string} intentName - The name of the intent to handle.
 * @param {string} originalMessage - The original user message text.
 * @param {any} sentiment - The sentiment of the original message.
 * @param {Object} nluOutput - The NLU processing output (passed as processedMessage to handlers).
 * @returns {Object|null} Response object { text, visual } from the handler, or null.
 */
function routeToHandler(intentName, originalMessage, sentiment, nluOutput) {
    // The nluOutput from enhancedNLU.processMessage() is passed as 'processedMessage' to handlers
    // It contains: { primary: { intent, confidence, entities, concept, ... }, alternatives: [...], ... }

    let handlerFunction;

    switch (intentName) {
        case 'risk_assessment':
            handlerFunction = handleRiskAssessment;
            break;
        case 'strategy_advice':
            handlerFunction = handleStrategyAdvice;
            break;
        case 'metric_analysis':
            handlerFunction = handleMetricAnalysis;
            break;
        case 'market_prediction':
            handlerFunction = handleMarketPrediction;
            break;
        case 'scenario_simulation':
            handlerFunction = handleScenarioSimulation;
            break;
        case 'historical_comparison':
            handlerFunction = handleHistoricalComparison;
            break;
        case 'educational':
            handlerFunction = handleEducationalQuery;
            break;
        case 'knowledge_explorer':
            handlerFunction = handleKnowledgeExplorer;
            break;
        case 'donation_request':
            handlerFunction = handleDonationRequest;
            break;
        case 'cheesecake_request': // Easter egg from existing code
            handlerFunction = handleCheesecakeRequest;
            break;
        case 'market_structure':
             // Assuming you'll create this handler based on NLU patterns
            handlerFunction = handleMarketStructureAnalysis; // Placeholder
            break;
        case 'sentiment_analysis':
            handlerFunction = handleSentimentAnalysis; // Placeholder
            break;
        case 'black_swan_analysis':
            handlerFunction = handleBlackSwanAnalysis; // Placeholder
            break;
        case 'general_query': // Fallback intent from NLU
        default:
            handlerFunction = handleGenericResponse;
            break;
    }

    if (typeof handlerFunction === 'function') {
        try {
            // Call the handler, passing the full nluOutput as processedMessage
            return handlerFunction(originalMessage, sentiment, nluOutput);
        } catch (error) {
            console.error(`Error in handler for intent "${intentName}":`, error);
            return handleGenericResponse(originalMessage, sentiment, { primary: { intent: 'error_occurred', confidence: 1.0, entities: {} }, entities: {} });
        }
    } else {
        console.warn(`No handler found for intent: ${intentName}`);
        return handleGenericResponse(originalMessage, sentiment, { primary: { intent: 'unhandled_intent', confidence: 1.0, entities: {} }, entities: {} });
    }
}

/**
 * Handle market structure analysis intent
 * @param {string} message - User message
 * @param {number} sentiment - Message sentiment
 * @param {Object} processedMessage - Processed message with entities
 * @returns {Object} Response with text and visual
 */
function handleMarketStructureAnalysis(message, sentiment, processedMessage) {
  const visual = document.createElement('div');
  visual.className = 'rektbot-visual';
  
  // Get current price and technical levels
  const currentPrice = state.bitcoinData[state.bitcoinData.length - 1].price;
  const technicalLevel = processedMessage.entities.technicalLevel;
  
  visual.innerHTML = `
    <div style="background: rgba(30, 30, 30, 0.7); padding: 15px; border-radius: 10px; margin-top: 15px;">
      <div style="font-weight: bold; margin-bottom: 10px; color: var(--btc-orange);">Market Structure Analysis</div>
      
      <div style="margin-bottom: 15px;">
        <div style="font-weight: bold; margin-bottom: 8px;">Current Price Structure:</div>
        <div style="font-size: 0.9rem;">Current Price: $${currentPrice.toLocaleString()}</div>
        ${technicalLevel ? `
          <div style="font-size: 0.9rem; margin-top: 5px;">
            Referenced Level: ${technicalLevel.levels ? technicalLevel.levels[0].formatted : 'N/A'}
          </div>
        ` : ''}
      </div>
      
      <div style="margin-bottom: 15px;">
        <div style="font-weight: bold; margin-bottom: 8px;">Key Technical Levels:</div>
        <div style="font-size: 0.9rem;">
          • Support: Strong buying interest historically found around major psychological levels
          • Resistance: Selling pressure often emerges at previous highs and round numbers
          • Trend: Current market structure suggests ${currentPrice > 50000 ? 'bullish' : 'neutral'} bias
        </div>
      </div>
      
      <div style="background: rgba(0,0,0,0.2); padding: 10px; border-radius: 6px;">
        <div style="font-size: 0.9rem; font-style: italic;">
          Technical analysis requires real-time chart data for accurate level identification. 
          Consider consulting TradingView or similar platforms for detailed technical analysis.
        </div>
      </div>
    </div>
  `;
  
  const text = `Current market structure shows Bitcoin trading at $${currentPrice.toLocaleString()}. Technical analysis requires examination of support/resistance levels, trend direction, and volume patterns for comprehensive structure assessment.`;
  
  return { text, visual };
}

/**
 * Handle sentiment analysis intent
 * @param {string} message - User message
 * @param {number} sentiment - Message sentiment
 * @param {Object} processedMessage - Processed message with entities
 * @returns {Object} Response with text and visual
 */
function handleSentimentAnalysis(message, sentiment, processedMessage) {
  const visual = document.createElement('div');
  visual.className = 'rektbot-visual';
  
  // Get sentiment indicator from entities
  const sentimentIndicator = processedMessage.entities.sentimentIndicator;
  const currentRisk = getCurrentRisk();
  
  visual.innerHTML = `
    <div style="background: rgba(30, 30, 30, 0.7); padding: 15px; border-radius: 10px; margin-top: 15px;">
      <div style="font-weight: bold; margin-bottom: 10px; color: var(--btc-orange);">Market Sentiment Analysis</div>
      
      <div style="margin-bottom: 15px;">
        <div style="font-weight: bold; margin-bottom: 8px;">Current Risk-Based Sentiment:</div>
        <div style="font-size: 0.9rem;">
          Risk Level: ${getCurrentRiskLevel()} (${(currentRisk * 100).toFixed(1)}%)
        </div>
        <div style="font-size: 0.9rem; margin-top: 5px;">
          Sentiment Implication: ${getSentimentFromRisk(currentRisk)}
        </div>
      </div>
      
      ${sentimentIndicator ? `
        <div style="margin-bottom: 15px;">
          <div style="font-weight: bold; margin-bottom: 8px;">Specific Indicator Analysis:</div>
          <div style="font-size: 0.9rem;">
            Indicator: ${sentimentIndicator.indicator || sentimentIndicator.sentiment || 'General Sentiment'}
            ${sentimentIndicator.value ? `<br>Value: ${(sentimentIndicator.value * 100).toFixed(0)}%` : ''}
          </div>
        </div>
      ` : ''}
      
      <div style="margin-bottom: 15px;">
        <div style="font-weight: bold; margin-bottom: 8px;">Sentiment Factors:</div>
        <ul style="margin: 0; padding-left: 20px; font-size: 0.9rem;">
          <li>On-chain metrics suggest ${currentRisk > 0.6 ? 'caution' : currentRisk < 0.4 ? 'opportunity' : 'balanced outlook'}</li>
          <li>Risk assessment indicates ${getCurrentRiskLevel().toLowerCase()} market stress</li>
          <li>Historical patterns show similar conditions often lead to ${getHistoricalSentimentOutcome(currentRisk)}</li>
        </ul>
      </div>
      
      <div style="background: rgba(0,0,0,0.2); padding: 10px; border-radius: 6px;">
        <div style="font-size: 0.9rem; font-style: italic;">
          Sentiment analysis combines quantitative risk metrics with qualitative market indicators. 
          Individual sentiment can differ significantly from aggregate market sentiment.
        </div>
      </div>
    </div>
  `;
  
  const text = `Current market sentiment analysis suggests ${getSentimentFromRisk(currentRisk).toLowerCase()} conditions based on ${getCurrentRiskLevel().toLowerCase()} risk levels. ${sentimentIndicator ? `The ${sentimentIndicator.indicator || 'sentiment indicator'} you mentioned provides additional context for market psychology assessment.` : ''}`;
  
  return { text, visual };
}

/**
 * Handle black swan analysis intent
 * @param {string} message - User message
 * @param {number} sentiment - Message sentiment
 * @param {Object} processedMessage - Processed message with entities
 * @returns {Object} Response with text and visual
 */
function handleBlackSwanAnalysis(message, sentiment, processedMessage) {
  const visual = document.createElement('div');
  visual.className = 'rektbot-visual';
  
  const blackSwan = processedMessage.entities.blackSwan;
  const currentRisk = getCurrentRisk();
  
  visual.innerHTML = `
    <div style="background: rgba(30, 30, 30, 0.7); padding: 15px; border-radius: 10px; margin-top: 15px;">
      <div style="font-weight: bold; margin-bottom: 10px; color: var(--btc-orange);">Black Swan Risk Analysis</div>
      
      ${blackSwan ? `
        <div style="margin-bottom: 15px;">
          <div style="font-weight: bold; margin-bottom: 8px;">Specific Event Analysis:</div>
          <div style="font-size: 0.9rem;">
            Event Type: ${blackSwan.event.replace(/_/g, ' ').toUpperCase()}
            <br>Category: ${blackSwan.type} ${blackSwan.type === 'historical' ? 'event' : 'risk'}
          </div>
        </div>
      ` : ''}
      
      <div style="margin-bottom: 15px;">
        <div style="font-weight: bold; margin-bottom: 8px;">Current Tail Risk Assessment:</div>
        <div style="font-size: 0.9rem;">
          Base Risk Level: ${(currentRisk * 100).toFixed(1)}% (${getCurrentRiskLevel()})
          <br>Black Swan Multiplier: ${getBlackSwanMultiplier(currentRisk)}x
          <br>Extreme Event Probability: ${(currentRisk * getBlackSwanMultiplier(currentRisk) * 100).toFixed(1)}%
        </div>
      </div>
      
      <div style="margin-bottom: 15px;">
        <div style="font-weight: bold; margin-bottom: 8px;">Historical Black Swan Events:</div>
        <ul style="margin: 0; padding-left: 20px; font-size: 0.9rem;">
          <li><strong>COVID-19 Crash (March 2020):</strong> 50% drop in 24 hours</li>
          <li><strong>FTX Collapse (November 2022):</strong> Contagion-driven 25% decline</li>
          <li><strong>Luna/Terra Collapse (May 2022):</strong> Algorithmic stablecoin failure</li>
          <li><strong>China Mining Ban (May 2021):</strong> Regulatory shock, 50% hash rate drop</li>
        </ul>
      </div>
      
      <div style="margin-bottom: 15px;">
        <div style="font-weight: bold; margin-bottom: 8px;">Mitigation Strategies:</div>
        <ul style="margin: 0; padding-left: 20px; font-size: 0.9rem;">
          <li>Maintain appropriate position sizing (never risk more than you can afford to lose)</li>
          <li>Diversify across multiple assets and strategies</li>
          <li>Use stop-losses and hedging for large positions</li>
          <li>Keep cash reserves for opportunities during extreme volatility</li>
          <li>Avoid excessive leverage, especially during uncertain periods</li>
        </ul>
      </div>
      
      <div style="background: rgba(255, 59, 48, 0.1); padding: 10px; border-radius: 6px; border-left: 3px solid #ff3b30;">
        <div style="font-size: 0.9rem; font-weight: bold; color: #ff3b30;">
          ⚠️ Black Swan Warning
        </div>
        <div style="font-size: 0.85rem; margin-top: 5px;">
          By definition, black swan events are unpredictable and can occur regardless of current risk levels. 
          Historical analysis and risk models cannot fully protect against unprecedented events.
        </div>
      </div>
    </div>
  `;
  
  let text = `Black swan analysis suggests `;
  
  if (blackSwan) {
    if (blackSwan.type === 'historical') {
      text += `the ${blackSwan.event.replace(/_/g, ' ')} was a significant tail risk event that demonstrates how quickly market conditions can change. `;
    } else {
      text += `general black swan risks remain a constant concern in volatile markets like Bitcoin. `;
    }
  } else {
    text += `current tail risk levels are elevated by a factor of ${getBlackSwanMultiplier(currentRisk)}x beyond the base ${(currentRisk * 100).toFixed(1)}% risk assessment. `;
  }
  
  text += `While these extreme events are unpredictable by nature, maintaining proper risk management and position sizing remains the best defense against potential black swan scenarios.`;
  
  return { text, visual };
}


/**
 * Get sentiment description from risk level
 * @param {number} risk - Risk value (0-1)
 * @returns {string} Sentiment description
 */
function getSentimentFromRisk(risk) {
  if (risk > 0.8) return "Extreme Fear/Greed (market at extremes)";
  if (risk > 0.6) return "High Anxiety/Uncertainty";
  if (risk > 0.4) return "Cautious Optimism";
  if (risk > 0.2) return "Measured Confidence";
  return "Strong Conviction/Accumulation Phase";
}

/**
 * Get historical sentiment outcome
 * @param {number} risk - Risk value (0-1)
 * @returns {string} Historical outcome description
 */
function getHistoricalSentimentOutcome(risk) {
  if (risk > 0.8) return "significant corrections within 1-3 months";
  if (risk > 0.6) return "increased volatility and potential pullbacks";
  if (risk > 0.4) return "consolidation with mixed directional moves";
  if (risk > 0.2) return "continued upward momentum with healthy corrections";
  return "strong accumulation opportunities with limited downside";
}

/**
 * Get black swan risk multiplier
 * @param {number} baseRisk - Base risk level (0-1)
 * @returns {number} Multiplier for extreme events
 */
function getBlackSwanMultiplier(baseRisk) {
  // Black swan multiplier increases with market stress
  if (baseRisk > 0.8) return 3.0;
  if (baseRisk > 0.6) return 2.5;
  if (baseRisk > 0.4) return 2.0;
  if (baseRisk > 0.2) return 1.5;
  return 1.2;
}

/**
 * Update suggestions based on conversation context
 * @param {string} intentName - Last intent processed
 * @param {boolean} isRephrase - Whether user requested a rephrase
 * @param {Object} conversationContext - Conversation context
 */
function updateSuggestionsBasedOnContext(intentName, isRephrase, conversationContext) {
  const suggestionContainer = document.querySelector('.rektBot-suggestions');
  if (!suggestionContainer) return;
  
  let suggestions = [];
  
  if (isRephrase) {
    suggestions = [
      "Explain the current risk level",
      "What factors are driving risk?",
      "How should I adjust my strategy?",
      "Show historical comparison"
    ];
  } else {
    // Context-aware suggestions based on conversation
    switch (intentName) {
      case 'risk_assessment':
        suggestions = [
          "What factors are driving this risk?",
          "How should I position myself?",
          "Compare to historical periods",
          "Show scenario analysis"
        ];
        break;
      case 'strategy_advice':
        suggestions = [
          "What's the current risk outlook?",
          "Explain the supporting metrics",
          "Show historical precedents",
          "Analyze different scenarios"
        ];
        break;
      case 'educational':
        if (conversationContext.lastConcept) {
          suggestions = [
            `How does ${conversationContext.lastConcept.name} affect risk?`,
            "Show related concepts",
            "Explain practical applications",
            "Compare to other metrics"
          ];
        } else {
          suggestions = [
            "Explain MVRV ratio",
            "What is NVT ratio?",
            "How does the model work?",
            "Explain market cycles"
          ];
        }
        break;
      case 'knowledge_explorer':
        suggestions = [
          "Explain crash risk factors",
          "Show MVRV relationships", 
          "Explore market cycles",
          "Analyze on-chain metrics"
        ];
        break;
      default:
        suggestions = REKTBOT_CONFIG.suggestionPrompts;
    }
  }
  
  // Update suggestion chips
  suggestionContainer.innerHTML = suggestions.map(suggestion => 
    `<button class="suggestion-chip">${suggestion}</button>`
  ).join('');
  
  // Add event listeners to new chips
  suggestionContainer.querySelectorAll('.suggestion-chip').forEach(chip => {
    chip.addEventListener('click', function() {
      const userInput = document.getElementById('rektBot-user-input');
      if (userInput) {
        userInput.value = this.textContent;
        sendUserMessage();
      }
    });
  });
}




/**
 * Handle donation request intent
 * @param {string} message - User message
 * @returns {Object} Response with text and visual
 */
function handleDonationRequest(message) {
  // Define all supported cryptocurrency addresses
  const cryptoAddresses = {
    BTC: {
      address: "bc1qmce5xlnhw3mkd7uk3wd2sdd55f9vjpufdefhp8",
      name: "Bitcoin",
      symbol: "BTC",
      color: "#f7931a",
      qrPrefix: "bitcoin:"
    },
    ETH: {
      address: "0x7aF1e10e2b3a0375DA1B4ca379350B54247D6749",
      name: "Ethereum",
      symbol: "ETH",
      color: "#627eea",
      qrPrefix: "ethereum:",
      networks: ["Ethereum", "Base", "Polygon"]
    },
    SOL: {
      address: "FqNV5uKuhUZM6cYEpwirUm8TSZyR4ShgEtoHACfT4ddu",
      name: "Solana",
      symbol: "SOL",
      color: "#9945ff",
      qrPrefix: "solana:"
    },
    SUI: {
      address: "0x4163af4165b522d888ee1ad7ddf29423492d619e3932351b9718abb04f92e357",
      name: "Sui",
      symbol: "SUI", 
      color: "#4da2ff",
      qrPrefix: "sui:"
    }
  };
  
  // Create visual component
  const visual = document.createElement('div');
  visual.className = 'rektbot-visual';
  
  // Create donation interface with multiple cryptocurrencies
  visual.innerHTML = `
    <div style="background: rgba(30, 30, 30, 0.7); padding: 20px; border-radius: 12px; margin-top: 15px;">
      <div style="text-align: center; margin-bottom: 20px;">
        <div style="font-weight: bold; font-size: 1.2rem; margin-bottom: 8px; color: var(--btc-orange);">
          🙏 Support the Calendar of Rekt
        </div>
        <div style="font-size: 0.9rem; opacity: 0.8; margin-bottom: 15px;">
          Help us continue providing independent Bitcoin market analysis
        </div>
      </div>
      
      <div class="crypto-donation-grid" style="display: grid; gap: 15px;">
        ${Object.entries(cryptoAddresses).map(([key, crypto]) => `
          <div class="crypto-donation-card" style="
            background: rgba(0, 0, 0, 0.3); 
            border: 1px solid rgba(${hexToRgb(crypto.color)}, 0.3); 
            border-radius: 8px; 
            padding: 15px;
            transition: all 0.3s ease;
          ">
            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px;">
              <div style="display: flex; align-items: center; gap: 8px;">
                <div style="
                  width: 24px; 
                  height: 24px; 
                  background: ${crypto.color}; 
                  border-radius: 50%; 
                  display: flex; 
                  align-items: center; 
                  justify-content: center; 
                  font-weight: bold; 
                  font-size: 0.8rem; 
                  color: white;
                ">
                  ${crypto.symbol.charAt(0)}
                </div>
                <div>
                  <div style="font-weight: bold; color: ${crypto.color};">${crypto.name} (${crypto.symbol})</div>
                  ${crypto.networks ? `
                    <div style="font-size: 0.75rem; opacity: 0.7; margin-top: 2px;">
                      ${crypto.networks.join(" • ")}
                    </div>
                  ` : ''}
                </div>
              </div>
              <button 
                class="copy-address-btn" 
                data-address="${crypto.address}"
                data-crypto="${crypto.name}"
                style="
                  background: rgba(${hexToRgb(crypto.color)}, 0.2); 
                  border: 1px solid rgba(${hexToRgb(crypto.color)}, 0.4); 
                  color: ${crypto.color}; 
                  padding: 4px 8px; 
                  border-radius: 4px; 
                  font-size: 0.75rem; 
                  cursor: pointer;
                  transition: all 0.2s ease;
                "
                onmouseover="this.style.background='rgba(${hexToRgb(crypto.color)}, 0.3)'"
                onmouseout="this.style.background='rgba(${hexToRgb(crypto.color)}, 0.2)'"
              >
                Copy
              </button>
            </div>
            
            <div style="display: flex; gap: 15px; align-items: center;">
              <div style="flex: 1;">
                <div style="
                  background: rgba(255, 255, 255, 0.05); 
                  border: 1px solid rgba(${hexToRgb(crypto.color)}, 0.3); 
                  border-radius: 6px; 
                  padding: 10px; 
                  word-break: break-all; 
                  font-family: 'Courier New', monospace; 
                  font-size: 0.8rem; 
                  line-height: 1.3;
                ">
                  ${crypto.address}
                </div>
              </div>
              
              <div style="text-align: center;">
                <img 
                  src="https://api.qrserver.com/v1/create-qr-code/?data=${encodeURIComponent(crypto.qrPrefix + crypto.address)}&size=80x80&color=${crypto.color.substring(1)}&bgcolor=000000" 
                  alt="${crypto.name} Address QR Code" 
                  style="
                    width: 80px; 
                    height: 80px; 
                    border-radius: 4px; 
                    border: 1px solid rgba(${hexToRgb(crypto.color)}, 0.3);
                  "
                  onerror="this.src='https://api.qrserver.com/v1/create-qr-code/?data=${encodeURIComponent(crypto.address)}&size=80x80&color=${crypto.color.substring(1)}&bgcolor=000000'"
                />
                <div style="font-size: 0.7rem; opacity: 0.6; margin-top: 4px;">Scan to Pay</div>
              </div>
            </div>
          </div>
        `).join('')}
      </div>
      
      <div style="margin-top: 20px; text-align: center; padding-top: 15px; border-top: 1px solid rgba(255, 255, 255, 0.1);">
        <div style="font-size: 0.85rem; opacity: 0.7; margin-bottom: 8px;">
          ✨ Your support helps us maintain independent, data-driven Bitcoin analysis
        </div>
        <div style="font-size: 0.8rem; opacity: 0.6;">
          All donations go directly toward research, development, and maintenance costs
        </div>
      </div>
    </div>
  `;
  
  // Add copy functionality after the visual is added to DOM
  setTimeout(() => {
    const copyButtons = visual.querySelectorAll('.copy-address-btn');
    copyButtons.forEach(button => {
      button.addEventListener('click', async function() {
        const address = this.dataset.address;
        const cryptoName = this.dataset.crypto;
        
        try {
          await navigator.clipboard.writeText(address);
          
          // Visual feedback
          const originalText = this.textContent;
          this.textContent = '✓ Copied!';
          this.style.background = 'rgba(52, 199, 89, 0.3)';
          this.style.borderColor = 'rgba(52, 199, 89, 0.5)';
          this.style.color = '#34c759';
          
          setTimeout(() => {
            this.textContent = originalText;
            const cryptoColor = this.style.color;
            this.style.background = `rgba(${hexToRgb(cryptoColor)}, 0.2)`;
            this.style.borderColor = `rgba(${hexToRgb(cryptoColor)}, 0.4)`;
            this.style.color = cryptoColor;
          }, 2000);
          
        } catch (err) {
          // Fallback for browsers that don't support clipboard API
          console.error('Failed to copy address:', err);
          
          // Create temporary input element
          const tempInput = document.createElement('input');
          tempInput.value = address;
          document.body.appendChild(tempInput);
          tempInput.select();
          document.execCommand('copy');
          document.body.removeChild(tempInput);
          
          // Show feedback
          this.textContent = '✓ Copied!';
          setTimeout(() => {
            this.textContent = 'Copy';
          }, 2000);
        }
      });
    });
  }, 100);
  
  const text = "Thank you for your interest in supporting the Calendar of Rekt! We accept donations in multiple cryptocurrencies. Choose your preferred option below:";
  
  return { text, visual };
}

/**
 * Helper function to convert hex color to RGB values
 * @param {string} hex - Hex color code
 * @returns {string} RGB values as comma-separated string
 */
function hexToRgb(hex) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? 
    `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}` : 
    '247, 147, 26'; // Default to Bitcoin orange
}

function handleKnowledgeExplorer(message, sentiment, processedMessage) {
  // Create visual component
  const visual = document.createElement('div');
  visual.className = 'rektbot-visual';
  
  // Create explorer content
  visual.innerHTML = `
    <div style="margin-bottom: 15px;">
      <h3 style="margin: 0; font-size: 1.1rem; color: var(--btc-orange);">Knowledge Explorer</h3>
      <p style="margin-top: 5px; font-size: 0.9rem;">Explore concepts and their relationships in the Bitcoin risk model</p>
    </div>
    
    <div class="kg-explorer">
      <div class="kg-categories">
        ${[
          { id: 'metrics', name: 'Market Metrics', icon: '📊' },
          { id: 'risk', name: 'Risk Factors', icon: '⚠️' },
          { id: 'markets', name: 'Market Conditions', icon: '📈' },
          { id: 'events', name: 'Bitcoin Events', icon: '🔄' }
        ].map(category => `
          <div class="kg-category" data-category="${category.id}">
            <span class="category-icon">${category.icon}</span>
            <span class="category-name">${category.name}</span>
          </div>
        `).join('')}
      </div>
      
      <div class="kg-entities" id="kg-entities-container">
        <div class="kg-placeholder">Select a category to explore concepts</div>
      </div>
    </div>
  `;
  
  const text = "Here's a knowledge explorer that shows the concepts and relationships in my understanding of Bitcoin markets. Click on a category to explore related concepts.";
  
  // Return both text and visual
  const result = { text, visual };
  
  // IMPORTANT FIX: Use a MutationObserver to attach event listeners after the visual is added to the DOM
  const observer = new MutationObserver((mutations, obs) => {
    // Look for our visual element to be added to the DOM
    if (document.querySelector('.kg-categories')) {
      const categories = document.querySelectorAll('.kg-category');
      const entitiesContainer = document.getElementById('kg-entities-container');
      
      if (!categories.length || !entitiesContainer) {
        console.error('Knowledge graph elements not found even after DOM update');
        return;
      }
      
      categories.forEach(category => {
        category.addEventListener('click', function() {
          console.log('Category clicked:', this.dataset.category);
          
          // Update active state
          categories.forEach(c => c.classList.remove('active'));
          this.classList.add('active');
          
          // Get category type from data attribute
          const categoryType = this.dataset.category;
          
          // Find entities for this category
          const entities = findEntitiesByCategory(categoryType);
          
          // Display entities
          displayEntities(entitiesContainer, entities);
        });
      });
      
      // Disconnect once we've set up the event listeners
      obs.disconnect();
    }
  });
  
  // Start observing the document
  observer.observe(document.body, { childList: true, subtree: true });
  
  return result;
}

// Add these helper functions right below handleKnowledgeExplorer
function findEntitiesByCategory(category) {
  console.log('Finding entities for category:', category);
  
  if (!knowledgeGraph || !knowledgeGraph.entities) {
    console.error('Knowledge graph not available');
    return [];
  }
  
  // Filter entities by type based on category
  const result = Object.entries(knowledgeGraph.entities)
    .filter(([id, entity]) => {
      switch(category) {
        case 'metrics':
          return entity.type === 'on-chain_metric' || entity.type === 'market_metric';
        case 'risk':
          return entity.type === 'risk_assessment_concept';
        case 'markets':
          return entity.type === 'market_condition';
        case 'events':
          return entity.type === 'network_event';
        default:
          return false;
      }
    })
    .map(([id, entity]) => ({ id, ...entity }));
    
  console.log(`Found ${result.length} entities for category ${category}`);
  return result;
}

function displayEntities(container, entities) {
  console.log('Displaying entities:', entities.length);
  
  if (!container) {
    console.error('Entity container not found');
    return;
  }
  
  if (entities.length === 0) {
    container.innerHTML = '<div class="kg-placeholder">No concepts found in this category</div>';
    return;
  }
  
  container.innerHTML = entities.map(entity => `
    <div class="kg-entity">
      <div class="entity-header">
        <div class="entity-name">${entity.id.replace(/_/g, ' ')}</div>
        <div class="entity-type">${entity.type.replace(/_/g, ' ')}</div>
      </div>
      <div class="entity-definition">${entity.definition}</div>
      ${entity.relates_to ? `
        <div class="entity-relations">
          <div>Related to:</div>
          <div class="relation-list">
            ${entity.relates_to.map(rel => `
              <div class="relation-item">${rel.replace(/_/g, ' ')}</div>
            `).join('')}
          </div>
        </div>
      ` : ''}
    </div>
  `).join('');
}




/**
 * Initialize the Naive Bayes Classifier for intent and sentiment analysis
 */
function initializeNBC() {
  // Create new instance
  botState.nbc = new NaiveBayesClassifier();
  botState.nbc = new NaiveBayesClassifier({ priceData: state.bitcoinPriceHistory || null }); 

  // Train with additional bot-specific examples
  trainBotNBC(botState.nbc);
  
  console.log("RektBot NLU system initialized");
}

/**
 * Train the NBC with bot-specific examples
 * @param {NaiveBayesClassifier} nbc - The classifier instance
 */
function trainBotNBC(nbc) {
 

  // Add high-value bot-specific tokens
  nbc.highValueTokens.add("simulate");
  nbc.highValueTokens.add("scenario");
  nbc.highValueTokens.add("prediction");
  nbc.highValueTokens.add("forecast");
  nbc.highValueTokens.add("strategy");
  nbc.highValueTokens.add("recommendation");
  nbc.highValueTokens.add("advice");
}


function handleCheesecakeRequest(message, sentiment) {
  const cheesecake = knowledgeGraph.getEntity('cheesecake');
  
  // Create visual component
  const visual = document.createElement('div');
  visual.className = 'rektbot-visual';
  
  visual.innerHTML = `
    <div style="background: rgba(30, 30, 30, 0.7); padding: 15px; border-radius: 10px; margin-top: 15px;">
      <h3 style="margin: 0; font-size: 1.1rem; color: var(--btc-orange);">${cheesecake.recipe.title}</h3>
      
      <div style="margin-top: 15px;">
        <div style="font-weight: bold; margin-bottom: 8px; color: var(--btc-orange);">Ingredients:</div>
        <ul style="margin: 0; padding-left: 20px;">
          ${cheesecake.recipe.ingredients.map(ing => `<li>${ing}</li>`).join('')}
        </ul>
      </div>
      
      <div style="margin-top: 15px;">
        <div style="font-weight: bold; margin-bottom: 8px; color: var(--btc-orange);">Instructions:</div>
        <ol style="margin: 0; padding-left: 20px;">
          ${cheesecake.recipe.instructions.map(step => `<li>${step}</li>`).join('')}
        </ol>
      </div>
      
      <div style="margin-top: 15px; font-style: italic; text-align: center;">
        ${cheesecake.recipe.serving_instructions}
      </div>
      
      <div style="margin-top: 20px; text-align: center; font-size: 0.9rem; opacity: 0.7;">
        Warning: Risk of market indigestion. Previous dessert performance does not guarantee future results.
      </div>
    </div>
  `;
  
  const text = "I see you're trying to distract me from analyzing Bitcoin risk! While I'm programmed to help with crypto market analysis, I happen to have a special recipe that combines my expertise with your request:";
  
  return { text, visual };
}

/**
 * Set up intent recognition patterns
 */
function setupIntentPatterns() {
  botState.intentPatterns = [
    {
      name: 'risk_assessment',
      pattern: /(what.*risk|how risky|current risk|chance of crash|probability|risk level|how likely|chance)/i,
      handler: handleRiskAssessment
    },
    {
      name: 'strategy_advice',
      pattern: /(what.*should i do|strategy|advice|position|trade|hold|sell|buy|invest)/i,
      handler: handleStrategyAdvice
    },
    {
      name: 'metric_analysis',
      pattern: /(mvrv|nvt|metrics|on.chain|cycle|volume|addresses|explain.*metric|what.*metrics)/i,
      handler: handleMetricAnalysis
    },
    {
      name: 'market_prediction',
      pattern: /(predict|forecast|next|future|coming|week|month|estimate|projection)/i,
      handler: handleMarketPrediction
    },
    {
      name: 'scenario_simulation',
      pattern: /(what if|scenario|simulation|drops|increases|crashes|rises|down|up|falls)/i,
      handler: handleScenarioSimulation
    },
    {
      name: 'historical_comparison',
      pattern: /(historical|previous|past|similar|compare|comparison|before|precedent|pattern|history)/i,
      handler: handleHistoricalComparison
    }
  ];
}

/**
 * Subscribe to application events
 */
function subscribeToAppEvents() {
  // Update bot when risk data changes
  document.addEventListener('riskUpdated', function() {
    updateRiskContext();
    updateRiskIndicator();
      initializeKnowledgeGraph(); // Re-sync knowledge graph when on-chain data updates

  });
  
  // Update bot when sentiment data changes
  document.addEventListener('sentimentUpdated', function() {
    // Derive sentiment context from global sentiment
    if (state.sentimentData) {
      // Map 0-100 sentiment scale to bot's sentiment categories
      const sentimentValue = state.sentimentData.value;
      if (sentimentValue <= 25) {
        botState.context.userSentiment = 'fearful';
      } else if (sentimentValue <= 45) {
        botState.context.userSentiment = 'neutral';
      } else if (sentimentValue <= 75) {
        botState.context.userSentiment = 'neutral';
      } else {
        botState.context.userSentiment = 'optimistic';
      }
    }
  });
  
  // Update when timeframe changes
  document.addEventListener('timeframeChanged', function(e) {
    if (e.detail && e.detail.timeframe) {
      botState.context.timeframe = e.detail.timeframe;
      updateRiskContext();
    }
  });
  
  // Update when on-chain data is loaded
  document.addEventListener('onChainDataLoaded', function() {
    updateRiskContext();
  });
}

/**
 * Update the bot's knowledge of current risk metrics
 */
function updateRiskContext() {
  // Get current timeframe from application state
  const timeframe = state.currentTimeframe || botState.context.timeframe;
  botState.context.timeframe = timeframe;
  
  // Get current month
  const currentMonth = new Date().getMonth() + 1;
  
  // Get risk data from application state
  const monthRiskData = state.riskByMonth?.[timeframe]?.[currentMonth];
  
  // Get risk components
  const riskComponents = state.riskComponents?.[timeframe]?.[currentMonth] || {};
  
  // Extract risk level
  let riskValue, riskPercentage, credibleInterval;
  if (monthRiskData && typeof monthRiskData === 'object' && monthRiskData.risk !== undefined) {
    riskValue = monthRiskData.risk;
    credibleInterval = {
      lower: monthRiskData.lower,
      upper: monthRiskData.upper
    };
  } else {
    // Old format - direct number
    riskValue = monthRiskData || 0;
  }
  
  riskPercentage = (riskValue * 100).toFixed(1);
  
  // Determine risk level category
  let riskLevel;
  if (riskValue >= 0.8) riskLevel = "Extreme";
  else if (riskValue >= 0.65) riskLevel = "High";
  else if (riskValue >= 0.45) riskLevel = "Moderate";
  else if (riskValue >= 0.25) riskLevel = "Low";
  else riskLevel = "Very Low";
  
  // Get on-chain metrics from application state
  const metrics = state.latestOnChainMetrics || {};
  
  // Store in bot context
  botState.context.currentRisk = {
    value: riskValue,
    percentage: riskPercentage,
    level: riskLevel,
    credibleInterval: credibleInterval ? {
      lower: (credibleInterval.lower * 100).toFixed(1),
      upper: (credibleInterval.upper * 100).toFixed(1)
    } : null,
    timeframe: timeframe,
    month: currentMonth,
    monthName: getMonthName(currentMonth - 1),
    components: riskComponents,
    metrics: metrics
  };
  
  console.log("Updated RektBot context with risk data:", botState.context.currentRisk);
  
  // Update the risk indicator if bot is already open
  updateRiskIndicator();
}

/**
 * Create and inject the bot interface
 */
function createBotInterface() {
  // Get application theme variables from CSS
  const styles = window.getComputedStyle(document.documentElement);
  const btcOrange = styles.getPropertyValue('--btc-orange') || '#f7931a';
  
  // Create bot elements
  const botTab = document.createElement('div');
  botTab.id = 'rektBot-tab';
  botTab.className = 'rektBot-tab';
  botTab.innerHTML = `
    <div class="tab-icon">${REKTBOT_CONFIG.icon}</div>
    <div class="tab-label">Ask RektBot</div>
  `;
  
  const botContainer = document.createElement('div');
  botContainer.id = 'rektBot-container';
  botContainer.className = 'rektBot-container collapsed';
  
  // Construct the main bot interface with avatar
botContainer.innerHTML = `
  <div class="rektBot-header">
    <div class="rektBot-title">
      <div class="rektBot-avatar-container">
        <svg class="rektbot-avatar" viewBox="0 0 100 100" width="40" height="40"> 
          <circle class="avatar-head" cx="50" cy="50" r="45" fill="#222" />
          <circle class="avatar-rim" cx="50" cy="50" r="44" stroke="#f7931a" stroke-width="2" fill="none" />
          <circle class="avatar-eye left" cx="35" cy="40" r="6" fill="#f7931a" />
          <circle class="avatar-eye right" cx="65" cy="40" r="6" fill="#f7931a" />
          <path class="avatar-mouth" d="M30,65 Q50,75 70,65" stroke="#f7931a" stroke-width="2" fill="none" />
        </svg>
      </div>
      <div class="rektBot-info">
        <div class="rektBot-name">${REKTBOT_CONFIG.name}</div>
        <div class="rektBot-status">Bitcoin Risk Analysis Bot</div>
      </div>
    </div>

      <div class="rektBot-controls">
        <button class="rektBot-minimize" title="Minimize">−</button>
        <button class="rektBot-close" title="Close">×</button>
      </div>
    </div>
    
    <div class="rektBot-body">
      <div class="rektBot-messages" id="rektBot-messages"></div>
      
      <div class="rektBot-suggestions">
        ${REKTBOT_CONFIG.suggestionPrompts.map(prompt => 
          `<button class="suggestion-chip">${prompt}</button>`
        ).join('')}
      </div>
      
      <div class="rektBot-input">
        <textarea id="rektBot-user-input" placeholder="Ask about the risk metrics..."></textarea>
        <button id="rektBot-send">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="22" y1="2" x2="11" y2="13"></line>
            <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
          </svg>
        </button>
      </div>
    </div>
    
    <div class="rektBot-footer">
      <div class="rektBot-risk-indicator">
        <span class="indicator-label">Current Risk:</span>
        <span class="indicator-value" id="rektBot-risk-value">Loading...</span>
      </div>
      <div class="rektBot-branding">Calendar of Rekt</div>
    </div>
  
    <!-- Add resize handles -->
    <div class="rektBot-resize-handle rektBot-resize-e" aria-hidden="true"></div>
    <div class="rektBot-resize-handle rektBot-resize-s" aria-hidden="true"></div>
    <div class="rektBot-resize-handle rektBot-resize-se" aria-hidden="true"></div>
  `;
  
  // Add elements to DOM
  document.body.appendChild(botTab);
  document.body.appendChild(botContainer);
  
  // Store avatar reference
  botState.avatar = botContainer.querySelector('.rektbot-avatar-container');
  
  // Set initial avatar mood
  updateAvatarMood('neutral');
  
  // Add the initial message
  setTimeout(() => {
    addBotMessage(REKTBOT_CONFIG.initialMessage);
    
    // Update risk indicator
    updateRiskIndicator();
  }, 500);
}

/**
 * Update the risk indicator in the bot footer
 */
function updateRiskIndicator() {
  const riskIndicator = document.getElementById('rektBot-risk-value');
  if (!riskIndicator) return;
  
  const risk = botState.context.currentRisk;
  if (!risk) {
    riskIndicator.textContent = "Unknown";
    return;
  }
  
  // Set text and color class
  riskIndicator.textContent = `${risk.level} (${risk.percentage}%)`;
  
  // Remove existing classes
  riskIndicator.className = 'indicator-value';
  
  // Add appropriate class based on risk level
  if (risk.level === "Extreme") riskIndicator.classList.add('extreme-risk');
  else if (risk.level === "High") riskIndicator.classList.add('high-risk');
  else if (risk.level === "Moderate") riskIndicator.classList.add('moderate-risk');
  else if (risk.level === "Low") riskIndicator.classList.add('low-risk');
  else riskIndicator.classList.add('very-low-risk');
}

/**
 * Set up event listeners for the bot interface
 */
function setupEventListeners() {
  // Tab click event to open bot
  const botTab = document.getElementById('rektBot-tab');
  if (botTab) {
    botTab.addEventListener('click', toggleBot);
  }
  
  // Minimize button
  const minimizeBtn = document.querySelector('.rektBot-minimize');
  if (minimizeBtn) {
    minimizeBtn.addEventListener('click', toggleBot);
  }
  
  // Close button
  const closeBtn = document.querySelector('.rektBot-close');
  if (closeBtn) {
    closeBtn.addEventListener('click', closeBot);
  }
  
  // Send button
  const sendBtn = document.getElementById('rektBot-send');
  if (sendBtn) {
    sendBtn.addEventListener('click', sendUserMessage);
  }
  
  // Input enter key
  const userInput = document.getElementById('rektBot-user-input');
  if (userInput) {
    userInput.addEventListener('keydown', function(e) {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendUserMessage();
      }
    });
    
    // Auto grow textarea
    userInput.addEventListener('input', function() {
      this.style.height = 'auto';
      this.style.height = (this.scrollHeight) + 'px';
    });
  }
  
  // Suggestion chips
  const suggestionChips = document.querySelectorAll('.suggestion-chip');
  suggestionChips.forEach(chip => {
    chip.addEventListener('click', function() {
      const userInput = document.getElementById('rektBot-user-input');
      if (userInput) {
        userInput.value = this.textContent;
        sendUserMessage();
      }
    });
  });
  // Resize functionality
  const resizeHandles = document.querySelectorAll('.rektBot-resize-handle');
  const botContainer = document.getElementById('rektBot-container');
  
  if (botContainer && resizeHandles.length > 0) {
    let isResizing = false;
    let startWidth, startHeight, startX, startY;
    
    resizeHandles.forEach(handle => {
      handle.addEventListener('mousedown', function(e) {
        e.preventDefault();
        isResizing = true;
        
        startWidth = botContainer.offsetWidth;
        startHeight = botContainer.offsetHeight;
        startX = e.clientX;
        startY = e.clientY;
        
        const resizeType = this.className.includes('resize-e') ? 'width' : 
                          this.className.includes('resize-s') ? 'height' : 'both';
        
        document.body.classList.add('rektBot-resizing');
        
        document.addEventListener('mousemove', resize);
        document.addEventListener('mouseup', stopResize);
        
        function resize(e) {
          if (!isResizing) return;
          
          if (resizeType === 'width' || resizeType === 'both') {
            const newWidth = startWidth + (e.clientX - startX);
            if (newWidth >= 300 && newWidth <= window.innerWidth * 0.9) {
              botContainer.style.width = newWidth + 'px';
            }
          }
          
          if (resizeType === 'height' || resizeType === 'both') {
            const newHeight = startHeight + (e.clientY - startY);
            if (newHeight >= 400 && newHeight <= window.innerHeight * 0.9) {
              botContainer.style.height = newHeight + 'px';
            }
          }
          
          // Scroll to bottom to maintain conversation view
          scrollToBottom();
        }
        
        function stopResize() {
          isResizing = false;
          document.body.classList.remove('rektBot-resizing');
          document.removeEventListener('mousemove', resize);
          document.removeEventListener('mouseup', stopResize);
          
          // Save the new size to local storage
          saveRektBotSize(botContainer.offsetWidth, botContainer.offsetHeight);
        }
      });
    });
  }
}

/**
 * Save RektBot size to localStorage
 */
function saveRektBotSize(width, height) {
  try {
    localStorage.setItem('rektBotWidth', width);
    localStorage.setItem('rektBotHeight', height);
  } catch (e) {
    console.error('Error saving RektBot size:', e);
  }
}

/**
 * Load saved RektBot size
 */
function loadRektBotSize() {
  try {
    const botContainer = document.getElementById('rektBot-container');
    if (!botContainer) return;
    
    const savedWidth = localStorage.getItem('rektBotWidth');
    const savedHeight = localStorage.getItem('rektBotHeight');
    
    if (savedWidth) botContainer.style.width = savedWidth + 'px';
    if (savedHeight) botContainer.style.height = savedHeight + 'px';
  } catch (e) {
    console.error('Error loading RektBot size:', e);
  }
}

/**
 * Toggle the bot open/closed state
 */
export function toggleBot() {
  const botContainer = document.getElementById('rektBot-container');
  const botTab = document.getElementById('rektBot-tab');
  
  if (!botContainer) return;
  
  if (botContainer.classList.contains('collapsed')) {
    // Open the bot
    botContainer.classList.remove('collapsed');
    botState.isOpen = true;
    
    // Hide the tab
    if (botTab) botTab.classList.remove('visible');
    
    // Apply saved size settings
    loadRektBotSize();
    
    // Scroll to bottom of messages
    scrollToBottom();
    
    // Focus input
    setTimeout(() => {
      const input = document.getElementById('rektBot-user-input');
      if (input) input.focus();
    }, 300);
    
    // Notify application that bot is open
    document.dispatchEvent(new CustomEvent('rektBotOpened'));
  } else {
    // Close the bot
    botContainer.classList.add('collapsed');
    botState.isOpen = false;
    
    // Show the tab
    if (botTab) botTab.classList.add('visible');
    
    // Notify application that bot is closed
    document.dispatchEvent(new CustomEvent('rektBotClosed'));
  }
}

/**
 * Close the bot completely
 */
function closeBot() {
  const botContainer = document.getElementById('rektBot-container');
  const botTab = document.getElementById('rektBot-tab');
  
  if (botContainer) {
    botContainer.classList.add('collapsed');
    botState.isOpen = false;
  }
  
  // Hide the tab briefly
  if (botTab) {
    botTab.classList.remove('visible');
    
    // Show it again after a delay
    setTimeout(() => {
      botTab.classList.add('visible');
    }, 1500);
  }
  
  // Notify application that bot is closed
  document.dispatchEvent(new CustomEvent('rektBotClosed'));
}

/**
 * Send user message to the bot
 */
export function sendUserMessage() {
  const userInput = document.getElementById('rektBot-user-input');
  if (!userInput || !userInput.value.trim()) return;
  
  const message = userInput.value.trim();
  userInput.value = '';
  
  // Reset textarea height
  userInput.style.height = 'auto';
  
  // Add user message to chat
  addUserMessage(message);
  
  // Process the message
  processUserMessage(message);
  
  // Notify application of the message
  document.dispatchEvent(new CustomEvent('rektBotInteraction', { 
    detail: { 
      type: 'user',
      message, 
      timestamp: new Date() 
    }
  }));
}

/**
 * Add a user message to the chat
 * @param {string} message - User message text
 */
function addUserMessage(message) {
  const messagesContainer = document.getElementById('rektBot-messages');
  if (!messagesContainer) return;
  
  const messageElement = document.createElement('div');
  messageElement.className = 'message user-message';
  messageElement.innerHTML = `
    <div class="message-content">${escapeHtml(message)}</div>
    <div class="message-time">${formatTime(new Date())}</div>
  `;
  
  messagesContainer.appendChild(messageElement);
  
  // Store in history
  botState.conversationHistory.push({
    role: 'user',
    content: message,
    timestamp: new Date()
  });
  
  // Scroll to bottom
  scrollToBottom();
}

/**
 * Add a bot message to the chat
 * @param {string} message - Bot message text/HTML
 * @param {boolean} isHTML - Whether the message contains HTML
 * @param {boolean} isTyping - Whether to show typing animation
 */
function addBotMessage(message, isHTML = false, isTyping = true) {
  const messagesContainer = document.getElementById('rektBot-messages');
  if (!messagesContainer) return;
  
  const messageElement = document.createElement('div');
  messageElement.className = 'message bot-message';
  
  // Avatar
  const avatarHTML = `
    <div class="message-avatar">
      <svg class="rektbot-avatar" viewBox="0 0 100 100" width="30" height="30">
        <circle class="avatar-head" cx="50" cy="50" r="45" fill="#222" />
        <circle class="avatar-rim" cx="50" cy="50" r="44" stroke="#f7931a" stroke-width="2" fill="none" />
        <circle class="avatar-eye left" cx="35" cy="40" r="6" fill="#f7931a" />
        <circle class="avatar-eye right" cx="65" cy="40" r="6" fill="#f7931a" />
        <path class="avatar-mouth" d="M30,65 Q50,75 70,65" stroke="#f7931a" stroke-width="2" fill="none" />
      </svg>
    </div>
  `;
  
  // Message with typing effect
  if (isTyping) {
    messageElement.innerHTML = `
      ${avatarHTML}
      <div class="message-bubble">
        <div class="message-content typing-indicator">
          <span></span><span></span><span></span>
        </div>
      </div>
    `;
    
    messagesContainer.appendChild(messageElement);
    scrollToBottom();
    
    // Calculate typing duration based on message length
    const typingDuration = Math.min(3000, message.length * REKTBOT_CONFIG.typingSpeed);
    
    // After typing delay, show the message
    setTimeout(() => {
      const content = isHTML ? message : escapeHtml(message);
      messageElement.innerHTML = `
        ${avatarHTML}
        <div class="message-bubble">
          <div class="message-content">${content}</div>
          <div class="message-time">${formatTime(new Date())}</div>
        </div>
      `;
      scrollToBottom();
    }, typingDuration);
  } else {
    // Immediate display
    const content = isHTML ? message : escapeHtml(message);
    messageElement.innerHTML = `
      ${avatarHTML}
      <div class="message-bubble">
        <div class="message-content">${content}</div>
        <div class="message-time">${formatTime(new Date())}</div>
      </div>
    `;
    messagesContainer.appendChild(messageElement);
  }
  
  // Store in history
  botState.conversationHistory.push({
    role: 'assistant',
    content: message,
    timestamp: new Date()
  });
  
  // Notify application of the message
  document.dispatchEvent(new CustomEvent('rektBotInteraction', { 
    detail: { 
      type: 'bot',
      message, 
      timestamp: new Date() 
    }
  }));
  
  // Scroll to bottom
  scrollToBottom();
}

/**
 * Displays clarification suggestion chips to the user when NLU confidence is medium.
 * @param {Array<Object>} chipsArray - Array of chip objects { label, intentKey, type: 'intent'|'action' }
 * @param {string} originalMessage - The original user message.
 * @param {any} originalSentiment - The sentiment of the original message.
 * @param {Object} originalNluOutput - The full NLU output from enhancedNLU.processMessage().
 */
function displayClarificationChips(chipsArray, originalMessage, originalSentiment, originalNluOutput) {
    const messagesContainer = document.getElementById('rektBot-messages');
    if (!messagesContainer) return;

    const chipsContainerId = 'rektbot-clarification-chips';
    // Remove any existing clarification chips
    const existingChipsContainer = document.getElementById(chipsContainerId);
    if (existingChipsContainer) {
        existingChipsContainer.remove();
    }

    const chipsDiv = document.createElement('div');
    chipsDiv.id = chipsContainerId;
    chipsDiv.className = 'rektbot-clarification-chips-container'; // Add a class for styling

    chipsArray.forEach(chipData => {
        const button = document.createElement('button');
        button.className = 'suggestion-chip clarification-chip'; // Reuse styling, add specific class
        button.textContent = chipData.label;
        button.dataset.intentKey = chipData.intentKey;
        button.dataset.chipType = chipData.type;

        button.addEventListener('click', async () => {
            // Remove chips once one is clicked
            chipsDiv.remove();

            if (chipData.intentKey === 'rephrase') {
                addBotMessage("Okay, please try asking in a different way.", false, true);
                const userInput = document.getElementById('rektBot-user-input');
                if (userInput) userInput.focus();
                // Update suggestions to general ones if needed
                updateSuggestionsBasedOnContext(null, true, conversationContext);

            } else if (chipData.type === 'intent') {
                const chosenIntentKey = chipData.intentKey;
                addBotMessage(`Okay, let's talk about ${chosenIntentKey.replace(/_/g, ' ')}.`, false, true);

                // Prepare a modified NLU output with the chosen intent as primary
                let modifiedNluOutput = JSON.parse(JSON.stringify(originalNluOutput)); // Deep copy

                let chosenIntentObject;
                if (originalNluOutput.primary.intent === chosenIntentKey) {
                    chosenIntentObject = originalNluOutput.primary;
                } else {
                    chosenIntentObject = originalNluOutput.alternatives.find(alt => alt.intent === chosenIntentKey);
                }

                if (chosenIntentObject) {
                    modifiedNluOutput.primary = {
                        ...chosenIntentObject,
                        confidence: 0.99, // Override confidence to high
                        matchType: 'clarified-selection'
                    };
                    // Ensure entities from the chosen intent are present in the primary intent's entities
                    // NLU output structure might already handle this, but good to be sure.
                    // For example, if entities are directly under primaryIntent:
                    // modifiedNluOutput.primary.entities = chosenIntentObject.entities || originalNluOutput.entities;
                } else {
                    // Fallback if something went wrong, though unlikely with well-formed chipsArray
                    modifiedNluOutput.primary.intent = chosenIntentKey;
                    modifiedNluOutput.primary.confidence = 0.99;
                     modifiedNluOutput.primary.matchType = 'clarified-selection-fallback';
                }
                 modifiedNluOutput.alternatives = []; // Clear alternatives as intent is now clarified


                // Route to the handler with the clarified intent
                const responseDetails = routeToHandler(chosenIntentKey, originalMessage, originalSentiment, modifiedNluOutput);

                if (responseDetails) {
                    if (responseDetails.visual) {
                        const fullResponse = document.createElement('div');
                        fullResponse.className = 'rektbot-full-response';
                        const textElement = document.createElement('div');
                        textElement.className = 'rektbot-text-response';
                        textElement.innerHTML = escapeHtml(responseDetails.text); // Ensure HTML is escaped if not intended
                        fullResponse.appendChild(textElement);
                        fullResponse.appendChild(responseDetails.visual);
                        addBotMessage(fullResponse.outerHTML, true, true);
                    } else {
                        addBotMessage(responseDetails.text, false, true);
                    }
                    // Update conversation context with the bot's response and chosen intent
                    conversationContext.addMessage('bot', responseDetails.text, modifiedNluOutput.primary.entities);
                    if (modifiedNluOutput.primary.entities && modifiedNluOutput.primary.entities.concept) {
                        conversationContext.lastConcept = modifiedNluOutput.primary.entities.concept;
                    } else if (modifiedNluOutput.primary.concept) {
                         conversationContext.lastConcept = { id: modifiedNluOutput.primary.concept, name: modifiedNluOutput.primary.concept.replace(/_/g, ' ') };
                    }
                }
                updateSuggestionsBasedOnContext(chosenIntentKey, false, conversationContext);
            }
        });
        chipsDiv.appendChild(button);
    });

    // Insert the chips container after the last bot message that prompted clarification
    const lastBotMessage = messagesContainer.querySelector('.message.bot-message:last-child .message-bubble');
    if (lastBotMessage) {
        lastBotMessage.appendChild(chipsDiv);
    } else {
        messagesContainer.appendChild(chipsDiv); // Fallback if no prior bot message found
    }
    scrollToBottom();
}



/**
 * Create a visual representation of a knowledge graph concept
 * @param {string} conceptId - ID of the concept in the knowledge graph
 * @param {Object} explanation - Explanation object from knowledge graph (contains definition, details etc.)
 * @param {Array} relatedEntities - Array of related entity objects
 * @returns {HTMLElement} Visual element
 */
function createConceptVisual(conceptId, explanation, relatedEntities) {
  const visual = document.createElement('div');
  visual.className = 'rektbot-visual';

  const entity = knowledgeGraph.getEntity(conceptId); // Get the full entity for its properties

  if (!entity) {
    visual.innerHTML = `<div style="padding: 10px; color: #aaa;">Details for ${conceptId.replace(/_/g, ' ')} are currently unavailable.</div>`;
    return visual;
  }

  let contentHTML = '';

  // --- Main Entity Information ---
  contentHTML += `
    <div style="background: rgba(30, 30, 30, 0.7); padding: 15px; border-radius: 10px; margin-top: 15px;">
      <div style="font-weight: bold; margin-bottom: 10px; color: var(--btc-orange);">
        ${explanation.name ? explanation.name.replace(/_/g, ' ') : conceptId.replace(/_/g, ' ')}
        <span style="font-size: 0.8em; color: #ccc; margin-left: 10px;">(${entity.type ? entity.type.replace(/_/g, ' ') : 'Concept'})</span>
      </div>
      <div style="margin-bottom: 15px; font-size: 0.95rem;">
        ${explanation.definition || entity.definition || "No definition available."}
      </div>
  `;

  // Display calculation summary if available from explanation or entity
  const calcSummary = (explanation.details && explanation.details.calculation_summary) || entity.calculation_summary;
  if (calcSummary) {
    contentHTML += `
      <div style="margin-bottom: 10px;">
        <div style="font-weight: bold; font-size: 0.9rem;">Calculation Summary:</div>
        <div style="font-size: 0.9rem; opacity: 0.8;">${calcSummary}</div>
      </div>
    `;
  }

  // --- Type-Specific Visualizations ---
  switch (entity.type) {
    case 'on-chain_metric':
    case 'market_metric':
      if (entity.interpretation) {
        contentHTML += `<div style="font-weight: bold; margin-bottom: 8px; margin-top:10px; color: var(--btc-orange);">Interpretation Levels:</div>`;
        contentHTML += '<div style="display: flex; flex-direction: column; gap: 10px;">';
        Object.entries(entity.interpretation).forEach(([key, value]) => {
          const thresholdLevel = key.includes('above') || key.includes('extreme') || key.includes('overvaluation') ? 'high' :
                                 key.includes('below') || key.includes('undervaluation') || key.includes('low') ? 'low' : 'mid';
          const color = thresholdLevel === 'high' ? '#ff3b30' :
                       thresholdLevel === 'low' ? '#34c759' : '#ffcc00';
          contentHTML += `
            <div style="display: flex; align-items: flex-start; gap: 10px;">
              <div style="width: 100px; text-align: left; font-weight: bold; color: ${color}; font-size: 0.85rem; flex-shrink: 0;">
                ${key.replace(/_/g, ' ').replace(/(^\w|\s\w)/g, m => m.toUpperCase())}
              </div>
              <div style="flex: 1; background: rgba(${thresholdLevel === 'high' ? '255, 59, 48' : thresholdLevel === 'low' ? '52, 199, 89' : '255, 204, 0'}, 0.15); padding: 8px; border-radius: 4px; border-left: 3px solid ${color}; font-size: 0.9rem;">
                ${value}
              </div>
            </div>
          `;
        });
        contentHTML += '</div>';
      }
      if (entity.thresholds) {
        contentHTML += `<div style="font-weight: bold; margin-bottom: 5px; margin-top:10px; color: var(--btc-orange);">Key Thresholds:</div>`;
        contentHTML += '<ul style="margin: 0; padding-left: 20px; list-style-type: disc;">';
        for (const [key, value] of Object.entries(entity.thresholds)) {
             contentHTML += `<li style="font-size:0.9rem; margin-bottom: 4px;"><strong>${key.replace(/_/g, ' ')}:</strong> ${typeof value === 'object' ? JSON.stringify(value) : value}</li>`;
        }
        contentHTML += '</ul>';
      }
      if (entity.currentValue !== undefined && entity.currentValue !== null) {
        contentHTML += `<div style="margin-top:10px; font-size:0.9rem;"><strong>Current Value:</strong> ${entity.currentValue.toFixed ? entity.currentValue.toFixed(2) : entity.currentValue}</div>`;
      }
      if (entity.currentZScore !== undefined && entity.currentZScore !== null) {
        contentHTML += `<div style="font-size:0.9rem;"><strong>Current Z-Score:</strong> ${entity.currentZScore.toFixed(2)}</div>`;
      }
      break;

    case 'risk_assessment_concept':
      if (entity.levels) {
        contentHTML += `<div style="font-weight: bold; margin-bottom: 8px; margin-top:10px; color: var(--btc-orange);">Risk Levels:</div>`;
        contentHTML += '<div style="display: flex; flex-direction: column; gap: 10px;">';
        Object.entries(entity.levels).forEach(([level, data]) => {
            const description = typeof data === 'string' ? data : (data.description || "No description.");
            const color = level.includes('extreme') ? '#ff3b30' : level.includes('high') ? '#ff9500' : level.includes('low') || level.includes('very_low') ? '#34c759' : '#ffcc00';
            contentHTML += `
                <div style="display: flex; align-items: flex-start; gap: 10px;">
                    <div style="width: 100px; text-align: left; font-weight: bold; color: ${color}; font-size: 0.85rem; flex-shrink: 0;">
                        ${level.replace(/_/g, ' ').toUpperCase()}
                    </div>
                    <div style="flex: 1; background: rgba(${color === '#ff3b30' ? '255,59,48' : color === '#ff9500' ? '255,149,0' : color === '#34c759' ? '52,199,89' : '255,204,0'}, 0.15); padding: 8px; border-radius: 4px; border-left: 3px solid ${color}; font-size: 0.9rem;">
                        ${description}
                    </div>
                </div>
            `;
        });
        contentHTML += '</div>';
      }
      if (entity.historical_indicators && entity.historical_indicators.reliable_top_signals) {
         contentHTML += `<div style="font-weight: bold; margin-top:10px; margin-bottom: 5px; color: var(--btc-orange);">Historical Top Signals:</div><ul style="margin: 0; padding-left: 20px; list-style-type: disc;">${entity.historical_indicators.reliable_top_signals.map(s => `<li style="font-size:0.9rem; margin-bottom: 4px;">${s}</li>`).join('')}</ul>`;
      }
      break;

    case 'cycle_concept': // e.g., market_cycle_position
      if (entity.phases_detailed) {
        contentHTML += `<div style="font-weight: bold; margin-bottom: 8px; margin-top:10px; color: var(--btc-orange);">Market Cycle Phases:</div>`;
        contentHTML += '<div style="display: flex; flex-direction: column; gap: 10px;">';
        Object.entries(entity.phases_detailed).forEach(([phaseName, phaseData]) => {
            const rangeText = phaseData.range_pct ? `(${(phaseData.range_pct[0]*100).toFixed(0)}% - ${(phaseData.range_pct[1]*100).toFixed(0)}%)` : '';
            contentHTML += `
                <div style="padding: 10px; background: rgba(50,50,50,0.15); border-left: 3px solid var(--btc-orange-muted, #FFA500); border-radius: 4px;">
                    <div style="font-weight:bold; font-size:0.95rem; margin-bottom: 5px;">${phaseName.replace(/_/g, ' ').toUpperCase()} ${rangeText}</div>
                    <div style="font-size:0.9rem; opacity:0.9; margin-bottom: 5px;">${phaseData.description}</div>
                    ${phaseData.indicators ? `<div style="font-size:0.85rem; margin-top:5px;"><em>Key Indicators: ${phaseData.indicators.join(', ')}</em></div>` : ''}
                </div>
            `;
        });
        contentHTML += '</div>';
      }
      if (entity.currentValue !== undefined && entity.currentValue !== null) {
        contentHTML += `<div style="margin-top:15px; font-size:0.95rem; font-weight:bold;">Current Cycle Position: <span style="color: var(--btc-orange);">${(entity.currentValue * 100).toFixed(0)}%</span></div>`;
      }
      break;

    case 'network_event': // e.g., halving
      if (entity.historical_dates) {
        contentHTML += `<div style="font-weight: bold; margin-top:10px; margin-bottom: 5px; color: var(--btc-orange);">Historical Dates:</div><p style="font-size:0.9rem; margin:0;">${entity.historical_dates.join(', ')}</p>`;
      }
      if (entity.market_impact_theory) {
        contentHTML += `<div style="font-weight: bold; margin-top:10px; margin-bottom: 5px; color: var(--btc-orange);">Market Impact Theory:</div><p style="font-size:0.9rem; margin:0;">${entity.market_impact_theory}</p>`;
      }
      break;

    case 'market_condition': // e.g., bull_market
        if(entity.characterized_by) {
            contentHTML += `<div style="font-weight: bold; margin-top:10px; margin-bottom: 5px; color: var(--btc-orange);">Characterized By:</div><ul style="margin: 0; padding-left: 20px; list-style-type: disc;">${entity.characterized_by.map(c => `<li style="font-size:0.9rem; margin-bottom: 4px;">${c}</li>`).join('')}</ul>`;
        }
        if(entity.average_duration_days_btc) {
            contentHTML += `<p style="font-size:0.9rem; margin-top:10px;"><strong>Average Duration:</strong> ~${entity.average_duration_days_btc} days</p>`;
        }
        break;
    
    case 'easter_egg': // For the cheesecake!
        if (entity.recipe && entity.recipe.title) {
            contentHTML += `<div style="font-weight: bold; margin-top:10px; margin-bottom: 5px; color: var(--btc-orange);">${entity.recipe.title}</div>`;
            if (entity.recipe.ingredients) {
                contentHTML += `<div style="font-weight: bold; font-size:0.9rem; margin-top:10px;">Ingredients:</div><ul style="margin: 0; padding-left: 20px; list-style-type: disc;">${entity.recipe.ingredients.map(ing => `<li style="font-size:0.85rem; margin-bottom:3px;">${ing}</li>`).join('')}</ul>`;
            }
            if (entity.recipe.instructions) {
                contentHTML += `<div style="font-weight: bold; font-size:0.9rem; margin-top:10px;">Instructions:</div><ol style="margin: 0; padding-left: 20px;">${entity.recipe.instructions.map(step => `<li style="font-size:0.85rem; margin-bottom:3px;">${step}</li>`).join('')}</ol>`;
            }
            if (entity.recipe.serving_instructions) {
                contentHTML += `<p style="font-style:italic; font-size:0.85rem; margin-top:10px;">${entity.recipe.serving_instructions}</p>`;
            }
        }
        break;

    default:
      // Generic display for other types or if no specific visualization is defined
      if (entity.relates_to && entity.relates_to.length > 0) {
        contentHTML += `
          <div style="margin-top: 10px;">
            <div style="font-weight: bold; font-size: 0.9rem;">Directly Relates To:</div>
            <div style="display: flex; flex-wrap: wrap; gap: 5px; margin-top: 5px;">
              ${entity.relates_to.slice(0, 5).map(rel => `<span style="background: rgba(255,255,255,0.1); padding: 3px 7px; border-radius: 3px; font-size: 0.85rem;">${rel.replace(/_/g, ' ')}</span>`).join('')}
            </div>
          </div>
        `;
      }
      break;
  }
  contentHTML += `</div>`; // Close main entity info block

  // --- Key Relationships Section (from previous update) ---
  if (relatedEntities && relatedEntities.length > 0) {
    contentHTML += `
      <div style="margin-top: 15px; background: rgba(0,0,0,0.2); padding: 15px; border-radius: 10px;">
        <div style="font-weight: bold; margin-bottom: 10px; color: var(--btc-orange);">Key Relationships:</div>
        <ul style="margin: 0; padding-left: 20px; font-size: 0.9rem; list-style-type: disc;">
          ${relatedEntities.slice(0, 3).map(rel => {
            let relDesc = rel.description ? `(${rel.description.substring(0, 70)}...)` : '';
            // Ensure rel.name and rel.relationship are defined
            const relName = rel.name ? rel.name.replace(/_/g, ' ') : 'an unknown concept';
            const relRelationship = rel.relationship ? rel.relationship.replace(/_/g, ' ') : 'is related to';
            return `
              <li style="margin-bottom: 8px;">
                <strong>${relName}:</strong> 
                ${relRelationship} 
                ${relDesc}
              </li>
            `;
          }).join('')}
        </ul>
      </div>
    `;
  }
  // --- End of Key Relationships Section ---

  visual.innerHTML = contentHTML;
  return visual;
}



/**
 * Process a user message and generate a response.
 * This version integrates confidence-based routing and clarification chips.
 * @param {string} message - User message text
 */
 async function processUserMessage(message) {
  // Use the enhanced NLU to understand the query
  // enhancedNLU.processMessage() is assumed to be synchronous based on its usage.
  // If it were async, this function would need `await`.
  const nluOutput = enhancedNLU.processMessage(message, conversationContext); //
    const { primary: primaryIntent, alternatives: alternativeIntents, resolvedMessage, entities: allNluEntities, context: nluContext } = nluOutput; // If you want to use resolvedMessage etc.

    // Typo Indication (from Version B, adapted)
    if (allNluEntities && allNluEntities.concept && // Ensure allNluEntities exists
        allNluEntities.concept.similarity < 0.98 &&
        allNluEntities.concept.similarity >= FUZZY_MATCH_THRESHOLD && 
        allNluEntities.concept.matchType && allNluEntities.concept.matchType.includes('fuzzy')) {
        addBotMessage(`(Thinking you meant "${allNluEntities.concept.name}"...)`, false, false); 
    }
  // Add the user message to conversation context
  conversationContext.addMessage('user', message, nluOutput.entities); //

  // Get sentiment using NBC (assumed synchronous)
  const sentiment = botState.nbc ? botState.nbc.getSentimentScore(message) : 0; //

  // Update avatar mood based on sentiment
  updateAvatarMood(sentiment > 0.3 ? 'bullish' : sentiment < -0.3 ? 'bearish' : 'neutral'); //

  // Extract primary intent and confidence from NLU output
  const intentName = primaryIntent.intent;
  const confidence = primaryIntent.confidence;

  // Update last question type in bot context
  botState.context.lastQuestionType = intentName; //

  // Special handling for knowledge_explorer intent, as it has a unique UI setup
  if (intentName === 'knowledge_explorer') {
    const response = handleKnowledgeExplorer(message, sentiment, nluOutput); //
    conversationContext.addMessage('bot', response.text, {}); // Assuming KG explorer doesn't add specific entities to context
    if (response.visual) {
      const fullResponse = document.createElement('div');
      fullResponse.className = 'rektbot-full-response';
      const textElement = document.createElement('div');
      textElement.className = 'rektbot-text-response';
      textElement.innerHTML = escapeHtml(response.text); // Ensure HTML is escaped
      fullResponse.appendChild(textElement);
      fullResponse.appendChild(response.visual);
      addBotMessage(fullResponse.outerHTML, true); //
    } else {
      addBotMessage(response.text); //
    }
    updateSuggestionsBasedOnContext(intentName, false, conversationContext); //
    return;
  }

  let responseDetails;

  try {
    if (confidence >= INTENT_CONFIDENCE_THRESHOLDS.HIGH) { // Using defined constant
      // High confidence: Route directly to handler
      updateAvatarMood('thinking'); //
      responseDetails = routeToHandler(intentName, message, sentiment, nluOutput); //
      updateAvatarMood('neutral'); //

      if (responseDetails) {
        conversationContext.addMessage('bot', responseDetails.text, nluOutput.primary.entities); //
        if (responseDetails.visual) {
          const fullResponse = document.createElement('div');
          fullResponse.className = 'rektbot-full-response';
          const textElement = document.createElement('div');
          textElement.className = 'rektbot-text-response';
          textElement.innerHTML = escapeHtml(responseDetails.text);
          fullResponse.appendChild(textElement);
          fullResponse.appendChild(responseDetails.visual);
          addBotMessage(fullResponse.outerHTML, true); //
        } else {
          addBotMessage(responseDetails.text); //
        }
        // Update suggestions based on the successfully handled intent
        updateSuggestionsBasedOnContext(intentName, false, conversationContext); //
      } else {
        // If routeToHandler somehow returns nothing (should be handled by its own generic response)
        responseDetails = handleGenericResponse(message, sentiment, nluOutput); //
        conversationContext.addMessage('bot', responseDetails.text, {});
        addBotMessage(responseDetails.text); //
        updateSuggestionsBasedOnContext('general_query', false, conversationContext); //
      }
    } else if (confidence >= INTENT_CONFIDENCE_THRESHOLDS.MEDIUM && confidence < INTENT_CONFIDENCE_THRESHOLDS.HIGH) { // Using defined constants
      // Medium confidence: Show clarification chips
      addBotMessage("I'm not entirely sure what you mean. Did you want to know about one of these topics, or would you like to rephrase?", false, true); //
      
      let clarificationChips = [];
      // Add the primary (medium-confidence) intent as the first option
      if (primaryIntent && primaryIntent.intent !== 'general_query') {
        clarificationChips.push({
          label: `Yes, tell me about ${primaryIntent.intent.replace(/_/g, ' ')}`,
          intentKey: primaryIntent.intent,
          type: 'intent'
        });
      }

      // Add alternatives from NLU output
      if (nluOutput.alternatives && nluOutput.alternatives.length > 0) {
        nluOutput.alternatives.slice(0, MAX_CLARIFICATION_CHIPS - clarificationChips.length -1 ).forEach(alt => { //
          if (alt.intent !== primaryIntent.intent) { // Avoid duplicate of primary
             clarificationChips.push({
              label: `Maybe ${alt.intent.replace(/_/g, ' ')}?`,
              intentKey: alt.intent,
              type: 'intent'
            });
          }
        });
      }
      
      // Add a "Rephrase" option
      clarificationChips.push({ label: "Let me rephrase...", intentKey: 'rephrase', type: 'action' });
      
      // Ensure we don't exceed max chips
      clarificationChips = clarificationChips.slice(0, MAX_CLARIFICATION_CHIPS); //

      displayClarificationChips(clarificationChips, message, sentiment, nluOutput); //
      // Suggestions will be updated by displayClarificationChips if an intent is chosen or rephrase is selected.

    } else { // Low confidence or general_query with low confidence
      updateAvatarMood('thinking'); //
      responseDetails = handleGenericResponse(message, sentiment, nluOutput); //
      updateAvatarMood('neutral'); //
      
      conversationContext.addMessage('bot', responseDetails.text, {});
      addBotMessage(responseDetails.text); //
      updateSuggestionsBasedOnContext('general_query', true, conversationContext); // Suggest rephrasing for generic low confidence
    }
  } catch (error) {
    console.error("Error processing user message:", error);
    responseDetails = handleGenericResponse(message, sentiment, { primary: { intent: 'error_occurred', confidence: 1.0, entities: {} }, entities: {} }); //
    conversationContext.addMessage('bot', responseDetails.text, {});
    addBotMessage(responseDetails.text); //
    updateSuggestionsBasedOnContext('general_query', true, conversationContext); //
  }

  // Update conversation context with the bot's final response details' concept if any
  if (responseDetails && responseDetails.concept) { // Assuming handlers might add a 'concept' field to their response
      conversationContext.lastConcept = responseDetails.concept; //
  } else if (nluOutput.primary && nluOutput.primary.concept) { // Fallback to NLU's identified concept
      conversationContext.lastConcept = { id: nluOutput.primary.concept, name: nluOutput.primary.concept.replace(/_/g, ' ') }; //
  }
}

/**
 * Update conversation context based on the message
 * @param {string} message - User message
 */
function updateMessageContext(message) {
  // Check for sentiment indicators
  const lowerMsg = message.toLowerCase();
  
  if (/worried|scared|afraid|fear|panic|anxious|stress/i.test(lowerMsg)) {
    botState.context.userSentiment = 'fearful';
  } else if (/excited|bullish|optimistic|happy|confident|moon|profit/i.test(lowerMsg)) {
    botState.context.userSentiment = 'optimistic';
  } else if (/confused|not sure|don't understand|complex|complicated|difficult/i.test(lowerMsg)) {
    botState.context.userSentiment = 'confused';
  } else {
    botState.context.userSentiment = 'neutral';
  }
  
  // Track topics
  REKTBOT_CONFIG.knowledgeTopics.forEach(topic => {
    if (topic.keywords.some(keyword => lowerMsg.includes(keyword))) {
      if (!botState.context.recentTopics.includes(topic.id)) {
        botState.context.recentTopics.unshift(topic.id);
        botState.context.recentTopics = botState.context.recentTopics.slice(0, 3); // Keep most recent 3
      }
    }
  });
}
/**
 * Initialize knowledge graph integration with current application state
 */
function initializeKnowledgeGraphIntegration() {
  if (!knowledgeGraph) {
    console.warn('Knowledge graph not available for integration');
    return;
  }
  
  // Update knowledge graph entities with current state
  if (state.latestOnChainMetrics) {
    // Update MVRV data
    if (state.latestOnChainMetrics.mvrv) {
      const mvrvEntity = knowledgeGraph.getEntity('MVRV_Ratio');
      if (mvrvEntity) {
        mvrvEntity.currentValue = state.latestOnChainMetrics.mvrv.value;
        mvrvEntity.currentZScore = state.latestOnChainMetrics.mvrv.zScore;
      }
    }
    
    // Update NVT data
    if (state.latestOnChainMetrics.nvt) {
      const nvtEntity = knowledgeGraph.getEntity('NVT_Ratio');
      if (nvtEntity) {
        nvtEntity.currentValue = state.latestOnChainMetrics.nvt.value;
        nvtEntity.currentZScore = state.latestOnChainMetrics.nvt.zScore;
      }
    }
    
    // Update cycle position
    if (state.latestOnChainMetrics.cyclePosition !== undefined) {
      const cycleEntity = knowledgeGraph.getEntity('market_cycle_position');
      if (cycleEntity) {
        cycleEntity.currentValue = state.latestOnChainMetrics.cyclePosition;
      }
    }
  }
  
  console.log("Knowledge Graph integration updated with current application state");
}
/**
 * Update avatar mood with enhanced states
 * @param {string} mood - The mood to display ('bullish', 'bearish', 'neutral', 'thinking', 'alert')
 */
function updateAvatarMood(mood) {
  if (!botState.avatar) return;
  
  // Remove all mood classes
  Object.values(AVATAR_MOODS).forEach(moodClass => {
    botState.avatar.classList.remove(moodClass);
  });
  
  // Add the appropriate mood class
  const moodClass = AVATAR_MOODS[mood.toUpperCase()] || AVATAR_MOODS.NEUTRAL;
  botState.avatar.classList.add(moodClass);
  
  // Add temporary animation class
  botState.avatar.classList.add('mood-transition');
  setTimeout(() => {
    if (botState.avatar) {
      botState.avatar.classList.remove('mood-transition');
    }
  }, 300);
}

/**
 * Handle risk assessment intent
 * @param {string} message - User message
 * @returns {Object} Response with text and visual
 */
function handleRiskAssessment(message, sentiment, processedMessage) {
  // Extract timeframe using simple regex or from processed entities
  const timeframeEntity = processedMessage.entities.timeframe;
  const timeframe = timeframeEntity ? timeframeEntity.value : 30;
  
  // Create inline visualization
  const visual = document.createElement('div');
  visual.className = 'rektbot-visual';
  
  // Create mini risk gauge container
  const gaugeContainer = document.createElement('div');
  gaugeContainer.className = 'mini-risk-gauge';
  visual.appendChild(gaugeContainer);
  
  // Get current risk from application state
    const monthEntity = processedMessage.entities.month;
    const currentMonth = monthEntity ? monthEntity.index + 1 : new Date().getMonth() ;
    const currentRisk = state.riskByMonth[timeframe][currentMonth];
  const riskValue = typeof currentRisk === 'object' ? currentRisk.risk : currentRisk;
  const riskPercentage = (riskValue * 100).toFixed(1);
  
  let credibleInterval = null;
  if (typeof currentRisk === 'object' && currentRisk.lower !== undefined && currentRisk.upper !== undefined) {
    credibleInterval = {
      lower: (currentRisk.lower * 100).toFixed(1),
      upper: (currentRisk.upper * 100).toFixed(1)
    };
  }
  
  // Access knowledge graph for enhanced risk assessment
  const riskEntity = knowledgeGraph.getEntity('crash_risk');
  const influencingFactors = knowledgeGraph.getInfluencingFactors('crash_risk');
  
  // Get current metrics for context
  const metrics = state.latestOnChainMetrics || {};
  const cyclePosition = metrics.cyclePosition || 0.5;
  const marketPhase = knowledgeGraph.getMarketPhase(cyclePosition);

  // Calculate top risk factors
  let topRiskFactors = [];
  if (metrics && influencingFactors) {
    // Calculate contributing factors
    if (metrics.mvrv && metrics.mvrv.value > 2.5) {
      const mvrvFactor = influencingFactors.find(f => f.factor === 'MVRV_Ratio');
      if (mvrvFactor) {
        topRiskFactors.push({
          name: 'MVRV Ratio',
          value: metrics.mvrv.value.toFixed(2),
          contribution: Math.min(0.9, metrics.mvrv.value / 4) * mvrvFactor.strength,
          description: `Elevated at ${metrics.mvrv.value.toFixed(2)}, above neutral range`
        });
      }
    }
    
    if (metrics.nvt && metrics.nvt.value > 45) {
      const nvtFactor = influencingFactors.find(f => f.factor === 'NVT_Ratio');
      if (nvtFactor) {
        topRiskFactors.push({
          name: 'NVT Ratio',
          value: metrics.nvt.value.toFixed(2),
          contribution: Math.min(0.85, (metrics.nvt.value - 30) / 35) * nvtFactor.strength,
          description: `Elevated at ${metrics.nvt.value.toFixed(2)}, showing potential overvaluation`
        });
      }
    }
    
    if (metrics.volatility) {
      const volFactor = influencingFactors.find(f => f.factor === 'Volatility');
      if (volFactor) {
        let volContribution = 0.5;
        if (metrics.volatility.recent > 0.05) volContribution = 0.7;
        else if (metrics.volatility.recent < 0.02) volContribution = 0.3;
        
        topRiskFactors.push({
          name: 'Volatility',
          value: (metrics.volatility.recent * 100).toFixed(2) + '%',
          contribution: volContribution * volFactor.strength,
          description: `${metrics.volatility.recent > 0.05 ? 'Elevated' : metrics.volatility.recent < 0.02 ? 'Low' : 'Moderate'} at ${(metrics.volatility.recent * 100).toFixed(2)}%`
        });
      }
    }
    
    if (cyclePosition > 0.6) {
      const cycleFactor = influencingFactors.find(f => f.factor === 'market_cycle_position');
      if (cycleFactor) {
        topRiskFactors.push({
          name: 'Cycle Position',
          value: (cyclePosition * 100).toFixed(0) + '%',
          contribution: cyclePosition * cycleFactor.strength,
          description: `Late-cycle position (${(cyclePosition * 100).toFixed(0)}%) indicating mature market phase`
        });
      }
    }
    
    // Sort by contribution and take top 3
    topRiskFactors.sort((a, b) => b.contribution - a.contribution);
    topRiskFactors = topRiskFactors.slice(0, 3);
  }
  
  // Create gauge HTML with enhanced information
  gaugeContainer.innerHTML = `
    <div class="gauge-container">
      <div class="gauge">
        <div class="gauge-fill" style="width: ${riskPercentage}%;"></div>
        <div class="gauge-marker" style="left: ${riskPercentage}%;">
          <div class="gauge-value">${riskPercentage}%</div>
        </div>
      </div>
      <div class="gauge-levels">
        <span>Low</span>
        <span>Moderate</span>
        <span>High</span>
        <span>Extreme</span>
      </div>
    </div>
    ${credibleInterval ? `<div style="text-align: center; font-size: 0.8rem; opacity: 0.7; margin-top: 5px;">95% Credible Interval: ${credibleInterval.lower}% - ${credibleInterval.upper}%</div>` : ''}
    
    <div style="margin-top: 15px; background: rgba(30, 30, 30, 0.7); padding: 12px; border-radius: 8px;">
      <div style="margin-bottom: 8px; font-weight: bold; color: var(--btc-orange);">Top Risk Factors:</div>
      <div style="display: flex; flex-direction: column; gap: 8px;">
        ${topRiskFactors.map(factor => `
          <div style="display: flex; justify-content: space-between; align-items: center; padding: 6px 10px; background: rgba(0,0,0,0.2); border-radius: 4px; border-left: 4px solid rgba(247, 147, 26, ${factor.contribution});">
            <div style="font-weight: bold;">${factor.name}: ${factor.value}</div>
            <div style="font-size: 0.9rem; opacity: 0.8;">${factor.description}</div>
          </div>
        `).join('')}
      </div>
    </div>
    
    <div style="margin-top: 15px; background: rgba(30, 30, 30, 0.7); padding: 12px; border-radius: 8px;">
      <div style="margin-bottom: 8px; font-weight: bold; color: var(--btc-orange);">Market Context:</div>
      <div style="font-size: 0.9rem;">
        Current market phase: <strong>${marketPhase.replace(/_/g, ' ')}</strong> (${(cyclePosition * 100).toFixed(0)}% cycle position)
      </div>
      <div style="font-size: 0.9rem; margin-top: 5px;">
        ${cyclePosition > 0.8 ? 'Late-cycle conditions historically show increased crash probability due to market excesses and leveraged speculation.' : 
          cyclePosition > 0.6 ? 'Mid-to-late cycle conditions typically show moderate but increasing risk levels as valuations expand.' :
          cyclePosition > 0.4 ? 'Mid-cycle positions often feature healthy corrections within broader uptrends.' :
          'Early-cycle conditions historically demonstrate more resilience to negative catalysts.'}
      </div>
    </div>
  `;
  
  // Add timeframe buttons
  const controls = document.createElement('div');
  controls.className = 'timeframe-controls';
  controls.innerHTML = `
    <button data-days="7">7d</button>
    <button data-days="30" class="${timeframe === 30 ? 'active' : ''}">30d</button>
    <button data-days="90" class="${timeframe === 90 ? 'active' : ''}">90d</button>
  `;
  
  // Add click handlers to buttons
  setTimeout(() => {
    controls.querySelectorAll('button').forEach(btn => {
      btn.addEventListener('click', () => {
        const days = parseInt(btn.dataset.days);
        updateRiskGauge(gaugeContainer, days);
        
        // Update active state
        controls.querySelectorAll('button').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
      });
    });
  }, 100);
  
  visual.appendChild(controls);
  
  // Determine risk level category
  let riskLevel;
  if (riskValue >= 0.8) riskLevel = "Extreme";
  else if (riskValue >= 0.65) riskLevel = "High";
  else if (riskValue >= 0.45) riskLevel = "Moderate";
  else if (riskValue >= 0.25) riskLevel = "Low";
  else riskLevel = "Very Low";
  
  // Get risk level description from knowledge graph
  let riskDescription = '';
  if (riskEntity && riskEntity.levels) {
    const levelKey = riskLevel.toLowerCase();
    if (riskEntity.levels[levelKey]) {
      riskDescription = riskEntity.levels[levelKey];
    }
  }
  
  // Generate text response with enhanced context
  let text = `The risk of a significant Bitcoin price crash in the next ${timeframe} days is ${riskPercentage}% (${riskLevel} Risk). ${riskDescription} `;
  
  // Add context about top risk factors if available
  if (topRiskFactors.length > 0) {
    text += `Key factors contributing to current risk assessment include ${topRiskFactors.map(f => f.name).join(', ')}. `;
  }
  
  // Add market cycle context
  text += `Current market positioning indicates a ${marketPhase.replace(/_/g, ' ')} phase.`;
  
  return { text, visual };
}

/**
 * Get description for a risk level from knowledge graph
 * @param {number} riskValue - Risk value (0-1)
 * @returns {string} Description
 */
function getRiskLevelDescription(riskValue) {
  // Get risk entity from knowledge graph
  const riskEntity = knowledgeGraph.getEntity('crash_risk');
  
  if (!riskEntity || !riskEntity.levels) {
    // Fallback if knowledge graph data is not available
    if (riskValue >= 0.8) {
      return "This indicates an unusually high probability of significant downside volatility. Historical data suggests these conditions often precede major market corrections.";
    } else if (riskValue >= 0.65) {
      return "This shows elevated vulnerability to negative catalysts. While not at the highest risk levels, caution is strongly advised.";
    } else if (riskValue >= 0.45) {
      return "This represents a balanced risk profile with typical market conditions. Standard risk management is appropriate.";
    } else if (riskValue >= 0.25) {
      return "This indicates more stable market conditions than average, with reduced likelihood of extreme price movements.";
    } else {
      return "This suggests an unusually stable market environment with minimal downside risk based on historical patterns.";
    }
  }
  
  // Determine risk level category
  let levelKey;
  if (riskValue >= 0.8) levelKey = 'extreme';
  else if (riskValue >= 0.65) levelKey = 'high';
  else if (riskValue >= 0.45) levelKey = 'moderate';
  else if (riskValue >= 0.25) levelKey = 'low';
  else levelKey = 'very_low';
  
  // Return the description from the knowledge graph
  return riskEntity.levels[levelKey] || getRiskLevelDescription(riskValue);
}

/**
 * Update risk gauge with new timeframe
 * @param {HTMLElement} gauge - The gauge element
 * @param {number} days - Timeframe in days
 */
function updateRiskGauge(gauge, days) {
  // Get current risk for new timeframe
  const currentMonth = new Date().getMonth() + 1;
  const currentRisk = state.riskByMonth[days][currentMonth];
  const riskValue = typeof currentRisk === 'object' ? currentRisk.risk : currentRisk;
  const riskPercentage = (riskValue * 100).toFixed(1);
  
  // Update gauge elements
  const gaugeFill = gauge.querySelector('.gauge-fill');
  const gaugeMarker = gauge.querySelector('.gauge-marker');
  const gaugeValue = gauge.querySelector('.gauge-value');
  
  if (gaugeFill) gaugeFill.style.width = `${riskPercentage}%`;
  if (gaugeMarker) gaugeMarker.style.left = `${riskPercentage}%`;
  if (gaugeValue) gaugeValue.textContent = `${riskPercentage}%`;
  
  // Update credible interval if present
  if (typeof currentRisk === 'object' && currentRisk.lower !== undefined && currentRisk.upper !== undefined) {
    let intervalElement = gauge.querySelector('div[style*="text-align: center"]');
    
    if (!intervalElement) {
      intervalElement = document.createElement('div');
      intervalElement.style.textAlign = 'center';
      intervalElement.style.fontSize = '0.8rem';
      intervalElement.style.opacity = '0.7';
      intervalElement.style.marginTop = '5px';
      gauge.appendChild(intervalElement);
    }
    
    intervalElement.textContent = `95% Credible Interval: ${(currentRisk.lower * 100).toFixed(1)}% - ${(currentRisk.upper * 100).toFixed(1)}%`;
  }
}

/**
 * Handle strategy advice intent
 * @param {string} message - User message
 * @returns {Object} Response with text and visual
 */
function handleStrategyAdvice(message, sentiment, processedMessage) {
  // Get current risk level
  const currentMonth = new Date().getMonth() + 1;
  const currentRisk = state.riskByMonth[30][currentMonth];
  const riskValue = typeof currentRisk === 'object' ? currentRisk.risk : currentRisk;
  const riskPercentage = (riskValue * 100).toFixed(1);
  
  // Get cycle position
  const metrics = state.latestOnChainMetrics || {};
  const cyclePosition = metrics.cyclePosition || 0.5;
  const marketPhase = knowledgeGraph.getMarketPhase(cyclePosition);
  
  // Get risk entity from knowledge graph
  const riskEntity = knowledgeGraph.getEntity('crash_risk');
  
  // Get market condition entities
  const bullMarketEntity = knowledgeGraph.getEntity('bull_market');
  const bearMarketEntity = knowledgeGraph.getEntity('bear_market');
  
  // Determine risk level
  let riskLevel;
  if (riskValue >= 0.8) riskLevel = "Extreme";
  else if (riskValue >= 0.65) riskLevel = "High";
  else if (riskValue >= 0.45) riskLevel = "Moderate";
  else if (riskValue >= 0.25) riskLevel = "Low";
  else riskLevel = "Very Low";
  
  // Determine market condition
  const isBullMarket = cyclePosition >= 0.2 && cyclePosition <= 0.85;
  const currentMarketEntity = isBullMarket ? bullMarketEntity : bearMarketEntity;
  
  // Determine sub-phase within market condition
  let subPhase = '';
  if (isBullMarket) {
    if (cyclePosition < 0.35) subPhase = 'disbelief';
    else if (cyclePosition < 0.65) subPhase = 'acceptance';
    else subPhase = 'euphoria';
  } else {
    if (cyclePosition > 0.85) subPhase = 'denial';
    else if (cyclePosition > 0.1) subPhase = 'panic';
    else subPhase = 'depression';
  }
  
  // Get recommendations based on risk level
  const recommendations = getStrategyRecommendations(riskLevel, marketPhase, subPhase);
  
  // Extract user risk tolerance from context if available
  const userRiskTolerance = processedMessage.context?.riskTolerance || botState.context.userSentiment || 'neutral';
  
  // Create visual component
  const visual = document.createElement('div');
  visual.className = 'rektbot-visual';
  
  // Strategy recommendations list
  visual.innerHTML = `
    <div class="strategy-header ${riskLevel.toLowerCase()}-risk">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
        <h3 style="margin: 0; font-size: 1.1rem; color: var(--btc-orange);">Strategy Recommendations:</h3>
        <span style="font-weight: bold;">${riskLevel} Risk (${riskPercentage}%)</span>
      </div>
    </div>
    
    <div style="margin-bottom: 15px; background: rgba(30, 30, 30, 0.6); padding: 10px; border-radius: 6px;">
      <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
        <div style="font-weight: bold;">Market Phase:</div>
        <div>${marketPhase.replace(/_/g, ' ')} (${(cyclePosition * 100).toFixed(0)}%)</div>
      </div>
      <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
        <div style="font-weight: bold;">Market Condition:</div>
        <div>${isBullMarket ? 'Bull Market' : 'Bear Market'} - ${subPhase.charAt(0).toUpperCase() + subPhase.slice(1)} Phase</div>
      </div>
      <div style="display: flex; justify-content: space-between;">
        <div style="font-weight: bold;">Adapted For:</div>
        <div>${userRiskTolerance === 'fearful' ? 'Conservative' : userRiskTolerance === 'optimistic' ? 'Aggressive' : 'Balanced'} Strategy</div>
      </div>
    </div>
    
    <div style="margin-bottom: 15px;">
      <div style="font-weight: bold; margin-bottom: 8px; color: var(--btc-orange);">Primary Recommendations:</div>
      <ul class="strategy-recommendations" style="margin: 10px 0; padding-left: 20px;">
        ${recommendations.primary.map(rec => `<li>${rec}</li>`).join('')}
      </ul>
    </div>
    
    <div style="margin-bottom: 15px;">
      <div style="font-weight: bold; margin-bottom: 8px; color: var(--btc-orange);">Risk Management:</div>
      <ul class="strategy-recommendations" style="margin: 10px 0; padding-left: 20px;">
        ${recommendations.riskManagement.map(rec => `<li>${rec}</li>`).join('')}
      </ul>
    </div>
    
    <div style="margin-bottom: 15px;">
      <div style="font-weight: bold; margin-bottom: 8px; color: var(--btc-orange);">For Your Profile (${userRiskTolerance === 'fearful' ? 'Conservative' : userRiskTolerance === 'optimistic' ? 'Aggressive' : 'Balanced'}):</div>
      <ul class="strategy-recommendations" style="margin: 10px 0; padding-left: 20px;">
        ${recommendations.profileSpecific.map(rec => `<li>${rec}</li>`).join('')}
      </ul>
    </div>
    
    <div style="background: rgba(30, 30, 30, 0.5); padding: 10px; border-radius: 6px; margin-top: 15px;">
      <div style="font-size: 0.8rem; opacity: 0.7; font-style: italic;">
        These recommendations are based on statistical patterns and historical market behavior, not financial advice. Your personal circumstances and goals should guide your investment decisions.
      </div>
    </div>
  `;
  
  // Generate text response
  const text = `Based on the current ${riskLevel} Risk level (${riskPercentage}%) in a ${marketPhase.replace(/_/g, ' ')} phase of the market cycle, here are strategic considerations for your Bitcoin position. The current market shows characteristics of the ${subPhase} phase within a ${isBullMarket ? 'bull' : 'bear'} market structure.`;
  
  return { text, visual };
}

/**
 * Get strategy recommendations based on risk level, market phase, and sub-phase
 * @param {string} riskLevel - Risk level
 * @param {string} marketPhase - Market phase
 * @param {string} subPhase - Sub-phase within market condition
 * @returns {Object} Object with recommendation arrays
 */
function getStrategyRecommendations(riskLevel, marketPhase, subPhase) {
  // Base recommendations by risk level
  let primary = [];
  let riskManagement = [];
  let profileSpecific = {
    conservative: [],
    balanced: [],
    aggressive: []
  };
  
  // Primary recommendations based on risk level
  switch (riskLevel) {
    case "Extreme":
      primary = [
        "Consider reducing position sizes to manage elevated crash risk",
        "Shift to a defensive portfolio allocation",
        "Prepare for potential 20-30% drawdowns based on historical patterns",
        "Focus on capital preservation rather than maximizing gains"
      ];
      riskManagement = [
        "Set strict stop losses at key technical levels",
        "Avoid using leverage until risk levels decline",
        "Consider hedging strategies like options or shorts if appropriate for your expertise",
        "Maintain significant cash reserves (30%+) for potential opportunities after volatility"
      ];
      break;
    case "High":
      primary = [
        "Review portfolio allocation and consider moderate rebalancing to reduce risk",
        "Be selective with new entries, favoring strong technical setups",
        "Implement a scaling strategy for position management",
        "Prepare contingency plans for increased volatility"
      ];
      riskManagement = [
        "Set appropriate stop losses on higher-risk positions",
        "Reduce or eliminate leverage in most positions",
        "Consider trailing stops to protect profits while allowing for continued upside",
        "Maintain cash reserves (20-30%) for potential opportunities after volatility"
      ];
      break;
    case "Moderate":
      primary = [
        "Maintain balanced risk management with standard position sizing",
        "Continue regular portfolio monitoring and stick to your strategy",
        "Use dollar-cost averaging for planned additions to your portfolio",
        "Balance between accumulation and profit-taking as appropriate"
      ];
      riskManagement = [
        "Implement scaled stop losses based on volatility",
        "Maintain diversification across crypto assets if appropriate",
        "Consider strategic hedging only for larger positions",
        "Keep moderate cash reserves (10-20%) for opportunistic entries"
      ];
      break;
    case "Low":
      primary = [
        "Maintain normal risk management practices",
        "Consider gradually increasing positions on pullbacks",
        "Focus on high-conviction assets with strong fundamentals",
        "Look for strategic entry points in oversold conditions"
      ];
      riskManagement = [
        "Use wider stop losses appropriate for the lower volatility environment",
        "Monitor for changes in risk factors that could elevate market risk",
        "Consider more aggressive dollar-cost averaging schedules",
        "Maintain smaller cash reserves (5-15%) focused on tactical opportunities"
      ];
      break;
    case "Very Low":
      primary = [
        "Consider strategic accumulation during this period of reduced risk",
        "Implement long-term position building strategies",
        "Focus on value opportunities in quality assets",
        "Optimize positions while volatility remains low"
      ];
      riskManagement = [
        "Maintain vigilance as extremely low risk periods often precede changes in market conditions",
        "Use volatility-based position sizing to maximize opportunity",
        "Set up laddered buy orders below current prices to capitalize on brief dips",
        "Consider small cash reserves (5-10%) primarily for operational liquidity"
      ];
      break;
    default:
      primary = [
        "Maintain balanced risk management",
        "Follow your established investment strategy",
        "Monitor for changes in market conditions",
        "Consider consulting a financial advisor for personalized advice"
      ];
      riskManagement = [
        "Use appropriate stop losses for your risk tolerance",
        "Maintain diversification according to your investment plan",
        "Keep some cash reserves for unexpected opportunities",
        "Regularly reassess your portfolio allocation"
      ];
  }
  
  // Adjust recommendations based on market phase
  if (marketPhase === 'early_bull') {
    primary.push("Focus on established assets that lead recoveries");
    primary.push("Watch for confirmation of trend change before full commitment");
    riskManagement.push("Be prepared for false breakouts and retests of prior levels");
  } else if (marketPhase === 'mid_cycle') {
    primary.push("Balance between core holdings and tactical opportunities");
    primary.push("Watch for sector rotations within the crypto market");
    riskManagement.push("Implement a scaling-in approach for new positions");
  } else if (marketPhase === 'late_bull') {
    primary.push("Begin taking strategic profits on significant strength");
    primary.push("Reduce exposure to speculative assets");
    riskManagement.push("Tighten stop losses as volatility increases");
  } else if (marketPhase === 'potential_top') {
    primary.push("Significant profit-taking recommended on rallies");
    primary.push("Reduce overall crypto exposure substantially");
    riskManagement.push("Implement strict stop losses or consider exiting speculative positions");
  } else if (marketPhase === 'accumulation') {
    primary.push("Focus on gradual accumulation of high-conviction assets");
    primary.push("Prioritize projects with strong fundamentals and staying power");
    riskManagement.push("Use dollar-cost averaging to mitigate timing risk");
  }
  
  // Adjust based on sub-phase
  if (subPhase === 'disbelief') {
    primary.push("Capitalize on persistent negative sentiment despite improving technicals");
    riskManagement.push("Size positions appropriately as market remains emotionally charged");
  } else if (subPhase === 'acceptance') {
    primary.push("Balance between established leaders and emerging opportunities");
    riskManagement.push("Begin implementing trailing stops as profits accumulate");
  } else if (subPhase === 'euphoria') {
    primary.push("Be extremely selective with new positions as speculation increases");
    riskManagement.push("Take partial profits on significant outperformance");
  } else if (subPhase === 'denial') {
    primary.push("Resist the urge to 'catch falling knives' despite apparent value");
    riskManagement.push("If entering, use very small position sizes with strict stop losses");
  } else if (subPhase === 'panic') {
    primary.push("Consider gradual scaling into positions while maintaining significant reserves");
    riskManagement.push("Set predetermined entry levels based on technical supports");
  } else if (subPhase === 'depression') {
    primary.push("Look for fundamental adoption metrics that diverge from price action");
    riskManagement.push("Use extended timeframes for position building (6-24 months)");
  }
  
  // Profile-specific recommendations
  profileSpecific.conservative = [
    "Maintain lower crypto allocation appropriate for conservative portfolios (1-5% of investable assets)",
    "Focus primarily on Bitcoin rather than altcoins",
    "Consider regulated exposure vehicles if available in your jurisdiction",
    "Emphasize longer holding periods to reduce timing risk"
  ];
  
  profileSpecific.balanced = [
    "Maintain moderate crypto allocation (5-15% of investable assets)",
    "Balance between established assets (70-80%) and selective altcoin exposure (20-30%)",
    "Implement a core-satellite approach with regular rebalancing",
    "Consider yield-generating strategies for a portion of holdings"
  ];
  
  profileSpecific.aggressive = [
    "Consider higher crypto allocation based on conviction and experience (15-30% of investable assets)",
    "Explore emerging opportunities with asymmetric upside potential",
    "Implement tactical trading around core positions",
    "Consider limited use of leverage during low-risk periods only"
  ];
  
  // Return complete recommendation object
  return {
    primary: primary,
    riskManagement: riskManagement,
    profileSpecific: botState.context.userSentiment === 'fearful' ? profileSpecific.conservative : 
                    botState.context.userSentiment === 'optimistic' ? profileSpecific.aggressive : 
                    profileSpecific.balanced
  };
}


/**
 * Handle specific metric analysis
 * @param {string} message - User message
 * @param {boolean} isMVRV - Whether MVRV was requested
 * @param {boolean} isNVT - Whether NVT was requested
 * @param {boolean} isCycle - Whether cycle position was requested
 * @returns {Object} Response with text and visual
 */
function handleSpecificMetric(message, isMVRV, isNVT, isCycle) {
  const metrics = state.latestOnChainMetrics;
  
  if (!metrics) {
    return {
      text: "On-chain metrics data isn't currently available. Please check the On-Chain Metrics section of the dashboard.",
      visual: null
    };
  }
  
  const visual = document.createElement('div');
  visual.className = 'rektbot-visual';
  
  if (isMVRV) {
    visual.innerHTML = `
      <div style="margin-bottom: 10px;">
        <h3 style="margin: 0; font-size: 1.1rem; color: var(--btc-orange);">MVRV Ratio Explained</h3>
      </div>
      
      <div class="metric-card" style="margin-bottom: 15px;">
        <div class="metric-title">Current MVRV Ratio</div>
        <div class="metric-value">${metrics.mvrv ? metrics.mvrv.value.toFixed(2) : 'N/A'}</div>
        <div class="metric-details">
          ${metrics.mvrv ? `
            <div class="${metrics.mvrv.change >= 0 ? 'positive' : 'negative'}">
              ${metrics.mvrv.change >= 0 ? '+' : ''}${metrics.mvrv.change.toFixed(2)}%
            </div>
            <div>Z-Score: ${metrics.mvrv.zScore.toFixed(2)}</div>
          ` : 'Data unavailable'}
        </div>
      </div>
      
      <div style="font-size: 0.9rem; margin-bottom: 15px;">
        <strong>MVRV Ratio</strong> compares Bitcoin's market cap (current price × supply) to its realized cap (price of each coin when it last moved × supply).
      </div>
      
      <div style="background: rgba(30, 30, 30, 0.6); padding: 10px; border-radius: 6px; margin-bottom: 10px;">
        <div style="margin-bottom: 5px; font-weight: bold;">How to Interpret:</div>
        <ul style="margin: 0; padding-left: 20px; font-size: 0.9rem;">
          <li><strong>MVRV > 3.5:</strong> Historically indicates market tops and increased crash risk</li>
          <li><strong>MVRV 2-3.5:</strong> Elevated values suggesting market exuberance</li>
          <li><strong>MVRV 1-2:</strong> Neutral territory, neither over nor undervalued</li>
          <li><strong>MVRV < 1:</strong> Historically a good accumulation zone</li>
        </ul>
      </div>
    `;
    
    let text = `The MVRV ratio is currently at ${metrics.mvrv ? metrics.mvrv.value.toFixed(2) : 'unavailable'}. `;
    
    if (metrics.mvrv) {
      if (metrics.mvrv.value > 3.5) {
        text += "This is in the high-risk zone historically associated with market tops. MVRV values above 3.5 have preceded major corrections in Bitcoin's history.";
      } else if (metrics.mvrv.value > 2.5) {
        text += "This shows significant market appreciation above realized value, suggesting elevated but not extreme market valuation.";
      } else if (metrics.mvrv.value > 1) {
        text += "This is in the neutral zone, indicating the market price is moderately above the aggregate cost basis of Bitcoin holders.";
      } else {
        text += "This is in the value zone where market price is below the average acquisition cost, historically a favorable accumulation area.";
      }
    } else {
      text += "Unfortunately, current MVRV data is not available at the moment.";
    }
    
    return { text, visual };
  }
  
  if (isNVT) {
    visual.innerHTML = `
      <div style="margin-bottom: 10px;">
        <h3 style="margin: 0; font-size: 1.1rem; color: var(--btc-orange);">NVT Ratio Explained</h3>
      </div>
      
      <div class="metric-card" style="margin-bottom: 15px;">
        <div class="metric-title">Current NVT Ratio</div>
        <div class="metric-value">${metrics.nvt ? metrics.nvt.value.toFixed(2) : 'N/A'}</div>
        <div class="metric-details">
          ${metrics.nvt ? `
            <div class="${metrics.nvt.change >= 0 ? 'positive' : 'negative'}">
              ${metrics.nvt.change >= 0 ? '+' : ''}${metrics.nvt.change.toFixed(2)}%
            </div>
            <div>Z-Score: ${metrics.nvt.zScore.toFixed(2)}</div>
          ` : 'Data unavailable'}
        </div>
      </div>
      
      <div style="font-size: 0.9rem; margin-bottom: 15px;">
        <strong>NVT Ratio</strong> (Network Value to Transactions) compares Bitcoin's market cap to the USD value being transferred on-chain. It's conceptually similar to the P/E ratio in traditional markets.
      </div>
      
      <div style="background: rgba(30, 30, 30, 0.6); padding: 10px; border-radius: 6px; margin-bottom: 10px;">
        <div style="margin-bottom: 5px; font-weight: bold;">How to Interpret:</div>
        <ul style="margin: 0; padding-left: 20px; font-size: 0.9rem;">
          <li><strong>NVT > 65:</strong> Potentially overvalued, price exceeding network activity</li>
          <li><strong>NVT 45-65:</strong> Moderately elevated values, caution warranted</li>
          <li><strong>NVT 30-45:</strong> Neutral range, balanced valuation</li>
          <li><strong>NVT < 30:</strong> Potentially undervalued relative to network activity</li>
        </ul>
      </div>
    `;
    
    let text = `The NVT ratio is currently at ${metrics.nvt ? metrics.nvt.value.toFixed(2) : 'unavailable'}. `;
    
    if (metrics.nvt) {
      if (metrics.nvt.value > 65) {
        text += "This elevated reading suggests the market cap may be high relative to the economic activity on the network, which has historically preceded market corrections.";
      } else if (metrics.nvt.value > 45) {
        text += "This moderately elevated reading suggests caution, as the network's economic activity is not fully keeping pace with the market capitalization.";
      } else if (metrics.nvt.value > 30) {
        text += "This is in the neutral range, indicating a relatively balanced relationship between market value and network transaction activity.";
      } else {
        text += "This lower reading suggests strong network activity relative to market cap, which has historically been a positive indicator.";
      }
    } else {
      text += "Unfortunately, current NVT data is not available at the moment.";
    }
    
    return { text, visual };
  }
  
  if (isCycle) {
    visual.innerHTML = `
      <div style="margin-bottom: 10px;">
        <h3 style="margin: 0; font-size: 1.1rem; color: var(--btc-orange);">Market Cycle Position</h3>
      </div>
      
      <div class="metric-card" style="margin-bottom: 15px;">
        <div class="metric-title">Current Cycle Position</div>
        <div class="metric-value">${metrics.cyclePosition !== undefined ? (metrics.cyclePosition * 100).toFixed(0) + '%' : 'N/A'}</div>
        <div class="metric-details">
          ${metrics.cyclePosition !== undefined ? `
            <div style="width: 100%; margin-top: 5px;">
              <div style="height: 8px; width: 100%; background: rgba(0,0,0,0.3); border-radius: 4px; overflow: hidden;">
                <div style="height: 100%; width: ${(metrics.cyclePosition * 100).toFixed(0)}%; background: linear-gradient(90deg, #34c759, #ffcc00, #ff3b30); border-radius: 4px;"></div>
              </div>
              <div style="display: flex; justify-content: space-between; font-size: 0.8rem; margin-top: 3px;">
                <span>Bottom (0%)</span>
                <span>Top (100%)</span>
              </div>
            </div>
          ` : 'Data unavailable'}
        </div>
      </div>
      
      <div style="font-size: 0.9rem; margin-bottom: 15px;">
        <strong>Market Cycle Position</strong> estimates where Bitcoin currently sits within its broader market cycle, from 0% (cycle bottoms) to 100% (cycle tops).
      </div>
      
      <div style="background: rgba(30, 30, 30, 0.6); padding: 10px; border-radius: 6px; margin-bottom: 10px;">
        <div style="margin-bottom: 5px; font-weight: bold;">How to Interpret:</div>
        <ul style="margin: 0; padding-left: 20px; font-size: 0.9rem;">
          <li><strong>0-20%:</strong> Early cycle accumulation phase, typically low risk</li>
          <li><strong>20-40%:</strong> Early uptrend, recovery phase with declining risk</li>
          <li><strong>40-60%:</strong> Mid-cycle, often consolidation with mixed signals</li>
          <li><strong>60-80%:</strong> Late uptrend with increasing risk</li>
          <li><strong>80-100%:</strong> Late cycle with high risk of correction</li>
        </ul>
      </div>
    `;
    
    let text = `The current market cycle position is estimated at ${metrics.cyclePosition !== undefined ? (metrics.cyclePosition * 100).toFixed(0) + '%' : 'unavailable'}. `;
    
    if (metrics.cyclePosition !== undefined) {
      if (metrics.cyclePosition > 0.8) {
        text += "This indicates we're in a late-cycle phase, which historically carries elevated risk of significant corrections. Market tops often exhibit euphoria, overvaluation, and divergences in on-chain metrics.";
      } else if (metrics.cyclePosition > 0.6) {
        text += "This suggests we're in a late uptrend phase, characterized by strong performance but increasing risk. This phase often shows momentum with periods of volatility.";
      } else if (metrics.cyclePosition > 0.4) {
        text += "This indicates a mid-cycle position, typically characterized by consolidation and mixed signals. Mid-cycles often have healthy pullbacks within a broader uptrend.";
      } else if (metrics.cyclePosition > 0.2) {
        text += "This suggests an early uptrend phase, characterized by recovery from lows and declining risk. This phase often shows improving sentiment and fundamentals.";
      } else {
        text += "This indicates an early cycle accumulation phase, which typically follows major bottoms. This phase historically offers favorable risk/reward for accumulation.";
      }
    } else {
      text += "Unfortunately, cycle position data is not available at the moment.";
    }
    
    return { text, visual };
  }
  
  // Generic response if none of the specific metrics were requested
  return {
    text: "I can provide detailed information about several on-chain metrics including MVRV ratio, NVT ratio, and market cycle position. Which metric would you like to learn more about?",
    visual: null
  };
}

/**
 * Handle metric analysis intent
 * @param {string} message - User message
 * @returns {Object} Response with text and visual
 */
function handleMetricAnalysis(message) {
  // Create visual component
  const visual = document.createElement('div');
  visual.className = 'rektbot-visual';
  
  // Detect if user asked about specific metrics
  const isMVRV = /mvrv|market.*value|realized.*value/i.test(message);
  const isNVT = /nvt|network.*value|transactions/i.test(message);
  const isCycle = /cycle|position|market.*cycle/i.test(message);
  
  // If specific metric requested, focus on that
  if (isMVRV || isNVT || isCycle) {
    return handleSpecificMetric(message, isMVRV, isNVT, isCycle);
  }
  
  // Otherwise show general metrics overview
  const metrics = state.latestOnChainMetrics;
  
  if (!metrics) {
    return {
      text: "On-chain metrics data isn't currently available. Please check the On-Chain Metrics section of the dashboard.",
      visual: null
    };
  }
  
  // Create a metrics grid
  visual.innerHTML = `
    <div style="margin-bottom: 10px;">
    <div style="display: flex; justify-content: space-between; align-items: center;">
        <h3 style="margin: 0; font-size: 1.1rem; color: var(--btc-orange);">On-Chain Health Indicators</h3>
        <span style="font-size: 0.8rem; opacity: 0.7;">Risk Level: ${metrics.riskLevel}</span>
      </div>
    </div>
    
    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
      <!-- MVRV Card -->
      <div class="metric-card">
        <div class="metric-title">MVRV Ratio</div>
        <div class="metric-value">${metrics.mvrv.value.toFixed(2)}</div>
        <div class="metric-details">
          <div class="${metrics.mvrv.change >= 0 ? 'positive' : 'negative'}">
            ${metrics.mvrv.change >= 0 ? '+' : ''}${metrics.mvrv.change.toFixed(2)}%
          </div>
          <div>Z-Score: ${metrics.mvrv.zScore.toFixed(2)}</div>
        </div>
      </div>
      
      <!-- NVT Card -->
      <div class="metric-card">
        <div class="metric-title">NVT Ratio</div>
        <div class="metric-value">${metrics.nvt.value.toFixed(2)}</div>
        <div class="metric-details">
          <div class="${metrics.nvt.change >= 0 ? 'positive' : 'negative'}">
            ${metrics.nvt.change >= 0 ? '+' : ''}${metrics.nvt.change.toFixed(2)}%
          </div>
          <div>Z-Score: ${metrics.nvt.zScore.toFixed(2)}</div>
        </div>
      </div>
      
      <!-- Volatility -->
      <div class="metric-card">
        <div class="metric-title">Volatility</div>
        <div class="metric-value">${(metrics.volatility.recent * 100).toFixed(2)}%</div>
        <div class="metric-details">
          <div class="${metrics.volatility.ratio < 1 ? 'positive' : 'negative'}">
            ${Math.round(Math.abs(metrics.volatility.ratio - 1) * 100)}% ${metrics.volatility.ratio < 1 ? 'below' : 'above'} avg
          </div>
        </div>
      </div>
      
      <!-- Cycle Position -->
      <div class="metric-card">
        <div class="metric-title">Market Cycle</div>
        <div class="metric-value">${(metrics.cyclePosition * 100).toFixed(0)}%</div>
        <div class="metric-details">
          <div style="width: 100%;">
            <div style="height: 4px; width: 100%; background: rgba(0,0,0,0.3); border-radius: 2px; overflow: hidden;">
              <div style="height: 100%; width: ${(metrics.cyclePosition * 100).toFixed(0)}%; background: linear-gradient(90deg, #34c759, #ffcc00, #ff3b30); border-radius: 2px;"></div>
            </div>
          </div>
        </div>
      </div>
    </div>
    
    <div style="font-size: 0.8rem; opacity: 0.7; margin-top: 10px; text-align: center;">
      On-chain metrics provide fundamental insights into Bitcoin network health
    </div>
  `;
  
  // Generate text response
  let text = `Current on-chain metrics show a ${metrics.riskLevel} risk profile. `;
  
  if (metrics.mvrv.value > 3) {
    text += `MVRV ratio is elevated at ${metrics.mvrv.value.toFixed(2)}, suggesting potential overvaluation. `;
  } else if (metrics.mvrv.value < 1) {
    text += `MVRV ratio is below 1 at ${metrics.mvrv.value.toFixed(2)}, historically a value accumulation zone. `;
  }
  
  if (metrics.cyclePosition > 0.8) {
    text += `Market cycle indicators suggest we're in a late-cycle position (${(metrics.cyclePosition * 100).toFixed(0)}%). `;
  } else if (metrics.cyclePosition < 0.3) {
    text += `Market cycle indicators suggest we're in an early-cycle position (${(metrics.cyclePosition * 100).toFixed(0)}%). `;
  }
  
  return { text, visual };
}

/**
 * Handle market prediction intent
 * @param {string} message - User message
 * @param {number} sentiment - Message sentiment
 * @param {Object} processedMessage - Processed message with entities
 * @returns {Object} Response with text and visual
 */
function handleMarketPrediction(message, sentiment, processedMessage) {
  // Extract timeframe from processed entities
  const timeframeEntity = processedMessage.entities.timeframe;
  let timeframe = 30; // Default to 30 days
  
  if (timeframeEntity) {
    timeframe = timeframeEntity.value;
  } else if (/week/i.test(message)) {
    timeframe = 7;
  } else if (/month/i.test(message)) {
    timeframe = 30;
  } else if (/quarter/i.test(message)) {
    timeframe = 90;
  } else if (/year/i.test(message)) {
    timeframe = 365;
  }
  
  // Create visual component
  const visual = document.createElement('div');
  visual.className = 'rektbot-visual';
  
  // Create chart container
  const chartContainer = document.createElement('div');
  chartContainer.className = 'market-analysis-chart';
  visual.appendChild(chartContainer);
  
// Get current risk levels for all months
const allMonthsRisk = state.riskByMonth[timeframe];
const monthEntity = processedMessage.entities.month;
const currentMonth = monthEntity ? monthEntity.index + 1 : new Date().getMonth() + 1;
  
  // Create chart data
  const chartData = {
    labels: monthNames,
    datasets: [
      {
        label: `${timeframe}-Day Crash Risk (%)`,
        data: Array.from({length: 12}, (_, i) => {
          const monthRisk = allMonthsRisk[i + 1];
          if (typeof monthRisk === 'object') {
            return (monthRisk.risk * 100).toFixed(1);
          } else {
            return (monthRisk * 100).toFixed(1);
          }
        }),
        backgroundColor: 'rgba(255, 159, 64, 0.4)',
        borderColor: 'rgba(255, 159, 64, 1)',
        pointBackgroundColor: Array.from({length: 12}, (_, i) => i === currentMonth - 1 ? '#ff3b30' : 'rgba(255, 159, 64, 1)'),
        pointRadius: Array.from({length: 12}, (_, i) => i === currentMonth - 1 ? 6 : 4),
        pointHoverRadius: Array.from({length: 12}, (_, i) => i === currentMonth - 1 ? 8 : 6)
      }
    ]
  };
  
  // Add credible intervals if available
  const hasIntervals = typeof allMonthsRisk[1] === 'object' && allMonthsRisk[1].lower !== undefined;
  
  if (hasIntervals) {
    chartData.datasets.push({
      label: 'Lower Bound (95% CI)',
      data: Array.from({length: 12}, (_, i) => (allMonthsRisk[i + 1].lower * 100).toFixed(1)),
      borderColor: 'rgba(255, 159, 64, 0.3)',
      backgroundColor: 'transparent',
      borderDash: [5, 5],
      pointRadius: 0,
      fill: false
    });
    
    chartData.datasets.push({
      label: 'Upper Bound (95% CI)',
      data: Array.from({length: 12}, (_, i) => (allMonthsRisk[i + 1].upper * 100).toFixed(1)),
      borderColor: 'rgba(255, 159, 64, 0.3)',
      backgroundColor: 'transparent',
      borderDash: [5, 5],
      pointRadius: 0,
      fill: '-1'
    });
  }
  
  // Define chart config
  const chartConfig = {
    type: 'line',
    data: chartData,
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        y: {
          beginAtZero: true,
          max: 100,
          title: {
            display: true,
            text: 'Crash Probability (%)'
          }
        }
      },
      plugins: {
        tooltip: {
          callbacks: {
            title: function(tooltipItems) {
              return tooltipItems[0].label;
            },
            label: function(context) {
              return `${context.dataset.label}: ${context.formattedValue}%`;
            }
          }
        }
      }
    }
  };
  
  // Create chart using our safe chart function with a delay
setTimeout(async () => {
  await createSafeChart(chartContainer, 'market-prediction', chartConfig);
}, 200);
  
  // Add timeframe controls
  const controls = document.createElement('div');
  controls.className = 'timeframe-controls';
  controls.innerHTML = `
    <button data-timeframe="7">7d</button>
    <button data-timeframe="30" class="${timeframe === 30 ? 'active' : ''}">30d</button>
    <button data-timeframe="90" class="${timeframe === 90 ? 'active' : ''}">90d</button>
  `;
  
  visual.appendChild(controls);
  
// Add event listeners for timeframe controls
setTimeout(() => {
  const timeframeButtons = controls.querySelectorAll('button');
  timeframeButtons.forEach(button => {
    button.addEventListener('click', async () => {  // Added async here
      const newTimeframe = parseInt(button.dataset.timeframe);
      
      // Update active state
      timeframeButtons.forEach(btn => btn.classList.remove('active'));
      button.classList.add('active');
      
      // Generate new message for the selected timeframe
      const newMessage = `predict risk for next ${newTimeframe} days`;
      const newResponse = handleMarketPrediction(newMessage);
      
      // Replace the current visual with the new one
      const parent = visual.parentNode;
      if (parent && newResponse.visual) {
        parent.replaceChild(newResponse.visual, visual);
        
        // Re-run chart creation
        const chartContainers = newResponse.visual.querySelectorAll('.market-analysis-chart');
        if (chartContainers.length > 0) {
          // Wait a moment for DOM updates to complete
          await new Promise(resolve => setTimeout(resolve, 100));
          
          for (const container of chartContainers) {
            // You'll need to recreate the chart config here
            const chartConfig = {
              type: 'line',
              data: {
                labels: newResponse.chartData?.labels || [],
                datasets: newResponse.chartData?.datasets || []
              },
              options: newResponse.chartOptions || {
                responsive: true,
                maintainAspectRatio: false
              }
            };
            
            await createSafeChart(container, 'market-prediction', chartConfig);
          }
        }
      }
    });
  });
}, 200);
  
  // Add contextual insights section
  const insightsContainer = document.createElement('div');
  insightsContainer.className = 'prediction-insights';
  insightsContainer.style.marginTop = '20px';
  insightsContainer.style.backgroundColor = 'rgba(30, 30, 30, 0.7)';
  insightsContainer.style.padding = '15px';
  insightsContainer.style.borderRadius = '8px';
  
  // Get current risk info
  const currentRisk = allMonthsRisk[currentMonth];
  const currentRiskValue = typeof currentRisk === 'object' ? currentRisk.risk : currentRisk;
  const currentRiskPercent = (currentRiskValue * 100).toFixed(1);
  
  // Get next month risk info
  const nextMonthIndex = (currentMonth % 12) + 1;
  const nextMonthRisk = allMonthsRisk[nextMonthIndex];
  const nextMonthRiskValue = typeof nextMonthRisk === 'object' ? nextMonthRisk.risk : nextMonthRisk;
  const nextMonthRiskPercent = (nextMonthRiskValue * 100).toFixed(1);
  
  // Calculate change and trend
  const riskChange = (nextMonthRiskValue - currentRiskValue) * 100;
  const riskChangeFormatted = riskChange.toFixed(1);
  const riskTrend = riskChange >= 1 ? 'increasing' : riskChange <= -1 ? 'decreasing' : 'stable';
  
  // Get market phase from knowledge graph
  const metrics = state.latestOnChainMetrics || {};
  const cyclePosition = metrics.cyclePosition || 0.5;
  const marketPhase = knowledgeGraph.getMarketPhase(cyclePosition);
  
  // Get seasonality info
  const historicalHighMonth = getHighestRiskMonth(allMonthsRisk);
  const historicalLowMonth = getLowestRiskMonth(allMonthsRisk);
  
  insightsContainer.innerHTML = `
    <h3 style="margin: 0 0 10px 0; font-size: 1.1rem; color: var(--btc-orange);">Risk Forecast Insights</h3>
    
    <div style="margin-bottom: 15px;">
      <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
        <div style="font-weight: bold;">Current (${monthNames[currentMonth-1]}):</div>
        <div>${currentRiskPercent}% Crash Probability</div>
      </div>
      <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
        <div style="font-weight: bold;">Next Month (${monthNames[nextMonthIndex-1]}):</div>
        <div>${nextMonthRiskPercent}% (${riskChangeFormatted}% ${riskTrend})</div>
      </div>
      <div style="display: flex; justify-content: space-between;">
        <div style="font-weight: bold;">Market Phase:</div>
        <div>${marketPhase.replace(/_/g, ' ')} (${(cyclePosition * 100).toFixed(0)}%)</div>
      </div>
    </div>
    
    <div style="margin-bottom: 15px;">
      <div style="font-weight: bold; margin-bottom: 8px; color: var(--btc-orange);">Seasonal Patterns:</div>
      <div style="font-size: 0.9rem; margin-bottom: 5px;">
        • Historically highest risk: <strong>${monthNames[historicalHighMonth.month-1]}</strong> (${historicalHighMonth.risk.toFixed(1)}%)
      </div>
      <div style="font-size: 0.9rem;">
        • Historically lowest risk: <strong>${monthNames[historicalLowMonth.month-1]}</strong> (${historicalLowMonth.risk.toFixed(1)}%)
      </div>
    </div>
    
    <div>
      <div style="font-weight: bold; margin-bottom: 8px; color: var(--btc-orange);">Key Drivers:</div>
      <div style="font-size: 0.9rem; margin-bottom: 5px;">
        • ${getKeyRiskDriver(metrics, cyclePosition, 1)}
      </div>
      <div style="font-size: 0.9rem; margin-bottom: 5px;">
        • ${getKeyRiskDriver(metrics, cyclePosition, 2)}
      </div>
      <div style="font-size: 0.9rem;">
        • ${getKeyRiskDriver(metrics, cyclePosition, 3)}
      </div>
    </div>
  `;
  
  visual.appendChild(insightsContainer);
  
  // Generate text response
  let text = `For the next ${timeframe} days, the current crash probability is ${currentRiskPercent}%. `;
  
  if (nextMonthRiskValue > currentRiskValue * 1.2) {
    text += `Looking ahead, ${monthNames[nextMonthIndex - 1]} shows a significantly higher risk level at ${nextMonthRiskPercent}% (${riskChangeFormatted}% increase). `;
  } else if (nextMonthRiskValue < currentRiskValue * 0.8) {
    text += `Looking ahead, ${monthNames[nextMonthIndex - 1]} shows a notably lower risk level at ${nextMonthRiskPercent}% (${Math.abs(riskChangeFormatted)}% decrease). `;
  } else {
    text += `Looking ahead, ${monthNames[nextMonthIndex - 1]} shows a similar risk level at ${nextMonthRiskPercent}% (${riskTrend}). `;
  }
  
  text += `The market is currently in a ${marketPhase.replace(/_/g, ' ')} phase at ${(cyclePosition * 100).toFixed(0)}% of the cycle position. `;
  
  text += `Key drivers include ${getKeyRiskDriver(metrics, cyclePosition, 1).toLowerCase()}`;
  
  return { text, visual };
}

/**
 * Find the month with the highest historical risk
 * @param {Object} riskByMonth - Risk data by month
 * @returns {Object} Month with highest risk
 */
function getHighestRiskMonth(riskByMonth) {
  let highestRisk = 0;
  let highestMonth = 1;
  
  for (let month = 1; month <= 12; month++) {
    const monthRisk = riskByMonth[month];
    const riskValue = typeof monthRisk === 'object' ? monthRisk.risk : monthRisk;
    
    if (riskValue > highestRisk) {
      highestRisk = riskValue;
      highestMonth = month;
    }
  }
  
  return { month: highestMonth, risk: highestRisk * 100 };
}

/**
 * Find the month with the lowest historical risk
 * @param {Object} riskByMonth - Risk data by month
 * @returns {Object} Month with lowest risk
 */
function getLowestRiskMonth(riskByMonth) {
  let lowestRisk = 1;
  let lowestMonth = 1;
  
  for (let month = 1; month <= 12; month++) {
    const monthRisk = riskByMonth[month];
    const riskValue = typeof monthRisk === 'object' ? monthRisk.risk : monthRisk;
    
    if (riskValue < lowestRisk) {
      lowestRisk = riskValue;
      lowestMonth = month;
    }
  }
  
  return { month: lowestMonth, risk: lowestRisk * 100 };
}

/**
 * Get key risk drivers based on knowledge graph and current metrics
 * @param {Object} metrics - Current metrics
 * @param {number} cyclePosition - Current cycle position
 * @param {number} driverIndex - Index of driver to get (1-based)
 * @returns {string} Key risk driver description
 */
function getKeyRiskDriver(metrics, cyclePosition, driverIndex) {
  // Get influencing factors from knowledge graph
  const influencingFactors = knowledgeGraph.getInfluencingFactors('crash_risk');
  const drivers = [];
  
  if (!influencingFactors || influencingFactors.length === 0) {
    // Fallback to simple hardcoded logic if knowledge graph data is not available
    if (metrics.mvrv && metrics.mvrv.value > 2.5) {
      drivers.push(`Elevated MVRV ratio (${metrics.mvrv.value.toFixed(2)}) suggesting market overvaluation`);
    }
    
    if (metrics.mvrv && metrics.mvrv.value < 1) {
      drivers.push(`Low MVRV ratio (${metrics.mvrv.value.toFixed(2)}) indicating potential undervaluation`);
    }
    
    if (metrics.nvt && metrics.nvt.value > 55) {
      drivers.push(`High NVT ratio (${metrics.nvt.value.toFixed(2)}) showing potential price/utility disconnect`);
    }
    
    if (metrics.nvt && metrics.nvt.value < 30) {
      drivers.push(`Low NVT ratio (${metrics.nvt.value.toFixed(2)}) suggesting strong network fundamentals`);
    }
    
    if (cyclePosition > 0.75) {
      drivers.push(`Late-cycle positioning (${(cyclePosition * 100).toFixed(0)}%) historically associated with increased fragility`);
    }
    
    if (cyclePosition < 0.25) {
      drivers.push(`Early-cycle positioning (${(cyclePosition * 100).toFixed(0)}%) with typically strong risk/reward characteristics`);
    }
    
    // Seasonal factors
    const currentMonth = new Date().getMonth();
    if ([8, 9, 10].includes(currentMonth)) { // September, October, November
      drivers.push("Seasonal weakness during fall months based on historical patterns");
    }
    
    if ([3, 4, 5].includes(currentMonth)) { // April, May, June
      drivers.push("Seasonally strong period during spring months based on historical patterns");
    }
  } else {
    // Process each influencing factor
    influencingFactors.forEach(factor => {
      const factorName = factor.factor;
      const factorEntity = knowledgeGraph.getEntity(factorName);
      
      // Skip if entity not found
      if (!factorEntity) return;
      
      // Get current value of this factor from metrics
      let currentValue = null;
      let factorContribution = "moderate";
      
      switch(factorName) {
        case 'MVRV_Ratio':
          if (!metrics.mvrv) return;
          currentValue = metrics.mvrv.value;
          
          // Use interpretation from knowledge graph to determine contribution
          if (factorEntity.interpretation) {
            if (currentValue > 3.5 && factorEntity.interpretation.above_3_5) {
              factorContribution = "significantly increasing";
            } else if (currentValue > 2.5 && factorEntity.interpretation.above_2_5) {
              factorContribution = "increasing";
            } else if (currentValue < 1 && factorEntity.interpretation.below_1) {
              factorContribution = "reducing";
            }
          }
          
          drivers.push(`${currentValue > 2.5 ? 'Elevated' : currentValue < 1 ? 'Low' : 'Moderate'} MVRV ratio (${currentValue.toFixed(2)}) ${factorContribution} crash risk`);
          break;
          
        case 'NVT_Ratio':
          if (!metrics.nvt) return;
          currentValue = metrics.nvt.value;
          
          if (factorEntity.interpretation) {
            if (currentValue > 65 && factorEntity.interpretation.above_65) {
              factorContribution = "significantly increasing";
            } else if (currentValue > 45 && factorEntity.interpretation.above_45) {
              factorContribution = "increasing";
            } else if (currentValue < 30 && factorEntity.interpretation.below_30) {
              factorContribution = "reducing";
            }
          }
          
          drivers.push(`${currentValue > 55 ? 'Elevated' : currentValue < 30 ? 'Low' : 'Moderate'} NVT ratio (${currentValue.toFixed(2)}) ${factorContribution} crash risk`);
          break;
          
        case 'market_cycle_position':
          if (cyclePosition === undefined) return;
          currentValue = cyclePosition;
          
          if (factorEntity.interpretation) {
            if (currentValue > 0.8 && factorEntity.interpretation.range_80_100) {
              factorContribution = "significantly increasing";
            } else if (currentValue > 0.6 && factorEntity.interpretation.range_60_80) {
              factorContribution = "increasing";
            } else if (currentValue < 0.2 && factorEntity.interpretation.range_0_20) {
              factorContribution = "reducing";
            }
          }
          
          drivers.push(`${currentValue > 0.75 ? 'Late' : currentValue < 0.25 ? 'Early' : 'Mid'}-cycle positioning (${(currentValue * 100).toFixed(0)}%) ${factorContribution} crash risk`);
          break;
          
        case 'Volatility':
          if (!metrics.volatility) return;
          currentValue = metrics.volatility.recent;
          
          drivers.push(`${currentValue > 0.05 ? 'Elevated' : currentValue < 0.02 ? 'Low' : 'Moderate'} volatility (${(currentValue * 100).toFixed(2)}%) affecting market stability`);
          break;
          
        case 'seasonal_pattern':
          const currentMonth = new Date().getMonth();
          const monthCrashFrequency = getMonthCrashFrequency(currentMonth + 1);
          const monthName = monthNames[currentMonth];
          
          drivers.push(`${monthName} has ${monthCrashFrequency} historical crash frequency`);
          break;
      }
    });
  }
  
  // Add generic drivers if we don't have enough
  if (drivers.length < 3) {
    drivers.push("Multiple on-chain metric interactions affecting overall market dynamics");
    drivers.push("Current market structure and technical indicators influencing risk assessment");
    drivers.push("Derivative market conditions and leverage levels affecting potential volatility");
  }
  
  // Sort drivers by importance (based on factors' strength)
  if (influencingFactors && influencingFactors.length > 0) {
    const sortedFactors = [...influencingFactors].sort((a, b) => b.strength - a.strength);
    const sortedDrivers = [];
    
    // Reorganize drivers based on factor strength
    sortedFactors.forEach(factor => {
      const matchingDriver = drivers.find(d => d.toLowerCase().includes(factor.factor.toLowerCase()));
      if (matchingDriver) {
        sortedDrivers.push(matchingDriver);
      }
    });
    
    // Add any remaining drivers
    drivers.forEach(driver => {
      if (!sortedDrivers.includes(driver)) {
        sortedDrivers.push(driver);
      }
    });
    
    // Replace original drivers with sorted ones
    drivers.length = 0;
    drivers.push(...sortedDrivers);
  }
  
  // Return requested driver or a default
  return drivers[driverIndex - 1] || "Multiple factors affecting overall market dynamics";
}

/**
 * Handle scenario simulation intent
 * @param {string} message - User message
 * @param {number} sentiment - Message sentiment
 * @param {Object} processedMessage - Processed message with entities
 * @returns {Object} Response with text and visual
 */
function handleScenarioSimulation(message, sentiment, processedMessage) {
  // Extract parameters using processed entities
  const percentEntity = processedMessage.entities.percentage;
  const percent = percentEntity ? percentEntity.raw : 20;
  
  // Determine if it's up or down using NLU or regex
  const isDown = /drop|crash|fall|down|decrease|decline/i.test(message);
  const direction = isDown ? 'drops' : 'rises';
  const signedPercent = isDown ? -percent : percent;
  
  // Create visual component
  const visual = document.createElement('div');
  visual.className = 'rektbot-visual';
  
  // Create container for chart
  const chartContainer = document.createElement('div');
  chartContainer.className = 'scenario-simulation';
  visual.appendChild(chartContainer);
  
  // Get current price and metrics
  const currentPrice = state.bitcoinData[state.bitcoinData.length - 1].price;
  const metrics = state.latestOnChainMetrics || {};
  const cyclePosition = metrics.cyclePosition || 0.5;
  
  // Create scenario data (14 days)
  const days = 14;
  const labels = Array.from({length: days + 1}, (_, i) => `Day ${i}`);
  const baselineData = Array(days + 1).fill(currentPrice);
  
  // Create scenario data with the specified change
  const scenarioData = [...baselineData];
  
  // Apply scenario change with an exponential curve for more realism
  for (let i = 1; i <= days; i++) {
    // Exponential curve for faster change at beginning, slower at end
    const changeRatio = 1 - Math.exp(-i / (days / 3));
    scenarioData[i] = currentPrice * (1 + (signedPercent / 100) * changeRatio);
  }
  
  // Add possible secondary move (for realism)
  const secondaryData = [...scenarioData];
  if (isDown) {
    // For downward moves, add a relief bounce after the low
    for (let i = Math.floor(days * 0.6); i <= days; i++) {
      const bounceRatio = (i - Math.floor(days * 0.6)) / (days - Math.floor(days * 0.6));
      const bouncePercent = Math.min(10, percent * 0.25); // Bounce up to 10% or 25% of the drop
      secondaryData[i] = scenarioData[i] * (1 + (bouncePercent / 100) * bounceRatio);
    }
  } else {
    // For upward moves, add a small pullback after the rise
    for (let i = Math.floor(days * 0.7); i <= days; i++) {
      const pullbackRatio = (i - Math.floor(days * 0.7)) / (days - Math.floor(days * 0.7));
      const pullbackPercent = Math.min(7, percent * 0.2); // Pull back up to 7% or 20% of the rise
      secondaryData[i] = scenarioData[i] * (1 - (pullbackPercent / 100) * pullbackRatio);
    }
  }
  
  // Set up chart configuration
  const chartConfig = {
    type: 'line',
    data: {
      labels: labels,
      datasets: [
        {
          label: 'Current Trajectory',
          data: baselineData,
          borderColor: '#777777',
          borderDash: [5, 5],
          fill: false
        },
        {
          label: `Primary ${direction === 'drops' ? 'Crash' : 'Rally'} Scenario (${percent}%)`,
          data: scenarioData,
          borderColor: direction === 'drops' ? '#ff3b30' : '#4bb543',
          backgroundColor: 'rgba(0, 0, 0, 0)', // No fill for this line
          borderWidth: 2,
          fill: false
        },
        {
          label: `${direction === 'drops' ? 'Relief Bounce' : 'Pullback'} Scenario`,
          data: secondaryData,
          borderColor: direction === 'drops' ? '#ff9500' : '#ffcc00',
          backgroundColor: direction === 'drops' ? 'rgba(255, 59, 48, 0.1)' : 'rgba(75, 181, 67, 0.1)',
          borderWidth: 2,
          fill: true
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        mode: 'index',
        intersect: false
      },
      scales: {
        y: {
          title: {
            display: true,
            text: 'Price (USD)'
          },
          ticks: {
            callback: function(value) {
              return '$' + value.toLocaleString();
            }
          }
        }
      }
    }
  };
  
  // Create chart using our safe chart function with a delay
setTimeout(async () => {
  await createSafeChart(chartContainer, 'scenario', chartConfig);
}, 200);

  
  // Calculate risk change based on scenario
  // More sophisticated model using knowledge graph and metrics
  let riskAdjustment = 0;
  
  if (isDown) {
    // For downward moves:
    // - Larger moves have diminishing risk reduction (saturation curve)
    // - Early cycle positions react differently than late cycle
    const baseDrop = 0.15; // Base risk adjustment for a standard 20% drop
    
    // Scale with percent but with diminishing returns
    const percentScaling = Math.log(1 + percent/20) / Math.log(2);
    
    // Different impact based on cycle position
    const cycleImpact = cyclePosition > 0.7 ? 1.5 : // Late cycle: drops reset more risk
                       cyclePosition > 0.4 ? 1.0 : // Mid cycle: standard impact
                       0.7;  // Early cycle: less impact since risk already lower
    
    riskAdjustment = -baseDrop * percentScaling * cycleImpact;
  } else {
    // For upward moves:
    // - Larger moves increase risk (linear with saturation)
    // - Late cycle moves increase risk more than early cycle
    const baseRise = 0.1; // Base risk adjustment for a standard 20% rise
    
    // Scale with percent (more linear than drops)
    const percentScaling = Math.min(3, percent/20);
    
    // Different impact based on cycle position
    const cycleImpact = cyclePosition > 0.7 ? 2.0 : // Late cycle: rises increase risk a lot
                       cyclePosition > 0.4 ? 1.5 : // Mid cycle: moderate increase
                       1.0;  // Early cycle: standard impact
    
    riskAdjustment = baseRise * percentScaling * cycleImpact;
  }
  
    // Calculate risk change based on scenario
    const monthEntity = processedMessage.entities.month;
    const currentMonth = monthEntity ? monthEntity.index + 1 : new Date().getMonth() + 1;
    const currentRisk = state.riskByMonth[30][currentMonth];
  const currentRiskValue = typeof currentRisk === 'object' ? currentRisk.risk : currentRisk;
  const adjustedRisk = Math.max(0.05, Math.min(0.95, currentRiskValue + riskAdjustment));
  
  // Create risk impact section
  const riskImpactSection = document.createElement('div');
  riskImpactSection.className = 'risk-impact-section';
  riskImpactSection.style.marginTop = '20px';
  riskImpactSection.style.backgroundColor = 'rgba(30, 30, 30, 0.7)';
  riskImpactSection.style.padding = '15px';
  riskImpactSection.style.borderRadius = '8px';
  
  // Calculate market impact points
  const impactPoints = [];
  
  // Metrics impact
  if (isDown) {
    // For downward moves
    impactPoints.push({
      metric: 'MVRV Ratio',
      current: metrics.mvrv ? metrics.mvrv.value.toFixed(2) : '~2.5',
      new: metrics.mvrv ? (metrics.mvrv.value * (1 + signedPercent/100)).toFixed(2) : '~2.0',
      impact: 'Reduced market premium relative to realized value'
    });
    
    // Increased volatility
    impactPoints.push({
      metric: 'Volatility',
      current: metrics.volatility ? (metrics.volatility.recent * 100).toFixed(2) + '%' : '~4%',
      new: metrics.volatility ? ((metrics.volatility.recent * 1.5) * 100).toFixed(2) + '%' : '~6%',
      impact: 'Sharp price movement would increase short-term volatility'
    });
    
    // Potential cascade effect if large enough
    if (percent >= 25) {
      impactPoints.push({
        metric: 'Liquidation Risk',
        current: 'Moderate',
        new: 'High',
        impact: 'Large drops may trigger cascading liquidations in leveraged markets'
      });
    }
  } else {
    // For upward moves
    impactPoints.push({
      metric: 'MVRV Ratio',
      current: metrics.mvrv ? metrics.mvrv.value.toFixed(2) : '~2.5',
      new: metrics.mvrv ? (metrics.mvrv.value * (1 + signedPercent/100)).toFixed(2) : '~3.0',
      impact: 'Increased market premium relative to realized value'
    });
    
    // Funding rates impact
    impactPoints.push({
      metric: 'Funding Rates',
      current: 'Neutral',
      new: 'Positive',
      impact: 'Rapid rise would likely increase funding rates, signaling bullish leverage'
    });
    
    // FOMO potential
    if (percent >= 20) {
      impactPoints.push({
        metric: 'Market Sentiment',
        current: 'Neutral/Cautious',
        new: 'Increasingly Bullish',
        impact: 'Sharp rises often lead to FOMO behavior and increased speculation'
      });
    }
  }
  
  // Always include cycle position
  impactPoints.push({
    metric: 'Cycle Position',
    current: `${(cyclePosition * 100).toFixed(0)}%`,
    new: `${(cyclePosition * 100).toFixed(0)}%`,
    impact: `Unchanged, but ${isDown ? 'drops' : 'rises'} at ${cyclePosition > 0.7 ? 'late' : cyclePosition > 0.4 ? 'mid' : 'early'} cycle position have different implications`
  });
  
  riskImpactSection.innerHTML = `
    <h3 style="margin: 0 0 10px 0; font-size: 1.1rem; color: var(--btc-orange);">Scenario Impact Analysis</h3>
    
    <div style="margin-bottom: 15px;">
      <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
        <div style="font-weight: bold;">Current Price:</div>
        <div>$${currentPrice.toLocaleString()}</div>
      </div>
      <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
        <div style="font-weight: bold;">Scenario Price:</div>
        <div>$${(currentPrice * (1 + signedPercent/100)).toLocaleString()}</div>
      </div>
      <div style="display: flex; justify-content: space-between; margin-bottom: 8px; ${riskAdjustment > 0 ? 'color: #ff3b30;' : 'color: #34c759;'}">
        <div style="font-weight: bold;">Risk Impact:</div>
        <div>${(currentRiskValue * 100).toFixed(1)}% → ${(adjustedRisk * 100).toFixed(1)}% (${riskAdjustment > 0 ? '+' : ''}${(riskAdjustment * 100).toFixed(1)}%)</div>
      </div>
    </div>
    
    <div style="margin-bottom: 10px; font-weight: bold; color: var(--btc-orange);">Market Metrics Impact:</div>
    <table style="width: 100%; border-collapse: collapse; margin-bottom: 15px;">
      <tr style="border-bottom: 1px solid rgba(255,255,255,0.1);">
        <th style="text-align: left; padding: 5px 0; font-size: 0.9rem;">Metric</th>
        <th style="text-align: center; padding: 5px 0; font-size: 0.9rem;">Current</th>
        <th style="text-align: center; padding: 5px 0; font-size: 0.9rem;">Projected</th>
      </tr>
      ${impactPoints.map(point => `
        <tr style="border-bottom: 1px solid rgba(255,255,255,0.05);">
          <td style="padding: 8px 0; font-size: 0.9rem;">${point.metric}</td>
          <td style="text-align: center; padding: 8px 0; font-size: 0.9rem;">${point.current}</td>
          <td style="text-align: center; padding: 8px 0; font-size: 0.9rem;">${point.new}</td>
        </tr>
      `).join('')}
    </table>
    
    <div style="margin-bottom: 10px; font-weight: bold; color: var(--btc-orange);">Key Implications:</div>
    <ul style="margin: 0; padding-left: 20px; font-size: 0.9rem;">
      ${impactPoints.map(point => `<li style="margin-bottom: 5px;">${point.impact}</li>`).join('')}
    </ul>
  `;
  
  visual.appendChild(riskImpactSection);
  
  // Add controls for interactive simulation
  const controls = document.createElement('div');
  controls.className = 'scenario-controls';
  controls.innerHTML = `
    <div style="display: flex; justify-content: space-between; margin-top: 10px;">
      <div>
        <label for="percent-input">Percent Change: </label>
        <input type="number" id="percent-input" value="${percent}" min="1" max="90" style="width: 60px;">
      </div>
      <div>
        <label for="direction-select">Direction: </label>
        <select id="direction-select">
          <option value="up" ${!isDown ? 'selected' : ''}>Up</option>
          <option value="down" ${isDown ? 'selected' : ''}>Down</option>
        </select>
      </div>
      <button id="update-scenario">Update</button>
    </div>
  `;
  
  visual.appendChild(controls);
  
 // Add event listener for update button
setTimeout(() => {
  const updateButton = visual.querySelector('#update-scenario');
  if (updateButton) {
    updateButton.addEventListener('click', async () => {  // Added async here
      const percentInput = visual.querySelector('#percent-input');
      const directionSelect = visual.querySelector('#direction-select');
      
      if (percentInput && directionSelect) {
        const newPercent = parseInt(percentInput.value) || 20;
        const newDirection = directionSelect.value === 'down';
        
        // Generate a new scenario response
        const newMessage = `what if bitcoin ${newDirection ? 'drops' : 'rises'} by ${newPercent}%`;
        const processedMsg = {
          entities: {
            percentage: {
              raw: newPercent
            }
          }
        };
        const newResponse = handleScenarioSimulation(newMessage, 0, processedMsg);
        
        // Replace the current visual with the new one
        if (newResponse.visual) {
          const parent = visual.parentNode;
          if (parent) {
            parent.replaceChild(newResponse.visual, visual);
            
            // Re-run chart creation after DOM update
            const chartContainers = newResponse.visual.querySelectorAll('.scenario-simulation');
            if (chartContainers.length > 0) {
              for (const container of chartContainers) {
                // Wait a moment for DOM updates to complete
                await new Promise(resolve => setTimeout(resolve, 100));
                
                // Get current price from state
                const currentPrice = state.bitcoinData[state.bitcoinData.length - 1].price;
                
                // Create chart config with proper parameters
                const chartConfig = getScenarioChartConfig(currentPrice, newPercent, newDirection);
                  await createSafeChart(container, 'scenario', chartConfig);
                
              }
            }
          }
        }
      }
    });  // Fixed closing brace for event listener
  }     // Fixed closing brace for if (updateButton)
}, 200);
  
  // Generate text response using enhanced knowledge
  let text = `If Bitcoin ${direction} by ${percent}%, `;
  
  if (isDown) {
    if (percent > 30) {
      text += `this would represent a major correction. `;
      
      if (cyclePosition > 0.7) {
        text += `Such significant drops during late-cycle phases (${(cyclePosition * 100).toFixed(0)}%) often signal potential trend reversals. `;
      } else {
        text += `Even at the current ${(cyclePosition * 100).toFixed(0)}% cycle position, a drop of this magnitude would represent a significant deviation from the prevailing trend. `;
      }
    } else if (percent > 15) {
      text += `this would be a significant pullback. `;
      
      if (cyclePosition > 0.6) {
        text += `At the current ${(cyclePosition * 100).toFixed(0)}% cycle position, pullbacks of this size are not uncommon but warrant caution. `;
      } else {
        text += `At the current ${(cyclePosition * 100).toFixed(0)}% cycle position, such pullbacks are typically viewed as healthy corrections within an uptrend. `;
      }
    } else {
      text += `this would be a moderate dip. `;
      text += `Such moves are common throughout all market cycles and typically represent noise rather than significant trend changes. `;
    }
    
    text += `The crash probability would likely decrease to around ${(adjustedRisk * 100).toFixed(1)}% (from ${(currentRiskValue * 100).toFixed(1)}%) as some market excess would be cleared.`;
  } else {
    if (percent > 30) {
      text += `this would be a substantial rally. `;
      
      if (cyclePosition > 0.7) {
        text += `Such powerful moves during late-cycle phases (${(cyclePosition * 100).toFixed(0)}%) often represent euphoric price action that increases systemic risk. `;
      } else {
        text += `At the current ${(cyclePosition * 100).toFixed(0)}% cycle position, rapid appreciation of this magnitude could accelerate the cycle progression. `;
      }
    } else if (percent > 15) {
      text += `this would be a significant move up. `;
      
      if (metrics.mvrv && metrics.mvrv.value > 2.5) {
        text += `Combined with the current elevated MVRV ratio of ${metrics.mvrv.value.toFixed(2)}, this would push valuation metrics into concerning territory. `;
      } else {
        text += `This would represent normal bull market behavior, especially if supported by improving on-chain metrics. `;
      }
    } else {
      text += `this would be a moderate upward move. `;
      text += `Such moves are common throughout all market cycles and could represent the beginning of a stronger trend or simple volatility. `;
    }
    
    text += `The crash probability would likely increase to around ${(adjustedRisk * 100).toFixed(1)}% (from ${(currentRiskValue * 100).toFixed(1)}%) due to increased market froth.`;
  }
  
  return { text, visual };
}

/**
 * Get scenario chart configuration
 * @param {number} currentPrice - Current BTC price
 * @param {number} percent - Percentage change
 * @param {boolean} isDown - Whether the scenario is a downward move
 * @returns {Object} Chart configuration
 */
function getScenarioChartConfig(currentPrice, percent, isDown) {
  const signedPercent = isDown ? -percent : percent;
  
  // Create scenario data (14 days)
  const days = 14;
  const labels = Array.from({length: days + 1}, (_, i) => `Day ${i}`);
  const baselineData = Array(days + 1).fill(currentPrice);
  
  // Create scenario data with the specified change
  const scenarioData = [...baselineData];
  
  // Apply scenario change with an exponential curve for more realism
  for (let i = 1; i <= days; i++) {
    // Exponential curve for faster change at beginning, slower at end
    const changeRatio = 1 - Math.exp(-i / (days / 3));
    scenarioData[i] = currentPrice * (1 + (signedPercent / 100) * changeRatio);
  }
  
  // Add possible secondary move (for realism)
  const secondaryData = [...scenarioData];
  if (isDown) {
    // For downward moves, add a relief bounce after the low
    for (let i = Math.floor(days * 0.6); i <= days; i++) {
      const bounceRatio = (i - Math.floor(days * 0.6)) / (days - Math.floor(days * 0.6));
      const bouncePercent = Math.min(10, percent * 0.25); // Bounce up to 10% or 25% of the drop
      secondaryData[i] = scenarioData[i] * (1 + (bouncePercent / 100) * bounceRatio);
    }
  } else {
    // For upward moves, add a small pullback after the rise
    for (let i = Math.floor(days * 0.7); i <= days; i++) {
      const pullbackRatio = (i - Math.floor(days * 0.7)) / (days - Math.floor(days * 0.7));
      const pullbackPercent = Math.min(7, percent * 0.2); // Pull back up to 7% or 20% of the rise
      secondaryData[i] = scenarioData[i] * (1 - (pullbackPercent / 100) * pullbackRatio);
    }
  }
  
  return {
    type: 'line',
    data: {
      labels: labels,
      datasets: [
        {
          label: 'Current Trajectory',
          data: baselineData,
          borderColor: '#777777',
          borderDash: [5, 5],
          fill: false
        },
        {
          label: `Primary ${isDown ? 'Crash' : 'Rally'} Scenario (${percent}%)`,
          data: scenarioData,
          borderColor: isDown ? '#ff3b30' : '#4bb543',
          backgroundColor: 'rgba(0, 0, 0, 0)', // No fill for this line
          borderWidth: 2,
          fill: false
        },
        {
          label: `${isDown ? 'Relief Bounce' : 'Pullback'} Scenario`,
          data: secondaryData,
          borderColor: isDown ? '#ff9500' : '#ffcc00',
          backgroundColor: isDown ? 'rgba(255, 59, 48, 0.1)' : 'rgba(75, 181, 67, 0.1)',
          borderWidth: 2,
          fill: true
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        mode: 'index',
        intersect: false
      },
      scales: {
        y: {
          title: {
            display: true,
            text: 'Price (USD)'
          },
          ticks: {
            callback: function(value) {
              return '$' + value.toLocaleString();
            }
          }
        }
      }
    }
  };
}

/**
 * Handle historical comparison intent
 * @param {string} message - User message
 * @param {number} sentiment - Message sentiment
 * @param {Object} processedMessage - Processed message with entities
 * @returns {Object} Response with text and visual
 */
/**
 * Handle historical comparison intent
 * @param {string} message - User message
 * @param {number} sentiment - Message sentiment
 * @param {Object} processedMessage - Processed message with entities
 * @returns {Object} Response with text and visual
 */
function handleHistoricalComparison(message, sentiment, processedMessage) {
  // Create visual component
  const visual = document.createElement('div');
  visual.className = 'rektbot-visual';
  
  // Extract specific time period references from message
  const timeReferences = extractHistoricalTimeReferences(message);
  
  // Get current metrics for comparison
  const currentMetrics = state.latestOnChainMetrics || {};
  const currentCyclePosition = currentMetrics.cyclePosition || 0.5;
  const currentMVRV = currentMetrics.mvrv ? currentMetrics.mvrv.value : null;
  const currentNVT = currentMetrics.nvt ? currentMetrics.nvt.value : null;
  
// Get month from entities or use current month as fallback
const monthEntity = processedMessage.entities.month;
const currentMonth = monthEntity ? monthEntity.index + 1 : new Date().getMonth() + 1;
const currentYear = new Date().getFullYear();
  
  // Determine if user is asking about a specific metric comparison
  const isMetricComparison = /\b(mvrv|nvt|metric|on-chain|indicator)\b/i.test(message);
  const isCycleComparison = /\b(cycle|position|phase|stage)\b/i.test(message);
  const isMarketStructureComparison = /\b(market structure|pattern|formation|setup)\b/i.test(message);
  const isCrashComparison = /\b(crash|correction|drop|dump|fall|decline)\b/i.test(message);
  
  // Get historical data based on time references or similar cycle positions
  let historicalData;
  let comparisonTitle;
  let specificPeriod = false;
  
  if (timeReferences.length > 0) {
    // User mentioned specific time periods
    historicalData = getHistoricalDataForPeriods(timeReferences);
    comparisonTitle = `Comparison with ${timeReferences.map(t => t.display).join(' & ')}`;
    specificPeriod = true;
  } else if (isCycleComparison) {
    // Compare to similar cycle positions
    historicalData = getHistoricalDataByCyclePosition(currentCyclePosition);
    comparisonTitle = `Similar Cycle Position Comparisons (${(currentCyclePosition * 100).toFixed(0)}%)`;
  } else if (isMetricComparison) {
    // Compare to similar metric readings
    historicalData = getHistoricalDataBySimilarMetrics(currentMVRV, currentNVT);
    comparisonTitle = `Similar On-Chain Metric Periods`;
  } else if (isCrashComparison) {
    // Compare to previous significant crashes
    historicalData = getHistoricalCrashData();
    comparisonTitle = `Previous Market Corrections & Crashes`;
  } else if (isMarketStructureComparison) {
    // Compare to similar market structures
    historicalData = getHistoricalMarketStructures(currentCyclePosition, currentMVRV, currentNVT);
    comparisonTitle = `Similar Market Structure Periods`;
  } else {
    // Default to general historical comparison
    historicalData = getGeneralHistoricalComparisons();
    comparisonTitle = `Historical Market Analogs`;
  }
  
  // Create the visual content header
  const headerSection = document.createElement('div');
  headerSection.style.marginBottom = '15px';
  headerSection.innerHTML = `
    <h3 style="margin: 0; font-size: 1.1rem; color: var(--btc-orange);">${comparisonTitle}</h3>
    <p style="margin-top: 5px; font-size: 0.9rem;">
      Comparing current market conditions with historical periods
    </p>
  `;
  visual.appendChild(headerSection);
  
  // Create comparison cards for each historical period
  historicalData.slice(0, 3).forEach(period => {
    const comparisonCard = createComparisonCard(period, currentMetrics);
    visual.appendChild(comparisonCard);
  });
  
  // Add current market context section
  const contextSection = document.createElement('div');
  contextSection.style.background = 'rgba(30, 30, 30, 0.7)';
  contextSection.style.padding = '15px';
  contextSection.style.borderRadius = '10px';
  contextSection.style.marginTop = '15px';
  
  contextSection.innerHTML = `
    <div style="font-weight: bold; margin-bottom: 10px; color: var(--btc-orange);">Current Market Context:</div>
    
    <div style="display: flex; flex-wrap: wrap; gap: 15px; margin-bottom: 10px;">
      ${currentMVRV ? `
        <div style="flex: 1; min-width: 140px; background: rgba(0,0,0,0.2); padding: 8px; border-radius: 4px;">
          <div style="font-weight: bold; font-size: 0.9rem;">MVRV Ratio</div>
          <div style="font-size: 1.1rem; margin: 5px 0;">${currentMVRV.toFixed(2)}</div>
          <div style="font-size: 0.8rem; opacity: 0.7;">${getMVRVAssessment(currentMVRV)}</div>
        </div>
      ` : ''}
      
      ${currentNVT ? `
        <div style="flex: 1; min-width: 140px; background: rgba(0,0,0,0.2); padding: 8px; border-radius: 4px;">
          <div style="font-weight: bold; font-size: 0.9rem;">NVT Ratio</div>
          <div style="font-size: 1.1rem; margin: 5px 0;">${currentNVT.toFixed(2)}</div>
          <div style="font-size: 0.8rem; opacity: 0.7;">${getNVTAssessment(currentNVT)}</div>
        </div>
      ` : ''}
      
      <div style="flex: 1; min-width: 140px; background: rgba(0,0,0,0.2); padding: 8px; border-radius: 4px;">
        <div style="font-weight: bold; font-size: 0.9rem;">Cycle Position</div>
        <div style="font-size: 1.1rem; margin: 5px 0;">${(currentCyclePosition * 100).toFixed(0)}%</div>
        <div style="font-size: 0.8rem; opacity: 0.7;">${getCyclePositionDescription(currentCyclePosition)}</div>
      </div>
    </div>
    
    <div style="font-size: 0.9rem;">
      ${getOverallComparisonAssessment(historicalData, currentMetrics, specificPeriod, timeReferences)}
    </div>
  `;
  
  visual.appendChild(contextSection);
  
  // Generate text response based on the comparison
  const text = generateComparisonText(historicalData, currentMetrics, timeReferences, specificPeriod);
  
  return { text, visual };
}

/**
 * Extract historical time references from message
 * @param {string} message - User message
 * @returns {Array} Array of time reference objects
 */
function extractHistoricalTimeReferences(message) {
  const references = [];
  
  // Check for year mentions (2017, 2018, etc)
  const yearRegex = /\b(20\d\d)\b/g;
  let yearMatch;
  while ((yearMatch = yearRegex.exec(message)) !== null) {
    const year = parseInt(yearMatch[1]);
    
    // Check for month mentions near the year
    const monthRegex = /\b(january|february|march|april|may|june|july|august|september|october|november|december)\b/i;
    const contextBefore = message.substring(Math.max(0, yearMatch.index - 20), yearMatch.index);
    const contextAfter = message.substring(yearMatch.index + yearMatch[0].length, Math.min(message.length, yearMatch.index + yearMatch[0].length + 20));
    
    let monthMatch = monthRegex.exec(contextBefore + " " + contextAfter);
    let month = null;
    
    if (monthMatch) {
      const monthName = monthMatch[1].toLowerCase();
      const monthMap = {
        'january': 1, 'february': 2, 'march': 3, 'april': 4,
        'may': 5, 'june': 6, 'july': 7, 'august': 8,
        'september': 9, 'october': 10, 'november': 11, 'december': 12
      };
      month = monthMap[monthName];
    }
    
    // Check for "early", "mid", "late" qualifiers
    let timeQualifier = null;
    const qualifierRegex = /\b(early|mid|late)\b/i;
    const qualifierMatch = qualifierRegex.exec(contextBefore + " " + contextAfter);
    
    if (qualifierMatch) {
      timeQualifier = qualifierMatch[1].toLowerCase();
    }
    
    // Check for events like "top", "bottom", "crash", etc.
    let event = null;
    const eventRegex = /\b(top|bottom|peak|crash|correction|bull|bear)\b/i;
    const eventMatch = eventRegex.exec(contextBefore + " " + contextAfter);
    
    if (eventMatch) {
      event = eventMatch[1].toLowerCase();
    }
    
    // Format display text
    let display = `${year}`;
    if (month) {
      display = `${monthNames[month - 1]} ${year}`;
    }
    if (timeQualifier) {
      display = `${timeQualifier} ${display}`;
    }
    if (event) {
      display = `${display} ${event}`;
    }
    
    references.push({
      year,
      month,
      timeQualifier,
      event,
      display
    });
  }
  
  // Check for references to previous cycles or events without specific years
  const cycleRegex = /\b(previous|last|prior) (cycle|bull market|bear market|halving|correction|crash)\b/i;
  let cycleMatch;
  
  while ((cycleMatch = cycleRegex.exec(message)) !== null) {
    const cycleType = cycleMatch[2].toLowerCase();
    
    references.push({
      cycleType,
      isRelative: true,
      display: `${cycleMatch[1]} ${cycleMatch[2]}`
    });
  }
  
  return references;
}

/**
 * Get historical data for specific time periods
 * @param {Array} timeReferences - Array of time reference objects
 * @returns {Array} Historical data for the time periods
 */
function getHistoricalDataForPeriods(timeReferences) {
  const historicalData = [];
  
  // Process each time reference
  timeReferences.forEach(ref => {
    if (ref.year === 2017 && (ref.month === 12 || ref.event === 'top')) {
      // December 2017 bull market top
      historicalData.push({
        period: 'December 2017 (Cycle Top)',
        date: '2017-12-17',
        metrics: {
          mvrv: 3.8,
          nvt: 68.5,
          cyclePosition: 0.95
        },
        marketConditions: "Extreme euphoria, parabolic price rise, mainstream media attention",
        subsequentMovement: "Led to an 84% correction over the following year",
        similarity: 0.62,
        keyInsights: [
          "Extreme retail FOMO",
          "Significant exchange overload",
          "All-time high Google search interest",
          "MVRV ratio at historical extreme"
        ]
      });
    } else if (ref.year === 2018 && (ref.month === 12 || ref.event === 'bottom')) {
      // December 2018 bear market bottom
      historicalData.push({
        period: 'December 2018 (Bear Market Bottom)',
        date: '2018-12-15',
        metrics: {
          mvrv: 0.7,
          nvt: 27.8,
          cyclePosition: 0.05
        },
        marketConditions: "Extreme pessimism, capitulation, low trading volume",
        subsequentMovement: "Began a new bull cycle with over 1,600% appreciation over the next 2 years",
        similarity: 0.35,
        keyInsights: [
          "Highly profitable miners capitulated",
          "Median holding was at a loss",
          "Media declared 'crypto is dead'",
          "Strong accumulation by long-term holders"
        ]
      });
    } else if (ref.year === 2021 && ref.month === 4) {
      // April 2021 local top
      historicalData.push({
        period: 'April 2021 (Local Top)',
        date: '2021-04-14',
        metrics: {
          mvrv: 4.72,
          nvt: 62.1,
          cyclePosition: 0.82
        },
        marketConditions: "Strong bullish momentum, institutional adoption, high leverage",
        subsequentMovement: "30% correction followed by consolidation and another rally to a higher high",
        similarity: 0.55,
        keyInsights: [
          "Coinbase IPO marked local top",
          "Extremely high funding rates",
          "Historically high MVRV (>4.5)",
          "Mining hash rate concerns emerged"
        ]
      });
    } else if (ref.year === 2021 && ref.month === 11) {
      // November 2021 all-time high
      historicalData.push({
        period: 'November 2021 (All-Time High)',
        date: '2021-11-10',
        metrics: {
          mvrv: 3.95,
          nvt: 73.2,
          cyclePosition: 0.98
        },
        marketConditions: "New all-time high, NFT mania, widespread altcoin speculation",
        subsequentMovement: "Began a prolonged bear market with multiple capitulation events",
        similarity: 0.68,
        keyInsights: [
          "Extreme leverage in derivatives markets",
          "Influx of new retail participants",
          "On-chain metrics showing divergence from price",
          "Early warning signs in funding rates"
        ]
      });
    } else if (ref.year === 2022 && ref.month === 11) {
      // November 2022 FTX collapse
      historicalData.push({
        period: 'November 2022 (FTX Collapse)',
        date: '2022-11-08',
        metrics: {
          mvrv: 1.02,
          nvt: 32.5,
          cyclePosition: 0.15
        },
        marketConditions: "Bear market, exchange contagion, liquidity crisis",
        subsequentMovement: "Final capitulation event before beginning of recovery in early 2023",
        similarity: 0.25,
        keyInsights: [
          "Exchange insolvency driven crash",
          "Forced seller dynamics",
          "Institutional trust erosion",
          "On-chain metrics near bottom formation levels"
        ]
      });
    } else if (ref.year === 2020 && ref.month === 3) {
      // March 2020 COVID crash
      historicalData.push({
        period: 'March 2020 (COVID Crash)',
        date: '2020-03-12',
        metrics: {
          mvrv: 0.95,
          nvt: 25.7,
          cyclePosition: 0.1
        },
        marketConditions: "Global market panic, liquidity crisis, correlation with traditional markets",
        subsequentMovement: "V-shaped recovery followed by a 1,500% bull run over the next year",
        similarity: 0.30,
        keyInsights: [
          "Macro-driven liquidation cascade",
          "High exchange withdrawal following crash",
          "Strong accumulation by long-term holders",
          "Halving event approaching after crash"
        ]
      });
    } else if (ref.isRelative && ref.cycleType.includes('cycle')) {
      // Previous cycle comparison
      historicalData.push({
        period: 'Previous Cycle Peak (2017-2018)',
        date: '2017-12-17 to 2018-12-15',
        metrics: {
          mvrv: {
            peak: 3.8,
            trough: 0.7
          },
          nvt: {
            peak: 68.5,
            trough: 27.8
          },
          cycleLength: "364 days from peak to trough"
        },
        marketConditions: "Full cycle from euphoria to despair, retail-driven bubble",
        subsequentMovement: "Extended accumulation phase followed by institutional-led bull market",
        similarity: 0.50,
        keyInsights: [
          "84% drawdown from peak to trough",
          "Retail-driven bubble with limited institutional involvement",
          "Clear MVRV and NVT pattern with consistent peaks",
          "Hash rate continued to grow despite price decline"
        ]
      });
      
      // Add current cycle data too
      historicalData.push({
        period: 'Current Cycle (2021-Present)',
        date: '2021-11-10 to Present',
        metrics: {
          mvrv: {
            peak: 3.95,
            current: state.latestOnChainMetrics?.mvrv?.value || 2.5
          },
          nvt: {
            peak: 73.2,
            current: state.latestOnChainMetrics?.nvt?.value || 45.0
          },
          daysFromPeak: daysBetween('2021-11-10', new Date().toISOString().split('T')[0])
        },
        marketConditions: "Institutional-driven cycle, macro correlation, higher liquidity",
        subsequentMovement: "Ongoing",
        similarity: 1.0,
        keyInsights: [
          "Higher base building after each selloff",
          "Stronger institutional component than previous cycles",
          "On-chain metrics showing resilience",
          "Increased stablecoin liquidity compared to previous cycle"
        ]
      });
    }
  });
  
  // If no specific matches were found, provide generic historical data
  if (historicalData.length === 0) {
    const defaultPeriods = [
      {
        period: 'December 2017 Bull Market Top',
        date: '2017-12-17',
        metrics: {
          mvrv: 3.8,
          nvt: 68.5,
          cyclePosition: 0.95
        },
        marketConditions: "Retail-driven euphoria, parabolic price action",
        subsequentMovement: "84% correction over the following year",
        similarity: 0.45,
        keyInsights: [
          "Extreme retail FOMO",
          "Significant exchange overload",
          "All-time high Google search interest",
          "MVRV ratio at historical extreme"
        ]
      },
      {
        period: 'April 2021 Local Top',
        date: '2021-04-14',
        metrics: {
          mvrv: 4.72,
          nvt: 62.1,
          cyclePosition: 0.82
        },
        marketConditions: "Mid-cycle top with institutional adoption",
        subsequentMovement: "55% correction followed by recovery to new ATH",
        similarity: 0.62,
        keyInsights: [
          "Coinbase IPO marked the local top",
          "Extremely high funding rates",
          "Historically high MVRV (>4.5)",
          "Mining hash rate concerns emerged"
        ]
      },
      {
        period: 'November 2021 All-Time High',
        date: '2021-11-10',
        metrics: {
          mvrv: 3.95,
          nvt: 73.2,
          cyclePosition: 0.98
        },
        marketConditions: "Cycle peak with broad market speculation",
        subsequentMovement: "Prolonged bear market with multiple capitulation events",
        similarity: 0.58,
        keyInsights: [
          "Extreme leverage in derivatives markets",
          "Influx of new retail participants",
          "On-chain metrics showing divergence from price",
          "Early warning signs in funding rates"
        ]
      }
    ];
    
    historicalData.push(...defaultPeriods);
  }
  
  return historicalData;
}

/**
 * Get historical data based on similar cycle position
 * @param {number} currentCyclePosition - Current cycle position
 * @returns {Array} Historical data with similar cycle positions
 */
function getHistoricalDataByCyclePosition(currentCyclePosition) {
  // Define cycle position ranges
  const earlyBull = { min: 0.2, max: 0.4 };
  const midCycle = { min: 0.4, max: 0.6 };
  const lateBull = { min: 0.6, max: 0.8 };
  const marketTop = { min: 0.8, max: 1.0 };
  const bearMarket = { min: 0.0, max: 0.2 };
  
  const historicalData = [];
  
  if (currentCyclePosition >= lateBull.min && currentCyclePosition <= lateBull.max) {
    // Late bull market comparison
    historicalData.push({
      period: 'October-November 2017',
      date: '2017-10-15',
      metrics: {
        mvrv: 2.9,
        nvt: 55.6,
        cyclePosition: 0.72
      },
      marketConditions: "Late bull market before final parabolic phase",
      subsequentMovement: "Continued 3x rise over 2 months before peak, then 84% crash",
      similarity: 0.85,
      keyInsights: [
        "Accelerating positive sentiment",
        "Increasing new address growth",
        "Rising media attention",
        "Growing retail participation"
      ]
    });
    
    historicalData.push({
      period: 'February-March 2021',
      date: '2021-02-20',
      metrics: {
        mvrv: 3.2,
        nvt: 57.3,
        cyclePosition: 0.68
      },
      marketConditions: "Late bull market with institutional adoption",
      subsequentMovement: "Further 50% rise before local top in April, 55% correction thereafter",
      similarity: 0.78,
      keyInsights: [
        "Institutional accumulation",
        "Bitcoin corporate treasury adoption",
        "Positive regulatory developments",
        "Rising open interest in derivatives"
      ]
    });
  } else if (currentCyclePosition >= midCycle.min && currentCyclePosition <= midCycle.max) {
    // Mid cycle comparison
    historicalData.push({
      period: 'July-August 2017',
      date: '2017-07-15',
      metrics: {
        mvrv: 2.1,
        nvt: 42.7,
        cyclePosition: 0.52
      },
      marketConditions: "Mid-cycle consolidation after first major impulse",
      subsequentMovement: "Continued uptrend with 320% rise to cycle peak in December",
      similarity: 0.72,
      keyInsights: [
        "Consolidation after initial rally",
        "Growing mainstream awareness",
        "Healthy on-chain metrics",
        "Expanding exchange ecosystem"
      ]
    });
    
    historicalData.push({
      period: 'September 2020',
      date: '2020-09-15',
      metrics: {
        mvrv: 1.8,
        nvt: 38.9,
        cyclePosition: 0.45
      },
      marketConditions: "Early bull market consolidation phase",
      subsequentMovement: "Accelerated uptrend with 650% rise to April 2021 local top",
      similarity: 0.68,
      keyInsights: [
        "DeFi summer cooling off",
        "Institutional interest growing",
        "Healthy accumulation by long-term holders",
        "On-chain metrics showing strength"
      ]
    });
  } else if (currentCyclePosition >= marketTop.min && currentCyclePosition <= marketTop.max) {
    // Market top comparison
    historicalData.push({
      period: 'December 2017',
      date: '2017-12-17',
      metrics: {
        mvrv: 3.8,
        nvt: 68.5,
        cyclePosition: 0.95
      },
      marketConditions: "Blow-off top with extreme retail euphoria",
      subsequentMovement: "84% decline over the next year into bear market",
      similarity: 0.70,
      keyInsights: [
        "Parabolic price action",
        "Mainstream media frenzy",
        "Exchange sign-up overloads",
        "Extreme on-chain divergences"
      ]
    });
    
    historicalData.push({
      period: 'November 2021',
      date: '2021-11-10',
      metrics: {
        mvrv: 3.95,
        nvt: 73.2,
        cyclePosition: 0.98
      },
      marketConditions: "Cycle top with both retail and institutional involvement",
      subsequentMovement: "Prolonged bear market with ~75% decline",
      similarity: 0.65,
      keyInsights: [
        "All-time high leverage",
        "NFT and altcoin mania",
        "Bearish divergences in on-chain metrics",
        "Signs of exhaustion in funding rates"
      ]
    });
  }
  
  return historicalData;
}

/**
 * Get historical data based on similar metrics
 * @param {number} currentMVRV - Current MVRV value
 * @param {number} currentNVT - Current NVT value
 * @returns {Array} Historical data with similar metrics
 */
function getHistoricalDataBySimilarMetrics(currentMVRV, currentNVT) {
  const historicalData = [];
  
  // No current metrics available, provide default data
  if (currentMVRV === null && currentNVT === null) {
    return getGeneralHistoricalComparisons();
  }
  
  if (currentMVRV > 3.0) {
    // High MVRV comparison
    historicalData.push({
      period: 'December 2017',
      date: '2017-12-10',
      metrics: {
        mvrv: 3.7,
        nvt: 65.8,
        cyclePosition: 0.92
      },
      marketConditions: "Late-stage bull market with extreme valuation",
      subsequentMovement: "Near-term peak followed by 84% decline",
      similarity: 0.88,
      keyInsights: [
        "Top signal for the 2017 cycle",
        "Historically reliable indicator of overvaluation",
        "Retail-driven market frenzy",
        "Extreme divergence between price and fundamentals"
      ]
    });
    
    historicalData.push({
      period: 'April 2021',
      date: '2021-04-10',
      metrics: {
        mvrv: 4.5,
        nvt: 60.2,
        cyclePosition: 0.80
      },
      marketConditions: "Mid-cycle top with overextended valuations",
      subsequentMovement: "55% correction before continuation of bull market",
      similarity: 0.82,
      keyInsights: [
        "Local top signal for 2021 cycle",
        "Leverage-driven price action",
        "Mixed institutional signals",
        "On-chain warning signals across multiple metrics"
      ]
    });
  } else if (currentMVRV > 1.5 && currentMVRV < 3.0) {
    // Moderate MVRV comparison
    historicalData.push({
      period: 'August 2017',
      date: '2017-08-15',
      metrics: {
        mvrv: 2.2,
        nvt: 45.3,
        cyclePosition: 0.58
      },
      marketConditions: "Mid-cycle bull market with reasonable valuations",
      subsequentMovement: "Continued 4-month rally of +270% before significant correction",
      similarity: 0.85,
      keyInsights: [
        "Mid-cycle consolidation phase",
        "Healthy price structure",
        "Balanced on-chain metrics",
        "Growing market awareness"
      ]
    });
    
    historicalData.push({
      period: 'February 2021',
      date: '2021-02-15',
      metrics: {
        mvrv: 2.8,
        nvt: 52.7,
        cyclePosition: 0.65
      },
      marketConditions: "Strong bull trend with institutional adoption",
      subsequentMovement: "Continued uptrend for 2 months before local top",
      similarity: 0.80,
      keyInsights: [
        "Institutional investment phase",
        "Corporate treasury adoption",
        "Strong spot buying",
        "Healthy on-chain metrics"
      ]
    });
  } else if (currentMVRV < 1.0) {
    // Low MVRV comparison
    historicalData.push({
      period: 'December 2018',
      date: '2018-12-15',
      metrics: {
        mvrv: 0.7,
        nvt: 27.8,
        cyclePosition: 0.05
      },
      marketConditions: "Bear market bottom with extreme undervaluation",
      subsequentMovement: "Slow recovery with +330% over the next year",
      similarity: 0.78,
      keyInsights: [
        "Historically strong buy signal",
        "Capitulation phase complete",
        "Strong accumulation by smart money",
        "Value area based on realized price"
      ]
    });
    
    historicalData.push({
      period: 'March 2020',
      date: '2020-03-15',
      metrics: {
        mvrv: 0.85,
        nvt: 25.6,
        cyclePosition: 0.1
      },
      marketConditions: "COVID crash bottom with flash undervaluation",
      subsequentMovement: "Strong V-shaped recovery and beginning of bull market",
      similarity: 0.75,
      keyInsights: [
        "Macro-driven panic selling",
        "Strong value signal for long-term holders",
        "Beginning of accumulation phase",
        "Halving event provided additional catalyst"
      ]
    });
  }
  
  if (currentNVT > 60) {
    // High NVT comparison (if not already added)
    const alreadyHasHighNVT = historicalData.some(data => data.metrics.nvt > 60);
    
    if (!alreadyHasHighNVT) {
      historicalData.push({
        period: 'January 2018',
        date: '2018-01-05',
        metrics: {
          mvrv: 3.5,
          nvt: 69.3,
          cyclePosition: 0.9
        },
        marketConditions: "Post-peak euphoria with declining network utility",
        subsequentMovement: "Continued downtrend with multiple failed rallies",
        similarity: 0.72,
        keyInsights: [
          "Overvaluation relative to network utility",
          "Transaction activity declining",
          "Waning momentum",
          "Early bear market conditions forming"
        ]
      });
    }
  }
  
  return historicalData;
}

/**
 * Get historical market structure data
 * @param {number} cyclePosition - Current cycle position
 * @param {number} mvrv - Current MVRV
 * @param {number} nvt - Current NVT
 * @returns {Array} Historical data with similar market structures
 */
function getHistoricalMarketStructures(cyclePosition, mvrv, nvt) {
  const historicalData = [];
  
  if (cyclePosition > 0.6 && cyclePosition < 0.8) {
    // Late bull market structure
    historicalData.push({
      period: 'October-November 2017',
      date: '2017-11-01',
      metrics: {
        mvrv: 3.1,
        nvt: 58.2,
        cyclePosition: 0.75
      },
      marketConditions: "Late bull market before final parabolic phase",
      subsequentMovement: "+130% in final melt-up, then 84% crash",
      similarity: 0.82,
      keyInsights: [
        "Building momentum before final push",
        "Increasing retail participation",
        "Rising media attention",
        "Technical resistance breakouts"
      ]
    });
    
    historicalData.push({
      period: 'March 2021',
      date: '2021-03-15',
      metrics: {
        mvrv: 3.5,
        nvt: 59.7,
        cyclePosition: 0.72
      },
      marketConditions: "Late bull phase before local top",
      subsequentMovement: "+15% to local top, then 55% correction, then recovery to new ATH",
      similarity: 0.78,
      keyInsights: [
        "Institutional and corporate adoption",
        "Rising leverage in derivatives markets",
        "Strong technical momentum",
        "On-chain divergences beginning to show"
      ]
    });
  } else if (cyclePosition > 0.3 && cyclePosition < 0.6) {
    // Mid-cycle structure
    historicalData.push({
      period: 'July-August 2017',
      date: '2017-07-20',
      metrics: {
        mvrv: 2.3,
        nvt: 43.2,
        cyclePosition: 0.55
      },
      marketConditions: "Mid-cycle consolidation phase",
      subsequentMovement: "+320% rise to cycle peak in Dec 2017",
      similarity: 0.75,
      keyInsights: [
        "Healthy uptrend following initial rally",
        "Growing market awareness",
        "Balanced on-chain metrics",
        "Technical pattern of higher lows"
      ]
    });
    
    historicalData.push({
      period: 'October 2020',
      date: '2020-10-20',
      metrics: {
        mvrv: 1.9,
        nvt: 42.1,
        cyclePosition: 0.48
      },
      marketConditions: "Early-to-mid bull market phase",
      subsequentMovement: "+400% to April 2021 local top",
      similarity: 0.70,
      keyInsights: [
        "Institutional adoption beginning",
        "Healthy accumulation patterns",
        "Solid on-chain fundamentals",
        "Technical breakout from consolidation"
      ]
    });
  } else if (cyclePosition > 0.8) {
    // Market top structure
    historicalData.push({
      period: 'December 2017',
      date: '2017-12-17',
      metrics: {
        mvrv: 3.8,
        nvt: 68.5,
        cyclePosition: 0.95
      },
      marketConditions: "Market top with parabolic rise",
      subsequentMovement: "84% crash over the following 12 months",
      similarity: 0.60,
      keyInsights: [
        "Parabolic price action",
        "Extreme retail euphoria",
        "Media frenzy",
        "Multiple on-chain warning signals"
      ]
    });
    
    historicalData.push({
      period: 'November 2021',
      date: '2021-11-10',
      metrics: {
        mvrv: 3.95,
        nvt: 73.2,
        cyclePosition: 0.98
      },
      marketConditions: "Cycle peak with both retail and institutional involvement",
      subsequentMovement: "75% decline in prolonged bear market",
      similarity: 0.65,
      keyInsights: [
        "Extreme leverage",
        "Altcoin and NFT mania",
        "On-chain bearish divergences",
        "Exhaustion in momentum indicators"
      ]
    });
  }
  
  return historicalData;
}

/**
 * Get historical crash data
 * @returns {Array} Historical crash data
 */
function getHistoricalCrashData() {
  return [
    {
      period: 'December 2017 - December 2018',
      date: '2017-12-17 to 2018-12-15',
      metrics: {
        mvrv: {
          before: 3.8,
          after: 0.7
        },
        nvt: {
          before: 68.5,
          after: 27.8
        },
        cyclePosition: {
          before: 0.95,
          after: 0.05
        }
      },
      marketConditions: "Bubble burst after retail-driven mania",
      decline: "84% over 365 days",
      similarity: 0.55,
      keyInsights: [
        "Largest percentage drawdown in 2017-2018 cycle",
        "Initial 70% drop in first 60 days",
        "Several relief rallies that ultimately failed",
        "Final capitulation in November 2018"
      ]
    },
    {
      period: 'March 2020 COVID Crash',
      date: '2020-03-12 to 2020-03-13',
      metrics: {
        mvrv: {
          before: 1.3,
          after: 0.85
        },
        nvt: {
          before: 32.5,
          after: 25.6
        },
        cyclePosition: {
          before: 0.25,
          after: 0.1
        }
      },
      marketConditions: "Global pandemic panic, liquidity crisis in all markets",
      decline: "50% in 24 hours",
      similarity: 0.40,
      keyInsights: [
        "Fastest significant crash in Bitcoin history",
        "Correlation with traditional markets spike",
        "Massive liquidation cascade in derivatives",
        "V-shaped recovery began almost immediately"
      ]
    },
    {
      period: 'May 2021 Correction',
      date: '2021-05-12 to 2021-07-20',
      metrics: {
        mvrv: {
          before: 3.2,
          after: 1.5
        },
        nvt: {
          before: 57.3,
          after: 38.1
        },
        cyclePosition: {
          before: 0.75,
          after: 0.45
        }
      },
      marketConditions: "Mid-cycle correction triggered by China mining ban",
      decline: "55% over 70 days",
      similarity: 0.65,
      keyInsights: [
        "Environmental concerns sparked selling",
        "China mining ban caused hash rate collapse",
        "Multiple technical supports broken",
        "Significant deleveraging event"
      ]
    }
  ];
}

/**
 * Get general historical comparisons
 * @returns {Array} General historical comparison data
 */
function getGeneralHistoricalComparisons() {
  return [
    {
      period: 'October-November 2017',
      date: '2017-10-20',
      metrics: {
        mvrv: 2.9,
        nvt: 55.6,
        cyclePosition: 0.72
      },
      marketConditions: "Late-stage bull market before final parabolic phase",
      subsequentMovement: "+130% to top, then 84% crash",
      similarity: 0.70,
      keyInsights: [
        "Accelerating uptrend",
        "Growing retail awareness",
        "Strong momentum",
        "Elevated but not extreme valuations"
      ]
    },
    {
      period: 'March 2021',
      date: '2021-03-15',
      metrics: {
        mvrv: 3.5,
        nvt: 59.7,
        cyclePosition: 0.72
      },
      marketConditions: "Mid-cycle bull market with institutional adoption",
      subsequentMovement: "+15% to local top, then 55% correction",
      similarity: 0.75,
      keyInsights: [
        "Institutional accumulation",
        "Strong technical structure",
        "Healthy on-chain fundamentals",
        "Multiple expansion phase"
      ]
    },
    {
      period: 'August-September 2021',
      date: '2021-09-05',
      metrics: {
        mvrv: 2.7,
        nvt: 52.1,
        cyclePosition: 0.65
      },
      marketConditions: "Recovery from mid-cycle correction",
      subsequentMovement: "+75% to new ATH in November",
      similarity: 0.65,
      keyInsights: [
        "Post-correction recovery phase",
        "Miner relocation mostly complete",
        "Renewed institutional interest",
        "Balanced on-chain metrics"
      ]
    }
  ];
}

/**
 * Create a visual comparison card
 * @param {Object} period - Historical period data
 * @param {Object} currentMetrics - Current metrics
 * @returns {HTMLElement} Comparison card
 */
function createComparisonCard(period, currentMetrics) {
  const card = document.createElement('div');
  card.style.background = 'rgba(30, 30, 30, 0.6)';
  card.style.padding = '15px';
  card.style.borderRadius = '8px';
  card.style.marginBottom = '10px';
  
  let metricsHTML = '';
  
  // Format metrics display based on data structure
  if (period.metrics.mvrv !== undefined) {
    if (typeof period.metrics.mvrv === 'object') {
      // Handle range of values (for cycles)
      const mvrvText = period.metrics.mvrv.peak ? 
        `Peak: ${period.metrics.mvrv.peak.toFixed(2)}` : 
        period.metrics.mvrv.before ? 
          `Before: ${period.metrics.mvrv.before.toFixed(2)}, After: ${period.metrics.mvrv.after.toFixed(2)}` :
          `${period.metrics.mvrv.current?.toFixed(2) || 'N/A'}`;
      
      metricsHTML += `
        <div><b>MVRV:</b> ${mvrvText}</div>
      `;
    } else {
      metricsHTML += `
        <div><b>MVRV:</b> ${period.metrics.mvrv.toFixed(2)}</div>
      `;
    }
  }
  
  if (period.metrics.nvt !== undefined) {
    if (typeof period.metrics.nvt === 'object') {
      // Handle range of values
      const nvtText = period.metrics.nvt.peak ? 
        `Peak: ${period.metrics.nvt.peak.toFixed(2)}` : 
        period.metrics.nvt.before ? 
          `Before: ${period.metrics.nvt.before.toFixed(2)}, After: ${period.metrics.nvt.after.toFixed(2)}` :
          `${period.metrics.nvt.current?.toFixed(2) || 'N/A'}`;
      
      metricsHTML += `
        <div><b>NVT:</b> ${nvtText}</div>
      `;
    } else {
      metricsHTML += `
        <div><b>NVT:</b> ${period.metrics.nvt.toFixed(2)}</div>
      `;
    }
  }
  
  if (period.metrics.cyclePosition !== undefined) {
    if (typeof period.metrics.cyclePosition === 'object') {
      // Handle range of values
      const posText = period.metrics.cyclePosition.before ? 
        `Before: ${(period.metrics.cyclePosition.before * 100).toFixed(0)}%, After: ${(period.metrics.cyclePosition.after * 100).toFixed(0)}%` :
        `${(period.metrics.cyclePosition.current * 100)?.toFixed(0) || 'N/A'}%`;
      
      metricsHTML += `
        <div><b>Cycle:</b> ${posText}</div>
      `;
    } else {
      metricsHTML += `
        <div><b>Cycle:</b> ${(period.metrics.cyclePosition * 100).toFixed(0)}%</div>
      `;
    }
  }
  
  if (period.metrics.cycleLength) {
    metricsHTML += `
      <div><b>Cycle Length:</b> ${period.metrics.cycleLength}</div>
    `;
  }
  
  if (period.metrics.daysFromPeak) {
    metricsHTML += `
      <div><b>Days Since Peak:</b> ${period.metrics.daysFromPeak}</div>
    `;
  }
  
  // Create insights list
  let insightsHTML = '';
  if (period.keyInsights && period.keyInsights.length > 0) {
    insightsHTML = `
      <div style="margin-top: 8px;">
        <div style="font-size: 0.9rem; margin-bottom: 3px;"><b>Key Insights:</b></div>
        <ul style="margin: 0; padding-left: 18px; font-size: 0.85rem;">
          ${period.keyInsights.map(insight => `<li>${insight}</li>`).join('')}
        </ul>
      </div>
    `;
  }
  
  card.innerHTML = `
    <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
      <div style="font-weight: bold;">${period.period}</div>
      ${period.similarity ? `
        <div style="font-size: 0.85rem; opacity: 0.8;">Similarity: ${Math.round(period.similarity * 100)}%</div>
      ` : ''}
    </div>
    
    <div style="font-size: 0.9rem; margin-bottom: 5px;">
      ${period.marketConditions}
    </div>
    
    <div style="display: flex; flex-wrap: wrap; gap: 10px; margin: 5px 0; font-size: 0.85rem;">
      ${metricsHTML}
    </div>
    
    <div style="font-size: 0.9rem; margin-top: 5px;">
      <b>Subsequent Movement:</b> ${period.subsequentMovement || "Unknown"}
    </div>
    
    ${period.decline ? `
      <div style="font-size: 0.9rem; margin-top: 5px;">
        <b>Decline Magnitude:</b> ${period.decline}
      </div>
    ` : ''}
    
    ${insightsHTML}
  `;
  
  return card;
}

/**
 * Get MVRV assessment
 * @param {number} mvrv - MVRV value
 * @returns {string} Assessment
 */
function getMVRVAssessment(mvrv) {
  if (mvrv > 3.5) return "Historically indicates market tops";
  if (mvrv > 2.5) return "Elevated valuation";
  if (mvrv > 1.0) return "Neutral to slightly elevated";
  return "Potential value zone";
}

/**
 * Get NVT assessment
 * @param {number} nvt - NVT value
 * @returns {string} Assessment
 */
function getNVTAssessment(nvt) {
  if (nvt > 65) return "Potentially overvalued";
  if (nvt > 45) return "Moderately elevated";
  if (nvt > 30) return "Neutral valuation range";
  return "Potentially undervalued";
}

/**
 * Get cycle position description
 * @param {number} position - Cycle position
 * @returns {string} Description
 */
function getCyclePositionDescription(position) {
  if (position > 0.8) return "potential market top phase";
  if (position > 0.6) return "late uptrend with increasing risk";
  if (position > 0.4) return "mid-cycle phase";
  if (position > 0.2) return "early uptrend phase";
  return "accumulation phase";
}

/**
 * Generate overall comparison assessment
 * @param {Array} historicalData - Historical data
 * @param {Object} currentMetrics - Current metrics
 * @param {boolean} specificPeriod - Whether a specific period was requested
 * @param {Array} timeReferences - Time references
 * @returns {string} Assessment text
 */
function getOverallComparisonAssessment(historicalData, currentMetrics, specificPeriod, timeReferences) {
  if (historicalData.length === 0) {
    return "No directly comparable historical periods identified.";
  }
  
  if (specificPeriod && timeReferences.length > 0) {
    // Create specific time period assessment
    const refText = timeReferences.map(ref => ref.display).join(' and ');
    
    if (historicalData[0].similarity > 0.8) {
      return `The current market shows strong similarities to ${refText}, particularly in on-chain metrics and market structure. This historical analog suggests careful monitoring of ${historicalData[0].keyInsights[0].toLowerCase()} and ${historicalData[0].keyInsights[1].toLowerCase()}.`;
    } else if (historicalData[0].similarity > 0.5) {
      return `There are moderate similarities between current conditions and ${refText}, though with important differences. Key parallels include ${historicalData[0].keyInsights[0].toLowerCase()}, while the main differences relate to institutional involvement and market liquidity.`;
    } else {
      return `The current market shows limited direct similarities to ${refText}. Notable differences include market structure, participant composition, and macro environment.`;
    }
  }
  
  // General assessment based on highest similarity
  const bestMatch = historicalData.sort((a, b) => b.similarity - a.similarity)[0];
  
  if (bestMatch.similarity > 0.8) {
    return `The current market conditions show strong similarities to ${bestMatch.period}, particularly in terms of ${bestMatch.keyInsights[0].toLowerCase()} and ${bestMatch.keyInsights[1].toLowerCase()}.`;
  } else if (bestMatch.similarity > 0.5) {
    return `There are moderate similarities between current conditions and ${bestMatch.period}, with key parallels in ${bestMatch.keyInsights[0].toLowerCase()} but differences in market structure and participant composition.`;
  } else {
    return `The current market shows some similarities to historical periods but maintains unique characteristics in terms of market structure, on-chain metrics, and macro environment.`;
  }
}

/**
 * Generate comparison text response
 * @param {Array} historicalData - Historical data
 * @param {Object} currentMetrics - Current metrics
 * @param {Array} timeReferences - Time references
 * @param {boolean} specificPeriod - Whether a specific period was requested
 * @returns {string} Text response
 */
function generateComparisonText(historicalData, currentMetrics, timeReferences, specificPeriod) {
  if (historicalData.length === 0) {
    return "I couldn't find directly comparable historical periods based on your criteria. Current market conditions appear to have unique characteristics not matching previous cycles.";
  }
  
  // Sort by similarity
  const sortedData = [...historicalData].sort((a, b) => b.similarity - a.similarity);
  const bestMatch = sortedData[0];
  
  let text = "";
  
  // Add current metrics overview
  text += `Based on current on-chain metrics, `;
  
  if (currentMetrics.mvrv) {
    text += `with MVRV at ${currentMetrics.mvrv.value.toFixed(2)} and `;
  }
  
  if (currentMetrics.nvt) {
    text += `NVT at ${currentMetrics.nvt.value.toFixed(2)}, `;
  }
  
  // Add comparison with historical periods
  if (specificPeriod && timeReferences.length > 0) {
    // Specific time period comparison
    const refText = timeReferences.map(ref => ref.display).join(' and ');
    
    if (bestMatch.similarity > 0.7) {
      text += `we see strong similarities to ${refText}. `;
    } else if (bestMatch.similarity > 0.5) {
      text += `we see moderate similarities to ${refText}. `;
    } else {
      text += `we see limited similarities to ${refText}. `;
    }
    
    if (historicalData.length > 0 && historicalData[0].keyInsights) {
      text += `Key parallels include ${historicalData[0].keyInsights[0].toLowerCase()} and ${historicalData[0].keyInsights[1].toLowerCase()}. `;
    }
    
    if (historicalData.length > 0 && historicalData[0].subsequentMovement) {
      text += `Following this period, the market experienced ${historicalData[0].subsequentMovement.toLowerCase()}. `;
    }
  } else {
    // General comparison based on similarity
    text += `we see ${bestMatch.similarity > 0.7 ? 'strong' : bestMatch.similarity > 0.5 ? 'moderate' : 'some'} similarities to historical periods that experienced varying outcomes. `;
    
    if (bestMatch.period) {
      text += `A similar metric environment in ${bestMatch.period} resulted in a ${bestMatch.subsequentMovement.includes('+') ? 'positive' : 'negative'} ${bestMatch.subsequentMovement.replace(/[\+\-]/g, '')} move over the subsequent two months. `;
    }
  }
  
  return text;
}

/**
 * Calculate days between two dates
 * @param {string} startDate - Start date in YYYY-MM-DD format
 * @param {string} endDate - End date in YYYY-MM-DD format
 * @returns {number} Number of days
 */
function daysBetween(startDate, endDate) {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const diffTime = Math.abs(end - start);
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
}

/**
 * Generate seasonal comparison
 * @param {Array} sortedCrashes - Sorted crash data
 * @param {number} currentMonth - Current month
 * @param {Array} monthNames - Month names
 * @returns {Object} Response with text and visual
 */
function generateSeasonalComparison(sortedCrashes, currentMonth, monthNames) {
  const visual = document.createElement('div');
  visual.className = 'rektbot-visual';
  
  visual.innerHTML = `
    <div style="margin-bottom: 10px;">
      <h3 style="margin: 0; font-size: 1.1rem; color: var(--btc-orange);">
        Historical ${monthNames[currentMonth - 1]} Market Events
      </h3>
    </div>
    
    ${sortedCrashes.slice(0, 3).map(crash => `
      <div style="background: rgba(30, 30, 30, 0.6); padding: 12px; border-radius: 6px; margin-bottom: 10px;">
        <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
          <span style="font-weight: bold;">${crash.date}</span>
          <span style="color: #ff3b30; font-weight: bold;">${crash.percentage}%</span>
        </div>
        <div style="font-size: 0.9rem; margin-bottom: 5px;">
          ${crash.description || `${monthNames[currentMonth - 1]} market crash`}
        </div>
        <div style="font-size: 0.85rem; opacity: 0.8;">
          ${crash.context.replace(/\[.*?\]\s*/, '')}
        </div>
      </div>
    `).join('')}
    
    <div style="background: rgba(30, 30, 30, 0.7); padding: 15px; border-radius: 6px; margin-top: 15px;">
      <div style="font-weight: bold; margin-bottom: 10px; color: var(--btc-orange);">Seasonal Analysis:</div>
      <div style="font-size: 0.9rem;">
        <p>${monthNames[currentMonth - 1]} has historically been a ${getMonthCharacterization(currentMonth)} month for Bitcoin. The average performance in this month across Bitcoin's history is ${getMonthlyPerformance(currentMonth)}%.</p>
        <p>Volatility tends to be ${getMonthVolatilityCharacterization(currentMonth)} during this period, with ${getMonthCrashFrequency(currentMonth)} frequency of significant drawdowns compared to other months.</p>
      </div>
    </div>
  `;
  
  let text = `${monthNames[currentMonth - 1]} has historically been a ${getMonthCharacterization(currentMonth)} month for Bitcoin with ${getMonthCrashFrequency(currentMonth)} frequency of significant corrections. `;
  
  if (sortedCrashes.length > 0) {
    const worstCrash = sortedCrashes[0];
    text += `The most severe event was on ${worstCrash.date} with a ${worstCrash.percentage}% drop. `;
  }
  
  text += `Average historical performance for this month is ${getMonthlyPerformance(currentMonth)}%. `;
  
  return { text, visual };
}

/**
 * Generate cycle comparison
 * @param {number} cyclePosition - Current cycle position
 * @param {Object} metrics - Current metrics
 * @returns {Object} Response with text and visual
 */
function generateCycleComparison(cyclePosition, metrics) {
  const visual = document.createElement('div');
  visual.className = 'rektbot-visual';
  
  // Generate analogous cycle periods
  const cycleAnalogs = getAnalogousCyclePositions(cyclePosition);
  
  visual.innerHTML = `
    <div style="margin-bottom: 10px;">
      <h3 style="margin: 0; font-size: 1.1rem; color: var(--btc-orange);">
        Similar Cycle Position Comparison (${(cyclePosition * 100).toFixed(0)}%)
      </h3>
    </div>
    
    ${cycleAnalogs.slice(0, 3).map(period => `
      <div style="background: rgba(30, 30, 30, 0.6); padding: 12px; border-radius: 6px; margin-bottom: 10px;">
        <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
          <span style="font-weight: bold;">${period.period}</span>
          <span style="color: ${period.performance > 0 ? '#34c759' : '#ff3b30'}; font-weight: bold;">
            ${period.performance > 0 ? '+' : ''}${period.performance}% (next 90d)
          </span>
        </div>
        <div style="font-size: 0.9rem; margin-bottom: 5px;">
          ${period.description}
        </div>
        <div style="font-size: 0.85rem;">
          <span style="font-weight: bold; margin-right: 5px;">Key Metrics:</span> 
          ${period.keyMetrics}
        </div>
      </div>
    `).join('')}
    
    <div style="background: rgba(30, 30, 30, 0.7); padding: 15px; border-radius: 6px; margin-top: 15px;">
      <div style="font-weight: bold; margin-bottom: 10px; color: var(--btc-orange);">Cycle Position Analysis:</div>
      <div style="font-size: 0.9rem;">
        <p>The current ${(cyclePosition * 100).toFixed(0)}% cycle position is characteristic of a ${getCyclePhaseDescription(cyclePosition)} phase.</p>
        <p>Historically, this phase has shown ${getCyclePhasePerformance(cyclePosition)} forward performance over the next 90 days, with ${getCyclePhaseVolatility(cyclePosition)} volatility compared to other cycle phases.</p>
      </div>
    </div>
  `;
  
  const text = `The current ${(cyclePosition * 100).toFixed(0)}% cycle position indicates a ${getCyclePhaseDescription(cyclePosition)} phase. Historically, similar cycle positions have shown ${getCyclePhasePerformance(cyclePosition)} forward returns over the next 90 days. A comparable period was ${cycleAnalogs[0].period}, which saw a ${cycleAnalogs[0].performance > 0 ? '+' : ''}${cycleAnalogs[0].performance}% move in the subsequent three months.`;
  
  return { text, visual };
}

/**
 * Generate metric-based comparison
 * @param {Object} metrics - Current metrics
 * @returns {Object} Response with text and visual
 */
function generateMetricComparison(metrics) {
  const visual = document.createElement('div');
  visual.className = 'rektbot-visual';
  
  // Get analogous metric periods
  const metricAnalogs = getAnalogousMetricPeriods(metrics);
  
  // Display current cycle position
  const cyclePosition = metrics.cyclePosition || 0.5;
  
  visual.innerHTML = `
    <div style="margin-bottom: 10px;">
      <h3 style="margin: 0; font-size: 1.1rem; color: var(--btc-orange);">
        Similar On-Chain Metric Periods
      </h3>
    </div>
    
    ${metricAnalogs.slice(0, 3).map(period => `
      <div style="background: rgba(30, 30, 30, 0.6); padding: 12px; border-radius: 6px; margin-bottom: 10px;">
        <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
          <span style="font-weight: bold;">${period.period}</span>
          <span style="color: ${period.performance > 0 ? '#34c759' : '#ff3b30'}; font-weight: bold;">
            ${period.performance > 0 ? '+' : ''}${period.performance}% (next 60d)
          </span>
        </div>
        <div style="font-size: 0.9rem; margin-bottom: 5px;">
          ${period.description}
        </div>
        <div style="display: flex; flex-wrap: wrap; gap: 8px; margin-top: 8px;">
          ${Object.entries(period.metrics).map(([key, value]) => `
            <div style="background: rgba(0,0,0,0.2); padding: 4px 8px; border-radius: 4px; font-size: 0.85rem;">
              <span style="font-weight: bold;">${key}:</span> ${value}
            </div>
          `).join('')}
        </div>
      </div>
    `).join('')}
    
    <div style="background: rgba(30, 30, 30, 0.7); padding: 15px; border-radius: 6px; margin-top: 15px;">
      <div style="font-weight: bold; margin-bottom: 10px; color: var(--btc-orange);">Current Metrics Summary:</div>
      <div style="display: flex; flex-wrap: wrap; gap: 10px; margin-bottom: 10px;">
        ${metrics.mvrv ? `
          <div style="flex: 1; min-width: 140px; background: rgba(0,0,0,0.2); padding: 8px; border-radius: 4px;">
            <div style="font-weight: bold; font-size: 0.9rem;">MVRV Ratio</div>
            <div style="font-size: 1.1rem; margin: 5px 0;">${metrics.mvrv.value.toFixed(2)}</div>
            <div style="font-size: 0.8rem; opacity: 0.7;">Z-Score: ${metrics.mvrv.zScore.toFixed(2)}</div>
          </div>
        ` : ''}
        
        ${metrics.nvt ? `
          <div style="flex: 1; min-width: 140px; background: rgba(0,0,0,0.2); padding: 8px; border-radius: 4px;">
            <div style="font-weight: bold; font-size: 0.9rem;">NVT Ratio</div>
            <div style="font-size: 1.1rem; margin: 5px 0;">${metrics.nvt.value.toFixed(2)}</div>
            <div style="font-size: 0.8rem; opacity: 0.7;">Z-Score: ${metrics.nvt.zScore.toFixed(2)}</div>
          </div>
        ` : ''}
        
        <div style="flex: 1; min-width: 140px; background: rgba(0,0,0,0.2); padding: 8px; border-radius: 4px;">
          <div style="font-weight: bold; font-size: 0.9rem;">Cycle Position</div>
          <div style="font-size: 1.1rem; margin: 5px 0;">${(cyclePosition * 100).toFixed(0)}%</div>
          <div style="font-size: 0.8rem; opacity: 0.7;">${getCyclePhaseDescription(cyclePosition)}</div>
        </div>
      </div>
      <div style="font-size: 0.9rem;">
        <p>The current metric readings show ${getMetricSimilarityAssessment(metrics)} to the historical analog periods shown above.</p>
      </div>
    </div>
  `;
  
  let text = `Based on current on-chain metrics, `;
  
  if (metrics.mvrv) {
    text += `with MVRV at ${metrics.mvrv.value.toFixed(2)} and `;
  }
  
  if (metrics.nvt) {
    text += `NVT at ${metrics.nvt.value.toFixed(2)}, `;
  }
  
  text += `we see ${getMetricSimilarityAssessment(metrics)} to historical periods that experienced varying outcomes. `;
  
  if (metricAnalogs.length > 0) {
    text += `A similar metric environment in ${metricAnalogs[0].period} resulted in a ${metricAnalogs[0].performance > 0 ? 'positive' : 'negative'} ${Math.abs(metricAnalogs[0].performance)}% move over the subsequent two months. `;
  }
  
  return { text, visual };
}

/**
 * Generate default crash comparison
 * @param {Array} sortedCrashes - Sorted crash data
 * @param {number} currentMonth - Current month
 * @param {Array} monthNames - Month names
 * @param {number} cyclePosition - Current cycle position 
 * @param {Object} metrics - Current metrics
 * @returns {Object} Response with text and visual
 */
function generateDefaultComparison(sortedCrashes, currentMonth, monthNames, cyclePosition, metrics) {
  const visual = document.createElement('div');
  visual.className = 'rektbot-visual';
  
  // Get current risk level
  const currentRisk = getCurrentRisk();
  
  visual.innerHTML = `
    <div style="margin-bottom: 10px;">
      <h3 style="margin: 0; font-size: 1.1rem; color: var(--btc-orange);">
        Historical ${monthNames[currentMonth - 1]} Crashes
      </h3>
    </div>
    
    ${sortedCrashes.slice(0, 2).map(crash => `
      <div style="background: rgba(30, 30, 30, 0.6); padding: 12px; border-radius: 6px; margin-bottom: 10px;">
        <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
          <span style="font-weight: bold;">${crash.date}</span>
          <span style="color: #ff3b30; font-weight: bold;">${crash.percentage}%</span>
        </div>
        <div style="font-size: 0.9rem; margin-bottom: 5px;">
          ${crash.description || `${monthNames[currentMonth - 1]} market crash`}
        </div>
        <div style="font-size: 0.85rem; opacity: 0.8;">
          ${crash.context.replace(/\[.*?\]\s*/, '')}
        </div>
      </div>
    `).join('')}
    
    <div style="background: rgba(30, 30, 30, 0.7); padding: 15px; border-radius: 6px; margin-top: 15px;">
      <div style="font-weight: bold; margin-bottom: 10px; color: var(--btc-orange);">Current Context:</div>
      <div style="font-size: 0.9rem;">
        <p>Current cycle position: <strong>${(cyclePosition * 100).toFixed(0)}%</strong> (${getCyclePhaseDescription(cyclePosition)})</p>
        <p>Risk level: <strong>${getCurrentRiskLevel()}</strong> (${(getCurrentRisk() * 100).toFixed(1)}%)</p>
        ${metrics.mvrv ? `<p>MVRV Ratio: <strong>${metrics.mvrv.value.toFixed(2)}</strong> (Z-Score: ${metrics.mvrv.zScore.toFixed(2)})</p>` : ''}
      </div>
    </div>
  `;
  
  let text = `${monthNames[currentMonth - 1]} has experienced notable Bitcoin crashes in the past. `;
  
  if (sortedCrashes.length > 0) {
    const worstCrash = sortedCrashes[0];
    text += `The most severe was on ${worstCrash.date} with a ${worstCrash.percentage}% drop. `;
  }
  
  const currentRiskPercent = (currentRisk * 100).toFixed(1);
  
  if (currentRisk > 0.65) {
    text += `The current ${currentRiskPercent}% crash probability is elevated, suggesting similar market conditions may be developing.`;
  } else if (currentRisk < 0.35) {
    text += `However, the current ${currentRiskPercent}% crash probability is relatively low compared to historical patterns for this month.`;
  } else {
    text += `The current ${currentRiskPercent}% crash probability reflects moderate risk levels for this time of year.`;
  }
  
  return { text, visual };
}

/**
 * Get month characterization based on actual historical patterns in state.bitcoinData
 * @param {number} month - Month (1-12)
 * @returns {string} Characterization
 */
function getMonthCharacterization(month) {
  // Calculate performance statistics for the specified month
  const monthlyReturns = [];
  
  // Iterate through the Bitcoin data
  for (let i = 1; i < state.bitcoinData.length; i++) {
    const currentData = state.bitcoinData[i];
    const prevData = state.bitcoinData[i-1];
    
    // Check if this data point is for the specified month
    const dataDate = new Date(currentData.date);
    if (dataDate.getMonth() + 1 === month) {
      // If we have previous data to compare with, calculate return
      if (prevData) {
        const monthlyReturn = (currentData.price / prevData.price - 1) * 100;
        monthlyReturns.push(monthlyReturn);
      }
    }
  }
  
  // Calculate the average return and volatility
  let avgReturn = 0;
  if (monthlyReturns.length > 0) {
    avgReturn = monthlyReturns.reduce((sum, val) => sum + val, 0) / monthlyReturns.length;
  }
  
  // Calculate volatility (standard deviation of returns)
  const volatility = calculateStandardDeviation(monthlyReturns);
  
  // Determine characterization based on average return and volatility
  if (avgReturn > 4) {
    return "historically strong";
  } else if (avgReturn > 2) {
    return "moderately bullish";
  } else if (avgReturn > 0) {
    return "slightly positive";
  } else if (avgReturn > -2) {
    return "mixed performance";
  } else if (avgReturn > -4) {
    return "moderately bearish";
  } else {
    return "historically weak";
  }
}

/**
 * Get historical month performance by analyzing state.bitcoinData
 * @param {number} month - Month (1-12)
 * @returns {string} Performance value
 */
function getMonthlyPerformance(month) {
  // Use bitcoinData to calculate actual historical performance by month
  const monthlyReturns = [];
  
  // Iterate through the Bitcoin data
  for (let i = 1; i < state.bitcoinData.length; i++) {
    const currentData = state.bitcoinData[i];
    const prevData = state.bitcoinData[i-1];
    
    // Check if this data point is for the specified month
    const dataDate = new Date(currentData.date);
    if (dataDate.getMonth() + 1 === month) {
      // If we have previous data to compare with, calculate return
      if (prevData) {
        const monthlyReturn = (currentData.price / prevData.price - 1) * 100;
        monthlyReturns.push(monthlyReturn);
      }
    }
  }
  
  // Calculate the average return for this month
  let avgReturn = 0;
  if (monthlyReturns.length > 0) {
    avgReturn = monthlyReturns.reduce((sum, val) => sum + val, 0) / monthlyReturns.length;
  }
  
  return avgReturn > 0 ? `+${avgReturn.toFixed(1)}` : avgReturn.toFixed(1);
}

/**
 * Get month volatility characterization based on historical bitcoin data
 * @param {number} month - Month (1-12)
 * @returns {string} Volatility description
 */
function getMonthVolatilityCharacterization(month) {
  // Calculate volatility statistics for the specified month
  const monthlyReturns = [];
  
  // Iterate through the Bitcoin data
  for (let i = 1; i < state.bitcoinData.length; i++) {
    const currentData = state.bitcoinData[i];
    const prevData = state.bitcoinData[i-1];
    
    // Check if this data point is for the specified month
    const dataDate = new Date(currentData.date);
    if (dataDate.getMonth() + 1 === month) {
      // If we have previous data to compare with, calculate return
      if (prevData) {
        const dailyReturn = (currentData.price / prevData.price - 1) * 100;
        monthlyReturns.push(dailyReturn);
      }
    }
  }
  
  // Calculate volatility (standard deviation of returns)
  const volatility = calculateStandardDeviation(monthlyReturns);
  
  // Get the average volatility across all months for comparison
  const allMonthsVolatility = [];
  for (let m = 1; m <= 12; m++) {
    const monthReturns = [];
    
    // Gather returns for this month
    for (let i = 1; i < state.bitcoinData.length; i++) {
      const currentData = state.bitcoinData[i];
      const prevData = state.bitcoinData[i-1];
      
      const dataDate = new Date(currentData.date);
      if (dataDate.getMonth() + 1 === m) {
        if (prevData) {
          const dailyReturn = (currentData.price / prevData.price - 1) * 100;
          monthReturns.push(dailyReturn);
        }
      }
    }
    
    const monthVol = calculateStandardDeviation(monthReturns);
    if (!isNaN(monthVol)) {
      allMonthsVolatility.push(monthVol);
    }
  }
  
  const avgVolatility = allMonthsVolatility.reduce((sum, val) => sum + val, 0) / allMonthsVolatility.length;
  
  // Determine characterization based on relative volatility
  const relativeVol = volatility / avgVolatility;
  
  if (relativeVol > 1.5) {
    return "very high";
  } else if (relativeVol > 1.2) {
    return "high";
  } else if (relativeVol > 0.8) {
    return "moderate";
  } else if (relativeVol > 0.5) {
    return "low";
  } else {
    return "very low";
  }
}

/**
 * Get month crash frequency characterization using actual historical crash data
 * @param {number} month - Month (1-12)
 * @returns {string} Frequency description
 */
function getMonthCrashFrequency(month) {
  // Get crash data for the specified month
  const monthCrashes = state.historicalCrashes[month] || [];
  
  // Count crashes for all months
  const crashesByMonth = {};
  for (let m = 1; m <= 12; m++) {
    crashesByMonth[m] = (state.historicalCrashes[m] || []).length;
  }
  
  // Calculate average crashes per month
  const totalCrashes = Object.values(crashesByMonth).reduce((sum, count) => sum + count, 0);
  const avgCrashesPerMonth = totalCrashes / 12;
  
  // Calculate crash frequency ratio for the specified month
  const crashesForMonth = monthCrashes.length;
  const crashRatio = avgCrashesPerMonth > 0 ? crashesForMonth / avgCrashesPerMonth : 0;
  
  // Determine frequency description based on the ratio
  if (crashRatio > 1.5) {
    return "high";
  } else if (crashRatio > 1.2) {
    return "above average";
  } else if (crashRatio > 0.8) {
    return "average";
  } else if (crashRatio > 0.3) {
    return "below average";
  } else {
    return "very low";
  }
}

/**
 * Get analogous cycle positions from actual historical data
 * @param {number} cyclePosition - Current cycle position (0-1)
 * @returns {Array} Analogous historical periods
 */
function getAnalogousCyclePositions(cyclePosition) {
  // Define the range around the current cycle position to find analogs
  const positionRange = 0.1; // Look for historical periods within ±10% of current position
  
  // Find historical data points with similar cycle positions
  const analogs = [];
  const seen = new Set(); // Track already seen periods to avoid duplicates
  
  for (let i = 0; i < state.bitcoinData.length; i++) {
    const dataPoint = state.bitcoinData[i];
    
    // Skip if no cycle position data or outside our target range
    if (!dataPoint.cyclePosition || 
        Math.abs(dataPoint.cyclePosition - cyclePosition) > positionRange) {
      continue;
    }
    
    // Extract date for this data point
    const date = new Date(dataPoint.date);
    const periodKey = `${date.getFullYear()}-${date.getMonth() + 1}`;
    
    // Skip if we've already recorded this period
    if (seen.has(periodKey)) continue;
    seen.add(periodKey);
    
    // Calculate forward performance (90 days)
    let forwardPerformance = null;
    if (i + 90 < state.bitcoinData.length) {
      const futurePrice = state.bitcoinData[i + 90].price;
      forwardPerformance = ((futurePrice / dataPoint.price) - 1) * 100;
    }
    
    // Skip periods without forward performance data
    if (forwardPerformance === null) continue;
    
    // Extract month and year for readable period name
    const monthName = monthNames[date.getMonth()];
    const year = date.getFullYear();
    
    // Get on-chain metrics if available
    const metrics = {};
    if (dataPoint.mvrv) metrics.mvrv = dataPoint.mvrv;
    if (dataPoint.nvt) metrics.nvt = dataPoint.nvt;
    
    // Create description based on performance and position
    let description;
    if (forwardPerformance > 50) {
      description = `Strong bullish period at similar cycle position (${(dataPoint.cyclePosition * 100).toFixed(0)}%)`;
    } else if (forwardPerformance > 20) {
      description = `Moderate uptrend following this similar cycle position (${(dataPoint.cyclePosition * 100).toFixed(0)}%)`;
    } else if (forwardPerformance > -20) {
      description = `Consolidation period at similar cycle position (${(dataPoint.cyclePosition * 100).toFixed(0)}%)`;
    } else {
      description = `Significant correction following this cycle position (${(dataPoint.cyclePosition * 100).toFixed(0)}%)`;
    }
    
    // Format key metrics for display
    const keyMetrics = [
      dataPoint.mvrv ? `MVRV: ${dataPoint.mvrv.toFixed(2)}` : '',
      dataPoint.nvt ? `NVT: ${dataPoint.nvt.toFixed(2)}` : '',
      `Cycle: ${(dataPoint.cyclePosition * 100).toFixed(0)}%`
    ].filter(Boolean).join(', ');
    
    // Add this analog period to our results
    analogs.push({
      period: `${monthName} ${year}`,
      performance: Math.round(forwardPerformance),
      description,
      keyMetrics
    });
  }
  
  // Sort by how closely the cycle position matches
  analogs.sort((a, b) => {
    // If we have less than 3 periods, just return them all sorted by date (most recent first)
    if (analogs.length < 3) {
      return a.period.localeCompare(b.period);
    }
    
    // Otherwise, sort by performance magnitude (to show a range of possible outcomes)
    return Math.abs(b.performance) - Math.abs(a.performance);
  });
  
  // If we don't have enough historical analogs, use some sensible defaults for early/mid/late cycle
  if (analogs.length < 2) {
    // Early cycle defaults (0-0.3)
    if (cyclePosition <= 0.3) {
      analogs.push({
        period: "Post-Accumulation Phase",
        performance: 42,
        description: "Early bull cycle after extended bear market, characterized by skepticism despite improving fundamentals",
        keyMetrics: "MVRV: ~1.2, NVT: ~28, Beginning of uptrend"
      });
    }
    // Mid cycle defaults (0.3-0.6)
    else if (cyclePosition <= 0.6) {
      analogs.push({
        period: "Mid-Cycle Trend",
        performance: 25,
        description: "Mid-cycle with established uptrend, often including healthy pullbacks within the broader bull structure",
        keyMetrics: "MVRV: ~2.0, NVT: ~45, Established uptrend"
      });
    }
    // Late cycle defaults (0.6-1.0)
    else {
      analogs.push({
        period: "Late-Cycle Dynamics",
        performance: -30,
        description: "Late-cycle market conditions with increasing volatility and valuation concerns",
        keyMetrics: "MVRV: ~3.5, NVT: ~65, Extended uptrend"
      });
    }
  }
  
  return analogs.slice(0, 3); // Return the top 3 analogs
}

/**
 * Get analogous metric periods from actual historical data
 * @param {Object} metrics - Current metrics
 * @returns {Array} Analogous historical periods
 */
function getAnalogousMetricPeriods(metrics) {
  // Extract current metric values
  const mvrvValue = metrics.mvrv ? metrics.mvrv.value : null;
  const nvtValue = metrics.nvt ? metrics.nvt.value : null;
  const cyclePosition = metrics.cyclePosition || 0.5;
  
  // Define similarity thresholds
  const mvrvThreshold = mvrvValue ? mvrvValue * 0.3 : 0.6; // 30% variation allowed
  const nvtThreshold = nvtValue ? nvtValue * 0.3 : 15; // 30% variation allowed
  const cycleThreshold = 0.15; // ±15% in cycle position
  
  // Find historical periods with similar metrics
  const analogs = [];
  const seen = new Set(); // Track already seen periods to avoid duplicates
  
  for (let i = 0; i < state.bitcoinData.length; i++) {
    const dataPoint = state.bitcoinData[i];
    
    // Skip if required metrics are missing
    if (!dataPoint.mvrv && !dataPoint.nvt && !dataPoint.cyclePosition) {
      continue;
    }
    
    // Calculate metric similarity
    let mvrvMatch = mvrvValue === null || dataPoint.mvrv === undefined ? true : 
                   Math.abs(dataPoint.mvrv - mvrvValue) <= mvrvThreshold;
    
    let nvtMatch = nvtValue === null || dataPoint.nvt === undefined ? true : 
                  Math.abs(dataPoint.nvt - nvtValue) <= nvtThreshold;
    
    let cycleMatch = dataPoint.cyclePosition === undefined ? true : 
                    Math.abs(dataPoint.cyclePosition - cyclePosition) <= cycleThreshold;
    
    // Need at least two of three metrics to match for a valid analog
    const matchCount = [mvrvMatch, nvtMatch, cycleMatch].filter(Boolean).length;
    if (matchCount < 2) continue;
    
    // Extract date for this data point
    const date = new Date(dataPoint.date);
    const periodKey = `${date.getFullYear()}-${date.getMonth() + 1}`;
    
    // Skip if we've already recorded this period
    if (seen.has(periodKey)) continue;
    seen.add(periodKey);
    
    // Calculate forward performance (60 days)
    let forwardPerformance = null;
    if (i + 60 < state.bitcoinData.length) {
      const futurePrice = state.bitcoinData[i + 60].price;
      forwardPerformance = ((futurePrice / dataPoint.price) - 1) * 100;
    }
    
    // Skip periods without forward performance data
    if (forwardPerformance === null) continue;
    
    // Extract month and year for readable period name
    const monthName = monthNames[date.getMonth()];
    const year = date.getFullYear();
    
    // Create description based on performance and metric similarities
    let description;
    if (forwardPerformance > 50) {
      description = `Strong bullish period with similar metrics resulting in significant appreciation`;
    } else if (forwardPerformance > 20) {
      description = `Moderate uptrend following this similar combination of on-chain metrics`;
    } else if (forwardPerformance > -20) {
      description = `Consolidation period with comparable on-chain metric readings`;
    } else {
      description = `Correction period following similar on-chain metrics configuration`;
    }
    
    // Format metrics for display
    const metricValues = {
      "MVRV": dataPoint.mvrv !== undefined ? dataPoint.mvrv.toFixed(2) : "N/A",
      "NVT": dataPoint.nvt !== undefined ? dataPoint.nvt.toFixed(2) : "N/A",
      "Cycle": dataPoint.cyclePosition !== undefined ? `${(dataPoint.cyclePosition * 100).toFixed(0)}%` : "N/A"
    };
    
    // Add this analog period to our results
    analogs.push({
      period: `${monthName} ${year}`,
      performance: Math.round(forwardPerformance),
      description,
      metrics: metricValues
    });
  }
  
  // Sort by closest overall metric match
  analogs.sort((a, b) => {
    // If we have less than 3 periods, sort by performance to show range of outcomes
    if (analogs.length < 3) {
      return Math.abs(b.performance) - Math.abs(a.performance);
    }
    
    // Calculate similarity score (lower is better)
    const aScore = calculateSimilarityScore(a.metrics, metrics);
    const bScore = calculateSimilarityScore(b.metrics, metrics);
    
    return aScore - bScore;
  });
  
  // If we don't have enough historical analogs, create placeholder analogs based on the current metrics
  if (analogs.length < 2) {
    if (mvrvValue > 2.5 && (nvtValue === null || nvtValue > 50)) {
      // High valuation metrics
      analogs.push({
        period: "High Valuation Period",
        performance: -30,
        description: "Historical period with elevated valuation metrics suggesting caution",
        metrics: {
          "MVRV": mvrvValue ? mvrvValue.toFixed(2) : "N/A",
          "NVT": nvtValue ? nvtValue.toFixed(2) : "N/A",
          "Cycle": `${(cyclePosition * 100).toFixed(0)}%`
        }
      });
    } else if (mvrvValue < 1.5 && (nvtValue === null || nvtValue < 35)) {
      // Low valuation metrics
      analogs.push({
        period: "Value Accumulation Period",
        performance: 50,
        description: "Historical period with undervalued metrics suggesting opportunity",
        metrics: {
          "MVRV": mvrvValue ? mvrvValue.toFixed(2) : "N/A",
          "NVT": nvtValue ? nvtValue.toFixed(2) : "N/A",
          "Cycle": `${(cyclePosition * 100).toFixed(0)}%`
        }
      });
    } else {
      // Moderate valuation metrics
      analogs.push({
        period: "Neutral Valuation Period",
        performance: 15,
        description: "Historical period with neutral valuation metrics",
        metrics: {
          "MVRV": mvrvValue ? mvrvValue.toFixed(2) : "N/A",
          "NVT": nvtValue ? nvtValue.toFixed(2) : "N/A",
          "Cycle": `${(cyclePosition * 100).toFixed(0)}%`
        }
      });
    }
  }
  
  return analogs.slice(0, 3); // Return the top 3 analogs
}

/**
 * Calculate similarity score between current metrics and historical metrics
 * @param {Object} historicalMetrics - Historical metrics object
 * @param {Object} currentMetrics - Current metrics object
 * @returns {number} Similarity score (lower is better)
 */
function calculateSimilarityScore(historicalMetrics, currentMetrics) {
  let score = 0;
  
  // MVRV similarity
  if (historicalMetrics.MVRV !== "N/A" && currentMetrics.mvrv) {
    const mvrvDiff = Math.abs(parseFloat(historicalMetrics.MVRV) - currentMetrics.mvrv.value);
    score += mvrvDiff / currentMetrics.mvrv.value;
  }
  
  // NVT similarity
  if (historicalMetrics.NVT !== "N/A" && currentMetrics.nvt) {
    const nvtDiff = Math.abs(parseFloat(historicalMetrics.NVT) - currentMetrics.nvt.value);
    score += nvtDiff / currentMetrics.nvt.value;
  }
  
  // Cycle position similarity
  if (historicalMetrics.Cycle !== "N/A" && currentMetrics.cyclePosition !== undefined) {
    const cyclePct = parseFloat(historicalMetrics.Cycle.replace('%', '')) / 100;
    const cycleDiff = Math.abs(cyclePct - currentMetrics.cyclePosition);
    score += cycleDiff;
  }
  
  return score;
}

/**
 * Get cycle phase description from knowledge graph
 * @param {number} cyclePosition - Cycle position (0-1)
 * @returns {string} Description
 */
function getCyclePhaseDescription(cyclePosition) {
  // Get cycle entity from knowledge graph
  const cycleEntity = knowledgeGraph.getEntity('market_cycle_position');
  
  if (!cycleEntity || !cycleEntity.interpretation) {
    // Fallback if knowledge graph data is not available
    if (cyclePosition <= 0.2) return "early accumulation";
    if (cyclePosition <= 0.4) return "early bull";
    if (cyclePosition <= 0.6) return "mid-cycle";
    if (cyclePosition <= 0.8) return "late uptrend";
    return "potential market top";
  }
  
  // Determine which range the position falls into
  for (const [rangeKey, description] of Object.entries(cycleEntity.interpretation)) {
    const rangeParts = rangeKey.replace('range_', '').split('_').map(Number);
    if (rangeParts.length === 2) {
      const [min, max] = rangeParts;
      const minPct = min / 100;
      const maxPct = max / 100;
      
      if (cyclePosition >= minPct && cyclePosition <= maxPct) {
        // Return the corresponding phase name
        // Extract just the phase name from the description if needed
        const phaseMatch = description.match(/^([^:]+):/);
        return phaseMatch ? phaseMatch[1].toLowerCase() : description.split('.')[0].toLowerCase();
      }
    }
  }
  
  // Fallback
  return "mid-cycle";
}

/**
 * Get cycle phase performance characterization
 * @param {number} cyclePosition - Cycle position (0-1)
 * @returns {string} Performance description
 */
function getCyclePhasePerformance(cyclePosition) {
  if (cyclePosition <= 0.2) return "strongly positive";
  if (cyclePosition <= 0.4) return "positive";
  if (cyclePosition <= 0.6) return "mixed but generally positive";
  if (cyclePosition <= 0.8) return "volatile with increasing downside risk";
  return "generally negative";
}

/**
 * Get cycle phase volatility characterization
 * @param {number} cyclePosition - Cycle position (0-1)
 * @returns {string} Volatility description
 */
function getCyclePhaseVolatility(cyclePosition) {
  if (cyclePosition <= 0.2) return "low";
  if (cyclePosition <= 0.4) return "moderate";
  if (cyclePosition <= 0.6) return "increasing";
  if (cyclePosition <= 0.8) return "high";
  return "extreme";
}

/**
 * Get metric similarity assessment
 * @param {Object} metrics - Current metrics
 * @returns {string} Similarity assessment
 */
function getMetricSimilarityAssessment(metrics) {
  const mvrvValue = metrics.mvrv ? metrics.mvrv.value : 2.0;
  const nvtValue = metrics.nvt ? metrics.nvt.value : 40;
  
  if (mvrvValue > 3.0 && nvtValue > 60) {
    return "strong similarities to historical market tops";
  } else if (mvrvValue > 2.5 || nvtValue > 50) {
    return "similarities to periods of elevated valuation";
  } else if (mvrvValue < 1.0 && nvtValue < 30) {
    return "strong similarities to historical market bottoms";
  } else if (mvrvValue < 1.5 && nvtValue < 35) {
    return "similarities to value accumulation phases";
  } else {
    return "moderate similarities to mid-cycle consolidation periods";
  }
}

/**
 * Get current risk from state
 * @returns {number} Current risk value
 */
function getCurrentRisk() {
  const currentMonth = new Date().getMonth() + 1;
  const currentRisk = state.riskByMonth[state.currentTimeframe || 30][currentMonth];
  
  if (typeof currentRisk === 'object' && currentRisk !== null) {
    return currentRisk.risk;
  }
  
  return currentRisk || 0.5;
}

/**
 * Get current risk level based on risk value
 * @returns {string} Risk level description
 */
function getCurrentRiskLevel() {
  const riskValue = getCurrentRisk();
  
  if (riskValue >= 0.8) return "Extreme";
  if (riskValue >= 0.65) return "High";
  if (riskValue >= 0.45) return "Moderate";
  if (riskValue >= 0.25) return "Low";
  return "Very Low";
}

/**
 * Helper function for creating risk displays
 * @param {number} percentage - Risk percentage
 * @returns {string} HTML for risk display
 */
function createRiskDisplay(percentage) {
  return `
    <div class="risk-container">
      <div class="risk-percentage">
        ${percentage}%
      </div>
      <div class="progress-container">
        <div class="progress-fill" style="width: ${percentage}%;"></div>
      </div>
      <div class="progress-labels">
        <span>0%</span>
        <span>100%</span>
      </div>
    </div>
  `;
}

/**
 * Handle educational query intent
 * @param {string} message - User message
 * @param {number} sentiment - Message sentiment
 * @param {Object} processedMessage - NLU-processed message with entities
 * @returns {Object} Response with text and visual
 */
function handleEducationalQuery(message, sentiment, processedMessage) {
  // Extract the topic from entities or message
  const entities = processedMessage.entities;
  let topic = ''; // Default topic
  let visual = null; // Initialize visual to null

  // Check if we have a knowledge graph concept entity
  if (entities.concept && entities.concept.id) { // Ensure concept.id exists
    // Use knowledge graph for explanation
    const conceptId = entities.concept.id;
    const userLevel = conversationContext.userProfile.knowledgeLevel || "intermediate"; // Default if undefined

   const explanation = knowledgeGraph.getRichExplanation(conceptId, userLevel);

    const relatedEntities = knowledgeGraph.getRelatedEntities(conceptId); // Fetch related entities

    if (explanation) {
      // Create visual element based on concept type, now passing relatedEntities
      visual = createConceptVisual(conceptId, explanation, relatedEntities); // Pass relatedEntities

      // Generate text explanation
      let text = `${explanation.name ? explanation.name.replace(/_/g, ' ') : conceptId.replace(/_/g, ' ')} is ${explanation.definition || 'a concept in the knowledge graph.'} `;

      // Add interpretation for metrics (existing logic)
      if (explanation.interpretation_summary) {
         text += `Key interpretations include: ${explanation.interpretation_summary}. `;
      } else if (explanation.details && explanation.details.interpretation_levels) {
        // Fallback if interpretation_summary is not directly available
        const interpretations = Object.entries(explanation.details.interpretation_levels)
            .slice(0,2) // Take first two for brevity
            .map(([level, desc]) => `${level.replace(/_/g, ' ')}: "${desc.substring(0,70)}..."`)
            .join('; ');
        if (interpretations) {
            text += `For example, ${interpretations}. `;
        }
      }


      // Add relationship details from relatedEntities
      if (relatedEntities && relatedEntities.length > 0) {
        text += "\n\nThis concept is closely related to: ";
        const topRelations = relatedEntities.slice(0, 3); // Show top 3 relations
        text += topRelations.map(rel => {
          let relDesc = rel.description ? `(${rel.description.substring(0, 50)}...)` : '';
          // Ensure rel.name and rel.relationship are defined before trying to replace/use them
          const relName = rel.name ? rel.name.replace(/_/g, ' ') : 'an unknown concept';
          const relRelationship = rel.relationship ? rel.relationship.replace(/_/g, ' ') : 'related to';
          return `\n- **${relName}**: It ${relRelationship} ${conceptId.replace(/_/g, ' ')} ${relDesc}`;
        }).join("");
      }

      return {
        text: text,
        visual: visual // visual will be populated by createConceptVisual
      };
    }
  }

  // Fall back to original implementation if concept not found or no specific KG entity
  // This part of your original function can remain if you have other ways to determine topics
  if (entities.metric && entities.metric.mentioned) { // Ensure metric.mentioned exists
    topic = entities.metric.mentioned;
  } else if (/\b(model|calculation|algorithm)\b/i.test(message)) {
    topic = 'risk model';
  } else if (/\b(seasonality|seasonal)\b/i.test(message)) {
    topic = 'seasonality';
  } else if (/\b(cycle|halving)\b/i.test(message)) {
    topic = 'market cycle';
  } else {
    // If no specific topic is identified from entities or keywords,
    // try to find the most relevant general topic based on the message.
    // For now, we'll default to 'risk calculation' if nothing else fits.
    topic = 'risk calculation';
  }

  // Adjust explanation detail based on user knowledge level
  const userLevel = conversationContext.userProfile.knowledgeLevel || "intermediate";

  // Create educational content
  let explanationText = ''; // Renamed from 'explanation' to avoid conflict

  switch(topic.toLowerCase()) {
    case 'risk model':
      explanationText = generateModelExplanation(userLevel);
      visual = createModelVisual();
      break;
    case 'mvrv':
      explanationText = generateMVRVExplanation(userLevel);
      visual = createMetricVisual('MVRV');
      break;
    case 'nvt':
      explanationText = generateNVTExplanation(userLevel);
      visual = createMetricVisual('NVT');
      break;
    case 'seasonality':
      explanationText = "Bitcoin shows seasonal patterns in risk and volatility. The Calendar of Rekt analyzes these patterns to identify months with historically higher crash probabilities. Seasonality is one of several factors used in the model to generate risk assessments.";
      visual = createSeasonalityVisual();
      break;
    case 'market cycle':
      explanationText = "Bitcoin tends to move in cyclical patterns. These cycles often correlate with the halving events, which occur approximately every four years. The market cycle is divided into phases, from early accumulation (0-20%) to euphoria and market tops (80-100%).";
      visual = createMarketCycleVisual();
      break;
    default: // 'risk calculation' or any other fallback
      explanationText = generateGeneralExplanation(userLevel);
      // No specific visual for general explanation, or you can create one
      visual = null;
  }

  return {
    text: explanationText,
    visual: visual
  };
}


/**
 * Helper functions for educational content
 */
function generateModelExplanation(level) {
  if (level === 'advanced') {
    return "The Calendar of Rekt uses a Poisson-Gamma Bayesian model with seasonality adjustments. It calculates the posterior probability distribution for extreme market events (defined as daily returns below the 1st percentile) using conjugate priors. The model incorporates on-chain metrics, volatility adjustments, and market cycle position to refine crash probabilities.";
  } else if (level === 'intermediate') {
    return "The risk model analyzes historical Bitcoin crashes (extreme 1% daily moves) and calculates the probability of similar events occurring in each month. It incorporates seasonal patterns, volatility, and on-chain metrics to adjust the risk level. The model uses Bayesian statistics to update probabilities based on observed data.";
  } else {
    return "The risk model looks at Bitcoin's price history to find patterns in when crashes happen. It notices that some months have more crashes than others, and uses this pattern along with current market conditions to predict the chance of a crash happening soon.";
  }
}

function generateMVRVExplanation(level) {
  if (level === 'advanced') {
    return "MVRV (Market Value to Realized Value) is a ratio that compares bitcoin's market capitalization (current price × circulating supply) against its realized capitalization (price of each coin when it last moved × circulating supply). It's a powerful metric for identifying market tops and bottoms. Values above 3.5 historically indicate market overvaluation and increased crash risk, while values below 1.0 often indicate undervaluation and accumulation opportunities.";
  } else {
    return "MVRV ratio compares Bitcoin's current market price to the average price paid by investors. When it's high (above 3), it suggests the market might be overvalued and at higher risk of a correction. When it's low (below 1), it often indicates good buying opportunities. This metric helps identify whether Bitcoin is currently expensive or cheap relative to what investors paid.";
  }
}

function generateNVTExplanation(level) {
  if (level === 'advanced') {
    return "NVT (Network Value to Transactions) ratio is analogous to the P/E ratio in traditional markets. It compares Bitcoin's market capitalization to its daily transaction volume in USD, measuring how the network is valued relative to its utility. High NVT values indicate the network may be overvalued compared to the economic activity it supports, while low values suggest potential undervaluation. The ratio is particularly useful for identifying bubble conditions when price significantly outpaces fundamental usage.";
  } else {
    return "NVT ratio compares Bitcoin's price to how much value is being transferred on the network. Think of it like a P/E ratio for Bitcoin. When NVT is high, it means the price might be too high compared to actual Bitcoin usage, signaling increased risk. When it's low, it suggests Bitcoin might be undervalued based on how much it's being used for transactions.";
  }
}

function createModelVisual() {
  // Create a visual explanation of the model
  const visual = document.createElement('div');
  visual.className = 'rektbot-visual';
  
  visual.innerHTML = `
    <div style="background: rgba(30, 30, 30, 0.7); padding: 15px; border-radius: 10px; margin-top: 15px;">
      <div style="font-weight: bold; margin-bottom: 10px; color: var(--btc-orange);">Risk Model Components</div>
      <div style="display: flex; flex-wrap: wrap; gap: 10px;">
        <div style="flex: 1; min-width: 200px; background: rgba(0,0,0,0.2); padding: 10px; border-radius: 6px;">
          <div style="font-weight: bold; margin-bottom: 5px;">Historical Data</div>
          <div style="font-size: 0.9rem; opacity: 0.8;">Analyzes extreme price moves (1st percentile daily returns) across Bitcoin's history</div>
        </div>
        <div style="flex: 1; min-width: 200px; background: rgba(0,0,0,0.2); padding: 10px; border-radius: 6px;">
          <div style="font-weight: bold; margin-bottom: 5px;">Seasonal Patterns</div>
          <div style="font-size: 0.9rem; opacity: 0.8;">Adjusts for monthly variations in crash frequency seen throughout Bitcoin's history</div>
        </div>
        <div style="flex: 1; min-width: 200px; background: rgba(0,0,0,0.2); padding: 10px; border-radius: 6px;">
          <div style="font-weight: bold; margin-bottom: 5px;">On-Chain Metrics</div>
          <div style="font-size: 0.9rem; opacity: 0.8;">Incorporates MVRV, NVT, and other blockchain data to refine crash probabilities</div>
        </div>
        <div style="flex: 1; min-width: 200px; background: rgba(0,0,0,0.2); padding: 10px; border-radius: 6px;">
          <div style="font-weight: bold; margin-bottom: 5px;">Market Sentiment</div>
          <div style="font-size: 0.9rem; opacity: 0.8;">Adjusts risk based on current market sentiment from news and social media</div>
        </div>
      </div>
    </div>
  `;
  
  return visual;
}

function createMetricVisual(metricType) {
  // Create a visual explanation of a specific metric
  const visual = document.createElement('div');
  visual.className = 'rektbot-visual';
  
  // Different visuals based on metric type
  if (metricType === 'MVRV') {
    visual.innerHTML = `
      <div style="background: rgba(30, 30, 30, 0.7); padding: 15px; border-radius: 10px; margin-top: 15px;">
        <div style="font-weight: bold; margin-bottom: 10px; color: var(--btc-orange);">MVRV Ratio Interpretation</div>
        <div style="display: flex; flex-direction: column; gap: 10px;">
          <div style="display: flex; align-items: center; gap: 10px;">
            <div style="width: 60px; text-align: center; font-weight: bold; color: #ff3b30;">3.5+</div>
            <div style="flex: 1; background: rgba(255, 59, 48, 0.3); padding: 8px; border-radius: 4px; border-left: 3px solid #ff3b30;">
              Extreme market euphoria - historically coincides with market tops and high crash probability
            </div>
          </div>
          <div style="display: flex; align-items: center; gap: 10px;">
            <div style="width: 60px; text-align: center; font-weight: bold; color: #ff9500;">2-3.5</div>
            <div style="flex: 1; background: rgba(255, 149, 0, 0.3); padding: 8px; border-radius: 4px; border-left: 3px solid #ff9500;">
              Elevated market valuation - increased risk but not yet at extreme levels
            </div>
          </div>
          <div style="display: flex; align-items: center; gap: 10px;">
            <div style="width: 60px; text-align: center; font-weight: bold; color: #ffcc00;">1-2</div>
            <div style="flex: 1; background: rgba(255, 204, 0, 0.3); padding: 8px; border-radius: 4px; border-left: 3px solid #ffcc00;">
              Fair value range - typical market conditions with moderate risk
            </div>
          </div>
          <div style="display: flex; align-items: center; gap: 10px;">
            <div style="width: 60px; text-align: center; font-weight: bold; color: #34c759;">< 1</div>
            <div style="flex: 1; background: rgba(52, 199, 89, 0.3); padding: 8px; border-radius: 4px; border-left: 3px solid #34c759;">
              Undervalued territory - historically excellent accumulation zone with reduced crash risk
            </div>
          </div>
        </div>
      </div>
    `;
  } else if (metricType === 'NVT') {
    visual.innerHTML = `
      <div style="background: rgba(30, 30, 30, 0.7); padding: 15px; border-radius: 10px; margin-top: 15px;">
        <div style="font-weight: bold; margin-bottom: 10px; color: var(--btc-orange);">NVT Ratio Interpretation</div>
        <div style="display: flex; flex-direction: column; gap: 10px;">
          <div style="display: flex; align-items: center; gap: 10px;">
            <div style="width: 60px; text-align: center; font-weight: bold; color: #ff3b30;">65+</div>
            <div style="flex: 1; background: rgba(255, 59, 48, 0.3); padding: 8px; border-radius: 4px; border-left: 3px solid #ff3b30;">
              Highly overvalued - network value far exceeds transaction activity, indicating high risk
            </div>
          </div>
          <div style="display: flex; align-items: center; gap: 10px;">
            <div style="width: 60px; text-align: center; font-weight: bold; color: #ff9500;">45-65</div>
            <div style="flex: 1; background: rgba(255, 149, 0, 0.3); padding: 8px; border-radius: 4px; border-left: 3px solid #ff9500;">
              Moderately elevated - price appreciation outpacing utility growth, suggesting caution
            </div>
          </div>
          <div style="display: flex; align-items: center; gap: 10px;">
            <div style="width: 60px; text-align: center; font-weight: bold; color: #ffcc00;">30-45</div>
            <div style="flex: 1; background: rgba(255, 204, 0, 0.3); padding: 8px; border-radius: 4px; border-left: 3px solid #ffcc00;">
              Fair value range - balanced relationship between price and network activity
            </div>
          </div>
          <div style="display: flex; align-items: center; gap: 10px;">
            <div style="width: 60px; text-align: center; font-weight: bold; color: #34c759;">< 30</div>
            <div style="flex: 1; background: rgba(52, 199, 89, 0.3); padding: 8px; border-radius: 4px; border-left: 3px solid #34c759;">
              Undervalued - high transaction activity relative to market cap, suggesting strong fundamentals
            </div>
          </div>
        </div>
      </div>
    `;
  } else {
    // Generic visual for other metrics
    visual.innerHTML = `
      <div style="background: rgba(30, 30, 30, 0.7); padding: 15px; border-radius: 10px; margin-top: 15px;">
        <div style="font-weight: bold; margin-bottom: 10px; color: var(--btc-orange);">${metricType} Analysis</div>
        <div style="font-size: 0.95rem; opacity: 0.9;">
          This metric helps assess Bitcoin market conditions by examining blockchain data.
          The model incorporates this with other factors to generate crash risk probabilities.
        </div>
</div>
    `;
  }
  
  return visual;
}

function createSeasonalityVisual() {
  // Create a visual for seasonality explanation
  const visual = document.createElement('div');
  visual.className = 'rektbot-visual';
  
  // Calculate monthly performance from bitcoinData
  const monthlyPerformance = {};
  
  for (let month = 1; month <= 12; month++) {
    const monthlyReturns = [];
    
    for (let i = 1; i < state.bitcoinData.length; i++) {
      const currentData = state.bitcoinData[i];
      const prevData = state.bitcoinData[i-1];
      
      const dataDate = new Date(currentData.date);
      if (dataDate.getMonth() + 1 === month) {
        if (prevData) {
          const monthlyReturn = (currentData.price / prevData.price - 1) * 100;
          monthlyReturns.push(monthlyReturn);
        }
      }
    }
    
    if (monthlyReturns.length > 0) {
      monthlyPerformance[month] = monthlyReturns.reduce((sum, val) => sum + val, 0) / monthlyReturns.length;
    } else {
      monthlyPerformance[month] = 0;
    }
  }
  
  // Get max value for scaling
  const maxAbs = Math.max(...Object.values(monthlyPerformance).map(Math.abs));
  
  visual.innerHTML = `
    <div style="background: rgba(30, 30, 30, 0.7); padding: 15px; border-radius: 10px; margin-top: 15px;">
      <div style="font-weight: bold; margin-bottom: 10px; color: var(--btc-orange);">Bitcoin Seasonal Performance</div>
      
      <div style="margin-bottom: 15px;">
        <div style="display: flex; align-items: center; height: 150px; margin-bottom: 5px;">
          ${Object.entries(monthlyPerformance).map(([month, value]) => {
            const height = Math.abs(value) / maxAbs * 100;
            const color = value >= 0 ? '#34c759' : '#ff3b30';
            return `
              <div style="flex: 1; display: flex; flex-direction: column; align-items: center; height: 100%;">
                <div style="flex: 1; display: flex; align-items: ${value >= 0 ? 'flex-end' : 'flex-start'};">
                  <div style="width: 80%; background: ${color}; height: ${height}%; position: relative;">
                    <span style="position: absolute; ${value >= 0 ? 'bottom: 0;' : 'top: 0;'} left: 0; right: 0; text-align: center; font-size: 0.8rem; color: white;">${value.toFixed(1)}%</span>
                  </div>
                </div>
                <div style="width: 100%; height: 1px; background: rgba(255,255,255,0.3);"></div>
              </div>
            `;
          }).join('')}
        </div>
        <div style="display: flex;">
          ${monthNames.map((name, i) => `
            <div style="flex: 1; text-align: center; font-size: 0.75rem;">${name.substring(0, 3)}</div>
          `).join('')}
        </div>
      </div>
      
      <div style="margin-top: 20px;">
        <div style="font-weight: bold; margin-bottom: 5px;">Seasonal Patterns:</div>
        <ul style="margin: 5px 0; padding-left: 20px; font-size: 0.9rem;">
          ${getSeasonalHighlights(monthlyPerformance)}
        </ul>
      </div>
    </div>
  `;
  
  return visual;
}

/**
 * Generate highlights about seasonal patterns
 * @param {Object} monthlyPerformance - Performance by month
 * @returns {string} HTML list items with highlights
 */
function getSeasonalHighlights(monthlyPerformance) {
  // Find strongest months (top 3)
  const sortedMonths = Object.entries(monthlyPerformance)
    .sort((a, b) => b[1] - a[1]);
  
  const strongestMonths = sortedMonths.slice(0, 3);
  const weakestMonths = sortedMonths.slice(-3).reverse();
  
  // Create list items
  let highlights = '';
  
  highlights += `<li><strong>Strongest Months:</strong> ${strongestMonths.map(([m, val]) => 
    `${monthNames[parseInt(m)-1]} (${val > 0 ? '+' : ''}${val.toFixed(1)}%)`).join(', ')}</li>`;
  
  highlights += `<li><strong>Weakest Months:</strong> ${weakestMonths.map(([m, val]) => 
    `${monthNames[parseInt(m)-1]} (${val > 0 ? '+' : ''}${val.toFixed(1)}%)`).join(', ')}</li>`;
  
  // Add volatility patterns
  const volatilityByMonth = {};
  for (let month = 1; month <= 12; month++) {
    volatilityByMonth[month] = getMonthVolatilityCharacterization(month);
  }
  
  const highVolMonths = Object.entries(volatilityByMonth)
    .filter(([_, vol]) => vol === 'high' || vol === 'very high')
    .map(([m, _]) => monthNames[parseInt(m)-1]);
  
  if (highVolMonths.length > 0) {
    highlights += `<li><strong>Volatility Peaks:</strong> ${highVolMonths.join(', ')} show highest historical volatility</li>`;
  }
  
  return highlights;
}

function createMarketCycleVisual() {
  // Create a visual for market cycle explanation
  const visual = document.createElement('div');
  visual.className = 'rektbot-visual';
  
  visual.innerHTML = `
    <div style="background: rgba(30, 30, 30, 0.7); padding: 15px; border-radius: 10px; margin-top: 15px;">
      <div style="font-weight: bold; margin-bottom: 10px; color: var(--btc-orange);">Bitcoin Market Cycle Phases</div>
      
      <div style="width: 100%; height: 30px; background: linear-gradient(90deg, #34c759, #90ee90, #ffcc00, #ff9500, #ff3b30); border-radius: 6px; margin-bottom: 8px;"></div>
      <div style="display: flex; justify-content: space-between; margin-bottom: 15px; font-size: 0.8rem;">
        <span>0% (Bottom)</span>
        <span>25%</span>
        <span>50%</span>
        <span>75%</span>
        <span>100% (Top)</span>
      </div>
      
      <div style="display: flex; flex-direction: column; gap: 12px; margin-top: 15px;">
        <div style="padding: 10px; background: rgba(52, 199, 89, 0.2); border-left: 3px solid #34c759; border-radius: 4px;">
          <div style="font-weight: bold; margin-bottom: 3px;">Accumulation Phase (0-20%)</div>
          <div style="font-size: 0.9rem;">Period following market bottoms characterized by low prices, bearish sentiment despite improving fundamentals, and accumulation by long-term holders.</div>
        </div>
        
        <div style="padding: 10px; background: rgba(144, 238, 144, 0.2); border-left: 3px solid #90ee90; border-radius: 4px;">
          <div style="font-weight: bold; margin-bottom: 3px;">Early Bull Phase (20-40%)</div>
          <div style="font-size: 0.9rem;">Defined by increasing prices, improving on-chain metrics, and gradual shift from bearish to neutral market sentiment.</div>
        </div>
        
        <div style="padding: 10px; background: rgba(255, 204, 0, 0.2); border-left: 3px solid #ffcc00; border-radius: 4px;">
          <div style="font-weight: bold; margin-bottom: 3px;">Mid-Cycle (40-60%)</div>
          <div style="font-size: 0.9rem;">Characterized by established uptrend, increasing public interest, normal pullbacks and consolidations within the trend.</div>
        </div>
        
        <div style="padding: 10px; background: rgba(255, 149, 0, 0.2); border-left: 3px solid #ff9500; border-radius: 4px;">
          <div style="font-weight: bold; margin-bottom: 3px;">Late Bull Phase (60-80%)</div>
          <div style="font-size: 0.9rem;">Market shows increasing volatility, elevated valuation metrics, more mainstream attention, and increasing leverage.</div>
        </div>
        
        <div style="padding: 10px; background: rgba(255, 59, 48, 0.2); border-left: 3px solid #ff3b30; border-radius: 4px;">
          <div style="font-weight: bold; margin-bottom: 3px;">Market Top Phase (80-100%)</div>
          <div style="font-size: 0.9rem;">Period of euphoria, extreme valuations, maximum public participation, and significant divergences between price and fundamentals.</div>
        </div>
      </div>
    </div>
  `;
  
  return visual;
}

function generateGeneralExplanation(level) {
  return "The Calendar of Rekt uses a sophisticated risk model that analyzes historical Bitcoin price patterns, on-chain metrics, and market sentiment to calculate the probability of extreme price crashes in each month. It identifies seasonal patterns and adjusts for current market conditions to provide forward-looking risk assessments.";
}

/**
 * Handle generic/fallback responses
 * @param {string} message - User message
 * @returns {Object} Response with text and visual
 */
function handleGenericResponse(message) {
  // Try to extract potential topics from message
  let relatedTopic = null;
  
  for (const topic of REKTBOT_CONFIG.knowledgeTopics) {
    if (topic.keywords.some(keyword => message.toLowerCase().includes(keyword))) {
      relatedTopic = topic;
      break;
    }
  }
  
  let response = {
    text: "I'm not sure I fully understood your question. I can help with analyzing Bitcoin crash risk, on-chain metrics, strategy advice, and historical comparisons.",
    visual: null
  };
  
  // Add topic-specific suggestions
  if (relatedTopic) {
    switch(relatedTopic.id) {
      case "risk-model":
        response.text += " If you're asking about the risk model, try \"Explain the current risk level\" or \"What factors drive the risk calculation?\"";
        break;
      case "on-chain":
        response.text += " For on-chain metrics, try \"What does MVRV mean?\" or \"Explain the on-chain metrics.\"";
        break;
      case "cycles":
        response.text += " For market cycles, try \"Explain the market cycle position\" or \"Where are we in the Bitcoin cycle?\"";
        break;
      case "strategy":
        response.text += " For strategy advice, try \"What should I do based on current risk?\" or \"Is now a good time to buy?\"";
        break;
      case "technical":
        response.text += " For technical analysis, try \"What if Bitcoin drops 20%?\" or \"Predict next month's risk.\"";
        break;
    }
  }
  
  return response;
}

/**
 * Update suggestions based on conversation
 * @param {string} lastMessageType - Type of the last message
 */
function updateSuggestions(lastMessageType) {
  const suggestionContainer = document.querySelector('.rektBot-suggestions');
  if (!suggestionContainer) return;
  
  let suggestions = [];
  
  // Based on last message type
  switch (lastMessageType) {
    case 'risk_assessment':
      suggestions = [
        "What factors are driving risk?",
        "How should I adjust my strategy?",
        "Show historical comparison",
        "Explain the risk model"
      ];
      break;
    case 'strategy_advice':
      suggestions = [
        "What factors are driving risk?",
        "Explain the risk model",
        "Show historical comparison",
        "What does market cycle position mean?"
      ];
      break;
    case 'metric_analysis':
      suggestions = [
        "Current risk explanation",
        "What factors are driving risk?",
        "How should I adjust my strategy?",
        "What does MVRV mean?"
      ];
      break;
    case 'market_prediction':
      suggestions = [
        "Current risk explanation",
        "What factors are driving risk?",
        "What if Bitcoin drops 20%?",
        "Show historical comparison"
      ];
      break;
    case 'scenario_simulation':
      suggestions = [
        "Current risk explanation",
        "What factors are driving risk?",
        "How should I adjust my strategy?",
        "Predict next month's risk"
      ];
      break;
    case 'historical_comparison':
      suggestions = [
        "Current risk explanation",
        "What factors are driving risk?",
        "How should I adjust my strategy?",
        "Explain the risk model"
      ];
      break;
    case 'educational':
      suggestions = [
        "Explain MVRV in detail",
        "How does the risk model work?",
        "Explain NVT ratio",
        "Tell me about market cycles"
      ];
      break;
      case 'knowledge_explorer':
      suggestions = [
        "Explain MVRV Ratio",
        "Tell me about crash risk",
        "What is a market cycle?",
        "Explain Bitcoin halving"
      ];
      break;
    default:
      suggestions = REKTBOT_CONFIG.suggestionPrompts;
  }
  
  // Update suggestion chips
  suggestionContainer.innerHTML = suggestions.map(suggestion => 
    `<button class="suggestion-chip">${suggestion}</button>`
  ).join('');
  
  // Add event listeners to new chips
  suggestionContainer.querySelectorAll('.suggestion-chip').forEach(chip => {
    chip.addEventListener('click', function() {
      const userInput = document.getElementById('rektBot-user-input');
      if (userInput) {
        userInput.value = this.textContent;
        sendUserMessage();
      }
    });
  });
}

/**
 * Scroll the message container to the bottom
 */
function scrollToBottom() {
  const messagesContainer = document.getElementById('rektBot-messages');
  if (messagesContainer) {
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
  }
}

/**
 * Format time for message display
 * @param {Date} date - Date object
 * @returns {string} Formatted time string
 */
function formatTime(date) {
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

/**
 * Escape HTML in user input
 * @param {string} html - String that might contain HTML
 * @returns {string} Escaped string
 */
function escapeHtml(html) {
  const div = document.createElement('div');
  div.textContent = html;
  return div.innerHTML;
}

/**
 * Add custom CSS styles for the bot
 */
function addBotStyles() {
  // Check if styles are already added
  if (document.getElementById('rektBot-styles')) return;
  
  // Add link to enhanced styles
  const styleElement = document.createElement('link');
  styleElement.id = 'rektBot-styles';
  styleElement.rel = 'stylesheet';
  styleElement.href = '/src/assets/styles/rektbot.css';
  document.head.appendChild(styleElement);
  
  // Add enhanced styles
  const enhancedStyles = document.createElement('link');
  enhancedStyles.id = 'enhanced-rektBot-styles';
  enhancedStyles.rel = 'stylesheet';
  enhancedStyles.href = '/src/assets/styles/enhanced-rektbot.css';
  document.head.appendChild(enhancedStyles);
}

// Export additional functions for potential external use
export {
  updateRiskContext,
  updateRiskIndicator,
  processUserMessage,
  addBotMessage,
  closeBot,
  updateAvatarMood
};
