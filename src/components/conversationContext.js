// src/components/conversationContext.js
export class ConversationContext {
  constructor() {
    this.maxHistoryLength = 10;
    this.conversationHistory = [];
    this.entities = {
      timeframes: {},      // e.g. {mentioned: "30 days", value: 30}
      metrics: {},         // e.g. {mentioned: "MVRV ratio", id: "MVRV"}
      months: {},          // e.g. {mentioned: "January", index: 0}
      percentages: {},     // e.g. {mentioned: "20%", value: 0.2}
    };
    this.currentTopic = null;
    this.references = {};  // Store references to "it", "that", etc.
    this.userProfile = {
      knowledgeLevel: "intermediate",  // basic, intermediate, advanced
      interests: [],                   // Topics user has asked about frequently
      riskTolerance: "neutral"         // risk-averse, neutral, risk-seeking
    };
    
    // Initialize compromise for better reference resolution if available
    this.hasNlpSupport = typeof window.nlp === 'function';
  }

  // Add a message to the conversation history
  addMessage(role, content, entities = {}) {
    this.conversationHistory.unshift({
      role,
      content,
      timestamp: new Date(),
      entities
    });
    
    // Limit history length
    if (this.conversationHistory.length > this.maxHistoryLength) {
      this.conversationHistory.pop();
    }
    
    // Update entities based on this message
    this.updateEntities(entities);
    
    // Update references
    if (role === 'bot') {
      this.references.lastResponse = content;
    } else {
      this.references.lastQuery = content;
    }
  }
  
  // Update tracked entities
  updateEntities(newEntities) {
    // Merge new entities with existing ones
    Object.keys(newEntities).forEach(category => {
      if (this.entities[category]) {
        // Save the latest entity for each category
        if (newEntities[category].id || newEntities[category].value) {
          this.entities[category].latest = newEntities[category];
        }
        
        // Merge with existing entities
        this.entities[category] = {
          ...this.entities[category],
          ...newEntities[category]
        };
      }
    });
    
    // Update topic if significant entities were found
    if (newEntities.metrics && Object.keys(newEntities.metrics).length > 0) {
      this.currentTopic = 'metrics';
    } else if (newEntities.timeframes && Object.keys(newEntities.timeframes).length > 0) {
      this.currentTopic = 'timeframe';
    } else if (newEntities.concept) {
      this.currentTopic = 'concept';
      this.lastConcept = newEntities.concept;
    }
  }
  
  // Resolve references like "it", "this", "that", etc.
  resolveReference(text) {
    // Use compromise.js if available for more sophisticated reference resolution
    if (this.hasNlpSupport) {
      try {
        const doc = window.nlp(text);
        const hasReferences = doc.match('#Pronoun').found;
        
        if (hasReferences) {
          // If we have a specific concept we're referring to
          if (this.currentTopic === 'concept' && this.lastConcept) {
            // Replace it/this/that with the last concept mentioned
            let resolvedText = text;
            const pronounMatches = doc.match('(it|this|that)').out('array');
            
            if (pronounMatches.length > 0) {
              // Don't replace pronouns that are clearly not referring to our concept
              // For example, don't replace "this month" or "that time"
              const avoidPatterns = ['this month', 'that time', 'this time', 'that day', 'this year'];
              let shouldReplace = true;
              
              for (const pattern of avoidPatterns) {
                if (text.toLowerCase().includes(pattern)) {
                  shouldReplace = false;
                  break;
                }
              }
              
              if (shouldReplace) {
                resolvedText = text.replace(/\b(it|this|that)\b/i, this.lastConcept.mentioned);
                return resolvedText;
              }
            }
          }
          
          // If the last topic was about a specific metric
          if (this.currentTopic === 'metrics' && this.entities.metrics.latest) {
            let resolvedText = text;
            const pronounMatches = doc.match('(it|this|that)').out('array');
            
            if (pronounMatches.length > 0) {
              resolvedText = text.replace(/\b(it|this|that)\b/i, this.entities.metrics.latest.mentioned);
              return resolvedText;
            }
          }
          
          // If the last topic was about a timeframe
          if (this.currentTopic === 'timeframe' && this.entities.timeframes.latest) {
            let resolvedText = text;
            const pronounMatches = doc.match('(it|this|that)').out('array');
            
            if (pronounMatches.length > 0 && !/\b(this|that) (month|day|week|year)\b/i.test(text)) {
              resolvedText = text.replace(/\b(it|this|that)\b/i, this.entities.timeframes.latest.mentioned);
              return resolvedText;
            }
          }
        }
      } catch (err) {
        console.error('Error in NLP reference resolution:', err);
        // Fall back to simpler method
      }
    }
    
    // Fallback to simpler reference resolution
    const referenceTerms = /\b(it|this|that|these|those)\b/i;
    
    if (referenceTerms.test(text)) {
      // If the last topic was about a specific metric
      if (this.currentTopic === 'metrics' && this.entities.metrics.latest) {
        return text.replace(referenceTerms, this.entities.metrics.latest.mentioned);
      }
      
      // If the last topic was about a timeframe
      if (this.currentTopic === 'timeframe' && this.entities.timeframes.latest) {
        return text.replace(referenceTerms, this.entities.timeframes.latest.mentioned);
      }
      
      // Default is to assume referring to the last response
      if (this.references.lastResponse) {
        return text + " [Regarding: previous response]";
      }
    }
    
    return text;
  }
  
  // Get contextual parameters for a query
  getQueryContext() {
    return {
      timeframe: this.entities.timeframes.latest ? this.entities.timeframes.latest.value : 30,
      metric: this.entities.metrics.latest ? this.entities.metrics.latest.id : null,
      month: this.entities.months.latest ? this.entities.months.latest.index : new Date().getMonth(),
      percentThreshold: this.entities.percentages.latest ? this.entities.percentages.latest.value : null,
      userLevel: this.userProfile.knowledgeLevel,
      riskTolerance: this.userProfile.riskTolerance,
      interests: this.userProfile.interests
    };
  }
  
  // Update user profile based on interaction patterns
  updateUserProfile(message) {
    // Use compromise.js for better user profile analysis if available
    if (this.hasNlpSupport) {
      try {
        const doc = window.nlp(message);
        
        // Check knowledge level using specialized terminology
        if (doc.has('#CryptoMetric') || doc.has('(bayesian|poisson|distribution|percentile)')) {
          // User mentions specific technical terms
          this.userProfile.knowledgeLevel = "advanced";
        } else if (doc.has('(on-chain|cycle|seasonality|nvt|mvrv)')) {
          // User mentions semi-technical terms
          if (this.userProfile.knowledgeLevel !== "advanced") {
            this.userProfile.knowledgeLevel = "intermediate";
          }
        }
        
        // Check risk tolerance
        if (doc.has('(safe|protect|worried|concerned|fear|scary)')) {
          this.userProfile.riskTolerance = "risk-averse";
        } else if (doc.has('(opportunity|potential|upside|chance|profit|moon|all in)')) {
          this.userProfile.riskTolerance = "risk-seeking";
        }
        
        // Track topics of interest
        const interestAreas = [
          {name: 'technical', pattern: '(chart|pattern|trend|support|resistance)'},
          {name: 'fundamental', pattern: '(on-chain|adoption|transaction|volume|active)'},
          {name: 'sentiment', pattern: '(sentiment|feel|market mood|emotion|fear|greed)'},
          {name: 'macro', pattern: '(fed|rates|inflation|economy|dollar|macro)'},
        ];
        
        interestAreas.forEach(area => {
          if (doc.has(area.pattern) && !this.userProfile.interests.includes(area.name)) {
            this.userProfile.interests.push(area.name);
          }
        });
        
        return;
      } catch (err) {
        console.error('Error in NLP user profile update:', err);
        // Fall back to standard method
      }
    }
    
    // Fall back to standard user profile update
    // Check for technical terms to gauge knowledge level
    const technicalTerms = ['volatility', 'seasonality', 'bayesian', 'poisson', 'distribution', 
                          'on-chain', 'mvrv', 'nvt', 'cycle', 'percentile'];
    let technicalCount = 0;
    
    technicalTerms.forEach(term => {
      if (message.toLowerCase().includes(term)) {
        technicalCount++;
      }
    });
    
    if (technicalCount >= 3) {
      this.userProfile.knowledgeLevel = "advanced";
    } else if (technicalCount >= 1) {
      this.userProfile.knowledgeLevel = "intermediate";
    }
    
    // Check for risk tolerance indicators
    if (/\b(safe|protect|worried|concerned|fear|scary)\b/i.test(message)) {
      this.userProfile.riskTolerance = "risk-averse";
    } else if (/\b(opportunity|potential|upside|chance|profit)\b/i.test(message)) {
      this.userProfile.riskTolerance = "risk-seeking";
    }
    
    // Track topics of interest
    const interestAreas = [
      {name: 'technical', pattern: /\b(chart|pattern|trend|support|resistance)\b/i},
      {name: 'fundamental', pattern: /\b(on-chain|adoption|transaction|volume|active)\b/i},
      {name: 'sentiment', pattern: /\b(sentiment|feel|market mood|emotion|fear|greed)\b/i},
      {name: 'macro', pattern: /\b(fed|rates|inflation|economy|dollar|macro)\b/i},
    ];
    
    interestAreas.forEach(area => {
      if (area.pattern.test(message) && !this.userProfile.interests.includes(area.name)) {
        this.userProfile.interests.push(area.name);
      }
    });
  }
}
