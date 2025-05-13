// enhancedNLU.js
import { knowledgeGraph } from './knowledgeGraph.js';

export class EnhancedNLU {
  constructor() {
    // Initialize compromise.js if available
    if (window.nlp) {
      // Register plugins if they're available
      if (window.compromiseNumbers) {
        window.nlp.extend(window.compromiseNumbers);
      }
      if (window.compromiseDates) {
        window.nlp.extend(window.compromiseDates);
      }
      
      // Setup custom NLP tags for Bitcoin terminology
      this.setupCustomNlpTags();
    }
    
    // Define month names locally instead of importing them
    this.monthNames = [
      "January", "February", "March", "April", "May", "June",
      "July", "August", "September", "October", "November", "December"
    ];
    
    // Use the local definition
    this.monthMap = this.monthNames.reduce((map, month, index) => {
      map[month.toLowerCase()] = index;
      return map;
    }, {});
    
    // Initialize with more sophisticated intent patterns
    this.intentPatterns = this.setupIntentPatterns();
    
    // Entity extractors
    this.entityExtractors = {
      timeframe: this.extractTimeframe.bind(this),
      month: this.extractMonth.bind(this),
      percentage: this.extractPercentage.bind(this),
      metric: this.extractMetric.bind(this),
      comparison: this.extractComparison.bind(this),
      concept: this.extractConcept.bind(this), 
      marketPhase: this.extractMarketPhase.bind(this),
      blackSwan: this.extractBlackSwan.bind(this),
      technicalLevel: this.extractTechnicalLevel.bind(this),
      sentimentIndicator: this.extractSentimentIndicator.bind(this)
    };
    
    // Feature words for intent classification
    this.featureWords = this.setupFeatureWords();
    
    // Add knowledge graph reference
    this.knowledgeGraph = knowledgeGraph;
  }
  
  /**
   * Set up custom tags for NLP processing with compromise.js
   */
  setupCustomNlpTags() {
    try {
      if (!window.nlp) return;
      
      window.nlp.extend((Doc, world) => {
        // Add crypto-specific terminology tags
        world.addTags({
          // Core metrics
          CryptoMetric: [
            'mvrv', 'nvt', 'sopr', 'puell multiple', 'hash ribbon', 'stablecoin ratio',
            'market value to realized value', 'network value to transactions', 
            'spent output profit ratio', 'funding rate', 'open interest'
          ],
          
          // Market phases and conditions
          MarketPhase: [
            'bull market', 'bear market', 'accumulation', 'distribution', 'early cycle',
            'mid cycle', 'late cycle', 'market top', 'market bottom', 'euphoria', 'capitulation'
          ],
          
          // Risk-related terms
          RiskTerm: [
            'crash', 'correction', 'drop', 'risk', 'probability', 'chance', 'likelihood',
            'danger', 'downside', 'vulnerable', 'exposure', 'tail risk'
          ],
          
          // Strategy and trading terms
          StrategyTerm: [
            'strategy', 'position', 'dca', 'dollar cost average', 'hold', 'hodl', 'sell',
            'buy', 'long', 'short', 'leverage', 'hedge', 'exit', 'entry', 'target'
          ],
          
          // Bitcoin-specific events
          BitcoinEvent: [
            'halving', 'black swan', 'capitulation', 'blow-off top', 'mt gox',
            'luna collapse', 'ftx bankruptcy'
          ]
        });
        
        // Add term normalizations
        world.addWords({
          'mvrv ratio': 'CryptoMetric',
          'market to realized value': 'CryptoMetric',
          'market cap to realized cap': 'CryptoMetric',
          'network to transaction value': 'CryptoMetric',
          'transaction value ratio': 'CryptoMetric',
          'halving event': 'BitcoinEvent',
          'reward halving': 'BitcoinEvent',
          'block reward halving': 'BitcoinEvent'
        });
      });
    } catch (err) {
      console.error('Error setting up custom NLP tags:', err);
    }
  }
  
  /**
   * Set up more sophisticated intent patterns with examples and key phrases
   */
  setupIntentPatterns() {
    return [
      {
        name: 'risk_assessment',
        keyPhrases: ['risk', 'chance', 'probability', 'odds', 'likelihood', 'crash', 'correction', 'danger', 'downside', 'vulnerability'],
        examples: [
          'what is the current risk', 
          'how risky is bitcoin right now',
          'what are the odds of a crash',
          'chance of correction',
          'crash probability this month',
          'how likely is a drop',
          'vulnerability assessment',
          'what\'s the downside risk',
          'danger level for bitcoin',
          'assess current market risk'
        ],
        excludePhrases: ['strategy', 'historical', 'compare']
      },
      {
        name: 'strategy_advice',
        keyPhrases: ['strategy', 'advice', 'should i', 'recommend', 'suggestion', 'position', 'exposure', 'allocation', 'portfolio', 'approach', 'best action'],
        examples: [
          'what should i do now',
          'give me strategy advice',
          'is now a good time to buy',
          'should i reduce exposure',
          'what position should i take',
          'recommended action',
          'how much should i allocate',
          'adjust my portfolio',
          'best approach in this market',
          'tactical positioning'
        ]
      },
      {
        name: 'metric_analysis',
        keyPhrases: ['metric', 'mvrv', 'nvt', 'on-chain', 'indicator', 'explain', 'address', 'transaction', 'puell', 'sopr', 'hash ribbon', 'stablecoin', 'ratio'],
        examples: [
          'explain mvrv ratio',
          'what are on-chain metrics saying',
          'tell me about nvt',
          'how do metrics look',
          'active addresses trend',
          'transaction volume analysis',
          'current puell multiple',
          'sopr indicator analysis',
          'stablecoin ratio implications',
          'hash ribbon status'
        ]
      },
      {
        name: 'market_prediction',
        keyPhrases: ['predict', 'forecast', 'next', 'future', 'outlook', 'projection', 'coming', 'anticipate', 'expected', 'likely to', 'probability of', 'potential for'],
        examples: [
          'what will happen next month',
          'predict bitcoin risk',
          'outlook for next 90 days',
          'future crash probability',
          'forecast next quarter',
          'what are the projections',
          'anticipate market direction',
          'expected behavior',
          'likely market movements',
          'probability of new highs',
          'potential for extended decline'
        ]
      },
      {
        name: 'scenario_simulation',
        keyPhrases: ['what if', 'scenario', 'simulation', 'rise', 'drop', 'fall', 'increase', 'decrease', 'crash', 'breakout', 'rally', 'consolidate', 'stagnate'],
        examples: [
          'what if bitcoin drops 20%',
          'scenario where price rises 50%',
          'simulate market crash',
          'what happens if btc falls',
          'impact of 30% increase',
          'if bitcoin goes down 10% what is the risk',
          'what if we break $100k',
          'scenario with 3 months of sideways action',
          'simulate rapid 40% rally',
          'liquidation cascade scenario'
        ]
      },
      {
        name: 'historical_comparison',
        keyPhrases: ['historical', 'compare', 'previous', 'past', 'pattern', 'similar', 'history', 'before', 'precedent', 'analogous', 'comparable', 'resembles'],
        examples: [
          'show historical crash comparison',
          'what happened in previous cycles',
          'compare to past crashes',
          'historical patterns for January',
          'similar situations in the past',
          'how does this compare to history',
          'precedent for current conditions',
          'analogous market structure',
          'comparable cycle position',
          'market that resembles today'
        ]
      },
      {
        name: 'educational',
        keyPhrases: ['explain', 'how does', 'what is', 'meaning', 'definition', 'understand', 'learn', 'concept', 'mechanism', 'function', 'principle'],
        examples: [
          'explain how the model works',
          'what is seasonality',
          'how does the risk calculation work',
          'explain bayesian model',
          'what\'s the meaning of extreme events',
          'help me understand cycle position',
          'mechanism of liquidation cascades',
          'concept of market reflexivity',
          'function of bitcoin halving',
          'principles of on-chain analysis',
          'how does puell multiple work'
        ]
      },
      {
        name: 'knowledge_explorer',
        keyPhrases: ['knowledge', 'graph', 'explorer', 'explore', 'concepts', 'relationships', 'terms', 'connections', 'map', 'network', 'linked', 'related'],
        examples: [
          'explore knowledge graph',
          'show me the knowledge explorer',
          'what concepts do you know',
          'explore market relationships',
          'show all concepts',
          'knowledge map',
          'connections between metrics',
          'related concepts to mvrv',
          'what factors influence crash risk',
          'map of on-chain indicators',
          'network of market concepts'
        ]
      },
      {
        name: 'market_structure',
        keyPhrases: ['market structure', 'support', 'resistance', 'trend', 'pattern', 'formation', 'technical', 'level', 'breakout', 'breakdown', 'divergence'],
        examples: [
          'analyze current market structure',
          'key support levels',
          'critical resistance points',
          'technical divergences',
          'pattern formation analysis',
          'trend strength assessment',
          'key price levels',
          'potential breakout zones',
          'breakdown risk analysis',
          'higher timeframe structure'
        ]
      },
      {
        name: 'sentiment_analysis',
        keyPhrases: ['sentiment', 'fear', 'greed', 'market mood', 'investor psychology', 'social sentiment', 'crowd psychology', 'optimism', 'pessimism', 'euphoria', 'capitulation'],
        examples: [
          'current market sentiment',
          'fear and greed analysis',
          'social media sentiment indicators',
          'signs of market euphoria',
          'capitulation indicators',
          'investor psychology assessment',
          'market mood evaluation',
          'crowd psychology signs',
          'optimism vs pessimism measurement',
          'sentiment divergence from price'
        ]
      },
      {
        name: 'black_swan_analysis',
        keyPhrases: ['black swan', 'extreme event', 'tail risk', 'catastrophic', 'rare event', 'market shock', 'unexpected', 'outlier', 'crisis scenario', 'systemic risk'],
        examples: [
          'black swan risk assessment',
          'protection against extreme events',
          'tail risk in current market',
          'catastrophic scenario preparation',
          'market shock vulnerability',
          'unexpected event impact',
          'outlier scenario analysis',
          'crisis preparation strategy',
          'systemic risk evaluation',
          'largest tail risks today'
        ]
      }
    ];
  }
  
  /**
   * Feature words for better intent classification
   */
  setupFeatureWords() {
    return {
      risk_assessment: ['risk', 'probability', 'chance', 'odds', 'likelihood', 'crash', 'correction', 'probability', 'danger', 'vulnerability', 'threat', 'downside'],
      strategy_advice: ['strategy', 'advice', 'recommend', 'should', 'buy', 'sell', 'hold', 'action', 'position', 'allocation', 'portfolio', 'exposure', 'hedge', 'protect'],
      metric_analysis: ['metric', 'mvrv', 'nvt', 'on-chain', 'ratio', 'indicator', 'address', 'volume', 'transaction', 'puell', 'sopr', 'hash ribbon', 'stablecoin'],
      market_prediction: ['predict', 'forecast', 'projection', 'future', 'next', 'coming', 'outlook', 'will', 'anticipate', 'expected', 'likely', 'probabilities'],
      scenario_simulation: ['what if', 'scenario', 'simulation', 'rise', 'drop', 'fall', 'increase', 'decrease', 'crash', 'rally', 'breakout', 'cascade', 'liquidation'],
      historical_comparison: ['historical', 'history', 'previous', 'past', 'before', 'compare', 'similar', 'pattern', 'precedent', 'analogous', 'resembles', 'like'],
      educational: ['explain', 'how', 'what is', 'mean', 'definition', 'understand', 'learn', 'works', 'mechanism', 'principle', 'function', 'concept'],
      knowledge_explorer: ['knowledge', 'graph', 'explorer', 'explore', 'concepts', 'map', 'terms', 'relationship', 'connections', 'network', 'linked', 'related'],
      market_structure: ['structure', 'support', 'resistance', 'trend', 'pattern', 'technical', 'formation', 'level', 'breakout', 'breakdown', 'divergence', 'range'],
      sentiment_analysis: ['sentiment', 'fear', 'greed', 'mood', 'psychology', 'social', 'crowd', 'euphoria', 'capitulation', 'pessimism', 'optimism', 'emotion'],
      black_swan_analysis: ['black swan', 'extreme', 'tail risk', 'catastrophic', 'rare', 'shock', 'unexpected', 'outlier', 'crisis', 'systemic', 'collapse']
    };
  }
  
  /**
   * Classify intent using compromise.js for enhanced pattern recognition
   * @param {string} message - User's message
   * @returns {Object} Intent classification with confidence score
   */
  classifyIntent(message) {
    const normalizedMessage = message.toLowerCase();
    
    // Use compromise.js for more natural pattern matching if available
    if (window.nlp) {
      try {
        const doc = window.nlp(message);
        
        // Risk assessment intent patterns
        if (doc.has('(what|how) (is|about) (the |)current risk') || 
            doc.has('#RiskTerm of (crash|correction|drop)') ||
            doc.has('how (risky|likely) is (bitcoin|btc)') ||
            doc.has('crash (probability|risk|chance)') ||
            doc.has('chance of (crash|dip|correction)')) {
          return {
            intent: 'risk_assessment',
            confidence: 0.95,
            matchType: 'nlp-pattern'
          };
        }
        
        // Strategy advice intent patterns
        if (doc.has('(what|how) should i (do|buy|sell|invest|trade)') || 
            doc.has('#StrategyTerm for (current|this) market') ||
            doc.has('(recommend|suggest) (position|allocation)') ||
            doc.has('good time to (buy|sell|enter|exit)')) {
          return {
            intent: 'strategy_advice',
            confidence: 0.92,
            matchType: 'nlp-pattern'
          };
        }
        
        // Metric analysis intent patterns
        if (doc.has('explain #CryptoMetric') ||
            doc.has('(what|how) (is|are|about) #CryptoMetric') ||
            doc.has('(what|how) (is|are|about|do) (the |)metric') ||
            doc.has('on-chain (metrics|analysis|data)')) {
          
          // Extract concept for educational intents
          const concept = this.extractConcept(normalizedMessage);
          
          return {
            intent: 'metric_analysis',
            confidence: 0.93,
            matchType: 'nlp-pattern',
            concept: concept ? concept.id : null
          };
        }
        
        // Market prediction intent patterns
        if (doc.has('(predict|forecast|projection|outlook) (for|about|on)') ||
            doc.has('what will happen (next|in the future|soon)') ||
            doc.has('(future|next|coming) (month|week|days|time)') ||
            doc.has('(will|going to) (happen|occur|take place)')) {
          return {
            intent: 'market_prediction',
            confidence: 0.9,
            matchType: 'nlp-pattern'
          };
        }
        
        // Scenario simulation intent patterns
        if (doc.has('what if (bitcoin|btc|price|market) (goes|drops|falls|rises|increases|decreases|crashes)') ||
            doc.has('scenario (where|with|of) (price|bitcoin|btc)') ||
            doc.has('simulate (crash|rally|drop|rise)')) {
          return {
            intent: 'scenario_simulation',
            confidence: 0.94,
            matchType: 'nlp-pattern'
          };
        }
        
        // Historical comparison intent patterns
        if (doc.has('(compare|comparison) (to|with) (history|past|previous)') ||
            doc.has('(historical|history|past) (crash|rally|pattern|cycle)') ||
            doc.has('(similar|like) (situation|condition|event) (in|from) (past|before)')) {
          return {
            intent: 'historical_comparison',
            confidence: 0.91,
            matchType: 'nlp-pattern'
          };
        }
        
        // Educational intent patterns
        if (doc.has('(explain|tell me about|what is|how does) (the|) (model|calculation|algorithm|risk|cycle)') ||
            doc.has('(help|explain|understand) (me|) (how|what|why)')) {
          
          // Extract concept for educational intents
          const concept = this.extractConcept(normalizedMessage);
          
          return {
            intent: 'educational',
            confidence: 0.89,
            matchType: 'nlp-pattern',
            concept: concept ? concept.id : null
          };
        }
        
        // Knowledge explorer intent patterns
        if (doc.has('(explore|show|display) (knowledge|concept|term)') ||
            doc.has('knowledge (graph|explorer|map)') ||
            doc.has('show (me|) (the|) (knowledge|concept|relationship)')) {
          return {
            intent: 'knowledge_explorer',
            confidence: 0.95,
            matchType: 'nlp-pattern'
          };
        }
      } catch (err) {
        console.error('Error in NLP intent classification:', err);
        // Fall through to traditional classification methods
      }
    }
    
    // Extract knowledge graph concept if present
    const concept = this.extractConcept(normalizedMessage);
    
    // Extract market phase if present
    const marketPhase = this.extractMarketPhase(normalizedMessage);
    
    // Extract black swan reference if present
    const blackSwan = this.extractBlackSwan(normalizedMessage);
    
    // First, check for exact example matches
    for (const intent of this.intentPatterns) {
      for (const example of intent.examples) {
        if (normalizedMessage.includes(example.toLowerCase())) {
          // Enhance with concept if found
          if (concept && intent.name === 'educational') {
            return {
              intent: intent.name,
              confidence: 0.98,
              matchType: 'example-with-concept',
              concept: concept.id
            };
          }
          
          // Enhance with market phase if found
          if (marketPhase && (intent.name === 'risk_assessment' || intent.name === 'strategy_advice')) {
            return {
              intent: intent.name,
              confidence: 0.97,
              matchType: 'example-with-phase',
              marketPhase: marketPhase.phase
            };
          }
          
          // Enhance with black swan if found
          if (blackSwan && intent.name === 'black_swan_analysis') {
            return {
              intent: intent.name,
              confidence: 0.99,
              matchType: 'example-with-blackswan',
              blackSwan: blackSwan.event
            };
          }
          
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
      
      // Enhance with concept if found
      if (concept && bestMatch[0] === 'educational') {
        return {
          intent: bestMatch[0],
          confidence: Math.min(0.95, bestMatch[1].confidence + 0.05),
          matchType: 'keyPhrase-with-concept',
          concept: concept.id
        };
      }
      
      // Enhance with market phase if found
      if (marketPhase && (bestMatch[0] === 'risk_assessment' || bestMatch[0] === 'strategy_advice')) {
        return {
          intent: bestMatch[0],
          confidence: Math.min(0.95, bestMatch[1].confidence + 0.05),
          matchType: 'keyPhrase-with-phase',
          marketPhase: marketPhase.phase
        };
      }
      
      // Enhance with black swan if found
      if (blackSwan && bestMatch[0] === 'black_swan_analysis') {
        return {
          intent: bestMatch[0],
          confidence: Math.min(0.95, bestMatch[1].confidence + 0.05),
          matchType: 'keyPhrase-with-blackswan',
          blackSwan: blackSwan.event
        };
      }
      
      return {
        intent: bestMatch[0],
        confidence: bestMatch[1].confidence,
        matchType: 'keyPhrase'
      };
    }
    
    // If we found a concept, it's likely educational intent
    if (concept && /\b(what|explain|how|tell me about)\b/i.test(normalizedMessage)) {
      return {
        intent: 'educational',
        confidence: 0.85,
        matchType: 'concept-based',
        concept: concept.id
      };
    }
    
    // If we found a market phase reference
    if (marketPhase && /\b(risk|strategy|position|what should|how should)\b/i.test(normalizedMessage)) {
      return {
        intent: 'market_prediction',
        confidence: 0.82,
        matchType: 'phase-based',
        marketPhase: marketPhase.phase
      };
    }
    
    // If we found a black swan reference
    if (blackSwan) {
      return {
        intent: 'black_swan_analysis',
        confidence: 0.88,
        matchType: 'blackswan-based',
        blackSwan: blackSwan.event
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
      
      // Enhance with concept if found
      if (concept && bestMatch[0] === 'educational') {
        return {
          intent: bestMatch[0],
          confidence: Math.min(0.85, 0.5 + bestMatch[1] * 0.3 + 0.05),
          matchType: 'wordFrequency-with-concept',
          concept: concept.id
        };
      }
      
      // Enhance with market phase if found
      if (marketPhase && (bestMatch[0] === 'risk_assessment' || bestMatch[0] === 'strategy_advice')) {
        return {
          intent: bestMatch[0],
          confidence: Math.min(0.85, 0.5 + bestMatch[1] * 0.3 + 0.05),
          matchType: 'wordFrequency-with-phase',
          marketPhase: marketPhase.phase
        };
      }
      
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
    
    // Extract concept from knowledge graph
    const concept = this.extractConcept(normalizedMessage);
    if (concept) entities.concept = concept;
    
    // Extract market phase references
    const marketPhase = this.extractMarketPhase(normalizedMessage);
    if (marketPhase) entities.marketPhase = marketPhase;
    
    // Extract black swan event references
    const blackSwan = this.extractBlackSwan(normalizedMessage);
    if (blackSwan) entities.blackSwan = blackSwan;
    
    // Extract technical levels
    const technicalLevel = this.extractTechnicalLevel(normalizedMessage);
    if (technicalLevel) entities.technicalLevel = technicalLevel;
    
    // Extract sentiment indicators
    const sentimentIndicator = this.extractSentimentIndicator(normalizedMessage);
    if (sentimentIndicator) entities.sentimentIndicator = sentimentIndicator;
    
    return entities;
  }
  
  /**
   * Extract timeframe from message with enhanced natural language understanding
   * @param {string} message - Normalized message
   * @returns {Object|null} Timeframe entity or null
   */
  extractTimeframe(message) {
    // Use compromise.js if available
    if (window.nlp) {
      try {
        const doc = window.nlp(message);
        
        // Handle duration expressions - compromise is excellent at these
        const durationMatches = doc.match('#Value #Duration');
        if (durationMatches.found) {
          // Get the full expression for 'mentioned'
          const mentioned = durationMatches.text();
          
          // Parse the values
          const values = durationMatches.values();
          if (values.length > 0) {
            const value = values[0];
            if (value && typeof value.number === 'number') {
              let days = value.number;
              let unit = value.unit || 'day';
              
              // Convert to days
              if (unit.includes('week')) {
                days = value.number * 7;
              } else if (unit.includes('month')) {
                days = value.number * 30;
              } else if (unit.includes('year')) {
                days = value.number * 365;
              }
              
              return {
                mentioned: mentioned,
                value: days,
                unit: unit.replace(/s$/, ''), // Normalize plural units to singular
                amount: value.number
              };
            }
          }
        }
        
        // Check for relative time expressions
        const timeframeMap = {
          'next day': { value: 1, unit: 'day', amount: 1 },
          'tomorrow': { value: 1, unit: 'day', amount: 1 },
          'next week': { value: 7, unit: 'week', amount: 1 },
          'next month': { value: 30, unit: 'month', amount: 1 },
          'next quarter': { value: 90, unit: 'quarter', amount: 1 },
          'next few days': { value: 3, unit: 'day', amount: 3 },
          'coming weeks': { value: 21, unit: 'week', amount: 3 },
          'short term': { value: 14, unit: 'day', amount: 14 },
          'medium term': { value: 90, unit: 'day', amount: 90 },
          'long term': { value: 365, unit: 'day', amount: 365 }
        };
        
        for (const [phrase, data] of Object.entries(timeframeMap)) {
          if (doc.has(phrase)) {
            return {
              mentioned: phrase,
              value: data.value,
              unit: data.unit,
              amount: data.amount
            };
          }
        }
      } catch (err) {
        console.error('Error in NLP timeframe extraction:', err);
        // Fall back to regex method if compromise fails
      }
    }
    
    // Fall back to regex method
    // Match patterns like "30 days", "next 7 days", etc.
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
        unit: unit.replace(/s$/, ''), // Normalize plural units to singular
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
    
    if (/\b(short term)\b/i.test(message)) {
      return { mentioned: 'short term', value: 14, unit: 'day', amount: 14 };
    }
    
    if (/\b(medium term)\b/i.test(message)) {
      return { mentioned: 'medium term', value: 90, unit: 'day', amount: 90 };
    }
    
    if (/\b(long term)\b/i.test(message)) {
      return { mentioned: 'long term', value: 365, unit: 'day', amount: 365 };
    }
    
    return null;
  }
  
  /**
   * Extract month from message with better natural language understanding
   * @param {string} message - Normalized message
   * @returns {Object|null} Month entity or null
   */
  extractMonth(message) {
    // Use compromise.js if available
    if (window.nlp) {
      try {
        const doc = window.nlp(message);
        
        // Check for specific month names
        const monthMatch = doc.match('#Month').first();
        if (monthMatch.found) {
          const monthText = monthMatch.text().toLowerCase();
          for (const month in this.monthMap) {
            if (monthText.includes(month)) {
              return {
                mentioned: monthText,
                index: this.monthMap[month],
                name: month.charAt(0).toUpperCase() + month.slice(1)
              };
            }
          }
        }
        
        // Try to extract relative months
        if (doc.has('(this|current) month')) {
          const currentMonth = new Date().getMonth();
          return {
            mentioned: doc.match('(this|current) month').text(),
            index: currentMonth,
            name: this.monthNames[currentMonth]
          };
        }
        
        if (doc.has('(last|previous) month')) {
          const lastMonth = (new Date().getMonth() + 11) % 12; // +11 mod 12 gives previous month
          return {
            mentioned: doc.match('(last|previous) month').text(),
            index: lastMonth,
            name: this.monthNames[lastMonth]
          };
        }
        
        if (doc.has('next month')) {
          const nextMonth = (new Date().getMonth() + 1) % 12;
          return {
            mentioned: 'next month',
            index: nextMonth,
            name: this.monthNames[nextMonth]
          };
        }
      } catch (err) {
        console.error('Error in NLP month extraction:', err);
        // Fall back to standard method if compromise fails
      }
    }
    
    // Look for month names the standard way
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
        name: this.monthNames[currentMonth]
      };
    }
    
    // Look for "last month", "previous month"
    if (/\b(last|previous) month\b/i.test(message)) {
      const lastMonth = (new Date().getMonth() + 11) % 12; // +11 mod 12 gives previous month
      return {
        mentioned: 'last month',
        index: lastMonth,
        name: this.monthNames[lastMonth]
      };
    }
    
    // Look for "next month"
    if (/\bnext month\b/i.test(message)) {
      const nextMonth = (new Date().getMonth() + 1) % 12;
      return {
        mentioned: 'next month',
        index: nextMonth,
        name: this.monthNames[nextMonth]
      };
    }
    
    return null;
  }
  
  /**
   * Extract percentage from message with enhanced numeric understanding
   * @param {string} message - Normalized message
   * @returns {Object|null} Percentage entity or null
   */
  extractPercentage(message) {
    // Use compromise.js if available
    if (window.nlp) {
      try {
        const doc = window.nlp(message);
        
        // Find percentages like "20%" or "20 percent"
        const percentMatches = doc.match('#Value #Percentage');
        if (percentMatches.found) {
          const percentText = percentMatches.text();
          const values = percentMatches.values();
          
          if (values.length > 0) {
            const value = values[0].number / 100; // Convert to decimal
            return {
              mentioned: percentText,
              value: value,
              displayValue: `${values[0].number}%`,
              raw: values[0].number
            };
          }
        }
        
        // Try finding numbers followed by % or percent
        const numWithPercentMatches = doc.match('#Value (percent|%)');
        if (numWithPercentMatches.found) {
          const percentText = numWithPercentMatches.text();
          const values = numWithPercentMatches.values();
          
          if (values.length > 0) {
            const value = values[0].number / 100; // Convert to decimal
            return {
              mentioned: percentText,
              value: value,
              displayValue: `${values[0].number}%`,
              raw: values[0].number
            };
          }
        }
        
        // Look for specific narrative patterns
        const narrativePercentages = [
          { pattern: '(double|twice|100 percent|100%)', value: 1, raw: 100 },
          { pattern: 'half|50 percent|50%', value: 0.5, raw: 50 },
          { pattern: 'quarter|25 percent|25%', value: 0.25, raw: 25 },
          { pattern: 'third|33 percent|33%', value: 0.33, raw: 33 },
          { pattern: 'three quarter|75 percent|75%', value: 0.75, raw: 75 }
        ];
        
        for (const percent of narrativePercentages) {
          if (doc.has(percent.pattern)) {
            const match = doc.match(percent.pattern).text();
            return {
              mentioned: match,
              value: percent.value,
              displayValue: `${percent.raw}%`,
              raw: percent.raw
            };
          }
        }
      } catch (err) {
        console.error('Error in NLP percentage extraction:', err);
        // Fall back to regex method if compromise fails
      }
    }
    
    // Fall back to regex extraction
    // Match patterns like "20%", "50 percent", etc.
    const percentRegex = /\b(\d+)(?:\s*%|\s+percent)\b/i;
    const match = message.match(percentRegex);
    
    if (match) {
      const value = parseInt(match[1]) / 100;
      return {
        mentioned: match[0],
        value: value,
        displayValue: `${match[1]}%`,
        raw: parseInt(match[1])
      };
    }
    
    return null;
  }
  
  /**
   * Extract metric from message with enhanced recognition
   * @param {string} message - Normalized message
   * @returns {Object|null} Metric entity or null
   */
  extractMetric(message) {
    // Use compromise.js if available
    if (window.nlp) {
      try {
        const doc = window.nlp(message);
        
        // Check for any crypto metrics in our custom tags
        const metricMatch = doc.match('#CryptoMetric').first();
        if (metricMatch.found) {
          const metricText = metricMatch.text().toLowerCase();
          
          // Map to our metric IDs
          const metricMap = {
            'mvrv': 'MVRV',
            'market value to realized value': 'MVRV',
            'market-to-realized value': 'MVRV',
            'market value': 'MVRV',
            'realized value ratio': 'MVRV',
            
            'nvt': 'NVT',
            'network value to transactions': 'NVT',
            'transaction value': 'NVT',
            'transaction ratio': 'NVT',
            
            'active addresses': 'ACTIVE_ADDRESSES',
            'address count': 'ACTIVE_ADDRESSES',
            'address activity': 'ACTIVE_ADDRESSES',
            
            'cycle position': 'CYCLE_POSITION',
            'market cycle': 'CYCLE_POSITION',
            
            'volatility': 'VOLATILITY',
            'price swings': 'VOLATILITY',
            
            'puell': 'PUELL_MULTIPLE',
            'puell multiple': 'PUELL_MULTIPLE',
            
            'sopr': 'SOPR',
            'spent output profit ratio': 'SOPR',
            
            'hash ribbon': 'HASH_RIBBON',
            'hash ribbons': 'HASH_RIBBON',
            
            'stablecoin': 'STABLECOIN_RATIO',
            'stablecoin ratio': 'STABLECOIN_RATIO',
            
            'funding': 'FUNDING_RATE',
            'funding rate': 'FUNDING_RATE'
          };
          
          // Find the metric in our map
          for (const [term, id] of Object.entries(metricMap)) {
            if (metricText.includes(term)) {
              return {
                mentioned: metricText,
                id: id,
                name: term
              };
            }
          }
          
          // If it matched our tag but not our explicit mapping, use a default mapping
          return {
            mentioned: metricText,
            id: metricText.toUpperCase().replace(/\s+/g, '_'),
            name: metricText
          };
        }
      } catch (err) {
        console.error('Error in NLP metric extraction:', err);
        // Fall back to standard method if compromise fails
      }
    }
    
    // Fall back to hard-coded metrics search
    const metrics = [
      { id: 'MVRV', terms: ['mvrv', 'market value to realized value', 'market value', 'realized value ratio'] },
      { id: 'NVT', terms: ['nvt', 'network value to transactions', 'transaction value', 'transaction ratio'] },
      { id: 'ACTIVE_ADDRESSES', terms: ['active addresses', 'address count', 'address activity', 'active wallets'] },
      { id: 'CYCLE_POSITION', terms: ['cycle position', 'market cycle', 'cycle analysis', 'cycle phase'] },
      { id: 'VOLATILITY', terms: ['volatility', 'price swings', 'standard deviation', 'price volatility'] },
      { id: 'PUELL_MULTIPLE', terms: ['puell', 'puell multiple', 'mining revenue', 'miner profitability'] },
      { id: 'SOPR', terms: ['sopr', 'spent output profit ratio', 'profit ratio', 'realized profit'] },
      { id: 'HASH_RIBBON', terms: ['hash ribbon', 'hash rate ma', 'miner capitulation', 'hash rate indicator'] },
      { id: 'STABLECOIN_RATIO', terms: ['stablecoin', 'stablecoin ratio', 'stablecoin supply', 'stablecoin dominance'] },
      { id: 'FUNDING_RATE', terms: ['funding', 'funding rate', 'perpetual funding', 'futures funding'] }
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
      const metricTerms = ['risk', 'mvrv', 'nvt', 'volatility', 'addresses', 'cycle', 'puell', 'sopr', 'hash ribbon', 'stablecoin'];
      metricTerms.forEach(term => {
        if (message.includes(term)) {
          items.push({
            type: 'metric',
            value: term
          });
        }
      });
      
      // Check for market phases
      const phaseTerms = ['bull market', 'bear market', 'accumulation', 'distribution', 'early bull', 'late bull', 'early bear', 'capitulation'];
      phaseTerms.forEach(term => {
        if (message.includes(term)) {
          items.push({
            type: 'market_phase',
            value: term
          });
        }
      });
      
      // Check for events
      const eventTerms = ['halving', 'black swan', 'covid crash', 'luna collapse', 'ftx bankruptcy'];
      eventTerms.forEach(term => {
        if (message.includes(term)) {
          items.push({
            type: 'event',
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
   * Extract concept from knowledge graph with enhanced recognition
   * @param {string} message - Normalized message
   * @returns {Object|null} Concept entity or null
   */
  extractConcept(message) {
    if (!this.knowledgeGraph || !this.knowledgeGraph.entities) {
      return null;
    }
    
    // Use compromise.js if available
    if (window.nlp) {
      try {
        const doc = window.nlp(message);
        
        // Prioritize explicit concept mentions from our custom tags
        let conceptFound = null;
        
        // Check for crypto metrics
        const metricMatch = doc.match('#CryptoMetric').first();
        if (metricMatch.found) {
          const metricText = metricMatch.text().toLowerCase();
          
          // Map common metric terms to knowledge graph entity IDs
          const metricMap = {
            'mvrv': 'MVRV_Ratio',
            'market value to realized value': 'MVRV_Ratio',
            'market value': 'MVRV_Ratio',
            'realized value': 'MVRV_Ratio',
            'nvt': 'NVT_Ratio',
            'network value to transactions': 'NVT_Ratio',
            'puell multiple': 'Puell_Multiple',
            'sopr': 'SOPR',
            'hash ribbon': 'hash_ribbon'
          };
          
          for (const [term, id] of Object.entries(metricMap)) {
            if (metricText.includes(term)) {
              conceptFound = {
                mentioned: metricText,
                id: id
              };
              break;
            }
          }
        }
        
        // Check for market phases
        if (!conceptFound) {
          const phaseMatch = doc.match('#MarketPhase').first();
          if (phaseMatch.found) {
            const phaseText = phaseMatch.text().toLowerCase();
            
            // Map market phases to knowledge graph entity IDs
            const phaseMap = {
              'bull market': 'bull_market',
              'bear market': 'bear_market',
              'market cycle': 'market_cycle_position',
              'cycle position': 'market_cycle_position'
            };
            
            for (const [term, id] of Object.entries(phaseMap)) {
              if (phaseText.includes(term)) {
                conceptFound = {
                  mentioned: phaseText,
                  id: id
                };
                break;
              }
            }
          }
        }
        
        // Check for Bitcoin events
        if (!conceptFound) {
          const eventMatch = doc.match('#BitcoinEvent').first();
          if (eventMatch.found) {
            const eventText = eventMatch.text().toLowerCase();
            
            // Map Bitcoin events to knowledge graph entity IDs
            const eventMap = {
              'halving': 'halving',
              'black swan': 'black_swan_event',
              'luna collapse': 'black_swan_event',
              'ftx bankruptcy': 'black_swan_event'
            };
            
            for (const [term, id] of Object.entries(eventMap)) {
              if (eventText.includes(term)) {
                conceptFound = {
                  mentioned: eventText,
                  id: id
                };
                break;
              }
            }
          }
        }
        
        // Check for risk terms
        if (!conceptFound) {
          const riskMatch = doc.match('#RiskTerm').first();
          if (riskMatch.found) {
            const riskText = riskMatch.text().toLowerCase();
            
            if (riskText.includes('crash') || riskText.includes('risk')) {
              conceptFound = {
                mentioned: riskText,
                id: 'crash_risk'
              };
            } else if (riskText.includes('liquidation')) {
              conceptFound = {
                mentioned: riskText,
                id: 'liquidation_cascades'
              };
            }
          }
        }
        
        if (conceptFound) {
          return conceptFound;
        }
      } catch (err) {
        console.error('Error in NLP concept extraction:', err);
        // Fall back to standard method if compromise fails
      }
    }
    
    // Fall back to standard knowledge graph entity extraction
    
    // Get all entity names from knowledge graph
    const entityNames = Object.keys(this.knowledgeGraph.entities);
    
    // Convert entity names to search patterns
    const searchPatterns = entityNames.map(name => {
      // Convert CamelCase or snake_case to space-separated
      const readableName = name.replace(/_/g, ' ')
                             .replace(/([A-Z])/g, ' $1')
                             .toLowerCase()
                             .trim();
      return {
        id: name,
        name: readableName
      };
    });
    
    // Find matching concepts in message
    const matches = [];
    const lowerMessage = message.toLowerCase();
    
    searchPatterns.forEach(pattern => {
      if (lowerMessage.includes(pattern.name)) {
        matches.push({
          id: pattern.id,
          name: pattern.name,
          position: lowerMessage.indexOf(pattern.name)
        });
      }
    });
    
    // Extended list of concept terms to match
    const conceptTerms = [
      { term: 'bull market', id: 'bull_market' },
      { term: 'bear market', id: 'bear_market' },
      { term: 'market cycle', id: 'market_cycle_position' },
      { term: 'cycle position', id: 'market_cycle_position' },
      { term: 'bitcoin halving', id: 'halving' },
      { term: 'crash risk', id: 'crash_risk' },
      { term: 'market value', id: 'MVRV_Ratio' },
      { term: 'realized value', id: 'MVRV_Ratio' },
      { term: 'network value', id: 'NVT_Ratio' },
      { term: 'puell multiple', id: 'Puell_Multiple' },
      { term: 'sopr indicator', id: 'SOPR' },
      { term: 'stablecoin ratio', id: 'Stablecoin_Supply_Ratio' },
      { term: 'hash ribbons', id: 'hash_ribbon' },
      { term: 'hash ribbon', id: 'hash_ribbon' },
      { term: 'liquidation cascade', id: 'liquidation_cascades' },
      { term: 'liquidations', id: 'liquidation_cascades' },
      { term: 'black swan', id: 'black_swan_event' },
      { term: 'market reflexivity', id: 'reflexivity' },
      { term: 'reflexive markets', id: 'reflexivity' },
      { term: 'technical divergence', id: 'technical_divergence' },
      { term: 'divergences', id: 'technical_divergence' }
    ];
    
    conceptTerms.forEach(concept => {
      if (lowerMessage.includes(concept.term)) {
        matches.push({
          id: concept.id,
          name: concept.term,
          position: lowerMessage.indexOf(concept.term)
        });
      }
    });
    
    // Return the earliest match in the message if any
    if (matches.length > 0) {
      matches.sort((a, b) => a.position - b.position);
      return {
        mentioned: matches[0].name,
        id: matches[0].id
      };
    }
    
    return null;
  }
  
  /**
   * Extract market phase references
   * @param {string} message - Normalized message
   * @returns {Object|null} Market phase entity or null
   */
  extractMarketPhase(message) {
    // Use compromise.js if available
    if (window.nlp) {
      try {
        const doc = window.nlp(message);
        
        // Check for market phase tags
        const phaseMatch = doc.match('#MarketPhase').first();
        if (phaseMatch.found) {
          const phaseText = phaseMatch.text().toLowerCase();
          
          // Map phase text to standard phase IDs
          const phaseMap = {
            'bull market': 'bull_market',
            'bear market': 'bear_market',
            'accumulation phase': 'accumulation',
            'early cycle': 'early_bull',
            'mid cycle': 'mid_cycle',
            'late cycle': 'late_bull',
            'market top': 'potential_top',
            'distribution phase': 'distribution',
            'capitulation': 'capitulation',
            'euphoria': 'late_bull',
            'market bottom': 'accumulation',
            'disbelief phase': 'early_bull'
          };
          
          for (const [term, phase] of Object.entries(phaseMap)) {
            if (phaseText.includes(term)) {
              return {
                mentioned: phaseText,
                phase: phase,
                confidence: 0.9
              };
            }
          }
        }
        
        // Look for general cycle references with positional qualifiers
        if (doc.has('(where|what|current).*\\b(cycle|phase)\\b')) {
          return {
            mentioned: 'cycle position',
            phase: 'cycle_query',
            confidence: 0.8
          };
        }
      } catch (err) {
        console.error('Error in NLP market phase extraction:', err);
        // Fall back to standard method if compromise fails
      }
    }
    
    // Fall back to standard phase extraction
    const phaseTerms = [
      { term: 'bull market', phase: 'bull_market', confidence: 0.8 },
      { term: 'bear market', phase: 'bear_market', confidence: 0.8 },
      { term: 'accumulation phase', phase: 'accumulation', confidence: 0.9 },
      { term: 'early cycle', phase: 'early_bull', confidence: 0.85 },
      { term: 'mid cycle', phase: 'mid_cycle', confidence: 0.85 },
      { term: 'late cycle', phase: 'late_bull', confidence: 0.85 },
      { term: 'market top', phase: 'potential_top', confidence: 0.9 },
      { term: 'distribution phase', phase: 'distribution', confidence: 0.9 },
      { term: 'capitulation', phase: 'capitulation', confidence: 0.85 },
      { term: 'euphoria', phase: 'late_bull', confidence: 0.8 },
      { term: 'market bottom', phase: 'accumulation', confidence: 0.85 },
      { term: 'disbelief phase', phase: 'early_bull', confidence: 0.8 }
    ];
    
    const lowerMessage = message.toLowerCase();
    
    for (const term of phaseTerms) {
      if (lowerMessage.includes(term.term)) {
        return {
          mentioned: term.term,
          phase: term.phase,
          confidence: term.confidence
        };
      }
    }
    
    // Look for general cycle references with positional qualifiers
    if (/\b(where|what|current).*\b(cycle|phase)\b/i.test(lowerMessage)) {
      return {
        mentioned: 'cycle position',
        phase: 'cycle_query',
        confidence: 0.7
      };
    }
    
    return null;
  }
  
  /**
   * Extract black swan event references
   * @param {string} message - Normalized message
   * @returns {Object|null} Black swan entity or null
   */
  extractBlackSwan(message) {
    // Use compromise.js if available
    if (window.nlp) {
      try {
        const doc = window.nlp(message);
        
        // Check for Bitcoin event tags
        const eventMatch = doc.match('#BitcoinEvent').first();
        if (eventMatch.found) {
          const eventText = eventMatch.text().toLowerCase();
          
          // Map to standard event types
          if (eventText.includes('black swan')) {
            return {
              mentioned: eventText,
              event: 'general_black_swan',
              type: 'concept'
            };
          } else if (eventText.includes('covid') || eventText.includes('march 2020')) {
            return {
              mentioned: eventText,
              event: 'covid_crash',
              type: 'historical'
            };
          } else if (eventText.includes('luna') || eventText.includes('terra')) {
            return {
              mentioned: eventText,
              event: 'luna_collapse',
              type: 'historical'
            };
          } else if (eventText.includes('ftx')) {
            return {
              mentioned: eventText,
              event: 'ftx_collapse',
              type: 'historical'
            };
          } else if (eventText.includes('gox')) {
            return {
              mentioned: eventText,
              event: 'mt_gox_hack',
              type: 'historical'
            };
          }
        }
        
        // Check for extreme event terminology
        if (doc.has('extreme event') || doc.has('tail risk') || doc.has('market shock')) {
          return {
            mentioned: doc.match('(extreme event|tail risk|market shock)').text(),
            event: 'general_black_swan',
            type: 'concept'
          };
        }
      } catch (err) {
        console.error('Error in NLP black swan extraction:', err);
        // Fall back to standard method if compromise fails
      }
    }
    
    // Fall back to standard extraction
    const swanEvents = [
      { term: 'black swan', event: 'general_black_swan', type: 'concept' },
      { term: 'extreme event', event: 'general_black_swan', type: 'concept' },
      { term: 'tail risk', event: 'general_black_swan', type: 'concept' },
      { term: 'market shock', event: 'general_black_swan', type: 'concept' },
      { term: 'covid crash', event: 'covid_crash', type: 'historical' },
      { term: 'march 2020', event: 'covid_crash', type: 'historical' },
      { term: 'luna collapse', event: 'luna_collapse', type: 'historical' },
      { term: 'terra crash', event: 'luna_collapse', type: 'historical' },
      { term: 'ftx bankruptcy', event: 'ftx_collapse', type: 'historical' },
      { term: 'ftx collapse', event: 'ftx_collapse', type: 'historical' },
      { term: 'mt. gox', event: 'mt_gox_hack', type: 'historical' },
      { term: 'mt gox', event: 'mt_gox_hack', type: 'historical' }
    ];
    
    const lowerMessage = message.toLowerCase();
    
    for (const event of swanEvents) {
      if (lowerMessage.includes(event.term)) {
        return {
          mentioned: event.term,
          event: event.event,
          type: event.type
        };
      }
    }
    
    return null;
  }
  
  /**
   * Extract technical level references
   * @param {string} message - Normalized message
   * @returns {Object|null} Technical level entity or null
   */
  extractTechnicalLevel(message) {
    // Use compromise.js if available
    if (window.nlp) {
      try {
        const doc = window.nlp(message);
        
        // Find money values (price levels)
        const moneyMatches = doc.match('#Money').out('array');
        if (moneyMatches.length > 0) {
          const levels = [];
          
          moneyMatches.forEach(money => {
            // Extract numerical value
            const moneyDoc = window.nlp(money);
            const values = moneyDoc.money().json();
            
            if (values.length > 0 && values[0].number) {
              levels.push({
                mentioned: money,
                value: values[0].number,
                formatted: `$${values[0].number.toLocaleString()}`
              });
            } else {
              // Handle $30k style values
              const kMatch = money.match(/\$\s*(\d+)k/i);
              if (kMatch) {
                const value = parseInt(kMatch[1]) * 1000;
                levels.push({
                  mentioned: money,
                  value: value,
                  formatted: `$${value.toLocaleString()}`
                });
              }
            }
          });
          
          if (levels.length > 0) {
            return {
              levels: levels,
              count: levels.length
            };
          }
        }
        
        // Check for moving average references
        if (doc.has('#Value (day|) (ma|ema|sma|moving average)')) {
          const maText = doc.match('#Value (day|) (ma|ema|sma|moving average)').text();
          const value = doc.match('#Value').values()[0].number;
          
          const maType = maText.toLowerCase().includes('ema') ? 'ema' : 'sma';
          
          return {
            mentioned: maText,
            period: value,
            type: maType
          };
        }
        
        // Check for support/resistance references
        if (doc.has('(support|resistance|level|breakout|breakdown)')) {
          return {
            mentioned: 'technical level',
            type: 'level_reference'
          };
        }
      } catch (err) {
        console.error('Error in NLP technical level extraction:', err);
        // Fall back to standard method if compromise fails
      }
    }
    
    // Match price level references like "$30,000", "$30k", "$30K"
    const priceRegex = /\$\s*(\d{1,3}(?:,\d{3})*|\d+)(?:\s*k|\s*K)?/g;
    const matches = [...message.matchAll(priceRegex)];
    
    if (matches.length > 0) {
      const levels = matches.map(match => {
        let value = match[1].replace(/,/g, '');
        if (match[0].toLowerCase().includes('k')) {
          value = parseInt(value) * 1000;
        } else {
          value = parseInt(value);
        }
        
        return {
          mentioned: match[0],
          value: value,
          formatted: `$${value.toLocaleString()}`
        };
      });
      
      return {
        levels: levels,
        count: levels.length
      };
    }
    
    // Check for moving average references
    const maRegex = /\b(\d+)(?:\s*-?\s*day|d)?\s*(?:ma|ema|sma|moving average)\b/i;
    const maMatch = message.match(maRegex);
    
    if (maMatch) {
      return {
        mentioned: maMatch[0],
        period: parseInt(maMatch[1]),
        type: maMatch[0].toLowerCase().includes('ema') ? 'ema' : 'sma'
      };
    }
    
    // Check for support/resistance references
    if (/\b(support|resistance|level|breakout|breakdown)\b/i.test(message)) {
      return {
        mentioned: 'technical level',
        type: 'level_reference'
      };
    }
    
    return null;
  }
  
  /**
   * Extract sentiment indicators
   * @param {string} message - Normalized message
   * @returns {Object|null} Sentiment entity or null
   */
  extractSentimentIndicator(message) {
    // Use compromise.js if available
    if (window.nlp) {
      try {
        const doc = window.nlp(message);
        
        // Look for sentiment terminology
        const sentimentTerms = [
          { pattern: '(fear and greed|fear & greed)', indicator: 'fear_greed_index' },
          { pattern: 'market sentiment', indicator: 'general_sentiment' },
          { pattern: 'social sentiment', indicator: 'social_sentiment' },
          { pattern: '(twitter|social media) sentiment', indicator: 'twitter_sentiment' },
          { pattern: 'reddit sentiment', indicator: 'reddit_sentiment' },
          { pattern: 'funding rate', indicator: 'funding_rate' },
          { pattern: 'open interest', indicator: 'open_interest' },
          { pattern: '(long/short|long short) ratio', indicator: 'long_short_ratio' }
        ];
        
        for (const term of sentimentTerms) {
          if (doc.has(term.pattern)) {
            return {
              mentioned: doc.match(term.pattern).text(),
              indicator: term.indicator,
              type: term.indicator.includes('sentiment') ? 'sentiment' : 'market_data'
            };
          }
        }
        
        // Check for sentiment descriptors
        const sentimentDescriptors = [
          { pattern: 'euphoric', sentiment: 'extremely_positive', value: 0.9 },
          { pattern: 'bullish', sentiment: 'positive', value: 0.7 },
          { pattern: 'optimistic', sentiment: 'positive', value: 0.6 },
          { pattern: 'neutral', sentiment: 'neutral', value: 0.5 },
          { pattern: 'cautious', sentiment: 'slightly_negative', value: 0.4 },
          { pattern: 'bearish', sentiment: 'negative', value: 0.3 },
          { pattern: 'fearful', sentiment: 'very_negative', value: 0.2 },
          { pattern: 'capitulation', sentiment: 'extremely_negative', value: 0.1 }
        ];
        
        for (const descriptor of sentimentDescriptors) {
          if (doc.has(descriptor.pattern)) {
            return {
              mentioned: doc.match(descriptor.pattern).text(),
              sentiment: descriptor.sentiment,
              value: descriptor.value,
              type: 'sentiment_descriptor'
            };
          }
        }
      } catch (err) {
        console.error('Error in NLP sentiment extraction:', err);
        // Fall back to standard method if compromise fails
      }
    }
    
    // Fall back to standard sentiment extraction
    const sentimentTerms = [
      { term: 'fear and greed', indicator: 'fear_greed_index', type: 'market_sentiment' },
      { term: 'fear & greed', indicator: 'fear_greed_index', type: 'market_sentiment' },
      { term: 'market sentiment', indicator: 'general_sentiment', type: 'market_sentiment' },
      { term: 'social sentiment', indicator: 'social_sentiment', type: 'social_media' },
      { term: 'twitter sentiment', indicator: 'twitter_sentiment', type: 'social_media' },
      { term: 'reddit sentiment', indicator: 'reddit_sentiment', type: 'social_media' },
      { term: 'funding rate', indicator: 'funding_rate', type: 'derivatives' },
      { term: 'open interest', indicator: 'open_interest', type: 'derivatives' },
      { term: 'long/short ratio', indicator: 'long_short_ratio', type: 'derivatives' },
      { term: 'long short ratio', indicator: 'long_short_ratio', type: 'derivatives' }
    ];
    
    const lowerMessage = message.toLowerCase();
    
    for (const term of sentimentTerms) {
      if (lowerMessage.includes(term.term)) {
        return {
          mentioned: term.term,
          indicator: term.indicator,
          type: term.type
        };
      }
    }
    
    // Check for general sentiment descriptors
    const sentimentDescriptors = [
      { term: 'euphoric', sentiment: 'extremely_positive', value: 0.9 },
      { term: 'bullish', sentiment: 'positive', value: 0.7 },
      { term: 'optimistic', sentiment: 'positive', value: 0.6 },
      { term: 'neutral', sentiment: 'neutral', value: 0.5 },
      { term: 'cautious', sentiment: 'slightly_negative', value: 0.4 },
      { term: 'bearish', sentiment: 'negative', value: 0.3 },
      { term: 'fearful', sentiment: 'very_negative', value: 0.2 },
      { term: 'capitulation', sentiment: 'extremely_negative', value: 0.1 }
    ];
    
    for (const descriptor of sentimentDescriptors) {
      if (lowerMessage.includes(descriptor.term)) {
        return {
          mentioned: descriptor.term,
          sentiment: descriptor.sentiment,
          value: descriptor.value,
          type: 'sentiment_descriptor'
        };
      }
    }
    
    return null;
  }
  
  /**
   * Process a message for intent and entities with enhanced NLP
   * @param {string} message - User's message
   * @param {ConversationContext} conversationContext - Conversation context
   * @returns {Object} Processed message with intent and entities
   */
  processMessage(message, conversationContext) {
    // Resolve references if context is provided
    const resolvedMessage = conversationContext ? 
      conversationContext.resolveReference(message) : message;
    
    // Classify intent with enhanced NLP
    const intentClassification = this.classifyIntent(resolvedMessage);
    
    // Extract entities with enhanced NLP
    const entities = this.extractEntities(resolvedMessage);
    
    // Update user profile if context is provided
    if (conversationContext) {
      conversationContext.updateUserProfile(resolvedMessage);
    }
    
    // Cross-reference entities for improved context
    const enhancedContext = this.enhanceContextWithEntities(entities, intentClassification);
    
    return {
      message: resolvedMessage,
      intent: intentClassification.intent,
      confidence: intentClassification.confidence,
      matchType: intentClassification.matchType,
      entities: entities,
      concept: intentClassification.concept || (entities.concept ? entities.concept.id : null),
      marketPhase: intentClassification.marketPhase || (entities.marketPhase ? entities.marketPhase.phase : null),
      blackSwan: intentClassification.blackSwan || (entities.blackSwan ? entities.blackSwan.event : null),
      context: conversationContext ? {
        ...conversationContext.getQueryContext(),
        ...enhancedContext
      } : enhancedContext
    };
  }
  
  /**
   * Enhance context by cross-referencing entities
   * @param {Object} entities - Extracted entities
   * @param {Object} intentClassification - Intent classification
   * @returns {Object} Enhanced context
   */
  enhanceContextWithEntities(entities, intentClassification) {
    const enhancedContext = {};
    
    // Add risk relevance if we have risk-related entities
    if (intentClassification.intent === 'risk_assessment' || 
        (entities.concept && entities.concept.id === 'crash_risk')) {
      enhancedContext.riskRelevant = true;
    }
    
    // Add historical relevance for comparison intent
    if (intentClassification.intent === 'historical_comparison') {
      enhancedContext.historicalRelevant = true;
    }
    
    // Add technical trading context if we have technical levels
    if (entities.technicalLevel) {
      enhancedContext.technicalRelevant = true;
      
      if (entities.technicalLevel.levels && entities.technicalLevel.levels.length > 0) {
        enhancedContext.priceLevels = entities.technicalLevel.levels.map(l => l.value);
      }
    }
    
    // Add market phase context
    if (entities.marketPhase) {
      enhancedContext.marketPhase = entities.marketPhase.phase;
    }
    
    // Add time horizon context based on timeframe
    if (entities.timeframe) {
      if (entities.timeframe.value <= 7) {
        enhancedContext.timeHorizon = 'very_short';
      } else if (entities.timeframe.value <= 30) {
        enhancedContext.timeHorizon = 'short';
      } else if (entities.timeframe.value <= 90) {
        enhancedContext.timeHorizon = 'medium';
      } else {
        enhancedContext.timeHorizon = 'long';
      }
    }
    
    // Add sentiment context
    if (entities.sentimentIndicator) {
      enhancedContext.sentimentRelevant = true;
      
      if (entities.sentimentIndicator.type === 'sentiment_descriptor') {
        enhancedContext.sentimentValue = entities.sentimentIndicator.value;
      }
    }
    
    return enhancedContext;
  }
}
