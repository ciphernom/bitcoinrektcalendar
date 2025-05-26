/**
 * Wallet Balance Component
 * Displays donation wallet balances on the main page
 */

// Fix the import path - remove the leading slash and fix the typo
import { walletBalanceService } from '../services/wallet-balance-service.js';

export class WalletBalanceComponent {
  constructor() {
    this.balanceData = null;
    this.updateInterval = null;
    this.refreshRate = 5 * 60 * 1000; // 5 minutes
    this.initialized = false; // Add initialization flag
  }

  /**
   * Initialize the wallet balance component
   */
  async initialize() {
    // Prevent double initialization
    if (this.initialized) {
      console.log('Wallet balance component already initialized');
      return;
    }
    
    console.log('Initializing wallet balance component...');
    this.initialized = true;
    
    // Create the balance display element
    this.createBalanceDisplay();
    
    // Delay initial balance loading to avoid interference
    setTimeout(async () => {
      await this.updateBalances();
      this.startAutoRefresh();
    }, 2000); // 2 second delay
  }

/**
 * Create the HTML structure for balance display
 */
createBalanceDisplay() {
  // Find the sentiment container to insert AFTER it
  const sentimentContainer = document.getElementById('sentimentContainer');
  
  if (!sentimentContainer || !sentimentContainer.parentElement) {
    console.error('Could not find sentiment container for wallet balance display');
    return;
  }

  // Create wallet balance section
  const balanceSection = document.createElement('div');
  balanceSection.id = 'walletBalanceSection';
  balanceSection.className = 'wallet-balance-section';
  balanceSection.style.display = 'none'; // Initially hidden
  
  balanceSection.innerHTML = `
    <div class="wallet-balance-header">
      <h2 class="wallet-balance-title">
        💰 Support the Project - Donation Wallets
      </h2>
      <div class="wallet-balance-subtitle">
        Real-time balances across all supported networks
      </div>
      <button class="wallet-balance-toggle" id="walletBalanceToggle">
        Show Balances
      </button>
    </div>
    
    <div class="wallet-balance-content" id="walletBalanceContent" style="display: none;">
      <div class="wallet-balance-total" id="walletBalanceTotal">
        <div class="total-label">Total Donations Received</div>
        <div class="total-amount" id="totalAmount">$0.00</div>
        <div class="total-subtitle">Thank you for supporting the Calendar of Rekt!</div>
      </div>
      
      <div class="wallet-balance-grid" id="walletBalanceGrid">
        <!-- Balance cards will be populated here -->
      </div>
      
      <div class="wallet-balance-footer">
        <div class="donation-message">
          Your donations help keep this project running and fund ongoing improvements
        </div>
        <div class="last-updated" id="lastUpdated">Last updated: Never</div>
        <button class="refresh-balances" id="refreshBalances">🔄 Refresh</button>
      </div>
    </div>
  `;

  // Insert AFTER sentiment container
  sentimentContainer.parentElement.insertBefore(balanceSection, sentimentContainer.nextSibling);

  // Add event listeners
  this.setupEventListeners();
  
  // Show the section with animation
  setTimeout(() => {
    balanceSection.style.display = 'block';
    balanceSection.style.animation = 'fadeIn 1s ease';
  }, 100);
}

  /**
   * Set up event listeners
   */
  setupEventListeners() {
    const toggleButton = document.getElementById('walletBalanceToggle');
    const refreshButton = document.getElementById('refreshBalances');

    if (toggleButton) {
      toggleButton.addEventListener('click', () => {
        this.toggleBalanceDisplay();
      });
    }

    if (refreshButton) {
      refreshButton.addEventListener('click', async () => {
        await this.updateBalances(true);
      });
    }
  }

  /**
   * Toggle balance display visibility
   */
  toggleBalanceDisplay() {
    const content = document.getElementById('walletBalanceContent');
    const toggle = document.getElementById('walletBalanceToggle');

    if (!content || !toggle) return;

    const isVisible = content.style.display !== 'none';
    
    if (isVisible) {
      content.style.display = 'none';
      toggle.textContent = 'Show Balances';
      toggle.classList.remove('expanded');
    } else {
      content.style.display = 'block';
      toggle.textContent = 'Hide Balances';
      toggle.classList.add('expanded');
      
      // Update balances when showing
      if (!this.balanceData) {
        this.updateBalances();
      }
    }
  }

  /**
   * Update wallet balances
   */
  async updateBalances(forceRefresh = false) {
    const grid = document.getElementById('walletBalanceGrid');
    const totalAmount = document.getElementById('totalAmount');
    const lastUpdated = document.getElementById('lastUpdated');
    const refreshButton = document.getElementById('refreshBalances');

    if (!grid) return;

    // Show loading state
    if (refreshButton) {
      refreshButton.innerHTML = '🔄 Updating...';
      refreshButton.disabled = true;
    }

    // Add loading animation to grid
    if (!this.balanceData) {
      grid.innerHTML = `
        <div class="balance-loading">
          <div class="loading-spinner"></div>
          <div class="loading-text">Loading wallet balances...</div>
        </div>
      `;
    }

    try {
      // Clear cache if force refresh
      if (forceRefresh && walletBalanceService.cache) {
        walletBalanceService.cache.clear();
      }

      this.balanceData = await walletBalanceService.fetchAllBalances();
      
      // Update total amount with animation
      if (totalAmount) {
        totalAmount.textContent = `$${this.balanceData.formattedTotalUsdValue}`;
        totalAmount.style.animation = 'none';
        setTimeout(() => {
          totalAmount.style.animation = 'balanceUpdate 0.5s ease-out';
        }, 10);
      }

      // Update balance grid
      this.renderBalanceCards();

      // Update last updated time
      if (lastUpdated) {
        const updateTime = new Date(this.balanceData.lastUpdated);
        lastUpdated.textContent = `Last updated: ${updateTime.toLocaleTimeString()}`;
      }

    } catch (error) {
      console.error('Error updating wallet balances:', error);
      
      // Show error state
      if (grid) {
        grid.innerHTML = `
          <div class="balance-error">
            <div class="error-icon">⚠️</div>
            <div class="error-message">Failed to load wallet balances</div>
            <div class="error-details">${error.message}</div>
            <div class="error-help">Please try refreshing in a few moments</div>
          </div>
        `;
      }
    } finally {
      // Reset refresh button
      if (refreshButton) {
        refreshButton.innerHTML = '🔄 Refresh';
        refreshButton.disabled = false;
      }
    }
  }

/**
 * Render balance cards
 */
renderBalanceCards() {
  const grid = document.getElementById('walletBalanceGrid');
  if (!grid || !this.balanceData) return;

  grid.innerHTML = this.balanceData.balances.map(balance => {
    const hasError = balance.error;
    const networkLabel = balance.network ? ` (${balance.network})` : '';
    const hasValidBalance = !isNaN(balance.balance) && balance.balance !== null;
    
    return `
      <div class="balance-card ${hasError ? 'error' : ''} ${!hasValidBalance ? 'no-data' : ''}">
        <div class="balance-card-header">
          <div class="crypto-info">
            <div class="crypto-symbol">${balance.symbol}${networkLabel}</div>
            <div class="crypto-name">${this.getCryptoName(balance.symbol, balance.network)}</div>
          </div>
          <div class="crypto-icon">${this.getCryptoIcon(balance.symbol)}</div>
        </div>
        
        <div class="balance-amounts">
          ${hasError ? `
            <div class="balance-error-small">
              <div class="error-icon">⚠️</div>
              <div class="error-text">Unable to load</div>
            </div>
          ` : !hasValidBalance ? `
            <div class="balance-error-small">
              <div class="error-icon">⏳</div>
              <div class="error-text">Loading...</div>
            </div>
          ` : `
            <div class="crypto-balance">
              ${balance.formattedBalance} ${balance.symbol}
            </div>
            ${balance.formattedUsdValue && !isNaN(parseFloat(balance.formattedUsdValue)) ? `
              <div class="usd-balance">
                $${balance.formattedUsdValue}
              </div>
            ` : ''}
          `}
        </div>
        
        <div class="balance-card-footer">
          <div class="wallet-address" title="${this.getWalletAddress(balance.symbol, balance.network)}">
            ${this.truncateAddress(this.getWalletAddress(balance.symbol, balance.network))}
          </div>
        </div>
      </div>
    `;
  }).join('');
}

  /**
   * Get wallet address for display
   */
  getWalletAddress(symbol, network) {
    const addresses = {
      'BTC': 'bc1qmce5xlnhw3mkd7uk3wd2sdd55f9vjpufdefhp8',
      'ETH': '0x7aF1e10e2b3a0375DA1B4ca379350B54247D6749',
      'MATIC': '0x7aF1e10e2b3a0375DA1B4ca379350B54247D6749',
      'SOL': 'FqNV5uKuhUZM6cYEpwirUm8TSZyR4ShgEtoHACfT4ddu',
      'SUI': '0x4163af4165b522d888ee1ad7ddf29423492d619e3932351b9718abb04f92e357'
    };
    
    if (network === 'Base') {
      return '0x7aF1e10e2b3a0375DA1B4ca379350B54247D6749';
    }
    
    return addresses[symbol] || '';
  }

  /**
   * Truncate address for display
   */
  truncateAddress(address) {
    if (!address) return '';
    if (address.length <= 12) return address;
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  }

  /**
   * Get crypto name for display
   */
  getCryptoName(symbol, network) {
    if (network) {
      return `${symbol} on ${network}`;
    }
    
    const nameMap = {
      'BTC': 'Bitcoin',
      'ETH': 'Ethereum',
      'MATIC': 'Polygon',
      'SOL': 'Solana',
      'SUI': 'Sui Network'
    };
    
    return nameMap[symbol] || symbol;
  }

  /**
   * Get crypto icon for display
   */
  getCryptoIcon(symbol) {
    const iconMap = {
      'BTC': '₿',
      'ETH': 'Ξ',
      'MATIC': '⬟',
      'SOL': '◎',
      'SUI': '🌊'
    };
    
    return iconMap[symbol] || '💰';
  }

  /**
   * Start auto-refresh timer
   */
  startAutoRefresh() {
    // Clear existing interval if any
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
    }
    
    this.updateInterval = setInterval(() => {
      // Only auto-refresh if the balance display is visible
      const content = document.getElementById('walletBalanceContent');
      if (content && content.style.display !== 'none') {
        this.updateBalances();
      }
    }, this.refreshRate);
  }

  /**
   * Stop auto-refresh timer
   */
  stopAutoRefresh() {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }
  }

  /**
   * Cleanup component
   */
  destroy() {
    this.stopAutoRefresh();
    
    const balanceSection = document.getElementById('walletBalanceSection');
    if (balanceSection) {
      balanceSection.remove();
    }
    
    this.initialized = false;
  }
}

// Export singleton instance
export const walletBalance = new WalletBalanceComponent();
