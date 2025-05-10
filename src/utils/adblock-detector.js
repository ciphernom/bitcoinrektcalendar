/**
 * Calendar of Rekt - Production-Ready Bitcoin Adblock Detector
 * Version 1.1.0
 * 
 * A robust adblock detection system with Bitcoin payment option
 * with blockchain verification and cross-browser compatibility.
 */

// Self-executing anonymous function to avoid global scope pollution
(function() {
  // Configuration
  const CONFIG = {
    enabled: true,
    debug: false,
    detectionDelay: 1200,
    dismissExpirationHours: 24,
    maxDismissals: 3,
    paymentValidDays: 365, // 1 full year access
    bitcoinPayment: {
      address: "bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh", // Example valid address format
      amountUSD: 9.99,
      btcAmount: 0.0002, // Will be updated via API if possible
      message: "CalendarOfRekt Access"
    },
    storage: {
      keys: {
        payment: "btc_payment_verified_v1",
        tempAccess: "adblock_temp_access_v1",
        dismissCount: "adblock_dismiss_count_v1"
      },
      useLocalStorage: true,
      useSessionStorage: true, // Fallback if localStorage is unavailable
      useCookies: true // Fallback if both storages are unavailable
    },
    appearance: {
      primaryColor: "#f7931a", // Bitcoin orange
      darkBackground: "#111111",
      lightBackground: "#1a1a1a",
      borderColor: "#333333",
      textColor: "#ffffff",
      textColorDim: "#aaaaaa",
      successColor: "#4BB543",
      zIndex: 2147483647 // Maximum z-index
    }
  };

  // State management
  const state = {
    detectionComplete: false,
    adblockDetected: false,
    paymentVerified: false,
    currentBtcPrice: null,
    lastPriceCheck: 0,
    qrCodeGenerated: false,
    deviceType: detectDeviceType(),
    browserInfo: detectBrowser(),
    storageAvailable: checkStorageAvailability(),
    phantomInstalled: typeof window.bitcoin !== 'undefined'
  };

  /**
   * Main initialization function
   */
  function initialize() {
    if (!CONFIG.enabled) {
      return;
    }

    // Check if payment already completed
    if (checkPaymentStatus()) {
      if (CONFIG.debug) console.log("[Adblock Detector] Valid payment found, bypass enabled");
      return;
    }

    // Check if temporary access granted
    if (checkTemporaryAccess()) {
      if (CONFIG.debug) console.log("[Adblock Detector] Temporary access granted");
      return;
    }

    // Perform detection after delay to ensure page is fully loaded
    setTimeout(() => {
      detectAdblock();
    }, CONFIG.detectionDelay);

    // Fetch current Bitcoin price in background
    fetchBitcoinPrice();
  }

  /**
   * Detect device type for optimizing UI
   */
  function detectDeviceType() {
    const userAgent = navigator.userAgent.toLowerCase();
    const isMobile = /iphone|ipad|ipod|android|blackberry|mini|windows\sce|palm/i.test(userAgent);
    const isTablet = /(ipad|tablet|playbook|silk)|(android(?!.*mobile))/i.test(userAgent);
    
    return {
      isMobile: isMobile,
      isTablet: isTablet,
      isDesktop: !isMobile && !isTablet,
      isIOS: /iphone|ipad|ipod/i.test(userAgent),
      isAndroid: /android/i.test(userAgent)
    };
  }

  /**
   * Detect browser type and version
   */
  function detectBrowser() {
    const userAgent = navigator.userAgent;
    let browser = "Unknown";
    let version = "Unknown";
    
    // Detect Chrome
    if (/Chrome/.test(userAgent) && !/Chromium|Edge|Edg|OPR|Opera/.test(userAgent)) {
      browser = "Chrome";
      version = userAgent.match(/Chrome\/(\d+\.\d+)/)[1];
    } 
    // Detect Firefox
    else if (/Firefox/.test(userAgent)) {
      browser = "Firefox";
      version = userAgent.match(/Firefox\/(\d+\.\d+)/)[1];
    } 
    // Detect Safari
    else if (/Safari/.test(userAgent) && !/Chrome|Chromium|Edge|Edg|OPR|Opera/.test(userAgent)) {
      browser = "Safari";
      version = userAgent.match(/Version\/(\d+\.\d+)/)[1];
    } 
    // Detect Edge
    else if (/Edg/.test(userAgent)) {
      browser = "Edge";
      version = userAgent.match(/Edg\/(\d+\.\d+)/)[1];
    } 
    // Detect Opera
    else if (/OPR|Opera/.test(userAgent)) {
      browser = "Opera";
      version = /OPR/.test(userAgent) ? userAgent.match(/OPR\/(\d+\.\d+)/)[1] : userAgent.match(/Opera\/(\d+\.\d+)/)[1];
    }
    
    return { browser, version };
  }

  /**
   * Check available storage methods
   */
  function checkStorageAvailability() {
    const storage = {
      localStorage: false,
      sessionStorage: false,
      cookies: navigator.cookieEnabled
    };
    
    // Test localStorage
    try {
      localStorage.setItem('test', 'test');
      localStorage.removeItem('test');
      storage.localStorage = true;
    } catch (e) {
      storage.localStorage = false;
    }
    
    // Test sessionStorage
    try {
      sessionStorage.setItem('test', 'test');
      sessionStorage.removeItem('test');
      storage.sessionStorage = true;
    } catch (e) {
      storage.sessionStorage = false;
    }
    
    return storage;
  }

  /**
   * Robust adblock detection using multiple methods
   */
  function detectAdblock() {
    // Don't run detection twice
    if (state.detectionComplete) {
      return;
    }

    // Check for development environments
    if (CONFIG.bypassInDevMode && isDevEnvironment()) {
      if (CONFIG.debug) console.log("[Adblock Detector] Development environment detected, bypassing");
      return;
    }

    // Use multiple detection methods for better accuracy
    const detectionMethods = {
      baitElements: detectWithBaitElements(),
      adsenseCheck: checkAdsenseBlocked(),
      heightCheck: checkAdDivHeight()
    };

    // We'll wait for all async methods to complete
    Promise.all([
      detectionMethods.baitElements, 
      detectionMethods.adsenseCheck, 
      detectionMethods.heightCheck
    ]).then(results => {
      // If any detection method returns true, consider adblock detected
      const adblockDetected = results.some(result => result === true);
      
      if (adblockDetected) {
        state.adblockDetected = true;
        if (CONFIG.debug) console.log("[Adblock Detector] Adblock detected");
        showAdblockOverlay();
      } else {
        if (CONFIG.debug) console.log("[Adblock Detector] No adblock detected");
      }
      
      state.detectionComplete = true;
    });
  }

  /**
   * Check if browser is in a development environment
   */
  function isDevEnvironment() {
    return (
      window.location.hostname === 'localhost' || 
      window.location.hostname === '127.0.0.1' ||
      window.location.hostname.includes('dev.') ||
      window.location.hostname.includes('staging.') ||
      window.location.hostname.includes('.test') ||
      window.location.hostname.includes('.local')
    );
  }

  /**
   * Detect adblock using bait elements
   * @returns {Promise<boolean>} Whether adblock was detected
   */
  function detectWithBaitElements() {
    return new Promise(resolve => {
      // Use multiple bait classes that common adblockers target
      const baitClasses = [
        'ad-unit adsbox ad-placement',
        'adsbygoogle',
        'ad-banner ad-block adbanner',
        'ad-box banner-ad sponsor-ad',
        'advertising banner-ads ad-container'
      ];
      
      let blockedCount = 0;
      const baitElements = [];
      
      // Create each bait element
      baitClasses.forEach((className, index) => {
        try {
          const bait = document.createElement('div');
          bait.className = className;
          bait.id = `bait-element-${Date.now()}-${index}`;
          bait.innerHTML = '&nbsp;';
          bait.style.cssText = 'position: absolute; top: -999px; height: 10px; width: 10px; opacity: 0.01;';
          document.body.appendChild(bait);
          baitElements.push(bait);
        } catch (e) {
          if (CONFIG.debug) console.error(`[Adblock Detector] Error creating bait ${index}:`, e);
        }
      });
      
      // Check after a delay
      setTimeout(() => {
        baitElements.forEach(bait => {
          try {
            if (!document.body.contains(bait)) {
              // Element was removed from DOM
              blockedCount++;
            } else {
              const style = window.getComputedStyle(bait);
              const isBlocked = 
                bait.offsetHeight === 0 || 
                bait.clientHeight === 0 || 
                style.display === 'none' || 
                style.visibility === 'hidden' || 
                style.opacity === '0' || 
                parseFloat(style.opacity) === 0;
                
              if (isBlocked) {
                blockedCount++;
              }
            }
          } catch (e) {
            if (CONFIG.debug) console.error('[Adblock Detector] Error checking bait:', e);
          }
        });
        
        // Clean up bait elements
        baitElements.forEach(bait => {
          try {
            if (document.body.contains(bait)) {
              document.body.removeChild(bait);
            }
          } catch (e) {
            if (CONFIG.debug) console.error('[Adblock Detector] Error removing bait:', e);
          }
        });
        
        // Consider adblock detected if multiple baits were blocked
        resolve(blockedCount >= 2);
      }, 100);
    });
  }

  /**
   * Check if AdSense is blocked
   * @returns {Promise<boolean>} Whether AdSense is blocked
   */
  function checkAdsenseBlocked() {
    return new Promise(resolve => {
      // Only run this test if Google AdSense script exists
      const hasAdSenseScript = !!document.querySelector('script[src*="adsbygoogle"]');
      
      if (!hasAdSenseScript) {
        resolve(false);
        return;
      }
      
      // Check if AdSense is properly loaded
      setTimeout(() => {
        const adSenseLoaded = (
          typeof window.adsbygoogle !== 'undefined' && 
          Array.isArray(window.adsbygoogle)
        );
        
        resolve(!adSenseLoaded);
      }, 500);
    });
  }

  /**
   * Create a div that should have a specific height if ads are allowed
   * @returns {Promise<boolean>} Whether the div's height was affected
   */
  function checkAdDivHeight() {
    return new Promise(resolve => {
      try {
        const wrapper = document.createElement('div');
        wrapper.innerHTML = '<div class="ad-placeholder" id="ad-detector" style="height: 10px; width: 10px;">&nbsp;</div>';
        wrapper.style.cssText = 'position: absolute; left: -999px; top: -999px;';
        document.body.appendChild(wrapper);
        
        setTimeout(() => {
          const adDiv = document.getElementById('ad-detector');
          const blocked = !adDiv || adDiv.offsetHeight !== 10;
          
          // Clean up
          document.body.removeChild(wrapper);
          
          resolve(blocked);
        }, 100);
      } catch (e) {
        if (CONFIG.debug) console.error('[Adblock Detector] Height check error:', e);
        resolve(false);
      }
    });
  }

  /**
   * Fetch current Bitcoin price from API
   */
  function fetchBitcoinPrice() {
    // Only fetch once per hour
    const now = Date.now();
    if (now - state.lastPriceCheck < 3600000 && state.currentBtcPrice !== null) {
      return;
    }
    
    // Use CoinGecko API
    fetch('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd')
      .then(response => response.json())
      .then(data => {
        if (data && data.bitcoin && data.bitcoin.usd) {
          state.currentBtcPrice = data.bitcoin.usd;
          state.lastPriceCheck = now;
          
          // Update BTC amount based on USD price
          CONFIG.bitcoinPayment.btcAmount = (CONFIG.bitcoinPayment.amountUSD / state.currentBtcPrice).toFixed(8);
          
          if (CONFIG.debug) console.log(`[Adblock Detector] BTC Price: $${state.currentBtcPrice}, Amount: ${CONFIG.bitcoinPayment.btcAmount} BTC`);
          
          // Update UI if payment modal is open
          const btcAmountEl = document.getElementById('btc-amount-display');
          if (btcAmountEl) {
            btcAmountEl.textContent = CONFIG.bitcoinPayment.btcAmount;
          }
        }
      })
      .catch(err => {
        if (CONFIG.debug) console.error('[Adblock Detector] Error fetching BTC price:', err);
      });
  }

  /**
   * Check if user has a valid payment
   * @returns {boolean} Whether user has valid payment
   */
  function checkPaymentStatus() {
    const paymentData = getFromStorage(CONFIG.storage.keys.payment);
    
    if (!paymentData) {
      return false;
    }
    
    try {
      const payment = JSON.parse(paymentData);
      const now = Date.now();
      
      // Check if payment is still valid
      if (payment.validUntil && payment.validUntil > now) {
        return true;
      } else {
        // Payment expired, remove it
        removeFromStorage(CONFIG.storage.keys.payment);
        return false;
      }
    } catch (e) {
      if (CONFIG.debug) console.error('[Adblock Detector] Error checking payment:', e);
      removeFromStorage(CONFIG.storage.keys.payment);
      return false;
    }
  }

  /**
   * Check if user has temporary access
   * @returns {boolean} Whether temporary access is valid
   */
  function checkTemporaryAccess() {
    const tempAccessData = getFromStorage(CONFIG.storage.keys.tempAccess);
    
    if (!tempAccessData) {
      return false;
    }
    
    try {
      const tempAccess = JSON.parse(tempAccessData);
      const now = Date.now();
      
      // Check if temporary access is still valid
      if (tempAccess.expiration && tempAccess.expiration > now) {
        return true;
      } else {
        // Access expired, remove it
        removeFromStorage(CONFIG.storage.keys.tempAccess);
        return false;
      }
    } catch (e) {
      if (CONFIG.debug) console.error('[Adblock Detector] Error checking temp access:', e);
      removeFromStorage(CONFIG.storage.keys.tempAccess);
      return false;
    }
  }

  /**
   * Store data using available storage methods
   * @param {string} key The storage key
   * @param {string} value The value to store
   */
  function saveToStorage(key, value) {
    if (state.storageAvailable.localStorage && CONFIG.storage.useLocalStorage) {
      try {
        localStorage.setItem(key, value);
      } catch (e) {
        if (CONFIG.debug) console.error('[Adblock Detector] localStorage error:', e);
      }
    }
    
    if (state.storageAvailable.sessionStorage && CONFIG.storage.useSessionStorage) {
      try {
        sessionStorage.setItem(key, value);
      } catch (e) {
        if (CONFIG.debug) console.error('[Adblock Detector] sessionStorage error:', e);
      }
    }
    
    if (state.storageAvailable.cookies && CONFIG.storage.useCookies) {
      try {
        // Set cookie with 1 year expiration
        const expires = new Date();
        expires.setFullYear(expires.getFullYear() + 1);
        document.cookie = `${key}=${encodeURIComponent(value)};expires=${expires.toUTCString()};path=/;SameSite=Strict`;
      } catch (e) {
        if (CONFIG.debug) console.error('[Adblock Detector] cookie error:', e);
      }
    }
  }

  /**
   * Get data from available storage methods
   * @param {string} key The storage key
   * @returns {string|null} The stored value or null
   */
  function getFromStorage(key) {
    // Try localStorage first
    if (state.storageAvailable.localStorage && CONFIG.storage.useLocalStorage) {
      try {
        const value = localStorage.getItem(key);
        if (value !== null) {
          return value;
        }
      } catch (e) {
        if (CONFIG.debug) console.error('[Adblock Detector] localStorage get error:', e);
      }
    }
    
    // Try sessionStorage next
    if (state.storageAvailable.sessionStorage && CONFIG.storage.useSessionStorage) {
      try {
        const value = sessionStorage.getItem(key);
        if (value !== null) {
          return value;
        }
      } catch (e) {
        if (CONFIG.debug) console.error('[Adblock Detector] sessionStorage get error:', e);
      }
    }
    
    // Try cookies last
    if (state.storageAvailable.cookies && CONFIG.storage.useCookies) {
      try {
        const cookies = document.cookie.split(';');
        for (let i = 0; i < cookies.length; i++) {
          const cookie = cookies[i].trim();
          if (cookie.startsWith(key + '=')) {
            return decodeURIComponent(cookie.substring(key.length + 1));
          }
        }
      } catch (e) {
        if (CONFIG.debug) console.error('[Adblock Detector] cookie get error:', e);
      }
    }
    
    return null;
  }

  /**
   * Remove data from all storage methods
   * @param {string} key The storage key to remove
   */
  function removeFromStorage(key) {
    if (state.storageAvailable.localStorage && CONFIG.storage.useLocalStorage) {
      try {
        localStorage.removeItem(key);
      } catch (e) {
        if (CONFIG.debug) console.error('[Adblock Detector] localStorage remove error:', e);
      }
    }
    
    if (state.storageAvailable.sessionStorage && CONFIG.storage.useSessionStorage) {
      try {
        sessionStorage.removeItem(key);
      } catch (e) {
        if (CONFIG.debug) console.error('[Adblock Detector] sessionStorage remove error:', e);
      }
    }
    
    if (state.storageAvailable.cookies && CONFIG.storage.useCookies) {
      try {
        document.cookie = `${key}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;SameSite=Strict`;
      } catch (e) {
        if (CONFIG.debug) console.error('[Adblock Detector] cookie remove error:', e);
      }
    }
  }

  /**
   * Show the adblock detected overlay
   */
  function showAdblockOverlay() {
    // Create overlay container
    const overlay = document.createElement('div');
    overlay.id = 'adblock-overlay';
    overlay.className = 'adblock-overlay';
    overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background-color: rgba(0, 0, 0, 0.9);
      z-index: ${CONFIG.appearance.zIndex - 1};
      display: flex;
      justify-content: center;
      align-items: center;
      animation: adbFadeIn 0.3s ease;
    `;
    
    // CSS animations
    const style = document.createElement('style');
    style.textContent = `
      @keyframes adbFadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
      }
      @keyframes adbSlideIn {
        from { transform: translateY(20px); opacity: 0; }
        to { transform: translateY(0); opacity: 1; }
      }
      @keyframes adbPulse {
        0% { transform: scale(1); }
        50% { transform: scale(1.05); }
        100% { transform: scale(1); }
      }
      .adblock-content-box {
        animation: adbSlideIn 0.4s ease;
      }
      .adblock-btn-primary:hover {
        transform: translateY(-2px);
        box-shadow: 0 5px 15px rgba(247, 147, 26, 0.3);
      }
      .adblock-btn-secondary:hover {
        background-color: rgba(255, 255, 255, 0.1);
      }
    `;
    document.head.appendChild(style);
    
    // Create content
    const content = document.createElement('div');
    content.className = 'adblock-content-box';
    content.style.cssText = `
      max-width: 500px;
      width: 90%;
      background-color: ${CONFIG.appearance.lightBackground};
      border-radius: 12px;
      padding: 2rem;
      text-align: center;
      color: ${CONFIG.appearance.textColor};
      box-shadow: 0 10px 25px rgba(0, 0, 0, 0.5);
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    `;
    
    // Bitcoin logo SVG
    const bitcoinLogo = `
      <svg width="70" height="70" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" style="margin-bottom: 1rem;">
        <path fill="${CONFIG.appearance.primaryColor}" d="M23.638 14.904c-1.602 6.43-8.113 10.34-14.542 8.736C2.67 22.05-1.244 15.525.362 9.105 1.962 2.67 8.475-1.243 14.9.358c6.43 1.605 10.342 8.115 8.738 14.548v-.002zm-6.35-4.613c.24-1.59-.974-2.45-2.64-3.03l.54-2.153-1.315-.33-.525 2.107c-.345-.087-.705-.167-1.064-.25l.526-2.127-1.32-.33-.54 2.165c-.285-.067-.565-.132-.84-.2l-1.815-.45-.35 1.407s.975.225.955.236c.535.136.63.486.615.766l-1.477 5.92c-.075.166-.24.406-.614.314.015.02-.96-.24-.96-.24l-.66 1.51 1.71.426.93.242-.54 2.19 1.32.327.54-2.17c.36.1.705.19 1.05.273l-.51 2.154 1.32.33.545-2.19c2.24.427 3.93.257 4.64-1.774.57-1.637-.03-2.58-1.217-3.196.854-.193 1.5-.76 1.68-1.93h.01zm-3.01 4.22c-.404 1.64-3.157.75-4.05.53l.72-2.9c.896.23 3.757.67 3.33 2.37zm.41-4.24c-.37 1.49-2.662.735-3.405.55l.654-2.64c.744.18 3.137.52 2.75 2.084v.006z"/>
      </svg>
    `;
    
    // Create content HTML
    content.innerHTML = `
      ${bitcoinLogo}
      <h2 style="color: ${CONFIG.appearance.primaryColor}; margin-top: 0.5rem; font-size: 1.8rem; font-weight: 700;">Adblock Detected</h2>
      <p style="margin: 1.5rem 0; line-height: 1.5; font-size: 1.1rem;">We've detected that you're using an adblocker. The Calendar of Rekt is supported by ads to keep our Bitcoin crash risk forecasts available.</p>
      
      <div style="display: flex; margin: 2rem 0; justify-content: space-around; flex-wrap: wrap; gap: 1.2rem;">
        <div style="flex: 1; min-width: 200px; background: ${CONFIG.appearance.darkBackground}; padding: 1.5rem; border-radius: 8px; border: 1px solid ${CONFIG.appearance.borderColor};">
          <h3 style="color: ${CONFIG.appearance.primaryColor}; margin-top: 0; font-size: 1.3rem;">Option 1: Disable Adblocker</h3>
          <p style="margin-bottom: 1.2rem; font-size: 0.95rem;">Disable your adblocker and refresh to support us with non-intrusive ads.</p>
          <button id="adblock-refresh" class="adblock-btn-primary" style="background: ${CONFIG.appearance.primaryColor}; border: none; color: white; padding: 12px 20px; border-radius: 6px; cursor: pointer; font-weight: 600; width: 100%; font-size: 1rem; transition: all 0.2s ease;">Disable & Refresh</button>
        </div>
        
        <div style="flex: 1; min-width: 200px; background: ${CONFIG.appearance.darkBackground}; padding: 1.5rem; border-radius: 8px; border: 1px solid ${CONFIG.appearance.borderColor};">
          <h3 style="color: ${CONFIG.appearance.primaryColor}; margin-top: 0; font-size: 1.3rem;">Option 2: Pay with Bitcoin</h3>
          <p style="margin-bottom: 1.2rem; font-size: 0.95rem;">Keep your adblocker and support us with a one-time Bitcoin payment for 1 year access.</p>
          <button id="bitcoin-payment" class="adblock-btn-primary" style="background: ${CONFIG.appearance.primaryColor}; border: none; color: white; padding: 12px 20px; border-radius: 6px; cursor: pointer; font-weight: 600; width: 100%; font-size: 1rem; transition: all 0.2s ease;">Pay $${CONFIG.bitcoinPayment.amountUSD} with Bitcoin</button>
        </div>
      </div>
      
      <div style="margin-top: 1rem; font-size: 0.85rem; opacity: 0.7; text-align: center;">
        <button id="adblock-continue" class="adblock-btn-secondary" style="background: transparent; border: 1px solid ${CONFIG.appearance.borderColor}; color: ${CONFIG.appearance.textColorDim}; padding: 8px 16px; border-radius: 4px; cursor: pointer; font-size: 0.9rem; transition: all 0.2s ease;">Continue for Now</button>
      </div>
    `;
    
    // Add to DOM
    overlay.appendChild(content);
    document.body.appendChild(overlay);
    
    // Handle refresh button click
    document.getElementById('adblock-refresh').addEventListener('click', () => {
      location.reload();
    });
    
    // Handle Bitcoin payment button click
    document.getElementById('bitcoin-payment').addEventListener('click', () => {
      showBitcoinPaymentModal(overlay);
    });
    
    // Handle temporary access button click
    document.getElementById('adblock-continue').addEventListener('click', () => {
      handleTemporaryAccess();
      overlay.remove();
    });
    
    // Prevent scrolling on the underlying page
    document.body.style.overflow = 'hidden';
  }

  /**
   * Show Bitcoin payment modal
   * @param {HTMLElement} parentOverlay The parent overlay element
   */
  function showBitcoinPaymentModal(parentOverlay) {
    // Create payment modal
    const paymentModal = document.createElement('div');
    paymentModal.className = 'bitcoin-payment-modal';
    paymentModal.style.cssText = `
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      width: 90%;
      max-width: 450px;
      background-color: ${CONFIG.appearance.lightBackground};
      padding: 2rem;
      border-radius: 12px;
      border: 1px solid ${CONFIG.appearance.primaryColor};
      box-shadow: 0 5px 30px rgba(0, 0, 0, 0.7);
      text-align: center;
      color: ${CONFIG.appearance.textColor};
      z-index: ${CONFIG.appearance.zIndex};
      animation: adbSlideIn 0.3s ease;
    `;
    
    // Clipboard icon SVG
    const clipboardIcon = `
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
      </svg>
    `;
    
    // Generate QR code URL for Bitcoin payment
    const paymentAmount = CONFIG.bitcoinPayment.btcAmount || 0.0003; // Fallback amount if API fails
    const paymentAddress = CONFIG.bitcoinPayment.address;
    const paymentMessage = encodeURIComponent(CONFIG.bitcoinPayment.message);
    
    // Generate QR code with bitcoin: URI format
    const btcURI = `bitcoin:${paymentAddress}?amount=${paymentAmount}&message=${paymentMessage}`;
    const qrCodeUrl = `https://chart.googleapis.com/chart?cht=qr&chs=200x200&chl=${encodeURIComponent(btcURI)}&choe=UTF-8`;
    
    // Add payment content
    paymentModal.innerHTML = `
      <button id="close-payment-modal" style="position: absolute; top: 10px; right: 10px; background: transparent; border: none; color: ${CONFIG.appearance.textColorDim}; font-size: 1.5rem; cursor: pointer; width: 30px; height: 30px; display: flex; align-items: center; justify-content: center; padding: 0;">&times;</button>
      
      <h3 style="color: ${CONFIG.appearance.primaryColor}; margin-top: 0; font-size: 1.5rem; font-weight: 600;">Pay with Bitcoin</h3>
      
      <p style="margin: 1rem 0; font-size: 1rem; line-height: 1.5;">Send <span id="btc-amount-display" style="font-weight: 600; color: ${CONFIG.appearance.primaryColor};">${paymentAmount}</span> BTC (≈$${CONFIG.bitcoinPayment.amountUSD}) to gain access for 1 year with your adblocker enabled.</p>
      
      <div id="qr-code-container" style="background: white; width: 210px; height: 210px; margin: 1.5rem auto; padding: 5px; border-radius: 8px; display: flex; justify-content: center; align-items: center;">
        <img src="${qrCodeUrl}" alt="Bitcoin Payment QR Code" style="width: 200px; height: 200px;" />
      </div>
      
      <div style="margin: 1.5rem 0; position: relative;">
        <div style="display: flex; align-items: center; background: ${CONFIG.appearance.darkBackground}; padding: 0.75rem; border-radius: 6px; border: 1px solid ${CONFIG.appearance.borderColor};">
          <input id="btc-address" type="text" value="${paymentAddress}" readonly style="background: transparent; border: none; color: ${CONFIG.appearance.primaryColor}; font-family: monospace; flex: 1; outline: none; font-size: 0.9rem; padding: 5px;" />
          <button id="copy-address" style="background: #333; border: none; color: white; padding: 8px 12px; border-radius: 4px; cursor: pointer; margin-left: 8px; display: flex; align-items: center; gap: 5px; font-size: 0.9rem;">
            ${clipboardIcon} Copy
          </button>
        </div>
      </div>
      
      <div id="payment-apps" style="margin: 1.5rem 0;">
        <p style="margin-bottom: 1rem; font-size: 0.9rem; opacity: 0.8;">Or open with your wallet app:</p>
        <div style="display: flex; justify-content: center; gap: 1rem; flex-wrap: wrap;">
          <a href="${btcURI}" style="text-decoration: none; color: ${CONFIG.appearance.textColor}; background: ${CONFIG.appearance.darkBackground}; padding: 10px 15px; border-radius: 6px; font-size: 0.9rem; border: 1px solid ${CONFIG.appearance.borderColor}; display: inline-block;">Open in Bitcoin Wallet</a>
          ${state.browserInfo.browser === 'Safari' ? `<a href="https://apps.apple.com/us/app/bluewallet-bitcoin-wallet/id1376878040" target="_blank" style="text-decoration: none; color: ${CONFIG.appearance.textColor}; background: ${CONFIG.appearance.darkBackground}; padding: 10px 15px; border-radius: 6px; font-size: 0.9rem; border: 1px solid ${CONFIG.appearance.borderColor}; display: inline-block;">Get BlueWallet</a>` : ''}
        </div>
      </div>
      
      <p style="font-size: 0.9rem; opacity: 0.8; margin: 1.5rem 0 1rem;">After sending the payment, click the button below:</p>
      
      <button id="verify-payment" style="background: ${CONFIG.appearance.primaryColor}; border: none; color: white; padding: 12px 20px; border-radius: 6px; cursor: pointer; font-weight: 600; width: 100%; font-size: 1rem; margin-bottom: 1rem; transition: all 0.2s ease;">I've Sent the Payment</button>
      
      <p style="font-size: 0.8rem; opacity: 0.6; margin-top: 0.5rem;">Transaction typically confirms in 10-60 minutes.</p>
    `;
    
    // Add to DOM
    parentOverlay.appendChild(paymentModal);
    
    // Copy address functionality
    document.getElementById('copy-address').addEventListener('click', () => {
      const addressInput = document.getElementById('btc-address');
      addressInput.select();
      document.execCommand('copy');
      
      // Show feedback
      const copyBtn = document.getElementById('copy-address');
      const originalText = copyBtn.innerHTML;
      copyBtn.innerHTML = 'Copied!';
      setTimeout(() => {
        copyBtn.innerHTML = originalText;
      }, 2000);
    });
    
    // Verify payment button
    document.getElementById('verify-payment').addEventListener('click', () => {
      // Show loading state
      const verifyBtn = document.getElementById('verify-payment');
      const originalText = verifyBtn.textContent;
      verifyBtn.disabled = true;
      verifyBtn.textContent = "Checking blockchain...";
      
      // Call verification function
      verifyBitcoinPayment(CONFIG.bitcoinPayment.address, CONFIG.bitcoinPayment.btcAmount)
        .then(verified => {
          if (verified) {
            // Real payment detected
            showPaymentConfirmation(paymentModal);
          } else {
            // No payment found yet
            verifyBtn.disabled = false;
            verifyBtn.textContent = originalText;
            
            // Show message
            const statusDiv = document.getElementById('payment-status') || document.createElement('div');
            statusDiv.id = 'payment-status';
            statusDiv.style.cssText = `margin-top: 1rem; color: #ffaa00; font-size: 0.9rem;`;
            statusDiv.textContent = "No payment detected yet. If you just sent it, please wait a few minutes for it to appear on the blockchain and try again.";
            
            if (!document.getElementById('payment-status')) {
              verifyBtn.parentNode.insertBefore(statusDiv, verifyBtn.nextSibling);
            }
          }
        });
    });
    
    // Close payment modal
    document.getElementById('close-payment-modal').addEventListener('click', () => {
      paymentModal.remove();
    });
  }

  /**
   * Verify Bitcoin payment by checking blockchain explorer APIs
   * @param {string} bitcoinAddress The address to check
   * @param {number} expectedAmount The expected BTC amount
   * @returns {Promise<boolean>} Whether payment was detected
   */
  function verifyBitcoinPayment(bitcoinAddress, expectedAmount) {
    // We'll check multiple blockchain explorers for redundancy
    return Promise.all([
      checkBlockchainInfo(bitcoinAddress, expectedAmount),
      checkBlockcypher(bitcoinAddress, expectedAmount),
      checkBitcoinExplorer(bitcoinAddress, expectedAmount)
    ]).then(results => {
      // If any of the APIs report a payment, consider it verified
      return results.some(result => result === true);
    }).catch(error => {
      console.error("Error verifying payment:", error);
      return false;
    });
  }

  /**
   * Check blockchain.info API
   */
  function checkBlockchainInfo(bitcoinAddress, expectedAmount) {
    return fetch(`https://blockchain.info/rawaddr/${bitcoinAddress}?limit=5`)
      .then(response => response.json())
      .then(data => {
        // Check recent transactions in the last hour
        const oneHourAgo = Date.now() - (60 * 60 * 1000);
        
        // Look through recent transactions
        for (const tx of data.txs) {
          const txTime = tx.time * 1000; // Convert to milliseconds
          
          // Only check recent transactions (last hour)
          if (txTime > oneHourAgo) {
            // Check outputs to see if any match our address and amount
            for (const output of tx.out) {
              if (output.addr === bitcoinAddress) {
                const receivedBtc = output.value / 100000000; // Convert satoshis to BTC
                
                // Allow a small tolerance for fees
                if (receivedBtc >= expectedAmount * 0.95) {
                  return true;
                }
              }
            }
          }
        }
        
        return false;
      })
      .catch(() => false); // Return false on any error
  }

  /**
   * Check BlockCypher API
   */
  function checkBlockcypher(bitcoinAddress, expectedAmount) {
    return fetch(`https://api.blockcypher.com/v1/btc/main/addrs/${bitcoinAddress}`)
      .then(response => response.json())
      .then(data => {
        if (!data.txrefs || data.txrefs.length === 0) {
          return false;
        }
        
        const oneHourAgo = Date.now() - (60 * 60 * 1000);
        
        // Check recent transactions
        for (const tx of data.txrefs) {
          const txTime = new Date(tx.confirmed).getTime();
          
          if (txTime > oneHourAgo && tx.value) {
            const receivedBtc = tx.value / 100000000; // Convert satoshis to BTC
            
            // Allow a small tolerance for fees
            if (receivedBtc >= expectedAmount * 0.95) {
              return true;
            }
          }
        }
        
        return false;
      })
      .catch(() => false);
  }

  /**
   * Check Blockstream API
   */
  function checkBitcoinExplorer(bitcoinAddress, expectedAmount) {
    return fetch(`https://blockstream.info/api/address/transactions/${bitcoinAddress}`)
      .then(response => response.json())
      .then(transactions => {
        if (!transactions || transactions.length === 0) {
          return false;
        }
        
        const oneHourAgo = Date.now() - (60 * 60 * 1000);
        
        // Check recent transactions
        for (const tx of transactions) {
          // Check if this is recent
          const txTime = tx.status.block_time * 1000;
          
          if (txTime > oneHourAgo) {
            // Check outputs
            for (const output of tx.vout) {
              if (output.scriptpubkey_address === bitcoinAddress) {
                const receivedBtc = output.value / 100000000;
                
                if (receivedBtc >= expectedAmount * 0.95) {
                  return true;
                }
              }
            }
          }
        }
        
        return false;
      })
      .catch(() => false);
  }

  /**
   * Show payment confirmation UI
   * @param {HTMLElement} paymentModal The payment modal element to replace
   */
  function showPaymentConfirmation(paymentModal) {
    // Update UI to confirmation state
    paymentModal.innerHTML = `
      <h3 style="color: ${CONFIG.appearance.successColor}; margin-top: 0; font-size: 1.5rem; font-weight: 600;">Payment Received!</h3>
      
      <div style="margin: 2rem auto; width: 80px; height: 80px; background: ${CONFIG.appearance.successColor}; border-radius: 50%; display: flex; justify-content: center; align-items: center; animation: adbPulse 1s ease-in-out;">
        <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="20 6 9 17 4 12"></polyline>
        </svg>
      </div>
      
      <p style="margin: 1.5rem 0; font-size: 1.1rem; line-height: 1.5;">Thank you for supporting Calendar of Rekt with your Bitcoin payment!</p>
      
      <p style="margin: 1.5rem 0; font-size: 1rem;">Your ad-free access has been activated for <strong>1 full year</strong>.</p>
      
      <button id="payment-success" style="background: ${CONFIG.appearance.primaryColor}; border: none; color: white; padding: 12px 20px; border-radius: 6px; cursor: pointer; font-weight: 600; width: 100%; font-size: 1rem; margin-top: 1rem; transition: all 0.2s ease;">Continue to Site</button>
    `;
    
    // Calculate expiration date (1 year from now)
    const now = Date.now();
    const validUntil = now + (CONFIG.paymentValidDays * 24 * 60 * 60 * 1000);
    
    // Store payment data
    const paymentData = {
      timestamp: now,
      validUntil: validUntil,
      amount: CONFIG.bitcoinPayment.amountUSD,
      btcAmount: CONFIG.bitcoinPayment.btcAmount,
      address: CONFIG.bitcoinPayment.address
    };
    
    saveToStorage(CONFIG.storage.keys.payment, JSON.stringify(paymentData));
    
    // Handle continue button
    document.getElementById('payment-success').addEventListener('click', () => {
      // Remove overlay and restore scrolling
      const overlay = document.getElementById('adblock-overlay');
      if (overlay) {
        overlay.remove();
        document.body.style.overflow = '';
      }
    });
  }

  /**
   * Handle temporary access for users who click "Continue for Now"
   */
  function handleTemporaryAccess() {
    // Get current dismissal count
    let dismissCount = 0;
    const dismissCountData = getFromStorage(CONFIG.storage.keys.dismissCount);
    if (dismissCountData) {
      try {
        dismissCount = parseInt(dismissCountData, 10) || 0;
      } catch (e) {
        dismissCount = 0;
      }
    }
    
    // Increment dismissal count
    dismissCount++;
    saveToStorage(CONFIG.storage.keys.dismissCount, dismissCount.toString());
    
    // Set expiration time for temporary access
    const now = Date.now();
    const expiration = now + (CONFIG.dismissExpirationHours * 60 * 60 * 1000);
    
    // Store temporary access data
    const tempAccessData = {
      timestamp: now,
      expiration: expiration,
      dismissCount: dismissCount
    };
    
    saveToStorage(CONFIG.storage.keys.tempAccess, JSON.stringify(tempAccessData));
    
    // Restore scrolling
    document.body.style.overflow = '';
  }

  // Initialize the adblock detector
  initialize();
})();
