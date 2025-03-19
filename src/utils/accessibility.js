/**
 * Accessibility Utilities
 */

/**
 * Enhance accessibility for interactive elements
 */
function enhanceAccessibility() {
  // Add proper ARIA attributes to month cards
  document.querySelectorAll('.month-card').forEach((card, index) => {
    const monthNames = [
      "January", "February", "March", "April", "May", "June",
      "July", "August", "September", "October", "November", "December"
    ];
    const month = monthNames[index];
    card.setAttribute('role', 'button');
    card.setAttribute('aria-label', `${month} risk analysis`);
    card.setAttribute('tabindex', '0');
  });
  
  // Add aria-live regions for dynamic content
  document.getElementById('gaugeValue').setAttribute('aria-live', 'polite');
  document.getElementById('timelineValue').setAttribute('aria-live', 'polite');
  
  // Add keyboard navigation for interactive elements
  setupKeyboardNavigation();
  
  // Apply reduced motion preferences if user has requested it
  applyReducedMotion();
}

/**
 * Set up keyboard navigation for interactive elements
 */
function setupKeyboardNavigation() {
  // Handle keyboard navigation for month cards
  document.querySelectorAll('.month-card').forEach(card => {
    card.addEventListener('keydown', event => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        card.click();
      }
    });
  });
  
  // Handle keyboard navigation for close buttons
  document.querySelectorAll('.popup-close, .youtuber-close').forEach(closeBtn => {
    closeBtn.setAttribute('role', 'button');
    closeBtn.setAttribute('aria-label', 'Close');
    closeBtn.setAttribute('tabindex', '0');
    
    closeBtn.addEventListener('keydown', event => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        closeBtn.click();
      }
    });
  });
  
  // Handle keyboard navigation for tabs
  document.querySelectorAll('.timeframe-tab').forEach(tab => {
    tab.setAttribute('role', 'tab');
    tab.setAttribute('tabindex', '0');
    
    tab.addEventListener('keydown', event => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        tab.click();
      }
    });
  });
  
  // Add escape key handler for modals
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape') {
      const activeModals = document.querySelectorAll('.popup-info.active, .youtuber-mode.active');
      if (activeModals.length > 0) {
        // Find and click the close button of the active modal
        const closeBtn = activeModals[0].querySelector('.popup-close, .youtuber-close');
        if (closeBtn) {
          closeBtn.click();
        }
      }
    }
  });
}

/**
 * Apply reduced motion preferences if user has requested it
 */
function applyReducedMotion() {
  // Check if user prefers reduced motion
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  
  if (prefersReducedMotion) {
    // Add class to document for CSS to handle
    document.documentElement.classList.add('reduced-motion');
    
    // Apply reduced motion styles
    const style = document.createElement('style');
    style.textContent = `
      .reduced-motion * {
        animation-duration: 0.001s !important;
        transition-duration: 0.001s !important;
      }
    `;
    document.head.appendChild(style);
  }
}

/**
 * Create an accessible loading indicator
 * @param {HTMLElement} container The container element to append the loader to
 * @param {string} message The loading message
 */
function createAccessibleLoader(container, message) {
  const loader = document.createElement('div');
  loader.className = 'loading';
  loader.setAttribute('role', 'status');
  loader.setAttribute('aria-live', 'polite');
  
  loader.innerHTML = `
    <div class="loading-spinner" aria-hidden="true"></div>
    <div class="loading-text">${message}</div>
  `;
  
  container.appendChild(loader);
  return loader;
}

/**
 * Create an accessible error message
 * @param {HTMLElement} container The container element to append the error to
 * @param {string} message The error message
 */
function createAccessibleError(container, message) {
  const error = document.createElement('div');
  error.className = 'error-message';
  error.setAttribute('role', 'alert');
  error.textContent = message;
  
  container.appendChild(error);
  return error;
}

export {
  enhanceAccessibility,
  setupKeyboardNavigation,
  applyReducedMotion,
  createAccessibleLoader,
  createAccessibleError
};
