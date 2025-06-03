// ========== src/models/crash-detector.js ==========
/**
 * Interface for crash detection models
 */
class CrashDetector {
  /**
   * Updates the model with historical data
   * @param {Array} data - Price/return data
   */
async update(monthlyData, onChainData) {
    throw new Error('Method not implemented');
  }

  /**
   * Gets crash probability for a specific month (0-11)
   * @param {Number} month - Month index (0-11)
   * @return {Number} Probability of a crash
   */
  getProbability(month) {
    throw new Error('Method not implemented');
  }

  /**
   * Generates crash calendar for next 12 months
   * @return {Array} Calendar of crash probabilities
   */
async generateCalendar() {
    throw new Error('Method not implemented');
  }
  getMetrics() {
    return {};
  }
}

module.exports = CrashDetector;
