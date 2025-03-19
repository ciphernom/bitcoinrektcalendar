/**
 * Formatting Utilities
 */

/**
 * Format a number as currency
 * @param {number} value The value to format
 * @param {string} currency The currency code (default: 'USD')
 * @param {number} decimals The number of decimal places (default: 0)
 * @returns {string} Formatted currency string
 */
function formatCurrency(value, currency = 'USD', decimals = 0) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency,
    maximumFractionDigits: decimals
  }).format(value);
}

/**
 * Format a number as a percentage
 * @param {number} value The value to format (e.g., 0.25 for 25%)
 * @param {number} decimals The number of decimal places (default: 1)
 * @returns {string} Formatted percentage string
 */
function formatPercentage(value, decimals = 1) {
  return `${(value * 100).toFixed(decimals)}%`;
}

/**
 * Format a date to a human-readable string
 * @param {Date|string} date The date to format
 * @param {object} options Formatting options (default: month, day, year)
 * @returns {string} Formatted date string
 */
function formatDate(date, options = { month: 'short', day: 'numeric', year: 'numeric' }) {
  const dateObj = date instanceof Date ? date : new Date(date);
  return dateObj.toLocaleDateString('en-US', options);
}

/**
 * Format a large number with abbreviations (K, M, B)
 * @param {number} value The value to format
 * @param {number} decimals The number of decimal places (default: 1)
 * @returns {string} Formatted number string
 */
function formatLargeNumber(value, decimals = 1) {
  if (value < 1000) {
    return value.toFixed(decimals);
  } else if (value < 1000000) {
    return `${(value / 1000).toFixed(decimals)}K`;
  } else if (value < 1000000000) {
    return `${(value / 1000000).toFixed(decimals)}M`;
  } else {
    return `${(value / 1000000000).toFixed(decimals)}B`;
  }
}

/**
 * Create a risk display for a given percentage
 * @param {string} percentage The risk percentage to display
 * @returns {string} HTML markup for the risk display
 */
function createRiskDisplay(percentage) {
  return `
    <div class="risk-container">
      <div class="risk-percentage">
        ${percentage}%
      </div>
      <div class="progress-container">
        <div class="progress-fill" style="width: 0%;"></div>
      </div>
      <div class="progress-labels">
        <span>0%</span>
        <span>100%</span>
      </div>
    </div>
  `;
}

export {
  formatCurrency,
  formatPercentage,
  formatDate,
  formatLargeNumber,
  createRiskDisplay
};
