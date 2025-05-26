// Enhanced knowledgeGraph.js

/**
 * RektBot Enhanced Knowledge Graph
 * Expanded knowledge representation for deeper context understanding
 * and more sophisticated responses.
 *
 * Version: 2.0
 * Last Updated: 2025-05-21
 */

const knowledgeGraph = {
  // Expanded entities with more comprehensive definitions and relationships
  entities: {
    // --- Core On-Chain Metrics ---
    "MVRV_Ratio": {
      type: "on-chain_metric",
      definition: "Market Value to Realized Value (MVRV) ratio compares Bitcoin's market capitalization to its realized capitalization. It indicates if the current market price is above or below the aggregate 'fair value' or cost basis of all coins in circulation, based on the price at which they last moved on-chain.",
      calculation_summary: "Market Cap ÷ Realized Cap",
      relates_to: ["market_valuation", "crash_risk", "market_cycle_position", "price_discovery", "long_term_holder_behavior", "short_term_holder_behavior", "NUPL"],
      thresholds: {
        extreme_overvaluation: 4.0, // Historically strong top signal
        overvaluation: 2.5,         // Entering potentially overheated territory
        fair_value_upper: 1.5,      // Upper boundary of fair value
        fair_value_lower: 0.8,      // Lower boundary of fair value, potential undervaluation
        undervaluation: 0.7          // Strong undervaluation, historical bottom signal
      },
      interpretation: {
        above_4_0: "Extreme overvaluation. Historically signals major market tops with high probability of significant correction. Suggests widespread profit-taking and potential exhaustion of new buyers.",
        range_2_5_to_4_0: "Significant overvaluation. Market is likely euphoric. Increased risk of sharp pullbacks. Long-term holders may be distributing heavily.",
        range_1_5_to_2_5: "Moderate overvaluation. Market is in a clear uptrend, but caution is warranted as risk increases. Profit-taking may start to accelerate.",
        range_0_8_to_1_5: "Fair value to slight overvaluation. Represents a healthier market state, often seen during mid-cycle consolidations or sustainable uptrends.",
        below_0_8: "Undervaluation. Market price is below the aggregate cost basis. Historically indicates periods of maximum pessimism, capitulation, and prime long-term accumulation opportunities."
      },
      nuances: [
        "MVRV Z-Score (MVRV value minus its historical mean, divided by standard deviation) can provide a more normalized view of extremes.",
        "Short-Term Holder MVRV and Long-Term Holder MVRV offer insights into the behavior of different cohorts.",
        "Context of the broader market cycle is crucial for interpreting MVRV."
      ],
      historical_extremes: {
        highest: [
          { value: 4.72, date: "2021-04-14", result: "Marked a local cycle top, followed by a ~55% correction over 2 months." },
          { value: 3.96, date: "2017-12-17", result: "Marked the 2017 cycle top, followed by an ~84% bear market." },
          { value: 5.8, date: "2013-04-09", result: "Marked a major top, followed by a ~80% correction."}
        ],
        lowest: [
          { value: 0.40, date: "2015-01-14", result: "Marked the 2014-2015 bear market bottom." },
          { value: 0.69, date: "2018-12-15", result: "Marked the 2018 bear market bottom." },
          { value: 0.54, date: "2020-03-13", result: "COVID-19 crash bottom, a black swan event." }
        ]
      },
      currentValue: null, // To be updated by application state
      currentZScore: null // To be updated by application state
    },

    "NVT_Ratio": {
      type: "on-chain_metric",
      definition: "Network Value to Transactions (NVT) ratio compares Bitcoin's market capitalization to the daily USD value transacted on its blockchain. It's often likened to the Price-to-Earnings (P/E) ratio for stocks, assessing network valuation relative to its utility as a settlement layer.",
      calculation_summary: "Market Cap ÷ Smoothed Daily On-Chain Transaction Volume (USD)",
      relates_to: ["network_activity", "crash_risk", "network_utility", "market_valuation", "transaction_volume"],
      thresholds: { // NVT Signal (NVTS) is often preferred, these are for classic NVT
        overvaluation: 90,  // For NVT Signal, > 2.2
        caution: 70,        // For NVT Signal, > 1.5
        fair_value: 45,     // For NVT Signal, ~0.8-1.5
        undervaluation: 25  // For NVT Signal, < 0.8
      },
      interpretation: {
        above_90: "Potentially extreme overvaluation. Network value is very high compared to transaction throughput, suggesting speculative excess or declining utility.",
        range_70_to_90: "Overvaluation. Caution is advised as the price may be outpacing fundamental network use.",
        range_45_to_70: "Fair value to moderate overvaluation. Network activity is reasonably aligned with valuation, or slightly lagging.",
        below_45: "Potential undervaluation. Network is settling a high value relative to its market cap, suggesting robust utility or growth potential."
      },
      nuances: [
        "NVT Signal (NVTS) uses a 90-day moving average of transaction volume, making it less noisy and more responsive than classic NVT.",
        "High NVT can sometimes occur during periods of HODLing if transaction volume drops while price is stable or rising.",
        "Needs to be contextualized with other metrics and market phase."
      ],
      historical_extremes: {
         highest: [
          { value: 130, date: "2018-02-01", result: "Deep bear market, transaction volume collapsed faster than price initially." },
          { value: 82.9, date: "2011-06-10", result: "Early cycle top."}
        ],
        lowest: [
          { value: 7.5, date: "2011-01-20", result: "Very early days, high relative transaction volume." },
          { value: 22.3, date: "2019-04-02", result: "Rally after bear market bottom, transaction volume recovered." }
        ]
      },
      currentValue: null,
      currentZScore: null
    },

    "SOPR": {
      type: "on-chain_metric",
      definition: "Spent Output Profit Ratio (SOPR) is computed by dividing the realized value (in USD) by the value at creation (USD) of a spent output. It indicates whether, on average, coins being moved on-chain are being sold at a profit or loss.",
      calculation_summary: "Price Sold ÷ Price Paid (for each UTXO)",
      relates_to: ["market_sentiment", "profit_taking", "capitulation", "support_resistance_levels", "long_term_holder_behavior", "short_term_holder_behavior"],
      thresholds: {
        strong_resistance_bull: 1.03, // In bull markets, SOPR bouncing off 1 can signal continuation
        support_bear: 0.97,         // In bear markets, SOPR finding resistance at 1 can signal continuation
        capitulation_low: 0.90
      },
      interpretation: {
        above_1_0: "Coins are, on average, being sold for a profit. Sustained values > 1.03 can indicate euphoria and potential for a local top if demand wanes.",
        equals_1_0: "Coins are, on average, being sold at break-even. This level often acts as support in bull markets (holders reluctant to sell at a loss) and resistance in bear markets (holders selling at first opportunity to break even).",
        below_1_0: "Coins are, on average, being sold at a loss. Sustained values < 1.0 indicate panic, fear, or capitulation. Deep drops below 1 (e.g., <0.95) often mark market bottoms."
      },
      nuances: [
        "Adjusted SOPR (aSOPR) excludes transactions with a lifespan of less than 1 hour, filtering out noise.",
        "Short-Term Holder SOPR (STH-SOPR) and Long-Term Holder SOPR (LTH-SOPR) provide insights into different investor cohorts.",
        "A SOPR reset (dipping to or below 1 and then rising) during an uptrend is often a bullish sign."
      ],
      currentValue: null
    },

    "Puell_Multiple": {
      type: "on-chain_metric",
      definition: "The Puell Multiple is calculated by dividing the daily issuance value of bitcoins (in USD) by the 365-day moving average of daily issuance value. It explores miner profitability and its impact on market cycles.",
      calculation_summary: "Daily Coin Issuance (USD) ÷ 365-day MA of Daily Coin Issuance (USD)",
      relates_to: ["miner_behavior", "market_cycle_position", "crash_risk", "accumulation_zones", "halving"],
      thresholds: {
        overvaluation_extreme: 4.0, // Historically strong top signal
        overvaluation_high: 2.5,
        fair_value_range: [0.6, 1.5],
        undervaluation_low: 0.5,   // Historically strong bottom signal
        undervaluation_extreme: 0.3
      },
      interpretation: {
        above_4_0: "Extreme miner profitability. Historically signals market tops as miners are heavily incentivized to sell. Indicates market is likely overheated.",
        range_2_5_to_4_0: "High miner profitability. Miners are likely taking significant profits. Increased risk of sell pressure from miners.",
        range_0_6_to_1_5: "Fair value / Equilibrium. Miner revenue is in line with historical norms. Neutral market signal.",
        below_0_5: "Low miner profitability / Miner stress. Miners may be unprofitable, leading to capitulation. Historically signals excellent long-term buying opportunities and market bottoms."
      },
      nuances: [
        "Impacted by both price changes and halving events (which cut daily issuance).",
        "Miner capitulation (hash rate drops as Puell Multiple is low) can precede significant price recoveries."
      ],
      historical_extremes: {
        highest: [
          { value: 6.7, date: "2021-01-08", result: "Preceded a multi-month consolidation and a local top." },
          { value: 11.9, date: "2013-04-05", result: "Marked a major cycle top."}
        ],
        lowest: [
          { value: 0.31, date: "2020-03-16", result: "COVID-19 crash bottom." },
          { value: 0.33, date: "2018-11-28", result: "Near the 2018 bear market bottom." }
        ]
      },
      currentValue: null
    },

    "NUPL": {
      type: "on-chain_metric",
      definition: "Net Unrealized Profit/Loss (NUPL) indicates the overall sentiment of the market by showing the difference between unrealized profit and unrealized loss across all coins in the network. It is calculated as (Market Cap - Realized Cap) / Market Cap.",
      calculation_summary: "(Market Cap - Realized Cap) / Market Cap",
      relates_to: ["market_sentiment", "market_cycle_position", "MVRV_Ratio", "profit_taking", "capitulation"],
      thresholds_zones: {
        euphoria_greed: 0.75, // NUPL > 0.75
        belief_denial: 0.5,   // NUPL 0.5 - 0.75
        optimism_anxiety: 0.25,// NUPL 0.25 - 0.5
        hope_fear: 0.0,       // NUPL 0.0 - 0.25
        capitulation: -0.25   // NUPL < 0.0 (sometimes defined as < -0.25 for extreme)
      },
      interpretation: {
        above_0_75: "Euphoria/Greed. Extreme unrealized profits. Historically signals market tops and high risk of correction. Corresponds to MVRV > ~3.0-3.5.",
        range_0_5_to_0_75: "Belief/Denial. Significant unrealized profits, market is optimistic. In bull markets, this is belief; in early bear, denial.",
        range_0_25_to_0_5: "Optimism/Anxiety. Holders are in moderate profit. Uptrends show optimism; downtrends can bring anxiety.",
        range_0_0_to_0_25: "Hope/Fear. Holders are slightly in profit or breaking even. Uptrends show hope; downtrends bring fear.",
        below_0_0: "Capitulation. Aggregate unrealized losses. Historically signals market bottoms and maximum pessimism. Corresponds to MVRV < 1.0."
      },
      nuances: [
        "Short-Term Holder NUPL and Long-Term Holder NUPL provide cohort-specific sentiment.",
        "The transitions between these zones are often key inflection points."
      ],
      currentValue: null
    },

    "Realized_HODL_Ratio": {
      type: "on-chain_metric",
      definition: "The Realized HODL Ratio (RHODL) compares the Realized Cap HODL Waves for 1-week old coins to 1-2 year old coins. It aims to identify market tops by assessing when short-term speculation significantly outweighs long-term holding.",
      calculation_summary: "Ratio of 1wk Realized Cap HODL Wave to 1-2yr Realized Cap HODL Wave",
      relates_to: ["market_cycle_position", "long_term_holder_behavior", "short_term_holder_behavior", "speculation_levels"],
      thresholds: {
        top_signal_extreme: 50000, // Values from Glassnode charts
        top_signal_high: 30000
      },
      interpretation: {
        above_50000: "Extreme market top. Indicates a very high proportion of wealth held by recent buyers compared to older hands, typical of euphoric tops.",
        range_30000_to_50000: "High market top signal. Suggests significant speculation and potential for market overheating.",
        below_500: "Market bottom / Early bull. Indicates wealth is predominantly held by long-term investors."
      },
      nuances: ["Sensitive to the age bands chosen for comparison.", "Effective at identifying cycle tops rather than bottoms."],
      currentValue: null
    },

    "SSR": {
      type: "on-chain_metric",
      definition: "Stablecoin Supply Ratio (SSR) is the ratio of Bitcoin's market cap to the total market cap of major stablecoins. A lower SSR suggests greater potential buying power from stablecoins relative to Bitcoin's size.",
      calculation_summary: "Bitcoin Market Cap ÷ Aggregate Stablecoin Market Cap",
      relates_to: ["market_liquidity", "buying_power", "market_sentiment", "capital_rotation"],
      thresholds: { // These are highly dynamic and change as stablecoin market cap grows
        low_ssr_bullish: 5,  // Historically, SSR below 5-10 indicated strong buying power
        high_ssr_bearish: 20 // Historically, SSR above 20-25 indicated less buying power
      },
      interpretation: {
        ssr_low: "Low SSR (e.g., < 5-10, but this threshold evolves). Indicates substantial stablecoin supply relative to Bitcoin's market cap, suggesting high potential 'dry powder' to buy Bitcoin. Bullish.",
        ssr_high: "High SSR (e.g., > 20-25, evolving threshold). Indicates less stablecoin supply relative to Bitcoin's market cap, suggesting lower immediate buying power. Potentially bearish or signals market saturation."
      },
      nuances: [
        "The absolute SSR values for 'high' and 'low' change over time as the total stablecoin market cap grows.",
        "Trends in SSR (rising or falling) are often more important than absolute levels.",
        "A rapidly falling SSR can indicate capital flowing into Bitcoin from stablecoins."
      ],
      currentValue: null
    },

    "Exchange_Netflow": {
      type: "on-chain_metric",
      definition: "The net amount of Bitcoin flowing into or out of all exchange wallets. Positive netflow (inflow) suggests potential selling pressure. Negative netflow (outflow) suggests accumulation or movement to self-custody.",
      calculation_summary: "Total BTC Inflows to Exchanges - Total BTC Outflows from Exchanges",
      relates_to: ["exchange_balances", "selling_pressure", "accumulation_behavior", "market_sentiment"],
      interpretation: {
        sustained_inflows: "Sustained large inflows often precede price declines as coins are moved to exchanges to be sold.",
        sustained_outflows: "Sustained large outflows often indicate accumulation by investors moving coins to cold storage, typically bullish.",
        spikes_inflow: "Sudden large inflow spikes can signal panic selling or large players preparing to sell.",
        spikes_outflow: "Sudden large outflow spikes can signal significant accumulation events or OTC deals."
      },
      nuances: [
        "Must be analyzed in context (e.g., outflows during a bull run are very bullish; inflows during a bear market confirm selling pressure).",
        "Exchange-specific flows can also be insightful (e.g., flows to derivative exchanges vs. spot exchanges)."
      ],
      currentValue: null // Typically a daily or hourly value
    },

    // --- Market Metrics ---
    "Volatility_Realized": {
      type: "market_metric",
      definition: "Realized Volatility measures the actual historical price fluctuations of Bitcoin over a specific period (e.g., 30-day, 90-day annualized standard deviation of daily returns).",
      relates_to: ["crash_risk", "market_sentiment", "risk_premium", "option_pricing", "liquidity"],
      thresholds: { // Annualized
        extreme: 0.12, // 120% annualized
        high: 0.08,    // 80%
        moderate: 0.04,// 40%
        low: 0.02     // 20%
      },
      interpretation: {
        above_0_12: "Extreme volatility. Typically seen during major market crashes, parabolic run-ups, or black swan events. Unsustainable.",
        range_0_08_to_0_12: "High volatility. Often signals market uncertainty, potential trend changes, or climactic moves.",
        range_0_04_to_0_08: "Moderate/Normal Bitcoin volatility. Common during established trends or consolidations.",
        below_0_02: "Unusually low volatility ('volatility compression'). Often precedes a significant price expansion in either direction as market energy builds."
      },
      nuances: ["Different timeframes (e.g., 7-day vs 90-day) capture different aspects of volatility.", "Compare to Implied Volatility for insights into market expectations."],
      currentValue30d: null
    },

    "Volatility_Implied": {
      type: "market_metric",
      definition: "Implied Volatility (IV) is derived from options prices and represents the market's expectation of future price volatility. Often tracked via indices like DVOL (Deribit Bitcoin Volatility Index).",
      relates_to: ["Volatility_Realized", "option_pricing", "market_sentiment", "risk_perception", "hedging_activity"],
      interpretation: {
        iv_higher_than_rv: "Market expects future volatility to be higher than recent past volatility. Can signal anticipation of a significant event or increased uncertainty. Options are relatively expensive.",
        iv_lower_than_rv: "Market expects future volatility to be lower than recent past volatility. Can signal complacency or belief that a volatile period is ending. Options are relatively cheap.",
        iv_spikes: "Spikes in IV often coincide with fear or major market events, indicating high demand for options (hedging or speculation)."
      },
      nuances: ["Term structure of IV (IV for different option expiries) provides insights into short-term vs. long-term expectations.", "IV skew (difference in IV for puts vs. calls) indicates directional bias."],
      currentValue: null // e.g., DVOL index value
    },

    "Funding_Rates": {
      type: "market_metric",
      definition: "Funding rates are periodic payments exchanged between long and short traders in perpetual futures contracts to keep the contract price close to the spot price. Positive rates mean longs pay shorts; negative rates mean shorts pay longs.",
      relates_to: ["leverage_levels", "market_sentiment", "speculation_levels", "liquidation_cascades"],
      thresholds: { // Typical 8-hour rates
        extreme_positive: 0.05, // % per 8h
        high_positive: 0.02,
        neutral_range: [-0.01, 0.01],
        high_negative: -0.02,
        extreme_negative: -0.05
      },
      interpretation: {
        sustained_extreme_positive: "Sustained high positive funding (e.g., >0.05% per 8h or >50% annualized) indicates excessive bullish leverage and euphoria. Increases risk of long squeezes and sharp corrections.",
        sustained_high_negative: "Sustained high negative funding indicates excessive bearish leverage. Increases risk of short squeezes and sharp rallies.",
        neutral: "Funding rates near zero suggest balanced leverage and sentiment in the derivatives market."
      },
      nuances: ["Consistent positive funding is normal in bull markets but extremes are warning signs.", "Funding rates can be a contrarian indicator at extremes."],
      currentValue: null // Average funding rate
    },

    "Open_Interest": {
      type: "market_metric",
      definition: "Open Interest (OI) represents the total number of outstanding derivative contracts (e.g., futures, options) that have not been settled. High OI indicates more capital and leverage in the derivatives market.",
      relates_to: ["leverage_levels", "speculation_levels", "market_volatility_potential", "liquidation_cascades"],
      interpretation: {
        rising_oi_with_price_up: "Confirms uptrend, new money flowing in (bullish).",
        rising_oi_with_price_down: "Confirms downtrend, new money shorting (bearish).",
        falling_oi_with_price_up: "Uptrend may be losing momentum, short covering (caution).",
        falling_oi_with_price_down: "Downtrend may be losing momentum, longs closing (potential bottoming).",
        extreme_high_oi: "Record high OI, especially if price is also at extremes, can signal an over-leveraged market prone to sharp corrections/squeezes."
      },
      nuances: ["OI should be analyzed in conjunction with price action, funding rates, and volume.", "OI denominated in BTC vs. USD can tell different stories about leverage."],
      currentValue: null // Total OI in USD or BTC
    },

    // --- Risk Concepts ---
    "crash_risk": {
      type: "risk_assessment_concept",
      definition: "The assessed probability of a significant Bitcoin price decline (e.g., >15-20% within a short period like 7-30 days). This is a composite risk derived from multiple indicators.",
      influenced_by: ["MVRV_Ratio", "NVT_Ratio", "Volatility_Realized", "market_sentiment", "market_cycle_position", "Puell_Multiple", "SOPR", "NUPL", "Funding_Rates", "Open_Interest", "liquidation_cascades", "macroeconomic_factors", "regulatory_risk"],
      levels: { // Example probability bands for a 30-day crash >20%
        extreme: { range: [0.80, 1.00], description: "Extreme probability. Conditions historically align with major market tops, widespread euphoria, extreme leverage, and significant on-chain divergences. Defensive strategies highly recommended." },
        high: { range: [0.60, 0.79], description: "High probability. Market shows multiple signs of overheating or significant stress. Increased caution, risk reduction, and hedging may be appropriate." },
        moderate: { range: [0.40, 0.59], description: "Moderate probability. Typical market conditions with balanced risk. Standard risk management and strategic positioning are suitable." },
        low: { range: [0.20, 0.39], description: "Low probability. Conditions generally appear stable or favorable. Opportunities may be present, but risk management is still crucial." },
        very_low: { range: [0.00, 0.19], description: "Very low probability. Historically rare periods of deep undervaluation or strong, early-stage recovery. Maximum opportunity for accumulation, though black swans are always possible." }
      },
      historical_indicators: {
        reliable_top_signals: ["MVRV > 3.5-4.0", "Puell Multiple > 4.0", "NUPL > 0.75 (Euphoria)", "Sustained extreme positive funding rates", "RHODL Ratio peaks"],
        reliable_bottom_signals: ["MVRV < 0.8", "Puell Multiple < 0.5", "NUPL < 0 (Capitulation)", "Hash Ribbon buy signal", "Significant exchange outflows"]
      },
      currentAssessment: null // To be updated by application
    },

    "liquidation_cascades": {
      type: "market_risk_concept",
      definition: "A rapid chain reaction of forced selling in leveraged derivative markets. An initial price move triggers liquidations, which adds selling/buying pressure, causing further price movement and more liquidations.",
      relates_to: ["Volatility_Realized", "crash_risk", "market_structure", "leverage_levels", "Funding_Rates", "Open_Interest"],
      warning_signs: {
        high_leverage_ratio: "Elevated aggregate estimated leverage ratio across exchanges.",
        record_open_interest: "Open Interest reaching new all-time highs, especially during periods of low spot volume.",
        extreme_funding_rates: "Sustained, very high positive or negative funding rates indicating lopsided positioning.",
        clustered_liquidation_levels: "Visible clusters of liquidation prices just above/below key support/resistance.",
        low_market_depth: "Thin order books on spot exchanges, making it easier for large liquidations to move price significantly."
      },
      impact: "Can turn minor corrections into major crashes or small rallies into violent short squeezes. Increases overall market volatility.",
      historical_examples: [
        { event: "March 12, 2020 (COVID Crash)", details: "Massive long liquidations across all crypto assets as global markets panicked. BTC dropped ~50% in 24h." },
        { event: "May 19, 2021", details: "Over $8 billion in long liquidations in a single day due to cascading sell-offs triggered by regulatory FUD and over-leveraged market." },
        { event: "FTX Collapse (Nov 2022)", details: "Contagion and forced selling led to significant liquidations, exacerbating the price decline." }
      ]
    },

    "regulatory_risk": {
      type: "external_risk_concept",
      definition: "The risk that changes in laws, regulations, or government policies will negatively impact the Bitcoin price, adoption, or the broader cryptocurrency ecosystem.",
      relates_to: ["market_sentiment", "adoption_rate", "institutional_investment", "exchange_operations"],
      categories: [
        "Trading restrictions or bans",
        "Taxation changes (capital gains, mining income)",
        "Stablecoin regulations",
        "DeFi regulations",
        "Exchange licensing and compliance (KYC/AML)",
        "Mining restrictions (environmental or capital controls)",
        "Securities classification for crypto assets"
      ],
      impact_potential: "High. Can cause sharp, sudden price drops, reduce liquidity, hinder adoption, or increase operational costs for businesses.",
      monitoring_sources: ["Government announcements", "Regulatory agency statements (SEC, CFTC, Treasury)", "Proposed legislation", "International bodies (FATF, FSB)"]
    },

    // --- Market Conditions & Cycles ---
    "market_cycle_position": {
      type: "cycle_concept",
      definition: "An estimation of where Bitcoin currently stands within its typical multi-year market cycle, often characterized by phases of accumulation, markup (bull market), distribution, and markdown (bear market). Typically ranges from 0% (bottom) to 100% (top).",
      relates_to: ["crash_risk", "bull_market", "bear_market", "halving", "adoption_curve", "MVRV_Ratio", "NUPL", "long_term_holder_behavior"],
      phases_detailed: {
        accumulation: { range_pct: [0, 0.20], description: "Post-capitulation. Smart money accumulates. Sentiment: Despair/Hope. Volatility: Low. Risk: Low (historically best R:R).", indicators: ["MVRV < 1", "NUPL < 0", "Sustained exchange outflows", "Hash Ribbon buy"] },
        early_bull: { range_pct: [0.21, 0.40], description: "Initial recovery. Trend begins to turn. Sentiment: Hope/Optimism. Volatility: Increasing. Risk: Low to Moderate.", indicators: ["Price breaks key MAs", "SOPR > 1 consistently", "Growing spot volume"] },
        mid_bull_markup: { range_pct: [0.41, 0.60], description: "Established uptrend. Public participation grows. Sentiment: Optimism/Belief. Volatility: Moderate. Risk: Moderate.", indicators: ["Healthy pullbacks bought", "MVRV 1.5-2.5", "NVT rising but not extreme"] },
        late_bull_euphoria: { range_pct: [0.61, 0.80], description: "Accelerating price. Mainstream FOMO. Sentiment: Belief/Thrill/Euphoria. Volatility: High. Risk: High.", indicators: ["Parabolic price moves", "Extreme positive funding", "LTH SOPR spikes (distribution)"] },
        distribution_top: { range_pct: [0.81, 1.00], description: "Price peaks. Smart money distributes. Sentiment: Euphoria/Complacency. Volatility: Extreme, then declining. Risk: Extreme.", indicators: ["MVRV > 3.5", "NUPL > 0.75", "Bearish divergences on RSI/MACD", "Blow-off top volume"] },
        early_bear_denial: { range_pct: [0.80, 0.61], description: "Initial sharp decline from top, often with strong relief rallies ('dead cat bounce'). Sentiment: Complacency/Anxiety. Volatility: High. Risk: High.", indicators: ["Lower highs, lower lows start", "SOPR struggles at 1", "Exchange inflows increase"] },
        mid_bear_panic: { range_pct: [0.60, 0.41], description: "Sustained downtrend. Capitulation events. Sentiment: Anxiety/Fear/Panic. Volatility: Spikes during capitulation. Risk: Moderate (but painful).", indicators: ["Key supports break", "Forced selling", "Negative funding common"] },
        late_bear_depression: { range_pct: [0.40, 0.21], description: "Price stabilizes at lows. Disinterest. Sentiment: Panic/Despair/Apathy. Volatility: Declining to very low. Risk: Low (approaching accumulation).", indicators: ["Volume dries up", "Sideways price action", "LTH accumulation begins"] }
      },
      cycle_drivers: ["Halving (supply shock)", "Adoption S-curve", "Macroeconomic liquidity cycles", "Technological innovation", "Reflexivity"],
      currentValue: null // To be updated by application
    },

    "bull_market": {
      type: "market_condition",
      definition: "An extended period characterized by generally rising prices, strong investor confidence, increasing adoption, positive news flow, and high trading volumes. Typically associated with the markup phase of a market cycle.",
      characterized_by: ["Higher highs and higher lows in price", "Positive market sentiment (Optimism to Euphoria)", "Increased retail and institutional participation", "Strong performance of on-chain metrics (e.g., MVRV > 1.5, SOPR consistently > 1)", "Media hype and positive narratives"],
      average_duration_days_btc: "~500-700 days from bottom to top (historical average, can vary)",
      sub_phases: ["Early Bull (Recovery)", "Mid-Bull (Markup/Consolidation)", "Late Bull (Euphoria/Speculative Frenzy)"],
      risk_profile: "Risk generally increases as the bull market progresses. Early stages offer best risk-reward; late stages are highest risk despite strong momentum."
    },

    "bear_market": {
      type: "market_condition",
      definition: "An extended period characterized by generally falling prices, weak investor confidence, declining adoption/interest, negative news flow, and low trading volumes. Typically associated with the markdown phase of a market cycle.",
      characterized_by: ["Lower highs and lower lows in price", "Negative market sentiment (Fear to Despair)", "Reduced participation, retail often exits", "Weak performance of on-chain metrics (e.g., MVRV < 1, SOPR struggles at 1 or below)", "Negative media narratives, FUD"],
      average_duration_days_btc: "~300-400 days from top to bottom (historical average, can vary)",
      sub_phases: ["Early Bear (Distribution/Denial)", "Mid-Bear (Panic/Capitulation)", "Late Bear (Accumulation/Bottoming)"],
      risk_profile: "Risk of further downside is high in early/mid stages. Late stages, while painful, can present long-term accumulation opportunities as risk of further significant drops diminishes."
    },

    "accumulation_phase": {
        type: "market_phase",
        definition: "A period in the market cycle, typically following a bear market, where informed investors and long-term holders gradually buy assets, often characterized by sideways price action, low volatility, and general market disinterest.",
        relates_to: ["market_cycle_position", "bear_market", "long_term_holder_behavior", "Wyckoff_Method"],
        indicators: ["Sustained exchange outflows", "Increase in LTH supply", "Low MVRV/NUPL values", "Volatility compression", "Rounded bottom chart patterns"],
        sentiment: "Despair, Apathy, transitioning to Hope."
    },

    "distribution_phase": {
        type: "market_phase",
        definition: "A period in the market cycle, typically preceding a bear market, where informed investors and long-term holders gradually sell assets to less informed participants, often characterized by choppy/sideways price action at highs, and increasing volatility before a downturn.",
        relates_to: ["market_cycle_position", "bull_market", "long_term_holder_behavior", "Wyckoff_Method"],
        indicators: ["Sustained exchange inflows (often subtle)", "Decrease in LTH supply / LTH-SOPR spikes", "High MVRV/NUPL values", "Bearish divergences on TA indicators", "Topping chart patterns (e.g., Head & Shoulders)"],
        sentiment: "Euphoria, Greed, transitioning to Complacency."
    },

    // --- Bitcoin Specific Events & Concepts ---
    "halving": {
      type: "network_event",
      definition: "A pre-programmed event in Bitcoin's code that reduces the block reward given to miners by 50%. This occurs approximately every four years (every 210,000 blocks) and directly impacts the new supply issuance rate of Bitcoin.",
      historical_dates: ["2012-11-28", "2016-07-09", "2020-05-11", "2024-04-20 (approx.)"],
      market_impact_theory: "Reduces supply inflation. Historically, halvings have been associated with subsequent bull markets, though the direct causality is debated (coincidence with broader macro cycles, reflexivity, narrative power).",
      impact_on_miners: "Increases mining difficulty per BTC earned, can force less efficient miners to capitulate if price doesn't compensate. Drives innovation in mining efficiency.",
      relates_to: ["supply_issuance", "market_cycle_position", "miner_economics", "Puell_Multiple", "Stock_to_Flow_Model"],
      post_halving_performance_avg_12m: "~+1000% (average across first 3, highly variable and past performance is not indicative of future results)",
      narrative_effect: "Strongly bullish narrative often builds anticipation pre-halving and sustains interest post-halving."
    },

    "Stock_to_Flow_Model": {
        type: "valuation_model",
        definition: "A model that quantifies scarcity by comparing an asset's current stock (total circulating supply) to its flow (annual new production). Higher S2F ratios indicate greater scarcity. Popularized for Bitcoin by 'PlanB'.",
        relates_to: ["halving", "supply_issuance", "market_valuation", "scarcity"],
        interpretation_btc: "Bitcoin's S2F ratio doubles with each halving, theoretically increasing its scarcity and, according to the model, its price.",
        criticism: ["Correlation vs. Causation debates", "Model may not hold as market matures", "Ignores demand-side factors", "Outlier sensitivity", "Non-stationarity of time series data."],
        status: "The model's price predictions have significantly deviated from actual price post-2021, leading to widespread criticism of its predictive power."
    },

    // --- Technical Analysis Concepts ---
    "Support_Level": {
        type: "ta_concept",
        definition: "A price level where an asset has historically found buying interest, preventing it from falling further. Represents a concentration of demand.",
        relates_to: ["Resistance_Level", "trend_analysis", "market_structure", "price_action"],
        identification: ["Previous price lows", "Significant moving averages (e.g., 200-day MA)", "Fibonacci retracement levels", "High volume nodes on VPVR"],
        behavior: "Price may bounce off support. A break below strong support can signal further downside."
    },
    "Resistance_Level": {
        type: "ta_concept",
        definition: "A price level where an asset has historically found selling interest, preventing it from rising further. Represents a concentration of supply.",
        relates_to: ["Support_Level", "trend_analysis", "market_structure", "price_action"],
        identification: ["Previous price highs", "Significant moving averages", "Fibonacci extension levels", "High volume nodes on VPVR"],
        behavior: "Price may be rejected at resistance. A break above strong resistance can signal further upside."
    },
    "Moving_Average_Convergence_Divergence": {
        type: "ta_indicator",
        definition: "MACD is a trend-following momentum indicator that shows the relationship between two moving averages of an asset's price. It consists of the MACD line, signal line, and histogram.",
        relates_to: ["trend_analysis", "momentum_analysis", "technical_divergence"],
        signals: {
            bullish_crossover: "MACD line crosses above the signal line.",
            bearish_crossover: "MACD line crosses below the signal line.",
            bullish_divergence: "Price makes lower lows while MACD makes higher lows.",
            bearish_divergence: "Price makes higher highs while MACD makes lower highs."
        }
    },
    "Relative_Strength_Index": {
        type: "ta_indicator",
        definition: "RSI is a momentum oscillator that measures the speed and change of price movements. It oscillates between 0 and 100.",
        relates_to: ["momentum_analysis", "overbought_oversold", "technical_divergence"],
        thresholds: {
            overbought: 70, // Traditional, some use 80 for Bitcoin
            oversold: 30    // Traditional, some use 20 for Bitcoin
        },
        signals: {
            overbought: "RSI > 70 (or 80) suggests asset may be overbought and due for a pullback.",
            oversold: "RSI < 30 (or 20) suggests asset may be oversold and due for a bounce.",
            divergence: "Discrepancies between RSI and price action can signal potential reversals."
        }
    },

    // --- Market Sentiment Concepts ---
    "Fear_Greed_Index_Crypto": {
        type: "sentiment_indicator",
        definition: "A composite index that measures current sentiment in the cryptocurrency market, typically on a scale from 0 (Extreme Fear) to 100 (Extreme Greed).",
        relates_to: ["market_sentiment", "contrarian_investing", "market_cycle_position"],
        components_example: ["Volatility", "Market Momentum/Volume", "Social Media Sentiment", "Surveys", "Bitcoin Dominance", "Google Trends data"],
        interpretation: {
            extreme_fear: "Historically, extreme fear (e.g., index < 20) can be a sign of capitulation and present buying opportunities for contrarians.",
            extreme_greed: "Historically, extreme greed (e.g., index > 80) can signal market euphoria, overvaluation, and increased risk of correction."
        },
        currentValue: null // To be updated by external data source if integrated
    },

    // --- Macroeconomic Factors ---
    "Inflation_CPI": {
        type: "macroeconomic_factor",
        definition: "Consumer Price Index (CPI) measures the average change over time in the prices paid by urban consumers for a market basket of consumer goods and services. A key measure of inflation.",
        relates_to: ["monetary_policy", "interest_rates", "Bitcoin_as_inflation_hedge_narrative"],
        impact_on_btc: "High inflation can strengthen the narrative for Bitcoin as a store of value or inflation hedge, potentially increasing demand. Conversely, aggressive monetary tightening to combat inflation can reduce liquidity and negatively impact risk assets like Bitcoin."
    },
    "Interest_Rates_Fed": {
        type: "macroeconomic_factor",
        definition: "The target range for the federal funds rate set by the U.S. Federal Reserve. Influences borrowing costs across the economy and global liquidity conditions.",
        relates_to: ["monetary_policy", "Inflation_CPI", "market_liquidity", "risk_asset_valuation"],
        impact_on_btc: "Lower interest rates / loose monetary policy generally increase liquidity and appetite for risk assets, potentially benefiting Bitcoin. Higher interest rates / tight monetary policy tend to reduce liquidity and can pressure Bitcoin prices as 'safe' assets become more attractive."
    },

    // --- Behavioral Finance Concepts ---
    "FOMO": {
        type: "behavioral_concept",
        definition: "Fear Of Missing Out. An emotional response where investors buy an asset due to anxiety that they might miss out on a significant upward price movement, often leading to buying at market tops.",
        relates_to: ["market_sentiment", "bull_market_euphoria", "speculation_levels", "crash_risk"],
        indicators: ["Parabolic price increases", "Extreme greed on sentiment indices", "Surge in retail investor participation", "Mainstream media hype"]
    },
    "FUD": {
        type: "behavioral_concept",
        definition: "Fear, Uncertainty, and Doubt. The spread of negative information or sentiment, often intentionally, to cause investors to sell or avoid an asset.",
        relates_to: ["market_sentiment", "bear_market_panic", "regulatory_risk", "news_impact"],
        impact: "Can trigger panic selling, exacerbate price declines, and create buying opportunities if the FUD is unfounded or exaggerated."
    },

    // --- Easter Egg ---
    "cheesecake": {
      type: "easter_egg",
      definition: "A rich, sweet dessert with a dense filling made of soft cheese, eggs, and sugar on a cookie or pastry crust. Its relevance to Bitcoin risk is... debatable, but delicious.",
      relates_to: ["crash_risk", "market_cycle_position", "Volatility_Realized", "stress_relief_mechanism"], // Humorous relations
      recipe: {
        title: "Bitcoin Halving Hype Cheesecake",
        ingredients: [
          "4 blocks of cream cheese (representing 4-year cycles), softened",
          "1.5 cups of granulated sugar (sweet returns)",
          "1/4 cup of all-purpose flour (for market structure)",
          "5 large eggs (representing 5 stages of grief in a bear market)",
          "1/3 cup heavy cream (liquidity)",
          "1 tablespoon lemon zest (for when life gives you lemons, make a correction)",
          "1 teaspoon vanilla extract (the essence of HODLing)",
          "1 crushed graham cracker crust (the foundation of the blockchain)"
        ],
        instructions: [
          "Preheat oven to 350°F (175°C). Prepare for potential volatility.",
          "In a large bowl, beat cream cheese until smooth, like a perfect breakout.",
          "Gradually add sugar, beating until well combined – accumulate those gains.",
          "Mix in flour. Add eggs one at a time, mixing on low speed after each, just like dollar-cost averaging.",
          "Stir in heavy cream, lemon zest, and vanilla. Don't overmix, or you'll introduce FUD.",
          "Pour batter into crust. Smooth the top, aiming for an all-time high.",
          "Bake for 15 minutes. Reduce oven temperature to 250°F (120°C) – the post-halving difficulty adjustment.",
          "Continue baking for 60-75 minutes, or until the center is almost set. Avoid opening the oven – don't panic sell.",
          "Turn off oven and let cheesecake cool in oven with door slightly ajar for 1 hour – the consolidation phase.",
          "Refrigerate for at least 6 hours, or overnight. Patience is key in crypto.",
        ],
        serving_instructions: "Serve chilled. Garnish with a sprinkle of powdered sugar (representing a dusting of diamond hands) or fresh berries (representing altcoin diversification). Enjoy responsibly during periods of extreme market volatility."
      }
    }
  },

  // Expanded relationships with more nuanced connections
  relationships: [
    // --- MVRV Relationships ---
    { source: "MVRV_Ratio", target: "crash_risk", type: "positively_correlates_with", strength: 0.85, description: "Historically, MVRV values above 3.5-4.0 have strongly indicated market tops and preceded major corrections, signifying high unrealized profits and potential for mass selling." },
    { source: "MVRV_Ratio", target: "market_cycle_position", type: "indicates_phase_of", strength: 0.9, description: "MVRV levels are key indicators of market cycle phases: <1 for bottoms/accumulation, 1-2.5 for uptrends/fair value, >2.5 for late-stage bull/distribution." },
    { source: "MVRV_Ratio", target: "NUPL", type: "is_mathematically_related_to", strength: 1.0, description: "NUPL is derived from MVRV (NUPL = 1 - 1/MVRV). They provide similar signals about unrealized profit/loss in the market." },
    { source: "MVRV_Ratio", target: "long_term_holder_behavior", type: "influences", strength: 0.7, description: "High MVRV often sees LTHs distributing (taking profits), while low MVRV sees LTHs accumulating." },

    // --- NVT Relationships ---
    { source: "NVT_Ratio", target: "crash_risk", type: "positively_correlates_with", strength: 0.70, description: "High NVT (especially NVTS) suggests network valuation is outpacing on-chain utility (transaction volume), increasing risk of a price correction to realign with fundamentals." },
    { source: "NVT_Ratio", target: "network_activity", type: "is_inversely_proportional_to_given_fixed_marketcap", strength: 0.8, description: "For a given market cap, a higher NVT implies lower network transaction volume, and vice-versa." },

    // --- SOPR Relationships ---
    { source: "SOPR", target: "market_sentiment", type: "reflects", strength: 0.8, description: "SOPR values indicate aggregate profit-taking (SOPR > 1) or loss-realization (SOPR < 1), reflecting prevailing market sentiment and holder conviction." },
    { source: "SOPR", target: "Support_Level", type: "identifies_potential", strength: 0.65, description: "SOPR bouncing off 1.0 during an uptrend often acts as dynamic support, as holders are reluctant to sell at a loss." },
    { source: "SOPR", target: "Resistance_Level", type: "identifies_potential", strength: 0.65, description: "SOPR being rejected at 1.0 during a downtrend often acts as dynamic resistance, as holders sell at break-even." },

    // --- Puell Multiple Relationships ---
    { source: "Puell_Multiple", target: "miner_behavior", type: "reflects_profitability_of", strength: 0.9, description: "The Puell Multiple directly indicates miner profitability. High values incentivize selling, low values can cause miner capitulation." },
    { source: "Puell_Multiple", target: "market_cycle_position", type: "indicates_phase_of", strength: 0.8, description: "Extreme Puell Multiple values (highs and lows) have historically aligned well with market cycle tops and bottoms." },
    { source: "halving", target: "Puell_Multiple", type: "directly_impacts", strength: 0.9, description: "Halvings cut daily issuance, which can sharply increase the Puell Multiple if price remains stable or rises, or decrease it if price falls significantly." },

    // --- NUPL Relationships ---
    { source: "NUPL", target: "market_sentiment", type: "quantifies_aggregate", strength: 0.9, description: "NUPL directly measures the overall unrealized profit/loss state of the market, mapping to sentiment zones from Euphoria to Capitulation." },
    { source: "NUPL", target: "market_cycle_position", type: "strongly_indicates_phase_of", strength: 0.9, description: "NUPL zones (Euphoria, Belief, Optimism, Hope, Capitulation) are highly correlated with different phases of the Bitcoin market cycle." },

    // --- Volatility Relationships ---
    { source: "Volatility_Realized", target: "crash_risk", type: "can_precede", strength: 0.6, description: "Periods of extremely low realized volatility can precede large, sharp price moves (expansion). High, climactic volatility can mark tops or bottoms." },
    { source: "Volatility_Implied", target: "market_sentiment", type: "reflects_expectation_of", strength: 0.7, description: "High implied volatility suggests market participants expect significant future price swings, often tied to fear or anticipation of major events." },
    { source: "Volatility_Realized", target: "liquidation_cascades", type: "can_trigger", strength: 0.75, description: "Sudden spikes in realized volatility are primary triggers for liquidation cascades in over-leveraged markets." },

    // --- Derivatives Market Relationships ---
    { source: "Funding_Rates", target: "leverage_levels", type: "indicates_bias_in", strength: 0.8, description: "Extreme funding rates suggest a lopsided leverage bias (e.g., too many longs or shorts), increasing risk of a squeeze." },
    { source: "Funding_Rates", target: "market_sentiment", type: "reflects_short_term_speculative", strength: 0.75, description: "High positive funding reflects bullish speculation; high negative funding reflects bearish speculation in perpetual futures." },
    { source: "Open_Interest", target: "leverage_levels", type: "measures_total", strength: 0.85, description: "High Open Interest signifies a large amount of capital and leverage in the derivatives market, increasing potential for volatility." },
    { source: "Open_Interest", target: "liquidation_cascades", type: "fuels_potential_for", strength: 0.8, description: "Large Open Interest provides the 'fuel' for liquidation cascades; the higher the OI, the larger the potential cascade." },

    // --- Cycle & Event Relationships ---
    { source: "halving", target: "market_cycle_position", type: "historically_catalyzes_new", strength: 0.75, description: "Bitcoin halvings have historically been followed by significant bull markets, often initiating a new cycle phase." },
    { source: "market_cycle_position", target: "crash_risk", type: "modulates", strength: 0.8, description: "Crash risk is generally lowest in early cycle phases and highest in late/top cycle phases." },
    { source: "regulatory_risk", target: "crash_risk", type: "can_induce_sudden", strength: 0.7, description: "Negative regulatory news or actions can trigger sharp price drops and increase perceived crash risk." },
    { source: "Inflation_CPI", target: "Bitcoin_as_inflation_hedge_narrative", type: "strengthens_or_weakens", strength: 0.6, description: "High inflation tends to strengthen the narrative for Bitcoin as an inflation hedge, potentially increasing demand, while low inflation may weaken it." },
    { source: "Interest_Rates_Fed", target: "market_liquidity", type: "directly_impacts", strength: 0.75, description: "Federal Reserve interest rate policies significantly affect overall market liquidity, which in turn impacts investment flows into risk assets like Bitcoin." },

    // --- Behavioral Finance Relationships ---
    { source: "FOMO", target: "bull_market_euphoria", type: "is_characteristic_of", strength: 0.9, description: "FOMO is a primary driver of behavior during the euphoric late stages of a bull market, leading to parabolic price increases." },
    { source: "FOMO", target: "crash_risk", type: "significantly_increases", strength: 0.8, description: "Widespread FOMO often leads to unsustainable valuations and speculative bubbles, dramatically increasing the risk of a subsequent crash." },
    { source: "FUD", target: "bear_market_panic", type: "can_exacerbate", strength: 0.7, description: "FUD can intensify selling pressure and panic during bear markets or corrections, leading to deeper price declines." },

    // --- Technical Analysis Relationships ---
    { source: "Support_Level", target: "price_action", type: "acts_as_floor_for", strength: 0.7, description: "Strong support levels often halt price declines and can serve as accumulation zones or points for trend reversal." },
    { source: "Resistance_Level", target: "price_action", type: "acts_as_ceiling_for", strength: 0.7, description: "Strong resistance levels often cap price advances and can serve as distribution zones or points for trend reversal." },
    { source: "Relative_Strength_Index", target: "overbought_oversold", type: "measures", strength: 0.8, description: "RSI is a key indicator for identifying overbought (>70-80) or oversold (<20-30) conditions, suggesting potential price reversals." },
    { source: "Moving_Average_Convergence_Divergence", target: "trend_analysis", type: "identifies_momentum_for", strength: 0.75, description: "MACD crossovers and divergences are used to identify changes in trend direction and momentum." },
    { source: "technical_divergence", target: "crash_risk", type: "bearish_divergence_increases", strength: 0.65, description: "Bearish divergences (e.g., higher price highs with lower indicator highs) often precede price corrections by signaling weakening momentum." }
  ],

  // --- Query Functions (existing and potentially new ones) ---
  getEntity: function(entityName) {
    return this.entities[entityName] || null;
  },

  getRelatedEntities: function(entityName, relationshipType = null) {
    const relationships = this.relationships.filter(r =>
      (r.source === entityName || r.target === entityName) &&
      (relationshipType === null || r.type === relationshipType || r.type.startsWith(relationshipType))
    );

    return relationships.map(r => {
      const relatedEntityName = r.source === entityName ? r.target : r.source;
      const direction = r.source === entityName ? "outgoing" : "incoming";
      return {
        entity: this.getEntity(relatedEntityName),
        name: relatedEntityName,
        relationship: r.type,
        strength: r.strength,
        description: r.description,
        direction: direction
      };
    });
  },

  explainEntity: function(entityName, userKnowledgeLevel = "intermediate") {
    const entity = this.getEntity(entityName);
    if (!entity) return null;

    let explanation = {
      name: entityName.replace(/_/g, ' '),
      type: entity.type.replace(/_/g, ' '),
      definition: entity.definition,
      interpretation_summary: null,
      details: {}
    };

    if (entity.calculation_summary) {
      explanation.details.calculation_summary = entity.calculation_summary;
    }

    if (entity.interpretation) {
      let primaryInterpretation = "";
      if (userKnowledgeLevel === "basic" && entity.interpretation.basic_summary) {
        primaryInterpretation = entity.interpretation.basic_summary;
      } else {
        // Create a concise summary from detailed interpretations if no basic_summary
        const keys = Object.keys(entity.interpretation);
        if (keys.length > 0) {
          primaryInterpretation = `Key levels include: ${keys.map(k => `${k.replace(/_/g, ' ')} (${entity.interpretation[k].substring(0,50)}...)`).join('; ')}`;
        }
      }
      explanation.interpretation_summary = primaryInterpretation;
      if (userKnowledgeLevel !== "basic") {
        explanation.details.interpretation_levels = entity.interpretation;
      }
    }

    if (entity.thresholds) {
        explanation.details.key_thresholds = entity.thresholds;
    }
     if (entity.thresholds_zones) {
        explanation.details.key_zones = entity.thresholds_zones;
    }


    if (entity.nuances && userKnowledgeLevel !== "basic") {
      explanation.details.important_nuances = entity.nuances;
    }

    if (entity.historical_extremes && userKnowledgeLevel !== "basic") {
      explanation.details.historical_extremes = entity.historical_extremes;
    }

    if (entity.historical_examples) {
        explanation.details.historical_examples = entity.historical_examples;
    }

    if (entity.warning_signs && userKnowledgeLevel !== "basic") {
        explanation.details.warning_signs = entity.warning_signs;
    }

     if (entity.phases_detailed && userKnowledgeLevel !== "basic") {
        explanation.details.cycle_phases_detailed = entity.phases_detailed;
    }

    const related = this.getRelatedEntities(entityName);
    if (related.length > 0) {
      explanation.details.related_concepts = related.map(r => `${r.name.replace(/_/g, ' ')} (${r.relationship.replace(/_/g, ' ')})`).slice(0, 5); // Limit for brevity
    }

    return explanation;
  },

  getInfluencingFactors: function(entityName, typeFilter = null) {
    const influencedByRelationships = this.relationships.filter(r =>
      r.target === entityName &&
      (typeFilter ? r.type === typeFilter : true)
    );

    return influencedByRelationships.map(r => ({
      factor: r.source.replace(/_/g, ' '),
      strength: r.strength,
      description: r.description,
      type: r.type.replace(/_/g, ' '),
      entity: this.getEntity(r.source) // Keep original entity name for linking
    })).sort((a, b) => b.strength - a.strength);
  },

  getMarketPhase: function(cyclePositionValue) {
    const cycleEntity = this.entities.market_cycle_position;
    if (!cycleEntity || !cycleEntity.phases_detailed) return "Unknown";

    for (const phaseName in cycleEntity.phases_detailed) {
      const phaseData = cycleEntity.phases_detailed[phaseName];
      if (cyclePositionValue >= phaseData.range_pct[0] && cyclePositionValue <= phaseData.range_pct[1]) {
        return phaseName.replace(/_/g, ' ');
      }
    }
    return "Indeterminate";
  },

  // Example: Get a summary of current risk based on a few key metrics
  getQuickRiskSnapshot: function(currentMetrics) {
    // currentMetrics = { MVRV_Ratio: 2.5, NVT_Ratio: 60, market_cycle_position: 0.7 }
    let messages = [];
    let overallRiskScore = 0;
    let factorsConsidered = 0;

    if (currentMetrics.MVRV_Ratio !== undefined) {
      factorsConsidered++;
      const mvrv = currentMetrics.MVRV_Ratio;
      if (mvrv > 3.5) { messages.push("MVRV Ratio is in extreme overvaluation zone."); overallRiskScore += 3; }
      else if (mvrv > 2.5) { messages.push("MVRV Ratio indicates significant overvaluation."); overallRiskScore += 2; }
      else if (mvrv < 0.8) { messages.push("MVRV Ratio suggests undervaluation, historically a low-risk zone."); overallRiskScore -= 2; }
      else { overallRiskScore += 1; }
    }

    if (currentMetrics.market_cycle_position !== undefined) {
      factorsConsidered++;
      const cyclePos = currentMetrics.market_cycle_position;
      const phase = this.getMarketPhase(cyclePos);
      messages.push(`Market cycle position is at ${(cyclePos * 100).toFixed(0)}% (${phase}).`);
      if (cyclePos > 0.8) { overallRiskScore += 3; }
      else if (cyclePos > 0.6) { overallRiskScore += 2; }
      else if (cyclePos < 0.2) { overallRiskScore -=2; }
      else { overallRiskScore += 1; }
    }

    if (currentMetrics.NUPL !== undefined) {
        factorsConsidered++;
        const nupl = currentMetrics.NUPL;
        if (nupl > 0.75) { messages.push("NUPL indicates Euphoria/Greed, high risk."); overallRiskScore += 3;}
        else if (nupl > 0.5) { messages.push("NUPL indicates Belief/Denial."); overallRiskScore += 2;}
        else if (nupl < 0) { messages.push("NUPL indicates Capitulation, potential bottoming."); overallRiskScore -=2;}
        else { overallRiskScore +=1; }
    }

    let riskLevel = "Moderate";
    if (factorsConsidered > 0) {
        const avgScore = overallRiskScore / factorsConsidered;
        if (avgScore >= 2.5) riskLevel = "Extreme";
        else if (avgScore >= 1.8) riskLevel = "High";
        else if (avgScore <= 0.5) riskLevel = "Low";
        else if (avgScore <= -1.0) riskLevel = "Very Low";
    } else {
        messages.push("Insufficient data for a full risk snapshot.");
    }

    return {
        level: riskLevel,
        summary: messages.join(" "),
        score_debug: overallRiskScore / (factorsConsidered || 1)
    };
  }
};

// Make it available for import in other modules
export { knowledgeGraph };
