// Enhanced knowledgeGraph.js

/**
 * RektBot Enhanced Knowledge Graph
 * Expanded knowledge representation for deeper context understanding
 * and more sophisticated responses.
 */

const knowledgeGraph = {
  // Expanded entities with more comprehensive definitions and relationships
  entities: {
    // Existing metrics with enhanced definitions and interpretations
    "MVRV_Ratio": {
      type: "on-chain_metric",
      definition: "Market Value to Realized Value ratio compares Bitcoin's market cap to its realized cap, revealing when the market price is above or below 'fair value' based on actual acquisition costs.",
      relates_to: ["market_valuation", "crash_risk", "market_cycle_position", "price_discovery"],
      thresholds: { 
        high: 3.5, 
        low: 1.0 
      },
      interpretation: {
        above_3_5: "Historically indicates market tops and increased crash risk with 85% accuracy in previous cycles",
        range_2_3_5: "Elevated values suggesting market exuberance and potential for increased volatility",
        range_1_2: "Neutral territory, neither over nor undervalued, typical during mid-cycle consolidations",
        below_1: "Historically a powerful accumulation zone with limited additional downside risk"
      },
      historical_extremes: {
        highest: {
          value: 4.72,
          date: "2021-04-14",
          result: "Led to a 55% correction within 60 days"
        },
        lowest: {
          value: 0.54,
          date: "2020-03-13",
          result: "Preceded a 1,600% bull run over the next 13 months"
        }
      },
      calculation: "Market Cap (current price × circulating supply) ÷ Realized Cap (sum of UTXOs valued at the price when they last moved)"
    },
    
    "NVT_Ratio": {
      type: "on-chain_metric",
      definition: "Network Value to Transactions ratio compares Bitcoin's market cap to the USD value being transferred on-chain, similar to P/E ratio in traditional markets for valuation.",
      relates_to: ["network_activity", "crash_risk", "network_utility", "market_valuation"],
      thresholds: { 
        high: 65, 
        low: 30 
      },
      interpretation: {
        above_65: "Potentially overvalued, price exceeding network utility, often precedes major corrections",
        range_45_65: "Moderately elevated values, suggesting caution and potential for reversion to mean",
        range_30_45: "Neutral range, balanced valuation relative to network transaction activity",
        below_30: "Potentially undervalued relative to network activity, historically a positive signal"
      },
      historical_extremes: {
        highest: {
          value: 82.9,
          date: "2018-01-08",
          result: "Preceded an 84% decline over the next 11 months"
        },
        lowest: {
          value: 22.3,
          date: "2019-04-02",
          result: "Led to a 50% rally over the next 3 months"
        }
      },
      calculation: "Market Cap ÷ Daily Transaction Volume (USD)"
    },
    
    "Volatility": {
      type: "market_metric",
      definition: "Measure of price fluctuations over a specific timeframe, typically calculated as the annualized standard deviation of daily returns.",
      relates_to: ["crash_risk", "market_sentiment", "risk_premium", "option_pricing"],
      thresholds: {
        high: 0.05,
        low: 0.02
      },
      interpretation: {
        above_0_08: "Extreme volatility, typically occurs during market panics or major inflection points",
        range_0_05_0_08: "High volatility, often signaling unsustainable price action in either direction",
        range_0_02_0_05: "Normal range for Bitcoin's volatility during stable market phases",
        below_0_02: "Unusually low volatility, often precedes major moves as liquidity dries up"
      },
      volatility_regime: {
        bull_market: "Tends to decrease as bull markets mature, with occasional spikes during corrections",
        bear_market: "Highest during capitulation phases, gradually decreases as markets bottom"
      }
    },
    
    // New metrics to expand knowledge
    "Puell_Multiple": {
      type: "on-chain_metric",
      definition: "Ratio between the daily value of new bitcoins issued (in USD) and the 365-day moving average of this value, indicating miner profitability and market cycles.",
      relates_to: ["miner_behavior", "market_cycle_position", "crash_risk", "accumulation_zones"],
      thresholds: {
        high: 4.0,
        low: 0.5
      },
      interpretation: {
        above_4: "Mining profitability at peak, historically indicates market tops and overvaluation",
        range_1_5_4: "Elevated mining profitability, potential profit-taking phase for miners",
        range_0_8_1_5: "Equilibrium range, neutral indicator for market cycles",
        below_0_5: "Mining profitability stressed, historically excellent accumulation zone"
      },
      historical_extremes: {
        highest: {
          value: 6.7,
          date: "2021-01-08",
          result: "Preceded a major pull-back and multi-month consolidation"
        },
        lowest: {
          value: 0.31,
          date: "2020-03-16",
          result: "Marked the bottom of the COVID crash and beginning of a new bull run"
        }
      }
    },
    
    "SOPR": {
      type: "on-chain_metric",
      definition: "Spent Output Profit Ratio measures the profit ratio of all coins moved on a particular day, indicating market participants' profit-taking behavior.",
      relates_to: ["market_sentiment", "profit_taking", "crash_risk", "accumulation_zones"],
      thresholds: {
        high: 1.5,
        low: 0.95
      },
      interpretation: {
        above_1_5: "Significant profit-taking, potential sign of market euphoria and increased sell pressure",
        range_1_1_5: "Normal profit-taking in bull markets, sustainable uptrend if quickly absorbed",
        around_1: "Equilibrium where coins are moving at roughly break-even, often a pivotal level",
        below_0_95: "Coins moving at a loss, often indicates capitulation but can signal buying opportunities"
      }
    },
    
    "Stablecoin_Supply_Ratio": {
      type: "market_metric",
      definition: "Ratio between Bitcoin's market cap and the market cap of all stablecoins, indicating potential buying power on the sidelines.",
      relates_to: ["market_liquidity", "buying_power", "market_cycle_position"],
      thresholds: {
        high: 80,
        low: 20
      },
      interpretation: {
        above_80: "Limited stablecoin liquidity relative to Bitcoin market cap, potentially limiting further upside",
        range_40_80: "Moderate stablecoin reserves, typical during mid-cycle phases",
        below_20: "Abundant stablecoin liquidity relative to Bitcoin's market size, significant potential buying power"
      }
    },
    
    // Risk Concepts with expanded definitions
    "crash_risk": {
      type: "risk_assessment_concept",
      definition: "Probability of a significant Bitcoin price correction (15%+ decline within 30 days), based on historical patterns, on-chain metrics, market structure, and sentiment indicators.",
      influenced_by: ["MVRV_Ratio", "NVT_Ratio", "Volatility", "market_sentiment", "market_cycle_position", "Puell_Multiple", "SOPR", "liquidation_cascades"],
      levels: {
        extreme: "Above 80% probability, historically coinciding with major market tops, leveraged speculation, and on-chain divergences",
        high: "65-80% probability, elevated risks suggesting defensive positioning, trailing stops, and reduced leverage",
        moderate: "45-65% probability, typical market conditions warranting standard risk management practices",
        low: "25-45% probability, favorable risk/reward conditions though still requiring position sizing discipline",
        very_low: "Below 25% probability, historically rare periods of minimal downside risk, opportune for strategic accumulation"
      },
      historical_indicators: {
        effective: ["Extreme MVRV values", "Unsustainable funding rates", "Declining network activity despite price increases"],
        false_signals: ["Short-term sentiment indicators", "Single-metric approaches without context", "Exchange FUD without on-chain confirmation"]
      }
    },
    
    "liquidation_cascades": {
      type: "market_risk_concept",
      definition: "Chain reaction of forced position closures in leveraged markets, where initial price movements trigger liquidations, creating further price pressure and additional liquidations.",
      relates_to: ["volatility", "crash_risk", "market_structure", "leverage"],
      warning_signs: {
        high_open_interest: "Excessive buildup of futures open interest relative to spot market liquidity",
        funding_rates: "Sustained extreme positive funding rates indicating overleveraged long positions",
        low_spot_volume: "Declining spot volume combined with increasing derivatives volume suggests thin support",
        clustered_liquidation_levels: "High concentration of stop-losses or liquidation levels within a narrow price range"
      },
      historical_examples: [
        { date: "2021-04-18", price_impact: "-27% in 48 hours", trigger: "Mining hash rate concerns and overleveraged longs" },
        { date: "2021-05-19", price_impact: "-43% in 24 hours", trigger: "China mining ban announcement with record open interest" },
        { date: "2022-11-08", price_impact: "-22% in 48 hours", trigger: "FTX collapse with contagion effects" }
      ]
    },
    
    // Market Conditions with more detailed characterizations
    "bull_market": {
      type: "market_condition",
      definition: "Extended period of rising prices, increasing adoption metrics, and general optimism in the market, typically lasting 12-18 months in Bitcoin cycles.",
      characterized_by: ["higher_highs", "higher_lows", "positive_sentiment", "increasing_adoption", "rising_metrics", "media_attention"],
      average_duration_days: 550,
      sub_phases: {
        disbelief: "Early phase where many doubt the sustainability of the uptrend, typically offering excellent risk/reward",
        acceptance: "Mid-cycle consolidation where the uptrend becomes widely acknowledged but not yet mainstream",
        euphoria: "Final phase characterized by parabolic price action, mainstream FOMO, and unsustainable gains"
      },
      risk_evolution: "Risk of major corrections typically increases as bull market progresses, with highest risk during euphoria phase"
    },
    
    "bear_market": {
      type: "market_condition",
      definition: "Extended period of falling prices, declining market interest, and general pessimism, often lasting 8-30 months in Bitcoin's history.",
      characterized_by: ["lower_highs", "lower_lows", "negative_sentiment", "reduced_trading_volume", "declining_media_coverage"],
      average_duration_days: 400,
      sub_phases: {
        denial: "Initial decline from cycle top, often with strong relief rallies that ultimately fail",
        panic: "Steepest decline phase with capitulation events and maximum fear",
        depression: "Extended bottom formation with low volatility and diminished public interest",
        hope: "Early signs of accumulation and recovery, but still met with widespread skepticism"
      },
      accumulation_indicators: ["Smart money wallet accumulation", "Declining exchange balances", "Surge in long-term holder supply"]
    },
    
    // Bitcoin Specific Events with enhanced historical context
    "halving": {
      type: "network_event",
      definition: "Programmed reduction of Bitcoin mining reward by 50%, occurring approximately every 4 years (210,000 blocks), reducing new supply issuance.",
      historical_dates: ["2012-11-28", "2016-07-09", "2020-05-11", "2024-04-20"],
      market_impact: "Historically preceded bull markets due to reduced supply issuance, though increasing market efficiency may reduce impact over time",
      relates_to: ["supply_issuance", "market_cycle_position", "miner_economics"],
      post_halving_performance: {
        "2012": "+8,995% in 12 months",
        "2016": "+284% in 18 months",
        "2020": "+559% in 6 months"
      },
      economic_theory: "Stock-to-flow ratio increases with each halving, potentially driving higher equilibrium prices if demand remains constant or increases"
    },
    
    // New event types
    "black_swan_event": {
      type: "market_event",
      definition: "Unpredictable event with severe consequences, characterized by extreme rarity, severe impact, and retrospective predictability.",
      historical_examples: [
        { event: "COVID-19 Market Crash", date: "2020-03-12", impact: "-50% in 24 hours", recovery_time: "~60 days" },
        { event: "FTX Collapse", date: "2022-11-08", impact: "-22% in 4 days", recovery_time: "~180 days" },
        { event: "Mt. Gox Hack", date: "2014-02-07", impact: "-60% over several weeks", recovery_time: "~2 years" }
      ],
      risk_management: {
        portfolio_allocation: "Limiting crypto to reasonable percentage of overall portfolio",
        exchange_risk: "Distributing holdings across multiple venues and self-custody",
        cash_reserves: "Maintaining liquid reserves for potential accumulation during extreme dislocations"
      }
    },
    
    // Market Cycle Concepts with more detailed phases
    "market_cycle_position": {
      type: "cycle_concept",
      definition: "Current position within the Bitcoin market cycle, from 0% (cycle bottoms) to 100% (cycle tops), based on multiple indicators and historical patterns.",
      relates_to: ["crash_risk", "bull_market", "bear_market", "halving", "adoption_curve"],
      interpretation: {
        range_0_20: "Early cycle accumulation phase with maximum upside potential, typically low risk despite fear",
        range_20_40: "Early uptrend, recovery phase with declining risk as trend confirmation builds confidence",
        range_40_60: "Mid-cycle, characterized by substantial corrections within prevailing uptrend",
        range_60_80: "Late uptrend with increasing risk, requiring more careful position management",
        range_80_100: "Cycle maturation with significant overvaluation risk, historically short-lived euphoria phase"
      },
      cycle_compression_theory: "Theory suggesting that Bitcoin's market cycles may be becoming shorter and less dramatic as the market matures and liquidity increases",
      current_cycle_characteristics: {
        institutional_influence: "Growing institutional participation changing market dynamics versus previous retail-dominated cycles",
        derivatives_impact: "Sophisticated derivatives markets potentially dampening volatility and extending cycles",
        macro_correlation: "Increasing correlation with traditional risk assets during specific market regimes"
      }
    },
    
    // New concepts
    "reflexivity": {
      type: "market_theory",
      definition: "Self-reinforcing market processes where participants' biased perceptions affect fundamentals, which then reinforce those biases, creating feedback loops.",
      relates_to: ["market_sentiment", "price_discovery", "bull_market", "bear_market"],
      applications: {
        bull_markets: "Rising prices attract more investors, increasing demand and reinforcing the uptrend",
        bear_markets: "Falling prices create negative sentiment, triggering selling and reinforcing the downtrend",
        capitulation: "Negative reflexivity reaches maximum intensity during capitulation events"
      },
      counteracting_forces: "Value investors, contrarians, and algorithmic trading can act as stabilizing forces against extreme reflexivity"
    },
    
    "technical_divergence": {
      type: "analysis_concept",
      definition: "Discrepancy between price movement and technical indicators, often signaling potential trend reversals or continuation.",
      relates_to: ["price_discovery", "crash_risk", "market_cycle_position"],
      types: {
        bullish: "Indicator making higher lows while price makes lower lows, suggesting diminishing downside momentum",
        bearish: "Indicator making lower highs while price makes higher highs, suggesting weakening upside momentum"
      },
      significant_indicators: {
        rsi: "Relative Strength Index divergences often precede major reversals",
        volume: "Price rises on declining volume suggest unsustainable momentum",
        on_chain: "Price increases with declining network activity can signal reduced fundamental support"
      }
    },
    
    "hash_ribbon": {
      type: "miner_metric",
      definition: "Indicator based on the relationship between short-term and long-term moving averages of Bitcoin's hash rate, signaling miner capitulation and subsequent accumulation opportunities.",
      relates_to: ["miner_behavior", "market_cycle_position", "accumulation_zones"],
      signals: {
        capitulation: "Short-term hash rate MA crosses below long-term MA, indicating miner stress",
        recovery: "Short-term hash rate MA crosses back above long-term MA, historically a strong buy signal"
      },
      historical_accuracy: "Has identified major buying opportunities throughout Bitcoin's history with minimal false signals"
    }
  },
  
  // Enhanced relationships with more nuanced connections
  relationships: [
    // Core metric relationships with updated strength values and descriptions
    {
      source: "MVRV_Ratio",
      target: "crash_risk",
      type: "influences",
      strength: 0.85, // Increased from 0.8
      description: "High MVRV values historically correlate with market tops and increased crash risk, with values above 3.5 consistently preceding major corrections"
    },
    {
      source: "NVT_Ratio",
      target: "crash_risk",
      type: "influences",
      strength: 0.75, // Increased from 0.7
      description: "Elevated NVT suggests overvaluation relative to network utility, increasing crash probability as price disconnects from fundamental usage"
    },
    {
      source: "Volatility",
      target: "crash_risk",
      type: "influences",
      strength: 0.55, // Increased from 0.5
      description: "Higher volatility often precedes major market movements, with extreme volatility sometimes indicating nearing climax moves"
    },
    {
      source: "market_cycle_position",
      target: "crash_risk",
      type: "influences",
      strength: 0.70, // Increased from 0.6
      description: "Late-cycle positions (>70%) correlate with higher crash probability as market exuberance and leverage tend to peak near cycle tops"
    },
    
    // New relationships for expanded metrics
    {
      source: "Puell_Multiple",
      target: "crash_risk",
      type: "influences",
      strength: 0.75,
      description: "Extreme Puell Multiple values (>4) historically indicate mining profitability peaks that align with market tops and increased correction probability"
    },
    {
      source: "SOPR",
      target: "crash_risk",
      type: "influences",
      strength: 0.65,
      description: "Sustained high SOPR values indicate significant profit-taking, potentially leading to selling pressure and price corrections"
    },
    {
      source: "Stablecoin_Supply_Ratio",
      target: "market_cycle_position",
      type: "indicates",
      strength: 0.60,
      description: "Low ratio suggests abundant buying power relative to Bitcoin's market cap, often seen in early to mid cycle positions"
    },
    
    // Liquidation cascade relationships
    {
      source: "liquidation_cascades",
      target: "crash_risk",
      type: "amplifies",
      strength: 0.80,
      description: "Liquidation cascades can significantly amplify price movements, turning moderate corrections into severe drawdowns"
    },
    {
      source: "Volatility",
      target: "liquidation_cascades",
      type: "triggers",
      strength: 0.65,
      description: "Spikes in volatility often trigger initial liquidations that can cascade if positioning is concentrated"
    },
    
    // Technical analysis relationships
    {
      source: "technical_divergence",
      target: "market_cycle_position",
      type: "indicates",
      strength: 0.55,
      description: "Significant bearish divergences often appear near cycle tops, while bullish divergences frequently emerge near cycle bottoms"
    },
    
    // Mining relationships
    {
      source: "hash_ribbon",
      target: "market_cycle_position",
      type: "indicates",
      strength: 0.70,
      description: "Hash ribbon signals historically mark miner capitulation events that often precede new bull cycles"
    },
    {
      source: "halving",
      target: "hash_ribbon",
      type: "influences",
      strength: 0.75,
      description: "Halvings directly impact miner economics, sometimes triggering hash ribbon capitulation signals as less efficient miners are forced offline"
    },
    
    // Market theory relationships
    {
      source: "reflexivity",
      target: "market_cycle_position",
      type: "amplifies",
      strength: 0.60,
      description: "Reflexive market behavior tends to extend and amplify both bull and bear cycles beyond fundamental justifications"
    },
    {
      source: "black_swan_event",
      target: "crash_risk",
      type: "overrides",
      strength: 0.95,
      description: "Black swan events can override normal market indicators, causing severe corrections regardless of other metrics"
    }
  ],
  
  // Keep existing query functions and add new ones
  getEntity: function(entityName) {
    return this.entities[entityName] || null;
  },
  
  getRelatedEntities: function(entityName, relationshipType = null) {
    const relationships = this.relationships.filter(r => 
      (r.source === entityName || r.target === entityName) && 
      (relationshipType === null || r.type === relationshipType)
    );
    
    return relationships.map(r => {
      const relatedEntityName = r.source === entityName ? r.target : r.source;
      return {
        entity: this.getEntity(relatedEntityName),
        name: relatedEntityName,
        relationship: r
      };
    });
  },
  
  explainEntity: function(entityName, userKnowledgeLevel = "intermediate") {
    const entity = this.getEntity(entityName);
    if (!entity) return null;
    
    // Tailor explanation based on user knowledge level
    let explanation = {
      name: entityName,
      definition: entity.definition
    };
    
    if (userKnowledgeLevel === "advanced") {
      explanation.relationships = this.getRelatedEntities(entityName);
      explanation.technicalDetails = entity.thresholds || entity.levels || entity.interpretation;
      explanation.historicalContext = entity.historical_extremes || entity.post_halving_performance || entity.historical_examples;
    }
    
    if (entity.type === "on-chain_metric" || entity.type === "market_metric") {
      explanation.interpretation = entity.interpretation;
    }
    
    return explanation;
  },
  
  getInfluencingFactors: function(entityName) {
    const influencedByRelationships = this.relationships.filter(r => 
      r.target === entityName && (r.type === "influences" || r.type === "amplifies" || r.type === "triggers" || r.type === "overrides")
    );
    
    return influencedByRelationships.map(r => ({
      factor: r.source,
      strength: r.strength,
      description: r.description,
      type: r.type,
      entity: this.getEntity(r.source)
    })).sort((a, b) => b.strength - a.strength);
  },
  
  // New methods for enhanced functionality
  
  getMarketPhase: function(cyclePosition) {
    // Determine market phase based on cycle position (0-1 value)
    if (cyclePosition <= 0.2) return "accumulation";
    if (cyclePosition <= 0.4) return "early_bull";
    if (cyclePosition <= 0.6) return "mid_cycle";
    if (cyclePosition <= 0.8) return "late_bull";
    return "potential_top";
  },
  
  getRiskAssessment: function(metrics) {
    // Calculate aggregate risk score based on multiple metrics
    // metrics object should contain values for known metrics (mvrv, nvt, etc.)
    let riskScore = 0;
    let weightSum = 0;
    
    // Check and score MVRV
    if (metrics.mvrv !== undefined) {
      const weight = 0.35;
      let score = 0;
      
      if (metrics.mvrv > 3.5) score = 0.9;
      else if (metrics.mvrv > 2.5) score = 0.7;
      else if (metrics.mvrv > 2) score = 0.5;
      else if (metrics.mvrv > 1.5) score = 0.3;
      else if (metrics.mvrv > 1) score = 0.2;
      else score = 0.1;
      
      riskScore += score * weight;
      weightSum += weight;
    }
    
    // Check and score NVT
    if (metrics.nvt !== undefined) {
      const weight = 0.25;
      let score = 0;
      
      if (metrics.nvt > 65) score = 0.8;
      else if (metrics.nvt > 55) score = 0.6;
      else if (metrics.nvt > 45) score = 0.4;
      else if (metrics.nvt > 35) score = 0.3;
      else score = 0.2;
      
      riskScore += score * weight;
      weightSum += weight;
    }
    
    // Check cycle position
    if (metrics.cyclePosition !== undefined) {
      const weight = 0.30;
      const score = metrics.cyclePosition * 0.9; // Convert 0-1 position to risk score
      
      riskScore += score * weight;
      weightSum += weight;
    }
    
    // Check volatility
    if (metrics.volatility !== undefined) {
      const weight = 0.10;
      let score = 0;
      
      if (metrics.volatility > 0.08) score = 0.7;
      else if (metrics.volatility > 0.05) score = 0.5;
      else if (metrics.volatility > 0.03) score = 0.3;
      else score = 0.2;
      
      riskScore += score * weight;
      weightSum += weight;
    }
    
    // Normalize risk score
    return weightSum > 0 ? (riskScore / weightSum) : 0.5;
  },
  
  getHistoricalComparison: function(metrics) {
    // Find historical periods with similar metric values
    // Returns array of similar periods with context
    const mvrv = metrics.mvrv;
    const nvt = metrics.nvt;
    const cyclePosition = metrics.cyclePosition;
    
    // This would connect to a database of historical periods
    // Simplified example:
    return [
      {
        period: "November 2020",
        similarity: 0.85,
        context: "Early bull market after recovery from COVID crash",
        outcome: "Continued 4-month rally of +250% before significant correction"
      },
      {
        period: "April 2019",
        similarity: 0.72,
        context: "Recovery from 2018 bear market bottom",
        outcome: "Sustained uptrend with +180% gains over 3 months"
      }
    ];
  },
  
  getPriceDeviationSignal: function(currentPrice, movingAverages) {
    // Calculate how far price has deviated from key moving averages
    // movingAverages object should contain values for different MAs (e.g., 50-day, 200-day)
    const signals = {};
    
    if (movingAverages.ma50 && movingAverages.ma200) {
      // Calculate deviation percentages
      const ma50Deviation = (currentPrice / movingAverages.ma50) - 1;
      const ma200Deviation = (currentPrice / movingAverages.ma200) - 1;
      
      // Generate signals
      if (ma50Deviation > 0.3) signals.ma50 = "Price significantly above 50-day MA, potential overextension";
      else if (ma50Deviation < -0.2) signals.ma50 = "Price significantly below 50-day MA, potential oversold condition";
      
      if (ma200Deviation > 0.5) signals.ma200 = "Price extremely elevated above 200-day MA, historically unsustainable";
      else if (ma200Deviation < -0.3) signals.ma200 = "Deep discount to 200-day MA, often indicates capitulation phases";
      
      // Golden/Death cross check
      if (movingAverages.ma50 > movingAverages.ma200 && ma50Deviation < 0.05) 
        signals.goldencross = "Recent golden cross (50MA crossing above 200MA), historically bullish";
      else if (movingAverages.ma50 < movingAverages.ma200 && ma50Deviation > -0.05)
        signals.deathcross = "Recent death cross (50MA crossing below 200MA), historically bearish";
    }
    
    return signals;
  }
};

export { knowledgeGraph };
