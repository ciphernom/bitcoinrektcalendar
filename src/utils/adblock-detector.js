/**
 * Calendar of Rekt - AdBlock Detector Module
 * Detects adblock usage and prevents site access when detected
 */

// Flag to track if adblocker has been detected
let adblockDetected = false;

/**
 * Initializes adblock detection
 */
export function initialize() {
  console.log('Initializing AdBlock detector');
  
  // Run multiple detection methods for higher accuracy
  detectAdSenseBlocking();
  detectBaitElementBlocking();
  detectFakeAd();
}

/**
 * Checks if Google AdSense script was blocked
 */
function detectAdSenseBlocking() {
  // Check if AdSense is properly loaded after a delay
  setTimeout(() => {
    const adSenseLoaded = typeof window.adsbygoogle !== 'undefined' && 
                          Array.isArray(window.adsbygoogle);
    
    if (!adSenseLoaded) {
      console.log('AdSense blocked');
      handleAdblockDetected('adsense_blocked');
    }
  }, 1000); // Longer timeout to ensure AdSense has time to load
}

/**
 * Creates a bait element that adblockers typically target
 */
function detectBaitElementBlocking() {
  // Create a bait element
  const bait = document.createElement('div');
  bait.className = 'ad-banner adsbygoogle';
  bait.style.cssText = 'position: absolute; top: -999px; height: 1px; width: 1px;';
  document.body.appendChild(bait);
  
  // Check if it was removed or hidden by adblocker
  setTimeout(() => {
    const baitBlocked = !document.body.contains(bait) || 
                         bait.offsetHeight === 0 || 
                         bait.clientHeight === 0 || 
                         window.getComputedStyle(bait).display === 'none' ||
                         window.getComputedStyle(bait).visibility === 'hidden';
    
    if (baitBlocked) {
      console.log('Bait element blocked');
      handleAdblockDetected('bait_blocked');
    }
    
    // Clean up
    if (document.body.contains(bait)) {
      document.body.removeChild(bait);
    }
  }, 500);
}

/**
 * Creates a fake ad element to detect more sophisticated adblockers
 */
function detectFakeAd() {
  // Create script to mimic ad loading
  const script = document.createElement('script');
  script.setAttribute('data-ad-client', 'ca-pub-1234567890');
  script.setAttribute('async', '');
  script.setAttribute('src', 'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js');
  script.onerror = function() {
    console.log('Fake ad script blocked');
    handleAdblockDetected('fake_ad_blocked');
  };
  document.head.appendChild(script);
  
  // Also create a div that looks like an ad container
  const fakeAd = document.createElement('div');
  fakeAd.className = 'btc-ad-container';
  fakeAd.id = 'btc-sponsor-content';
  fakeAd.innerHTML = '<ins class="adsbygoogle" style="display:block" data-ad-client="ca-pub-1234" data-ad-slot="1234"></ins>';
  fakeAd.style.cssText = 'position: absolute; top: -999px; height: 1px; width: 1px;';
  document.body.appendChild(fakeAd);
  
  // Check after a delay
  setTimeout(() => {
    const fakeAdBlocked = !document.body.contains(fakeAd) || 
                          fakeAd.offsetHeight === 0 || 
                          window.getComputedStyle(fakeAd).display === 'none';
    
    if (fakeAdBlocked) {
      console.log('Fake ad container blocked');
      handleAdblockDetected('fake_container_blocked');
    }
    
    // Clean up
    if (document.body.contains(fakeAd)) {
      document.body.removeChild(fakeAd);
    }
    document.head.removeChild(script);
  }, 750);
}

/**
 * Handle adblock detection and show overlay
 * @param {string} method The detection method that triggered
 */
function handleAdblockDetected(method) {
  // Only run once even if multiple detection methods trigger
  if (adblockDetected) return;
  adblockDetected = true;
  
  console.log(`Adblock detected via ${method}`);
  
  // Create overlay that blocks content
  const overlay = document.createElement('div');
  overlay.className = 'adblock-overlay';
  overlay.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background-color: rgba(0, 0, 0, 0.9);
    z-index: 10000;
    display: flex;
    justify-content: center;
    align-items: center;
    animation: fadeIn 0.5s;
  `;
  
  // Create message container
  const messageContainer = document.createElement('div');
  messageContainer.className = 'adblock-message';
  messageContainer.style.cssText = `
    max-width: 600px;
    background-color: #1a1a1a;
    padding: 2rem;
    border-radius: 8px;
    border: 1px solid #f7931a;
    box-shadow: 0 0 20px rgba(247, 147, 26, 0.3);
    text-align: center;
    color: white;
  `;
  
  // Add message content
  messageContainer.innerHTML = `
    <h2 style="color: #f7931a; margin-top: 0;">Adblock Detected</h2>
    <p>We've detected that you're using an adblocker. The Calendar of Rekt is supported by ads to keep our Bitcoin crash risk forecasts available to everyone.</p>
    <p>Please disable your adblocker and refresh the page to continue using this tool.</p>
    <button id="adblock-refresh" style="background: #f7931a; border: none; color: white; padding: 10px 20px; border-radius: 4px; cursor: pointer; margin-top: 20px; font-weight: bold;">I've Disabled My Adblocker (Refresh)</button>
  `;
  
  // Add to DOM
  overlay.appendChild(messageContainer);
  document.body.appendChild(overlay);
  
  // Add refresh button functionality
  document.getElementById('adblock-refresh').addEventListener('click', () => {
    location.reload();
  });
  
  // Dispatch event for analytics tracking
  const event = new CustomEvent('adblockDetected', { 
    detail: { method: method, timestamp: new Date() } 
  });
  document.dispatchEvent(event);
}
