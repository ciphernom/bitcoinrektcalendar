/**
 * Statistics Utilities
 */

/**
 * Calculate the standard deviation of an array of values
 * @param {Array<number>} values Array of numeric values
 * @returns {number} The standard deviation
 */
function calculateStandardDeviation(values) {
  if (!values || values.length === 0) return 0;
  
  const avg = values.reduce((sum, val) => sum + val, 0) / values.length;
  const squareDiffs = values.map(value => Math.pow(value - avg, 2));
  const avgSquareDiff = squareDiffs.reduce((sum, val) => sum + val, 0) / squareDiffs.length;
  return Math.sqrt(avgSquareDiff);
}

/**
 * Calculate the mean (average) of an array of values
 * @param {Array<number>} values Array of numeric values
 * @returns {number} The mean value
 */
function calculateMean(values) {
  if (!values || values.length === 0) return 0;
  return values.reduce((sum, val) => sum + val, 0) / values.length;
}

/**
 * Calculate the median of an array of values
 * @param {Array<number>} values Array of numeric values
 * @returns {number} The median value
 */
function calculateMedian(values) {
  if (!values || values.length === 0) return 0;
  
  const sortedValues = [...values].sort((a, b) => a - b);
  const midpoint = Math.floor(sortedValues.length / 2);
  
  if (sortedValues.length % 2 === 0) {
    // Even number of elements, average the two middle values
    return (sortedValues[midpoint - 1] + sortedValues[midpoint]) / 2;
  } else {
    // Odd number of elements, return the middle value
    return sortedValues[midpoint];
  }
}

/**
 * Calculate a specific percentile of an array of values
 * @param {Array<number>} values Array of numeric values
 * @param {number} percentile The percentile to calculate (0-100)
 * @returns {number} The percentile value
 */
function calculatePercentile(values, percentile) {
  if (!values || values.length === 0 || percentile < 0 || percentile > 100) {
    return 0;
  }
  
  const sortedValues = [...values].sort((a, b) => a - b);
  const index = (percentile / 100) * (sortedValues.length - 1);
  const lowerIndex = Math.floor(index);
  const upperIndex = Math.ceil(index);
  
  if (lowerIndex === upperIndex) {
    return sortedValues[lowerIndex];
  }
  
  // Interpolate between the two values
  const weight = index - lowerIndex;
  return sortedValues[lowerIndex] * (1 - weight) + sortedValues[upperIndex] * weight;
}

export { 
  calculateStandardDeviation,
  calculateMean,
  calculateMedian,
  calculatePercentile
};
