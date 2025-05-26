/**
 * Wallet Balance Service
 * Fetches balances for donation addresses across multiple blockchains
 */

export class WalletBalanceService {
  constructor() {
    this.addresses = {
      BTC: 'bc1qmce5xlnhw3mkd7uk3wd2sdd55f9vjpufdefhp8',
      ETH: '0x7aF1e10e2b3a0375DA1B4ca379350B54247D6749',
      BASE: '0x7aF1e10e2b3a0375DA1B4ca379350B54247D6749',
      POLYGON: '0x7aF1e10e2b3a0375DA1B4ca379350B54247D6749',
      SOL: 'FqNV5uKuhUZM6cYEpwirUm8TSZyR4ShgEtoHACfT4ddu',
      SUI: '0x4163af4165b522d888ee1ad7ddf29423492d619e3932351b9718abb04f92e357'
    };
    
    this.cache = new Map();
    this.cacheExpiry = 5 * 60 * 1000; // 5 minutes
  }

  /**
   * Get cached balance if available and not expired
   */
  getCachedBalance(key) {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < this.cacheExpiry) {
      return cached.data;
    }
    return null;
  }

  /**
   * Cache balance data
   */
  setCachedBalance(key, data) {
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });
  }

  /**
   * Fetch Bitcoin balance using Blockchain.info API
   */
  async fetchBitcoinBalance() {
    const cacheKey = 'BTC_balance';
    const cached = this.getCachedBalance(cacheKey);
    if (cached) return cached;

    try {
      // Use blockchain.info API which doesn't require API key
      const response = await fetch(`https://blockchain.info/q/addressbalance/${this.addresses.BTC}`);
      if (!response.ok) throw new Error('Failed to fetch Bitcoin balance');
      
      const satoshis = await response.text();
      const balance = parseInt(satoshis) / 100000000; // Convert satoshis to BTC
      
      const result = {
        symbol: 'BTC',
        balance: balance,
        formattedBalance: balance.toFixed(8),
        usdValue: null,
        error: null
      };
      
      this.setCachedBalance(cacheKey, result);
      return result;
    } catch (error) {
      console.error('Error fetching Bitcoin balance:', error);
      
      // Try alternative API
      try {
        const altResponse = await fetch(`https://api.blockcypher.com/v1/btc/main/addrs/${this.addresses.BTC}/balance`);
        if (altResponse.ok) {
          const data = await altResponse.json();
          const balance = data.balance / 100000000;
          
          const result = {
            symbol: 'BTC',
            balance: balance,
            formattedBalance: balance.toFixed(8),
            usdValue: null,
            error: null
          };
          
          this.setCachedBalance(cacheKey, result);
          return result;
        }
      } catch (altError) {
        console.error('Alternative BTC API also failed:', altError);
      }
      
      return {
        symbol: 'BTC',
        balance: 0,
        formattedBalance: '0.00000000',
        usdValue: null,
        error: error.message
      };
    }
  }

  /**
   * Fetch Ethereum balance using public RPC
   */
  async fetchEthereumBalance() {
    const cacheKey = 'ETH_balance';
    const cached = this.getCachedBalance(cacheKey);
    if (cached) return cached;

    try {
      // Use public Ethereum RPC
      const response = await fetch('https://eth.llamarpc.com', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'eth_getBalance',
          params: [this.addresses.ETH, 'latest'],
          id: 1
        })
      });
      
      if (!response.ok) throw new Error('Failed to fetch Ethereum balance');
      
      const data = await response.json();
      
      if (data.error) {
        throw new Error(data.error.message || 'RPC error');
      }
      
      // Convert hex to decimal
      const balanceWei = parseInt(data.result, 16);
      const balance = balanceWei / Math.pow(10, 18); // Convert wei to ETH
      
      const result = {
        symbol: 'ETH',
        balance: balance,
        formattedBalance: balance.toFixed(6),
        usdValue: null,
        error: null
      };
      
      this.setCachedBalance(cacheKey, result);
      return result;
    } catch (error) {
      console.error('Error fetching Ethereum balance:', error);
      return {
        symbol: 'ETH',
        balance: 0,
        formattedBalance: '0.000000',
        usdValue: null,
        error: error.message
      };
    }
  }

  /**
   * Fetch Polygon balance using public RPC
   */
  async fetchPolygonBalance() {
    const cacheKey = 'POLYGON_balance';
    const cached = this.getCachedBalance(cacheKey);
    if (cached) return cached;

    try {
      // Use public Polygon RPC
      const response = await fetch('https://polygon-rpc.com', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'eth_getBalance',
          params: [this.addresses.POLYGON, 'latest'],
          id: 1
        })
      });
      
      if (!response.ok) throw new Error('Failed to fetch Polygon balance');
      
      const data = await response.json();
      
      if (data.error) {
        throw new Error(data.error.message || 'RPC error');
      }
      
      // Convert hex to decimal
      const balanceWei = parseInt(data.result, 16);
      const balance = balanceWei / Math.pow(10, 18); // Convert wei to MATIC
      
      const result = {
        symbol: 'MATIC',
        balance: balance,
        formattedBalance: balance.toFixed(6),
        usdValue: null,
        error: null
      };
      
      this.setCachedBalance(cacheKey, result);
      return result;
    } catch (error) {
      console.error('Error fetching Polygon balance:', error);
      return {
        symbol: 'MATIC',
        balance: 0,
        formattedBalance: '0.000000',
        usdValue: null,
        error: error.message
      };
    }
  }

/**
 * Fetch Solana balance using Solscan public API
 */
async fetchSolanaBalance() {
  const cacheKey = 'SOL_balance';
  const cached = this.getCachedBalance(cacheKey);
  if (cached) return cached;

  try {
    console.log('Fetching Solana balance from Solscan API...');
    
    // Solscan public API endpoint for account info
    const response = await fetch(`https://public-api.solscan.io/account/${this.addresses.SOL}`);
    
    if (!response.ok) {
      // If Solscan fails, try their tokens endpoint which might give us SOL balance
      const tokensResponse = await fetch(`https://public-api.solscan.io/account/tokens?account=${this.addresses.SOL}`);
      
      if (!tokensResponse.ok) {
        throw new Error(`Solscan API error: ${response.status}`);
      }
      
      const tokensData = await tokensResponse.json();
      console.log('Solscan tokens response:', tokensData);
      
      // Look for native SOL in the response
      const solBalance = tokensData.find(token => token.tokenSymbol === 'SOL' || token.tokenAddress === 'So11111111111111111111111111111111111111112');
      
      if (solBalance) {
        const balance = parseFloat(solBalance.tokenAmount?.uiAmount || 0);
        
        const result = {
          symbol: 'SOL',
          balance: balance,
          formattedBalance: balance.toFixed(6),
          usdValue: null,
          error: null
        };
        
        this.setCachedBalance(cacheKey, result);
        return result;
      }
    }
    
    const data = await response.json();
    console.log('Solscan account data:', data);
    
    // Extract balance from Solscan response
    // Solscan returns lamports in the lamports field
    const lamports = data.lamports || data.balance || 0;
    const balance = lamports / Math.pow(10, 9); // Convert lamports to SOL
    
    const result = {
      symbol: 'SOL',
      balance: balance,
      formattedBalance: balance.toFixed(6),
      usdValue: null,
      error: null
    };
    
    this.setCachedBalance(cacheKey, result);
    console.log(`Successfully fetched Solana balance from Solscan: ${balance} SOL`);
    return result;
    
  } catch (error) {
    console.error('Solscan API failed:', error);
    
    // Last resort - try using a CORS proxy with Solscan
    try {
      console.log('Trying Solscan with CORS proxy...');
      
      // Using cors-anywhere proxy (you might need to use a different proxy)
      const proxyUrl = `https://corsproxy.io/?${encodeURIComponent(
        `https://public-api.solscan.io/account/${this.addresses.SOL}`
      )}`;
      
      const proxyResponse = await fetch(proxyUrl);
      
      if (proxyResponse.ok) {
        const proxyData = await proxyResponse.json();
        const lamports = proxyData.lamports || proxyData.balance || 0;
        const balance = lamports / Math.pow(10, 9);
        
        const result = {
          symbol: 'SOL',
          balance: balance,
          formattedBalance: balance.toFixed(6),
          usdValue: null,
          error: null
        };
        
        this.setCachedBalance(cacheKey, result);
        console.log(`Successfully fetched Solana balance via proxy: ${balance} SOL`);
        return result;
      }
    } catch (proxyError) {
      console.error('Proxy request also failed:', proxyError);
    }
    
    // If all else fails, return a placeholder
    console.error('All Solana balance fetch attempts failed');
    return {
      symbol: 'SOL',
      balance: 0,
      formattedBalance: '0.000000',
      usdValue: null,
      error: 'Unable to fetch - CORS blocked'
    };
  }
}

  /**
   * Fetch Sui balance using public RPC
   */
  async fetchSuiBalance() {
    const cacheKey = 'SUI_balance';
    const cached = this.getCachedBalance(cacheKey);
    if (cached) return cached;

    try {
      const response = await fetch('https://fullnode.mainnet.sui.io:443', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'suix_getBalance',
          params: [
            this.addresses.SUI,
            '0x2::sui::SUI' // SUI coin type
          ]
        })
      });
      
      if (!response.ok) throw new Error('Failed to fetch Sui balance');
      
      const data = await response.json();
      
      if (data.error) {
        throw new Error(data.error.message || 'RPC error');
      }
      
      const balance = parseFloat(data.result?.totalBalance || 0) / Math.pow(10, 9); // Convert MIST to SUI
      
      const result = {
        symbol: 'SUI',
        balance: balance,
        formattedBalance: balance.toFixed(6),
        usdValue: null,
        error: null
      };
      
      this.setCachedBalance(cacheKey, result);
      return result;
    } catch (error) {
      console.error('Error fetching Sui balance:', error);
      return {
        symbol: 'SUI',
        balance: 0,
        formattedBalance: '0.000000',
        usdValue: null,
        error: error.message
      };
    }
  }

  /**
   * Fetch Base balance using public RPC
   */
  async fetchBaseBalance() {
    const cacheKey = 'BASE_balance';
    const cached = this.getCachedBalance(cacheKey);
    if (cached) return cached;

    try {
      // Use public Base RPC
      const response = await fetch('https://mainnet.base.org', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'eth_getBalance',
          params: [this.addresses.BASE, 'latest'],
          id: 1
        })
      });
      
      if (!response.ok) throw new Error('Failed to fetch Base balance');
      
      const data = await response.json();
      
      if (data.error) {
        throw new Error(data.error.message || 'RPC error');
      }
      
      // Convert hex to decimal
      const balanceWei = parseInt(data.result, 16);
      const balance = balanceWei / Math.pow(10, 18); // Convert wei to ETH
      
      const result = {
        symbol: 'ETH',
        network: 'Base',
        balance: balance,
        formattedBalance: balance.toFixed(6),
        usdValue: null,
        error: null
      };
      
      this.setCachedBalance(cacheKey, result);
      return result;
    } catch (error) {
      console.error('Error fetching Base balance:', error);
      return {
        symbol: 'ETH',
        network: 'Base',
        balance: 0,
        formattedBalance: '0.000000',
        usdValue: null,
        error: error.message
      };
    }
  }

  /**
   * Fetch cryptocurrency prices from CoinGecko
   */
  async fetchCryptoPrices() {
    const cacheKey = 'crypto_prices';
    const cached = this.getCachedBalance(cacheKey);
    if (cached) return cached;

    try {
      const response = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum,matic-network,solana,sui&vs_currencies=usd');
      if (!response.ok) throw new Error('Failed to fetch crypto prices');
      
      const data = await response.json();
      const prices = {
        BTC: data.bitcoin?.usd || 0,
        ETH: data.ethereum?.usd || 0,
        MATIC: data['matic-network']?.usd || 0,
        SOL: data.solana?.usd || 0,
        SUI: data.sui?.usd || 0
      };
      
      this.setCachedBalance(cacheKey, prices);
      return prices;
    } catch (error) {
      console.error('Error fetching crypto prices:', error);
      
      // Fallback to approximate prices if API fails
      return {
        BTC: 50000,
        ETH: 3000,
        MATIC: 0.8,
        SOL: 100,
        SUI: 3.5
      };
    }
  }

  /**
   * Fetch all wallet balances
   */
  async fetchAllBalances() {
    try {
      // Fetch all balances concurrently
      const [btcBalance, ethBalance, polygonBalance, solBalance, suiBalance, baseBalance, prices] = await Promise.all([
        this.fetchBitcoinBalance(),
        this.fetchEthereumBalance(),
        this.fetchPolygonBalance(),
        this.fetchSolanaBalance(),
        this.fetchSuiBalance(),
        this.fetchBaseBalance(),
        this.fetchCryptoPrices()
      ]);

      // Add USD values to balances
      const balances = [btcBalance, ethBalance, polygonBalance, solBalance, suiBalance, baseBalance].map(balance => {
        if (!balance.error && prices[balance.symbol] && !isNaN(balance.balance)) {
          balance.usdValue = balance.balance * prices[balance.symbol];
          balance.formattedUsdValue = balance.usdValue.toFixed(2);
        }
        return balance;
      });

      // Calculate total USD value
      const totalUsdValue = balances.reduce((total, balance) => {
        return total + (balance.usdValue || 0);
      }, 0);

      return {
        balances,
        totalUsdValue,
        formattedTotalUsdValue: totalUsdValue.toFixed(2),
        lastUpdated: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error fetching wallet balances:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const walletBalanceService = new WalletBalanceService();
