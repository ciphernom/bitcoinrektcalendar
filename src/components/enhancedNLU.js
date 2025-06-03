import { knowledgeGraph } from './knowledgeGraph.js';

const FUZZY_MATCH_THRESHOLD = 0.78; // Threshold for fuzzy matching
const HIGH_CONFIDENCE_THRESHOLD = 0.80;
const MEDIUM_CONFIDENCE_THRESHOLD = 0.50;
const MIN_ALT_INTENT_CONFIDENCE = 0.50;
const MIN_ALT_INTENT_PRIMARY_RATIO = 0.65; // Alternative intent confidence must be at least 65% of primary's

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
    this.knowledgeGraph = knowledgeGraph; // Assuming knowledgeGraph is imported and available
  }

  /**
   * Calculates the Levenshtein distance between two strings.
   * @param {string} s1 - The first string.
   * @param {string} s2 - The second string.
   * @returns {number} The Levenshtein distance.
   */
  static levenshteinDistance(s1, s2) {
    if (s1.length < s2.length) {
      return EnhancedNLU.levenshteinDistance(s2, s1);
    }
    if (s2.length === 0) {
      return s1.length;
    }
    let previousRow = Array.from({ length: s2.length + 1 }, (_, i) => i);
    for (let i = 0; i < s1.length; i++) {
      const char1 = s1[i];
      let currentRow = [i + 1];
      for (let j = 0; j < s2.length; j++) {
        const char2 = s2[j];
        const insertions = previousRow[j + 1] + 1;
        const deletions = currentRow[j] + 1;
        const substitutions = previousRow[j] + (char1 === char2 ? 0 : 1);
        currentRow.push(Math.min(insertions, deletions, substitutions));
      }
      previousRow = currentRow;
    }
    return previousRow[s2.length];
  }

  /**
   * Calculates a normalized similarity score (0.0 to 1.0) between two strings.
   * @param {string} s1 - The first string.
   * @param {string} s2 - The second string.
   * @returns {number} The similarity score.
   */
  static calculateSimilarity(s1, s2) {
    const longer = s1.length > s2.length ? s1 : s2;
    const shorter = s1.length > s2.length ? s2 : s1;
    if (longer.length === 0) {
      return 1.0;
    }
    const distance = EnhancedNLU.levenshteinDistance(longer, shorter);
    return (longer.length - distance) / longer.length;
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
          keyPhrases: ['risk', 'chance', 'probability', 'odds', 'likelihood', 'crash', 'correction', 'danger', 'downside', 'vulnerability', 'threat', 'exposure', 'hazard',  'threat level', 'score', 'outlook', 'btc risk'],
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
            'assess current market risk',
            'is bitcoin in a risky zone',
            'tell me the risk outlook',
            'current btc crash likelihood',
            'how much danger for a big drop',
            'give me the risk score',
            'analyze current market threat level'
          ],
          patterns: [
            /\b(what|how).*?\b(risk|risky|chance|probability|odds|likelihood)\b/i,
            /\b(crash|correction|dip|drop|dump|fall|decline).*?\b(risk|probability|chance|likelihood|odds)\b/i,
            /\b(risk|probability|chance|odds).*?\b(crash|correction|dip|drop|dump|fall|decline)\b/i,
            /\bhow likely\b.*?\b(crash|correction|dip|drop|dump|fall|decline)\b/i,
            /\bvulnerability\b|\bvulnerable\b/i,
            /\bdanger\b|\bdangerous\b/i,
            /\bdownside\b|\bexposure\b/i,
            /\brisk (level|assessment|analysis|evaluation|measure)\b/i,
            /\bmarket risk\b/i,
            /\bcurrent risk\b/i,
            /\b(will|going to).*?\b(crash|dump|drop|dip|collapse|correct)\b/i,
            /\b(bitcoin|btc|market) risk (assessment|evaluation|level|score|outlook)\b/i
          ],
          excludePhrases: ['strategy', 'historical', 'compare']
        },
        {
          name: 'strategy_advice',
          keyPhrases: ['strategy', 'advice', 'should i', 'recommend', 'suggestion', 'position', 'exposure', 'allocation', 'portfolio', 'approach', 'best action', 'tactic', 'move', 'play'],
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
          ],
          patterns: [
            /\b(what|how).*?\b(should|recommend|advise|suggest).*?\b(do|buy|sell|trade|invest|act|position|allocate|hold)\b/i,
            /\b(strategy|advice|recommendation|suggestion|tactic|approach|action|move|play)\b/i,
            /\b(should|could|would|shall|might).*?\b(buy|sell|trade|invest|position|allocate|hold|exit|enter|add|reduce)\b/i,
            /\b(good|bad|right|best|smart|wise|optimal).*?\b(time|opportunity|moment|decision).*?\b(to|for).*?\b(buy|sell|enter|exit|invest|trade)\b/i,
            /\b(buy|sell|hold|trade) (now|signal|recommendation)\b/i,
            /\b(how|what).*?\b(position|allocate|approach|handle|manage)\b/i,
            /\bwhat (to|should) do\b/i,
            /\badvice\b/i,
            /\bis (now|it|this).*?\b(time|opportunity|chance)\b/i,
            /\b(portfolio|position|allocation|exposure) (management|adjustment|strategy)\b/i,
            /\bhow (to|do i|should i) (play|approach|handle) this\b/i
          ]
        },
        {
          name: 'metric_analysis',
          keyPhrases: ['metric', 'mvrv', 'nvt', 'on-chain', 'indicator', 'explain', 'address', 'transaction', 'puell', 'sopr', 'hash ribbon', 'stablecoin', 'ratio', 'analysis', 'measure', 'data', 'analytics', 'fundamentals','details on', 'status of', 'current reading'],
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
            'hash ribbon status',
            'what does sopr tell us',
            'give me details on puell multiple',
            'current status of hash ribbons'
          ],
          patterns: [
            /\b(explain|tell about|describe|what is|how is|details on).*?\b(mvrv|nvt|puell|sopr|hash ribbon|stablecoin ratio|metric|indicator)\b/i,
            /\b(on-chain|onchain|chain) (metric|analysis|data|indicator|activity|status|health)\b/i,
            /\b(metric|indicator|measurement|analysis).*?\b(say|tell|show|indicate|suggest|look|status|analysis)\b/i,
            /\b(active|unique) address(es)?\b/i,
            /\btransaction (volume|value|activity|count)\b/i,
            /\b(stablecoin|stable|tether|usdt|usdc) (ratio|supply|reserve|percentage)\b/i,
            /\b(mvrv|market.*?realized|market to realized)\b/i,
            /\b(nvt|network.*?transaction|network value|value.*?transaction)\b/i,
            /\b(puell|multiple|mining profitability)\b/i,
            /\b(sopr|spent output|profit ratio)\b/i,
            /\b(hash|ribbon|miner|mining) (indicator|metric|status)\b/i,
            /\b(fundamental|fundamentals|health|status|condition)\b/i,
            /\b(what|how) do (the|) metrics (say|look|indicate|show)\b/i
          ]
        },
        {
          name: 'market_prediction',
          keyPhrases: ['predict', 'forecast', 'next', 'future', 'outlook', 'projection', 'coming', 'anticipate', 'expected', 'likely to', 'probability of', 'potential for', 'upcoming', 'estimate', 'projection', 'expect', 'forecast'],
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
          ],
          patterns: [
            /\b(predict|forecast|project|anticipate|estimate).*?\b(price|market|movement|direction|trend|behavior|action)\b/i,
            /\b(what will|what's going to|what is going to).*?\b(happen|occur|take place|unfold)\b/i,
            /\b(next|coming|future|upcoming|following).*?\b(week|month|quarter|year|days|time|period)\b/i,
            /\b(will|going to|about to).*?\b(happen|occur|take place|unfold|do|move|trend|change)\b/i,
            /\b(outlook|projection|forecast|prediction|anticipation|expectation)\b/i,
            /\b(likely|probable|expected|anticipated|projected).*?\b(outcome|result|consequence|direction|movement)\b/i,
            /\bmarket (direction|trend|trajectory|path|future|destiny)\b/i,
            /\b(probability|chance|likelihood|odds).*?\b(of|for).*?\b(new|higher|lower|increase|decrease|rise|drop)\b/i,
            /\b(potential|possibility).*?\b(for|of).*?\b(growth|decline|continuation|reversal|rally|correction)\b/i,
            /\b(expect|anticipate|foresee) (to|the|a|an) (see|have|get|witness|experience)\b/i,
            /\bwhere (is|will).*?\b(price|market|bitcoin|btc) (go|head|end up|land)\b/i,
            /\bhow (high|low) (will|can|could|might) (it|bitcoin|btc|the price) (go|reach|get|climb|fall)\b/i
          ]
        },
        {
          name: 'scenario_simulation',
          keyPhrases: ['what if', 'scenario', 'simulation', 'rise', 'drop', 'fall', 'increase', 'decrease', 'crash', 'breakout', 'rally', 'consolidate', 'stagnate', 'hypothetical', 'model', 'simulate', 'test', 'suppose'],
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
          ],
          patterns: [
            /\bwhat if\b.*?\b(bitcoin|btc|price|market|it)\b.*?\b(goes|drops|falls|rises|increases|decreases|crashes|dumps|pumps|moons|tanks|collapses)\b/i,
            /\b(if|should|when).*?\b(bitcoin|btc|price|market|it)\b.*?\b(goes|drops|falls|rises|increases|decreases|crashes|dumps|pumps|moons|tanks|collapses)\b/i,
            /\b(scenario|simulation|model|case|situation|circumstance|possibility)\b.*?\b(where|with|of|that|when)\b/i,
            /\b(simulate|model|test|run|calculate|compute)\b.*?\b(crash|rally|drop|rise|bull|bear|increase|decrease|scenario|movement)\b/i,
            /\b(impact|effect|result|consequence|outcome)\b.*?\b(of|from|after)\b.*?\b([0-9]+%|percent|substantial|significant|major|minor)\b/i,
            /\b(what|how).*?\b(happens|occurs|changes|adjusts|responds|reacts)\b.*?\b(if|when|after)\b/i,
            /\bif.*?\b(breaks|exceeds|surpasses|crosses|moves above|jumps over|falls below|drops under|decreases below)\b/i,
            /\b(sideways|consolidation|ranging|stagnant|flat)\b.*?\b(action|movement|trading|market|period|phase)\b/i,
            /\b(rapid|quick|sudden|unexpected|sharp|dramatic)\b.*?\b(rally|crash|increase|decrease|rise|fall|movement|change)\b/i,
            /\b(liquidation|margin call|forced selling|panic|capitulation|cascade)\b/i,
            /\b(suppose|let's say|assuming|hypothetically|theoretically)\b/i,
            /\b(drops|falls|rises|increases|decreases|moves).*?\bby [0-9]+%\b/i
          ]
        },
        {
          name: 'historical_comparison',
          keyPhrases: ['historical', 'compare', 'previous', 'past', 'pattern', 'similar', 'history', 'before', 'precedent', 'analogous', 'comparable', 'resembles', 'earlier', 'prior', 'last time', 'correlation', 'previously',  'similarities', 'resemblance', '2017', '2018', '2019', '2020', '2021', 'cycle top', 'cycle bottom', 'last bull', 'previous bear', 'reminds of', 'wondering if', 'similarity between', 'parallels'],
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
          ],
            patterns: [
              /\b(historical|historic|history|past|previous|prior|earlier|before).*?\b(crash|rally|cycle|pattern|situation|condition|market|movement|event)\b/i,
              /\b(compare|comparison|correlation|relation|similarity|resemblance)\b.*?\b(to|with|against|versus|vs)\b.*?\b(past|history|previous|prior|earlier|before)\b/i,
              /\b(similar|like|same|comparable|analogous|equivalent|matching|resembling)\b.*?\b(to|as)\b.*?\b(past|previous|prior|earlier|history|historical|before)\b/i,
              /\b(what|how|when).*?\b(happened|occurred|took place|unfolded|transpired)\b.*?\b(in|during|through|throughout)\b.*?\b(past|previous|last|prior)\b/i,
              /\bprecedent\b/i,
              /\bhistorical (analog|analogue|analogy|parallel|example|instance|case|reference)\b/i,
              /\b(situation|condition|position|environment|scenario|setup|structure)\b.*?\b(like|similar to|resembling)\b.*?\b(today|now|present|current)\b/i,
              /\b(how|what).*?\b(past|historical|previous)\b.*?\b(can|could|might|may|would|will)\b.*?\b(inform|guide|help|assist|tell|indicate|suggest)\b/i,
              /\b(last|previous) time (this|that|it|we|bitcoin|btc|market) (happened|occurred|took place|was|reached|hit|saw|experienced)\b/i,
              /\b(pattern|cycle|structure|formation|behavior) from (past|history|previous|prior|earlier|before)\b/i,
              /\b(has this|have we) (happened|occurred|seen|experienced|witnessed) (before|previously|in the past)\b/i,
              /\bcompare (current|today's|present|this) (market|situation|condition|position) (to|with|against) (past|history|previous|prior)\b/i,
              /\b(similarity|similarities|resemblance|parallel|comparison)\b.*?\b(between|among)\b/i,
              /\b(compare|comparing)\b.*?\b(today|current|present|now)\b.*?\b(with|to|and)\b.*?\b(20\d\d|before|previous|past)\b/i,
              /\b(20\d\d|previous cycle|last cycle|prior cycle)\b.*?\b(top|bottom|peak|crash|rally|bull|bear)\b/i,
              /\b(wondering|curious|interested|question) (if|whether|about).*?\b(similar|like|comparison|resemblance)\b/i,
              /\b(today\'?s?|current|present).*?\b(versus|vs|compared to|against).*?\b(20\d\d|previous|past|before|last cycle)\b/i,
              /\b(before|during|after) the (20\d\d|previous|last|prior) (top|bottom|cycle|bull|bear|crash|market)/i,
              /\b(any|some|possible|potential) (similarity|similarities|parallels|resemblance|comparison)\b/i,
              /\b(market) (structure|condition|state|position).*?\b(like|similar|same as|resemble|match)\b/i,
              /\b(reminds|reminiscent|evocative|suggestive) of\b/i,
              /\blike what (happened|occurred|took place|unfolded)\b/i,
              /\b(can|could) (you|we) (compare|draw parallels|see similarities)\b/i,
              /\b(today|now|currently|presently|at this point|at this time).*?\b(vs|versus).*?\b(then|that time|those days|back then)\b/i
            ]
        },
        {
          name: 'educational',
          keyPhrases: ['explain', 'how does', 'what is', 'meaning', 'definition', 'understand', 'learn', 'concept', 'mechanism', 'function', 'principle', 'theory', 'basics', 'overview', 'tutorial', 'guide', 'describe', 'teach'],
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
          ],
          patterns: [
            /\b(explain|describe|clarify|elaborate on|elucidate|tell me about)\b.*?\b(how|what|why|when|where|which)\b/i,
            /\b(what|how) (is|are|does|do).*?\b(mean|work|function|operate|happen|occur)\b/i,
            /\b(meaning|definition|explanation|description|concept|idea|theory|principle)\b.*?\b(of|for|behind|underlying)\b/i,
            /\b(understand|comprehend|grasp|get|learn about)\b/i,
            /\b(mechanism|function|operation|process|procedure|system|method|methodology)\b.*?\b(of|for|behind|underlying)\b/i,
            /\b(basics|fundamentals|essentials|core|101|introduction|primer|overview)\b/i,
            /\b(teach|show|guide|walk through|instruct|educate|tutor)\b.*?\b(me|us|about|on|regarding)\b/i,
            /\b(can you|could you|would you) (explain|describe|clarify|elaborate on|tell me about)\b/i,
            /\b(what|why|how|when|where|who) (exactly|specifically|precisely|actually) (is|are|does|do)\b/i,
            /\bhelp me (understand|learn|grasp|comprehend)\b/i,
            /\b(concept|theory|principle|idea|notion|model)\b.*?\b(of|behind|underlying|related to)\b/i,
            /\b(what's|whats|what is) (the|a|an) (purpose|point|role|goal|objective|aim|function)\b/i,
            /\b(how|why) (does|do|would|could|should|might) (this|that|it|they) (work|happen|occur|function)\b/i
          ]
        },
        {
          name: 'knowledge_explorer',
          keyPhrases: ['knowledge', 'graph', 'explorer', 'explore', 'concepts', 'relationships', 'terms', 'connections', 'map', 'network', 'linked', 'related', 'ontology', 'taxonomy', 'structure', 'framework', 'overview', 'browse'],
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
          ],
          patterns: [
            /\b(explore|browse|navigate|traverse|search|look through|examine|investigate)\b.*?\b(knowledge|concept|term|relationship|connection|network|graph|map)\b/i,
            /\b(show|display|present|visualize|view|see)\b.*?\b(knowledge|concept|term|relationship|connection|network|graph|map)\b/i,
            /\b(what|which) (concepts|terms|ideas|notions|entities|elements|factors|metrics|indicators)\b/i,
            /\b(knowledge|concept|term) (graph|map|network|structure|framework|organization|hierarchy|tree)\b/i,
            /\b(connections|relationships|links|associations|correlations)\b.*?\b(between|among|with|to|from)\b/i,
            /\b(related|connected|linked|associated|correlated)\b.*?\b(to|with|concepts|terms|ideas|factors)\b/i,
            /\b(what|which) (factors|elements|variables|metrics|indicators|conditions)\b.*?\b(influence|affect|impact|drive|determine)\b/i,
            /\b(map|mapping|visualization|diagram|chart|graph)\b.*?\b(of|for|related to|showing|displaying)\b/i,
            /\b(ontology|taxonomy|hierarchy|structure|organization|classification|categorization)\b/i,
            /\b(overview|summary|outline|brief|snapshot|preview)\b.*?\b(of|for|on|about|regarding)\b/i,
            /\b(how are) (concepts|terms|ideas|metrics|indicators) (related|connected|linked|organized|structured|arranged)\b/i,
            /\b(what do you know about|tell me about|explain) (different|various|multiple) (concepts|terms|metrics|indicators)\b/i
          ]
        },
        {
          name: 'market_structure',
          keyPhrases: ['market structure', 'support', 'resistance', 'trend', 'pattern', 'formation', 'technical', 'level', 'breakout', 'breakdown', 'divergence', 'momentum', 'volume', 'moving average', 'consolidation', 'range', 'channel'],
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
          ],
          patterns: [
            /\b(market|price|chart) (structure|pattern|formation|framework|architecture|construction|setup|configuration)\b/i,
            /\b(support|resistance|pivot|key|critical|important) (level|point|zone|area|line|price)\b/i,
            /\b(trend|direction|movement|momentum|trajectory|path|course) (analysis|strength|quality|health|assessment|evaluation)\b/i,
            /\b(technical|chart|price) (pattern|formation|structure|setup|configuration|arrangement)\b/i,
            /\b(breakout|breakdown|break|breach|violation|penetration|crossing)\b.*?\b(above|below|through|past|over|under|resistance|support)\b/i,
            /\b(divergence|convergence|agreement|disagreement|confirmation|contradiction)\b/i,
            /\b(momentum|strength|force|power|vigor|energy|intensity|magnitude)\b/i,
            /\b(volume|activity|participation|trading|transaction) (profile|analysis|assessment|pattern|structure|behavior)\b/i,
            /\b(moving average|MA|EMA|SMA|WMA|VWMA)\b.*?\b(cross|crossover|golden cross|death cross|above|below|support|resistance)\b/i,
            /\b(consolidation|accumulation|distribution|ranging|sideways|flat|horizontal)\b.*?\b(pattern|structure|phase|period|zone|area)\b/i,
            /\b(range|channel|band|corridor|zone|path|boundary|limit)\b.*?\b(trading|bound|resistance|support|upper|lower)\b/i,
            /\b(analyze|assess|evaluate|examine|study|inspect|review)\b.*?\b(market|price|chart|technical)\b/i,
            /\b(higher|lower) timeframe\b/i,
            /\b(bull|bear|bullish|bearish) (flag|pennant|wedge|triangle|rectangle|formation|pattern|structure)\b/i
          ]
        },
        {
          name: 'sentiment_analysis',
          keyPhrases: ['sentiment', 'fear', 'greed', 'market mood', 'investor psychology', 'social sentiment', 'crowd psychology', 'optimism', 'pessimism', 'euphoria', 'capitulation', 'panic', 'emotion', 'feeling', 'attitude', 'perception'],
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
          ],
          patterns: [
            /\b(sentiment|mood|feeling|emotion|psychology|attitude|mindset|mentality|perception|outlook)\b.*?\b(market|investor|trader|participant|crowd|retail|institution)\b/i,
            /\b(fear|greed|panic|euphoria|optimism|pessimism|anxiety|confidence|trust|distrust|doubt|certainty|hope|despair)\b/i,
            /\b(fear and greed|fear & greed)\b.*?\b(index|indicator|measurement|reading|level|ratio|data|score)\b/i,
            /\b(social|media|twitter|reddit|forum|community|public) (sentiment|opinion|view|perception|reaction|response|feeling)\b/i,
            /\b(investor|trader|market|participant|crowd|retail|institutional) (psychology|behavior|attitude|reaction|response|thinking|belief|expectation)\b/i,
            /\b(crowd|herd|group|mass|collective) (psychology|mentality|thinking|behavior|movement|action|reaction)\b/i,
            /\b(bullish|bearish) (sentiment|feeling|outlook|expectation|view|opinion|consensus|agreement)\b/i,
            /\b(market|investor|trader|public) (euphoria|mania|hysteria|frenzy|panic|fear|anxiety|worry|concern|capitulation|surrender|desperation)\b/i,
            /\b(optimism|pessimism|positive|negative) (vs|versus|compared to|against|over)\b/i,
            /\b(sentiment|mood|feeling|emotion|psychology) (divergence|convergence|disagreement|agreement|confirmation|contradiction)\b/i,
            /\b(measure|assess|evaluate|gauge|quantify|analyze|examine) (sentiment|mood|feeling|psychology|perception|opinion)\b/i,
            /\b(what are people|what is everyone|what's the market|how are investors) (feeling|thinking|saying|posting|believing)\b/i,
            /\b(is|are) (investors|traders|the market|people) (feeling|being|becoming) (bullish|bearish|optimistic|pessimistic|fearful|greedy)\b/i
          ]
        },
        {
          name: 'black_swan_analysis',
          keyPhrases: ['black swan', 'extreme event', 'tail risk', 'catastrophic', 'rare event', 'market shock', 'unexpected', 'outlier', 'crisis scenario', 'systemic risk', 'contagion', 'disorder', 'cascade', 'collapse', 'meltdown'],
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
          ],
          patterns: [
            /\b(black swan|extreme event|tail risk|catastrophic|rare event|market shock|unexpected|outlier|crisis scenario|systemic risk)\b/i,
            /\b(black|extreme|catastrophic|rare|unexpected|extraordinary|unprecedented|unusual|exceptional|strange)\b.*?\b(event|occurrence|scenario|situation|circumstance|development|episode|incident)\b/i,
            /\b(tail|extreme|far|remote|distant|unusual|unlikely)\b.*?\b(risk|probability|chance|likelihood|odds|possibility)\b/i,
            /\b(market|financial|economic|systemic|systematic)\b.*?\b(shock|disruption|dislocation|turmoil|disturbance|upheaval|convulsion)\b/i,
            /\b(unexpected|unpredictable|unforeseen|unanticipated|surprising|startling|astonishing|shocking)\b.*?\b(event|development|occurrence|change|shift|move)\b/i,
            /\b(outlier|extreme|edge|boundary|fringe|limit|far-fetched|implausible|unlikely)\b.*?\b(scenario|situation|case|event|possibility|outcome|result)\b/i,
            /\b(crisis|emergency|disaster|catastrophe|calamity|meltdown|breakdown|collapse)\b.*?\b(scenario|situation|condition|environment|event|preparation|readiness)\b/i,
            /\b(systemic|systematic|structural|fundamental|basic|essential|inherent|intrinsic)\b.*?\b(risk|vulnerability|weakness|fragility|exposure|susceptibility)\b/i,
            /\b(contagion|spread|propagation|transmission|diffusion|dissemination)\b.*?\b(risk|effect|impact|influence|consequence|result)\b/i,
            /\b(cascade|chain reaction|domino effect|snowball effect|avalanche|ripple effect|butterfly effect)\b/i,
            /\b(collapse|meltdown|breakdown|failure|disintegration|downfall|ruin|crash)\b.*?\b(market|system|structure|framework|organization|institution)\b/i,
            /\b(disorder|chaos|turmoil|upheaval|disruption|disturbance|turbulence|commotion|mayhem|havoc)\b/i,
            /\b(protect|safeguard|shield|defend|secure|insulate|buffer|hedge|guard)\b.*?\b(against|from|portfolio|assets|investment|position|wealth)\b/i
          ]
        },
        {
          name: 'donation_request',
          keyPhrases: [
            'donate', 'donation', 'donating', 'donor', 'donate to', 'send donation',
            'contribute', 'contribution', 'contributing', 'contributor', 
            'support', 'supporter', 'supporting', 'sponsor', 'sponsoring', 'sponsorship',
            'fund', 'funding', 'fundraising', 'finance', 'financial support',
            'tip', 'tipping', 'gratuity', 'reward', 'compensate', 'back', 'backing',
            'bitcoin address', 'btc address', 'wallet address', 'receive address',
            'send bitcoin', 'send btc', 'send sats', 'send satoshis', 'send coins',
            'transfer bitcoin', 'transfer btc', 'transfer crypto', 'payment',
            'lightning address', 'lightning invoice', 'ln address', 'donate btc',
            'send you', 'give you', 'pay you', 'transfer to you', 'support you',
            'how to donate', 'where to donate', 'how can i donate', 'want to donate',
            'would like to donate', 'interested in donating', 'willing to donate',
            'address', 'wallet', 'crypto', 'bitcoin', 'btc', 'coin',
            'payment', 'help out', 
            'donat', 'donait', 'dontate', 'donete', 'bitcon', 'bitcoi', 'btcc',
            'adress', 'adres', 'addres', 'walet', 'walett', 'recieve', 'receve',
            'sats', 'satoshis', 'bits', 'stack sats', 'sat stacking', 
            'money', 'cash', 'funds', 'satosh',
            'accept', 'how do i', 'where can i', 'is there a way', 'would you accept',
            'have a wallet', 'have an address', 'share your', 'your bitcoin',
            'your btc', 'your address', 'your wallet'
          ],
          examples: [
            'how can I donate', 'want to contribute', 'can I support this project',
            'bitcoin donation', 'what\'s your wallet address', 'how do I send you bitcoin',
            'can I send you coin', 'can I send you btc', 'send you bitcoin',
            'give you some btc', 'bitcoin address', 'btc address', 'wallet',
            'address', 'accept donations', 'where can I send BTC',
            'do you accept donations', 'would you like some bitcoin', 'can i help support your work',
            'is there a way to donate', 'how do i support the project', 'bitcoin adress pls',
            'send u coins', 'i want to donate', 'lemme send btc', 'gib address',
            'gimme ur address', 'wallet address', 'show me donation info', 'tip jar',
            'take my money', 'shut up and take my bitcoin', 'donate', 'support',
            'btc', 'contribution', 'donation', 'how 2 donate', 'bitcoim addres',
            'bitcon walet', 'recieve address', 'donait', 'btcc',
            'i appreciate this and want to support it', 'this is great work deserving payment',
            'i should buy you a coffee', 'let me stack some sats for you',
            'would love to show appreciation', 'this deserves some coin',
            'how can i pay for this service', 'where do the donations go'
          ],
          patterns: [
            /\b(donate|donate to|send|give|pay|support|fund|tip|contribute to)\b/i,
            /\b(bitcoin|btc|crypto|coin|sats|satoshis)\b.*\b(address|wallet|payment|donation|send)\b/i,
            /\b(address|wallet)\b.*\b(bitcoin|btc|crypto|coin)\b/i,
            /\b(send|give|transfer|pay)\b.*\b(you|your)\b/i,
            /\b(bit.?co.?n|btc?)\b.*\b(ad?d?res|wal+et)/i,
            /\b(don[ae]t|contr[ib]b?ut)/i,
            /^(address|wallet|bitcoin|btc|donate|tip|help|support)\??$/i,
            /\bsend\s*(yo?u|me).*\b(btc|coin|\$|money|€)/i, 
            /\b(where|how)\b.*\b(send|donate|contribute|support)\b/i,
            /💰|💸|💲|💵|💴|💶|💷|🪙|₿|⚡/, // Emojis are fine as literals in regex
            /\b(how|where|can|do).*\b(donate|contribute|support|fund|sponsor|tip)\b/i,
            /\b(would|like|want|wish|desire|hope).*\b(donate|contribute|support|fund|sponsor|tip)\b/i,
            /\b(wallet|address|bitcoin|btc|coin|crypto).*\b(share|give|provide|show|display|reveal)\b/i,
            /\b(appreciate|thankful|grateful|indebted).*\b(work|effort|project|tool|bot|service)\b/i,
            /\b(help|support|fund|back|finance).*\b(project|development|work|effort|service|tool|bot)\b/i,
            /\b(buy|get|purchase|offer).*\b(coffee|beer|drink|lunch|dinner)\b/i,
            /\bbitco/i, /\bwalle/i, /\baddre/i, /\bdona/i,
            /\b(can|could|would|may|might).*\b(donate|contribute|support|fund|sponsor|tip|give|send)\b/i,
            /\b(looking|want|like|hope|wish|desire).*\b(donate|contribute|support|fund|sponsor|tip|give|send)\b/i,
            /\b(accept|take|receive|welcome).*\b(donation|contribution|support|funding|sponsorship|tips|money|payment)\b/i,
            /\b(lightning network|ln url|lightning address|lightning invoice|lnurl|ln address|ln invoice)\b/i,
            /\b(sat|sats|satoshi|satoshis).*\b(send|give|donate|contribute|support)\b/i,
            /\bbc1[a-z0-9]{6,}/i,
            /\b[13][a-km-zA-HJ-NP-Z1-9]{25,34}\b/i
          ]
        }
      ];
    }
  
  /**
   * Feature words for better intent classification
   */
    setupFeatureWords() {
      return {
        risk_assessment: ['risk', 'probability', 'chance', 'odds', 'likelihood', 'crash', 'correction', 'probability', 'danger', 'vulnerability', 'threat', 'downside', 'hazard', 'exposure', 'possibility', 'drop', 'dump', 'decline', 'fall', 'collapse', 'dip', 'probability', 'likely'],
        strategy_advice: ['strategy', 'advice', 'recommend', 'should', 'buy', 'sell', 'hold', 'action', 'position', 'allocation', 'portfolio', 'exposure', 'hedge', 'protect', 'approach', 'plan', 'idea', 'guidance', 'suggestion', 'tactic', 'method', 'play', 'move', 'decision', 'option', 'opportunity', 'timing', 'entry', 'exit'],
        metric_analysis: ['metric', 'mvrv', 'nvt', 'on-chain', 'ratio', 'indicator', 'address', 'volume', 'transaction', 'puell', 'sopr', 'hash ribbon', 'stablecoin', 'measurement', 'analyze', 'assessment', 'evaluation', 'reading', 'factor', 'parameter', 'stat', 'figure', 'health', 'activity', 'blockchain', 'network', 'fundamental'],
        market_prediction: ['predict', 'forecast', 'projection', 'future', 'next', 'coming', 'outlook', 'will', 'anticipate', 'expected', 'likely', 'probabilities', 'projection', 'expectation', 'estimation', 'prognosis', 'thinking', 'prophesy', 'guess', 'project', 'anticipation', 'extrapolation', 'prospect', 'potential', 'possibility', 'scenario', 'vision'],
        scenario_simulation: ['what if', 'scenario', 'simulation', 'rise', 'drop', 'fall', 'increase', 'decrease', 'crash', 'rally', 'breakout', 'cascade', 'liquidation', 'model', 'case', 'situation', 'circumstance', 'condition', 'event', 'eventuality', 'possibility', 'supposition', 'assumption', 'premise', 'hypothesis', 'consideration', 'situation'],
        historical_comparison: ['historical', 'history', 'previous', 'past', 'before', 'compare', 'similar', 'pattern', 'precedent', 'analogous', 'resembles', 'like', 'same', 'equivalent', 'correspondent', 'matching', 'parallel', 'resemblance', 'similarity', 'analogy', 'correlation', 'relationship', 'connection', 'example', 'instance', 'case', 'occurrence'],
        educational: ['explain', 'how', 'what is', 'mean', 'definition', 'understand', 'learn', 'works', 'mechanism', 'principle', 'function', 'concept', 'theory', 'idea', 'notion', 'fundamentals', 'basics', 'element', 'component', 'factor', 'aspect', 'feature', 'characteristic', 'attribute', 'quality', 'property', 'detail', 'specifics', 'overview', 'summary'],
        knowledge_explorer: ['knowledge', 'graph', 'explorer', 'explore', 'concepts', 'map', 'terms', 'relationship', 'connections', 'network', 'linked', 'related', 'structure', 'framework', 'system', 'organization', 'arrangement', 'order', 'hierarchy', 'taxonomy', 'classification', 'category', 'grouping', 'class', 'type', 'sort', 'variety', 'ontology', 'schema'],
        market_structure: ['structure', 'support', 'resistance', 'trend', 'pattern', 'technical', 'formation', 'level', 'breakout', 'breakdown', 'divergence', 'range', 'channel', 'band', 'corridor', 'zone', 'area', 'region', 'section', 'portion', 'segment', 'division', 'bracket', 'parameter', 'boundary', 'limit', 'threshold', 'ceiling', 'floor', 'wall', 'barrier'],
        sentiment_analysis: ['sentiment', 'fear', 'greed', 'mood', 'psychology', 'social', 'crowd', 'euphoria', 'capitulation', 'pessimism', 'optimism', 'emotion', 'feeling', 'attitude', 'opinion', 'view', 'perception', 'perspective', 'outlook', 'stance', 'position', 'standpoint', 'disposition', 'temper', 'spirit', 'mind', 'thinking', 'belief', 'conviction', 'confidence'],
        black_swan_analysis: ['black swan', 'extreme', 'tail risk', 'catastrophic', 'rare', 'shock', 'unexpected', 'outlier', 'crisis', 'systemic', 'collapse', 'extraordinary', 'exceptional', 'unusual', 'unprecedented', 'anomalous', 'irregular', 'freak', 'strange', 'bizarre', 'peculiar', 'curious', 'odd', 'remarkable', 'striking', 'incredible', 'unbelievable', 'unthinkable', 'unimaginable'],
        donation_request: ['donate', 'donation', 'contribute', 'support', 'tip', 'address', 'wallet', 'send', 'bitcoin', 'btc', 'coin', 'crypto', 'money', 'fund', 'sponsor', 'transfer', 'pay', 'payment', 'give', 'cash', 'sats', 'satoshis', 'bits', 'currency', 'gift', 'offering', 'present', 'gratuity', 'reward', 'incentive', 'compensation', 'remuneration', 'recompense', 'fee']
      };
    }
      
  /**
   * Classify intent using a multi-stage approach with dynamic confidence scoring.
   * @param {string} message - User's message
   * @returns {Object} Object with primary intent and alternatives: { primary: {...}, alternatives: [...] }
   */
  classifyIntent(message) {
    const normalizedMessage = message.toLowerCase();
    let potentialIntents = [];

    // Extracted entities to be used for contextual confidence
    const concept = this.extractConcept(normalizedMessage);
    const marketPhase = this.extractMarketPhase(normalizedMessage);
    const blackSwan = this.extractBlackSwan(normalizedMessage);

    // 1. NLP Pattern Matching (compromise.js)
    if (window.nlp) {
      try {
        const doc = window.nlp(message); // Use original message for compromise tags
        
        const nlpIntentChecks = [
          { intent: 'risk_assessment', condition: doc.has('(what|how) (is|about) (the |)current risk') || doc.has('#RiskTerm of (crash|correction|drop)') || doc.has('how (risky|likely) is (bitcoin|btc)') || doc.has('crash (probability|risk|chance)') || doc.has('chance of (crash|dip|correction)'), confidence: 0.97 },
          { intent: 'strategy_advice', condition: doc.has('(what|how) should i (do|buy|sell|invest|trade)') || doc.has('#StrategyTerm for (current|this) market') || doc.has('(recommend|suggest) (position|allocation)') || doc.has('good time to (buy|sell|enter|exit)'), confidence: 0.96 },
          { intent: 'metric_analysis', condition: doc.has('explain #CryptoMetric') || doc.has('(what|how) (is|are|about) #CryptoMetric') || doc.has('(what|how) (is|are|about|do) (the |)metric') || doc.has('on-chain (metrics|analysis|data)'), confidence: 0.95, relatedConcept: concept },
          { intent: 'market_prediction', condition: doc.has('(predict|forecast|projection|outlook) (for|about|on)') || doc.has('what will happen (next|in the future|soon)') || doc.has('(future|next|coming) (month|week|days|time)') || doc.has('(will|going to) (happen|occur|take place)'), confidence: 0.94 },
          { intent: 'scenario_simulation', condition: doc.has('what if (bitcoin|btc|price|market) (goes|drops|falls|rises|increases|decreases|crashes)') || doc.has('scenario (where|with|of) (price|bitcoin|btc)') || doc.has('simulate (crash|rally|drop|rise)'), confidence: 0.96 },
          { intent: 'historical_comparison', condition: doc.has('(compare|comparison) (to|with) (history|past|previous)') || doc.has('(historical|history|past) (crash|rally|pattern|cycle)') || doc.has('(similar|like) (situation|condition|event) (in|from) (past|before)') || doc.has('(similarity|similarities) between') || doc.has('(wondering|curious) (if|about) (similar|comparison|parallels)') || doc.has('(today|current|present) (versus|vs|compared to) (20\\d\\d|previous|past)') || doc.has('before the 20\\d\\d') || doc.has('(any|some) (similarity|similarities|parallels)') || doc.has('(market structure|market) (like|similar|parallels)') || doc.has('(crash|crashed) in (late|early) 20\\d\\d'), confidence: 0.95 },
          { intent: 'educational', condition: doc.has('(explain|tell me about|what is|how does) (the|) (model|calculation|algorithm|risk|cycle)') || doc.has('(help|explain|understand) (me|) (how|what|why)'), confidence: 0.93, relatedConcept: concept },
          { intent: 'knowledge_explorer', condition: doc.has('(explore|show|display) (knowledge|concept|term)') || doc.has('knowledge (graph|explorer|map)') || doc.has('show (me|) (the|) (knowledge|concept|relationship)'), confidence: 0.97 },
          { intent: 'donation_request', condition: doc.has('(donate|donate to|contribution|support) (bitcoin|btc|project)') || doc.has('(send|give|pay) (you|your) (bitcoin|btc|coin|money)') || doc.has('(bitcoin|btc|wallet) address') || doc.has('(where|how) (can|do) (i|we) (donate|send|contribute)') || (normalizedMessage.length < 15 && (doc.has('donate') || doc.has('address') || doc.has('wallet') || doc.has('(send|give) you') || doc.has('bitcoin') || doc.has('btc'))), confidence: 0.98 }
        ];

        nlpIntentChecks.forEach(check => {
          if (check.condition) {
            let currentConfidence = check.confidence;
            let intentData = {
              intent: check.intent,
              confidence: currentConfidence,
              matchType: 'nlp-pattern'
            };
            if (check.relatedConcept && check.intent === 'educational') intentData.concept = check.relatedConcept ? check.relatedConcept.id : null;
            if (check.relatedConcept && check.intent === 'metric_analysis') intentData.concept = check.relatedConcept ? check.relatedConcept.id : null;
            if (marketPhase && (check.intent === 'risk_assessment' || check.intent === 'strategy_advice')) intentData.marketPhase = marketPhase.phase;
            if (blackSwan && check.intent === 'black_swan_analysis') intentData.blackSwan = blackSwan.event;
            potentialIntents.push(intentData);
          }
        });
      } catch (err) {
        console.error('Error in NLP intent classification:', err);
      }
    }

    // 2. Regex Pattern Matching (from intent.patterns)
    for (const intentDef of this.intentPatterns) {
      if (intentDef.patterns && Array.isArray(intentDef.patterns)) {
        for (const pattern of intentDef.patterns) {
          if (pattern.test(normalizedMessage)) {
            let confidence = 0.80; // Base for regex
            if (intentDef.excludePhrases && intentDef.excludePhrases.some(phrase => normalizedMessage.includes(phrase.toLowerCase()))) {
              confidence -= 0.2;
            }
            if (confidence < 0) confidence = 0;

            let intentData = {
              intent: intentDef.name,
              confidence: confidence,
              matchType: 'pattern'
            };
            if (concept && intentDef.name === 'educational') intentData.concept = concept.id;
            if (marketPhase && (intentDef.name === 'risk_assessment' || intentDef.name === 'strategy_advice')) intentData.marketPhase = marketPhase.phase;
            if (blackSwan && intentDef.name === 'black_swan_analysis') intentData.blackSwan = blackSwan.event;
            potentialIntents.push(intentData);
          }
        }
      }
    }
    
    // 3. Example Matching (Exact and Fuzzy)
    for (const intentDef of this.intentPatterns) {
      for (const example of intentDef.examples) {
        const lowerExample = example.toLowerCase();
        let similarity = 0;
        let matchType = '';

        if (normalizedMessage.includes(lowerExample)) {
          similarity = 1.0;
          matchType = 'example-exact';
        } else {
          similarity = EnhancedNLU.calculateSimilarity(normalizedMessage, lowerExample);
          matchType = 'example-fuzzy';
        }

        if (similarity >= (matchType === 'example-exact' ? 0.99 : FUZZY_MATCH_THRESHOLD * 0.95)) {
          let confidence = 0.88 + (similarity - (matchType === 'example-exact' ? 0.99 : FUZZY_MATCH_THRESHOLD * 0.95)) * 0.12;
          
          if (intentDef.excludePhrases && intentDef.excludePhrases.some(phrase => normalizedMessage.includes(phrase.toLowerCase()))) {
            confidence -= 0.25;
          }
          if (confidence < 0) confidence = 0;

          let intentData = {
            intent: intentDef.name,
            confidence: Math.min(1.0, confidence),
            matchType: matchType
          };
          if (concept && intentDef.name === 'educational') intentData.concept = concept.id;
          if (marketPhase && (intentDef.name === 'risk_assessment' || intentDef.name === 'strategy_advice')) intentData.marketPhase = marketPhase.phase;
          if (blackSwan && intentDef.name === 'black_swan_analysis') intentData.blackSwan = blackSwan.event;
          potentialIntents.push(intentData);
        }
      }
    }

    // 4. Key Phrase Matching
    for (const intentDef of this.intentPatterns) {
      let matchedKeyPhrases = 0;
      let totalSpecificity = 0;

      intentDef.keyPhrases.forEach(phrase => {
        if (normalizedMessage.includes(phrase.toLowerCase())) {
          matchedKeyPhrases++;
          totalSpecificity += phrase.length;
        }
      });

      if (matchedKeyPhrases > 0) {
        let confidence = 0.70;
        confidence += (matchedKeyPhrases / intentDef.keyPhrases.length) * 0.15;
        confidence += Math.min(0.10, (totalSpecificity / (matchedKeyPhrases * 10)) * 0.10);
        
        if (intentDef.excludePhrases && intentDef.excludePhrases.some(phrase => normalizedMessage.includes(phrase.toLowerCase()))) {
          confidence -= 0.3;
        }
        if (confidence < 0) confidence = 0;
        
        let intentData = {
          intent: intentDef.name,
          confidence: Math.min(0.95, confidence),
          matchType: 'keyPhrase'
        };
        if (concept && intentDef.name === 'educational') intentData.concept = concept.id;
        if (marketPhase && (intentDef.name === 'risk_assessment' || intentDef.name === 'strategy_advice')) intentData.marketPhase = marketPhase.phase;
        if (blackSwan && intentDef.name === 'black_swan_analysis') intentData.blackSwan = blackSwan.event;
        potentialIntents.push(intentData);
      }
    }
    
    // 5. Feature Word Matching (Fallback)
    if (potentialIntents.filter(p => p.confidence > MEDIUM_CONFIDENCE_THRESHOLD).length === 0) {
        Object.entries(this.featureWords).forEach(([intentName, words]) => {
            let score = 0;
            let matchedWordCount = 0;
            words.forEach(word => {
                if (normalizedMessage.includes(word.toLowerCase())) {
                    score += word.includes(' ') ? 2 : 1;
                    matchedWordCount++;
                }
            });
            if (score > 0) {
                let normalizedScore = (score / words.length) * (matchedWordCount / words.length);
                let confidence = 0.45 + normalizedScore * 0.33;

                const intentDef = this.intentPatterns.find(i => i.name === intentName);
                 if (intentDef && intentDef.excludePhrases && intentDef.excludePhrases.some(phrase => normalizedMessage.includes(phrase.toLowerCase()))) {
                    confidence -= 0.2;
                }
                if (confidence < 0) confidence = 0;

                let intentData = {
                  intent: intentName,
                  confidence: Math.min(0.78, confidence),
                  matchType: 'wordFrequency'
                };
                if (concept && intentName === 'educational') intentData.concept = concept.id;
                if (marketPhase && (intentName === 'risk_assessment' || intentName === 'strategy_advice')) intentData.marketPhase = marketPhase.phase;
                if (blackSwan && intentName === 'black_swan_analysis') intentData.blackSwan = blackSwan.event;
                potentialIntents.push(intentData);
            }
        });
    }

    if (concept && /\b(what|explain|how|tell me about)\b/i.test(normalizedMessage) && !potentialIntents.some(p => p.intent === 'educational' && p.confidence > 0.8)) {
        potentialIntents.push({
            intent: 'educational',
            confidence: 0.80,
            matchType: 'concept-based',
            concept: concept.id
        });
    }
    if (marketPhase && /\b(risk|strategy|position|what should|how should|outlook)\b/i.test(normalizedMessage) && !potentialIntents.some(p => (p.intent === 'market_prediction' || p.intent === 'risk_assessment' || p.intent === 'strategy_advice') && p.confidence > 0.8)) {
        potentialIntents.push({
            intent: 'market_prediction',
            confidence: 0.78,
            matchType: 'phase-based',
            marketPhase: marketPhase.phase
        });
    }
    if (blackSwan && !potentialIntents.some(p => p.intent === 'black_swan_analysis' && p.confidence > 0.85)) {
        potentialIntents.push({
            intent: 'black_swan_analysis',
            confidence: 0.86,
            matchType: 'blackswan-based',
            blackSwan: blackSwan.event
        });
    }
    
    if (normalizedMessage.length < 12 && /\b(btc|wallet|address|donate|send|give|coin|payment|crypto|bitcoin|donation)\b/i.test(normalizedMessage)) {
        if (!potentialIntents.some(p => p.intent === 'donation_request' && p.confidence > 0.8)) {
             potentialIntents.push({
                intent: 'donation_request',
                confidence: 0.80,
                matchType: 'short-query-donation'
            });
        }
    }

    if (potentialIntents.length === 0) {
      return {
        primary: { intent: 'general_query', confidence: 0.3, matchType: 'fallback' },
        alternatives: []
      };
    }

    const uniqueIntentMap = new Map();
    potentialIntents.forEach(pIntent => {
      if (!uniqueIntentMap.has(pIntent.intent) || pIntent.confidence > uniqueIntentMap.get(pIntent.intent).confidence) {
        uniqueIntentMap.set(pIntent.intent, pIntent);
      }
    });
    const dedupedIntents = Array.from(uniqueIntentMap.values());

    const matchTypeSpecificity = {
      'nlp-pattern': 10, 'example-exact': 9, 'pattern': 8,
      'example-fuzzy': 7, 'keyPhrase': 6, 'concept-based': 5,
      'phase-based': 5, 'blackswan-based': 5, 'short-query-donation': 4,
      'wordFrequency': 3, 'fallback': 1, 'fallback-low-primary': 1,
    };

    dedupedIntents.sort((a, b) => {
      if (b.confidence !== a.confidence) {
        return b.confidence - a.confidence;
      }
      return (matchTypeSpecificity[b.matchType] || 0) - (matchTypeSpecificity[a.matchType] || 0);
    });

    const primaryIntent = dedupedIntents[0];
    let alternativeIntents = [];

    if (dedupedIntents.length > 1) {
      for (let i = 1; i < dedupedIntents.length; i++) {
        if (dedupedIntents[i].confidence >= MIN_ALT_INTENT_CONFIDENCE &&
            dedupedIntents[i].confidence >= primaryIntent.confidence * MIN_ALT_INTENT_PRIMARY_RATIO) {
          alternativeIntents.push(dedupedIntents[i]);
          if (alternativeIntents.length >= 2) break; 
        } else {
            break; 
        }
      }
    }
    
    if (!primaryIntent.concept && concept && (primaryIntent.intent === 'educational' || primaryIntent.intent === 'metric_analysis')) {
        primaryIntent.concept = concept.id;
    }
    if (!primaryIntent.marketPhase && marketPhase && (primaryIntent.intent === 'risk_assessment' || primaryIntent.intent === 'strategy_advice' || primaryIntent.intent === 'market_prediction')) {
        primaryIntent.marketPhase = marketPhase.phase;
    }
    if (!primaryIntent.blackSwan && blackSwan && primaryIntent.intent === 'black_swan_analysis') {
        primaryIntent.blackSwan = blackSwan.event;
    }

    if (primaryIntent.confidence < MEDIUM_CONFIDENCE_THRESHOLD && primaryIntent.intent !== 'general_query') {
         return {
            primary: { intent: 'general_query', confidence: 0.3, matchType: 'fallback-low-primary', originalAttempt: primaryIntent.intent },
            alternatives: [] 
        };
    }

    return {
      primary: primaryIntent,
      alternatives: alternativeIntents
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
    
    const timeframe = this.extractTimeframe(normalizedMessage);
    if (timeframe) entities.timeframe = timeframe;
    
    const month = this.extractMonth(normalizedMessage);
    if (month) entities.month = month;
    
    const percentage = this.extractPercentage(normalizedMessage);
    if (percentage) entities.percentage = percentage;
    
    const metric = this.extractMetric(normalizedMessage);
    if (metric) entities.metric = metric;
    
    const comparison = this.extractComparison(normalizedMessage);
    if (comparison) entities.comparison = comparison;
    
    const concept = this.extractConcept(normalizedMessage);
    if (concept) entities.concept = concept;
    
    const marketPhase = this.extractMarketPhase(normalizedMessage);
    if (marketPhase) entities.marketPhase = marketPhase;
    
    const blackSwan = this.extractBlackSwan(normalizedMessage);
    if (blackSwan) entities.blackSwan = blackSwan;
    
    const technicalLevel = this.extractTechnicalLevel(normalizedMessage);
    if (technicalLevel) entities.technicalLevel = technicalLevel;
    
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
    if (window.nlp) {
      try {
        const doc = window.nlp(message);
        const durationMatches = doc.match('#Value #Duration');
        if (durationMatches.found) {
          const mentioned = durationMatches.text();
          const values = durationMatches.values().get();
          if (values && values.length > 0 && typeof values[0] === 'number') {
            let num = values[0];
            let unitMatch = durationMatches.match('#Duration').text();
            let unit = 'day';

            if (unitMatch.includes('week')) unit = 'week';
            else if (unitMatch.includes('month')) unit = 'month';
            else if (unitMatch.includes('year')) unit = 'year';
            
            let days = num;
            if (unit === 'week') days = num * 7;
            else if (unit === 'month') days = num * 30;
            else if (unit === 'year') days = num * 365;
              
            return {
              mentioned: mentioned,
              value: days,
              unit: unit.replace(/s$/, ''),
              amount: num
            };
          }
        }
        
        const timeframeMap = {
          'next day': { value: 1, unit: 'day', amount: 1 }, 'tomorrow': { value: 1, unit: 'day', amount: 1 },
          'next week': { value: 7, unit: 'week', amount: 1 }, 'next month': { value: 30, unit: 'month', amount: 1 },
          'next quarter': { value: 90, unit: 'quarter', amount: 1 }, 'next few days': { value: 3, unit: 'day', amount: 3 },
          'coming weeks': { value: 21, unit: 'week', amount: 3 }, 'short term': { value: 14, unit: 'day', amount: 14 },
          'medium term': { value: 90, unit: 'day', amount: 90 }, 'long term': { value: 365, unit: 'day', amount: 365 }
        };
        
        for (const [phrase, data] of Object.entries(timeframeMap)) {
          if (doc.has(phrase)) {
            return { mentioned: phrase, value: data.value, unit: data.unit, amount: data.amount };
          }
        }
      } catch (err) {
        console.error('Error in NLP timeframe extraction:', err);
      }
    }
    
    const timeframeRegex = /\b(\d+)\s*(day|days|week|weeks|month|months|year|years)\b/i;
    const match = message.match(timeframeRegex);
    if (match) {
      const amount = parseInt(match[1]);
      const unit = match[2].toLowerCase();
      let days = amount;
      if (unit.startsWith('week')) days = amount * 7;
      else if (unit.startsWith('month')) days = amount * 30;
      else if (unit.startsWith('year')) days = amount * 365;
      return { mentioned: match[0], value: days, unit: unit.replace(/s$/, ''), amount: amount };
    }
    
    if (/\b(next day|tomorrow)\b/i.test(message)) return { mentioned: 'tomorrow', value: 1, unit: 'day', amount: 1 };
    if (/\b(next week)\b/i.test(message)) return { mentioned: 'next week', value: 7, unit: 'week', amount: 1 };
    if (/\b(next month)\b/i.test(message)) return { mentioned: 'next month', value: 30, unit: 'month', amount: 1 };
    if (/\b(short term)\b/i.test(message)) return { mentioned: 'short term', value: 14, unit: 'day', amount: 14 };
    if (/\b(medium term)\b/i.test(message)) return { mentioned: 'medium term', value: 90, unit: 'day', amount: 90 };
    if (/\b(long term)\b/i.test(message)) return { mentioned: 'long term', value: 365, unit: 'day', amount: 365 };
    
    return null;
  }
  
  extractMonth(message) {
    if (window.nlp) {
      try {
        const doc = window.nlp(message);
        const monthMatch = doc.match('#Month').first();
        if (monthMatch.found) {
          const monthText = monthMatch.text().toLowerCase();
          for (const month in this.monthMap) {
            if (monthText.includes(month)) {
              return { mentioned: monthText, index: this.monthMap[month], name: this.monthNames[this.monthMap[month]] };
            }
          }
        }
        if (doc.has('(this|current) month')) {
          const currentMonth = new Date().getMonth();
          return { mentioned: doc.match('(this|current) month').text(), index: currentMonth, name: this.monthNames[currentMonth] };
        }
        if (doc.has('(last|previous) month')) {
          const lastMonth = (new Date().getMonth() + 11) % 12;
          return { mentioned: doc.match('(last|previous) month').text(), index: lastMonth, name: this.monthNames[lastMonth] };
        }
        if (doc.has('next month')) {
          const nextMonth = (new Date().getMonth() + 1) % 12;
          return { mentioned: 'next month', index: nextMonth, name: this.monthNames[nextMonth] };
        }
      } catch (err) {
        console.error('Error in NLP month extraction:', err);
      }
    }
    
    for (const month in this.monthMap) {
      if (message.includes(month)) {
        return { mentioned: month, index: this.monthMap[month], name: this.monthNames[this.monthMap[month]] };
      }
    }
    if (/\b(this|current) month\b/i.test(message)) {
      const currentMonth = new Date().getMonth();
      return { mentioned: 'current month', index: currentMonth, name: this.monthNames[currentMonth] };
    }
    if (/\b(last|previous) month\b/i.test(message)) {
      const lastMonth = (new Date().getMonth() + 11) % 12;
      return { mentioned: 'last month', index: lastMonth, name: this.monthNames[lastMonth] };
    }
    if (/\bnext month\b/i.test(message)) {
      const nextMonth = (new Date().getMonth() + 1) % 12;
      return { mentioned: 'next month', index: nextMonth, name: this.monthNames[nextMonth] };
    }
    return null;
  }
  
  extractPercentage(message) {
    if (window.nlp) {
      try {
        const doc = window.nlp(message);
        const percentMatches = doc.percentages(); 
        if (percentMatches.found) {
            const p = percentMatches.json()[0]; 
            if (p && typeof p.number === 'number') {
                 return {
                    mentioned: p.text,
                    value: p.number / 100,
                    displayValue: `${p.number}%`,
                    raw: p.number
                };
            }
        }

        const narrativePercentages = [
          { pattern: '(double|twice|100 percent|100%)', value: 1, raw: 100 }, { pattern: 'half|50 percent|50%', value: 0.5, raw: 50 },
          { pattern: 'quarter|25 percent|25%', value: 0.25, raw: 25 }, { pattern: 'third|33 percent|33%', value: 0.33, raw: 33 },
          { pattern: 'three quarter|75 percent|75%', value: 0.75, raw: 75 }
        ];
        for (const percent of narrativePercentages) {
          if (doc.has(percent.pattern)) {
            const matchText = doc.match(percent.pattern).text();
            return { mentioned: matchText, value: percent.value, displayValue: `${percent.raw}%`, raw: percent.raw };
          }
        }
      } catch (err) {
        console.error('Error in NLP percentage extraction:', err);
      }
    }
    
    const percentRegex = /\b(\d+(?:\.\d+)?)(?:\s*%|\s+percent)\b/i;
    const match = message.match(percentRegex);
    if (match) {
      const rawVal = parseFloat(match[1]);
      return { mentioned: match[0], value: rawVal / 100, displayValue: `${rawVal}%`, raw: rawVal };
    }
    return null;
  }
  
  /**
   * Extract metric from message with enhanced recognition, including KG aliases.
   * @param {string} message - Normalized message
   * @returns {Object|null} Metric entity or null
   */
  extractMetric(message) {
    if (window.nlp) {
      try {
        const doc = window.nlp(message);
        const metricMatch = doc.match('#CryptoMetric').first();
        if (metricMatch.found) {
          const metricText = metricMatch.text().toLowerCase();
          const kgConcept = this.extractConcept(metricText); 
          if (kgConcept && this.knowledgeGraph && this.knowledgeGraph.entities && this.knowledgeGraph.entities[kgConcept.id]) {
             const entityDef = this.knowledgeGraph.entities[kgConcept.id];
             if (entityDef.type === "on-chain_metric" || entityDef.type === "market_metric" || entityDef.type === "indicator") { 
                return { mentioned: metricText, id: kgConcept.id, name: entityDef.name || kgConcept.name || metricText, similarity: 1.0, matchType: 'nlp-kg-metric' };
             }
          }
          return { mentioned: metricText, id: metricText.toUpperCase().replace(/\s+/g, '_'), name: metricText, similarity: 0.9, matchType: 'nlp-metric' };
        }
      } catch (err) {
        console.error('Error in NLP metric extraction (compromise):', err);
      }
    }

    const commonMetrics = [
      { id: 'MVRV_Ratio', terms: ['mvrv', 'market value to realized value', 'mvrv score'], type: "on-chain_metric" },
      { id: 'NVT_Ratio', terms: ['nvt', 'network value to transactions', 'nvt signal'], type: "on-chain_metric" },
      { id: 'ACTIVE_ADDRESSES', terms: ['active addresses', 'address count', 'address activity'], type: "on-chain_metric" },
      { id: 'Puell_Multiple', terms: ['puell', 'puell multiple', 'miner profitability'], type: "on-chain_metric" },
      { id: 'SOPR', terms: ['sopr', 'spent output profit ratio', 'profit ratio'], type: "on-chain_metric" },
      { id: 'hash_ribbon', terms: ['hash ribbon', 'hash rate ma', 'miner capitulation'], type: "on-chain_metric" },
      { id: 'Stablecoin_Supply_Ratio', terms: ['stablecoin ratio', 'ssr'], type: "on-chain_metric" },
      { id: 'FUNDING_RATE', terms: ['funding rate', 'perpetual funding'], type: "market_metric" },
      { id: 'fear_greed_index', terms: ['fear and greed', 'fear & greed index'], type: "indicator" }
    ];

    let foundMetrics = [];

    for (const metric of commonMetrics) {
      for (const term of metric.terms) {
        if (message.includes(term)) {
          foundMetrics.push({ mentioned: term, id: metric.id, name: metric.terms[0], similarity: EnhancedNLU.calculateSimilarity(message, term), matchType: 'exact-list-metric' });
        }
      }
    }
    
    if (this.knowledgeGraph && this.knowledgeGraph.entities) {
        for (const entityId in this.knowledgeGraph.entities) {
            const entity = this.knowledgeGraph.entities[entityId];
            if (entity.type === "on-chain_metric" || entity.type === "market_metric" || entity.type === "indicator") {
                const entityName = entity.name || entityId;  // Use entityId as fallback if no name property
                const termsToMatch = [entityName.toLowerCase(), ...(entity.aliases || []).map(a => a.toLowerCase())];
                for (const term of termsToMatch) {
                    if (message.includes(term)) {
                        foundMetrics.push({ mentioned: term, id: entityId, name: entity.name, similarity: EnhancedNLU.calculateSimilarity(message, term), matchType: 'kg-metric' });
                    }
                }
            }
        }
    }

    if (foundMetrics.length > 0) {
        foundMetrics.sort((a,b) => b.similarity - a.similarity || b.mentioned.length - a.mentioned.length);
        return foundMetrics[0];
    }

    return null;
  }
  
  extractComparison(message) {
    const compareRegex = /\b(?:compare|vs|versus|against)\b|\bto\b.+\bwith\b/i;
    if (compareRegex.test(message)) {
      let items = [];
      for (const month in this.monthMap) {
        if (message.includes(month)) items.push({ type: 'month', value: month, index: this.monthMap[month] });
      }
      const metricTerms = ['risk', 'mvrv', 'nvt', 'volatility', 'addresses', 'cycle', 'puell', 'sopr', 'hash ribbon', 'stablecoin'];
      metricTerms.forEach(term => { if (message.includes(term)) items.push({ type: 'metric', value: term }); });
      const phaseTerms = ['bull market', 'bear market', 'accumulation', 'distribution'];
      phaseTerms.forEach(term => { if (message.includes(term)) items.push({ type: 'market_phase', value: term }); });
      const eventTerms = ['halving', 'black swan', 'covid crash', 'luna collapse', 'ftx bankruptcy'];
      eventTerms.forEach(term => { if (message.includes(term)) items.push({ type: 'event', value: term }); });
      if (items.length >= 2) return { mentioned: 'comparison', items: items, type: 'comparison' };
    }
    return null;
  }
  
  /**
   * Extract concept from knowledge graph with enhanced recognition using aliases and Levenshtein.
   * @param {string} message - Normalized message
   * @returns {Object|null} Concept entity { id, name, mentioned, similarity, matchType } or null
   */
 extractConcept(message) {
    const lowerMessage = message.toLowerCase();
    if (!this.knowledgeGraph || !this.knowledgeGraph.entities) {
      return null;
    }

    let potentialMatches = [];

    if (window.nlp) {
        try {
            const doc = window.nlp(lowerMessage);
            const nlpMappings = [
                { tag: '#CryptoMetric', defaultType: 'metric_concept' },
                { tag: '#MarketPhase', defaultType: 'phase_concept' },
                { tag: '#BitcoinEvent', defaultType: 'event_concept' },
                { tag: '#RiskTerm', defaultType: 'risk_concept' }
            ];

            for (const mapping of nlpMappings) {
                const nlpMatch = doc.match(mapping.tag).first();
                if (nlpMatch.found) {
                    const nlpText = nlpMatch.text().toLowerCase();
                    for (const entityId in this.knowledgeGraph.entities) {
                        const entity = this.knowledgeGraph.entities[entityId];
                        // Use entityId as the default name if entity.name doesn't exist
                        const entityName = entity.name || entityId;
                        const entityTerms = [entityName.toLowerCase(), ...(entity.aliases || []).map(a => a.toLowerCase())];
                        if (entityTerms.some(term => term === nlpText)) {
                             potentialMatches.push({
                                id: entityId,
                                name: entityName,
                                mentioned: nlpText,
                                similarity: 1.0, 
                                matchType: `nlp-kg-${entity.type || 'concept'}`, 
                                position: lowerMessage.indexOf(nlpText)
                            });
                            break; 
                        }
                    }
                }
            }
        } catch (err) {
            console.error('Error in NLP concept pre-extraction:', err);
        }
    }

    for (const entityId in this.knowledgeGraph.entities) {
      const entity = this.knowledgeGraph.entities[entityId];
      // Use entityId as the default name if entity.name doesn't exist
      const entityName = entity.name || entityId;
      const termsToMatch = [{ term: entityName.toLowerCase(), type: 'entity-name' }];
      if (entity.aliases && Array.isArray(entity.aliases)) {
        entity.aliases.forEach(alias => termsToMatch.push({ term: alias.toLowerCase(), type: 'alias' }));
      }

      for (const item of termsToMatch) {
        const term = item.term;
        if (!term || term.length === 0) continue;

        let similarity = 0;
        let matchTypeSuffix = '';
        let position = -1;

        if (lowerMessage.includes(term)) {
          similarity = 1.0; 
          matchTypeSuffix = 'exact';
          position = lowerMessage.indexOf(term);
        } else if (term.length > 3) { 
          similarity = EnhancedNLU.calculateSimilarity(lowerMessage, term);
          matchTypeSuffix = 'fuzzy';
          if (similarity >= FUZZY_MATCH_THRESHOLD) position = 0; 
        }
        
        if (position !== -1 && similarity >= (matchTypeSuffix === 'exact' ? 0.99 : FUZZY_MATCH_THRESHOLD)) {
           potentialMatches.push({
            id: entityId,
            name: entityName,  // Now this will always have a value
            mentioned: term,   
            similarity: similarity,
            matchType: `kg-${item.type}-${matchTypeSuffix}`, 
            position: position,
            length: term.length
          });
        }
      }
    }
    
    // Rest of the method remains the same...
    const specificConceptTerms = [
      { term: 'bull market', id: 'bull_market' }, { term: 'bear market', id: 'bear_market' },
      { term: 'market cycle', id: 'market_cycle_position' }, { term: 'cycle position', id: 'market_cycle_position' },
      { term: 'bitcoin halving', id: 'halving' }, { term: 'crash risk', id: 'crash_risk' },
      { term: 'market value', id: 'MVRV_Ratio' }, { term: 'realized value', id: 'MVRV_Ratio' },
      { term: 'network value', id: 'NVT_Ratio' }, { term: 'puell multiple', id: 'Puell_Multiple' },
      { term: 'sopr indicator', id: 'SOPR' }, { term: 'stablecoin ratio', id: 'Stablecoin_Supply_Ratio' },
      { term: 'hash ribbons', id: 'hash_ribbon' }, { term: 'hash ribbon', id: 'hash_ribbon' },
      { term: 'liquidation cascade', id: 'liquidation_cascades' }, { term: 'liquidations', id: 'liquidation_cascades' },
      { term: 'black swan', id: 'black_swan_event' }, { term: 'market reflexivity', id: 'reflexivity' },
      { term: 'technical divergence', id: 'technical_divergence' }
    ];

    specificConceptTerms.forEach(concept => {
      if (lowerMessage.includes(concept.term)) {
        // Get entity name with fallback to ID
        const entityName = this.knowledgeGraph.entities[concept.id]?.name || concept.id;
        potentialMatches.push({
          id: concept.id,
          name: entityName, 
          mentioned: concept.term,
          similarity: 1.0, 
          matchType: 'list-concept-exact',
          position: lowerMessage.indexOf(concept.term),
          length: concept.term.length
        });
      }
    });

    if (potentialMatches.length === 0) {
      return null;
    }

    const typePriority = (matchType) => {
        if (matchType.includes('nlp-kg')) return 5;
        if (matchType.includes('exact')) return 4;
        if (matchType.includes('list-concept')) return 3;
        if (matchType.includes('fuzzy')) return 2;
        return 1;
    };

    potentialMatches.sort((a, b) => {
      if (b.similarity !== a.similarity) return b.similarity - a.similarity;
      if (typePriority(b.matchType) !== typePriority(a.matchType)) return typePriority(b.matchType) - typePriority(a.matchType);
      if (b.length !== a.length) return b.length - a.length;
      return a.position - b.position;
    });
    
    const bestMatches = new Map();
    for (const match of potentialMatches) {
        if (!bestMatches.has(match.id)) {
            bestMatches.set(match.id, match);
        }
    }
    const finalCandidates = Array.from(bestMatches.values());
     finalCandidates.sort((a, b) => {
      if (b.similarity !== a.similarity) return b.similarity - a.similarity;
      if (typePriority(b.matchType) !== typePriority(a.matchType)) return typePriority(b.matchType) - typePriority(a.matchType);
      if (b.length !== a.length) return b.length - a.length;
      return a.position - b.position;
    });

    const topMatch = finalCandidates[0];
    
    if (topMatch && topMatch.similarity >= FUZZY_MATCH_THRESHOLD * 0.9) { 
      return {
        id: topMatch.id,
        name: topMatch.name, 
        mentioned: topMatch.mentioned, 
        similarity: topMatch.similarity,
        matchType: topMatch.matchType
      };
    }

    return null;
  }
  
  extractMarketPhase(message) {
    if (window.nlp) {
      try {
        const doc = window.nlp(message);
        const phaseMatch = doc.match('#MarketPhase').first();
        if (phaseMatch.found) {
          const phaseText = phaseMatch.text().toLowerCase();
          const phaseMap = {
            'bull market': 'bull_market', 'bear market': 'bear_market', 'accumulation phase': 'accumulation',
            'early cycle': 'early_bull', 'mid cycle': 'mid_cycle', 'late cycle': 'late_bull',
            'market top': 'potential_top', 'distribution phase': 'distribution', 'capitulation': 'capitulation',
            'euphoria': 'late_bull', 'market bottom': 'accumulation', 'disbelief phase': 'early_bull'
          };
          for (const [term, phase] of Object.entries(phaseMap)) {
            if (phaseText.includes(term)) return { mentioned: phaseText, phase: phase, confidence: 0.9 };
          }
        }
        if (doc.has('(where|what|current).*\\b(cycle|phase)\\b')) {
          return { mentioned: 'cycle position', phase: 'cycle_query', confidence: 0.8 };
        }
      } catch (err) {
        console.error('Error in NLP market phase extraction:', err);
      }
    }
    
    const phaseTerms = [
      { term: 'bull market', phase: 'bull_market', confidence: 0.8 }, { term: 'bear market', phase: 'bear_market', confidence: 0.8 },
      { term: 'accumulation phase', phase: 'accumulation', confidence: 0.9 }, { term: 'early cycle', phase: 'early_bull', confidence: 0.85 },
      { term: 'mid cycle', phase: 'mid_cycle', confidence: 0.85 }, { term: 'late cycle', phase: 'late_bull', confidence: 0.85 },
      { term: 'market top', phase: 'potential_top', confidence: 0.9 }, { term: 'distribution phase', phase: 'distribution', confidence: 0.9 },
      { term: 'capitulation', phase: 'capitulation', confidence: 0.85 }, { term: 'euphoria', phase: 'late_bull', confidence: 0.8 },
      { term: 'market bottom', phase: 'accumulation', confidence: 0.85 }, { term: 'disbelief phase', phase: 'early_bull', confidence: 0.8 }
    ];
    const lowerMessage = message.toLowerCase();
    for (const term of phaseTerms) {
      if (lowerMessage.includes(term.term)) return { mentioned: term.term, phase: term.phase, confidence: term.confidence };
    }
    if (/\b(where|what|current).*\b(cycle|phase)\b/i.test(lowerMessage)) {
      return { mentioned: 'cycle position', phase: 'cycle_query', confidence: 0.7 };
    }
    return null;
  }
  
  extractBlackSwan(message) {
    if (window.nlp) {
      try {
        const doc = window.nlp(message);
        const eventMatch = doc.match('#BitcoinEvent').first(); 
        if (eventMatch.found) {
          const eventText = eventMatch.text().toLowerCase();
          if (eventText.includes('black swan')) return { mentioned: eventText, event: 'general_black_swan', type: 'concept' };
          if (eventText.includes('covid') || eventText.includes('march 2020')) return { mentioned: eventText, event: 'covid_crash', type: 'historical' };
          if (eventText.includes('luna') || eventText.includes('terra')) return { mentioned: eventText, event: 'luna_collapse', type: 'historical' };
          if (eventText.includes('ftx')) return { mentioned: eventText, event: 'ftx_collapse', type: 'historical' };
          if (eventText.includes('gox')) return { mentioned: eventText, event: 'mt_gox_hack', type: 'historical' };
        }
        if (doc.has('extreme event') || doc.has('tail risk') || doc.has('market shock')) {
          return { mentioned: doc.match('(extreme event|tail risk|market shock)').text(), event: 'general_black_swan', type: 'concept' };
        }
      } catch (err) {
        console.error('Error in NLP black swan extraction:', err);
      }
    }
    const swanEvents = [
      { term: 'black swan', event: 'general_black_swan', type: 'concept' }, { term: 'extreme event', event: 'general_black_swan', type: 'concept' },
      { term: 'tail risk', event: 'general_black_swan', type: 'concept' }, { term: 'market shock', event: 'general_black_swan', type: 'concept' },
      { term: 'covid crash', event: 'covid_crash', type: 'historical' }, { term: 'march 2020', event: 'covid_crash', type: 'historical' },
      { term: 'luna collapse', event: 'luna_collapse', type: 'historical' }, { term: 'terra crash', event: 'luna_collapse', type: 'historical' },
      { term: 'ftx bankruptcy', event: 'ftx_collapse', type: 'historical' }, { term: 'ftx collapse', event: 'ftx_collapse', type: 'historical' },
      { term: 'mt. gox', event: 'mt_gox_hack', type: 'historical' }, { term: 'mt gox', event: 'mt_gox_hack', type: 'historical' }
    ];
    const lowerMessage = message.toLowerCase();
    for (const event of swanEvents) {
      if (lowerMessage.includes(event.term)) return { mentioned: event.term, event: event.event, type: event.type };
    }
    return null;
  }
  
  extractTechnicalLevel(message) {
    if (window.nlp) {
      try {
        const doc = window.nlp(message);
        const moneyMatches = doc.money().out('json'); 
        if (moneyMatches.length > 0) {
          const levels = moneyMatches.map(m => ({
            mentioned: m.text,
            value: m.number, 
            formatted: `$${(m.number || 0).toLocaleString()}`
          })).filter(l => l.value !== undefined);
          if (levels.length > 0) return { levels: levels, count: levels.length, type: 'price_level' };
        }
        const kPriceRegex = /\$(\d+)\s*k/ig; // Corrected: Escaped $
        let kMatchesArr = [];
        let kMatch;
        while ((kMatch = kPriceRegex.exec(message)) !== null) {
            const value = parseInt(kMatch[1]) * 1000;
            kMatchesArr.push({ mentioned: kMatch[0], value: value, formatted: `$${value.toLocaleString()}` });
        }
        if (kMatchesArr.length > 0) return { levels: kMatchesArr, count: kMatchesArr.length, type: 'price_level_k' };

        if (doc.has('#Value (day|) (ma|ema|sma|moving average)')) {
          const maText = doc.match('#Value (day|) (ma|ema|sma|moving average)').text();
          const value = doc.match('#Value').values().get()[0];
          const maType = maText.toLowerCase().includes('ema') ? 'ema' : (maText.toLowerCase().includes('sma') ? 'sma' : 'ma');
          if (typeof value === 'number') return { mentioned: maText, period: value, type: maType };
        }
        if (doc.has('(support|resistance|level|breakout|breakdown)')) {
          return { mentioned: 'technical level reference', type: 'level_reference_keyword' };
        }
      } catch (err) {
        console.error('Error in NLP technical level extraction:', err);
      }
    }
    
    const priceRegex = /\$(\d{1,3}(?:,\d{3})*|\d+)(?:\s*k)?/gi; // Corrected: Escaped $
    const matches = [...message.matchAll(priceRegex)];
    if (matches.length > 0) {
      const levels = matches.map(match => {
        let valueStr = match[1].replace(/,/g, '');
        let value = parseInt(valueStr);
        if (match[0].toLowerCase().includes('k')) value *= 1000;
        return { mentioned: match[0], value: value, formatted: `$${value.toLocaleString()}` };
      });
      if (levels.length > 0) return { levels: levels, count: levels.length, type: 'price_level_regex' };
    }
    
    const maRegex = /\b(\d+)(?:\s*-?\s*day|d)?\s*(?:ma|ema|sma|moving average)\b/i;
    const maMatch = message.match(maRegex);
    if (maMatch) {
      const type = maMatch[0].toLowerCase().includes('ema') ? 'ema' : (maMatch[0].toLowerCase().includes('sma') ? 'sma' : 'ma');
      return { mentioned: maMatch[0], period: parseInt(maMatch[1]), type: type };
    }
    if (/\b(support|resistance|level|breakout|breakdown)\b/i.test(message)) {
      return { mentioned: 'technical level reference', type: 'level_reference_keyword_regex' };
    }
    return null;
  }
  
  extractSentimentIndicator(message) {
    if (window.nlp) {
      try {
        const doc = window.nlp(message);
        const sentimentTerms = [
          { pattern: '(fear and greed|fear & greed)', indicator: 'fear_greed_index' }, { pattern: 'market sentiment', indicator: 'general_sentiment' },
          { pattern: 'social sentiment', indicator: 'social_sentiment' }, { pattern: '(twitter|social media) sentiment', indicator: 'twitter_sentiment' },
          { pattern: 'reddit sentiment', indicator: 'reddit_sentiment' }, { pattern: 'funding rate', indicator: 'funding_rate' },
          { pattern: 'open interest', indicator: 'open_interest' }, { pattern: '(long/short|long short) ratio', indicator: 'long_short_ratio' }
        ];
        for (const term of sentimentTerms) {
          if (doc.has(term.pattern)) {
            return { mentioned: doc.match(term.pattern).text(), indicator: term.indicator, type: term.indicator.includes('sentiment') ? 'sentiment_indicator' : 'market_data_indicator' };
          }
        }
        const sentimentDescriptors = [
          { pattern: 'euphoric', sentiment: 'extremely_positive', value: 0.9 }, { pattern: 'bullish', sentiment: 'positive', value: 0.7 },
          { pattern: 'optimistic', sentiment: 'positive', value: 0.6 }, { pattern: 'neutral', sentiment: 'neutral', value: 0.5 },
          { pattern: 'cautious', sentiment: 'slightly_negative', value: 0.4 }, { pattern: 'bearish', sentiment: 'negative', value: 0.3 },
          { pattern: 'fearful', sentiment: 'very_negative', value: 0.2 }, { pattern: 'capitulation', sentiment: 'extremely_negative', value: 0.1 }
        ];
        for (const descriptor of sentimentDescriptors) {
          if (doc.has(descriptor.pattern)) {
            return { mentioned: doc.match(descriptor.pattern).text(), sentiment: descriptor.sentiment, value: descriptor.value, type: 'sentiment_descriptor' };
          }
        }
      } catch (err) {
        console.error('Error in NLP sentiment extraction:', err);
      }
    }
    
    const sentimentTermsList = [
      { term: 'fear and greed', indicator: 'fear_greed_index', type: 'market_sentiment' }, { term: 'fear & greed', indicator: 'fear_greed_index', type: 'market_sentiment' },
      { term: 'market sentiment', indicator: 'general_sentiment', type: 'market_sentiment' }, { term: 'social sentiment', indicator: 'social_sentiment', type: 'social_media' },
      { term: 'twitter sentiment', indicator: 'twitter_sentiment', type: 'social_media' }, { term: 'reddit sentiment', indicator: 'reddit_sentiment', type: 'social_media' },
      { term: 'funding rate', indicator: 'funding_rate', type: 'derivatives' }, { term: 'open interest', indicator: 'open_interest', type: 'derivatives' },
      { term: 'long/short ratio', indicator: 'long_short_ratio', type: 'derivatives' }, { term: 'long short ratio', indicator: 'long_short_ratio', type: 'derivatives' }
    ];
    const lowerMessage = message.toLowerCase();
    for (const term of sentimentTermsList) {
      if (lowerMessage.includes(term.term)) return { mentioned: term.term, indicator: term.indicator, type: term.type };
    }
    const sentimentDescriptorsList = [
      { term: 'euphoric', sentiment: 'extremely_positive', value: 0.9 }, { term: 'bullish', sentiment: 'positive', value: 0.7 },
      { term: 'optimistic', sentiment: 'positive', value: 0.6 }, { term: 'neutral', sentiment: 'neutral', value: 0.5 },
      { term: 'cautious', sentiment: 'slightly_negative', value: 0.4 }, { term: 'bearish', sentiment: 'negative', value: 0.3 },
      { term: 'fearful', sentiment: 'very_negative', value: 0.2 }, { term: 'capitulation', sentiment: 'extremely_negative', value: 0.1 }
    ];
    for (const descriptor of sentimentDescriptorsList) {
      if (lowerMessage.includes(descriptor.term)) return { mentioned: descriptor.term, sentiment: descriptor.sentiment, value: descriptor.value, type: 'sentiment_descriptor' };
    }
    return null;
  }
  
  /**
   * Process a message for intent and entities with enhanced NLP.
   * Returns an object with primary intent and alternatives.
   * @param {string} message - User's message
   * @param {Object} conversationContext - Conversation context (optional)
   * @returns {Object} Processed NLU result: { primary: {...}, alternatives: [...], entities: {...}, resolvedMessage: "..." }
   */
  processMessage(message, conversationContext) {
    const resolvedMessage = conversationContext ? conversationContext.resolveReference(message) : message;
    
    const intentResult = this.classifyIntent(resolvedMessage);
    const entities = this.extractEntities(resolvedMessage); 

    let primaryIntentDetails = intentResult.primary || { intent: 'general_query', confidence: 0.3, matchType: 'fallback' };
    
    if (!primaryIntentDetails.concept && entities.concept && (primaryIntentDetails.intent === 'educational' || primaryIntentDetails.intent === 'metric_analysis')) {
        primaryIntentDetails.concept = entities.concept.id;
        if (entities.concept.similarity) primaryIntentDetails.conceptSimilarity = entities.concept.similarity;
        if (entities.concept.matchType) primaryIntentDetails.conceptMatchType = entities.concept.matchType;

    }
    if (!primaryIntentDetails.marketPhase && entities.marketPhase && (primaryIntentDetails.intent === 'risk_assessment' || primaryIntentDetails.intent === 'strategy_advice' || primaryIntentDetails.intent === 'market_prediction')) {
        primaryIntentDetails.marketPhase = entities.marketPhase.phase;
    }
    if (!primaryIntentDetails.blackSwan && entities.blackSwan && primaryIntentDetails.intent === 'black_swan_analysis') {
        primaryIntentDetails.blackSwan = entities.blackSwan.event;
    }

    if (conversationContext) {
      conversationContext.updateUserProfile(resolvedMessage);
    }
    
    const enhancedContext = this.enhanceContextWithEntities(entities, primaryIntentDetails);
    
    return {
      resolvedMessage: resolvedMessage,
      primary: primaryIntentDetails,
      alternatives: intentResult.alternatives || [],
      entities: entities,
      concept: primaryIntentDetails.concept || (entities.concept ? entities.concept.id : null),
      marketPhase: primaryIntentDetails.marketPhase || (entities.marketPhase ? entities.marketPhase.phase : null),
      blackSwan: primaryIntentDetails.blackSwan || (entities.blackSwan ? entities.blackSwan.event : null),
      context: conversationContext ? { ...conversationContext.getQueryContext(), ...enhancedContext } : enhancedContext
    };
  }
  
  /**
   * Enhance context by cross-referencing entities
   * @param {Object} entities - Extracted entities
   * @param {Object} primaryIntentDetails - Primary intent classification
   * @returns {Object} Enhanced context
   */
  enhanceContextWithEntities(entities, primaryIntentDetails) {
    const enhancedContext = {};
    
    if (primaryIntentDetails.intent === 'risk_assessment' || (entities.concept && entities.concept.id === 'crash_risk')) {
      enhancedContext.riskRelevant = true;
    }
    if (primaryIntentDetails.intent === 'historical_comparison') {
      enhancedContext.historicalRelevant = true;
    }
    if (entities.technicalLevel) {
      enhancedContext.technicalRelevant = true;
      if (entities.technicalLevel.levels && entities.technicalLevel.levels.length > 0) {
        enhancedContext.priceLevels = entities.technicalLevel.levels.map(l => l.value);
      }
    }
    if (entities.marketPhase) {
      enhancedContext.marketPhase = entities.marketPhase.phase;
    }
    if (entities.timeframe) {
      if (entities.timeframe.value <= 7) enhancedContext.timeHorizon = 'very_short';
      else if (entities.timeframe.value <= 30) enhancedContext.timeHorizon = 'short';
      else if (entities.timeframe.value <= 90) enhancedContext.timeHorizon = 'medium';
      else enhancedContext.timeHorizon = 'long';
    }
    if (entities.sentimentIndicator) {
      enhancedContext.sentimentRelevant = true;
      if (entities.sentimentIndicator.type === 'sentiment_descriptor') {
        enhancedContext.sentimentValue = entities.sentimentIndicator.value;
      }
    }
    return enhancedContext;
  }
}
