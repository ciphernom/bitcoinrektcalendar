// src/components/enhancedNLU.js
import { monthNames } from '../app.js';

export class EnhancedNLU {
  constructor() {
    // Initialize with more sophisticated intent patterns
    this.intentPatterns = this.setupIntentPatterns();
    
    // Entity extractors
    this.entityExtractors = {
      timeframe: this.extractTimeframe,
      month: this.extractMonth,
      percentage: this.extractPercentage,
      metric: this.extractMetric,
      comparison: this.extractComparison
    };
    
    // Feature words for intent classification
    this.featureWords = this.setupFeatureWords();
    
    // Month name mapping for entity extraction
    this.monthMap = monthNames.reduce((map, month, index) => {
      map[month.toLowerCase()] = index;
      return map;
    }, {});
  }
  
  /**
   * Set up more sophisticated intent patterns with examples and key phrases
   */
  setupIntentPatterns() {
    return [
      {
        name: 'risk_assessment',
        keyPhrases: ['risk', 'chance', 'probability', 'odds', 'likelihood', 'crash', 'correction'],
        examples: [
          'what is the current risk', 
          'how risky is bitcoin right now',
          'what are the odds of a crash',
          'chance of correction',
          'crash probability this month',
          'how likely is a drop'
        ],
        excludePhrases: ['strategy', 'historical', 'compare']
      },
      {
        name: 'strategy_advice',
        keyPhrases: ['strategy', 'advice', 'should i', 'recommend', 'suggestion', 'position', 'exposure'],
        examples: [
          'what should i do now',
          'give me strategy advice',
          'is now a good time to buy',
          'should i reduce exposure',
          'what position should i take',
          'recommended action'
        ]
      },
      {
        name: 'metric_analysis',
        keyPhrases: ['metric', 'mvrv', 'nvt', 'on-chain', 'indicator', 'explain', 'address', 'transaction'],
        examples: [
          'explain mvrv ratio',
          'what are on-chain metrics saying',
          'tell me about nvt',
          'how do metrics look',
          'active addresses trend',
          'transaction volume analysis'
        ]
      },
      {
        name: 'market_prediction',
        keyPhrases: ['predict', 'forecast', 'next', 'future', 'outlook', 'projection', 'coming'],
        examples: [
          'what will happen next month',
          'predict bitcoin risk',
          'outlook for next 90 days',
          'future crash probability',
          'forecast next quarter',
          'what are the projections'
        ]
      },
      {
        name: 'scenario_simulation',
        keyPhrases: ['what if', 'scenario', 'simulation', 'rise', 'drop', 'fall', 'increase', 'decrease'],
        examples: [
          'what if bitcoin drops 20%',
          'scenario where price rises 50%',
          'simulate market crash',
          'what happens if btc falls',
          'impact of 30% increase',
          'if bitcoin goes down 10% what is the risk'
        ]
      },
      {
        name: 'historical_comparison',
        keyPhrases: ['historical', 'compare', 'previous', 'past', 'pattern', 'similar', 'history', 'before'],
        examples: [
          'show historical crash comparison',
          'what happened in previous cycles',
          'compare to past crashes',
          'historical patterns for January',
          'similar situations in the past',
          'how does this compare to history'
        ]
      },
      {
        name: 'educational',
        keyPhrases: ['explain', 'how does', 'what is', 'meaning', 'definition', 'understand', 'learn'],
        examples: [
          'explain how the model works',
          'what is seasonality',
          'how does the risk calculation work',
          'explain bayesian model',
          'what\'s the meaning of extreme events',
          'help me understand cycle position'
        ]
      }
    ];
  }
  
  /**
   * Feature words for better intent classification
   */
  setupFeatureWords() {
    return {
      risk_assessment: ['risk', 'probability', 'chance', 'odds', 'likelihood', 'crash', 'correction', 'probability'],
      strategy_advice: ['strategy', 'advice', 'recommend', 'should', 'buy', 'sell', 'hold', 'action', 'position'],
      metric_analysis: ['metric', 'mvrv', 'nvt', 'on-chain', 'ratio', 'indicator', 'address', 'volume', 'transaction'],
      market_prediction: ['predict', 'forecast', 'projection', 'future', 'next', 'coming', 'outlook', 'will'],
      scenario_simulation: ['what if', 'scenario', 'simulation', 'rise', 'drop', 'fall', 'increase', 'decrease'],
      historical_comparison: ['historical', 'history', 'previous', 'past', 'before', 'compare', 'similar', 'pattern'],
      educational: ['explain', 'how', 'what is', 'mean', 'definition', 'understand', 'learn', 'works']
    };
  }
  
  /**
   * Classify intent using more sophisticated approach
   * @param {string} message - User's message
   * @returns {Object} Intent classification with confidence score
   */
  classifyIntent(message) {
    const normalizedMessage = message.toLowerCase();
    
    // First, check for exact example matches
    for (const intent of this.intentPatterns) {
      for (const example of intent.examples) {
        if (normalizedMessage.includes(example.toLowerCase())) {
          return {
            intent: intent.name,
            confidence: 0.95,
            matchType: 'example'
          };
        }
      }
    }
    
    // Next, check for key phrase matches
    const keyPhraseMatches = {};
    
    for (const intent of this.intentPatterns) {
      let matchCount = 0;
      let hasExcludedPhrase = false;
      
      // Check for key phrases
      intent.keyPhrases.forEach(phrase => {
        if (normalizedMessage.includes(phrase.toLowerCase())) {
          matchCount++;
        }
      });
      
      // Check for excluded phrases
      if (intent.excludePhrases) {
        intent.excludePhrases.forEach(phrase => {
          if (normalizedMessage.includes(phrase.toLowerCase())) {
            hasExcludedPhrase = true;
          }
        });
      }
      
      if (matchCount > 0 && !hasExcludedPhrase) {
        keyPhraseMatches[intent.name] = {
          count: matchCount,
          confidence: Math.min(0.9, 0.6 + (matchCount / intent.keyPhrases.length) * 0.3)
        };
      }
    }
    
    // If we have key phrase matches, find the best one
    if (Object.keys(keyPhraseMatches).length > 0) {
      const bestMatch = Object.entries(keyPhraseMatches)
        .sort((a, b) => b[1].confidence - a[1].confidence)[0];
      
      return {
        intent: bestMatch[0],
        confidence: bestMatch[1].confidence,
        matchType: 'keyPhrase'
      };
    }
    
    // Finally, use word frequency approach for more fuzzy matching
    const wordScores = {};
    const messageWords = normalizedMessage.split(/\W+/);
    
    // Calculate a score for each intent based on word matches
    Object.entries(this.featureWords).forEach(([intent, words]) => {
      let score = 0;
      
      words.forEach(word => {
        if (normalizedMessage.includes(word)) {
          // Single words get less weight than phrases
          score += word.includes(' ') ? 2 : 1;
        }
      });
      
      if (score > 0) {
        // Normalize by number of words in the intent
        wordScores[intent] = score / words.length;
      }
    });
    
    // If we have word matches, find the best one
    if (Object.keys(wordScores).length > 0) {
      const bestMatch = Object.entries(wordScores)
        .sort((a, b) => b[1] - a[1])[0];
      
      return {
        intent: bestMatch[0],
        confidence: Math.min(0.8, 0.5 + bestMatch[1] * 0.3),
        matchType: 'wordFrequency'
      };
    }
    
    // Fallback to default intent
    return {
      intent: 'general_query',
      confidence: 0.3,
      matchType: 'fallback'
    };
  }
  
  /**
   * Extract entities from the message
   * @param {string} message - User's message
   * @returns {Object} Extracted entities
   */
  extractEntities(message) {
    const normalizedMessage = message.toLowerCase();
    const entities = {};
    
    // Extract timeframe
    const timeframe = this.extractTimeframe(normalizedMessage);
    if (timeframe) entities.timeframe = timeframe;
    
    // Extract month
    const month = this.extractMonth(normalizedMessage);
    if (month) entities.month = month;
    
    // Extract percentage
    const percentage = this.extractPercentage(normalizedMessage);
    if (percentage) entities.percentage = percentage;
    
    // Extract metric
    const metric = this.extractMetric(normalizedMessage);
    if (metric) entities.metric = metric;
    
    // Extract comparison
    const comparison = this.extractComparison(normalizedMessage);
    if (comparison) entities.comparison = comparison;
    
    return entities;
  }
  
  /**
   * Extract timeframe from message
   * @param {string} message - Normalized message
   * @returns {Object|null} Timeframe entity or null
   */
  extractTimeframe(message) {
    // Match patterns like "30 days", "next 7 days", "2 weeks", "3 months", etc.
    const timeframeRegex = /\b(\d+)\s*(day|days|week|weeks|month|months|year|years)\b/i;
    const match = message.match(timeframeRegex);
    
    if (match) {
      const amount = parseInt(match[1]);
      const unit = match[2].toLowerCase();
      let days = amount;
      
      // Convert to days
      if (unit.startsWith('week')) {
        days = amount * 7;
      } else if (unit.startsWith('month')) {
        days = amount * 30;
      } else if (unit.startsWith('year')) {
        days = amount * 365;
      }
      
      return {
        mentioned: match[0],
        value: days,
        unit: unit,
        amount: amount
      };
    }
    
    // Check for specific timeframes
    if (/\b(next day|tomorrow)\b/i.test(message)) {
      return { mentioned: 'tomorrow', value: 1, unit: 'day', amount: 1 };
    }
    
    if (/\b(next week)\b/i.test(message)) {
      return { mentioned: 'next week', value: 7, unit: 'week', amount: 1 };
    }
    
    if (/\b(next month)\b/i.test(message)) {
      return { mentioned: 'next month', value: 30, unit: 'month', amount: 1 };
    }
    
    return null;
  }
  
  /**
   * Extract month from message
   * @param {string} message - Normalized message
   * @returns {Object|null} Month entity or null
   */
  extractMonth(message) {
    // Look for month names
    for (const month in this.monthMap) {
      if (message.includes(month)) {
        return {
          mentioned: month,
          index: this.monthMap[month],
          name: month.charAt(0).toUpperCase() + month.slice(1)
        };
      }
    }
    
    // Look for "this month", "current month", etc.
    if (/\b(this|current) month\b/i.test(message)) {
      const currentMonth = new Date().getMonth();
      return {
        mentioned: 'current month',
        index: currentMonth,
        name: monthNames[currentMonth]
      };
    }
    
    return null;
  }
  
  /**
   * Extract percentage from message
   * @param {string} message - Normalized message
   * @returns {Object|null} Percentage entity or null
   */
  extractPercentage(message) {
    // Match patterns like "20%", "50 percent", etc.
    const percentRegex = /\b(\d+)(?:\s*%|\s+percent)\b/i;
    const match = message.match(percentRegex);
    
    if (match) {
      const value = parseInt(match[1]) / 100;
      return {
        mentioned: match[0],
        value: value,
        displayValue: `${match[1]}%`
      };
    }
    
    return null;
  }
  
  /**
   * Extract metric from message
   * @param {string} message - Normalized message
   * @returns {Object|null} Metric entity or null
   */
  extractMetric(message) {
    const metrics = [
      { id: 'MVRV', terms: ['mvrv', 'market value to realized value', 'market value'] },
      { id: 'NVT', terms: ['nvt', 'network value to transactions', 'transaction value'] },
      { id: 'ACTIVE_ADDRESSES', terms: ['active addresses', 'address count', 'address activity'] },
      { id: 'CYCLE_POSITION', terms: ['cycle position', 'market cycle', 'cycle analysis'] },
      { id: 'VOLATILITY', terms: ['volatility', 'price swings', 'standard deviation'] }
    ];
    
    for (const metric of metrics) {
      for (const term of metric.terms) {
        if (message.includes(term)) {
          return {
            mentioned: term,
            id: metric.id,
            name: metric.terms[0]
          };
        }
      }
    }
    
    return null;
  }
  
  /**
   * Extract comparison from message
   * @param {string} message - Normalized message
   * @returns {Object|null} Comparison entity or null
   */
  extractComparison(message) {
    // Match patterns like "compare X to Y", "X vs Y", etc.
    const compareRegex = /\b(?:compare|vs|versus|against)\b|\bto\b.+\bwith\b/i;
    
    if (compareRegex.test(message)) {
      // Look for what's being compared
      let items = [];
      
      // Check for months
      for (const month in this.monthMap) {
        if (message.includes(month)) {
          items.push({
            type: 'month',
            value: month,
            index: this.monthMap[month]
          });
        }
      }
      
      // Check for metrics
      const metricTerms = ['risk', 'mvrv', 'nvt', 'volatility', 'addresses', 'cycle'];
      metricTerms.forEach(term => {
        if (message.includes(term)) {
          items.push({
            type: 'metric',
            value: term
          });
        }
      });
      
      // If we found at least two items, we have a comparison
      if (items.length >= 2) {
        return {
          mentioned: 'comparison',
          items: items,
          type: 'comparison'
        };
      }
    }
    
    return null;
  }
  
  /**
   * Process a message for intent and entities
   * @param {string} message - User's message
   * @returns {Object} Processed message with intent and entities
   */
  processMessage(message, conversationContext) {
    // Resolve references if context is provided
    const resolvedMessage = conversationContext ? 
      conversationContext.resolveReference(message) : message;
    
    // Classify intent
    const intentClassification = this.classifyIntent(resolvedMessage);
    
    // Extract entities
    const entities = this.extractEntities(resolvedMessage);
    
    // Update user profile if context is provided
    if (conversationContext) {
      conversationContext.updateUserProfile(resolvedMessage);
    }
    
    return {
      message: resolvedMessage,
      intent: intentClassification.intent,
      confidence: intentClassification.confidence,
      entities: entities,
      context: conversationContext ? conversationContext.getQueryContext() : null
    };
  }
}
