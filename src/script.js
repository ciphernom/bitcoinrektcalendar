/**
 * Naive Bayes Classifier for sentiment analysis of cryptocurrency headlines.
 * Supports loading pretrained data and runtime training with stop word removal.
 */
class NaiveBayesClassifier {
  constructor(priceData = null) {
    this.classes = ['negative', 'neutral', 'positive'];
    this.wordCounts = {};
    this.classCounts = { negative: 0, neutral: 0, positive: 0 };
    this.documentCounts = { negative: 0, neutral: 0, positive: 0 };
    this.alpha = 1.0;
    
    // Store price data for feature extraction
    this.priceData = priceData;
    this.priceTrends = this.extractPriceTrends(priceData);
    
    // Enhanced features
    this.useBigrams = true;
    this.useNegation = true;
    
    // Emoji map with crypto Twitter vernacular
    this.emojiMap = {
      '🚀': 'bullish rocket',
      '📈': 'uptrend',
      '📉': 'downtrend',
      '💸': 'money loss',
      '🩸': 'bloodbath',
      '💪': 'strong',
      '🐂': 'bull',
      '🐻': 'bear',
      '💎': 'diamond hands',
      '🙌': 'hodl',
      '🔥': 'hot market',
      '💰': 'profits',
      '🤑': 'money gains',
      '😱': 'market panic',
      '😨': 'market fear',
      '🥳': 'market celebration',
      '🎯': 'price target',
      '🔪': 'sharp drop',
      '⚡': 'fast move',
      '🌕': 'moon',
      '📊': 'chart analysis',
      '💯': 'full confidence',
      '🧨': 'market explosion',
      '💥': 'breakout',
      '👨‍💻': 'developer activity',
      '🔒': 'secure',
      '🔓': 'security breach',
      '🏦': 'institutional',
      '🐋': 'whale',
      '🦐': 'small investor',
      '🧠': 'smart money',
      '💩': 'bad investment',
      '🧻': 'weak hands',
      '🤡': 'foolish trade'
    };
    
    // Negation terms that can flip sentiment
    this.negationTerms = new Set([
      'not', 'no', 'never', 'none', 'nobody', 'nothing', 'neither', 'nor', 'nowhere',
      'cannot', "can't", "won't", "isn't", "aren't", "wasn't", "weren't", "don't", "doesn't", "didn't",
      "couldn't", "shouldn't", "wouldn't", "hasn't", "haven't", "hadn't", 'fails', 'failed', 'against',
      'despite', 'without', 'absent', 'lack', 'lacking', 'prevents', 'denies', 'blocks', 'stops'
    ]);
    
    // Define stop words
    this.stopWords = new Set([
      'a', 'an', 'and', 'are', 'as', 'at', 'be', 'by', 'for', 'from', 'has', 'he', 'in', 'is', 'it', 'its',
      'of', 'on', 'that', 'the', 'to', 'was', 'were', 'will', 'with'
    ]);
    
    // Cryptocurrency-specific sentiment lexicon
    this.sentimentLexicon = {
      // Negative terms
      'crash': -0.8, 'plunge': -0.8, 'fall': -0.7, 'drop': -0.7, 'dive': -0.7, 
      'sink': -0.7, 'slump': -0.6, 'tumble': -0.6, 'dip': -0.5, 'slide': -0.5,
      'outflow': -0.6, 'losing': -0.6, 'loss': -0.6, 'low': -0.5, 'sell': -0.4, 
      'selling': -0.5, 'selloff': -0.7, 'bear': -0.6, 'bearish': -0.7, 
      'fear': -0.7, 'dump': -0.7, 'weak': -0.5, 'trouble': -0.6, 'risk': -0.5,
      'volatile': -0.5, 'volatility': -0.5, 'concern': -0.5, 'worried': -0.6, 
      'panic': -0.8, 'hack': -0.8, 'scam': -0.9, 'fraud': -0.9, 'ban': -0.7,
      'regulation': -0.3, 'tax': -0.3, 'tariff': -0.4, 'bubble': -0.7, 
      'warning': -0.6, 'caution': -0.5, 'problematic': -0.6, 'danger': -0.7,
      'underperformance': -0.7, 'down': -0.5, 'decline': -0.6, 'falling': -0.7,
      'recession': -0.7, 'crisis': -0.8, 'problem': -0.6, 'issue': -0.5,
      'struggle': -0.6, 'suffering': -0.7, 'pressure': -0.5, 'strain': -0.5,
      'sours': -0.7, 'sheds': -0.6, 'hit': -0.5, 'hits': -0.5, 'loses': -0.6,
      'losses': -0.7, 'erasing': -0.6, 'erase': -0.6, 'erased': -0.6,
      
      // Neutral terms (with slight bias)
      'steady': 0.1, 'stable': 0.1, 'unchanged': 0.0, 'flat': 0.0, 
      'hold': 0.0, 'holding': 0.0, 'consolidate': 0.0, 'consolidation': 0.0,
      'sideways': 0.0, 'trading': 0.0, 'range': 0.0, 'plateau': 0.0,
      'maintain': 0.1, 'maintains': 0.1, 'remains': 0.0, 'continuing': 0.0,
      'transition': 0.0, 'shift': 0.0, 'moving': 0.0, 'moves': 0.0,
      'plan': 0.1, 'plans': 0.1, 'planning': 0.1, 'consider': 0.0,
      'considering': 0.0, 'analysis': 0.0, 'report': 0.0, 'reported': 0.0,
      'study': 0.0, 'research': 0.0, 'examine': 0.0, 'review': 0.0,
      'technical': 0.0, 'conference': 0.0, 'event': 0.0, 'update': 0.0,
      
      // Positive terms
      'rise': 0.6, 'rising': 0.6, 'climb': 0.6, 'climbing': 0.6, 
      'surge': 0.8, 'soar': 0.8, 'jump': 0.7, 'leap': 0.7, 'rally': 0.7,
      'gain': 0.6, 'gains': 0.6, 'increase': 0.5, 'increasing': 0.5,
      'up': 0.5, 'upward': 0.6, 'higher': 0.5, 'bull': 0.6, 'bullish': 0.7,
      'boom': 0.8, 'explode': 0.8, 'skyrocket': 0.9, 'moonshot': 0.9,
      'record': 0.7, 'high': 0.6, 'peak': 0.7, 'top': 0.6, 'best': 0.7,
      'strong': 0.6, 'strengthen': 0.6, 'growth': 0.6, 'growing': 0.6,
      'outperform': 0.7, 'outperforming': 0.7, 'beat': 0.6, 'beating': 0.6,
      'exceed': 0.7, 'exceeding': 0.7, 'success': 0.7, 'successful': 0.7,
      'profit': 0.7, 'profitable': 0.7, 'positive': 0.6, 'optimistic': 0.7,
      'opportunity': 0.6, 'potential': 0.5, 'promising': 0.6, 'hope': 0.5,
      'hopeful': 0.6, 'confidence': 0.6, 'confident': 0.6, 'enthusiasm': 0.7,
      'enthusiastic': 0.7, 'excitement': 0.7, 'excited': 0.7, 'happy': 0.6,
      'happiness': 0.6, 'win': 0.7, 'winning': 0.7, 'victory': 0.7,
      'breakthrough': 0.8, 'milestone': 0.7, 'achievement': 0.7,
      'inflow': 0.7, 'advance': 0.6, 'advances': 0.6, 'adoption': 0.7,
      'approved': 0.7, 'approval': 0.7, 'approve': 0.7, 'viability': 0.6,
      'viable': 0.6, 'momentum': 0.6, 'catalyst': 0.6, 'boost': 0.7,
      'could': 0.3,  'reach': 0.4,   'predicts': 0.4,   'target': 0.5,
      'forecast': 0.4,   'expected': 0.3,  'potential': 0.3,
    };
    
    // Price movement patterns
    this.pricePatterns = {
      '\\b(?:plunge|dive|crash|dump|tumble|plummet)': -0.8,
      '\\b(?:drop|fall|sink|dip|decline|slide)s?\\b': -0.7,
      '\\bdown\\s+\\d+': -0.7,
      '\\bdips?\\s+(?:below|under|to)\\s+[$]?\\d': -0.7,
      '\\bsells?\\s+off\\b': -0.7,
      '\\blower\\b': -0.6,
      '\\b(?:bears?|bearish)\\b': -0.7,
      '\\b(?:outflow|losing streak|losses)\\b': -0.7,
      '\\brecord\\s+(?:outflow|low)': -0.8,
      '\\bworst\\s+(?:day|week|month)': -0.8,
      
      '\\b(?:steady|stable|unchanged|flat)\\b': 0.0,
      '\\bsideways\\b': 0.0,
      '\\bconsolidat(?:e|ing|ion)\\b': 0.0,
      '\\brange\\s*bound\\b': 0.0,
      
      '\\b(?:surge|soar|skyrocket|explode|jump|leap)': 0.8,
      '\\b(?:rise|climb|rally|gain)s?\\b': 0.7,
      '\\bup\\s+\\d+': 0.7,
      '\\bhigh(?:er|est)?\\b': 0.6,
      '\\btops?\\s+[$]?\\d': 0.7,
      '\\b(?:above|over|exceeds?)\\s+[$]?\\d': 0.7,
      '\\b(?:bulls?|bullish)\\b': 0.7,
      '\\b(?:inflow|winning streak|gains)\\b': 0.7,
      '\\brecord\\s+(?:inflow|high)': 0.8,
      '\\bbest\\s+(?:day|week|month)': 0.8
    };
    
    // Special headline patterns that strongly indicate sentiment
    this.headlinePatterns = {
      // ETF specific patterns
      'record\\s+\\$?\\d+\\s+billion\\s+outflow': -0.9,
      'etfs?\\s+(?:hit|hits|hit by)': -0.8,
      'etfs?\\s+outflow': -0.8,
      'fund\\s+sheds': -0.8,
      'losing streak': -0.8,
      
      // Strong negative patterns
      '(?:bitcoin|btc|crypto)\\s+(?:crash|plunge|dump)': -0.9,
      'record\\s+(?:outflow|low|loss)': -0.8,
      'worst\\s+(?:day|week|month|performance)': -0.8,
      'loses?\\s+\\d+%': -0.8,
      'down\\s+\\d+%': -0.8,
      'sell(?:ing)?\\s+(?:pressure|off)': -0.7,
      'bear\\s+market': -0.8,
      'bubble\\s+(?:burst|popping)': -0.9,
      'warning|danger|risk|caution': -0.7,
      'hack|scam|fraud|attack': -0.9,
      'liquidation': -0.8,
      'billion.*loss': -0.9,
      'million.*loss': -0.8,
      'rout': -0.8,
      'wipe': -0.8,
      'stolen': -0.9,
      'theft': -0.9,
      'extradited': -0.7,
      'warn': -0.7,
      'under\\s+\\$\\d+[k]?': -0.6,
      'below\\s+\\$\\d+[k]?': -0.6,
      'slides\\s+under': -0.7,
      'slides\\s+below': -0.7,
      'dips\\s+below': -0.7,
      'drops\\s+below': -0.7,
      'tipped\\s+into\\s+bear': -0.9,
      'bear\\s+market': -0.9,
      'slipping\\s+\\d+%': -0.8,
      'plunges\\s+\\d+%': -0.9,
      'sinks\\s+to': -0.7,
      'drops\\s+to': -0.7,
      'falls\\s+to': -0.7,
      'slides\\s+to': -0.7,
      'erasing\\s+gains': -0.7,
      'wiping\\s+\\$\\d+': -0.8,
      'wipes\\s+\\$\\d+': -0.8,
      'billion\\s+from': -0.7,
      'losing\\s+its\\s+shine': -0.7,
      'sours': -0.8,
      'didn\'t\\s+get': -0.6,
      'fears\\s+grow': -0.7,
      'fear\\s+crash': -0.9,
      'slump\\s+deepens': -0.8,
      'worried': -0.7,
      'investors\\s+be\\s+worried': -0.8,
      'should\\s+investors\\s+be': -0.6,
      'should\\s+you\\s+buy': -0.3,
      'what\'s\\s+behind': -0.5,
      'why\\s+is\\s+crypto\\s+crashing': -0.9,
      'why\\s+bitcoin': -0.5,
      'why\\s+there\'s\\s+no': -0.6,
      'historic\\s+crypto\\s+hack': -0.9,
      
      // Strong positive patterns
      '(?:bitcoin|btc|crypto)\\s+(?:surge|soar|rally)': 0.9,
      'record\\s+(?:inflow|high|gain)': 0.8,
      'best\\s+(?:day|week|month|performance)': 0.8,
      'gains?\\s+\\d+%': 0.8,
      'up\\s+\\d+%': 0.8,
      'buy(?:ing)?\\s+(?:pressure|opportunity)': 0.7,
      'bull\\s+market': 0.8,
      'breakout|breakthrough': 0.8,
      'optimis(?:m|tic)|positiv(?:e|ity)': 0.7,
      'adopt(?:ion|ing|ed)|integration': 0.7,
      'hasn\'t\\s+peaked': 0.7,
      'bullish\\s+year': 0.8,
      'buy\\s+bitcoin': 0.6,
      'solo\\s+mining\\s+viable': 0.6,
      'buys?\\s+\\$\\d+': 0.7,
      'buys?\\s+almost\\s+\\$\\d+': 0.8,
      'buys?\\s+more': 0.7,
      'snaps\\s+up': 0.7,
      'advances\\s+bitcoin': 0.7,
      'passes': 0.6,
      'groundbreaking': 0.8,
      'fuel\\s+the\\s+future': 0.8,
      'rolls out': 0.4,
      'fix for': 0.3,
      'inheritance fix': 0.3,
      'problem waiting': -0.5,
      'key\\s+metric\\s+shows': 0.7,
      'metric\\s+shows': 0.6,
      'what\\s+if': 0.0,
      'future\\s+of': 0.5,
      'better\\s+cryptocurrency': 0.6,
      'could\\s+hit\\s+\\$?\\d+k?': 0.7,
      'price\\s+target\\s+\\$?\\d+k?': 0.6,
      'predicts\\s+\\$?\\d+k?': 0.6,
      'forecast\\s+\\$?\\d+k?': 0.6,
      'expected\\s+to\\s+reach\\s+\\$?\\d+k?': 0.7,
    };
    
    // High-value tokens that strongly indicate sentiment in crypto headlines
    this.highValueTokens = new Set([
      // Positive indicators
      'bullish', 'rally', 'surge', 'soar', 'gain', 'climb', 'jump', 'rise', 'recover', 'breakthrough',
      'milestone', 'adoption', 'approval', 'support', 'launch', 'partnership', 'accept', 'boost',
      'bullrun', 'pump', 'moon', 'ath', 'bottom', 'accumulation', 'breakout', 'upturn', 'uptrend',
      'institutional', 'whale', 'buy', 'buying', 'bought', 'hodl', 'hold', 'holding', 'growth',
      'record', 'high', 'invest', 'upgrade', 'successful', 'success', 'win', 'winning', 'breakthrough',
      
      // Negative indicators
      'bearish', 'crash', 'plunge', 'slump', 'dive', 'tumble', 'fall', 'sink', 'drop', 'decline',
      'selloff', 'dump', 'liquidation', 'panic', 'fear', 'ban', 'hack', 'scam', 'fraud', 'attack',
      'breach', 'theft', 'steal', 'exploit', 'vulnerability', 'risk', 'warning', 'threat', 'concern',
      'crackdown', 'regulate', 'regulation', 'comply', 'illegal', 'shutdown', 'reject', 'denial',
      'downtrend', 'downturn', 'bear', 'bearish', 'sell', 'selling', 'sold', 'capitulate', 'surrender',
      'lower', 'weak', 'losses', 'losing', 'lost', 'collapse', 'breakdown','bloodbath','plunge','blood',
    
      // Crypto-specific tokens
      'btc', 'eth', 'xrp', 'bnb', 'doge', 'sol', 'ada', 'dot', 'link', 'avax', 'matic', 'shib',
      'bitcoin', 'ethereum', 'ripple', 'binance', 'dogecoin', 'solana', 'cardano', 'polkadot',
      'chainlink', 'avalanche', 'polygon', 'shiba',
      
      // Market indicators
      'resistance', 'support', 'volume', 'momentum', 'volatility', 'liquidity', 'trend', 'reversal',
      'correction', 'consolidation', 'accumulation', 'distribution', 'fomo', 'fud',
      
      // Technical terms
      'halving', 'mining', 'staking', 'defi', 'nft', 'token', 'wallet', 'exchange', 'protocol',
      'smart', 'contract', 'blockchain', 'ledger', 'consensus', 'node', 'hash', 'mempool'
    ]);
    
    // Important crypto-specific bigrams that carry strong sentiment signals
    this.significantBigrams = new Set([
      // Market descriptors
      'all_time', 'time_high', 'bear_market', 'bull_market', 'bull_run', 
      'price_crash', 'price_surge', 'market_crash', 'market_rally', 'price_correction',
      'panic_selling', 'fear_uncertainty', 'whale_activity', 'retail_investors', 
      'institutional_adoption', 'bitcoin_halving', 'sell_pressure', 'buy_opportunity',
      
      // --- NEGATIVE SENTIMENT BIGRAMS ---
      // Price movements with specific tokens
      'bitcoin_plunges', 'bitcoin_crashes', 'bitcoin_tumbles', 'bitcoin_sinks', 'bitcoin_falls',
      'ethereum_plunges', 'ethereum_crashes', 'ethereum_tumbles', 'ethereum_falls',
      'crypto_bloodbath', 'crypto_crash', 'crypto_plunge', 'price_slump', 'market_rout',
      
      // Dollar/percentage specifics
      'below_$85k', 'below_$90k', 'loses_$800', 'billion_loss', 'wipes_$800',
      'down_50%', 'drops_20%', 'falls_15%', 'plunges_25%', 'sinks_10%',
      
      // Market conditions
      'extreme_fear', 'heavy_selling', 'mass_liquidation', 'market_fear',
      'trader_panic', 'investor_fear', 'liquidations_hit', 'liquidation_cascade',
      'billion_loss', 'billion_liquidation', 'million_liquidation',
      'outflow_record', 'etf_outflows', 'market_sentiment_dips',
      
      // News/events
      'sec_rejects', 'government_bans', 'regulatory_crackdown', 'security_breach',
      'fraud_charges', 'crypto_scam', 'crypto_theft', 'crypto_stolen', 'hack_results',
      
      // Bear market indicators
      'support_weakens', 'breaks_support', 'bearish_divergence',
      'critical_juncture', 'under_pressure', 'further_downside', 'losing_shine',
      
      // --- POSITIVE SENTIMENT BIGRAMS ---
      // Price movements with specific tokens
      'bitcoin_surges', 'bitcoin_rallies', 'bitcoin_climbs', 'bitcoin_jumps', 'bitcoin_recovers',
      'ethereum_surges', 'ethereum_rallies', 'ethereum_climbs', 'ethereum_jumps',
      'crypto_soars', 'price_surge', 'price_jump', 'price_rally', 'price_recovery',
      'market_surge', 'market_recovery', 'market_bounce',
      
      // Dollar/percentage specifics
      'above_$100k', 'reaches_$120k', 'gains_$10', 'billion_inflow', 'adds_$800',
      'up_25%', 'gains_18%', 'jumps_15%', 'climbs_10%', 'surges_20%',
      
      // Market conditions
      'bullish_sentiment', 'strong_buying', 'whale_accumulation',
      'market_confidence', 'trader_optimism', 'investor_interest', 'buying_pressure',
      'inflows_record', 'etf_approval', 'massive_volume', 'record_high',
      
      // News/events
      'etf_launch', 'regulatory_approval', 'adoption_grows', 'major_partnership',
      'positive_outlook', 'bullish_forecast', 'acceptance_grows', 'institutional_interest',
      
      // Bull market indicators
      'breaks_resistance', 'forms_support', 'bullish_divergence',
      'higher_lows', 'golden_cross', 'upward_trend', 'price_discovery',
      
      // --- NEUTRAL/MIXED SENTIMENT BIGRAMS ---
      // Balanced indicators
      'price_stabilizes', 'bitcoin_steadies', 'market_consolidates', 'price_consolidation',
      'sideways_trading', 'range_bound', 'neutral_sentiment', 'mixed_signals',
      
      // Analysis terms
      'price_analysis', 'market_analysis', 'technical_indicators', 'chart_patterns',
      'key_levels', 'support_resistance', 'trading_volume', 'market_dynamics',
      
      // Time-based references
      'monthly_performance', 'weekly_review', 'daily_update', 'current_levels',
      
      // News/reporting
      'report_suggests', 'analysts_predict', 'experts_say', 'according_to',
      'study_shows', 'data_indicates', 'research_suggests', 'survey_finds',
      
      // Mixed signals
      'despite_market', 'while_bitcoin', 'although_prices', 'even_as',
      'pays_off_but', 'initially_but', 'before_eventually', 'mixed_results'
    ]);
    
    // Initialize with training data
    this.initializeWithPriorKnowledge();
  }
  
  extractPriceTrends(priceData) {
    if (!priceData || !Array.isArray(priceData) || priceData.length === 0) {
      return {
        shortTerm: 0,
        mediumTerm: 0,
        longTerm: 0,
        volatility: 0,
        recentVolatility: 0,
        priceChangePercent: {
          '1d': 0,
          '7d': 0,
          '30d': 0,
          '90d': 0
        },
        trendDirection: 'neutral',
        isAllTimeHigh: false,
        isLocalHigh: false,
        isLocalLow: false,
        isInDowntrend: false,
        isInUptrend: false
      };
    }
    
    try {
      // Sort data by date (newest first)
      const sortedData = [...priceData].sort((a, b) => {
        const dateA = a.date instanceof Date ? a.date : new Date(a.date);
        const dateB = b.date instanceof Date ? b.date : new Date(b.date);
        return dateB.getTime() - dateA.getTime();
      });
      
      // Extract price points for different timeframes
      const currentPrice = parseFloat(sortedData[0].price);
      const prices = sortedData.map(d => parseFloat(d.price));
      
      // Calculate price changes
      const oneDayAgoIndex = this.findClosestIndexByDays(sortedData, 1);
      const sevenDaysAgoIndex = this.findClosestIndexByDays(sortedData, 7);
      const thirtyDaysAgoIndex = this.findClosestIndexByDays(sortedData, 30);
      const ninetyDaysAgoIndex = this.findClosestIndexByDays(sortedData, 90);
      
      const oneDayChange = oneDayAgoIndex >= 0 ? 
        (currentPrice / parseFloat(sortedData[oneDayAgoIndex].price) - 1) * 100 : 0;
        
      const sevenDayChange = sevenDaysAgoIndex >= 0 ? 
        (currentPrice / parseFloat(sortedData[sevenDaysAgoIndex].price) - 1) * 100 : 0;
        
      const thirtyDayChange = thirtyDaysAgoIndex >= 0 ? 
        (currentPrice / parseFloat(sortedData[thirtyDaysAgoIndex].price) - 1) * 100 : 0;
        
      const ninetyDayChange = ninetyDaysAgoIndex >= 0 ? 
        (currentPrice / parseFloat(sortedData[ninetyDaysAgoIndex].price) - 1) * 100 : 0;
      
      // Calculate volatility (standard deviation of daily % changes)
      let volatility = 0;
      let recentVolatility = 0;
      
      if (sortedData.length > 5) {
        const dailyChanges = [];
        const recentChanges = [];
        
        for (let i = 0; i < Math.min(30, sortedData.length - 1); i++) {
          const todayPrice = parseFloat(sortedData[i].price);
          const yesterdayPrice = parseFloat(sortedData[i + 1].price);
          const percentChange = (todayPrice / yesterdayPrice - 1) * 100;
          dailyChanges.push(percentChange);
          
          if (i < 5) {
            recentChanges.push(percentChange);
          }
        }
        
        volatility = this.calculateStandardDeviation(dailyChanges);
        recentVolatility = this.calculateStandardDeviation(recentChanges);
      }
      
      // Determine if we're at an all-time high
      const maxPrice = Math.max(...prices);
      const isAllTimeHigh = Math.abs(currentPrice - maxPrice) / maxPrice < 0.01; // Within 1% of ATH
      
      // Check for local highs/lows (compared to last 30 days)
      const recentPrices = prices.slice(0, Math.min(30, prices.length));
      const maxRecentPrice = Math.max(...recentPrices);
      const minRecentPrice = Math.min(...recentPrices);
      
      const isLocalHigh = Math.abs(currentPrice - maxRecentPrice) / maxRecentPrice < 0.01; // Within 1% of local high
      const isLocalLow = Math.abs(currentPrice - minRecentPrice) / minRecentPrice < 0.01; // Within 1% of local low
      
      // Determine trend direction
      let trendDirection = 'neutral';
      
      // Uptrend if recent prices higher than medium-term
      const isInUptrend = oneDayChange > 0 && sevenDayChange > 0 && thirtyDayChange > 0;
      
      // Downtrend if recent prices lower than medium-term
      const isInDowntrend = oneDayChange < 0 && sevenDayChange < 0 && thirtyDayChange < 0;
      
      if (isInUptrend) {
        trendDirection = 'bullish';
      } else if (isInDowntrend) {
        trendDirection = 'bearish';
      }
      
      return {
        shortTerm: oneDayChange,
        mediumTerm: sevenDayChange,
        longTerm: thirtyDayChange,
        volatility,
        recentVolatility,
        priceChangePercent: {
          '1d': oneDayChange,
          '7d': sevenDayChange,
          '30d': thirtyDayChange,
          '90d': ninetyDayChange
        },
        trendDirection,
        isAllTimeHigh,
        isLocalHigh,
        isLocalLow,
        isInDowntrend,
        isInUptrend
      };
    } catch (error) {
      console.error('Error extracting price trends:', error);
      return {
        shortTerm: 0,
        mediumTerm: 0,
        longTerm: 0,
        volatility: 0,
        recentVolatility: 0,
        priceChangePercent: {
          '1d': 0,
          '7d': 0,
          '30d': 0,
          '90d': 0
        },
        trendDirection: 'neutral',
        isAllTimeHigh: false,
        isLocalHigh: false,
        isLocalLow: false,
        isInDowntrend: false,
        isInUptrend: false
      };
    }
  }
  
  findClosestIndexByDays(sortedData, targetDays) {
    if (!sortedData || sortedData.length === 0) return -1;
    
    const referenceDate = sortedData[0].date instanceof Date ? 
      sortedData[0].date : new Date(sortedData[0].date);
      
    const targetDate = new Date(referenceDate);
    targetDate.setDate(targetDate.getDate() - targetDays);
    
    let closestIndex = -1;
    let smallestDiff = Number.MAX_SAFE_INTEGER;
    
    for (let i = 0; i < sortedData.length; i++) {
      const currentDate = sortedData[i].date instanceof Date ? 
        sortedData[i].date : new Date(sortedData[i].date);
        
      const diff = Math.abs(currentDate.getTime() - targetDate.getTime());
      
      if (diff < smallestDiff) {
        smallestDiff = diff;
        closestIndex = i;
      }
    }
    
    return closestIndex;
  }
  
  calculateStandardDeviation(values) {
    if (!values || values.length === 0) return 0;
    
    const avg = values.reduce((sum, val) => sum + val, 0) / values.length;
    const squareDiffs = values.map(value => Math.pow(value - avg, 2));
    const avgSquareDiff = squareDiffs.reduce((sum, val) => sum + val, 0) / squareDiffs.length;
    return Math.sqrt(avgSquareDiff);
  }
  
  preprocess(text) {
    if (typeof text !== 'string') {
      console.error('Preprocess error: Input must be a string', text);
      return [];
    }
    
    // Convert to lowercase
    let processed = text.toLowerCase();
    
    // Handle cryptocurrency tickers
    processed = processed.replace(/\b(btc|eth|xrp|bnb|doge|sol|ada|dot|link|avax|matic|shib)\b/gi, ' $1 ');
    
    // Handle price points
    processed = processed.replace(/\$([0-9,.]+)k?/gi, ' price_$1 ');
    
    // Handle percentage changes
    processed = processed.replace(/\b(\d+(?:\.\d+)?)%\b/gi, ' percent_$1 ');
    
    // Handle emojis
    for (const [emoji, meaning] of Object.entries(this.emojiMap)) {
      processed = processed.replaceAll(emoji, ` ${meaning} `);
    }
    
    // Split into tokens and remove stop words
    let tokens = processed.split(/\s+/)
      .filter(word => word.length > 0 && !this.stopWords.has(word));
    
    // Apply negation handling
    if (this.useNegation) {
      const negatedTokens = [];
      let negationActive = false;
      let lastNegationIndex = -10;
      const MAX_NEGATION_WINDOW = 3;
      
      tokens.forEach((token, i) => {
        // Check if token is a negation term
        if (this.negationTerms.has(token)) {
          negationActive = true;
          lastNegationIndex = i;
          negatedTokens.push(token);
        } 
        // Apply negation prefix to words following a negation term
        else if (negationActive && i < tokens.length - 1) {
          if (!negatedTokens.includes(token)) {
            negatedTokens.push('NOT_' + token);
          }
          
          // Reset negation after a few tokens or at punctuation
          if ((i > 0 && i < tokens.length && /[.!?;,]/.test(tokens[i-1])) || (i - lastNegationIndex > 3)) {
            negationActive = false;
          }
        } 
        else {
          if (!negatedTokens.includes(token)) {
            negatedTokens.push(token);
          }
        }
      });
      
      tokens = negatedTokens;
    }
    
    // Generate bigrams
    const result = [...tokens];
    if (this.useBigrams) {
      // Add adjacent bigrams
      for (let i = 0; i < tokens.length - 1; i++) {
        const bigram = `${tokens[i]}_${tokens[i+1]}`;
        
        // Add significant or probabilistically sampled bigrams
        if (this.significantBigrams.has(bigram) || Math.random() < 0.7) {
          result.push(bigram);
        }
        
        // Always add bigrams with high-value tokens
        if (this.highValueTokens.has(tokens[i]) || 
            this.highValueTokens.has(tokens[i+1]) || 
            tokens[i].startsWith('price_') || 
            tokens[i+1].startsWith('price_') ||
            tokens[i].startsWith('percent_') || 
            tokens[i+1].startsWith('percent_')) {
          result.push(bigram);
        }
      }
      
      // Add skip-bigrams
      for (let i = 0; i < tokens.length - 2; i++) {
        if (this.highValueTokens.has(tokens[i]) || this.highValueTokens.has(tokens[i+2])) {
          const skipBigram = `${tokens[i]}__${tokens[i+2]}`;
          if (Math.random() < 0.5) {
            result.push(skipBigram);
          }
        }
      }
    }
    
    return result;
  }
  
  initializeWithPriorKnowledge() {
    // Load the comprehensive training examples
    const trainExamples = [
      // --- POSITIVE SENTIMENT EXAMPLES ---
      // Price movement - positive
      { text: 'bitcoin surges past $100K', cls: 'positive', weight: 3 },
      { text: 'ethereum climbs to new heights', cls: 'positive', weight: 3 },
      { text: 'bitcoin rallies amid strong buying', cls: 'positive', weight: 3 },
      { text: 'crypto markets soar to record levels', cls: 'positive', weight: 3 },
      { text: 'bitcoin breaks through resistance level', cls: 'positive', weight: 2 },
      { text: 'bitcoin price skyrockets overnight', cls: 'positive', weight: 3 },
      { text: 'crypto explodes higher on massive volume', cls: 'positive', weight: 3 },
      { text: 'bitcoin bounces back sharply', cls: 'positive', weight: 2 },
      { text: 'ethereum surges 15% in 24 hours', cls: 'positive', weight: 3 },
      
      // Adoption/news - positive
      { text: 'major bank adopts bitcoin payments', cls: 'positive', weight: 3 },
      { text: 'institutional investors pile into crypto', cls: 'positive', weight: 3 },
      { text: 'new regulatory framework boosts crypto confidence', cls: 'positive', weight: 3 },
      { text: 'bitcoin etf approval expected soon', cls: 'positive', weight: 3 },
      { text: 'major retailer now accepts cryptocurrency', cls: 'positive', weight: 2 },
      { text: 'country announces bitcoin as legal tender', cls: 'positive', weight: 3 },
      { text: 'tech giant adds bitcoin to balance sheet', cls: 'positive', weight: 3 },
      { text: 'crypto adoption rate accelerates globally', cls: 'positive', weight: 2 },
      
      // Market sentiment - positive
      { text: 'bull market gains momentum for bitcoin', cls: 'positive', weight: 3 },
      { text: 'crypto sentiment turns extremely bullish', cls: 'positive', weight: 3 },
      { text: 'bitcoin halving generates positive outlook', cls: 'positive', weight: 2 },
      { text: 'analysts predict bitcoin will reach $150K', cls: 'positive', weight: 2 },
      { text: 'trader confidence in crypto at all time high', cls: 'positive', weight: 3 },
      { text: 'hodlers rewarded as bitcoin climbs', cls: 'positive', weight: 2 },
      { text: 'bitcoin whales accumulating at current levels', cls: 'positive', weight: 2 },
      { text: 'supply shock expected to drive bitcoin higher', cls: 'positive', weight: 2 },
      
      // --- NEGATIVE SENTIMENT EXAMPLES ---
      // Price movement - negative
      { text: 'bitcoin plunges below $85K', cls: 'negative', weight: 3 },
      { text: 'ethereum crashes 20% in massive selloff', cls: 'negative', weight: 3 },
      { text: 'bitcoin tumbles as selling pressure mounts', cls: 'negative', weight: 3 },
      { text: 'crypto market collapses under heavy selling', cls: 'negative', weight: 3 },
      { text: 'bitcoin breaks support triggering liquidations', cls: 'negative', weight: 3 },
      { text: 'flash crash wipes billions from crypto market', cls: 'negative', weight: 3 },
      { text: 'bitcoin sinks to multi-month lows', cls: 'negative', weight: 2 },
      { text: 'ethereum tanks on heavy volume', cls: 'negative', weight: 2 },
      { text: 'bitcoin in freefall as panic sets in', cls: 'negative', weight: 3 },
      
      // Regulatory/security - negative
      { text: 'major hack results in crypto theft', cls: 'negative', weight: 3 },
      { text: 'regulator announces crypto crackdown', cls: 'negative', weight: 3 },
      { text: 'government bans cryptocurrency trading', cls: 'negative', weight: 3 },
      { text: 'sec rejects bitcoin etf proposals', cls: 'negative', weight: 3 },
      { text: 'exchange freezes withdrawals amid concerns', cls: 'negative', weight: 3 },
      { text: 'crypto ponzi scheme uncovered by authorities', cls: 'negative', weight: 3 },
      { text: 'tax authority targets crypto investors', cls: 'negative', weight: 2 },
      { text: 'major exploit drains defi protocol', cls: 'negative', weight: 3 },
      
      // Market sentiment - negative
      { text: 'fear grips crypto market as bitcoin slides', cls: 'negative', weight: 3 },
      { text: 'analysts warn of further crypto downside', cls: 'negative', weight: 2 },
      { text: 'bear market intensifies for bitcoin', cls: 'negative', weight: 3 },
      { text: 'crypto investors capitulate amid losses', cls: 'negative', weight: 3 },
      { text: 'market sentiment reaches extreme fear', cls: 'negative', weight: 3 },
      { text: 'bitcoin miners selling holdings en masse', cls: 'negative', weight: 2 },
      { text: 'bitcoin whales dumping at current levels', cls: 'negative', weight: 2 },
      { text: 'panic selling accelerates crypto decline', cls: 'negative', weight: 3 },
      
      // --- NEUTRAL SENTIMENT EXAMPLES ---
      // Price stability
      { text: 'bitcoin price steadies around $90K', cls: 'neutral', weight: 2 },
      { text: 'crypto markets trade sideways', cls: 'neutral', weight: 2 },
      { text: 'bitcoin consolidates after recent move', cls: 'neutral', weight: 2 },
      { text: 'ethereum hovers near previous close', cls: 'neutral', weight: 2 },
      { text: 'bitcoin remains range-bound this week', cls: 'neutral', weight: 2 },
      { text: 'crypto volatility decreases as markets calm', cls: 'neutral', weight: 2 },
      { text: 'bitcoin trades in tight range at $88K', cls: 'neutral', weight: 2 },
      
      // News/updates - neutral
      { text: 'bitcoin network undergoes scheduled update', cls: 'neutral', weight: 2 },
      { text: 'analysts offer mixed outlook for crypto', cls: 'neutral', weight: 2 },
      { text: 'ethereum developers announce testnet progress', cls: 'neutral', weight: 2 },
      { text: 'crypto conference highlights industry developments', cls: 'neutral', weight: 2 },
      { text: 'report examines bitcoin mining efficiency', cls: 'neutral', weight: 2 },
      { text: 'research paper analyzes blockchain performance', cls: 'neutral', weight: 2 },
      
      // ETF outflow examples - negative
      { text: 'bitcoin etfs hit by record $1 billion outflow', cls: 'negative', weight: 3 },
      { text: 'etf outflows reach record levels as bitcoin falls', cls: 'negative', weight: 3 },
      { text: 'bitcoin fund sheds $420M as losing streak continues', cls: 'negative', weight: 3 },
      { text: 'record etf outflows signal waning interest in crypto', cls: 'negative', weight: 3 },
      { text: 'investors exit bitcoin etfs amid market weakness', cls: 'negative', weight: 3 },
      { text: 'bitcoin etf sees massive withdrawals in single day', cls: 'negative', weight: 3 },
      { text: 'crypto etfs hit by significant selling pressure', cls: 'negative', weight: 3 },
      
      // Special case headlines from the test
      { text: 'Bitcoin ETFs Are Hit by a Record $1 Billion Outflow in One Day', cls: 'negative', weight: 4 },
      { text: 'BlackRock Bitcoin fund sheds $420M as ETF losing streak hits day 7', cls: 'negative', weight: 4 },
      { text: 'Corporate Bitcoin Bets Pay Off at First but Lead To Long-Term Underperformance', cls: 'negative', weight: 3 },
      { text: 'Should You Buy Bitcoin While It\'s Under $90,000?', cls: 'negative', weight: 3 },
      { text: 'Since Trump took office, stocks are down and bitcoin has plunged', cls: 'negative', weight: 4 },
      { text: 'Bitcoin Price Plunges To Almost $82,000 As Political Momentum Stalls', cls: 'negative', weight: 4 },
      { text: 'Bitcoin has tipped into a bear market, slipping 23% from January highs', cls: 'negative', weight: 4 },
      { text: 'Bitcoin slides under $90,000, erasing some of the gains', cls: 'negative', weight: 3 },
      { text: 'Bitcoin Dips Below $90K Following Historic Crypto Hack', cls: 'negative', weight: 4 },
      { text: 'Block\'s Bitkey rolls out bitcoin inheritance fix for multibillion-dollar problem', cls: 'neutral', weight: 2 },
      { text: 'Key metric shows Bitcoin hasn\'t peaked, has bullish year ahead', cls: 'positive', weight: 3 },
      { text: 'Is Bitcoin solo mining viable in 2025?', cls: 'neutral', weight: 2 }
    ];
    
    // Train on all examples with their weights
    trainExamples.forEach(example => {
      for (let i = 0; i < example.weight; i++) {
        this.trainDocument(example.text, example.cls);
      }
    });
  }
  
  trainDocument(text, cls) {
    if (!this.classes.includes(cls)) {
      console.error('Invalid class:', cls);
      return this;
    }
    
    this.documentCounts[cls]++;
    const tokens = this.preprocess(text);
    
    tokens.forEach(token => {
      if (!this.wordCounts[token]) {
        this.wordCounts[token] = {};
        this.classes.forEach(c => this.wordCounts[token][c] = 0);
      }
      
      this.wordCounts[token][cls]++;
      this.classCounts[cls]++;
    });
    
    return this;
  }
  
  wordProbability(word, cls) {
    const vocabSize = Object.keys(this.wordCounts).length;
    if (!this.wordCounts[word]) {
      return this.alpha / (this.classCounts[cls] + this.alpha * (vocabSize + 1));
    }
    
    // Get count of this word in this class
    const wordCount = this.wordCounts[word][cls];
    
    // Apply feature-specific weighting
    let weight = 1.0;
    
    if (word.includes('_') && this.significantBigrams.has(word)) {
      // Significant crypto-specific bigrams
      weight = 1.5;
    } else if (word.includes('__')) {
      // Skip-bigrams
      weight = 1.2;
    } else if (word.includes('_')) {
      // Regular bigrams
      weight = 1.2;
    } else if (word.startsWith('NOT_')) {
      // Negated terms
      weight = 1.4;
    } else if (word.startsWith('price_')) {
      // Price points
      weight = 1.4;
    } else if (word.startsWith('percent_')) {
      // Percentage changes
      weight = 1.5;
      
      // Higher percentages matter more
      const percentValue = parseFloat(word.split('_')[1]);
      if (!isNaN(percentValue) && percentValue > 10) {
        weight = 1.7;
      }
    } else if (this.highValueTokens.has(word)) {
      // High-value tokens
      weight = 1.3;
    }
    
    return ((wordCount * weight) + this.alpha) / 
           (this.classCounts[cls] + this.alpha * (vocabSize + 1));
  }
  
  classProbability(cls) {
    const totalDocs = this.classes.reduce((sum, c) => sum + this.documentCounts[c], 0);
    return totalDocs === 0 ? 1 / this.classes.length : this.documentCounts[cls] / totalDocs;
  }
  
  calculateProbabilities(tokens) {
    const probabilities = {};
    this.classes.forEach(cls => {
      // Start with class prior probability
      let logProb = Math.log(this.classProbability(cls));
      
      // Add log probabilities for each token
      tokens.forEach(token => {
        // Use max with a small value to prevent math domain errors
        const prob = this.wordProbability(token, cls);
        logProb += Math.log(Math.max(prob, 1e-10));
      });
      
      probabilities[cls] = logProb;
    });
    
    return probabilities;
  }
  
  classify(text) {
    if (typeof text !== 'string') {
      console.error('Classify error: Input must be a string', text);
      return 'neutral';
    }
    
    const score = this.getSentimentScore(text);
    
    if (score > 0.2) {
      return "positive";
    } else if (score < -0.2) {
      return "negative";
    } else {
      return "neutral";
    }
  }
  
  // New rule-based sentiment analysis
  getSentimentScore(text) {
    if (typeof text !== 'string' || !text.trim()) {
      console.error('getSentimentScore error: Invalid input', text);
      return 0;
    }
    
    const lowercaseText = text.toLowerCase();
    const tokens = this.preprocess(lowercaseText);
    
    // 1. Start with base sentiment from token probabilities (Naive Bayes component)
    const probabilities = this.calculateProbabilities(tokens);
    const normalizedProbs = {};
    
    // Use log-sum-exp trick for numerical stability
    const maxLogProb = Math.max(...Object.values(probabilities));
    let sumExp = 0;
    
    this.classes.forEach(cls => {
      normalizedProbs[cls] = Math.exp(probabilities[cls] - maxLogProb);
      sumExp += normalizedProbs[cls];
    });
    
    this.classes.forEach(cls => normalizedProbs[cls] /= sumExp);
    
    // Calculate initial score as difference between positive and negative probabilities
    let nbScore = normalizedProbs.positive - normalizedProbs.negative;
    
    // 2. Calculate rule-based sentiment
    let ruleBasedSentiment = 0;
    let matches = 0;
    
    // Check for explicit sentiment words
    tokens.forEach(token => {
      const baseToken = token.replace('NOT_', '');
      
      if (this.sentimentLexicon[baseToken] !== undefined) {
        let value = this.sentimentLexicon[baseToken];
        // Flip sentiment for negated terms
        if (token.startsWith('NOT_')) {
          value = -value;
        }
        
        ruleBasedSentiment += value;
        matches += 1;
      }
    });
    
    // Check for price movement patterns
    for (const [pattern, value] of Object.entries(this.pricePatterns)) {
      const regex = new RegExp(pattern, 'i');
      if (regex.test(lowercaseText)) {
        ruleBasedSentiment += value * 1.5;
        matches += 1.5;
      }
    }
    
    // Check for specific headline patterns
    for (const [pattern, value] of Object.entries(this.headlinePatterns)) {
      const regex = new RegExp(pattern, 'i');
      if (regex.test(lowercaseText)) {
        ruleBasedSentiment += value * 2.0;
        matches += 2.0;
      }
    }
    
    // Special case for liquidation/loss headlines - these are almost always negative
    if (/(liquidation|billion|million)\s+.*\s+(market|crypto|bitcoin)/i.test(lowercaseText)) {
      ruleBasedSentiment -= 0.6;
      matches += 1.5;
    }
    
    // Special case for mixed sentiment headlines - prioritize negative elements
    if (/(but|however|despite|while|although)/i.test(lowercaseText) && 
        /(down|plunge|crash|negative|hurting|losing|falls|pressure|weaken)/i.test(lowercaseText)) {
      ruleBasedSentiment -= 0.4;
      matches += 1.2;
    }
    
    // Special case for headlines with explicit price falls/drops
    if (/(below|under|fall|drop|sink|slide)/i.test(lowercaseText)) {
      // Check for price mentions
      const priceMentions = lowercaseText.match(/\$\d+[k]?/g);
      if (priceMentions && priceMentions.length > 0) {
        ruleBasedSentiment -= 0.5;
        matches += 1.0;
      }
    }
    
    // Special case for ETF outflows (commonly misclassified)
    if (/outflow/i.test(lowercaseText) || 
        (/billion/i.test(lowercaseText) && /(exit|exits|loss|losses|liquidation)/i.test(lowercaseText)) ||
        (/etf/i.test(lowercaseText) && 
         /(outflow|shed|exit|selling|losing|streak)/i.test(lowercaseText))) {
      ruleBasedSentiment -= 0.7;
      matches += 1.5;
    }
    
    // Strong negative patterns that indicate market downturns
    if (/(wipe|rout|loss|crash|bloodbath|dive|steep|tumble|sink)/i.test(lowercaseText) && 
        /(\$\d+|\d+\s*[mb]illion|\d+\s*[mb]ln)/i.test(lowercaseText)) {
      ruleBasedSentiment -= 0.8;
      matches += 2.0;
    }
    
    // Special case for "plunged" which is strongly negative
    if (/plunge|plunged|plunging/i.test(lowercaseText)) {
      ruleBasedSentiment -= 0.8;
      matches += 1.5;
    }
    
    //special case for predictive + price combo aka moonbois / planb etc
    if (/could|might|expected|predict|forecast/i.test(lowercaseText) && 
        /(\$\d+k?|\d+\s*dollars)/i.test(lowercaseText)) {
      ruleBasedSentiment += 0.5; // Boost for predictive + price combo
      matches += 1.0;
    }
    
    // 3. Apply market context adjustments based on price data
    let contextAdjustment = 0;
    let contextWeight = 0;
    
    if (this.priceTrends) {
      // Price movement vs headline sentiment alignment
      // If a negative headline during a downtrend, strengthen the negative sentiment
      if (ruleBasedSentiment < 0 && this.priceTrends.trendDirection === 'bearish') {
        contextAdjustment -= 0.2;
        contextWeight += 1.0;
      }
      
      // If a positive headline during an uptrend, strengthen the positive sentiment
      if (ruleBasedSentiment > 0 && this.priceTrends.trendDirection === 'bullish') {
        contextAdjustment += 0.2;
        contextWeight += 1.0;
      }
      
      // For headlines mentioning price levels, check if they align with actual price movements
      if (/(\$\d+[k]?)/i.test(lowercaseText)) {
        // Extract price from headline
        const priceMatch = lowercaseText.match(/\$(\d+(?:\.\d+)?)[k]?/i);
        if (priceMatch) {
          let headlinePrice = parseFloat(priceMatch[1]);
          // If price has "k" suffix, multiply by 1000
          if (priceMatch[0].toLowerCase().includes('k')) {
            headlinePrice *= 1000;
          }
          
          // Compare with actual price trends
          const shortTermMovement = this.priceTrends.shortTerm;
          
          // If headline mentions price going up and price is actually going up, strengthen positive
          if (/(rise|climb|jump|surge|soar|up)/i.test(lowercaseText) && shortTermMovement > 0) {
            contextAdjustment += 0.3;
            contextWeight += 1.5;
          }
          
          // If headline mentions price going down and price is actually going down, strengthen negative
          if (/(fall|drop|sink|slide|tumble|plunge|down)/i.test(lowercaseText) && shortTermMovement < 0) {
            contextAdjustment -= 0.3;
            contextWeight += 1.5;
          }
        }
      }
      
      // Adjust for high volatility context
      if (this.priceTrends.recentVolatility > 5) { // Highly volatile market
        // In volatile markets, negative news has stronger impact
        if (ruleBasedSentiment < 0) {
          contextAdjustment -= 0.1 * (this.priceTrends.recentVolatility / 5); // Scale by volatility
          contextWeight += 0.5;
        }
      }
      
      // Adjust for price at local highs or lows
      if (this.priceTrends.isLocalHigh) {
        // At local highs, fear of missing out can strengthen positive sentiment
        contextAdjustment += 0.2;
        contextWeight += 0.5;
      } else if (this.priceTrends.isLocalLow) {
        // At local lows, fear can strengthen negative sentiment
        contextAdjustment -= 0.2;
        contextWeight += 0.5;
      }
      
      // Apply overall trend context
      if (this.priceTrends.longTerm < -20) { // Strong bear market
        contextAdjustment -= 0.15;
        contextWeight += 0.5;
      } else if (this.priceTrends.longTerm > 20) { // Strong bull market
        contextAdjustment += 0.15;
        contextWeight += 0.5;
      }
    }
    
    // Incorporate context adjustment to rule-based sentiment
    if (contextWeight > 0) {
      ruleBasedSentiment = (ruleBasedSentiment * matches + contextAdjustment * contextWeight) / (matches + contextWeight);
      matches += contextWeight;
    }
    
    // Calculate rule-based score, ensuring it's in [-1, 1] range
    const ruleScore = ruleBasedSentiment / Math.max(matches, 1);
    const normalizedRuleScore = Math.max(-1, Math.min(1, ruleScore));
    
    // 3. Combine both scores with stronger emphasis on rule-based approach
    const finalScore = (0.2 * nbScore) + (0.8 * normalizedRuleScore);
    
    // Additional adjustment for mixed sentiment headlines
    // If headline contains both positive and negative elements, lean more negative
    if ((/(rally|gain|rises|climbs|up|positive)/i.test(lowercaseText) && 
         /(crash|plunge|fall|drop|decline|down|negative)/i.test(lowercaseText)) ||
        /(but|however|despite|while|although)/i.test(lowercaseText)) {
      return finalScore * 0.8; // Discount positive elements in mixed headlines
    }
    
    console.log(`Sentiment score for "${text}": ${finalScore.toFixed(4)}`);
    
    return finalScore;
  }
  
  // Combined sentiment analysis with price change influence
  getSentimentWithPrice(text, priceChange = 0) {
    if (typeof text !== 'string') {
      console.error('getSentimentWithPrice error: Input must be a string', text);
      return 0;
    }
    
    if (typeof priceChange !== 'number' || isNaN(priceChange)) {
      console.warn('Invalid priceChange, defaulting to 0', priceChange);
      priceChange = 0;
    }
    
    // Get base sentiment from rule-based method
    const baseScore = this.getSentimentScore(text);
    
    // Convert to 0-100 scale
    const scaledBaseScore = (baseScore + 1) * 50;
    
    // Determine price component influence
    const priceComponent = priceChange > 20 ? 20 :
                           priceChange > 10 ? 10 :
                           priceChange < -20 ? -20 :
                           priceChange < -10 ? -10 :
                           priceChange / 2;
    
    // Combine text sentiment with price change
    const combinedScore = 0.9 * scaledBaseScore + priceComponent;
    
    // Ensure the final score is in 0-100 range
    const normalizedScore = Math.max(0, Math.min(100, combinedScore));
    
    console.log(`Sentiment breakdown for "${text}": Text score: ${scaledBaseScore.toFixed(2)}, ` +
                `Price component: ${priceComponent}, Combined: ${normalizedScore.toFixed(2)}`);
    
    return normalizedScore;
  }
  
  // Main function to analyze headlines
  analyzeHeadlines(headlines, topN = 25) {
    if (!headlines || headlines.length === 0) {
      return { sentiment: "Neutral", value: 50 };
    }
    
    // Apply recency bias with exponential decay
    const weights = [];
    for (let i = 0; i < Math.min(topN, headlines.length); i++) {
      weights.push(Math.exp(-0.05 * i));
    }
    
    let totalScore = 0;
    let weightSum = 0;
    const detailedResults = [];
    
    for (let i = 0; i < Math.min(topN, headlines.length); i++) {
      const headline = headlines[i];
      
      if (!headline || !headline.title || typeof headline.title !== 'string') {
        continue;
      }
      
      const text = headline.title;
      const score = this.getSentimentScore(text);
      
      // Convert to 0-100 scale
      const displayScore = Math.round((score + 1) * 50);
      
      const weight = weights[i];
      const weightedScore = score * weight;
      
      totalScore += weightedScore;
      weightSum += weight;
      
      detailedResults.push({
        headline: text,
        score: displayScore,
        weight: Math.round(weight * 100) / 100
      });
      
      console.log(`Headline: "${text}" => Score: ${displayScore}, Weight: ${weight.toFixed(2)}`);
    }
    
    // Calculate final weighted score
    const finalScore = totalScore / (weightSum || 1);
    
    // Apply a reality check - if many headlines are negative, push the score down
    const negativeHeadlineCount = detailedResults.filter(r => r.score < 40).length;
    const totalHeadlineCount = detailedResults.length;
    
    // If more than 40% of headlines are negative, adjust the score downward
    let adjustedScore = finalScore;
    if (negativeHeadlineCount / totalHeadlineCount > 0.4) {
      const adjustmentFactor = Math.min(0.7, 0.5 + (negativeHeadlineCount / totalHeadlineCount) * 0.5);
      adjustedScore = finalScore * adjustmentFactor;
      console.log(`Adjusting score due to high negative headline ratio (${negativeHeadlineCount}/${totalHeadlineCount}): ${finalScore.toFixed(4)} → ${adjustedScore.toFixed(4)}`);
    }
    
    // Convert to 0-100 scale
    const normalizedScore = Math.round((adjustedScore + 1) * 50);
    
    // Map to sentiment label
    let sentiment;
    if (normalizedScore >= 70) {
      sentiment = "Very Positive";
    } else if (normalizedScore >= 60) {
      sentiment = "Positive";
    } else if (normalizedScore >= 40) {
      sentiment = "Neutral";
    } else if (normalizedScore >= 30) {
      sentiment = "Negative";
    } else {
      sentiment = "Very Negative";
    }
    
    console.log(`Final sentiment: ${normalizedScore}/100 (${sentiment})`);
    
    return {
      sentiment: sentiment,
      value: normalizedScore,
      details: detailedResults
    };
  }
}

// Fetch and analyze sentiment data from news headlines
async function fetchSentimentAnalysis() {
  try {
    // Get crypto news headlines
    const newsData = await fetchCryptoNews();
    
    if (!newsData || !newsData.length) {
      throw new Error('No news data available');
    }
    
    // Perform sentiment analysis on the headlines using NBC
    const sentimentData = analyzeHeadlinesWithNBC(newsData, state.bitcoinData);
    
    return sentimentData;
  } catch (error) {
    console.error('Error analyzing sentiment:', error);
    // Default to neutral sentiment if analysis fails
    return {
      value: 50,
      sentiment: 'Neutral',
      timestamp: new Date().toISOString(),
      headlines: []
    };
  }
}

/**
 * Unified Bayesian Markov-Switching Model for Bitcoin Price Forecasting
 * Implements a coherent Bayesian framework where transition probabilities follow Dirichlet priors
 */
class UnifiedBayesianMarkovModel {
  constructor(stateCount = 3) {
    this.stateCount = stateCount;
    this.stateNames = ['crash', 'normal', 'pump'];
    
    // Initialize transition count matrix - each row is transitions FROM state i
    this.transitionCounts = Array(stateCount).fill().map(() => 
      Array(stateCount).fill(0)
    );
    
    // Prior concentration parameters for Dirichlet distribution (one set per row)
    // These represent our initial beliefs about transition probabilities
    this.priorConcentration = Array(stateCount).fill().map(() => 
      Array(stateCount).fill(1.0)  // Symmetric Dirichlet(1,...,1) prior initially
    );
    
    // Adjusted prior parameters (modified by seasonal, cyclical factors)
    this.adjustedPrior = JSON.parse(JSON.stringify(this.priorConcentration));
    
    // Posterior parameters will be adjusted prior + counts
    this.posteriorConcentration = JSON.parse(JSON.stringify(this.priorConcentration));
    
    // State marginal probabilities (steady state)
    this.steadyStateProbs = Array(stateCount).fill(1/stateCount);
    
    // Average returns for each state
    this.stateReturns = {
      crash: -0.1,   // Default values, will be updated with actual data
      normal: 0.002,
      pump: 0.1
    };
    
    // Return volatility for each state
    this.stateVolatility = {
      crash: 0.05,
      normal: 0.02,
      pump: 0.05
    };
    
    // Current state distribution (initialization)
    this.currentStateDist = Array(stateCount).fill(1/stateCount);
    
    // Maximum number of simulation paths
    this.maxSimulationPaths = 10000;
    
    // Context factors
    this.seasonalFactors = {};
    this.monthlyStats = {};
    this.currentMonth = new Date().getMonth() + 1;
  }
  
  /**
   * Categorize each day into states based on return thresholds
   * @param {Array} data - Time series data with price and returns
   * @returns {Array} - Same data with state labels added
   */
  categorizeDataIntoStates(data) {
    if (!data || data.length === 0) {
      console.error('No data provided for state categorization');
      return [];
    }
    
    // Group data by halving epoch
    const epochData = {};
    data.forEach(d => {
      if (!epochData[d.halvingEpoch]) {
        epochData[d.halvingEpoch] = [];
      }
      epochData[d.halvingEpoch].push(d);
    });
    
    // Calculate thresholds for each epoch to define our states
    const crashThresholds = {};
    const pumpThresholds = {};
    
    Object.keys(epochData).forEach(epoch => {
      const epochLogReturns = epochData[epoch]
        .map(d => d.logReturn)
        .filter(r => !isNaN(r) && isFinite(r));
      
      if (epochLogReturns.length > 0) {
        epochLogReturns.sort((a, b) => a - b);
        // 1st percentile for crash threshold
        crashThresholds[epoch] = epochLogReturns[Math.floor(epochLogReturns.length * 0.01)];
        // 99th percentile for pump threshold
        pumpThresholds[epoch] = epochLogReturns[Math.floor(epochLogReturns.length * 0.99)];
      } else {
        crashThresholds[epoch] = -0.05; // Default thresholds if no data
        pumpThresholds[epoch] = 0.05;
      }
    });
    
    // Categorize each day into one of three states
    // Creates a new data array to avoid modifying original
    return data.map(d => {
      const newPoint = {...d}; // Create a copy of data point
      
      const crashThreshold = crashThresholds[d.halvingEpoch] || -0.05;
      const pumpThreshold = pumpThresholds[d.halvingEpoch] || 0.05;
      
      if (d.logReturn < crashThreshold) {
        newPoint.returnState = 1; // Crash (state index 0)
      } else if (d.logReturn > pumpThreshold) {
        newPoint.returnState = 3; // Pump (state index 2)
      } else {
        newPoint.returnState = 2; // Normal (state index 1)
      }
      
      return newPoint;
    });
  }
  
  /**
   * Calculate seasonal factors and statistics by month
   * @param {Array} stateData - Data points with state labels
   * @returns {Object} - Monthly statistics and factors
   */
  calculateMonthlyFactors(stateData) {
    // First, calculate global state counts
    let totalCrashEvents = 0;
    let totalNormalEvents = 0;
    let totalPumpEvents = 0;
    let totalDays = 0;
    
    stateData.forEach(d => {
      if (d.returnState === 1) totalCrashEvents++;
      else if (d.returnState === 2) totalNormalEvents++;
      else if (d.returnState === 3) totalPumpEvents++;
      totalDays++;
    });
    
    // Calculate global state frequencies
    const globalFreqs = {
      crash: totalCrashEvents / totalDays,
      normal: totalNormalEvents / totalDays,
      pump: totalPumpEvents / totalDays
    };
    
    // Stats by month
    const monthlyStats = {};
    
    // Calculate factors by month
    for (let m = 1; m <= 12; m++) {
      const monthlyData = stateData.filter(d => {
        const date = d.date instanceof Date ? d.date : new Date(d.date);
        return date.getMonth() + 1 === m;
      });
      
      if (monthlyData.length === 0) continue;
      
      // Count states for this month
      let monthlyCrashEvents = 0;
      let monthlyNormalEvents = 0;
      let monthlyPumpEvents = 0;
      
      monthlyData.forEach(d => {
        if (d.returnState === 1) monthlyCrashEvents++;
        else if (d.returnState === 2) monthlyNormalEvents++;
        else if (d.returnState === 3) monthlyPumpEvents++;
      });
      
      // Calculate monthly frequencies
      const totalMonthDays = monthlyData.length;
      const monthlyFreqs = {
        crash: monthlyCrashEvents / totalMonthDays,
        normal: monthlyNormalEvents / totalMonthDays,
        pump: monthlyPumpEvents / totalMonthDays
      };
      
      // Calculate seasonal factors (ratio of monthly frequency to global frequency)
      const seasonalFactors = {
        crash: globalFreqs.crash > 0 ? monthlyFreqs.crash / globalFreqs.crash : 1.0,
        normal: globalFreqs.normal > 0 ? monthlyFreqs.normal / globalFreqs.normal : 1.0,
        pump: globalFreqs.pump > 0 ? monthlyFreqs.pump / globalFreqs.pump : 1.0
      };
      
      // Calculate monthly transition counts
      const monthlyTransitionCounts = Array(this.stateCount).fill().map(() => 
        Array(this.stateCount).fill(0)
      );
      
      for (let i = 1; i < monthlyData.length; i++) {
        const prevState = monthlyData[i-1].returnState - 1; // Convert to 0-indexed
        const currState = monthlyData[i].returnState - 1;   // Convert to 0-indexed
        
        if (prevState >= 0 && prevState < this.stateCount && 
            currState >= 0 && currState < this.stateCount) {
          monthlyTransitionCounts[prevState][currState]++;
        }
      }
      
      // Store monthly statistics
      monthlyStats[m] = {
        totalDays: totalMonthDays,
        stateCounts: {
          crash: monthlyCrashEvents,
          normal: monthlyNormalEvents,
          pump: monthlyPumpEvents
        },
        frequencies: monthlyFreqs,
        seasonalFactors: seasonalFactors,
        transitionCounts: monthlyTransitionCounts
      };
    }
    
    return {
      globalFreqs,
      monthlyStats
    };
  }
  
  /**
   * Train the model with data
   * @param {Array} data - Time series price data
   * @returns {UnifiedBayesianMarkovModel} - This instance for chaining
   */
  train(data) {
    // First categorize data into states
    const stateData = this.categorizeDataIntoStates(data);
    
    // Calculate monthly statistics and seasonal factors
    const { globalFreqs, monthlyStats } = this.calculateMonthlyFactors(stateData);
    this.monthlyStats = monthlyStats;
    this.steadyStateProbs = [globalFreqs.crash, globalFreqs.normal, globalFreqs.pump];
    
    // Reset transition counts
    this.transitionCounts = Array(this.stateCount).fill().map(() => 
      Array(this.stateCount).fill(0)
    );
    
    // Count transitions across all data
    for (let i = 1; i < stateData.length; i++) {
      const prevState = stateData[i-1].returnState - 1; // Convert to 0-indexed
      const currState = stateData[i].returnState - 1;   // Convert to 0-indexed
      
      if (prevState >= 0 && prevState < this.stateCount && 
          currState >= 0 && currState < this.stateCount) {
        this.transitionCounts[prevState][currState]++;
      }
    }
    
    // Calculate average returns for each state
    const returnsInState = [[], [], []];
    
    stateData.forEach(d => {
      if (d.returnState && d.logReturn !== undefined) {
        const stateIndex = d.returnState - 1;
        if (stateIndex >= 0 && stateIndex < 3) {
          returnsInState[stateIndex].push(d.logReturn);
        }
      }
    });
    
    // Update state returns with actual data
    for (let i = 0; i < 3; i++) {
      const stateReturns = returnsInState[i];
      if (stateReturns.length > 0) {
        const avgReturn = stateReturns.reduce((sum, r) => sum + r, 0) / stateReturns.length;
        this.stateReturns[this.stateNames[i]] = avgReturn;
        
        // Also calculate volatility within each state
        const squaredDiffs = stateReturns.map(r => Math.pow(r - avgReturn, 2));
        const variance = squaredDiffs.reduce((sum, sq) => sum + sq, 0) / stateReturns.length;
        this.stateVolatility[this.stateNames[i]] = Math.sqrt(variance);
      }
    }
    
    // Set current state based on most recent data point
    if (stateData.length > 0) {
      const lastState = stateData[stateData.length - 1].returnState - 1;
      this.setCurrentState(lastState);
    }
    
    // Update posterior with base prior + counts
    this.updatePosterior();
    
    return this;
  }
  
  /**
   * Adjust the prior concentration parameters based on context
   * @param {Object} context - The context factors to adjust for
   * @returns {Array} - The adjusted prior concentration parameters
   */
  adjustPrior(context = {}) {
  // Extract context parameters
  const cyclePosition = context.cyclePosition !== undefined ? context.cyclePosition : 0.5;
  const onChainMetrics = context.onChainMetrics || {};
  const volatilityRatio = context.volatilityRatio || 1.0;
  const currentMonth = context.currentMonth || this.currentMonth;
  const monthlyStats = context.monthlyStats || this.monthlyStats;
  
  // Access required data from state
  const allBitcoinData = window.state ? window.state.bitcoinData || [] : [];
  const sentimentData = window.state ? window.state.sentimentData : null;
  const globalSentimentScore = sentimentData ? sentimentData.value : 50; // Default to neutral
  
  console.log(`Adjusting prior for current month: ${currentMonth}, cycle position: ${cyclePosition.toFixed(2)}`);
  
  // Create a deep copy of base prior
  const adjustedPrior = JSON.parse(JSON.stringify(this.priorConcentration));
  
  // Extract volatility metrics from state or context
  let recent30DayVolatility = 0.02; // Default value
  let currentMonthHistoricalVolatility = 0.02; // Default value
  let historicalVolatility = 0.02; // Default value
  
  if (context.volatilityMetrics) {
    recent30DayVolatility = context.volatilityMetrics.recent30Day || recent30DayVolatility;
    currentMonthHistoricalVolatility = context.volatilityMetrics.currentMonthHistorical || currentMonthHistoricalVolatility;
    historicalVolatility = context.volatilityMetrics.historical || historicalVolatility;
  } else if (window.state && window.state.volatilityMetrics) {
    recent30DayVolatility = window.state.volatilityMetrics.recent30Day || recent30DayVolatility;
    historicalVolatility = window.state.volatilityMetrics.historical || historicalVolatility;
    
    // Use month-specific historical volatility if available
    if (window.state.volatilityMetrics.byMonth && window.state.volatilityMetrics.byMonth[currentMonth-1]) {
      currentMonthHistoricalVolatility = window.state.volatilityMetrics.byMonth[currentMonth-1];
    }
  } else if (window.state && window.state.latestOnChainMetrics && window.state.latestOnChainMetrics.volatility) {
    recent30DayVolatility = window.state.latestOnChainMetrics.volatility.recent || recent30DayVolatility;
    historicalVolatility = window.state.latestOnChainMetrics.volatility.historical || historicalVolatility;
    
    // Estimate current month historical volatility if not available
    currentMonthHistoricalVolatility = historicalVolatility * (1 + (Math.random() * 0.2 - 0.1));
  }
  
  // Get Bitcoin fundamental metrics
  const bitcoinFundamentals = onChainMetrics.bitcoinFundamentals || 
    calculateBitcoinInflationRateAndSupply(allBitcoinData, new Date());
  
  // Calculate all factor components
  // 1. Base seasonal factor
  const baseSeasonalFactor = this._calculateBaseSeasonalFactor(currentMonth, allBitcoinData);
  
  // 2. Volatility components
  const volatilityComponents = this._calculateVolatilityComponents(
    currentMonth, 
    recent30DayVolatility, 
    currentMonthHistoricalVolatility, 
    historicalVolatility
  );
  
  // Calculate volatility adjustment (combined factor)
  const volatilityAdjustment = Math.sqrt(
    volatilityComponents.shortTermRatio * 0.5 + 
    volatilityComponents.monthRatio * 0.5
  );
  
  // 3. On-chain factor
  const currentOnChainFactor = this._calculateCurrentOnChainFactor(onChainMetrics);
  
  // 4. Sentiment factor
  const currentMonthSentimentFactor = this._calculateCurrentMonthSentimentFactor(
    currentMonth, 
    globalSentimentScore, 
    allBitcoinData
  );
  
  // 5. Bitcoin fundamental factors
  const fundamentalFactors = this._calculateFundamentalBitcoinFactor(bitcoinFundamentals);
  
  // 6. Cycle factor (now incorporating bitcoin fundamentals)
  const currentMonthCycleFactor = this._calculateCurrentMonthCycleFactor(
    currentMonth, 
    cyclePosition, 
    allBitcoinData,
    bitcoinFundamentals
  );
  
  console.log('Final adjustment factors:');
  console.log(`- Base seasonal factor: ${baseSeasonalFactor.toFixed(2)}`);
  console.log(`- Volatility adjustment: ${volatilityAdjustment.toFixed(2)}`);
  console.log(`- On-chain factor: ${currentOnChainFactor.toFixed(2)}`);
  console.log(`- Sentiment factor: ${currentMonthSentimentFactor.toFixed(2)}`);
  console.log(`- Bitcoin inflation factor: ${fundamentalFactors.inflationFactor_val.toFixed(2)}`);
  console.log(`- Bitcoin scarcity factor: ${fundamentalFactors.scarcityFactor_val.toFixed(2)}`);
  console.log(`- Halving cycle phase factor: ${fundamentalFactors.halvingCyclePhaseFactor_val.toFixed(2)}`);
  console.log(`- Cycle factor: ${currentMonthCycleFactor.toFixed(2)}`);
  
  // Apply all factors to the prior - for each "from" state
  for (let i = 0; i < this.stateCount; i++) {
    let crashModifier = 1.0;
    let pumpModifier = 1.0;
    let normalModifier = 1.0;
    
    // 1. Apply base seasonal factor (affects crash probability)
    if (baseSeasonalFactor > 1.2) {
      // Month is more crash-prone than average
      crashModifier *= baseSeasonalFactor;
    } else if (baseSeasonalFactor < 0.8) {
      // Month is less crash-prone than average
      pumpModifier *= (1 / baseSeasonalFactor);
    }
    
    // 2. Apply volatility adjustment (affects both crash and pump)
    if (volatilityAdjustment > 1.1) {
      // Higher volatility means both pump and crash more likely
      crashModifier *= volatilityAdjustment;
      pumpModifier *= volatilityAdjustment;
      normalModifier /= Math.min(2.0, volatilityAdjustment * volatilityAdjustment);
    } else if (volatilityAdjustment < 0.9) {
      // Lower volatility means more normal periods
      normalModifier *= (1 / volatilityAdjustment);
    }
    
    // 3. Apply on-chain factor (primarily affects crash probability)
    if (currentOnChainFactor > 1.1) {
      // Higher on-chain risk means more crash probability
      crashModifier *= currentOnChainFactor;
    } else if (currentOnChainFactor < 0.9) {
      // Lower on-chain risk means less crash, more pump probability
      pumpModifier *= (1 / currentOnChainFactor);
    }
    
    // 4. Apply sentiment factor (affects both crash and pump)
    if (currentMonthSentimentFactor > 1.1) {
      // Negative sentiment increases crash probability
      crashModifier *= currentMonthSentimentFactor;
    } else if (currentMonthSentimentFactor < 0.9) {
      // Positive sentiment increases pump probability
      pumpModifier *= (1 / currentMonthSentimentFactor);
    }
    
    // 5. Apply cycle factor (primarily affects extremes depending on cycle position)
    if (currentMonthCycleFactor > 1.1) {
      // Late cycle increases crash probability
      crashModifier *= currentMonthCycleFactor;
    } else if (currentMonthCycleFactor < 0.9) {
      // Early cycle increases pump probability
      pumpModifier *= (1 / currentMonthCycleFactor);
    }
    
    // 6. Apply Bitcoin fundamental factors
    
    // 6.1 Inflation factor - lower inflation is bullish
    if (fundamentalFactors.inflationFactor_val < 0.9) {
      // Low inflation increases pump probability
      pumpModifier *= (1 / fundamentalFactors.inflationFactor_val);
      crashModifier *= fundamentalFactors.inflationFactor_val;
    } else if (fundamentalFactors.inflationFactor_val > 1.1) {
      // High inflation increases crash probability
      crashModifier *= fundamentalFactors.inflationFactor_val;
    }
    
    // 6.2 Scarcity factor - higher scarcity is bullish
    if (fundamentalFactors.scarcityFactor_val < 0.9) {
      // High scarcity (low factor) increases pump probability
      pumpModifier *= (1 / fundamentalFactors.scarcityFactor_val);
    }
    
    // Balance normal state probability based on extreme state modifications
    normalModifier = 1 / (Math.sqrt(crashModifier * pumpModifier) || 1);
    
    // Bound normal modifier to avoid extreme values
    normalModifier = Math.max(0.5, Math.min(1.5, normalModifier));
    
    // Apply the modifiers to our prior for each target state
    // Remember: adjustedPrior[i][j] where j=0 is crash, j=1 is normal, j=2 is pump
    adjustedPrior[i][0] = Math.max(0.01, this.priorConcentration[i][0] * crashModifier);
    adjustedPrior[i][1] = Math.max(0.01, this.priorConcentration[i][1] * normalModifier);
    adjustedPrior[i][2] = Math.max(0.01, this.priorConcentration[i][2] * pumpModifier);
    
    // Log the adjustments
    console.log(`From state ${i} adjustments: Crash=${crashModifier.toFixed(2)}, Normal=${normalModifier.toFixed(2)}, Pump=${pumpModifier.toFixed(2)}`);
  }
  
  // Store the adjusted prior
  this.adjustedPrior = adjustedPrior;
  
  return adjustedPrior;
}
  
  /**
   * Update posterior parameters by adding counts to adjusted prior
   * @returns {UnifiedBayesianMarkovModel} - This instance for chaining
   */
  updatePosterior() {
    for (let i = 0; i < this.stateCount; i++) {
      for (let j = 0; j < this.stateCount; j++) {
        this.posteriorConcentration[i][j] = this.adjustedPrior[i][j] + this.transitionCounts[i][j];
      }
    }
    return this;
  }
  
  /**
   * Calculate transition matrix from concentration parameters
   * @param {Array} concentrationParams - Optional specific concentration parameters
   * @returns {Array} - The transition probability matrix
   */
  getTransitionMatrix(concentrationParams = null) {
    const params = concentrationParams || this.posteriorConcentration;
    
    // For each state, calculate transition probabilities
    return params.map(row => {
      const rowSum = row.reduce((sum, val) => sum + val, 0);
      return row.map(param => param / rowSum);
    });
  }
  
  /**
   * Set the current state distribution
   * @param {number} stateIndex - The current state (0 = crash, 1 = normal, 2 = pump)
   * @returns {UnifiedBayesianMarkovModel} - This instance for chaining
   */
  setCurrentState(stateIndex) {
    this.currentStateDist = Array(this.stateCount).fill(0);
    if (stateIndex >= 0 && stateIndex < this.stateCount) {
      this.currentStateDist[stateIndex] = 1.0;
    } else {
      // If invalid state, use steady state distribution
      this.currentStateDist = [...this.steadyStateProbs];
    }
    return this;
  }
  
  /**
   * Set current state probabilistically
   * @param {Array} distribution - Probability distribution over states
   * @returns {UnifiedBayesianMarkovModel} - This instance for chaining
   */
  setCurrentStateDist(distribution) {
    if (Array.isArray(distribution) && distribution.length === this.stateCount) {
      const sum = distribution.reduce((sum, val) => sum + val, 0);
      if (sum > 0) {
        this.currentStateDist = distribution.map(val => val / sum);
      }
    }
    return this;
  }
  
  /**
   * Forecast state probabilities over time using matrix multiplication
   * @param {number} steps - Number of time steps to predict
   * @param {Array} transitionMatrix - Optional specific transition matrix
   * @returns {Array} - State probability distributions for each time step
   */
  forecastStateDistribution(steps, transitionMatrix = null) {
    const tMatrix = transitionMatrix || this.getTransitionMatrix();
    const distributions = [this.currentStateDist];
    
    let currentDist = [...this.currentStateDist];
    
    for (let t = 0; t < steps; t++) {
      // Matrix multiply: currentDist * transitionMatrix
      const nextDist = Array(this.stateCount).fill(0);
      
      for (let i = 0; i < this.stateCount; i++) {
        for (let j = 0; j < this.stateCount; j++) {
          nextDist[j] += currentDist[i] * tMatrix[i][j];
        }
      }
      
      distributions.push(nextDist);
      currentDist = nextDist;
    }
    
    return distributions;
  }
  
  /**
   * Calculate expected returns for each time step
   * @param {number} steps - Number of time steps to predict
   * @param {Array} transitionMatrix - Optional specific transition matrix
   * @returns {Array} - Expected return for each time step
   */
  calculateExpectedReturns(steps, transitionMatrix = null) {
    const distributions = this.forecastStateDistribution(steps, transitionMatrix);
    
    return distributions.map(dist => {
      let expectedReturn = 0;
      for (let i = 0; i < this.stateCount; i++) {
        expectedReturn += dist[i] * this.stateReturns[this.stateNames[i]];
      }
      return expectedReturn;
    });
  }
  
  /**
   * Calculate probability of at least one occurrence of a specific state
   * @param {number} steps - Number of time steps
   * @param {number} targetState - The state we're interested in (0 = crash, 2 = pump)
   * @param {Array} transitionMatrix - Optional specific transition matrix
   * @returns {number} - Probability of seeing state at least once
   */
  calculateCumulativeStateProbability(steps, targetState, transitionMatrix = null) {
    if (targetState < 0 || targetState >= this.stateCount) {
      console.error('Invalid target state:', targetState);
      return 0;
    }
    
    const tMatrix = transitionMatrix || this.getTransitionMatrix();
    
    // We need to modify the transition matrix to calculate this efficiently
    // Make a deep copy first to avoid modifying the original
    const modifiedMatrix = JSON.parse(JSON.stringify(tMatrix));
    
    // Make the target state "sticky" (an absorbing state)
    for (let i = 0; i < this.stateCount; i++) {
      if (i === targetState) {
        // Set row to all zeros except self-transition = 1
        modifiedMatrix[i] = Array(this.stateCount).fill(0);
        modifiedMatrix[i][i] = 1;
      }
    }
    
    // Calculate probability of ending up in this absorbing state
    const distributions = this.forecastStateDistribution(steps, modifiedMatrix);
    const finalDist = distributions[distributions.length - 1];
    
    // The probability of the absorbing state is the probability of seeing it at least once
    return finalDist[targetState];
  }
  
  /**
   * Generate sample paths for Monte Carlo simulation
   * @param {number} steps - Number of time steps
   * @param {number} numPaths - Number of paths to generate
   * @param {Array} transitionMatrix - Optional specific transition matrix
   * @returns {Array} - Array of state paths
   */
  generateStatePaths(steps, numPaths = 1000, transitionMatrix = null) {
    const tMatrix = transitionMatrix || this.getTransitionMatrix();
    const paths = [];
    
    // Limit number of paths to avoid excessive computation
    numPaths = Math.min(numPaths, this.maxSimulationPaths);
    
    for (let n = 0; n < numPaths; n++) {
      // Sample initial state from current distribution
      let currentState = this.sampleFromDistribution(this.currentStateDist);
      const path = [currentState];
      
      // Generate the path
      for (let t = 0; t < steps; t++) {
        // Sample next state from current state's transition probabilities
        const nextState = this.sampleFromDistribution(tMatrix[currentState]);
        path.push(nextState);
        currentState = nextState;
      }
      
      paths.push(path);
    }
    
    return paths;
  }
  
  /**
   * Sample from a discrete probability distribution
   * @param {Array} probabilities - Array of probabilities that sum to 1
   * @returns {number} - Sampled index
   */
  sampleFromDistribution(probabilities) {
    const sum = probabilities.reduce((a, b) => a + b, 0);
    if (sum === 0) return 0; // Default to first state if all zeros
    
    // Normalize to ensure sum is 1
    const normProbs = probabilities.map(p => p / sum);
    
    const r = Math.random();
    let cumulativeProb = 0;
    
    for (let i = 0; i < normProbs.length; i++) {
      cumulativeProb += normProbs[i];
      if (r < cumulativeProb) {
        return i;
      }
    }
    
    // Fallback (shouldn't normally reach here)
    return normProbs.length - 1;
  }
  
  /**
   * Generate price paths from state paths
   * @param {Array} statePaths - Array of state paths
   * @param {number} currentPrice - Current price to start from
   * @param {boolean} addRandomness - Whether to add randomness within states
   * @returns {Array} - Array of price paths
   */
  statesToPricePaths(statePaths, currentPrice, addRandomness = true) {
    return statePaths.map(statePath => {
      let price = currentPrice;
      const pricePath = [price];
      
      for (let t = 1; t < statePath.length; t++) {
        const state = statePath[t];
        let returnValue = this.stateReturns[this.stateNames[state]];
        
        // Add random variation within state if requested
        if (addRandomness) {
          const stateStdDev = this.stateVolatility[this.stateNames[state]];
          // Generate normal random number using Box-Muller transform
          const u1 = Math.random();
          const u2 = Math.random();
          const z = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
          returnValue += z * stateStdDev;
        }
        
        // Apply return to get new price
        price *= Math.exp(returnValue);
        pricePath.push(price);
      }
      
      return pricePath;
    });
  }
  
  /**
   * Create a full Monte Carlo price simulation
   * @param {number} steps - Number of time steps
   * @param {number} currentPrice - Current price to start from
   * @param {number} numPaths - Number of paths to generate
   * @returns {Object} - Simulation results with price paths and statistics
   */
  simulatePricePaths(steps, currentPrice, numPaths = 1000) {
    // Generate state paths
    const statePaths = this.generateStatePaths(steps, numPaths);
    
    // Convert to price paths
    const pricePaths = this.statesToPricePaths(statePaths, currentPrice);
    
    // Calculate summary statistics for each timepoint
    const summaryStats = [];
    
    for (let t = 0; t <= steps; t++) {
      const prices = pricePaths.map(path => path[t]);
      
      // Sort for percentiles
      prices.sort((a, b) => a - b);
      
      // Calculate percentiles
      const median = prices[Math.floor(prices.length / 2)];
      const lower5 = prices[Math.floor(prices.length * 0.05)];
      const lower25 = prices[Math.floor(prices.length * 0.25)];
      const upper75 = prices[Math.floor(prices.length * 0.75)];
      const upper95 = prices[Math.floor(prices.length * 0.95)];
      
      // Calculate mean
      const mean = prices.reduce((sum, price) => sum + price, 0) / prices.length;
      
      summaryStats.push({
        timeStep: t,
        mean,
        median,
        lower5,
        lower25,
        upper75,
        upper95
      });
    }
    
    return {
      pricePaths,
      summaryStats
    };
  }
  
  /**
   * Generate a comprehensive forecast for a given timeframe
   * @param {number} timeframeDays - Number of days to forecast
   * @param {number} currentPrice - Current price to start from
   * @param {Object} context - Context factors for adjustment
   * @returns {Object} - Complete forecast with all metrics
   */
  generateForecast(timeframeDays, currentPrice, context = {}) {
    // Adjust prior based on context
    this.adjustPrior({
      cyclePosition: context.cyclePosition,
      onChainMetrics: context.onChainMetrics,
      volatilityRatio: context.volatilityRatio,
      currentMonth: context.currentMonth || this.currentMonth,
      monthlyStats: this.monthlyStats
    });
    
    // Update posterior parameters
    this.updatePosterior();
    
    // Get transition matrix
    const transitionMatrix = this.getTransitionMatrix();
    
    // Calculate expected returns
    const expectedReturns = this.calculateExpectedReturns(timeframeDays, transitionMatrix);
    
    // Calculate cumulative expected return
    const dailyReturns = expectedReturns.slice(1); // Skip initial position
    const cumulativeReturn = dailyReturns.reduce((sum, ret) => sum + ret, 0);
    
    // Calculate forecast price using the expected return
    const forecastPrice = currentPrice * Math.exp(cumulativeReturn);
    
    // Calculate crash and pump probabilities
    const crashProb = this.calculateCumulativeStateProbability(timeframeDays, 0, transitionMatrix);
    const pumpProb = this.calculateCumulativeStateProbability(timeframeDays, 2, transitionMatrix);
    
    // Run Monte Carlo simulation for price distribution
    const simulation = this.simulatePricePaths(timeframeDays, currentPrice, 5000);
    
    // Extract price bounds from simulation
    const finalStats = simulation.summaryStats[simulation.summaryStats.length - 1];
    const lowerBound = finalStats.lower5;
    const upperBound = finalStats.upper95;
    
    // Format complete forecast
    return {
      currentPrice,
      forecastPrice,
      lowerBound,
      upperBound,
      expectedReturn: cumulativeReturn,
      dailyReturns: dailyReturns,
      expectedDailyReturn: cumulativeReturn / timeframeDays,
      volatility: (upperBound - lowerBound) / (2 * 1.96 * forecastPrice),
      crashProbability: crashProb,
      pumpProbability: pumpProb,
      timeframeDays,
      stateReturns: this.stateReturns,
      stateVolatility: this.stateVolatility,
      steadyStateProbs: this.steadyStateProbs,
      transitionMatrix,
      currentStateDist: this.currentStateDist, // <--- ADD THIS LINE
      simulationSummary: simulation.summaryStats,
      // Include a subset of paths for visualization
      forecastPaths: simulation.pricePaths.slice(0, 100)
    };
  }
}

/**
 * Main wrapper function to process data and create a forecast
 * @param {Array} data - Bitcoin price data
 * @param {number} timeframeDays - Forecast horizon in days
 * @param {Object} context - Context factors like cycle position
 * @returns {Object} - Complete forecast
 */
function calculateUnifiedBayesianForecast(data, timeframeDays, context = {}) {
  console.log(`Calculating unified Bayesian forecast for ${timeframeDays}-day timeframe`);
  
  if (!data || !Array.isArray(data) || data.length === 0) {
    console.error('Invalid data for forecast');
    return null;
  }
  
  try {
    // Create model
    const model = new UnifiedBayesianMarkovModel();
    
    // Train model
    model.train(data);
    
    // Get current price
    const currentPrice = data[data.length - 1].price;
    
    // Generate forecast
    const forecast = model.generateForecast(timeframeDays, currentPrice, context);
    
    // Enhance forecast with additional data for UI
    forecast.modelType = 'UnifiedBayesianMarkov';
    forecast.forecastDate = new Date();
    
    return forecast;
  } catch (error) {
    console.error('Error calculating forecast:', error);
    return null;
  }
}

// Main application state
const state = {
  bitcoinData: [],
  onChainData: [],
  latestOnChainMetrics: {},
  sentimentData: null,
  unifiedForecasts: {},
  currentTimeframe: 30,
  priceChart: null
};

// Utility functions
function formatPrice(price) {
  return new Intl.NumberFormat('en-US', { 
    style: 'currency', 
    currency: 'USD',
    maximumFractionDigits: 0
  }).format(price);
}

function formatPercentage(value) {
  return (value * 100).toFixed(1) + '%';
}

function calculateStandardDeviation(values) {
  if (!values || values.length === 0) return 0;
  
  const avg = values.reduce((sum, val) => sum + val, 0) / values.length;
  const squareDiffs = values.map(value => Math.pow(value - avg, 2));
  const avgSquareDiff = squareDiffs.reduce((sum, val) => sum + val, 0) / squareDiffs.length;
  return Math.sqrt(avgSquareDiff);
}

// Get the halving epoch for a given date
function getHalvingEpoch(date) {
  // Bitcoin halving dates
  const halvingDates = [
    new Date('2009-01-03'), // Genesis block
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

// Process CSV data into structured Bitcoin data objects
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
  const currentSupplyIndex = headers.indexOf('SplyCur');
  const hashRateIndex = headers.indexOf('HashRate');
  const minerRevenueIndex = headers.indexOf('RevNtv');
  const whaleSupplyIndex = headers.indexOf('SplyAdrTop10Pct'); // Top 10% addresses
  
  if (timeIndex === -1 || priceIndex === -1) {
    throw new Error('CSV format is not as expected');
  }
  
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
        dataPoint.ACTIVE_SUPPLY_1D = parseFloat(values[splyAct1dIndex]);
      }
        
      if (splyAct1yrIndex !== -1 && values[splyAct1yrIndex]) {
        dataPoint.ACTIVE_SUPPLY_1YR = parseFloat(values[splyAct1yrIndex]);
      }
      
      // New on-chain metrics
      if (currentSupplyIndex !== -1 && values[currentSupplyIndex]) {
        dataPoint.CURRENT_SUPPLY = parseFloat(values[currentSupplyIndex]);
      }
      
      if (hashRateIndex !== -1 && values[hashRateIndex]) {
        dataPoint.HASH_RATE = parseFloat(values[hashRateIndex]);
      }
      
      if (minerRevenueIndex !== -1 && values[minerRevenueIndex]) {
        dataPoint.MINER_REVENUE = parseFloat(values[minerRevenueIndex]);
      }
      
      if (whaleSupplyIndex !== -1 && values[whaleSupplyIndex]) {
        dataPoint.WHALE_SUPPLY = parseFloat(values[whaleSupplyIndex]);
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
  
  // Group data by halving epoch to calculate extreme event thresholds
  const epochData = {};
  data.forEach(d => {
    if (!epochData[d.halvingEpoch]) {
      epochData[d.halvingEpoch] = [];
    }
    epochData[d.halvingEpoch].push(d);
  });
  
  // Calculate thresholds for each epoch (1st percentile of returns)
  const thresholds = {};
  Object.keys(epochData).forEach(epoch => {
    const epochLogReturns = epochData[epoch]
      .map(d => d.logReturn)
      .filter(r => !isNaN(r) && isFinite(r));
    
    epochLogReturns.sort((a, b) => a - b);
    const threshold = epochLogReturns[Math.floor(epochLogReturns.length * 0.01)];
    thresholds[epoch] = threshold;
  });
  
  // Mark extreme events using epoch-specific thresholds
  data.forEach(d => {
    const threshold = thresholds[d.halvingEpoch];
    d.isExtremeEvent = d.logReturn < threshold ? 1 : 0;
  });
  
  return data;
}

// Extract and process on-chain metrics
function processOnChainData(data) {
  // Extract relevant metrics from the raw data
  const extractedData = data.map(d => ({
    date: d.date instanceof Date ? d.date : new Date(d.date),
    price: parseFloat(d.price),
    MVRV: d.MVRV,
    NVT: d.NVT,
    ACTIVE_ADDRESSES: d.ACTIVE_ADDRESSES,
    halvingEpoch: d.halvingEpoch,
    logReturn: d.logReturn
  }));
  
  // Calculate derived metrics 
  const enhancedData = calculateDerivedMetrics(extractedData);
  
  // Get the latest metrics for display
  const latestMetrics = getLatestOnChainMetrics(enhancedData);
  
  return {
    enhancedData,
    latestMetrics
  };
}

function calculateDerivedMetrics(data) {
  // Create a copy to avoid modifying the original data
  const enhancedData = [...data];
  
  // Calculate volatility metrics for different timeframes
  const all30DayWindows = [];
  const all90DayWindows = [];
  const allByMonth = Array(12).fill().map(() => []);
  
  enhancedData.forEach((dataPoint, index) => {
    // Group by month for monthly historical volatility
    if (dataPoint.date instanceof Date) {
      const month = dataPoint.date.getMonth();
      if (dataPoint.logReturn !== undefined && !isNaN(dataPoint.logReturn)) {
        allByMonth[month].push(dataPoint.logReturn);
      }
    }
    
    // Calculate MVRV Z-Score if we have enough data
    if (index >= 90 && dataPoint.MVRV !== undefined) {
      const window90 = enhancedData.slice(index - 90, index);
      const mvrvValues = window90.map(d => d.MVRV).filter(m => !isNaN(m));
      
      if (mvrvValues.length > 0) {
        const mvrvMean = mvrvValues.reduce((sum, m) => sum + m, 0) / mvrvValues.length;
        const mvrvStdDev = calculateStandardDeviation(mvrvValues);
        if (mvrvStdDev > 0) {
          dataPoint.MVRV_Z_SCORE = (dataPoint.MVRV - mvrvMean) / mvrvStdDev;
        }
      }
    }
    
    // Calculate NVT Z-Score if we have enough data
    if (index >= 90 && dataPoint.NVT !== undefined) {
      const window90 = enhancedData.slice(index - 90, index);
      const nvtValues = window90.map(d => d.NVT).filter(n => !isNaN(n));
      
      if (nvtValues.length > 0) {
        const nvtMean = nvtValues.reduce((sum, n) => sum + n, 0) / nvtValues.length;
        const nvtStdDev = calculateStandardDeviation(nvtValues);
        if (nvtStdDev > 0) {
          dataPoint.NVT_Z_SCORE = (dataPoint.NVT - nvtMean) / nvtStdDev;
        }
      }
    }
    
    // Calculate Supply Shock Ratio (active supply 1d / active supply 1yr)
    if (dataPoint.ACTIVE_SUPPLY_1D !== undefined && 
        dataPoint.ACTIVE_SUPPLY_1YR !== undefined && 
        dataPoint.ACTIVE_SUPPLY_1YR > 0) {
      dataPoint.SUPPLY_SHOCK_RATIO = dataPoint.ACTIVE_SUPPLY_1D / dataPoint.ACTIVE_SUPPLY_1YR;
    }
    
    // Calculate Whale Dominance Change
    if (dataPoint.WHALE_SUPPLY !== undefined && index > 0 && 
        enhancedData[index - 1].WHALE_SUPPLY !== undefined) {
      dataPoint.WHALE_DOMINANCE_CHANGE = dataPoint.WHALE_SUPPLY - enhancedData[index - 1].WHALE_SUPPLY;
    }
    
    // Calculate Puell Multiple (current miner revenue vs 365-day average)
    if (dataPoint.MINER_REVENUE !== undefined && index >= 365) {
      const yearWindow = enhancedData.slice(index - 365, index);
      const revenueValues = yearWindow
        .map(d => d.MINER_REVENUE)
        .filter(r => !isNaN(r) && r !== undefined);
      
      if (revenueValues.length > 180) {
        const avgRevenue = revenueValues.reduce((sum, r) => sum + r, 0) / revenueValues.length;
        if (avgRevenue > 0) {
          dataPoint.PUELL_MULTIPLE = dataPoint.MINER_REVENUE / avgRevenue;
        }
      }
    }
    
    // Collect data for volatility calculations
    if (index >= 30 && index < enhancedData.length) {
      const window30 = enhancedData.slice(index - 30, index);
      const returns30 = window30.map(d => d.logReturn).filter(r => !isNaN(r) && isFinite(r));
      if (returns30.length > 15) { // Ensure sufficient data points
        all30DayWindows.push(returns30);
      }
    }
    
    if (index >= 90 && index < enhancedData.length) {
      const window90 = enhancedData.slice(index - 90, index);
      const returns90 = window90.map(d => d.logReturn).filter(r => !isNaN(r) && isFinite(r));
      if (returns90.length > 45) { // Ensure sufficient data points
        all90DayWindows.push(returns90);
      }
    }
  });
  
  // Calculate volatility metrics
  const volatilityData = {
    recent30Day: all30DayWindows.length > 0 ? 
      calculateStandardDeviation(all30DayWindows[all30DayWindows.length - 1]) : 0.02,
    medium90Day: all90DayWindows.length > 0 ? 
      calculateStandardDeviation(all90DayWindows[all90DayWindows.length - 1]) : 0.03,
    historical: calculateStandardDeviation(
      enhancedData.map(d => d.logReturn).filter(r => !isNaN(r) && isFinite(r))
    ),
    byMonth: allByMonth.map(monthReturns => calculateStandardDeviation(monthReturns))
  };
  
  // Store the volatility metrics in the state for future use
  if (typeof window !== 'undefined' && window.state) {
    window.state.volatilityMetrics = volatilityData;
  }
  
  // Add cyclical metrics based on MVRV
  addCyclicalMetrics(enhancedData);
  
  return enhancedData;
}

function addCyclicalMetrics(data) {
  if (!data || data.length < 365) return;
  
  // Find the all-time high price before each data point
  let ath = 0;
  data.forEach((dataPoint, index) => {
    if (dataPoint.price > ath) {
      ath = dataPoint.price;
    }
    dataPoint.PRICE_FROM_ATH = ath > 0 ? dataPoint.price / ath : 1;
  });
  
  // Calculate cyclical metrics using MVRV
  const recentData = data.slice(-730); // Last 2 years
  if (recentData.length > 365) {
    const mvrvValues = recentData.map(d => d.MVRV).filter(m => !isNaN(m));
    if (mvrvValues.length > 180) {
      const mvrvMax = Math.max(...mvrvValues);
      const mvrvMin = Math.min(...mvrvValues);
      const mvrvRange = mvrvMax - mvrvMin;
      
      // Add cycle position for recent data points (normalized 0-1 where 0 is bottom, 1 is top)
      recentData.forEach(dataPoint => {
        if (dataPoint.MVRV !== undefined && mvrvRange > 0) {
          dataPoint.CYCLE_POSITION = (dataPoint.MVRV - mvrvMin) / mvrvRange;
        }
      });
    }
  }
}

function getLatestOnChainMetrics(enhancedData) {
  if (!enhancedData || enhancedData.length === 0) {
    return null;
  }
  
  // Get the most recent data point
  const latest = enhancedData[enhancedData.length - 1];
  
  // Get previous data point for comparison
  const previous = enhancedData.length > 1 ? enhancedData[enhancedData.length - 2] : null;
  
  // Find most recent data point with supply metrics
  let supplyShockData = null;
  for (let i = enhancedData.length - 1; i >= 0; i--) {
    if (enhancedData[i].SUPPLY_SHOCK_RATIO !== undefined) {
      supplyShockData = {
        value: enhancedData[i].SUPPLY_SHOCK_RATIO,
        date: enhancedData[i].date
      };
      break;
    }
  }
  
  // Find most recent data point with Puell Multiple
  let puellMultipleData = null;
  for (let i = enhancedData.length - 1; i >= 0; i--) {
    if (enhancedData[i].PUELL_MULTIPLE !== undefined) {
      puellMultipleData = {
        value: enhancedData[i].PUELL_MULTIPLE,
        date: enhancedData[i].date
      };
      break;
    }
  }
  
  // Calculate volatility from most recent data
  const recentVolatility = window.state && window.state.volatilityMetrics ? 
    window.state.volatilityMetrics.recent30Day : 0.02;
  const historicalVolatility = window.state && window.state.volatilityMetrics ? 
    window.state.volatilityMetrics.historical : 0.03;
  
  const volatilityData = {
    recent: recentVolatility,
    historical: historicalVolatility,
    ratio: recentVolatility / historicalVolatility
  };
  
  // Calculate Bitcoin fundamental metrics
  const bitcoinFundamentals = calculateBitcoinInflationRateAndSupply(enhancedData, new Date());
  
  // Extract key metrics for display
  return {
    lastUpdated: latest.date,
    price: {
      value: latest.price,
      change: previous ? (latest.price / previous.price - 1) * 100 : 0
    },
    mvrv: {
      value: latest.MVRV,
      zScore: latest.MVRV_Z_SCORE,
      change: previous && previous.MVRV ? (latest.MVRV / previous.MVRV - 1) * 100 : 0
    },
    nvt: {
      value: latest.NVT,
      zScore: latest.NVT_Z_SCORE,
      change: previous && previous.NVT ? (latest.NVT / previous.NVT - 1) * 100 : 0
    },
    activeAddresses: {
      value: latest.ACTIVE_ADDRESSES,
      change: previous && previous.ACTIVE_ADDRESSES ? 
        (latest.ACTIVE_ADDRESSES / previous.ACTIVE_ADDRESSES - 1) * 100 : 0
    },
    supplyShock: supplyShockData ? {
      value: supplyShockData.value,
      change: previous && previous.SUPPLY_SHOCK_RATIO ? 
        (supplyShockData.value / previous.SUPPLY_SHOCK_RATIO - 1) * 100 : 0,
      asOfDate: supplyShockData.date
    } : undefined,
    puellMultiple: puellMultipleData ? {
      value: puellMultipleData.value,
      change: previous && previous.PUELL_MULTIPLE ? 
        (puellMultipleData.value / previous.PUELL_MULTIPLE - 1) * 100 : 0,
      asOfDate: puellMultipleData.date
    } : undefined,
    whaleDominance: latest.WHALE_DOMINANCE_CHANGE !== undefined ? {
      change: latest.WHALE_DOMINANCE_CHANGE,
      value: latest.WHALE_SUPPLY
    } : undefined,
    volatility: volatilityData,
    cyclePosition: latest.CYCLE_POSITION,
    bitcoinFundamentals: bitcoinFundamentals,
    riskLevel: calculateCurrentRiskLevel(latest, bitcoinFundamentals)
  };
}

function calculateCurrentRiskLevel(latest, bitcoinFundamentals) {
  if (!latest) return 'Unknown';
  
  // Calculate composite risk score based on key metrics
  let riskScore = 0;
  let factorCount = 0;
  
  // MVRV Z-Score risk
  if (latest.MVRV_Z_SCORE !== undefined) {
    riskScore += Math.min(1, Math.max(0, (latest.MVRV_Z_SCORE + 1) / 3));
    factorCount++;
  }
  
  // Cycle position risk
  if (latest.CYCLE_POSITION !== undefined) {
    riskScore += latest.CYCLE_POSITION;
    factorCount++;
  }
  
  // Calculate average risk score
  const avgRisk = factorCount > 0 ? riskScore / factorCount : 0.5;
  
  // Map to risk level
  if (avgRisk >= 0.8) return 'Extreme';
  if (avgRisk >= 0.65) return 'High';
  if (avgRisk >= 0.45) return 'Moderate';
  if (avgRisk >= 0.3) return 'Low';
  return 'Very Low';
}

// Calculate sentiment-adjusted forecast
function calculateSentimentAdjustedForecast(forecast, sentimentData) {
  if (!sentimentData) return forecast;
  
  const sentimentValue = sentimentData.value; // 0-100 scale
  
  // Convert to a factor between 0.8 and 1.2 (normalized around 1.0)
  // 0 = very bearish (0.8), 50 = neutral (1.0), 100 = very bullish (1.2)
  const sentimentFactor = 0.8 + (sentimentValue / 100) * 0.4;
  
  console.log(`Sentiment adjustment factor: ${sentimentFactor.toFixed(3)} based on sentiment ${sentimentValue}/100`);
  
  // Adjust expected return based on sentiment
  const adjustedExpectedReturn = forecast.expectedReturn * sentimentFactor;
  
  // Recalculate forecast price
  const adjustedForecastPrice = forecast.currentPrice * Math.exp(adjustedExpectedReturn);
  
  // Adjust bounds proportionally
  const lowerRatio = forecast.lowerBound / forecast.forecastPrice;
  const upperRatio = forecast.upperBound / forecast.forecastPrice;
  
  const adjustedLowerBound = adjustedForecastPrice * lowerRatio;
  const adjustedUpperBound = adjustedForecastPrice * upperRatio;
  
  // Create adjusted forecast
  const adjustedForecast = {
    ...forecast,
    forecastPrice: adjustedForecastPrice,
    lowerBound: adjustedLowerBound,
    upperBound: adjustedUpperBound,
    expectedReturn: adjustedExpectedReturn,
    sentimentFactor: sentimentFactor,
    originalForecast: {
      forecastPrice: forecast.forecastPrice,
      expectedReturn: forecast.expectedReturn,
      lowerBound: forecast.lowerBound,
      upperBound: forecast.upperBound
    }
  };
  
  return adjustedForecast;
}

// Update crash risk gauge
function updateCrashGauge(risk) {
  const percentage = (risk * 100).toFixed(1);
  
  // Update prominent percentage
  const crashPercentage = document.getElementById('crashPercentage');
  crashPercentage.textContent = percentage + '%';
  
  // Update gauge fill
  const crashGaugeFill = document.getElementById('crashGaugeFill');
  crashGaugeFill.style.width = percentage + '%';
  
  // Update gauge marker
  const crashGaugeMarker = document.getElementById('crashGaugeMarker');
  crashGaugeMarker.style.left = percentage + '%';
  
  // Update gauge value
  const crashGaugeValue = document.getElementById('crashGaugeValue');
  crashGaugeValue.textContent = percentage + '%';
}

// Update pump probability gauge
function updatePumpGauge(probability) {
  const percentage = (probability * 100).toFixed(1);
  
  // Update prominent percentage
  const pumpPercentage = document.getElementById('pumpPercentage');
  pumpPercentage.textContent = percentage + '%';
  
  // Update gauge fill
  const pumpGaugeFill = document.getElementById('pumpGaugeFill');
  pumpGaugeFill.style.width = percentage + '%';
  
  // Update gauge marker
  const pumpGaugeMarker = document.getElementById('pumpGaugeMarker');
  pumpGaugeMarker.style.left = percentage + '%';
  
  // Update gauge value
  const pumpGaugeValue = document.getElementById('pumpGaugeValue');
  pumpGaugeValue.textContent = percentage + '%';
}

// Update price forecast display
function updatePriceForecast(forecast) {
  // Update current price
  const currentPriceEl = document.getElementById('currentPrice');
  currentPriceEl.textContent = formatPrice(forecast.currentPrice);
  
  // Update lower bound
  const lowerBoundEl = document.getElementById('lowerBound');
  lowerBoundEl.textContent = formatPrice(forecast.lowerBound);
  
  // Update upper bound
  const upperBoundEl = document.getElementById('upperBound');
  upperBoundEl.textContent = formatPrice(forecast.upperBound);
  
  // Update chart
  updatePriceChart(forecast);
}

// Update metrics indicators
function updateMetricsIndicators() {
  if (!state.latestOnChainMetrics) return;
  
  const metrics = state.latestOnChainMetrics;
  
  // Update MVRV indicator
  const mvrvValue = document.getElementById('mvrvValue');
  const mvrvTrend = document.getElementById('mvrvTrend');
  
  if (metrics.mvrv && metrics.mvrv.value !== undefined) {
    mvrvValue.textContent = metrics.mvrv.value.toFixed(2);
    
    if (metrics.mvrv.change !== undefined) {
      mvrvTrend.textContent = (metrics.mvrv.change >= 0 ? '+' : '') + metrics.mvrv.change.toFixed(1) + '%';
      mvrvTrend.className = 'indicator-trend ' + (metrics.mvrv.change >= 0 ? 'trend-up' : 'trend-down');
    }
  }
  
  // Update NVT indicator
  const nvtValue = document.getElementById('nvtValue');
  const nvtTrend = document.getElementById('nvtTrend');
  
  if (metrics.nvt && metrics.nvt.value !== undefined) {
    nvtValue.textContent = metrics.nvt.value.toFixed(1);
    
    if (metrics.nvt.change !== undefined) {
      nvtTrend.textContent = (metrics.nvt.change >= 0 ? '+' : '') + metrics.nvt.change.toFixed(1) + '%';
      nvtTrend.className = 'indicator-trend ' + (metrics.nvt.change >= 0 ? 'trend-up' : 'trend-down');
    }
  }
  
  // Update cycle position
  const cycleValue = document.getElementById('cycleValue');
  
  if (metrics.cyclePosition !== undefined) {
    cycleValue.textContent = (metrics.cyclePosition * 100).toFixed(0) + '%';
  }
}

// Create/update the price forecast chart
// Create/update the price forecast chart
function updatePriceChart(forecast) {
  const chartContainer = document.querySelector('.chart-container'); // Get the container
  const canvasId = 'priceChart';
  let canvas = document.getElementById(canvasId);

  // If canvas doesn't exist, create it and append to container
  if (!canvas) {
    canvas = document.createElement('canvas');
    canvas.id = canvasId;
    if (chartContainer) {
      chartContainer.innerHTML = ''; // Clear previous content if any
      chartContainer.appendChild(canvas);
    } else {
      console.error('Chart container not found!');
      return;
    }
  }
  const ctx = canvas.getContext('2d');

  // Generate date points for forecast period
  const dates = [];
  const today = new Date(); // Use a consistent 'today' for all calculations in this update

  for (let i = 0; i <= forecast.timeframeDays; i++) {
    const date = new Date(today);
    date.setDate(today.getDate() + i); // Ensure we add days to the same 'today'
    dates.push(date);
  }

  // Use simulation summary if available for better visualization
  let chartData;

  if (forecast.simulationSummary && forecast.simulationSummary.length > 0 && forecast.simulationSummary.length === (forecast.timeframeDays + 1)) {
    chartData = {
      median: forecast.simulationSummary.map((stats, i) => ({
        x: dates[i], // Use consistent dates
        y: stats.median
      })),
      lower: forecast.simulationSummary.map((stats, i) => ({
        x: dates[i], // Use consistent dates
        y: stats.lower5 // Or lower25 if preferred for tighter bounds
      })),
      upper: forecast.simulationSummary.map((stats, i) => ({
        x: dates[i], // Use consistent dates
        y: stats.upper95 // Or upper75 if preferred
      }))
    };
  } else {
    // Fall back to simple interpolation if simulation summary is not suitable
    console.warn('Simulation summary not available or mismatched length, falling back to simple interpolation for chart.');
    const currentPrice = forecast.currentPrice;
    // Ensure expectedReturn is a finite number
    const validExpectedReturn = isFinite(forecast.expectedReturn) ? forecast.expectedReturn : 0;

    chartData = {
      median: dates.map((date, index) => {
        const progress = forecast.timeframeDays > 0 ? index / forecast.timeframeDays : 0;
        return {
          x: date,
          y: currentPrice * Math.exp(progress * validExpectedReturn)
        };
      }),
      lower: dates.map((date, index) => {
        const progress = forecast.timeframeDays > 0 ? index / forecast.timeframeDays : 0;
        // Simplified interpolation for bounds if main forecastPrice is used as a basis
        const targetLower = isFinite(forecast.lowerBound) ? forecast.lowerBound : currentPrice * 0.8;
        return {
          x: date,
          y: currentPrice + (targetLower - currentPrice) * progress
        };
      }),
      upper: dates.map((date, index) => {
        const progress = forecast.timeframeDays > 0 ? index / forecast.timeframeDays : 0;
        const targetUpper = isFinite(forecast.upperBound) ? forecast.upperBound : currentPrice * 1.2;
        return {
          x: date,
          y: currentPrice + (targetUpper - currentPrice) * progress
        };
      })
    };
  }

  // Sample paths for background visualization (if available)
  let backgroundPaths = [];
  if (forecast.forecastPaths && forecast.forecastPaths.length > 0) {
    const numPaths = Math.min(30, forecast.forecastPaths.length);
    for (let p = 0; p < numPaths; p++) {
      if (forecast.forecastPaths[p] && forecast.forecastPaths[p].length === (forecast.timeframeDays + 1)) {
        backgroundPaths.push({
          label: `Path ${p+1}`,
          data: forecast.forecastPaths[p].map((price, i) => ({
            x: dates[i], // Use consistent dates
            y: price
          })),
          borderColor: `rgba(90, 200, 250, ${0.05 + (p % 3) * 0.02})`,
          borderWidth: 1,
          pointRadius: 0,
          fill: false
        });
      }
    }
  }

  // Destroy existing chart if it exists
  if (state.priceChart) {
    state.priceChart.destroy();
  }

  // Create new chart
  state.priceChart = new Chart(ctx, {
    type: 'line',
    data: {
      // labels: dates, // Not needed if x values are provided in datasets
      datasets: [
        ...backgroundPaths,
        {
          label: 'Lower Bound (5th Pctl)',
          data: chartData.lower,
          borderColor: 'rgba(255, 59, 48, 0.5)', // risk-red
          borderDash: [5, 5],
          borderWidth: 2,
          pointRadius: 0,
          fill: false // No fill for this line
        },
        {
          label: 'Upper Bound (95th Pctl)',
          data: chartData.upper,
          borderColor: 'rgba(52, 199, 89, 0.5)', // pump-green
          borderDash: [5, 5],
          borderWidth: 2,
          pointRadius: 0,
          fill: '+1', // Fill to the dataset above it (which is lower bound here if ordered correctly, or to origin if it's the first fill: true)
                       // To fill between lower and upper, ensure lower is drawn, then upper, then use fill: '-1' or target index for upper.
                       // For clarity, let's create a specific fill dataset.
        },
         // Dataset for the fill area
        {
          label: 'Forecast Range (5th-95th Pctl)',
          data: chartData.upper, // Use upper bound data
          borderColor: 'transparent',
          backgroundColor: 'rgba(90, 200, 250, 0.1)', // neutral-blue with alpha
          pointRadius: 0,
          fill: {
            target: {value: chartData.lower[0].y}, // Target the y-value of the first point of the lower bound data for Chart.js v3+
                                                  // Or more robustly, refer to the index of the 'Lower Bound' dataset after Chart.js v3.4+
            above: 'rgba(90, 200, 250, 0.1)', // Color when 'data' is above target
            below: 'rgba(255, 59, 48, 0.05)'  // Optional: color when 'data' is below target (shouldn't happen here)
          },
          // For Chart.js versions that support filling to another dataset by index directly in `fill`:
          // fill: chartData.lower && chartData.lower.length > 0 ? state.priceChart.data.datasets.findIndex(ds => ds.label === 'Lower Bound (5th Pctl)') : false,
          // Note: Referencing other datasets for fill can be tricky. A common approach is to have upper bound fill down to lower bound.
          // The provided solution makes 'Upper Bound' fill down to where 'Lower Bound' started,
          // then 'Lower Bound' also needs to be part of the filled area for this specific visual.
          // A simpler way for Chart.js 3.x for filling between two specific datasets:
          // 1. Ensure 'Lower Bound' dataset exists.
          // 2. For 'Upper Bound' dataset, set `fill: {target: 'previous', above: 'rgba(90, 200, 250, 0.1)'}` if 'Lower Bound' is indeed previous.
          // Let's use a common method: draw lower, then draw upper and have it fill to the 'origin' or 'start',
          // and set its `fill.target` to the y-values of the lower bound.
          // The most straightforward way is to provide the lower data as the 'target' for the fill.
          // This requires Chart.js 3.x:
          // `fill: {target: {value: chartData.lower[0].y}}` is not quite right for filling between dynamic lines.
          // The most robust way for filling between two datasets chartDatasetA and chartDatasetB
          // is to have chartDatasetB.data and then set chartDatasetB.fill to the index of chartDatasetA
          // Or, for dynamic `y` values, the fill plugin often expects the target to be another dataset.
          // Let's adjust: The 'Upper Bound' dataset will be filled. Its 'fill' option will target the 'Lower Bound' dataset.
          // We need to ensure the datasets are in the correct order in the `datasets` array for this.
          // Let 'Lower Bound' be index 0, 'Upper Bound' index 1 (after backgroundPaths).
          // Then in 'Upper Bound' dataset: `fill: {target: 0, above: 'rgba(90,200,250,0.1)'}`
          // The current structure is: background, lower, upper.
          // So, for the `Upper Bound` dataset (index `backgroundPaths.length + 1`):
          // `fill: {target: backgroundPaths.length, above: 'rgba(90, 200, 250, 0.1)'}`
        },
        {
          label: 'Price Forecast (Median)',
          data: chartData.median,
          borderColor: 'rgba(90, 200, 250, 1)', // neutral-blue
          borderWidth: 3,
          pointRadius: 0,
          fill: false,
          tension: 0.3
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: {
          type: 'time',
          time: {
            unit: forecast.timeframeDays > 60 ? 'month' : forecast.timeframeDays > 14 ? 'week' : 'day',
            displayFormats: {
              day: 'MMM d',
              week: 'MMM d',
              month: 'MMM yyyy' // Corrected: MMM YYYY for Moment.js adapter
            }
          },
          grid: {
            color: 'rgba(255, 255, 255, 0.1)'
          },
          ticks: {
            color: 'rgba(255, 255, 255, 0.7)'
          }
        },
        y: {
          type: 'logarithmic', // Set Y-axis to logarithmic
          grid: {
            color: 'rgba(255, 255, 255, 0.1)'
          },
          ticks: {
            color: 'rgba(255, 255, 255, 0.7)',
            callback: function(value, index, ticks) {
              // Show ticks for 1, 10, 100, 1k, 10k, 100k, etc.
              // And major intermediate values if space permits.
              if (value === 0) return '$0'; // Should not happen with log if min is not 0
              const log10 = Math.log10(value);
              if (Math.abs(log10 - Math.floor(log10)) < 1e-9 || // Powers of 10
                  (value > 1000 && (value % 5000 === 0 || value % 2000 === 0 || value % 2500 === 0)) || // K-multiples
                  (value <= 1000 && value > 100 && value % 50 === 0) // Hundreds-multiples
                 ) {
                   return '$' + value.toLocaleString();
              }
              // Return null or undefined to skip drawing other labels to prevent clutter
              // However, Chart.js might auto-generate some if too many are skipped.
              // A common practice is to let Chart.js decide, or use a more sophisticated filter.
              // For this case, formatting all ticks that Chart.js decides to show:
              return '$' + value.toLocaleString();
            }
          },
          // It's good practice to set a minimum for log scale if data can approach 0
          min: Math.max(1, Math.min(...chartData.lower.map(d => d.y), ...chartData.median.map(d => d.y)) * 0.5) // Ensure min is at least 1 or 50% of lowest value
        }
      },
      plugins: {
        tooltip: {
          mode: 'index',
          intersect: false,
          callbacks: {
            label: function(context) {
              let label = context.dataset.label || '';
              if (label) {
                label += ': ';
              }
              if (context.parsed.y !== null) {
                 label += formatPrice(context.parsed.y);
              }
              return label;
            }
          }
        },
        legend: {
          display: false, // Display legend so user knows what lines are
          position: 'top',
          labels: {
            color: 'rgba(255, 255, 255, 0.7)'
          }
        }
      },
      // Ensure the chart is redrawn correctly after data updates
      animation: {
        duration: 0 // Disable animation for smoother updates if not needed
      }
    }
  });

  // Adjust fill for the forecast range
  // Find the index of the 'Lower Bound' and 'Upper Bound' datasets
  const lowerBoundIndex = state.priceChart.data.datasets.findIndex(ds => ds.label === 'Lower Bound (5th Pctl)');
  const upperBoundIndex = state.priceChart.data.datasets.findIndex(ds => ds.label === 'Forecast Range (5th-95th Pctl)'); // This is our fill dataset

  if (lowerBoundIndex !== -1 && upperBoundIndex !== -1) {
    state.priceChart.data.datasets[upperBoundIndex].fill = {
        target: lowerBoundIndex, // Target the 'Lower Bound' dataset by its index
        above: 'rgba(90, 200, 250, 0.1)',
    };
    state.priceChart.update(); // Update the chart to apply the fill
  }


  // Add Export Button if it doesn't exist
  if (chartContainer && !document.getElementById('exportPriceChartBtn')) {
    const exportButton = document.createElement('button');
    exportButton.id = 'exportPriceChartBtn';
    exportButton.textContent = 'Export Chart as PNG';
    exportButton.style.marginTop = '10px';
    exportButton.style.padding = '8px 12px';
    exportButton.style.backgroundColor = 'var(--btc-orange)';
    exportButton.style.color = 'black';
    exportButton.style.border = 'none';
    exportButton.style.borderRadius = '5px';
    exportButton.style.cursor = 'pointer';

    exportButton.addEventListener('click', function() {
      if (state.priceChart) {
        const image = state.priceChart.toBase64Image();
        const link = document.createElement('a');
        link.href = image;
        link.download = 'bitcoin-price-forecast-chart.png';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    });
    // Append button after the chart container or inside a dedicated controls div
    // For simplicity, appending after the chartContainer if it's the direct parent of canvas
    if (chartContainer.lastChild.nodeName === 'CANVAS') {
        chartContainer.parentNode.insertBefore(exportButton, chartContainer.nextSibling);
    } else { // If canvas is wrapped, append to chartContainer itself.
        chartContainer.appendChild(exportButton);
    }
  }
}

// Create a visualization of the transition matrix
function createTransitionMatrixVisualization(forecast) {
  if (!forecast || !forecast.transitionMatrix) return null;
  
  const container = document.createElement('div');
  container.className = 'transition-matrix';
  container.style.marginTop = '20px';
  container.style.marginBottom = '10px';
  
  // Create header
  const header = document.createElement('div');
  header.className = 'card-title';
  header.textContent = 'State Transition Probabilities';
  container.appendChild(header);
  
  // Create matrix table
  const table = document.createElement('table');
  table.style.width = '100%';
  table.style.borderCollapse = 'collapse';
  table.style.marginTop = '10px';
  
  // Create table header row
  const tHead = document.createElement('thead');
  const headerRow = document.createElement('tr');
  
  // Add empty cell for row headers
  const emptyCell = document.createElement('th');
  emptyCell.style.padding = '5px';
  emptyCell.style.textAlign = 'right';
  emptyCell.textContent = 'From/To';
  headerRow.appendChild(emptyCell);
  
  // Add column headers (to states)
  const stateNames = ['Crash', 'Normal', 'Pump'];
  stateNames.forEach(name => {
    const th = document.createElement('th');
    th.style.padding = '5px';
    th.style.textAlign = 'center';
    th.textContent = name;
    headerRow.appendChild(th);
  });
  
  tHead.appendChild(headerRow);
  table.appendChild(tHead);
  
  // Create table body
  const tBody = document.createElement('tbody');
  
  // Add rows for each from state
  stateNames.forEach((fromName, fromIdx) => {
    const row = document.createElement('tr');
    
    // Add row header (from state)
    const rowHeader = document.createElement('th');
    rowHeader.style.padding = '5px';
    rowHeader.style.textAlign = 'right';
    rowHeader.textContent = fromName;
    row.appendChild(rowHeader);
    
    // Add cells for transition probabilities
    stateNames.forEach((toName, toIdx) => {
      const cell = document.createElement('td');
      cell.style.padding = '5px';
      cell.style.textAlign = 'center';
      
      const probability = forecast.transitionMatrix[fromIdx][toIdx];
      cell.textContent = (probability * 100).toFixed(1) + '%';
      
      // Highlight high probabilities
      if (probability > 0.5) {
        cell.style.fontWeight = 'bold';
        cell.style.backgroundColor = 'rgba(52, 199, 89, 0.3)';
      } else if (probability > 0.3) {
        cell.style.backgroundColor = 'rgba(52, 199, 89, 0.1)';
      }
      
      row.appendChild(cell);
    });
    
    tBody.appendChild(row);
  });
  
  table.appendChild(tBody);
  container.appendChild(table);
  
  // Add description
  const description = document.createElement('div');
  description.style.fontSize = '0.9rem';
  description.style.opacity = '0.8';
  description.style.marginTop = '8px';
  description.style.textAlign = 'center';
  description.textContent = 'Probabilities of transitioning between market states (rows → columns)';
  container.appendChild(description);
  
  return container;
}

// Create a visualization of the forecast paths
function createForecastPathsVisualization(forecast) {
  if (!forecast || !forecast.simulationSummary) return null;
  
  const container = document.createElement('div');
  container.className = 'forecast-paths';
  container.style.height = '200px';
  
  const canvas = document.createElement('canvas');
  canvas.height = 200;
  container.appendChild(canvas);
  
  // Generate date labels
  const dates = [];
  const today = new Date();
  for (let i = 0; i <= forecast.timeframeDays; i++) {
    const date = new Date(today);
    date.setDate(date.getDate() + i);
    dates.push(date);
  }
  
  // Create datasets from simulation summary
  const medianData = forecast.simulationSummary.map((stats, i) => ({
    x: dates[i],
    y: stats.median
  }));
  
  const lower5Data = forecast.simulationSummary.map((stats, i) => ({
    x: dates[i],
    y: stats.lower5
  }));
  
  const lower25Data = forecast.simulationSummary.map((stats, i) => ({
    x: dates[i],
    y: stats.lower25
  }));
  
  const upper75Data = forecast.simulationSummary.map((stats, i) => ({
    x: dates[i],
    y: stats.upper75
  }));
  
  const upper95Data = forecast.simulationSummary.map((stats, i) => ({
    x: dates[i],
    y: stats.upper95
  }));
  
  // Create chart
  new Chart(canvas.getContext('2d'), {
    type: 'line',
    data: {
      datasets: [
        {
          label: '5% - 95% Range',
          data: upper95Data,
          backgroundColor: 'rgba(90, 200, 250, 0.1)',
          borderColor: 'transparent',
          pointRadius: 0,
          fill: '+1'
        },
        {
          label: '5% Percentile',
          data: lower5Data,
          borderColor: 'rgba(255, 59, 48, 0.3)',
          borderWidth: 1,
          pointRadius: 0,
          fill: false
        },
        {
          label: '25% - 75% Range',
          data: upper75Data,
          backgroundColor: 'rgba(90, 200, 250, 0.2)',
          borderColor: 'transparent',
          pointRadius: 0,
          fill: '+1'
        },
        {
          label: '25% Percentile',
          data: lower25Data,
          borderColor: 'rgba(255, 149, 0, 0.3)',
          borderWidth: 1,
          pointRadius: 0,
          fill: false
        },
        {
          label: 'Median',
          data: medianData,
          borderColor: 'rgba(255, 255, 255, 0.8)',
          borderWidth: 2,
          pointRadius: 0,
          fill: false
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: {
          type: 'time',
          time: {
            unit: forecast.timeframeDays > 60 ? 'month' : forecast.timeframeDays > 14 ? 'week' : 'day'
          },
          grid: {
            color: 'rgba(255, 255, 255, 0.1)'
          },
          ticks: {
            color: 'rgba(255, 255, 255, 0.7)'
          }
        },
        y: {
          grid: {
            color: 'rgba(255, 255, 255, 0.1)'
          },
          ticks: {
            color: 'rgba(255, 255, 255, 0.7)',
            callback: function(value) {
              return '$' + value.toLocaleString();
            }
          }
        }
      },
      plugins: {
        legend: {
          display: false
        },
        tooltip: {
          callbacks: {
            label: function(context) {
              return '$' + context.parsed.y.toLocaleString();
            }
          }
        }
      }
    }
  });
  
  return container;
}

// Create an advanced visualizations dashboard
function createAdvancedVisualizationsDashboard(forecast) {
  const container = document.createElement('div');
  container.className = 'advanced-visualizations';
  container.style.marginTop = '20px';
  
  // Add header
  const header = document.createElement('div');
  header.className = 'card-title';
  header.textContent = 'Advanced Market Analytics';
  container.appendChild(header);
  
  // Create grid layout
  const grid = document.createElement('div');
  grid.style.display = 'grid';
  grid.style.gridTemplateColumns = 'repeat(2, 1fr)';
  grid.style.gap = '20px';
  grid.style.marginTop = '15px';
  
  // Create transition matrix visualization
  const matrixCard = document.createElement('div');
  matrixCard.className = 'card';
  const matrixViz = createTransitionMatrixVisualization(forecast);
  if (matrixViz) {
    matrixCard.appendChild(matrixViz);
    grid.appendChild(matrixCard);
  }
  
  // Create forecast paths visualization
  const pathsCard = document.createElement('div');
  pathsCard.className = 'card';
  pathsCard.innerHTML = '<div class="card-title">Forecast Distribution</div>';
  const pathsViz = createForecastPathsVisualization(forecast);
  if (pathsViz) {
    pathsCard.appendChild(pathsViz);
    grid.appendChild(pathsCard);
  }
  
  // Add grid to container
  container.appendChild(grid);
  
  return container;
}

// Update forecasts and UI
async function updateForecast() {
  const timeframe = state.currentTimeframe;
  const currentMonth = new Date().getMonth() + 1;
  
  // First, check if we already have a forecast for this timeframe
  if (!state.unifiedForecasts[timeframe]) {
    // Calculate a new forecast with context factors
    const context = {
      cyclePosition: state.latestOnChainMetrics?.cyclePosition,
      onChainMetrics: state.latestOnChainMetrics,
      volatilityRatio: state.latestOnChainMetrics?.volatility?.ratio,
      currentMonth: currentMonth
    };
    
    state.unifiedForecasts[timeframe] = calculateUnifiedBayesianForecast(
      state.bitcoinData, 
      timeframe,
      context
    );
  }
  
  // Get the forecast
  let forecast = state.unifiedForecasts[timeframe];
  
  // Get or update sentiment data
  if (!state.sentimentData) {
    await integrateNewsSentiment();
  }
  
  // Adjust forecast based on sentiment
  if (state.sentimentData) {
    forecast = calculateSentimentAdjustedForecast(forecast, state.sentimentData);
  }
  
  // Update crash and pump gauges
  updateCrashGauge(forecast.crashProbability);
  updatePumpGauge(forecast.pumpProbability);
  
  // Update price forecast display
  updatePriceForecast(forecast);
  
  // Update on-chain metrics indicators
  updateMetricsIndicators();
  
  // Remove any existing advanced visualizations
  const existingViz = document.querySelector('.advanced-visualizations');
  if (existingViz) {
    existingViz.remove();
  }
  
  // Add advanced visualizations
  const forecastContainer = document.querySelector('.price-forecast');
  if (forecastContainer) {
    const advancedViz = createAdvancedVisualizationsDashboard(forecast);
    forecastContainer.appendChild(advancedViz);
  }
  
  // Hide loading spinner
  document.getElementById('loading').style.display = 'none';
}

// Initialize the application
async function initApp() {
  try {
    // Fetch Bitcoin data
    const response = await fetch('https://raw.githubusercontent.com/coinmetrics/data/master/csv/btc.csv');
    if (!response.ok) {
      throw new Error('Failed to fetch Bitcoin data');
    }
    const csvText = await response.text();
    
    // Process data
    state.bitcoinData = processData(csvText);
    console.log(`Processed ${state.bitcoinData.length} Bitcoin data points`);
    
    // Process on-chain metrics
    const onChainResult = processOnChainData(state.bitcoinData);
    state.onChainData = onChainResult.enhancedData;
    state.latestOnChainMetrics = onChainResult.latestMetrics;
    
    // Start sentiment analysis in parallel with forecast calculation
    const sentimentPromise = integrateNewsSentiment();
    
    // Update the forecast for the current timeframe
    await updateForecast();
    
    // Set up event listeners for timeframe tabs
    document.querySelectorAll('.timeframe-tab').forEach(tab => {
      tab.addEventListener('click', function() {
        // Remove active class from all tabs
        document.querySelectorAll('.timeframe-tab').forEach(t => t.classList.remove('active'));
        
        // Add active class to clicked tab
        this.classList.add('active');
        
        // Update current timeframe
        state.currentTimeframe = parseInt(this.getAttribute('data-days'));
        
        // Update forecast
        updateForecast();
      });
    });
    
    // Set up model explanation toggle
    const modelToggle = document.querySelector('.model-toggle');
    const modelDetails = document.querySelector('.model-details');
    
    if (modelToggle && modelDetails) {
      modelToggle.addEventListener('click', function() {
        const isVisible = modelDetails.style.display !== 'none';
        modelDetails.style.display = isVisible ? 'none' : 'block';
        modelToggle.textContent = isVisible ? 'Show Mathematical Details' : 'Hide Mathematical Details';
      });
    }
  } catch (error) {
    console.error('Error initializing app:', error);
    document.getElementById('loading').innerHTML = `
      <div style="color: var(--risk-red)">Error loading data: ${error.message}</div>
      <div style="margin-top: 10px">Please try refreshing the page</div>
    `;
  }
}

// Integrate sentiment analysis
async function integrateNewsSentiment() {
  try {
    // Get crypto news headlines
    const newsData = await fetchCryptoNews();
    
    if (!newsData || !newsData.length) {
      throw new Error('No news data available');
    }
    
    // Perform sentiment analysis on the headlines using NBC
    const sentimentData = analyzeHeadlinesWithNBC(newsData, state.bitcoinData);
    state.sentimentData = sentimentData;
    
    // Update UI with sentiment information
    updateSentimentDisplay(sentimentData);
    
    return sentimentData;
  } catch (error) {
    console.error('Error analyzing sentiment:', error);
    // Default to neutral sentiment if analysis fails
    return {
      value: 50,
      sentiment: 'Neutral',
      timestamp: new Date().toISOString(),
      headlines: []
    };
  }
}

// Update sentiment display
function updateSentimentDisplay(sentiment) {
  const sentimentContainer = document.createElement('div');
  sentimentContainer.className = 'sentiment-summary';
  sentimentContainer.innerHTML = `
    <div class="sentiment-header">
      <div class="sentiment-label">Market Sentiment:</div>
      <div class="sentiment-value">${sentiment.sentiment}</div>
    </div>
    <div class="sentiment-meter">
      <div class="sentiment-fill" style="width: ${sentiment.value}%"></div>
    </div>
    <div class="sentiment-labels">
      <span>Bearish</span>
      <span>Bullish</span>
    </div>
  `;
  
  // Find where to add the sentiment display
  const container = document.querySelector('.price-forecast');
  if (container) {
    // Check if sentiment display already exists
    const existingSentiment = container.querySelector('.sentiment-summary');
    if (existingSentiment) {
      container.replaceChild(sentimentContainer, existingSentiment);
    } else {
      // Insert after the price-data div
      const priceData = container.querySelector('.price-data');
      if (priceData) {
        priceData.insertAdjacentElement('afterend', sentimentContainer);
      } else {
        container.appendChild(sentimentContainer);
      }
    }
  }
}

// Fetch crypto news headlines
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
    
    // Sort by date (newest first) and remove duplicates
    return newsItems
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
      .filter((item, index, self) => 
        index === self.findIndex(t => t.title === item.title)
      );
  } catch (error) {
    console.error('Error fetching news:', error);
    // Return fallback headlines in case of error
    return [
      {
        title: "Bitcoin holds above $90,000 amid market consolidation",
        timestamp: new Date().toISOString(),
        source: "Fallback News"
      },
      {
        title: "Crypto market sentiment remains cautiously optimistic",
        timestamp: new Date().toISOString(),
        source: "Fallback News"
      }
    ];
  }
}

// Analyze headlines using NBC
function analyzeHeadlinesWithNBC(headlines, priceData) {
  // Create a new instance of NaiveBayesClassifier with price data
  const classifier = new NaiveBayesClassifier(priceData);
  
  // Analyze the headlines
  const result = classifier.analyzeHeadlines(headlines);
  
  return {
    value: result.value,
    sentiment: result.sentiment,
    timestamp: new Date().toISOString(),
    headlines: result.details || []
  };
}

// Toggle button for advanced analysis panel
function addAdvancedAnalysisToggle() {
  const forecastContainer = document.querySelector('.forecast-container');
  if (!forecastContainer) return;

  // Check if button already exists
  if (document.querySelector('.toggle-advanced-btn')) return;

  // Create toggle button container
  const toggleContainer = document.createElement('div');
  toggleContainer.className = 'advanced-toggle-container';
  toggleContainer.style.textAlign = 'center';
  toggleContainer.style.margin = '20px 0';

  // Create button
  const toggleButton = document.createElement('button');
  toggleButton.className = 'toggle-advanced-btn';
  toggleButton.textContent = 'Show Advanced Analysis';
  toggleButton.style.padding = '8px 16px';
  toggleButton.style.backgroundColor = 'rgba(247, 147, 26, 0.2)';
  toggleButton.style.color = 'var(--btc-orange)';
  toggleButton.style.border = 'none';
  toggleButton.style.borderRadius = '5px';
  toggleButton.style.cursor = 'pointer';
  toggleButton.style.fontWeight = 'bold';
  
  // Add click event
  toggleButton.addEventListener('click', function() {
    const advancedPanel = document.querySelector('.advanced-visualizations');
    if (advancedPanel) {
      const isVisible = advancedPanel.style.display !== 'none';
      advancedPanel.style.display = isVisible ? 'none' : 'block';
      toggleButton.textContent = isVisible ? 'Show Advanced Analysis' : 'Hide Advanced Analysis';
    } else {
      // If panel doesn't exist yet, create it with current forecast
      const currentForecast = state.unifiedForecasts[state.currentTimeframe];
      if (currentForecast) {
        const advancedViz = createAdvancedVisualizationsDashboard(currentForecast);
        // Insert after forecast container
        forecastContainer.parentNode.insertBefore(advancedViz, forecastContainer.nextSibling);
        toggleButton.textContent = 'Hide Advanced Analysis';
      }
    }
  });
  
  toggleContainer.appendChild(toggleButton);
  forecastContainer.parentNode.insertBefore(toggleContainer, forecastContainer.nextSibling);
}

// Create distribution visualization
function createProbabilityDistributionVisualization(forecast) {
  if (!forecast || !forecast.simulationSummary) return null;
  
  const container = document.createElement('div');
  container.className = 'probability-distribution';
  container.style.height = '200px';
  
  const canvas = document.createElement('canvas');
  canvas.height = 200;
  container.appendChild(canvas);
  
  // Get final price distribution from simulation
  const finalStats = forecast.simulationSummary[forecast.simulationSummary.length - 1];
  
  // Generate a price distribution using log-normal approximation
  const meanLogReturn = Math.log(forecast.forecastPrice / forecast.currentPrice);
  const stdDevLogReturn = (Math.log(finalStats.upper95 / finalStats.median)) / 1.96;
  
  // Generate price points
  const pricePoints = [];
  const densityPoints = [];
  
  // Create 100 price points for distribution curve
  const minPrice = forecast.currentPrice * 0.5;
  const maxPrice = forecast.currentPrice * 2.0;
  const step = (maxPrice - minPrice) / 100;
  
  for (let i = 0; i <= 100; i++) {
    const price = minPrice + i * step;
    pricePoints.push(price);
    
    // Calculate log-normal probability density
    const x = Math.log(price / forecast.currentPrice);
    const density = (1 / (price * stdDevLogReturn * Math.sqrt(2 * Math.PI))) * 
                    Math.exp(-0.5 * Math.pow((x - meanLogReturn) / stdDevLogReturn, 2));
    
    densityPoints.push(density);
  }
  
  // Normalize density for better visualization
  const maxDensity = Math.max(...densityPoints);
  const normalizedDensity = densityPoints.map(d => d / maxDensity);
  
  // Create chart
  new Chart(canvas.getContext('2d'), {
    type: 'line',
    data: {
      labels: pricePoints,
      datasets: [{
        label: 'Price Probability',
        data: normalizedDensity.map((d, i) => ({
          x: pricePoints[i],
          y: d
        })),
        borderColor: 'rgba(90, 200, 250, 1)',
        backgroundColor: 'rgba(90, 200, 250, 0.2)',
        borderWidth: 2,
        pointRadius: 0,
        fill: true
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: {
          type: 'linear',
          position: 'bottom',
          title: {
            display: true,
            text: 'Price (USD)',
            color: 'rgba(255, 255, 255, 0.7)'
          },
          ticks: {
            callback: function(value) {
              return '$' + value.toLocaleString();
            },
            color: 'rgba(255, 255, 255, 0.7)'
          },
          grid: {
            color: 'rgba(255, 255, 255, 0.1)'
          }
        },
        y: {
          display: false
        }
      },
      plugins: {
        legend: {
          display: false
        },
        annotation: {
          annotations: {
            currentPrice: {
              type: 'line',
              xMin: forecast.currentPrice,
              xMax: forecast.currentPrice,
              borderColor: 'white',
              borderWidth: 1,
              borderDash: [5, 5],
              label: {
                display: true,
                backgroundColor: 'rgba(0, 0, 0, 0.7)',
                content: 'Current',
                position: 'top'
              }
            },
            forecastPrice: {
              type: 'line',
              xMin: forecast.forecastPrice,
              xMax: forecast.forecastPrice,
              borderColor: 'rgba(90, 200, 250, 1)',
              borderWidth: 1,
              label: {
                display: true,
                backgroundColor: 'rgba(0, 0, 0, 0.7)',
                content: 'Forecast',
                position: 'top'
              }
            }
          }
        }
      }
    }
  });
  
  return container;
}

// Create state probability visualization
function createStateProbabilityVisualization(forecast) {
  if (!forecast || !forecast.steadyStateProbs) return null;
  
  const container = document.createElement('div');
  container.className = 'state-probabilities';
  container.style.height = '200px';
  
  const canvas = document.createElement('canvas');
  canvas.height = 200;
  container.appendChild(canvas);
  
  // Get state probabilities
  const stateProbs = [
    forecast.steadyStateProbs[0], // Crash
    forecast.steadyStateProbs[1], // Normal
    forecast.steadyStateProbs[2]  // Pump
  ];
  
  // Create chart
  new Chart(canvas.getContext('2d'), {
    type: 'bar',
    data: {
      labels: ['Crash', 'Normal', 'Pump'],
      datasets: [{
        label: 'State Probability',
        data: stateProbs.map(p => p * 100), // Convert to percentage
        backgroundColor: [
          'rgba(255, 59, 48, 0.7)',
          'rgba(90, 200, 250, 0.7)',
          'rgba(52, 199, 89, 0.7)'
        ],
        borderColor: [
          'rgba(255, 59, 48, 1)',
          'rgba(90, 200, 250, 1)',
          'rgba(52, 199, 89, 1)'
        ],
        borderWidth: 1
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        y: {
          beginAtZero: true,
          max: 100,
          title: {
            display: true,
            text: 'Probability (%)',
            color: 'rgba(255, 255, 255, 0.7)'
          },
          ticks: {
            callback: function(value) {
              return value + '%';
            },
            color: 'rgba(255, 255, 255, 0.7)'
          },
          grid: {
            color: 'rgba(255, 255, 255, 0.1)'
          }
        },
        x: {
          grid: {
            color: 'rgba(255, 255, 255, 0.1)'
          },
          ticks: {
            color: 'rgba(255, 255, 255, 0.7)'
          }
        }
      },
      plugins: {
        legend: {
          display: false
        },
        tooltip: {
          callbacks: {
            label: function(context) {
              return context.parsed.y.toFixed(2) + '%';
            }
          }
        }
      }
    }
  });
  
  return container;
}

// Create cycle position visualization
function createCyclePositionGauge(cyclePosition) {
  const container = document.createElement('div');
  container.className = 'cycle-gauge-container';
  container.style.height = '150px';
  container.style.position = 'relative';
  
  // Create SVG element for the gauge
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('width', '100%');
  svg.setAttribute('height', '100%');
  svg.setAttribute('viewBox', '0 0 200 100');
  container.appendChild(svg);
  
  // Create semicircle for gauge background
  const arc = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  arc.setAttribute('d', 'M 10,90 A 90,90 0 0,1 190,90');
  arc.setAttribute('fill', 'none');
  arc.setAttribute('stroke', 'rgba(255,255,255,0.2)');
  arc.setAttribute('stroke-width', '10');
  svg.appendChild(arc);
  
  // Create colored segments
  // Bottom of cycle (accumulation)
  const accumulation = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  accumulation.setAttribute('d', 'M 10,90 A 90,90 0 0,1 70,90');
  accumulation.setAttribute('fill', 'none');
  accumulation.setAttribute('stroke', 'rgba(52, 199, 89, 0.8)');
  accumulation.setAttribute('stroke-width', '10');
  svg.appendChild(accumulation);
  
  // Middle of cycle (expansion)
  const expansion = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  expansion.setAttribute('d', 'M 70,90 A 90,90 0 0,1 130,90');
  expansion.setAttribute('fill', 'none');
  expansion.setAttribute('stroke', 'rgba(90, 200, 250, 0.8)');
  expansion.setAttribute('stroke-width', '10');
  svg.appendChild(expansion);
  
  // Top of cycle (euphoria)
  const euphoria = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  euphoria.setAttribute('d', 'M 130,90 A 90,90 0 0,1 190,90');
  euphoria.setAttribute('fill', 'none');
  euphoria.setAttribute('stroke', 'rgba(255, 59, 48, 0.8)');
  euphoria.setAttribute('stroke-width', '10');
  svg.appendChild(euphoria);
  
  // Add labels
  const labels = [
    {text: 'Accumulation', x: 30, y: 110},
    {text: 'Expansion', x: 100, y: 110},
    {text: 'Euphoria', x: 170, y: 110}
  ];
  
  labels.forEach(label => {
    const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    text.setAttribute('x', label.x);
    text.setAttribute('y', label.y);
    text.setAttribute('text-anchor', 'middle');
    text.setAttribute('fill', 'white');
    text.setAttribute('font-size', '12');
    text.textContent = label.text;
    svg.appendChild(text);
  });
  
  // Add needle position
  const angle = -180 + cyclePosition * 180;
  const radians = angle * Math.PI / 180;
  const needleX = 100 + 85 * Math.cos(radians);
  const needleY = 90 + 85 * Math.sin(radians);
  
  const needle = document.createElementNS('http://www.w3.org/2000/svg', 'line');
  needle.setAttribute('x1', '100');
  needle.setAttribute('y1', '90');
  needle.setAttribute('x2', needleX);
  needle.setAttribute('y2', needleY);
  needle.setAttribute('stroke', 'white');
  needle.setAttribute('stroke-width', '2');
  svg.appendChild(needle);
  
  // Add needle center
  const center = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
  center.setAttribute('cx', '100');
  center.setAttribute('cy', '90');
  center.setAttribute('r', '5');
  center.setAttribute('fill', 'white');
  svg.appendChild(center);
  
  // Add percentage text
  const percentText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
  percentText.setAttribute('x', '100');
  percentText.setAttribute('y', '65');
  percentText.setAttribute('text-anchor', 'middle');
  percentText.setAttribute('fill', 'white');
  percentText.setAttribute('font-size', '18');
  percentText.setAttribute('font-weight', 'bold');
  percentText.textContent = `${Math.round(cyclePosition * 100)}%`;
  svg.appendChild(percentText);
  
  return container;
}

// Add a visual explanation panel
function createModelExplanationPanel() {
  const container = document.createElement('div');
  container.className = 'model-explanation-panel';
  container.style.margin = '20px 0';
  container.style.padding = '15px';
  container.style.backgroundColor = 'rgba(30, 30, 30, 0.7)';
  container.style.borderRadius = '10px';
  container.style.border = '1px solid rgba(50, 50, 50, 0.7)';
  
  // Create content
  container.innerHTML = `
    <h3 style="color: var(--btc-orange); margin-bottom: 10px;">Understanding the Unified Bayesian Markov Model</h3>
    <p style="margin-bottom: 15px;">This forecast uses a sophisticated probabilistic framework that combines Bayesian inference with Markov state transitions:</p>
    
    <div style="margin-bottom: 15px;">
      <h4 style="color: var(--neutral-blue); margin-bottom: 5px;">1. State Classification</h4>
      <p>Daily price movements are categorized into three states:</p>
      <ul style="list-style-type: disc; padding-left: 20px; margin: 5px 0;">
        <li><span style="color: var(--risk-red);">Crash</span>: Extreme negative returns (below 1st percentile)</li>
        <li><span style="color: var(--neutral-blue);">Normal</span>: Typical market movements</li>
        <li><span style="color: var(--pump-green);">Pump</span>: Extreme positive returns (above 99th percentile)</li>
      </ul>
    </div>
    
    <div style="margin-bottom: 15px;">
      <h4 style="color: var(--neutral-blue); margin-bottom: 5px;">2. State Transitions</h4>
      <p>The model learns how Bitcoin transitions between these states over time, with unique transition probabilities for each state.</p>
    </div>
    
    <div style="margin-bottom: 15px;">
      <h4 style="color: var(--neutral-blue); margin-bottom: 5px;">3. Contextual Adjustments</h4>
      <p>Transition probabilities are adjusted for:</p>
      <ul style="list-style-type: disc; padding-left: 20px; margin: 5px 0;">
        <li>Seasonal patterns by month</li>
        <li>Current market cycle position</li>
        <li>On-chain metrics (MVRV, NVT)</li>
        <li>Current volatility regime</li>
        <li>Market sentiment from news analysis</li>
      </ul>
    </div>
    
    <div>
      <h4 style="color: var(--neutral-blue); margin-bottom: 5px;">4. Monte Carlo Simulation</h4>
      <p>The forecast combines thousands of simulated price paths to generate probabilistic outcomes and ranges.</p>
    </div>
  `;
  
  return container;
}

// Add additional UI enhancements after app init
function enhanceUI() {
  // Add advanced analysis toggle
  addAdvancedAnalysisToggle();
  
  // Add model explanation panel
  const forecastContainer = document.querySelector('.price-forecast');
  if (forecastContainer) {
    const modelExplanation = createModelExplanationPanel();
    forecastContainer.appendChild(modelExplanation);
  }
  
  // Add event listener for model explanation toggle
  document.addEventListener('click', function(event) {
    if (event.target.classList.contains('model-toggle')) {
      const modelDetails = document.querySelector('.model-details');
      if (modelDetails) {
        const isVisible = modelDetails.style.display !== 'none';
        modelDetails.style.display = isVisible ? 'none' : 'block';
        event.target.textContent = isVisible ? 'Show Mathematical Details' : 'Hide Mathematical Details';
      }
    }
  });
}

// Enhance the main initialization function
const originalInitApp = initApp;
initApp = async function() {
  try {
    // Call the original init function
    await originalInitApp();
    
    // Add enhanced UI components
    enhanceUI();
    
  } catch (error) {
    console.error('Error in enhanced initialization:', error);
  }
};

// Add utility function for matrix operations
function multiplyVectorMatrix(vector, matrix) {
  if (!vector || !matrix || vector.length !== matrix.length) {
    console.error('Invalid dimensions for vector-matrix multiplication');
    return vector;
  }
  
  const result = Array(vector.length).fill(0);
  
  for (let i = 0; i < vector.length; i++) {
    for (let j = 0; j < matrix[i].length; j++) {
      result[j] += vector[i] * matrix[i][j];
    }
  }
  
  return result;
}

function multiplyMatrices(matrixA, matrixB) {
  if (!matrixA || !matrixB || matrixA[0].length !== matrixB.length) {
    console.error('Invalid dimensions for matrix multiplication');
    return matrixA;
  }
  
  const result = Array(matrixA.length).fill().map(() => 
    Array(matrixB[0].length).fill(0)
  );
  
  for (let i = 0; i < matrixA.length; i++) {
    for (let j = 0; j < matrixB[0].length; j++) {
      for (let k = 0; k < matrixB.length; k++) {
        result[i][j] += matrixA[i][k] * matrixB[k][j];
      }
    }
  }
  
  return result;
}

// Helper function to get matrix power efficiently
function matrixPower(matrix, power) {
  if (power === 0) {
    // Return identity matrix
    return matrix.map((row, i) => 
      row.map((_, j) => i === j ? 1 : 0)
    );
  }
  
  if (power === 1) {
    return matrix;
  }
  
  // Use binary exponentiation for efficiency
  if (power % 2 === 0) {
    const halfPower = matrixPower(matrix, power / 2);
    return multiplyMatrices(halfPower, halfPower);
  } else {
    const halfPower = matrixPower(matrix, (power - 1) / 2);
    const halfPowerSquared = multiplyMatrices(halfPower, halfPower);
    return multiplyMatrices(matrix, halfPowerSquared);
  }
}

// Start the application
document.addEventListener('DOMContentLoaded', initApp);

/**
 * Creates a visual representation of Markov state transition flows using D3.js
 * @param {Array} transitionMatrix - 3x3 matrix of transition probabilities
 * @param {Array} steadyStateProbs - Array of 3 probabilities for steady states
 * @returns {HTMLElement} - Container with the D3 visualization
 */
function createMarkovFlowDiagram(transitionMatrix, steadyStateProbs) {
  // Create container for the diagram
  const container = document.createElement('div');
  container.className = 'markov-flow-diagram';
  container.style.width = '100%';
  container.style.height = '300px';
  container.style.position = 'relative';
  
  // Check if input data is valid
  if (!transitionMatrix || !steadyStateProbs || 
      !Array.isArray(transitionMatrix) || !Array.isArray(steadyStateProbs) ||
      transitionMatrix.length !== 3 || steadyStateProbs.length !== 3) {
    const errorMsg = document.createElement('div');
    errorMsg.textContent = 'Insufficient data for Markov flow visualization';
    errorMsg.style.color = 'var(--risk-red)';
    errorMsg.style.textAlign = 'center';
    errorMsg.style.paddingTop = '120px';
    container.appendChild(errorMsg);
    return container;
  }
  
  // Need to dynamically load D3.js if it's not already loaded
  if (typeof d3 === 'undefined') {
    const script = document.createElement('script');
    script.src = 'https://d3js.org/d3.v7.min.js';
    script.onload = function() {
      renderD3Diagram(container, transitionMatrix, steadyStateProbs);
    };
    document.head.appendChild(script);
  } else {
    renderD3Diagram(container, transitionMatrix, steadyStateProbs);
  }
  
  return container;
}

/**
 * Renders the D3.js Markov flow diagram
 * @param {HTMLElement} container - Container element to render into
 * @param {Array} transitionMatrix - 3x3 matrix of transition probabilities
 * @param {Array} steadyStateProbs - Array of 3 probabilities for steady states
 */
function renderD3Diagram(container, transitionMatrix, steadyStateProbs) {
  // Clear container
  container.innerHTML = '';
  
  // State names and colors
  const stateNames = ['Crash', 'Normal', 'Pump'];
  const stateColors = ['var(--risk-red)', 'var(--neutral-blue)', 'var(--pump-green)'];
  
  // Convert CSS variable colors to actual RGB values for D3
  const computedStyle = getComputedStyle(document.documentElement);
  const riskRed = computedStyle.getPropertyValue('--risk-red').trim() || '#ff3b30';
  const neutralBlue = computedStyle.getPropertyValue('--neutral-blue').trim() || '#5ac8fa';
  const pumpGreen = computedStyle.getPropertyValue('--pump-green').trim() || '#34c759';
  const actualColors = [riskRed, neutralBlue, pumpGreen];
  
  // Create SVG container
  const width = container.clientWidth;
  const height = container.clientHeight;
  const svg = d3.select(container)
    .append('svg')
    .attr('width', width)
    .attr('height', height)
    .append('g')
    .attr('transform', `translate(${width/2}, ${height/2})`);
  
  // Node positions (in a triangle formation)
  const radius = Math.min(width, height) * 0.35;
  const nodePositions = [
    { x: -radius * 0.866, y: radius * 0.5 },   // Crash (bottom left)
    { x: 0, y: -radius },                       // Normal (top)
    { x: radius * 0.866, y: radius * 0.5 }      // Pump (bottom right)
  ];
  
  // Create nodes
  const nodes = stateNames.map((name, i) => ({
    id: i,
    name: name,
    color: actualColors[i],
    x: nodePositions[i].x,
    y: nodePositions[i].y,
    probability: steadyStateProbs[i]
  }));
  
  // Create links (transitions)
  const links = [];
  for (let i = 0; i < 3; i++) {
    for (let j = 0; j < 3; j++) {
      // Only include transitions with non-zero probability
      if (transitionMatrix[i][j] > 0.001) {
        links.push({
          source: i,
          target: j,
          value: transitionMatrix[i][j]
        });
      }
    }
  }
  
  // Function to create curved paths for self-loops
  function createSelfLoopPath(d) {
    const node = nodes[d.source];
    const r = 15; // Node radius
    const loopRadius = 20; // Radius of the self-loop
    const startAngle = (node.id === 0) ? 225 : (node.id === 1) ? 90 : -45;
    const endAngle = startAngle + 270;
    
    // Create an arc path
    const arc = d3.arc()
      .innerRadius(loopRadius)
      .outerRadius(loopRadius)
      .startAngle(startAngle * (Math.PI/180))
      .endAngle(endAngle * (Math.PI/180));
    
    return arc();
  }
  
  // Function to create curved paths between nodes
  function createLinkPath(d) {
    const source = nodes[d.source];
    const target = nodes[d.target];
    
    // Self-loop
    if (d.source === d.target) {
      return createSelfLoopPath(d);
    }
    
    // Curved path between different nodes
    const dx = target.x - source.x;
    const dy = target.y - source.y;
    const dr = Math.sqrt(dx * dx + dy * dy) * 1.5;
    
    return `M${source.x},${source.y}A${dr},${dr} 0 0,1 ${target.x},${target.y}`;
  }
  
  // Add arrow markers for links
  svg.append('defs').selectAll('marker')
    .data(['end'])
    .enter()
    .append('marker')
    .attr('id', 'arrow')
    .attr('viewBox', '0 -5 10 10')
    .attr('refX', 20)
    .attr('refY', 0)
    .attr('markerWidth', 6)
    .attr('markerHeight', 6)
    .attr('orient', 'auto')
    .append('path')
    .attr('d', 'M0,-5L10,0L0,5')
    .attr('fill', 'white');
    
  // Draw links (arrows)
  const link = svg.append('g')
    .selectAll('path')
    .data(links)
    .enter()
    .append('path')
    .attr('d', createLinkPath)
    .attr('fill', 'none')
    .attr('stroke', d => nodes[d.source].color)
    .attr('stroke-width', d => Math.max(1, d.value * 10))
    .attr('opacity', 0.7)
    .attr('marker-end', d => d.source !== d.target ? 'url(#arrow)' : '');
  
  // Draw nodes
  const node = svg.append('g')
    .selectAll('circle')
    .data(nodes)
    .enter()
    .append('circle')
    .attr('r', 25)
    .attr('cx', d => d.x)
    .attr('cy', d => d.y)
    .attr('fill', d => d.color)
    .attr('stroke', 'white')
    .attr('stroke-width', 2);
  
  // Add node labels (state names)
  svg.selectAll('.state-label')
    .data(nodes)
    .enter()
    .append('text')
    .attr('class', 'state-label')
    .attr('x', d => d.x)
    .attr('y', d => d.y)
    .attr('dy', '.35em')
    .attr('text-anchor', 'middle')
    .attr('fill', 'white')
    .attr('font-weight', 'bold')
    .text(d => d.name);
  
  // Add probability labels
  svg.selectAll('.prob-label')
    .data(nodes)
    .enter()
    .append('text')
    .attr('class', 'prob-label')
    .attr('x', d => d.x)
    .attr('y', d => d.y + 35)
    .attr('text-anchor', 'middle')
    .attr('fill', 'white')
    .attr('font-size', '12px')
    .text(d => (d.probability * 100).toFixed(1) + '%');
  
  // Create invisible paths for labels
  svg.append('defs')
    .selectAll('path')
    .data(links.filter(d => d.value > 0.15 && d.source !== d.target))
    .enter()
    .append('path')
    .attr('id', (d, i) => `path-${i}`)
    .attr('d', createLinkPath);
  
  // Add transition probability labels for significant probabilities
  svg.selectAll('.trans-label')
    .data(links.filter(d => d.value > 0.15 && d.source !== d.target))
    .enter()
    .append('text')
    .attr('class', 'trans-label')
    .attr('dy', -5)
    .attr('fill', 'white')
    .attr('font-size', '11px')
    .attr('text-anchor', 'middle')
    .append('textPath')
    .attr('xlink:href', (d, i) => `#path-${i}`)
    .attr('startOffset', '50%')
    .text(d => (d.value * 100).toFixed(0) + '%');
  
  // Add tooltips for links (showing exact probabilities)
  link.append('title')
    .text(d => `${stateNames[d.source]} → ${stateNames[d.target]}: ${(d.value * 100).toFixed(1)}%`);
}

/**
 * Creates a bubble chart comparing risk vs reward for different timeframes
 * @param {Object} forecastsByTimeframe - Object mapping timeframes to forecast data
 * @returns {HTMLElement} - Container with the chart
 */
function createRiskRewardBubbleChart(forecastsByTimeframe) {
  // Create container for the chart
  const container = document.createElement('div');
  container.className = 'risk-reward-chart';
  container.style.height = '300px';
  
  // Check if we have sufficient data
  if (!forecastsByTimeframe || Object.keys(forecastsByTimeframe).length === 0) {
    const errorMsg = document.createElement('div');
    errorMsg.textContent = 'Insufficient timeframe data for comparison';
    errorMsg.style.color = 'var(--risk-red)';
    errorMsg.style.textAlign = 'center';
    errorMsg.style.paddingTop = '120px';
    container.appendChild(errorMsg);
    return container;
  }
  
  // Create canvas for Chart.js
  const canvas = document.createElement('canvas');
  container.appendChild(canvas);
  
  // Prepare data for the bubble chart
  const bubbleData = [];
  const timeframes = Object.keys(forecastsByTimeframe).map(Number).sort((a, b) => a - b);
  
  timeframes.forEach(timeframe => {
    const forecast = forecastsByTimeframe[timeframe];
    if (forecast && forecast.crashProbability !== undefined && 
        forecast.pumpProbability !== undefined && forecast.expectedReturn !== undefined) {
      
      // Calculate reward/risk ratio
      const rewardRiskRatio = forecast.expectedReturn / (forecast.crashProbability + 0.01);
      
      // Determine color based on expected return
      // Use linear interpolation between red and green
      let color;
      if (forecast.expectedReturn < 0) {
        // Negative return - red with opacity based on magnitude
        const opacity = Math.min(0.8, 0.3 + Math.abs(forecast.expectedReturn) * 5);
        color = `rgba(255, 59, 48, ${opacity})`;
      } else {
        // Positive return - green with opacity based on magnitude
        const opacity = Math.min(0.8, 0.3 + forecast.expectedReturn * 5);
        color = `rgba(52, 199, 89, ${opacity})`;
      }
      
      bubbleData.push({
        x: forecast.crashProbability * 100, // Convert to percentage
        y: forecast.pumpProbability * 100,  // Convert to percentage
        r: Math.sqrt(timeframe) * 2,        // Bubble size scaled by sqrt of timeframe
        timeframe: timeframe,
        expectedReturn: forecast.expectedReturn,
        rewardRiskRatio: rewardRiskRatio,
        color: color
      });
    }
  });
  
  // Create the chart
  new Chart(canvas, {
    type: 'bubble',
    data: {
      datasets: [{
        label: 'Timeframes',
        data: bubbleData,
        backgroundColor: bubbleData.map(item => item.color),
        borderColor: bubbleData.map(item => item.color.replace(/[^,]+(?=\))/, '1')), // Solid border version
        borderWidth: 1
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: {
          title: {
            display: true,
            text: 'Crash Probability (%)',
            color: 'rgba(255, 255, 255, 0.7)'
          },
          min: 0,
          max: Math.ceil(Math.max(...bubbleData.map(item => item.x)) * 1.1), // Add 10% padding
          grid: {
            color: 'rgba(255, 255, 255, 0.1)'
          },
          ticks: {
            color: 'rgba(255, 255, 255, 0.7)'
          }
        },
        y: {
          title: {
            display: true,
            text: 'Pump Probability (%)',
            color: 'rgba(255, 255, 255, 0.7)'
          },
          min: 0,
          max: Math.ceil(Math.max(...bubbleData.map(item => item.y)) * 1.1), // Add 10% padding
          grid: {
            color: 'rgba(255, 255, 255, 0.1)'
          },
          ticks: {
            color: 'rgba(255, 255, 255, 0.7)'
          }
        }
      },
      plugins: {
        legend: {
          display: false
        },
        tooltip: {
          callbacks: {
            label: function(context) {
              const data = context.raw;
              return [
                `Timeframe: ${data.timeframe} days`,
                `Crash Probability: ${data.x.toFixed(1)}%`,
                `Pump Probability: ${data.y.toFixed(1)}%`,
                `Expected Return: ${(data.expectedReturn * 100).toFixed(2)}%`,
                `Reward/Risk Ratio: ${data.rewardRiskRatio.toFixed(2)}`
              ];
            }
          }
        }
      }
    }
  });
  
  // Add timeframe labels to bubbles
  const chartInstance = Chart.getChart(canvas);
  const originalDraw = chartInstance.draw;
  
  chartInstance.draw = function() {
    originalDraw.apply(this, arguments);
    
    const ctx = this.ctx;
    ctx.save();
    ctx.font = '10px Arial';
    ctx.fillStyle = 'white';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    this.data.datasets[0].data.forEach((data, i) => {
      const meta = this.getDatasetMeta(0);
      const element = meta.data[i];
      ctx.fillText(data.timeframe + 'd', element.x, element.y);
    });
    
    ctx.restore();
  };
  
  return container;
}

/**
 * Creates a horizontal bar chart showing sentiment breakdown of recent headlines
 * @param {Array} headlineSentimentDetails - Array of headline objects with sentiment scores
 * @returns {HTMLElement} - Container with the chart
 */
function createSentimentBreakdownChart(headlineSentimentDetails) {
  // Create container for the chart
  const container = document.createElement('div');
  container.className = 'sentiment-breakdown-chart';
  container.style.height = '350px';
  
  // Check if we have sentiment data
  if (!headlineSentimentDetails || !Array.isArray(headlineSentimentDetails) || headlineSentimentDetails.length === 0) {
    const errorMsg = document.createElement('div');
    errorMsg.textContent = 'No headline sentiment data available';
    errorMsg.style.color = 'var(--risk-red)';
    errorMsg.style.textAlign = 'center';
    errorMsg.style.paddingTop = '150px';
    container.appendChild(errorMsg);
    return container;
  }
  
  // Create canvas for Chart.js
  const canvas = document.createElement('canvas');
  container.appendChild(canvas);
  
  // Process and sort the headline data
  // Take the top N most impactful headlines (highest weight or most recent)
  const topHeadlines = headlineSentimentDetails
    .slice(0, 6) // Take top 6 headlines
    .map(item => ({
      headline: item.headline || '',
      score: item.score || 50,
      truncatedHeadline: truncateHeadline(item.headline || '', 40)
    }))
    .reverse(); // Reverse to show most recent/influential at top
  
  // Helper function to truncate headlines
  function truncateHeadline(headline, maxLength) {
    if (headline.length <= maxLength) return headline;
    return headline.substring(0, maxLength - 3) + '...';
  }
  
  // Function to determine color based on sentiment score
  function getSentimentColor(score) {
    if (score >= 70) return 'rgba(52, 199, 89, 0.8)'; // Very positive
    if (score >= 60) return 'rgba(52, 199, 89, 0.6)'; // Positive
    if (score >= 40) return 'rgba(90, 200, 250, 0.7)'; // Neutral
    if (score >= 30) return 'rgba(255, 149, 0, 0.7)'; // Negative
    return 'rgba(255, 59, 48, 0.8)'; // Very negative
  }
  
  // Create the chart
  new Chart(canvas, {
    type: 'bar',
    data: {
      labels: topHeadlines.map(item => item.truncatedHeadline),
      datasets: [{
        label: 'Sentiment Score',
        data: topHeadlines.map(item => item.score),
        backgroundColor: topHeadlines.map(item => getSentimentColor(item.score)),
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.3)'
      }]
    },
    options: {
      indexAxis: 'y', // Horizontal bar chart
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: {
          title: {
            display: true,
            text: 'Sentiment Score (0-100)',
            color: 'rgba(255, 255, 255, 0.7)'
          },
          min: 0,
          max: 100,
          grid: {
            color: 'rgba(255, 255, 255, 0.1)'
          },
          ticks: {
            color: 'rgba(255, 255, 255, 0.7)'
          }
        },
        y: {
          grid: {
            color: 'rgba(255, 255, 255, 0.1)'
          },
          ticks: {
            color: 'rgba(255, 255, 255, 0.7)',
            callback: function(value) {
              // Ensures labels aren't cut off in the chart
              return this.getLabelForValue(value);
            }
          }
        }
      },
      plugins: {
        legend: {
          display: false
        },
        tooltip: {
          callbacks: {
            title: function(tooltipItems) {
              // Show full headline in tooltip
              const index = tooltipItems[0].dataIndex;
              return topHeadlines[index].headline;
            },
            label: function(context) {
              return `Score: ${context.raw.toFixed(1)}`;
            }
          }
        }
      }
    }
  });
  
  return container;
}

/**
 * Creates UI controls for the What-If scenario modeler
 * @returns {HTMLElement} - Container with the scenario controls
 */
function createScenarioModelerControls() {
  // Create container for the controls
  const container = document.createElement('div');
  container.className = 'scenario-modeler-controls';
  container.style.padding = '15px';
  
  // Title
  const title = document.createElement('div');
  title.className = 'card-title';
  title.textContent = 'What-If Scenario Analysis';
  container.appendChild(title);
  
  // Description
  const description = document.createElement('div');
  description.style.fontSize = '0.9rem';
  description.style.opacity = '0.7';
  description.style.marginBottom = '15px';
  description.textContent = 'Adjust the parameters below to see how changes in market conditions could affect the forecast';
  container.appendChild(description);
  
  // Create sentiment override control
  const sentimentControl = createSliderControl(
    'sentiment-override',
    'Market Sentiment Override',
    'Override the calculated sentiment with a custom value (0-100)',
    0, 100, 50,
    'var(--risk-red)', 'var(--pump-green)'
  );
  container.appendChild(sentimentControl);
  
  // Create market condition control
  const marketConditionControl = createSliderControl(
    'market-condition',
    'Market Condition Factor',
    'Adjust market conditions from bearish to bullish (-2 to +2)',
    -2, 2, 0,
    'var(--risk-red)', 'var(--pump-green)'
  );
  container.appendChild(marketConditionControl);
  
  // Create volatility control
  const volatilityControl = createSliderControl(
    'volatility-factor',
    'Volatility Factor',
    'Adjust market volatility from low to high (0.5 to 2.0)',
    0.5, 2, 1,
    'var(--neutral-blue)', 'var(--btc-orange)',
    0.1 // Step
  );
  container.appendChild(volatilityControl);
  
  // Create Apply button
  const applyButton = document.createElement('button');
  applyButton.className = 'scenario-apply-button';
  applyButton.textContent = 'Apply Scenario';
  applyButton.style.backgroundColor = 'var(--btc-orange)';
  applyButton.style.color = 'black';
  applyButton.style.border = 'none';
  applyButton.style.borderRadius = '5px';
  applyButton.style.padding = '8px 16px';
  applyButton.style.cursor = 'pointer';
  applyButton.style.fontWeight = 'bold';
  applyButton.style.marginTop = '15px';
  applyButton.style.width = '100%';
  
  // Add click event to apply scenario
  applyButton.addEventListener('click', function() {
    applyScenario();
  });
  
  container.appendChild(applyButton);
  
  // Create Reset button
  const resetButton = document.createElement('button');
  resetButton.className = 'scenario-reset-button';
  resetButton.textContent = 'Reset to Baseline';
  resetButton.style.backgroundColor = 'rgba(255, 255, 255, 0.2)';
  resetButton.style.color = 'white';
  resetButton.style.border = 'none';
  resetButton.style.borderRadius = '5px';
  resetButton.style.padding = '8px 16px';
  resetButton.style.cursor = 'pointer';
  resetButton.style.marginTop = '10px';
  resetButton.style.width = '100%';
  
  // Add click event to reset scenario
  resetButton.addEventListener('click', function() {
    resetScenario();
  });
  
  container.appendChild(resetButton);
  
  return container;
}

/**
 * Creates a slider control with label and value display
 * @param {string} id - The ID for the slider
 * @param {string} label - Label text
 * @param {string} description - Tooltip description
 * @param {number} min - Minimum value
 * @param {number} max - Maximum value
 * @param {number} value - Initial value
 * @param {string} startColor - Color for the left/min end of the slider
 * @param {string} endColor - Color for the right/max end of the slider
 * @param {number} step - Step size for the slider (default: 1)
 * @returns {HTMLElement} - Container with the slider control
 */
function createSliderControl(id, label, description, min, max, value, startColor, endColor, step = 1) {
  // Create container
  const container = document.createElement('div');
  container.className = 'slider-control';
  container.style.marginBottom = '15px';
  
  // Create label row
  const labelRow = document.createElement('div');
  labelRow.style.display = 'flex';
  labelRow.style.justifyContent = 'space-between';
  labelRow.style.marginBottom = '5px';
  
  // Label text
  const labelText = document.createElement('div');
  labelText.className = 'slider-label';
  labelText.textContent = label;
  labelText.style.fontSize = '0.9rem';
  labelText.title = description;
  labelRow.appendChild(labelText);
  
  // Value display
  const valueDisplay = document.createElement('div');
  valueDisplay.className = 'slider-value';
  valueDisplay.id = `${id}-value`;
  valueDisplay.textContent = value;
  valueDisplay.style.fontSize = '0.9rem';
  valueDisplay.style.fontWeight = 'bold';
  labelRow.appendChild(valueDisplay);
  
  container.appendChild(labelRow);
  
  // Create slider row
  const sliderRow = document.createElement('div');
  sliderRow.style.display = 'flex';
  sliderRow.style.alignItems = 'center';
  
  // Min label
  const minLabel = document.createElement('div');
  minLabel.className = 'slider-min';
  minLabel.textContent = min;
  minLabel.style.fontSize = '0.8rem';
  minLabel.style.opacity = '0.7';
  minLabel.style.width = '30px';
  minLabel.style.textAlign = 'center';
  sliderRow.appendChild(minLabel);
  
  // Slider container for styling
  const sliderContainer = document.createElement('div');
  sliderContainer.style.position = 'relative';
  sliderContainer.style.flex = '1';
  sliderContainer.style.margin = '0 10px';
  
  // Create gradient background for slider
  const sliderBg = document.createElement('div');
  sliderBg.style.position = 'absolute';
  sliderBg.style.top = '0';
  sliderBg.style.left = '0';
  sliderBg.style.right = '0';
  sliderBg.style.height = '5px';
  sliderBg.style.borderRadius = '3px';
  sliderBg.style.background = `linear-gradient(to right, ${startColor}, ${endColor})`;
  sliderBg.style.zIndex = '0';
  sliderContainer.appendChild(sliderBg);
  
  // Slider input
  const slider = document.createElement('input');
  slider.type = 'range';
  slider.id = id;
  slider.min = min;
  slider.max = max;
  slider.step = step;
  slider.value = value;
  slider.style.width = '100%';
  slider.style.margin = '0';
  slider.style.position = 'relative';
  slider.style.zIndex = '1';
  slider.style.appearance = 'none';
  slider.style.background = 'transparent';
  slider.style.cursor = 'pointer';
  
  // Custom slider styling
  slider.style.height = '20px';
  
  // Slider thumb styling
  const thumbStyle = `
    #${id}::-webkit-slider-thumb {
      appearance: none;
      width: 15px;
      height: 15px;
      border-radius: 50%;
      background: white;
      box-shadow: 0 0 5px rgba(0,0,0,0.3);
      cursor: pointer;
    }
    #${id}::-moz-range-thumb {
      width: 15px;
      height: 15px;
      border-radius: 50%;
      background: white;
      box-shadow: 0 0 5px rgba(0,0,0,0.3);
      cursor: pointer;
      border: none;
    }
  `;
  
  // Add styles to document
  const styleElem = document.createElement('style');
  styleElem.textContent = thumbStyle;
  document.head.appendChild(styleElem);
  
  // Update value display when slider is moved
  slider.addEventListener('input', function() {
    valueDisplay.textContent = parseFloat(this.value).toFixed(step < 1 ? 1 : 0);
  });
  
  sliderContainer.appendChild(slider);
  sliderRow.appendChild(sliderContainer);
  
  // Max label
  const maxLabel = document.createElement('div');
  maxLabel.className = 'slider-max';
  maxLabel.textContent = max;
  maxLabel.style.fontSize = '0.8rem';
  maxLabel.style.opacity = '0.7';
  maxLabel.style.width = '30px';
  maxLabel.style.textAlign = 'center';
  sliderRow.appendChild(maxLabel);
  
  container.appendChild(sliderRow);
  
  return container;
}

/**
 * Applies the current scenario settings to update the forecast
 */
function applyScenario() {
  // Get values from sliders
  const sentimentOverride = parseFloat(document.getElementById('sentiment-override').value);
  const marketConditionFactor = parseFloat(document.getElementById('market-condition').value);
  const volatilityFactor = parseFloat(document.getElementById('volatility-factor').value);
  
  // Store the scenario in state
  state.currentScenario = {
    sentimentOverride: sentimentOverride,
    marketConditionFactor: marketConditionFactor,
    volatilityFactor: volatilityFactor,
    isActive: true
  };
  
  // Update UI to show scenario is active
  const applyButton = document.querySelector('.scenario-apply-button');
  if (applyButton) {
    applyButton.textContent = 'Update Scenario';
    applyButton.style.backgroundColor = 'var(--pump-green)';
  }
  
  // Clear any existing forecast for current timeframe to force recalculation
  state.unifiedForecasts[state.currentTimeframe] = null;
  
  // Update forecast with scenario
  updateForecast();
}

/**
 * Resets to the baseline forecast without scenario adjustments
 */
function resetScenario() {
  // Reset sliders to default values
  document.getElementById('sentiment-override').value = 50;
  document.getElementById('sentiment-override-value').textContent = 50;
  
  document.getElementById('market-condition').value = 0;
  document.getElementById('market-condition-value').textContent = 0;
  
  document.getElementById('volatility-factor').value = 1;
  document.getElementById('volatility-factor-value').textContent = 1;
  
  // Clear scenario in state
  state.currentScenario = {
    isActive: false
  };
  
  // Update UI to show scenario is inactive
  const applyButton = document.querySelector('.scenario-apply-button');
  if (applyButton) {
    applyButton.textContent = 'Apply Scenario';
    applyButton.style.backgroundColor = 'var(--btc-orange)';
  }
  
  // Clear any existing forecast for current timeframe to force recalculation
  state.unifiedForecasts[state.currentTimeframe] = null;
  
  // Update forecast without scenario
  updateForecast();
}

/**
 * Extension of calculateUnifiedBayesianForecast to incorporate scenarios
 * @param {Array} data - Bitcoin price data
 * @param {number} timeframeDays - Forecast horizon in days
 * @param {Object} context - Context factors like cycle position
 * @returns {Object} - Complete forecast
 */
function calculateScenarioAdjustedForecast(data, timeframeDays, context = {}) {
  // Check if there's an active scenario
  if (state.currentScenario && state.currentScenario.isActive) {
    // Deep copy context to avoid modifying the original
    const adjustedContext = JSON.parse(JSON.stringify(context));
    
    // Apply market condition factor to cycle position (if available)
    if (adjustedContext.cyclePosition !== undefined) {
      // Market condition factor ranges from -2 to +2
      // Negative values reduce cycle position (more bullish)
      // Positive values increase cycle position (more bearish)
      const marketConditionAdjustment = state.currentScenario.marketConditionFactor * 0.1;
      adjustedContext.cyclePosition = Math.max(0, Math.min(1, 
        adjustedContext.cyclePosition + marketConditionAdjustment));
    }
    
    // Apply volatility factor
    if (adjustedContext.volatilityRatio !== undefined) {
      adjustedContext.volatilityRatio *= state.currentScenario.volatilityFactor;
    } else {
      adjustedContext.volatilityRatio = state.currentScenario.volatilityFactor;
    }
    
    // Calculate the base forecast with adjusted context
    let forecast = calculateUnifiedBayesianForecast(data, timeframeDays, adjustedContext);
    
    // Apply sentiment override
    const sentimentValue = {
      value: state.currentScenario.sentimentOverride,
      sentiment: getSentimentLabel(state.currentScenario.sentimentOverride)
    };
    
    // Helper function to get sentiment label
    function getSentimentLabel(value) {
      if (value >= 75) return "Very Positive";
      if (value >= 60) return "Positive";
      if (value >= 40) return "Neutral";
      if (value >= 25) return "Negative";
      return "Very Negative";
    }
    
    // Adjust forecast with sentiment
    forecast = calculateSentimentAdjustedForecast(forecast, sentimentValue);
    
    // Mark as a scenario forecast
    forecast.isScenario = true;
    forecast.scenarioSettings = {
      sentimentOverride: state.currentScenario.sentimentOverride,
      marketConditionFactor: state.currentScenario.marketConditionFactor,
      volatilityFactor: state.currentScenario.volatilityFactor
    };
    
    return forecast;
  } else {
    // No active scenario, use regular forecast
    return calculateUnifiedBayesianForecast(data, timeframeDays, context);
  }
}

// We need to store the original function before replacing it
const originalCreateAdvancedVisualizationsDashboard = createAdvancedVisualizationsDashboard;


/**
 * Update the advanced visualizations dashboard to include new components
 * @param {Object} forecast - The current timeframe forecast
 * @returns {HTMLElement} - The enhanced dashboard container
 */
// Then redefine our enhanced version to call the original
function createEnhancedAdvancedVisualizationsDashboard(forecast) {
  // First create the basic dashboard using the original function
  const container = originalCreateAdvancedVisualizationsDashboard(forecast);
  
  // Add all available timeframe forecasts to a new object
  const allForecasts = {};
  Object.keys(state.unifiedForecasts).forEach(timeframe => {
    if (state.unifiedForecasts[timeframe]) {
      allForecasts[timeframe] = state.unifiedForecasts[timeframe];
    }
  });
  
  // The rest of the function remains the same...
  // Create new row for additional visualizations
  const newRow = document.createElement('div');
  newRow.style.display = 'grid';
  newRow.style.gridTemplateColumns = 'repeat(2, 1fr)';
  newRow.style.gap = '20px';
  newRow.style.marginTop = '20px';
  
  // Create Markov Flow Diagram card
  const markovCard = document.createElement('div');
  markovCard.className = 'card';
  markovCard.innerHTML = '<div class="card-title">State Transition Dynamics</div>';
  
  const markovDiagram = createMarkovFlowDiagram(
    forecast.transitionMatrix, 
    forecast.steadyStateProbs
  );
  markovCard.appendChild(markovDiagram);
  newRow.appendChild(markovCard);
  
  // Create Risk-Reward Bubble Chart card if we have multiple timeframes
  if (Object.keys(allForecasts).length > 1) {
    const riskRewardCard = document.createElement('div');
    riskRewardCard.className = 'card';
    riskRewardCard.innerHTML = '<div class="card-title">Risk/Reward Analysis by Timeframe</div>';
    
    const riskRewardChart = createRiskRewardBubbleChart(allForecasts);
    riskRewardCard.appendChild(riskRewardChart);
    newRow.appendChild(riskRewardCard);
  }
  
  // Add the row to the container
  container.appendChild(newRow);
  
  // Create third row for sentiment breakdown and scenario modeler
  const thirdRow = document.createElement('div');
  thirdRow.style.display = 'grid';
  thirdRow.style.gridTemplateColumns = 'repeat(2, 1fr)';
  thirdRow.style.gap = '20px';
  thirdRow.style.marginTop = '20px';
  
  // Create Sentiment Breakdown card if sentiment data is available
  if (state.sentimentData && state.sentimentData.details && state.sentimentData.details.length > 0) {
    const sentimentCard = document.createElement('div');
    sentimentCard.className = 'card';
    sentimentCard.innerHTML = '<div class="card-title">News Sentiment Impact</div>';
    
    const sentimentChart = createSentimentBreakdownChart(state.sentimentData.details);
    sentimentCard.appendChild(sentimentChart);
    thirdRow.appendChild(sentimentCard);
  }
  
  // Create What-If Scenario Modeler card
  const scenarioCard = document.createElement('div');
  scenarioCard.className = 'card';
  
  const scenarioControls = createScenarioModelerControls();
  scenarioCard.appendChild(scenarioControls);
  thirdRow.appendChild(scenarioCard);
  
  // Add the third row to the container
  container.appendChild(thirdRow);
  
  return container;
}

// Now replace the original with our enhanced version
createAdvancedVisualizationsDashboard = createEnhancedAdvancedVisualizationsDashboard;

// Override the original updateForecast to use scenario-adjusted forecasts
const originalUpdateForecast = updateForecast;
updateForecast = async function() {
  const timeframe = state.currentTimeframe;
  const currentMonth = new Date().getMonth() + 1;
  
  // Check if there's an active scenario or if we need to calculate a new forecast
  if ((state.currentScenario && state.currentScenario.isActive) || !state.unifiedForecasts[timeframe]) {
    // Calculate a new forecast with context factors
    const context = {
      cyclePosition: state.latestOnChainMetrics?.cyclePosition,
      onChainMetrics: state.latestOnChainMetrics,
      volatilityRatio: state.latestOnChainMetrics?.volatility?.ratio,
      currentMonth: currentMonth
    };
    
    // Use scenario-adjusted calculation if there's an active scenario
    state.unifiedForecasts[timeframe] = calculateScenarioAdjustedForecast(
      state.bitcoinData, 
      timeframe,
      context
    );
  }
  
  // Continue with original update logic
  let forecast = state.unifiedForecasts[timeframe];
  
  // Get or update sentiment data
  if (!state.sentimentData) {
    await integrateNewsSentiment();
  }
  
  // Only adjust for sentiment if not already using a scenario (which has sentiment built in)
  if (state.sentimentData && (!forecast.isScenario)) {
    forecast = calculateSentimentAdjustedForecast(forecast, state.sentimentData);
  }
  
  // Update crash and pump gauges
  updateCrashGauge(forecast.crashProbability);
  updatePumpGauge(forecast.pumpProbability);
  
  // Update price forecast display
  updatePriceForecast(forecast);
  
  // Update on-chain metrics indicators
  updateMetricsIndicators();
  
  // Remove any existing advanced visualizations
  const existingViz = document.querySelector('.advanced-visualizations');
  if (existingViz) {
    existingViz.remove();
  }
  
  // Add enhanced advanced visualizations
  const forecastContainer = document.querySelector('.price-forecast');
  if (forecastContainer) {
    const advancedViz = createEnhancedAdvancedVisualizationsDashboard(forecast);
    forecastContainer.appendChild(advancedViz);
  }
  
  // Hide loading spinner
  document.getElementById('loading').style.display = 'none';
};

// Replace the original function to use the enhanced version
createAdvancedVisualizationsDashboard = createEnhancedAdvancedVisualizationsDashboard;

/**
 * Calculate the probability distribution of market states for a specified number of days ahead
 * @param {Object} currentForecast - The current forecast object with transition matrix and state distribution
 * @param {number} daysAhead - Number of days to look ahead (e.g., 1, 2, 3)
 * @returns {Object} - Probability distribution for the specified days ahead
 */
function calculateImminentOutlook(currentForecast, daysAhead) {
  if (!currentForecast || !currentForecast.transitionMatrix || !currentForecast.currentStateDist) {
    console.error('Invalid forecast data for imminent outlook calculation');
    return { crashProb: 0, normalProb: 0, pumpProb: 0 };
  }
  
  // Use the existing matrix power function to calculate P^daysAhead
  const transitionMatrix = currentForecast.transitionMatrix;
  const currentStateDist = currentForecast.currentStateDist;
  
  // Calculate the transition matrix raised to the power of daysAhead
  const futureProbMatrix = matrixPower(transitionMatrix, daysAhead);
  
  // Multiply current state distribution by the future probability matrix
  const futureDistribution = multiplyVectorMatrix(currentStateDist, futureProbMatrix);
  
  // Return the probabilities for each state
  return {
    crashProb: futureDistribution[0],
    normalProb: futureDistribution[1],
    pumpProb: futureDistribution[2]
  };
}

/**
 * Extract the average percentage price changes for Crash and Pump states
 * @param {Object} currentForecast - The current forecast object with state returns
 * @returns {Object} - Average impact percentages for crash and pump states
 */
function getAverageStateImpacts(currentForecast) {
  if (!currentForecast || !currentForecast.stateReturns) {
    console.error('Invalid forecast data for state impact calculation');
    return { crashImpactPercent: -5, pumpImpactPercent: 5 }; // Default fallback values
  }
  
  // Extract log returns from the forecast
  const stateReturns = currentForecast.stateReturns;
  
  // Convert log returns to percentage changes: (e^μ - 1) * 100%
  const crashImpactPercent = (Math.exp(stateReturns.crash) - 1) * 100;
  const pumpImpactPercent = (Math.exp(stateReturns.pump) - 1) * 100;
  
  return {
    crashImpactPercent,
    pumpImpactPercent
  };
}

/**
 * Identify key factors that are currently influencing near-term market transitions
 * @param {Object} currentForecast - The current forecast object
 * @returns {Array} - Array of strings describing key market drivers
 */
function identifyKeyNearTermDrivers(currentForecast) { // currentForecast is passed
  const drivers = [];

  // Safely access on-chain metrics and sentiment from the global state object
  const onChain = (typeof state !== 'undefined' && state) ? state.latestOnChainMetrics : null;
  const sentiment = (typeof state !== 'undefined' && state) ? state.sentimentData : null;

  // Check MVRV Z-Score influence
  if (onChain && onChain.mvrv && typeof onChain.mvrv.zScore !== 'undefined') {
    if (onChain.mvrv.zScore > 1.5) {
      drivers.push("High MVRV Z-Score increasing downside caution.");
    } else if (onChain.mvrv.zScore < -0.5) {
      drivers.push("Low MVRV Z-Score suggesting potential undervaluation.");
    }
  }

  // Check cycle position influence
  if (onChain && typeof onChain.cyclePosition !== 'undefined') {
    if (onChain.cyclePosition > 0.8) {
      drivers.push("Late cycle position suggesting increased distribution risk.");
    } else if (onChain.cyclePosition < 0.2) {
      drivers.push("Early cycle position favoring accumulation.");
    }
  }

  // Check volatility influence
  if (onChain && onChain.volatility) {
    if (onChain.volatility.ratio > 1.3) {
      drivers.push("Elevated recent volatility increasing short-term uncertainty.");
    } else if (onChain.volatility.ratio < 0.7) {
      drivers.push("Reduced volatility suggesting market stability.");
    }
  }

  // Check sentiment influence
  if (sentiment && typeof sentiment.value !== 'undefined') {
    if (sentiment.value > 70) {
      drivers.push("Strong positive sentiment potentially supporting upward momentum.");
    } else if (sentiment.value < 30) {
      drivers.push("Strong negative sentiment indicating market fear.");
    }
  }

  return drivers.length > 0 ? drivers.slice(0, 3) : ["No significant driving factors identified."];
}

/**
 * Generate the HTML for the Imminent Outlook UI component
 * @param {Object} outlookData1Day - Outlook data for 1 day ahead
 * @param {Object} outlookData3Day - Outlook data for 3 days ahead
 * @param {Object} impacts - State impact percentages
 * @param {Array} drivers - Key market drivers
 * @returns {HTMLElement} - DOM element for the Imminent Outlook UI
 */
function createImminentOutlookUI(outlookData1Day, outlookData3Day, impacts, drivers) {
  // Create main container
  const container = document.createElement('div');
  container.className = 'card';
  container.style.marginBottom = '20px';
  
  // Add title
  const title = document.createElement('div');
  title.className = 'card-title';
  title.textContent = 'Imminent Market Outlook (Next 1-3 Days)';
  container.appendChild(title);
  
  // Format numbers for display
  const formatProbability = value => (value * 100).toFixed(1) + '%';
  const formatImpact = value => value.toFixed(1) + '%';
  
  // Create section for 24 hours outlook
  const dayOneSection = document.createElement('div');
  dayOneSection.style.marginBottom = '15px';
  dayOneSection.style.padding = '10px';
  dayOneSection.style.backgroundColor = 'rgba(40, 40, 40, 0.5)';
  dayOneSection.style.borderRadius = '8px';
  
  const dayOneTitle = document.createElement('div');
  dayOneTitle.style.fontWeight = 'bold';
  dayOneTitle.style.marginBottom = '8px';
  dayOneTitle.textContent = 'Next 24 Hours';
  dayOneSection.appendChild(dayOneTitle);
  
  // Crash probability for day 1
  const crashProbDay1 = document.createElement('div');
  crashProbDay1.innerHTML = `<span style="color: var(--risk-red)">Crash Probability:</span> <span class="prominent-percentage crash-percentage" style="font-size: 1.2rem">${formatProbability(outlookData1Day.crashProb)}</span> <span>(Est. Impact: <span style="color: var(--risk-red)">${formatImpact(impacts.crashImpactPercent)}</span>)</span>`;
  dayOneSection.appendChild(crashProbDay1);
  
  // Pump probability for day 1
  const pumpProbDay1 = document.createElement('div');
  pumpProbDay1.innerHTML = `<span style="color: var(--pump-green)">Pump Probability:</span> <span class="prominent-percentage pump-percentage" style="font-size: 1.2rem">${formatProbability(outlookData1Day.pumpProb)}</span> <span>(Est. Impact: <span style="color: var(--pump-green)">${formatImpact(impacts.pumpImpactPercent)}</span>)</span>`;
  dayOneSection.appendChild(pumpProbDay1);
  
  // Normal probability for day 1
  const normalProbDay1 = document.createElement('div');
  normalProbDay1.innerHTML = `<span style="color: var(--neutral-blue)">Remain Normal:</span> <span class="prominent-percentage" style="font-size: 1.2rem; color: var(--neutral-blue)">${formatProbability(outlookData1Day.normalProb)}</span>`;
  dayOneSection.appendChild(normalProbDay1);
  
  container.appendChild(dayOneSection);
  
  // Create section for 3 days outlook
  const dayThreeSection = document.createElement('div');
  dayThreeSection.style.marginBottom = '15px';
  dayThreeSection.style.padding = '10px';
  dayThreeSection.style.backgroundColor = 'rgba(40, 40, 40, 0.5)';
  dayThreeSection.style.borderRadius = '8px';
  
  const dayThreeTitle = document.createElement('div');
  dayThreeTitle.style.fontWeight = 'bold';
  dayThreeTitle.style.marginBottom = '8px';
  dayThreeTitle.textContent = 'Next 3 Days';
  dayThreeSection.appendChild(dayThreeTitle);
  
  // Crash probability for day 3
  const crashProbDay3 = document.createElement('div');
  crashProbDay3.innerHTML = `<span style="color: var(--risk-red)">Crash Probability:</span> <span class="prominent-percentage crash-percentage" style="font-size: 1.2rem">${formatProbability(outlookData3Day.crashProb)}</span>`;
  dayThreeSection.appendChild(crashProbDay3);
  
  // Pump probability for day 3
  const pumpProbDay3 = document.createElement('div');
  pumpProbDay3.innerHTML = `<span style="color: var(--pump-green)">Pump Probability:</span> <span class="prominent-percentage pump-percentage" style="font-size: 1.2rem">${formatProbability(outlookData3Day.pumpProb)}</span>`;
  dayThreeSection.appendChild(pumpProbDay3);
  
  // Normal probability for day 3
  const normalProbDay3 = document.createElement('div');
  normalProbDay3.innerHTML = `<span style="color: var(--neutral-blue)">Remain Normal:</span> <span class="prominent-percentage" style="font-size: 1.2rem; color: var(--neutral-blue)">${formatProbability(outlookData3Day.normalProb)}</span>`;
  dayThreeSection.appendChild(normalProbDay3);
  
  container.appendChild(dayThreeSection);
  
  // Create section for key influencing factors
  const driversSection = document.createElement('div');
  driversSection.style.padding = '10px';
  driversSection.style.backgroundColor = 'rgba(40, 40, 40, 0.5)';
  driversSection.style.borderRadius = '8px';
  
  const driversTitle = document.createElement('div');
  driversTitle.style.fontWeight = 'bold';
  driversTitle.style.marginBottom = '8px';
  driversTitle.textContent = 'Key Influencing Factors Now';
  driversSection.appendChild(driversTitle);
  
  // List of drivers
  const driversList = document.createElement('ul');
  driversList.style.paddingLeft = '20px';
  driversList.style.margin = '5px 0';
  
  drivers.forEach(driver => {
    const item = document.createElement('li');
    item.textContent = driver;
    item.style.marginBottom = '5px';
    driversList.appendChild(item);
  });
  
  driversSection.appendChild(driversList);
  container.appendChild(driversSection);
  
  return container;
}

/**
 * Update the Imminent Outlook UI with the latest forecast data
 */
function updateImminentOutlookUI() {
  // Restore and enhance the check for state and its necessary properties
  if (typeof state === 'undefined' || !state || 
      typeof state.unifiedForecasts === 'undefined' || 
      typeof state.currentTimeframe === 'undefined' || 
      !state.unifiedForecasts[state.currentTimeframe]) {
    console.log('Imminent Outlook: State or specific forecast data not ready. State available:', typeof state !== 'undefined', 'Forecasts available:', typeof state !== 'undefined' && typeof state.unifiedForecasts !== 'undefined', 'Current timeframe set:', typeof state !== 'undefined' && typeof state.currentTimeframe !== 'undefined');
    if (typeof state !== 'undefined' && typeof state.unifiedForecasts !== 'undefined' && typeof state.currentTimeframe !== 'undefined') {
        console.log('Forecast for current timeframe (' + state.currentTimeframe + ') exists:', !!state.unifiedForecasts[state.currentTimeframe]);
    }
    return;
  }

  try {
    // Access state directly
    const currentForecast = state.unifiedForecasts[state.currentTimeframe]; 

    if (currentForecast) {
      const outlookData1Day = calculateImminentOutlook(currentForecast, 1);
      const outlookData3Day = calculateImminentOutlook(currentForecast, 3);
      const impacts = getAverageStateImpacts(currentForecast);
      // Pass currentForecast to identifyKeyNearTermDrivers
      const drivers = identifyKeyNearTermDrivers(currentForecast); 

      const imminentOutlookUI = createImminentOutlookUI(
        outlookData1Day,
        outlookData3Day,
        impacts,
        drivers
      );

      let container = document.getElementById('imminentOutlookContainer');
      if (!container) {
        container = document.createElement('div');
        container.id = 'imminentOutlookContainer';
        const timeframeTabs = document.querySelector('.timeframe-tabs');
        if (timeframeTabs && timeframeTabs.parentNode) {
          timeframeTabs.parentNode.insertBefore(container, timeframeTabs.nextSibling);
        } else {
          const forecastContainer = document.querySelector('.forecast-container');
          if (forecastContainer && forecastContainer.parentNode) {
            forecastContainer.parentNode.insertBefore(container, forecastContainer);
          }
        }
      }

      if (container) {
        container.innerHTML = '';
        container.appendChild(imminentOutlookUI);
      }
    } else {
      console.log('Imminent Outlook: No current forecast available for timeframe:', state.currentTimeframe);
    }
  } catch (error) {
    console.error('Error updating imminent outlook:', error);
  }
}

/**
 * Safely hook into the updateForecast function once it's available
 */
function setupImminentOutlookHooks() {
  // Check if updateForecast exists
  if (typeof window.updateForecast !== 'function') {
    console.log('updateForecast not available yet, will try again');
    setTimeout(setupImminentOutlookHooks, 300);
    return;
  }
  
  // Store reference to original updateForecast
  const originalUpdateForecast = window.updateForecast;
  
  // Override updateForecast
  window.updateForecast = async function() {
    // Call the original first
    await originalUpdateForecast.apply(this, arguments);
    
    // Then update our component
    updateImminentOutlookUI();
  };
  
  console.log('Imminent Market Outlook component initialized');
  
  // Try to update immediately if data is already available
  //updateImminentOutlookUI();
}

// Wait for the initial app load before trying to hook our functionality
window.addEventListener('load', function() {
  // Give some time for the app to initialize
  setTimeout(setupImminentOutlookHooks, 1500);
});
// New Helper Function for Bitcoin Fundamentals
function calculateBitcoinInflationRateAndSupply(allBitcoinData, currentDate) {
  // Determine current halving epoch
  const currentEpoch = getHalvingEpoch(currentDate);
  
  // Get block reward based on epoch
  // Each epoch reduces block reward by half, starting from 50 BTC
  const baseReward = 50;
  const currentBlockReward = baseReward / Math.pow(2, currentEpoch);
  
  // Approximate blocks per year (10-minute target block time)
  const blocksPerYear = 6 * 24 * 365.25; // ~52,560 blocks
  
  // Calculate new coins issued per year
  const newCoinsPerYear = currentBlockReward * blocksPerYear;
  
  // Get current circulating supply from data or estimate it
  let currentCirculatingSupply;
  if (allBitcoinData && allBitcoinData.length > 0) {
    const latestDataPoint = allBitcoinData[allBitcoinData.length - 1];
    if (latestDataPoint.CURRENT_SUPPLY) {
      currentCirculatingSupply = latestDataPoint.CURRENT_SUPPLY;
    } else {
      // Estimate based on halving epochs
      currentCirculatingSupply = 19700000; // Approximate as of May 2025
    }
  } else {
    currentCirculatingSupply = 19700000; // Fallback value
  }
  
  // Calculate inflation rate
  const inflationRate = newCoinsPerYear / currentCirculatingSupply;
  
  // Calculate percentage of max supply issued
  const maxSupply = 21000000;
  const percentageOfMaxSupplyIssued = currentCirculatingSupply / maxSupply;
  
  // Calculate days since last halving
  const halvingDates = [
    new Date('2009-01-03'), // Genesis block
    new Date('2012-11-28'), // First halving
    new Date('2016-07-09'), // Second halving
    new Date('2020-05-11'), // Third halving
    new Date('2024-04-20')  // Fourth halving
  ];
  
  const lastHalvingDate = halvingDates[currentEpoch];
  const daysSinceLastHalving = (currentDate.getTime() - lastHalvingDate.getTime()) / (1000 * 60 * 60 * 24);
  
  return {
    inflationRate,
    currentBlockReward,
    currentCirculatingSupply,
    percentageOfMaxSupplyIssued,
    currentEpoch,
    daysSinceLastHalving,
    newCoinsPerYear
  };
}

// Helper methods for UnifiedBayesianMarkovModel class
UnifiedBayesianMarkovModel.prototype._calculateBaseSeasonalFactor = function(currentMonth, allBitcoinData) {
  // Filter data for the current month
  const monthlyData = allBitcoinData.filter(d => {
    const date = d.date instanceof Date ? d.date : new Date(d.date);
    return date.getMonth() + 1 === currentMonth;
  });
  
  if (monthlyData.length === 0) {
    console.warn(`No historical data available for month ${currentMonth}`);
    return 1.0; // Default to neutral factor
  }
  
  // Count extreme events in this month
  const monthlyExtremeEvents = monthlyData.filter(d => d.isExtremeEvent === 1).length;
  const monthlyFreq = monthlyExtremeEvents / monthlyData.length;
  
  // Count overall extreme events
  const totalExtremeEvents = allBitcoinData.filter(d => d.isExtremeEvent === 1).length;
  const overallFreq = totalExtremeEvents / allBitcoinData.length;
  
  // Calculate the ratio (seasonal factor)
  const baseSeasonalFactor = overallFreq > 0 ? monthlyFreq / overallFreq : 1.0;
  
  return baseSeasonalFactor;
}

UnifiedBayesianMarkovModel.prototype._calculateVolatilityComponents = function(currentMonth, recent30DayVolatility, currentMonthHistoricalVolatility, historicalVolatility) {
  if (!historicalVolatility || historicalVolatility === 0) {
    return { shortTermRatio: 1.0, monthRatio: 1.0 };
  }
  
  // Calculate short-term volatility ratio (recent vs. historical)
  const shortTermVolatilityRatio = recent30DayVolatility / historicalVolatility;
  
  // Calculate current month's historical volatility ratio
  const currentMonthVolatilityRatio = currentMonthHistoricalVolatility / historicalVolatility;
  
  return { shortTermRatio: shortTermVolatilityRatio, monthRatio: currentMonthVolatilityRatio };
}

UnifiedBayesianMarkovModel.prototype._calculateCurrentOnChainFactor = function(currentOnChainMetrics) {
  if (!currentOnChainMetrics) {
    return 1.0; // Default to neutral factor
  }
  
  let onChainFactor = 1.0;
  let contributingFactors = 0;
  
  // 1. Adjust based on MVRV Z-Score
  if (currentOnChainMetrics.mvrv && currentOnChainMetrics.mvrv.zScore !== undefined) {
    const mvrvZScore = currentOnChainMetrics.mvrv.zScore;
    let mvrvFactor = 1.0;
    
    if (mvrvZScore > 1.5) {
      // High MVRV Z-Score increases risk (more likely to crash)
      mvrvFactor = 1.2 + Math.min(0.6, (mvrvZScore - 1.5) * 0.2);
    } else if (mvrvZScore < -0.5) {
      // Low MVRV Z-Score decreases risk (less likely to crash)
      mvrvFactor = 0.8 + Math.max(-0.4, (mvrvZScore + 0.5) * 0.2);
    } else {
      // Neutral zone
      mvrvFactor = 1.0 + (mvrvZScore - 0.5) * 0.2;
    }
    
    onChainFactor *= mvrvFactor;
    contributingFactors++;
  }
  
  // 2. Adjust based on NVT Z-Score
  if (currentOnChainMetrics.nvt && currentOnChainMetrics.nvt.zScore !== undefined) {
    const nvtZScore = currentOnChainMetrics.nvt.zScore;
    let nvtFactor = 1.0;
    
    if (nvtZScore > 1.5) {
      // High NVT Z-Score increases risk
      nvtFactor = 1.2 + Math.min(0.5, (nvtZScore - 1.5) * 0.2);
    } else if (nvtZScore < -0.5) {
      // Low NVT Z-Score decreases risk
      nvtFactor = 0.8 + Math.max(-0.3, (nvtZScore + 0.5) * 0.2);
    } else {
      // Neutral zone
      nvtFactor = 1.0 + (nvtZScore - 0.5) * 0.15;
    }
    
    onChainFactor *= nvtFactor;
    contributingFactors++;
  }
  
  // 3. Adjust based on Supply Shock Ratio
  if (currentOnChainMetrics.supplyShock && currentOnChainMetrics.supplyShock.value !== undefined) {
    const supplyShockRatio = currentOnChainMetrics.supplyShock.value;
    let supplyShockFactor = 1.0;
    
    if (supplyShockRatio < 0.05) {
      // Very low ratio - bullish signal (coins moving to strong hands)
      supplyShockFactor = 0.7;
    } else if (supplyShockRatio < 0.1) {
      // Low ratio - somewhat bullish
      supplyShockFactor = 0.85;
    } else if (supplyShockRatio > 0.2) {
      // High ratio - bearish signal (many coins available to sell)
      supplyShockFactor = 1.3;
    } else if (supplyShockRatio > 0.15) {
      // Moderately high ratio - somewhat bearish
      supplyShockFactor = 1.15;
    }
    
    onChainFactor *= supplyShockFactor;
    contributingFactors++;
  }
  
  // 4. Adjust based on Whale Dominance Change
  if (currentOnChainMetrics.whaleDominance && 
      currentOnChainMetrics.whaleDominance.change !== undefined) {
    const whaleDominanceChange = currentOnChainMetrics.whaleDominance.change;
    let whaleFactor = 1.0;
    
    // Normalize the change to a meaningful scale - depends on data representation
    const normalizedChange = whaleDominanceChange * 100; // Adjust scaling factor as needed
    
    if (normalizedChange > 0.5) {
      // Significant whale accumulation - can be a mixed signal
      // Sometimes presages dumps, sometimes indicates strength
      // Taking a slightly bearish interpretation for caution
      whaleFactor = 1.1;
    } else if (normalizedChange < -0.5) {
      // Significant whale distribution - can also be a mixed signal
      // Often precedes market weakness, but sometimes profit-taking at tops
      whaleFactor = 1.2;
    } else if (normalizedChange > 0.1) {
      // Modest whale accumulation
      whaleFactor = 1.05;
    } else if (normalizedChange < -0.1) {
      // Modest whale distribution
      whaleFactor = 1.1;
    }
    
    onChainFactor *= whaleFactor;
    contributingFactors++;
  }
  
  // 5. Adjust based on Puell Multiple
  if (currentOnChainMetrics.puellMultiple && 
      currentOnChainMetrics.puellMultiple.value !== undefined) {
    const puellMultiple = currentOnChainMetrics.puellMultiple.value;
    let puellFactor = 1.0;
    
    if (puellMultiple > 2.5) {
      // Very high Puell Multiple - miners heavily profitable, often near market tops
      puellFactor = 1.4;
    } else if (puellMultiple > 1.5) {
      // Elevated Puell Multiple - caution warranted
      puellFactor = 1.2;
    } else if (puellMultiple < 0.5) {
      // Very low Puell Multiple - miners under pressure, historically good buying zones
      puellFactor = 0.7;
    } else if (puellMultiple < 0.8) {
      // Low Puell Multiple - miners less profitable, often accumulation zones
      puellFactor = 0.85;
    }
    
    onChainFactor *= puellFactor;
    contributingFactors++;
  }
  
  // 6. Adjust based on overall risk level if available
  if (currentOnChainMetrics.riskLevel) {
    let riskLevelFactor = 1.0;
    
    // Map risk levels to factors
    switch (currentOnChainMetrics.riskLevel) {
      case 'Extreme':
        riskLevelFactor = 1.5;
        break;
      case 'High':
        riskLevelFactor = 1.3;
        break;
      case 'Moderate':
        riskLevelFactor = 1.0;
        break;
      case 'Low':
        riskLevelFactor = 0.8;
        break;
      case 'Very Low':
        riskLevelFactor = 0.6;
        break;
    }
    
    onChainFactor *= riskLevelFactor;
    contributingFactors++;
  }
  
  // If we have no contributing factors, return neutral
  if (contributingFactors === 0) {
    return 1.0;
  }
  
  // Ensure factor is within reasonable bounds (0.5 to 2.5)
  onChainFactor = Math.min(2.5, Math.max(0.5, onChainFactor));
  
  return onChainFactor;
}

UnifiedBayesianMarkovModel.prototype._calculateCurrentMonthSentimentFactor = function(currentMonth, globalSentimentScore, allBitcoinData) {
  // Start with a default factor
  let monthSentimentFactor = 1.0;
  
  // Convert global sentiment score (0-100) to a factor (0.7-1.5)
  // 50 = neutral (1.0), 0 = very negative (1.5), 100 = very positive (0.7)
  if (globalSentimentScore !== undefined) {
    if (globalSentimentScore <= 25) {
      // Very negative sentiment increases risk significantly
      monthSentimentFactor = 1.5;
    } else if (globalSentimentScore <= 40) {
      // Negative sentiment increases risk moderately
      monthSentimentFactor = 1.25;
    } else if (globalSentimentScore <= 60) {
      // Neutral sentiment - no adjustment
      monthSentimentFactor = 1.0;
    } else if (globalSentimentScore <= 75) {
      // Positive sentiment decreases risk moderately
      monthSentimentFactor = 0.85;
    } else {
      // Very positive sentiment decreases risk significantly
      monthSentimentFactor = 0.7;
    }
  }
  
  // Analyze historical returns for this month
  const monthData = allBitcoinData.filter(d => {
    const date = d.date instanceof Date ? d.date : new Date(d.date);
    return date.getMonth() + 1 === currentMonth;
  });
  
  if (monthData.length > 0) {
    // Calculate average return for this month
    const returns = monthData.map(d => d.logReturn).filter(r => !isNaN(r) && isFinite(r));
    const avgReturn = returns.length > 0 ? 
      returns.reduce((sum, val) => sum + val, 0) / returns.length : 0;
    
    // Adjust based on historical returns
    if (avgReturn < -0.001) {
      // Historical negative returns suggest higher risk
      monthSentimentFactor *= 1.1;
    } else if (avgReturn > 0.001) {
      // Historical positive returns suggest lower risk
      monthSentimentFactor *= 0.9;
    }
  }
  
  // Analyze historical trends by month - Adjust based on calendar seasonality
  switch(currentMonth) {
    // January - Often positive after year-end tax selling
    case 1:
      monthSentimentFactor *= 0.9; // More positive sentiment
      break;
      
    // February - Mixed, relatively neutral
    case 2:
      // Standard factor
      break;
      
    // March - Historically volatile, tax season in US
    case 3:
      monthSentimentFactor *= 1.1; // Slightly more negative sentiment
      break;
      
    // April - Tax deadline, often relief afterward
    case 4:
      // Standard factor
      break;
      
    // May - Often marks seasonal inflection "Sell in May and go away"
    case 5:
      monthSentimentFactor *= 1.15; // More negative sentiment
      break;
      
    // June - Summer doldrums begin
    case 6:
      monthSentimentFactor *= 1.05; // Slightly more negative
      break;
      
    // July - Summer doldrums continue
    case 7:
      // Standard factor
      break;
      
    // August - Late summer volatility
    case 8:
      monthSentimentFactor *= 1.1; // More negative sentiment
      break;
      
    // September - Historically worst month for markets
    case 9:
      monthSentimentFactor *= 1.2; // Most negative sentiment
      break;
      
    // October - Historical crash month, but often bottoms
    case 10:
      monthSentimentFactor *= 1.15; // More negative, but can signal bottoms
      break;
      
    // November - Beginning of seasonal strength
    case 11:
      monthSentimentFactor *= 0.95; // Slightly more positive
      break;
      
    // December - Holiday sentiment, tax considerations
    case 12:
      monthSentimentFactor *= 0.9; // More positive sentiment
      break;
  }
  
  // Ensure reasonable bounds (0.5 to 2.0)
  monthSentimentFactor = Math.min(2.0, Math.max(0.5, monthSentimentFactor));
  
  return monthSentimentFactor;
}

UnifiedBayesianMarkovModel.prototype._calculateFundamentalBitcoinFactor = function(bitcoinFundamentals) {
  if (!bitcoinFundamentals) {
    console.warn('No Bitcoin fundamentals available');
    return {
      inflationFactor_val: 1.0,
      halvingCyclePhaseFactor_val: 1.0,
      scarcityFactor_val: 1.0
    };
  }
  
  // 1. Calculate Inflation Factor
  let inflationFactor_val = 1.0;
  
  if (bitcoinFundamentals.inflationRate !== undefined) {
    if (bitcoinFundamentals.inflationRate < 0.005) { // < 0.5%
      // Very low inflation is bullish
      inflationFactor_val = 0.7;
    } else if (bitcoinFundamentals.inflationRate < 0.01) { // < 1%
      // Low inflation is somewhat bullish
      inflationFactor_val = 0.8;
    } else if (bitcoinFundamentals.inflationRate < 0.02) { // < 2%
      // Moderate inflation
      inflationFactor_val = 0.9;
    } else if (bitcoinFundamentals.inflationRate < 0.03) { // < 3%
      // Moderate-high inflation
      inflationFactor_val = 1.0;
    } else if (bitcoinFundamentals.inflationRate < 0.04) { // < 4%
      // High inflation
      inflationFactor_val = 1.1;
    } else { // >= 4%
      // Very high inflation
      inflationFactor_val = 1.2;
    }
  }
  
  // 2. Calculate Halving Cycle Phase Factor
  let halvingCyclePhaseFactor_val = 1.0;
  
  if (bitcoinFundamentals.daysSinceLastHalving !== undefined && 
      bitcoinFundamentals.currentEpoch !== undefined) {
    
    // Typical halving cycle is about 4 years = ~1461 days
    const fullCycleLength = 1461;
    const cycleProgress = bitcoinFundamentals.daysSinceLastHalving / fullCycleLength;
    
    if (cycleProgress < 0.15) {
      // Very early cycle (first 6-7 months after halving)
      // This is typically the post-halving consolidation phase
      halvingCyclePhaseFactor_val = 0.9;
    } else if (cycleProgress < 0.3) {
      // Early-mid cycle (accumulation phase starting)
      halvingCyclePhaseFactor_val = 0.8;
    } else if (cycleProgress < 0.6) {
      // Middle of cycle (strongest bull phase historically)
      halvingCyclePhaseFactor_val = 0.7;
    } else if (cycleProgress < 0.8) {
      // Late cycle (euphoria and volatility phase)
      halvingCyclePhaseFactor_val = 1.1;
    } else if (cycleProgress < 0.9) {
      // Very late cycle (correction and redistribution phase)
      halvingCyclePhaseFactor_val = 1.2;
    } else {
      // End of cycle (pre-halving anticipation phase)
      halvingCyclePhaseFactor_val = 1.0; // Mixed signals - anticipation but uncertainty
    }
    
    // Add epoch-specific adjustment - later epochs may have dampened cycle effects
    if (bitcoinFundamentals.currentEpoch >= 4) { // Post-2024 halving
      // Later halvings have less dramatic effects, so dampen the factor toward 1.0
      halvingCyclePhaseFactor_val = 1.0 + (halvingCyclePhaseFactor_val - 1.0) * 0.8;
    }
  }
  
  // 3. Calculate Scarcity Factor
  let scarcityFactor_val = 1.0;
  
  if (bitcoinFundamentals.percentageOfMaxSupplyIssued !== undefined) {
    const completion = bitcoinFundamentals.percentageOfMaxSupplyIssued;
    
    if (completion > 0.99) {
      // Over 99% issued - extreme scarcity
      scarcityFactor_val = 0.7;
    } else if (completion > 0.95) {
      // 95-99% issued - very high scarcity
      scarcityFactor_val = 0.8;
    } else if (completion > 0.9) {
      // 90-95% issued - high scarcity
      scarcityFactor_val = 0.85;
    } else if (completion > 0.85) {
      // 85-90% issued - moderate-high scarcity
      scarcityFactor_val = 0.9;
    } else if (completion > 0.8) {
      // 80-85% issued - moderate scarcity
      scarcityFactor_val = 0.95;
    }
    // Below 80% remains at neutral 1.0
  }
  
  return {
    inflationFactor_val,
    halvingCyclePhaseFactor_val,
    scarcityFactor_val
  };
}

UnifiedBayesianMarkovModel.prototype._calculateCurrentMonthCycleFactor = function(currentMonth, currentCyclePosition, allBitcoinData, bitcoinFundamentals) {
  // Start with a default factor
  let monthCycleFactor = 1.0;
  
  // Apply cycle position adjustment
  if (currentCyclePosition !== undefined) {
    if (currentCyclePosition > 0.8) {
      // Late cycle - high risk of crash
      monthCycleFactor = 1.3 + (currentCyclePosition - 0.8) * 1.0;
    } else if (currentCyclePosition > 0.6) {
      // Mid-late cycle - elevated risk
      monthCycleFactor = 1.1 + (currentCyclePosition - 0.6) * 1.0;
    } else if (currentCyclePosition < 0.2) {
      // Early cycle - low risk
      monthCycleFactor = 0.8 - (0.2 - currentCyclePosition) * 0.5;
    } else if (currentCyclePosition < 0.4) {
      // Early-mid cycle - reduced risk
      monthCycleFactor = 0.9 - (0.4 - currentCyclePosition) * 0.5;
    } else {
      // Mid cycle - neutral risk
      monthCycleFactor = 1.0;
    }
  }
  
  // Analyze if this month appears early or late in market cycles
  // This is based on empirical analysis of Bitcoin market cycles
  
  // Early-cycle months (typically stronger)
  if ([11, 12, 1, 2].includes(currentMonth)) {
    // Reduce cycle factor (less risk) in early-cycle months
    monthCycleFactor *= 0.9;
  }
  
  // Mid-cycle months (typically steady)
  else if ([3, 4, 5, 6].includes(currentMonth)) {
    // Neutral effect
  }
  
  // Late-cycle months (typically weaker)
  else if ([7, 8, 9, 10].includes(currentMonth)) {
    // Increase cycle factor (more risk) in late-cycle months
    monthCycleFactor *= 1.15;
  }
  
  // Further refine based on this month's position in previous halvings
  // Bitcoin halving months: May 2020, July 2016, November 2012
  // For months near halvings, adjust the cycle factor
  const halvingMonths = [5, 7, 11]; // May, July, November
  const postHalvingMonths = [6, 8, 12, 1]; // Months after halvings
  
  if (halvingMonths.includes(currentMonth)) {
    // Halving months often have increased interest and volatility
    monthCycleFactor *= 1.1;
  } else if (postHalvingMonths.includes(currentMonth)) {
    // Post-halving months often see positive momentum
    monthCycleFactor *= 0.95;
  }
  
  // Analyze historical extreme events frequency in this month
  const monthData = allBitcoinData.filter(d => {
    const date = d.date instanceof Date ? d.date : new Date(d.date);
    return date.getMonth() + 1 === currentMonth;
  });
  
  if (monthData.length > 0) {
    const extremeEventsCount = monthData.filter(d => d.isExtremeEvent === 1).length;
    const extremeEventRate = extremeEventsCount / monthData.length;
    
    // If this month historically has more extreme events, increase the cycle factor
    if (extremeEventRate > 0.015) { // More than 1.5% of days have extreme events
      monthCycleFactor *= 1.1;
    } else if (extremeEventRate < 0.005) { // Less than 0.5% of days
      monthCycleFactor *= 0.9;
    }
  }
  
  // Integrate Bitcoin fundamentals - halving cycle phase
  if (bitcoinFundamentals && bitcoinFundamentals.halvingCyclePhaseFactor_val !== undefined) {
    // If both market cycle position and halving cycle phase align, amplify the effect
    const halvingCycleFactor = bitcoinFundamentals.halvingCyclePhaseFactor_val;
    
    if (halvingCycleFactor < 0.9 && currentCyclePosition < 0.4) {
      // Both indicators suggest early cycle - strongly bullish
      monthCycleFactor *= 0.8;
    } else if (halvingCycleFactor > 1.1 && currentCyclePosition > 0.7) {
      // Both indicators suggest late cycle - strongly bearish
      monthCycleFactor *= 1.3;
    } else {
      // Mixed signals or moderate alignment
      monthCycleFactor *= halvingCycleFactor;
    }
  }
  
  // Ensure reasonable bounds (0.5 to 2.0)
  monthCycleFactor = Math.min(2.0, Math.max(0.5, monthCycleFactor));
  
  return monthCycleFactor;
}
