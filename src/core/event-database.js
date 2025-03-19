/**
 * Event Database
 */

// Import the getMarketPhase function from data-service.js
import { getMarketPhase } from './data-service.js';

function findHistoricalCrashes(data) {
    // Get extreme events
    const extremeEvents = data.filter(d => d.extremeEvent === 1);
    
    // Organize by month
    const crashesByMonth = {};
    for (let m = 1; m <= 12; m++) {
      crashesByMonth[m] = [];
    }
    
    // For each extreme event, calculate the percentage drop and include epoch info
    extremeEvents.forEach(event => {
      const month = event.date.getMonth() + 1;
      const dateStr = event.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
      const percentageDrop = (Math.exp(event.logReturn) - 1) * 100;
      
      // Add epoch information
      const epochNames = [
        "Pre-first halving",
        "First halving epoch",
        "Second halving epoch",
        "Third halving epoch",
        "Fourth halving epoch"
      ];
      
      const epochInfo = epochNames[event.halvingEpoch] || `Halving epoch ${event.halvingEpoch}`;
      
      // Default values
      let description = '';
      let links = [];
      let context = '';
      
      // Find the event in our database of known crashes
      const knownCrashInfo = getKnownCrashInfo(event.date, month, percentageDrop);
      
      if (knownCrashInfo) {
        description = knownCrashInfo.description;
        context = knownCrashInfo.context;
        links = knownCrashInfo.links;
      } else {
        // For previously unexplained crashes, provide context based on our sentiment framework
        const crashInfo = generateCrashContext(event.date, percentageDrop);
        description = crashInfo.description;
        context = crashInfo.context;
        
        // Attempt to get historical news headlines for this crash date
        const historicalNews = getHistoricalNewsForDate(event.date);
        if (historicalNews && historicalNews.length > 0) {
          context += ` News around this time reported: "${historicalNews[0].headline}"${historicalNews.length > 1 ? ` and "${historicalNews[1].headline}"` : ''}.`;
        }
      }
      
      // Add epoch information to context
      context = `[${epochInfo}] ${context}`;
      
      // Add to the crashes array for this month
      crashesByMonth[month].push({
        date: dateStr,
        rawDate: event.date,
        percentage: percentageDrop.toFixed(1),
        rawPercentage: percentageDrop,
        description: description,
        context: context,
        links: links,
        epoch: event.halvingEpoch
      });
    });
    
    // Sort crashes by date (most recent first) and limit to top 5 per month
    for (let m = 1; m <= 12; m++) {
      crashesByMonth[m].sort((a, b) => new Date(b.rawDate) - new Date(a.rawDate));
      crashesByMonth[m] = crashesByMonth[m].slice(0, 5); // Take only top 5 crashes per month
    }
    
    return crashesByMonth;
  }

function getHistoricalNewsForDate(crashDate) {
    // Historical news database for significant Bitcoin events/crashes
    // This could be expanded with more headlines as needed
    const historicalNewsDB = [
      // 2013-2014 Mt. Gox era
      {
        date: new Date('2013-12-05'),
        headline: "China's Central Bank Bars Financial Institutions From Bitcoin Transactions",
        source: "The Wall Street Journal"
      },
      {
        date: new Date('2014-02-07'),
        headline: "Bitcoin Plunges As Mt. Gox Exchange Halts All Withdrawals",
        source: "CoinDesk"
      },
      {
        date: new Date('2014-02-24'),
        headline: "Mt. Gox CEO Resigns From Bitcoin Foundation Board",
        source: "Bloomberg"
      },
      {
        date: new Date('2014-02-28'),
        headline: "Mt. Gox Files for Bankruptcy Protection",
        source: "The New York Times"
      },
      
      // 2017 Bull Run and Correction
      {
        date: new Date('2017-09-04'),
        headline: "China Bans ICOs and Token Sales, Bitcoin Price Tumbles",
        source: "Bloomberg"
      },
      {
        date: new Date('2017-09-14'),
        headline: "Bitcoin Crashes After Chinese Exchange Says It Will Halt Trading",
        source: "CNBC"
      },
      {
        date: new Date('2017-12-22'),
        headline: "Bitcoin Plunges 25% in 24 Hours in a Cryptocurrency Market Rout",
        source: "CNBC"
      },
      
      // 2018 Bear Market
      {
        date: new Date('2018-01-16'),
        headline: "Bitcoin Tumbles 20% as Fears of Cryptocurrency Crackdown Linger",
        source: "Reuters"
      },
      {
        date: new Date('2018-03-14'),
        headline: "Google Bans Cryptocurrency Advertising, Bitcoin Price Slumps",
        source: "The Guardian"
      },
      {
        date: new Date('2018-11-14'),
        headline: "Bitcoin Price Drops as Hype Turns to Fear Amid Crypto Market Slump",
        source: "Financial Times"
      },
      
      // 2019-2020
      {
        date: new Date('2019-07-15'),
        headline: "Bitcoin Tumbles as U.S. Lawmakers Challenge Facebook on Cryptocurrency",
        source: "Reuters"
      },
      {
        date: new Date('2020-03-12'),
        headline: "Bitcoin Price Crashes 50% in Biggest Single-Day Drop Since 2013",
        source: "CoinDesk"
      },
      {
        date: new Date('2020-03-13'),
        headline: "Crypto Markets Crash as Coronavirus Fears Trigger Global Sell-Off",
        source: "Decrypt"
      },
      
      // 2021 Events
      {
        date: new Date('2021-01-10'),
        headline: "Bitcoin Records Its Worst Week Since March, Drops Over 20% in 24 Hours",
        source: "Bloomberg"
      },
      {
        date: new Date('2021-04-18'),
        headline: "Bitcoin Plunges in Biggest Intraday Drop Since February",
        source: "Bloomberg"
      },
      {
        date: new Date('2021-05-12'),
        headline: "Tesla Suspends Bitcoin Car Purchases Citing Environmental Concerns",
        source: "Reuters"
      },
      {
        date: new Date('2021-05-19'),
        headline: "Bitcoin Tumbles Below $40,000 After China Issues Crypto Warning",
        source: "CNBC"
      },
      {
        date: new Date('2021-06-21'),
        headline: "Bitcoin Drops as Hashrate Declines with China Mining Crackdown",
        source: "Bloomberg"
      },
      {
        date: new Date('2021-09-07'),
        headline: "Bitcoin Plunges 16% as El Salvador Adoption Faces Technical Issues",
        source: "CoinDesk"
      },
      
      // 2022 Events
      {
        date: new Date('2022-01-21'),
        headline: "Bitcoin Extends Slide, Has Fallen More Than 50% From Record High",
        source: "Reuters"
      },
      {
        date: new Date('2022-05-09'),
        headline: "Bitcoin Plummets Below $30,000 as Terra's UST Loses Dollar Peg",
        source: "CNBC"
      },
      {
        date: new Date('2022-05-12'),
        headline: "Crypto Markets Crash as Terra Collapse Worsens, Bitcoin Below $27K",
        source: "CoinDesk"
      },
      {
        date: new Date('2022-06-13'),
        headline: "Bitcoin Plunges to Lowest Since 2020 as Celsius Freezes Withdrawals",
        source: "Bloomberg"
      },
      {
        date: new Date('2022-06-18'),
        headline: "Bitcoin Plunges Below $20,000 to Lowest Level Since 2020",
        source: "The Wall Street Journal"
      },
      {
        date: new Date('2022-11-08'),
        headline: "FTX Token Plummets as Binance Announces Plans to Acquire Company",
        source: "CoinDesk"
      },
      {
        date: new Date('2022-11-09'),
        headline: "Bitcoin Tumbles as Binance Backs Out of FTX Rescue Deal",
        source: "Financial Times"
      },
      
      // 2023 Events
      {
        date: new Date('2023-03-09'),
        headline: "Bitcoin Drops Amid Silvergate Bank Liquidation and SVB Concerns",
        source: "Bloomberg"
      },
      {
        date: new Date('2023-08-17'),
        headline: "Bitcoin Plunges Below $26,000 as Trader Sentiment Turns Bearish",
        source: "CoinDesk"
      }
    ];
    
    // Calculate date range for the search (±7 days from crash)
    const startDate = new Date(crashDate);
    startDate.setDate(startDate.getDate() - 7);
    
    const endDate = new Date(crashDate);
    endDate.setDate(endDate.getDate() + 7);
    
    // Find news within that date range
    const relevantNews = historicalNewsDB.filter(news => {
      return news.date >= startDate && news.date <= endDate;
    });
    
    // Sort by how close they are to the crash date (closest first)
    relevantNews.sort((a, b) => {
      const aDiff = Math.abs(a.date - crashDate);
      const bDiff = Math.abs(b.date - crashDate);
      return aDiff - bDiff;
    });
    
    return relevantNews.length > 0 ? relevantNews : null;
  }

function identifyMostSevereCrashes(crashesByMonth) {
    for (let month = 1; month <= 12; month++) {
      if (crashesByMonth[month].length > 0) {
        // Sort by percentage (most severe first)
        const sortedCrashes = [...crashesByMonth[month]].sort((a, b) => 
          parseFloat(a.percentage) - parseFloat(b.percentage)
        );
        
        // Store the most severe crash
        state.mostSevereMonthlyData[month] = sortedCrashes[0];
      }
    }
  }

function getKnownCrashInfo(date, month, percentageDrop) {
    const year = date.getFullYear();
    const day = date.getDate();
    
    // January events
    if (year === 2018 && month === 1 && day >= 15 && day <= 17) {
      return {
        description: "Beginning of 2018 crypto winter",
        context: "Sharp selloff as South Korea and China signaled crackdowns on crypto trading and mining. Bitcoin fell from nearly $20K to below $10K within a month.",
        links: [
          { text: "South Korea's Crypto Crackdown", url: "https://www.cnbc.com/2018/01/16/south-korea-cryptocurrency-crackdown-bitcoin-trading-rules.html" },
          { text: "China Escalates Crackdown", url: "https://www.bloomberg.com/news/articles/2018-01-15/china-is-said-to-escalate-crackdown-on-cryptocurrency-trading" }
        ]
      };
    }
    
    // March events - COVID crash
    if (year === 2020 && month === 3 && day >= 12 && day <= 13) {
      return {
        description: "COVID-19 pandemic market crash",
        context: "The 'COVID crash' saw Bitcoin plummet nearly 40% in a single day as global markets collapsed amid pandemic fears. This was Bitcoin's largest one-day price drop in seven years.",
        links: [
          { text: "Crypto's Black Thursday", url: "https://www.coindesk.com/markets/2020/03/13/bitcoin-crashes-40-in-precipitous-sell-off/" },
          { text: "Market-Wide Liquidation Event", url: "https://www.bloomberg.com/news/articles/2020-03-12/bitcoin-plunges-to-lowest-in-a-year-as-volatility-grips-market" },
          { text: "DeFi Liquidation Crisis", url: "https://blog.makerdao.com/the-market-collapse-of-march-12-2020-how-it-impacted-makerdao/" }
        ]
      };
    }
    
    // May events - Elon Musk Tesla issues
    if (year === 2021 && month === 5 && day >= 18 && day <= 20) {
      return {
        description: "Tesla stops Bitcoin payments, China crackdown",
        context: "Bitcoin crashed over 30% as Tesla suspended Bitcoin payments citing environmental concerns and China intensified its crypto crackdown. The crash wiped out over $500 billion from the crypto market.",
        links: [
          { text: "Elon Musk Suspends Bitcoin Payments", url: "https://twitter.com/elonmusk/status/1392602041025843203" },
          { text: "China Bans Financial Institutions from Crypto Business", url: "https://www.reuters.com/technology/chinese-financial-payment-bodies-barred-cryptocurrency-business-2021-05-18/" },
          { text: "Market Analysis of the Crash", url: "https://www.coindesk.com/markets/2021/05/19/bitcoin-drops-to-30k-losing-ground-to-its-2021-starting-price/" }
        ]
      };
    }
    
    // November events - FTX collapse
    if (year === 2022 && month === 11 && day >= 8 && day <= 10) {
      return {
        description: "FTX collapse",
        context: "The sudden collapse of FTX, one of the world's largest cryptocurrency exchanges, following a CoinDesk report about irregularities in the exchange's balance sheet. This caused a bank run, liquidity crisis, and eventual bankruptcy filing, sending shockwaves through the entire crypto industry.",
        links: [
          { text: "CoinDesk's Balance Sheet Exposé", url: "https://www.coindesk.com/business/2022/11/02/divisions-in-sam-bankman-frieds-crypto-empire-blur-on-his-trading-titan-alamedas-balance-sheet/" },
          { text: "Binance Backs Out of FTX Rescue", url: "https://www.bloomberg.com/news/articles/2022-11-09/binance-seen-likely-to-pull-out-of-ftx-rescue-amid-us-probe-dot-com-era-issues" },
          { text: "FTX Files for Bankruptcy", url: "https://www.wsj.com/articles/ftx-files-for-bankruptcy-ceo-sam-bankman-fried-resigns-11668176869" }
        ]
      };
    }
    
    // Return null if no match found (will be handled by the generateCrashContext function)
    return null;
  }

function generateCrashContext(date, percentageDrop) {
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    
    // Analyze the crash severity
    let severityDesc = "";
    if (percentageDrop > -10) {
      severityDesc = "Minor correction";
    } else if (percentageDrop > -15) {
      severityDesc = "Moderate sell-off";
    } else if (percentageDrop > -20) {
      severityDesc = "Significant drop";
    } else if (percentageDrop > -30) {
      severityDesc = "Major crash";
    } else {
      severityDesc = "Extreme market collapse";
    }

    // Market phase based on the cycle
    const marketPhase = getMarketPhase(year, month);
    
    // Create description based on severity and market phase
    const description = `${severityDesc} during ${year} ${marketPhase}`;
    
    // Generate context using the same sentiment framework we developed
    let sentimentContext = "";
    
    // Analyze if this appears to be a sentiment-driven crash
    if (percentageDrop < -15) {
      // More severe crashes get more detailed sentiment analysis
      if (percentageDrop < -25) {
        sentimentContext = "This was likely a fear-driven liquidation cascade, triggering widespread panic selling and forced liquidations across leveraged positions. ";
      } else {
        sentimentContext = "This drop shows characteristics of negative sentiment driving a market correction, with overleveraged positions being flushed out. ";
      }
      
      // Add volatility context based on drop percentage
      if (percentageDrop < -20) {
        sentimentContext += "Market volatility was extremely high during this period, with fear dominating trader psychology. ";
      } else {
        sentimentContext += "Volatility increased significantly, indicating uncertainty and changing market sentiment. ";
      }
    }
    
    // General market pattern by year
    let yearContext = "";
    if (year <= 2013) {
      yearContext = "Early market volatility period when Bitcoin was thinly traded on few exchanges. Price swings of 10-20% were common even without specific news triggers.";
    } else if (year === 2014 || year === 2015) {
      yearContext = "Post-Mt. Gox collapse bear market where negative sentiment, regulatory uncertainty, and low liquidity contributed to ongoing volatility.";
    } else if (year === 2016) {
      yearContext = "Early recovery period after the 2014-2015 bear market, still characterized by relatively low liquidity and high volatility.";
    } else if (year === 2017) {
      yearContext = "Bull market year with frequent corrections amid the ICO boom, high retail speculation, and rapid price appreciation.";
    } else if (year === 2018) {
      yearContext = "Prolonged bear market following the 2017 bull run, with multiple capitulation events and declining prices throughout the year.";
    } else if (year === 2019) {
      yearContext = "Gradual recovery period with occasional market-wide selloffs, often triggered by large exchange outflows or liquidations.";
    } else if (year === 2020) {
      yearContext = "High volatility year marked by the COVID crash in March followed by institutional adoption and renewed bull market.";
    } else if (year === 2021) {
      yearContext = "Extended bull market with multiple major corrections, influenced by institutional participation, high leverage, and regulatory developments.";
    } else if (year === 2022) {
      yearContext = "Crypto winter following the unwinding of excessive leverage, multiple high-profile protocol/company failures, and Fed rate hikes.";
    } else if (year === 2023) {
      yearContext = "Recovery period with occasional volatility triggered by regulatory developments and ongoing contagion from 2022 failures.";
    } else if (year >= 2024) {
      yearContext = "Current market cycle with volatility influenced by macro factors, regulatory developments, and institutional adoption patterns.";
    }
    
    // Add liquidity context based on year and severity
    let liquidityContext = "";
    if (year <= 2016) {
      liquidityContext = "Market liquidity was relatively thin during this period, magnifying price movements.";
    } else if (year >= 2017 && year <= 2019) {
      liquidityContext = "Despite growing market depth, liquidity still evaporated quickly during sharp declines.";
    } else if (year >= 2020) {
      liquidityContext = "Even with improved institutional liquidity, cascading liquidations could still trigger significant price dislocations.";
    }
    
    // Combine all context elements
    const context = `This price drop occurred during the ${marketPhase} of ${year}. ${sentimentContext}${yearContext} ${liquidityContext}`;
    
    return {
      description: description,
      context: context
    };
  }

export { findHistoricalCrashes, getHistoricalNewsForDate, identifyMostSevereCrashes, getKnownCrashInfo, generateCrashContext };
