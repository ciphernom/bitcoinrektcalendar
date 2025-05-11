/**
 * RektBot - Bitcoin Risk Analysis Chatbot
 * 
 * An advanced conversational interface for interpreting the Calendar of Rekt
 * risk model outputs and providing actionable insights.
 * 
 * @version 2.0.0
 * @copyright 2025 Ciphernom
 */

import { state } from '../app.js';
import { formatDate, formatPercentage } from '../utils/formatting.js';
import { calculateStandardDeviation } from '../utils/statistics.js';
import { NaiveBayesClassifier } from '../core/naive-bayes-classifier.js';

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
    "Predict next month's risk"
  ],
  knowledgeTopics: [
    { id: "risk-model", name: "Risk Model", keywords: ["model", "calculation", "algorithm", "bayesian", "poisson"] },
    { id: "on-chain", name: "On-Chain Metrics", keywords: ["mvrv", "nvt", "metrics", "on-chain", "blockchain"] },
    { id: "cycles", name: "Market Cycles", keywords: ["cycle", "halving", "bull", "bear", "top", "bottom"] },
    { id: "strategy", name: "Trading Strategy", keywords: ["strategy", "trade", "position", "risk", "management"] },
    { id: "technical", name: "Technical Analysis", keywords: ["technical", "chart", "support", "resistance", "indicator"] }
  ]
};

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
  
  // Start with a collapsed state
  setTimeout(() => {
    // Show the bot tab
    const botTab = document.getElementById('rektBot-tab');
    if (botTab) botTab.classList.add('visible');
  }, 1500);
  
  // Return a resolved promise to maintain compatibility with app initialization chain
  return Promise.resolve(botState);
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
 * Process a user message and generate a response
 * @param {string} message - User message text
 */
function processUserMessage(message) {
  // Update context based on user message
  updateMessageContext(message);
  
  // Get sentiment using NBC
  const sentiment = botState.nbc ? botState.nbc.getSentimentScore(message) : 0;
  
  // Update avatar mood based on sentiment
  updateAvatarMood(sentiment > 0.3 ? 'bullish' : sentiment < -0.3 ? 'bearish' : 'neutral');
  
  // Classify the intent using patterns
  let handler = handleGenericResponse;
  
  for (const intent of botState.intentPatterns) {
    if (intent.pattern.test(message)) {
      handler = intent.handler;
      botState.context.lastQuestionType = intent.name;
      break;
    }
  }
  
  // Generate response using the identified handler
  const response = handler(message, sentiment);
  
  // Add bot message with HTML if visual response is included
  if (response.visual) {
    // Create container for text and visual
    const fullResponse = document.createElement('div');
    fullResponse.className = 'rektbot-full-response';
    
    // Add text
    const textElement = document.createElement('div');
    textElement.className = 'rektbot-text-response';
    textElement.textContent = response.text;
    fullResponse.appendChild(textElement);
    
    // Add visual
    fullResponse.appendChild(response.visual);
    
    // Send as HTML
    addBotMessage(fullResponse.outerHTML, true);
  } else {
    // Just text response
    addBotMessage(response.text);
  }
  
  // Update suggestions based on conversation
  updateSuggestions(botState.context.lastQuestionType);
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
 * Update avatar mood
 * @param {string} mood - The mood to display ('bullish', 'neutral', or 'bearish')
 */
function updateAvatarMood(mood) {
  if (!botState.avatar) return;
  
  // Remove all mood classes
  botState.avatar.classList.remove(
    'avatar-mood-bullish', 
    'avatar-mood-neutral', 
    'avatar-mood-bearish'
  );
  
  // Add the appropriate mood class
  botState.avatar.classList.add(`avatar-mood-${mood}`);
}

/**
 * Handle risk assessment intent
 * @param {string} message - User message
 * @returns {Object} Response with text and visual
 */
function handleRiskAssessment(message) {
  // Extract timeframe using simple regex
  const timeframeMatch = message.match(/(\d+)\s*days?/i);
  const timeframe = timeframeMatch ? parseInt(timeframeMatch[1]) : 30;
  
  // Create inline visualization
  const visual = document.createElement('div');
  visual.className = 'rektbot-visual';
  
  // Create mini risk gauge
  const gauge = document.createElement('div');
  gauge.className = 'mini-risk-gauge';
  
  // Get current risk from application state
  const currentMonth = new Date().getMonth() + 1;
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
  
  // Create gauge HTML
  gauge.innerHTML = `
    <div class="gauge-container">
      <div class="gauge">
        <div class="gauge-fill" style="width: ${riskPercentage}%;"></div>
        <div class="gauge-marker" style="left: ${riskPercentage}%;">
          <div class="gauge-value">${riskPercentage}%</div>
        </div>
      </div>
    </div>
    ${credibleInterval ? `<div style="text-align: center; font-size: 0.8rem; opacity: 0.7; margin-top: 5px;">95% Credible Interval: ${credibleInterval.lower}% - ${credibleInterval.upper}%</div>` : ''}
  `;
  
  visual.appendChild(gauge);
  
  // Add timeframe buttons
  const controls = document.createElement('div');
  controls.className = 'timeframe-controls';
  controls.innerHTML = `
    <button data-days="7">7d</button>
    <button data-days="30" class="active">30d</button>
    <button data-days="90">90d</button>
  `;
  
  // Add click handlers to buttons
  controls.querySelectorAll('button').forEach(btn => {
    btn.addEventListener('click', () => {
      const days = parseInt(btn.dataset.days);
      updateRiskGauge(gauge, days);
      
      // Update active state
      controls.querySelectorAll('button').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
    });
  });
  
  visual.appendChild(controls);
  
  // Get risk level description
  let riskLevel;
  if (riskValue >= 0.8) riskLevel = "Extreme";
  else if (riskValue >= 0.65) riskLevel = "High";
  else if (riskValue >= 0.45) riskLevel = "Moderate";
  else if (riskValue >= 0.25) riskLevel = "Low";
  else riskLevel = "Very Low";
  
  // Generate text response
  const text = `The risk of a significant Bitcoin price crash in the next ${timeframe} days is ${riskPercentage}% (${riskLevel} Risk). ${getRiskLevelDescription(riskValue)}`;
  
  return { text, visual };
}

/**
 * Get description for a risk level
 * @param {number} riskValue - Risk value (0-1)
 * @returns {string} Description
 */
function getRiskLevelDescription(riskValue) {
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
function handleStrategyAdvice(message) {
  // Get current risk level
  const currentMonth = new Date().getMonth() + 1;
  const currentRisk = state.riskByMonth[30][currentMonth];
  const riskValue = typeof currentRisk === 'object' ? currentRisk.risk : currentRisk;
  
  // Determine risk level
  let riskLevel;
  if (riskValue >= 0.8) riskLevel = "Extreme";
  else if (riskValue >= 0.65) riskLevel = "High";
  else if (riskValue >= 0.45) riskLevel = "Moderate";
  else if (riskValue >= 0.25) riskLevel = "Low";
  else riskLevel = "Very Low";
  
  // Get recommendations based on risk level
  const recommendations = getStrategyRecommendations(riskLevel);
  
  // Create visual component
  const visual = document.createElement('div');
  visual.className = 'rektbot-visual';
  
  // Strategy recommendations list
  visual.innerHTML = `
    <div class="strategy-header ${riskLevel.toLowerCase()}-risk">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
        <h3 style="margin: 0; font-size: 1.1rem; color: var(--btc-orange);">Strategy Recommendations:</h3>
        <span style="font-weight: bold;">${riskLevel} Risk (${(riskValue * 100).toFixed(1)}%)</span>
      </div>
    </div>
    
    <ul class="strategy-recommendations" style="margin: 10px 0; padding-left: 20px;">
      ${recommendations.map(rec => `<li>${rec}</li>`).join('')}
    </ul>
    
    <div style="font-size: 0.8rem; opacity: 0.7; margin-top: 10px; font-style: italic;">
      These recommendations are based on statistical patterns and historical market behavior, not financial advice.
    </div>
  `;
  
  // Generate text response
  const text = `Based on the current ${riskLevel} Risk level (${(riskValue * 100).toFixed(1)}%), here are some strategic considerations for your Bitcoin position.`;
  
  return { text, visual };
}

/**
 * Get strategy recommendations based on risk level
 * @param {string} riskLevel - Risk level
 * @returns {Array} Array of recommendation strings
 */
function getStrategyRecommendations(riskLevel) {
  switch (riskLevel) {
    case "Extreme":
      return [
        "Consider reducing position sizes to manage elevated crash risk",
        "Set strict stop losses to protect capital",
        "Prepare for potential 20-30% drawdowns based on historical patterns",
        "Avoid using leverage until risk levels decline"
      ];
    case "High":
      return [
        "Review portfolio allocation and consider rebalancing to reduce risk",
        "Set appropriate stop losses on higher-risk positions",
        "Be cautious with new entries, favoring lower timeframes and strong technical setups",
        "Maintain higher cash reserves for potential opportunities after volatility"
      ];
    case "Moderate":
      return [
        "Maintain balanced risk management with standard position sizing",
        "Continue regular portfolio monitoring and stick to your strategy",
        "Consider hedging strategies if risk increases further",
        "Use dollar-cost averaging for planned additions to your portfolio"
      ];
    case "Low":
      return [
        "Maintain normal risk management practices",
        "Potential opportunity to gradually increase positions on pullbacks",
        "Monitor for changes in risk factors that could elevate market risk",
        "Ideal environment for longer-term position building"
      ];
    case "Very Low":
      return [
        "Consider strategic accumulation during this period of reduced risk",
        "Maintain vigilance as extremely low risk periods often precede changes in market conditions",
        "Optimize positions while volatility remains low",
        "Good environment for implementing longer-term investment plans"
      ];
    default:
      return [
        "Maintain balanced risk management",
        "Follow your established investment strategy",
        "Monitor for changes in market conditions",
        "Consider consulting a financial advisor for personalized advice"
      ];
  }
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
        <div class="metric-value">${metrics.mvrv.value.toFixed(2)}</div>
        <div class="metric-details">
          <div class="${metrics.mvrv.change >= 0 ? 'positive' : 'negative'}">
            ${metrics.mvrv.change >= 0 ? '+' : ''}${metrics.mvrv.change.toFixed(2)}%
          </div>
          <div>Z-Score: ${metrics.mvrv.zScore.toFixed(2)}</div>
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
    
    let text = `The MVRV ratio is currently at ${metrics.mvrv.value.toFixed(2)}. `;
    
    if (metrics.mvrv.value > 3.5) {
      text += "This is in the high-risk zone historically associated with market tops. MVRV values above 3.5 have preceded major corrections in Bitcoin's history.";
    } else if (metrics.mvrv.value > 2.5) {
      text += "This shows significant market appreciation above realized value, suggesting elevated but not extreme market valuation.";
    } else if (metrics.mvrv.value > 1) {
      text += "This is in the neutral zone, indicating the market price is moderately above the aggregate cost basis of Bitcoin holders.";
    } else {
      text += "This is in the value zone where market price is below the average acquisition cost, historically a favorable accumulation area.";
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
        <div class="metric-value">${metrics.nvt.value.toFixed(2)}</div>
        <div class="metric-details">
          <div class="${metrics.nvt.change >= 0 ? 'positive' : 'negative'}">
            ${metrics.nvt.change >= 0 ? '+' : ''}${metrics.nvt.change.toFixed(2)}%
          </div>
          <div>Z-Score: ${metrics.nvt.zScore.toFixed(2)}</div>
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
    
    let text = `The NVT ratio is currently at ${metrics.nvt.value.toFixed(2)}. `;
    
    if (metrics.nvt.value > 65) {
      text += "This elevated reading suggests the market cap may be high relative to the economic activity on the network, which has historically preceded market corrections.";
    } else if (metrics.nvt.value > 45) {
      text += "This moderately elevated reading suggests caution, as the network's economic activity is not fully keeping pace with the market capitalization.";
    } else if (metrics.nvt.value > 30) {
      text += "This is in the neutral range, indicating a relatively balanced relationship between market value and network transaction activity.";
    } else {
      text += "This lower reading suggests strong network activity relative to market cap, which has historically been a positive indicator.";
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
        <div class="metric-value">${(metrics.cyclePosition * 100).toFixed(0)}%</div>
        <div class="metric-details">
          <div style="width: 100%; margin-top: 5px;">
            <div style="height: 8px; width: 100%; background: rgba(0,0,0,0.3); border-radius: 4px; overflow: hidden;">
              <div style="height: 100%; width: ${(metrics.cyclePosition * 100).toFixed(0)}%; background: linear-gradient(90deg, #34c759, #ffcc00, #ff3b30); border-radius: 4px;"></div>
            </div>
            <div style="display: flex; justify-content: space-between; font-size: 0.8rem; margin-top: 3px;">
              <span>Bottom (0%)</span>
              <span>Top (100%)</span>
            </div>
          </div>
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
    
    let text = `The current market cycle position is estimated at ${(metrics.cyclePosition * 100).toFixed(0)}%. `;
    
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
    
    return { text, visual };
  }
}

/**
 * Handle scenario simulation intent
 * @param {string} message - User message
 * @returns {Object} Response with text and visual
 */
function handleScenarioSimulation(message) {
  // Extract parameters using regex
  const percentMatch = message.match(/(\d+)(%|percent)/i);
  const percent = percentMatch ? parseInt(percentMatch[1]) : 20;
  
  // Determine if it's up or down
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
  
  // Get current price
  const currentPrice = state.bitcoinData[state.bitcoinData.length - 1].price;
  
  // Create scenario data (14 days)
  const days = 14;
  const labels = Array.from({length: days + 1}, (_, i) => `Day ${i}`);
  const baselineData = Array(days + 1).fill(currentPrice);
  
  // Create scenario data with the specified change
  const scenarioData = [...baselineData];
  
  // Apply scenario change
  for (let i = 1; i <= days; i++) {
    const changeRatio = i / days;
    scenarioData[i] = currentPrice * (1 + (signedPercent / 100) * changeRatio);
  }
  
  // Add chart to container
  const chart = document.createElement('canvas');
  chartContainer.appendChild(chart);
  
  // Create the chart
  setTimeout(() => {
    new Chart(chart, {
      type: 'line',
      data: {
        labels: labels,
        datasets: [
          {
            label: 'Current Trajectory',
            data: baselineData,
            borderColor: '#4bb543',
            borderDash: [5, 5],
            fill: false
          },
          {
            label: `${direction === 'drops' ? 'Crash' : 'Rally'} Scenario (${percent}%)`,
            data: scenarioData,
            borderColor: direction === 'drops' ? '#ff3b30' : '#4bb543',
            backgroundColor: direction === 'drops' ? 'rgba(255, 59, 48, 0.1)' : 'rgba(75, 181, 67, 0.1)',
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
    });
  }, 100);
  
  // Calculate risk change based on scenario
  const riskAdjustment = direction === 'drops' ? -0.2 : 0.15;
  
  const currentMonth = new Date().getMonth() + 1;
  const currentRisk = state.riskByMonth[30][currentMonth];
  const currentRiskValue = typeof currentRisk === 'object' ? currentRisk.risk : currentRisk;
  const adjustedRisk = Math.max(0.05, Math.min(0.95, currentRiskValue + riskAdjustment));
  
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
      updateButton.addEventListener('click', () => {
        const percentInput = visual.querySelector('#percent-input');
        const directionSelect = visual.querySelector('#direction-select');
        
        if (percentInput && directionSelect) {
          const newPercent = parseInt(percentInput.value) || 20;
          const newDirection = directionSelect.value === 'down';
          
          // Generate a new scenario response
          const newMessage = `what if bitcoin ${newDirection ? 'drops' : 'rises'} by ${newPercent}%`;
          const newResponse = handleScenarioSimulation(newMessage);
          
          // Replace the current visual with the new one
          if (newResponse.visual) {
            const parent = visual.parentNode;
            if (parent) {
              parent.replaceChild(newResponse.visual, visual);
            }
          }
        }
      });
    }
  }, 200);
  
  // Generate text response
  let text = `If Bitcoin ${direction} by ${percent}%, `;
  
  if (isDown) {
    if (percent > 30) {
      text += `this would represent a major correction. `;
    } else if (percent > 15) {
      text += `this would be a significant pullback. `;
    } else {
      text += `this would be a moderate dip. `;
    }
    
    text += `The crash probability would likely decrease to around ${(adjustedRisk * 100).toFixed(1)}% (from ${(currentRiskValue * 100).toFixed(1)}%) as some market excess would be cleared.`;
  } else {
    if (percent > 30) {
      text += `this would be a substantial rally. `;
    } else if (percent > 15) {
      text += `this would be a significant move up. `;
    } else {
      text += `this would be a moderate upward move. `;
    }
    
    text += `The crash probability would likely increase to around ${(adjustedRisk * 100).toFixed(1)}% (from ${(currentRiskValue * 100).toFixed(1)}%) due to increased market froth.`;
  }
  
  return { text, visual };
}

/**
 * Handle market prediction intent
 * @param {string} message - User message
 * @returns {Object} Response with text and visual
 */
function handleMarketPrediction(message) {
  // Extract timeframe
  const timeframeMatch = message.match(/(\d+)\s*(day|week|month)/i);
  let timeframe = 30; // Default to 30 days
  
  if (timeframeMatch) {
    const amount = parseInt(timeframeMatch[1]);
    const unit = timeframeMatch[2].toLowerCase();
    
    if (unit === 'week') {
      timeframe = amount * 7;
    } else if (unit === 'month') {
      timeframe = amount * 30;
    } else {
      timeframe = amount;
    }
  } else if (/week/i.test(message)) {
    timeframe = 7;
  } else if (/month/i.test(message)) {
    timeframe = 30;
  }
  
  // Create visual component
  const visual = document.createElement('div');
  visual.className = 'rektbot-visual';
  
  // Create prediction chart
  const chartContainer = document.createElement('div');
  chartContainer.className = 'market-analysis-chart';
  visual.appendChild(chartContainer);
  
  // Get current risk levels for all months
  const allMonthsRisk = state.riskByMonth[timeframe];
  const currentMonth = new Date().getMonth() + 1;
  
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
  
  // Add chart to container
  const chart = document.createElement('canvas');
  chartContainer.appendChild(chart);
  
  // Create the chart
  setTimeout(() => {
    new Chart(chart, {
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
    });
  }, 100);
  
  // Add timeframe controls
  const controls = document.createElement('div');
  controls.className = 'timeframe-controls';
  controls.innerHTML = `
    <button data-timeframe="7">7d</button>
    <button data-timeframe="30" class="active">30d</button>
    <button data-timeframe="90">90d</button>
  `;
  
  visual.appendChild(controls);
  
  // Add event listeners for timeframe controls
  setTimeout(() => {
    const timeframeButtons = controls.querySelectorAll('button');
    timeframeButtons.forEach(button => {
      button.addEventListener('click', () => {
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
        }
      });
    });
  }, 200);
  
  // Generate text response
  const currentRisk = allMonthsRisk[currentMonth];
  const currentRiskValue = typeof currentRisk === 'object' ? currentRisk.risk : currentRisk;
  const currentRiskPercent = (currentRiskValue * 100).toFixed(1);
  
  let nextMonthIndex = (currentMonth % 12) + 1;
  const nextMonthRisk = allMonthsRisk[nextMonthIndex];
  const nextMonthRiskValue = typeof nextMonthRisk === 'object' ? nextMonthRisk.risk : nextMonthRisk;
  const nextMonthRiskPercent = (nextMonthRiskValue * 100).toFixed(1);
  
  let text = `For the next ${timeframe} days, the current crash probability is ${currentRiskPercent}%. `;
  
  if (nextMonthRiskValue > currentRiskValue * 1.2) {
    text += `Looking ahead, ${monthNames[nextMonthIndex - 1]} shows a significantly higher risk level at ${nextMonthRiskPercent}%.`;
  } else if (nextMonthRiskValue < currentRiskValue * 0.8) {
    text += `Looking ahead, ${monthNames[nextMonthIndex - 1]} shows a notably lower risk level at ${nextMonthRiskPercent}%.`;
  } else {
    text += `Looking ahead, ${monthNames[nextMonthIndex - 1]} shows a similar risk level at ${nextMonthRiskPercent}%.`;
  }
  
  return { text, visual };
}

/**
 * Handle historical comparison intent
 * @param {string} message - User message
 * @returns {Object} Response with text and visual
 */
function handleHistoricalComparison(message) {
  // Create visual component
  const visual = document.createElement('div');
  visual.className = 'rektbot-visual';
  
  // Get current month
  const currentMonth = new Date().getMonth() + 1;
  
  // Get historical crashes for this month
  const monthCrashes = state.historicalCrashes[currentMonth] || [];
  
  if (monthCrashes.length === 0) {
    visual.innerHTML = `
      <div style="padding: 15px; text-align: center; opacity: 0.7;">
        No significant historical crashes recorded for ${monthNames[currentMonth - 1]}.
      </div>
    `;
    
    const text = `There are no significant recorded extreme crashes for ${monthNames[currentMonth - 1]} in Bitcoin's price history.`;
    return { text, visual };
  }
  
  // Sort crashes by severity (most extreme first)
  const sortedCrashes = [...monthCrashes].sort((a, b) => 
    parseFloat(a.percentage) - parseFloat(b.percentage)
  );
  
  // Create historical comparison content
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
    
    <div style="font-size: 0.8rem; text-align: center; margin-top: 10px; opacity: 0.7;">
      Historical data helps contextualize seasonal crash patterns
    </div>
  `;
  
  // Get current risk for context
  const currentRisk = state.riskByMonth[30][currentMonth];
  const currentRiskValue = typeof currentRisk === 'object' ? currentRisk.risk : currentRisk;
  const currentRiskPercent = (currentRiskValue * 100).toFixed(1);
  
  // Generate text response
  let text = `${monthNames[currentMonth - 1]} has experienced notable Bitcoin crashes in the past. `;
  
  if (sortedCrashes.length > 0) {
    const worstCrash = sortedCrashes[0];
    text += `The most severe was on ${worstCrash.date} with a ${worstCrash.percentage}% drop. `;
  }
  
  if (currentRiskValue > 0.65) {
    text += `The current ${currentRiskPercent}% crash probability is elevated, suggesting similar market conditions may be developing.`;
  } else if (currentRiskValue < 0.35) {
    text += `However, the current ${currentRiskPercent}% crash probability is relatively low compared to historical patterns for this month.`;
  } else {
    text += `The current ${currentRiskPercent}% crash probability reflects moderate risk levels for this time of year.`;
  }
  
  return { text, visual };
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
