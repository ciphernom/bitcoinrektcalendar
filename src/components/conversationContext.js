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
    }
  }
  
  // Resolve references like "it", "this", "that", etc.
  resolveReference(text) {
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
      userLevel: this.userProfile.knowledgeLevel
    };
  }
  
  // Update user profile based on interaction patterns
  updateUserProfile(message) {
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
