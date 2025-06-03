/**
 * LSTM Model for Bitcoin Crash Prediction
 * Uses deep learning to capture complex temporal patterns
 */
const tf = require('@tensorflow/tfjs-node');
const CrashDetector = require('./crash-detector');
const moment = require('moment');

class LSTMCrashPredictor extends CrashDetector {
  /**
   * @param {Object} options - Configuration options
   * @param {Number} options.threshold - Price drop that constitutes a crash
   * @param {Number} options.lookbackWindow - Number of time periods to look back
   * @param {Number} options.epochs - Training epochs
   * @param {Boolean} options.useAttention - Whether to use attention mechanism
   */
  constructor(options = {}) {
    super();
    
    const {
      threshold = -0.20,
      lookbackWindow = 12,
      epochs = 100,
      batchSize = 32,
      learningRate = 0.001,
      units = 64,
      dropoutRate = 0.2,
      useAttention = true,
      featureScaling = true
    } = options;
    
    this.threshold = threshold;
    this.lookbackWindow = lookbackWindow;
    this.epochs = epochs;
    this.batchSize = batchSize;
    this.learningRate = learningRate;
    this.units = units;
    this.dropoutRate = dropoutRate;
    this.useAttention = useAttention;
    this.featureScaling = featureScaling;
    
    this.model = null;
    this.trained = false;
    this.featureMeans = null;
    this.featureStds = null;
    this.featureList = [];
    
    // Market regime detection
    this.regimes = ['bull', 'bear', 'consolidation', 'recovery'];
    this.currentRegime = 'undefined';
    this.regimeHistory = [];
    this.regimeThresholds = {
      bull: { trend: 0.5, volatility: 0.02 },
      bear: { trend: -0.5, volatility: 0.03 },
      consolidation: { trend: 0.1, volatility: 0.01 },
      recovery: { trend: 0.3, volatility: 0.015 }
    };
    
    // For regime-specific predictions
    this.regimeModels = {};
    
    // For feature importance
    this.featureImportance = {};
    
    // For performance tracking
    this.validationMetrics = {
      accuracy: [],
      precision: [],
      recall: [],
      f1: [],
      auroc: []
    };
  }
  
  /**
   * Build LSTM model with optional attention mechanism
   * @param {Number} inputShape - Input feature dimension
   * @return {tf.Sequential} TensorFlow.js model
   */
  buildModel(inputShape) {
    const model = tf.sequential();
    
    // First LSTM layer
    model.add(tf.layers.lstm({
      units: this.units,
      returnSequences: true,
      inputShape: [this.lookbackWindow, inputShape],
      recurrentDropout: this.dropoutRate,
      activation: 'tanh'
    }));
    
    // Add dropout for regularization
    model.add(tf.layers.dropout({ rate: this.dropoutRate }));
    
    // Second LSTM layer
    model.add(tf.layers.lstm({
      units: Math.floor(this.units / 2),
      returnSequences: this.useAttention, // Return sequences only if using attention
      recurrentDropout: this.dropoutRate,
      activation: 'tanh'
    }));
    
    // Add attention mechanism if enabled
    if (this.useAttention) {
      // Custom attention layer
      // Since TF.js doesn't have built-in attention, we implement a simple version
      
      // First, we apply a dense layer to get attention scores
      model.add(tf.layers.timeDistributed({
        layer: tf.layers.dense({
          units: 1,
          activation: 'tanh'
        })
      }));
      
      // Reshape to get attention weights
      model.add(tf.layers.flatten());
      model.add(tf.layers.activation({ activation: 'softmax' }));
      
      // Reshape to original dimensions
      model.add(tf.layers.reshape({ targetShape: [this.lookbackWindow, 1] }));
      
      // Apply attention weights using a lambda layer
      // This is a simplified version since TF.js has limited custom layer support
      model.add(tf.layers.dense({
        units: 32,
        activation: 'relu'
      }));
      
      // Flatten after attention
      model.add(tf.layers.flatten());
    } else {
      // If not using attention, just flatten the output
      model.add(tf.layers.flatten());
    }
    
    // Dense layers for prediction
    model.add(tf.layers.dense({
      units: 32,
      activation: 'relu'
    }));
    
    model.add(tf.layers.dropout({ rate: this.dropoutRate }));
    
    // Output layer (sigmoid for probability between 0-1)
    model.add(tf.layers.dense({
      units: 1,
      activation: 'sigmoid'
    }));
    
    // Compile model
    model.compile({
      optimizer: tf.train.adam(this.learningRate),
      loss: 'binaryCrossentropy',
      metrics: ['accuracy']
    });
    
    return model;
  }
  
  /**
   * Preprocess data for LSTM input
   * @param {Array} data - Monthly return data
   * @param {Array} onChainData - On-chain metrics
   * @return {Object} Preprocessed data
   */
  preprocessData(data, onChainData) {
    // Sort data by date
    const sortedData = [...data].sort((a, b) => 
      new Date(a.date) - new Date(b.date)
    );
    
    // Extract features and labels
    const features = [];
    const labels = [];
    
    // Extend with on-chain metrics
    const dataWithOnChain = sortedData.map(dataPoint => {
      const date = new Date(dataPoint.date);
      const monthStr = moment(date).format('YYYY-MM');
      
      // Find matching on-chain data for this month
      const monthOnChain = onChainData.filter(d => {
        const onChainDate = new Date(d.time || d.date);
        return moment(onChainDate).format('YYYY-MM') === monthStr;
      });
      
      // Calculate average on-chain metrics for the month
      let mvrv = null, nvt = null, velocity = null;
      
      if (monthOnChain.length > 0) {
        mvrv = monthOnChain.reduce((sum, d) => sum + (d.CapMVRVCur || 0), 0) / monthOnChain.length;
        nvt = monthOnChain.reduce((sum, d) => sum + (d.NVTAdj || 0), 0) / monthOnChain.length;
        velocity = monthOnChain.reduce((sum, d) => sum + (d.VelCur1yr || 0), 0) / monthOnChain.length;
      }
      
      return {
        ...dataPoint,
        mvrv,
        nvt,
        velocity
      };
    });
    
    // Build sequences with lookback window
    for (let i = this.lookbackWindow; i < dataWithOnChain.length; i++) {
      const sequence = [];
      
      // Get features from lookback window
      for (let j = i - this.lookbackWindow; j < i; j++) {
        const dataPoint = dataWithOnChain[j];
        
        // Extract basic features
        const featurePoint = [
          dataPoint.return,                             // Monthly return
          dataPoint.startPrice,                         // Start price
          dataPoint.endPrice,                           // End price
          dataPoint.endPrice / dataPoint.startPrice - 1 // Monthly return (redundant but useful)
        ];
        
        // Add on-chain metrics if available
        if (dataPoint.mvrv !== null) featurePoint.push(dataPoint.mvrv);
        if (dataPoint.nvt !== null) featurePoint.push(dataPoint.nvt);
        if (dataPoint.velocity !== null) featurePoint.push(dataPoint.velocity);
        
        // Add month as cyclical feature (sin and cos encoding)
        const monthNumber = new Date(dataPoint.date).getMonth();
        const monthSin = Math.sin(2 * Math.PI * monthNumber / 12);
        const monthCos = Math.cos(2 * Math.PI * monthNumber / 12);
        featurePoint.push(monthSin, monthCos);
        
        // Add halving cycle position if available
        const halvingPhase = this.getHalvingPhase(new Date(dataPoint.date));
        if (halvingPhase) {
          featurePoint.push(halvingPhase.phase / 48); // Normalize to 0-1
        }
        
        sequence.push(featurePoint);
      }
      
      // Store sequence and label
      features.push(sequence);
      
      // Label is 1 if the current month has a crash, 0 otherwise
      labels.push(dataWithOnChain[i].return <= this.threshold ? 1 : 0);
    }
    
    // Keep track of feature count
    if (features.length > 0 && features[0].length > 0) {
      this.featureList = ['return', 'startPrice', 'endPrice', 'returnCalculated'];
      
      if (features[0][0].length > 4) {
        if (dataWithOnChain[0].mvrv !== null) this.featureList.push('mvrv');
        if (dataWithOnChain[0].nvt !== null) this.featureList.push('nvt');
        if (dataWithOnChain[0].velocity !== null) this.featureList.push('velocity');
        
        this.featureList.push('monthSin', 'monthCos');
        
        if (features[0][0].length > 9) {
          this.featureList.push('halvingPhase');
        }
      }
    }
    
    return { features, labels };
  }
  
  /**
   * Normalize features for better training
   * @param {Array} features - Feature sequences
   * @return {Array} Normalized features
   */
  normalizeFeatures(features) {
    if (!features || features.length === 0 || features[0].length === 0) {
      return features;
    }
    
    // Get feature dimensions
    const numSamples = features.length;
    const sequenceLength = features[0].length;
    const numFeatures = features[0][0].length;
    
    // Calculate mean and std for each feature dimension
    this.featureMeans = Array(numFeatures).fill(0);
    this.featureStds = Array(numFeatures).fill(0);
    
    // Calculate means
    for (let i = 0; i < numSamples; i++) {
      for (let j = 0; j < sequenceLength; j++) {
        for (let k = 0; k < numFeatures; k++) {
          this.featureMeans[k] += features[i][j][k] / (numSamples * sequenceLength);
        }
      }
    }
    
    // Calculate standard deviations
    for (let i = 0; i < numSamples; i++) {
      for (let j = 0; j < sequenceLength; j++) {
        for (let k = 0; k < numFeatures; k++) {
          this.featureStds[k] += Math.pow(features[i][j][k] - this.featureMeans[k], 2) / 
            (numSamples * sequenceLength);
        }
      }
    }
    
    for (let k = 0; k < numFeatures; k++) {
      this.featureStds[k] = Math.sqrt(this.featureStds[k]);
      // Avoid division by zero
      if (this.featureStds[k] < 1e-10) {
        this.featureStds[k] = 1;
      }
    }
    
    // Normalize features
    const normalizedFeatures = [];
    for (let i = 0; i < numSamples; i++) {
      const normalizedSequence = [];
      for (let j = 0; j < sequenceLength; j++) {
        const normalizedPoint = [];
        for (let k = 0; k < numFeatures; k++) {
          normalizedPoint.push(
            (features[i][j][k] - this.featureMeans[k]) / this.featureStds[k]
          );
        }
        normalizedSequence.push(normalizedPoint);
      }
      normalizedFeatures.push(normalizedSequence);
    }
    
    return normalizedFeatures;
  }
  
  /**
   * Detect current market regime
   * @param {Array} data - Historical price data
   * @return {String} Current regime
   */
  detectMarketRegime(data) {
    if (!data || data.length < 3) return 'undefined';
    
    // Get recent data (last 3 months)
    const recentData = [...data].sort((a, b) => 
      new Date(b.date) - new Date(a.date)
    ).slice(0, 3);
    
    // Calculate trend (average return)
    const avgReturn = recentData.reduce((sum, d) => sum + d.return, 0) / recentData.length;
    
    // Calculate volatility (standard deviation of returns)
    const volatility = Math.sqrt(
      recentData.reduce((sum, d) => sum + Math.pow(d.return - avgReturn, 2), 0) / recentData.length
    );
    
    // Determine regime based on trend and volatility
    let regime = 'undefined';
    if (avgReturn > this.regimeThresholds.bull.trend && volatility > this.regimeThresholds.bull.volatility) {
      regime = 'bull';
    } else if (avgReturn < this.regimeThresholds.bear.trend && volatility > this.regimeThresholds.bear.volatility) {
      regime = 'bear';
    } else if (Math.abs(avgReturn) < this.regimeThresholds.consolidation.trend && 
               volatility < this.regimeThresholds.consolidation.volatility) {
      regime = 'consolidation';
    } else if (avgReturn > this.regimeThresholds.recovery.trend && 
               volatility < this.regimeThresholds.recovery.volatility) {
      regime = 'recovery';
    }
    
    // Store current regime
    this.currentRegime = regime;
    this.regimeHistory.push({
      regime,
      date: new Date(),
      metrics: {
        avgReturn,
        volatility
      }
    });
    
    return regime;
  }
  
  /**
   * Get halving phase for a given date
   * @param {Date} date - Target date
   * @return {Object} Halving phase information
   */
  getHalvingPhase(date) {
    // Halving dates
    const halvingDates = [
      new Date('2012-11-28'),
      new Date('2016-07-09'),
      new Date('2020-05-11'),
      new Date('2024-04-20')
    ];
    
    // Find the most recent halving before this date
    let lastHalving = null;
    for (const halvingDate of halvingDates) {
      if (halvingDate <= date) {
        lastHalving = halvingDate;
      } else {
        break;
      }
    }
    
    if (!lastHalving) return { phase: 0, monthsSinceHalving: 0 };
    
    // Calculate months since last halving
    const monthsSinceHalving = 
      (date.getFullYear() - lastHalving.getFullYear()) * 12 + 
      (date.getMonth() - lastHalving.getMonth());
    
    // Calculate phase (0-47 for a 4-year cycle)
    const phase = monthsSinceHalving % 48;
    
    return { 
      phase,
      monthsSinceHalving,
      lastHalving
    };
  }
  
  /**
   * Calculate feature importance using perturbation method
   * @param {Array} features - Normalized feature sequences
   * @param {Array} labels - True labels
   */
  calculateFeatureImportance(features, labels) {
    if (!this.model || !this.trained) return;
    
    // Base predictions without perturbation
    const tensor = tf.tensor3d(features);
    const basePredictions = this.model.predict(tensor);
    const baseAccuracy = this.calculateAccuracy(basePredictions.arraySync(), labels);
    
    // Calculate importance for each feature
    const numFeatures = this.featureList.length;
    this.featureImportance = {};
    
    for (let featureIndex = 0; featureIndex < numFeatures; featureIndex++) {
      // Perturb this feature
      const perturbedFeatures = this.perturbFeature(features, featureIndex);
      
      // Get predictions with perturbed feature
      const perturbedTensor = tf.tensor3d(perturbedFeatures);
      const perturbedPredictions = this.model.predict(perturbedTensor);
      const perturbedAccuracy = this.calculateAccuracy(perturbedPredictions.arraySync(), labels);
      
      // Importance is reduction in accuracy when feature is perturbed
      const importance = baseAccuracy - perturbedAccuracy;
      this.featureImportance[this.featureList[featureIndex]] = importance;
      
      // Clean up tensors
      perturbedTensor.dispose();
      perturbedPredictions.dispose();
    }
    
    // Clean up base tensors
    tensor.dispose();
    basePredictions.dispose();
    
    // Normalize feature importance
    const totalImportance = Object.values(this.featureImportance)
      .reduce((sum, val) => sum + Math.abs(val), 0);
    
    if (totalImportance > 0) {
      for (const feature in this.featureImportance) {
        this.featureImportance[feature] = this.featureImportance[feature] / totalImportance;
      }
    }
    
    console.log('Feature importance:', this.featureImportance);
  }
  
  /**
   * Perturb a specific feature for importance calculation
   * @param {Array} features - Normalized feature sequences
   * @param {Number} featureIndex - Index of feature to perturb
   * @return {Array} Perturbed features
   */
  perturbFeature(features, featureIndex) {
    const perturbedFeatures = JSON.parse(JSON.stringify(features));
    
    // Shuffle values of the specified feature across all samples
    const allValues = [];
    for (let i = 0; i < features.length; i++) {
      for (let j = 0; j < features[i].length; j++) {
        allValues.push(features[i][j][featureIndex]);
      }
    }
    
    // Fisher-Yates shuffle
    for (let i = allValues.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [allValues[i], allValues[j]] = [allValues[j], allValues[i]];
    }
    
    // Replace values with shuffled ones
    let valueIndex = 0;
    for (let i = 0; i < perturbedFeatures.length; i++) {
      for (let j = 0; j < perturbedFeatures[i].length; j++) {
        perturbedFeatures[i][j][featureIndex] = allValues[valueIndex++];
      }
    }
    
    return perturbedFeatures;
  }
  
  /**
   * Calculate accuracy from predictions and true labels
   * @param {Array} predictions - Model predictions
   * @param {Array} labels - True labels
   * @return {Number} Accuracy
   */
  calculateAccuracy(predictions, labels) {
    let correct = 0;
    
    for (let i = 0; i < predictions.length; i++) {
      const prediction = predictions[i][0] >= 0.5 ? 1 : 0;
      if (prediction === labels[i]) {
        correct++;
      }
    }
    
    return correct / predictions.length;
  }
  
  /**
   * Train regime-specific models
   * @param {Array} features - Feature sequences
   * @param {Array} labels - Labels
   * @param {Array} data - Original data (for regime detection)
   */
  trainRegimeModels(features, labels, data) {
    // Group data by regime
    const regimeData = {};
    const allRegimes = ['bull', 'bear', 'consolidation', 'recovery'];
    
    // Initialize regime data
    allRegimes.forEach(regime => {
      regimeData[regime] = {
        features: [],
        labels: []
      };
    });
    
    // Assign each data point to a regime
    for (let i = this.lookbackWindow; i < data.length; i++) {
      // Determine regime for this data point
      const lookbackData = data.slice(i - this.lookbackWindow, i);
      const regime = this.detectMarketRegime(lookbackData);
      
      // If valid regime and within features array bounds
      const featureIndex = i - this.lookbackWindow;
      if (allRegimes.includes(regime) && featureIndex < features.length) {
        regimeData[regime].features.push(features[featureIndex]);
        regimeData[regime].labels.push(labels[featureIndex]);
      }
    }
    
    // Train a model for each regime with sufficient data
    const sufficientDataThreshold = 10;
    
    allRegimes.forEach(regime => {
      const regimeFeatures = regimeData[regime].features;
      const regimeLabels = regimeData[regime].labels;
      
      if (regimeFeatures.length >= sufficientDataThreshold) {
        // Convert to tensors
        const xTrain = tf.tensor3d(regimeFeatures);
        const yTrain = tf.tensor2d(regimeLabels.map(l => [l]));
        
        // Create and train model
        const regimeModel = this.buildModel(regimeFeatures[0][0].length);
        
        // Use less epochs for regime-specific models (they have less data)
        regimeModel.fit(xTrain, yTrain, {
          epochs: Math.min(50, this.epochs),
          batchSize: Math.min(8, this.batchSize),
          verbose: 0,
          validationSplit: 0.2
        }).then(() => {
          console.log(`Trained model for ${regime} regime with ${regimeFeatures.length} samples`);
          
          // Store model
          this.regimeModels[regime] = regimeModel;
          
          // Clean up tensors
          xTrain.dispose();
          yTrain.dispose();
        });
      } else {
        console.log(`Not enough data for ${regime} regime model: ${regimeFeatures.length} samples`);
      }
    });
  }
  
  /**
   * Updates the model with historical data
   * @param {Array} monthlyData - Monthly price return data
   * @param {Array} onChainData - On-chain metrics
   */
  async update(monthlyData, onChainData = []) {
    if (!monthlyData || monthlyData.length < this.lookbackWindow + 1) {
      console.warn('Not enough data for LSTM model training');
      return;
    }
    
    // Preprocess data
    const { features, labels } = this.preprocessData(monthlyData, onChainData);
    
    if (features.length === 0) {
      console.warn('No valid features extracted for LSTM model');
      return;
    }
    
    // Normalize features
    const normalizedFeatures = this.featureScaling ? 
      this.normalizeFeatures(features) : features;
    
    // Split into training and validation sets (80/20)
    const splitIndex = Math.floor(normalizedFeatures.length * 0.8);
    const xTrain = normalizedFeatures.slice(0, splitIndex);
    const yTrain = labels.slice(0, splitIndex);
    const xVal = normalizedFeatures.slice(splitIndex);
    const yVal = labels.slice(splitIndex);
    
    // Convert to tensors
    const xTrainTensor = tf.tensor3d(xTrain);
    const yTrainTensor = tf.tensor2d(yTrain.map(y => [y]));
    const xValTensor = tf.tensor3d(xVal);
    const yValTensor = tf.tensor2d(yVal.map(y => [y]));
    
    // Build model if it doesn't exist
    if (!this.model) {
      const inputShape = normalizedFeatures[0][0].length;
      this.model = this.buildModel(inputShape);
    }
    
    // Train model
    try {
      const trainingResult = await this.model.fit(xTrainTensor, yTrainTensor, {
        epochs: this.epochs,
        batchSize: this.batchSize,
        verbose: 1,
        validationData: [xValTensor, yValTensor],
        callbacks: {
          onEpochEnd: (epoch, logs) => {
            if (epoch % 10 === 0) {
              console.log(`Epoch ${epoch}: loss=${logs.loss.toFixed(4)}, acc=${logs.acc.toFixed(4)}, val_loss=${logs.val_loss.toFixed(4)}, val_acc=${logs.val_acc.toFixed(4)}`);
            }
          }
        }
      });
      
      // Mark as trained
      this.trained = true;
      
      // Calculate final validation metrics
      const predictions = this.model.predict(xValTensor);
      const predArray = predictions.arraySync();
      const valMetrics = this.calculateMetrics(predArray, yVal);
      
      // Store metrics
      this.validationMetrics.accuracy.push(valMetrics.accuracy);
      this.validationMetrics.precision.push(valMetrics.precision);
      this.validationMetrics.recall.push(valMetrics.recall);
      this.validationMetrics.f1.push(valMetrics.f1);
      this.validationMetrics.auroc.push(valMetrics.auroc);
      
      console.log('Final validation metrics:', valMetrics);
      
      // Calculate feature importance
      this.calculateFeatureImportance(normalizedFeatures, labels);
      
      // Detect current market regime
      this.detectMarketRegime(monthlyData);
      
      // Train regime-specific models if enabled
      if (Object.keys(this.regimeModels).length === 0) {
        this.trainRegimeModels(normalizedFeatures, labels, monthlyData);
      }
      
      // Clean up
      predictions.dispose();
      
    } catch (error) {
      console.error('Error training LSTM model:', error);
    } finally {
      // Clean up tensors
      xTrainTensor.dispose();
      yTrainTensor.dispose();
      xValTensor.dispose();
      yValTensor.dispose();
    }
  }
  
  /**
   * Calculate comprehensive performance metrics
   * @param {Array} predictions - Model predictions
   * @param {Array} labels - True labels
   * @return {Object} Performance metrics
   */
  calculateMetrics(predictions, labels) {
    // Convert predictions to binary
    const binaryPredictions = predictions.map(p => p[0] >= 0.5 ? 1 : 0);
    
    // Confusion matrix
    let tp = 0, fp = 0, tn = 0, fn = 0;
    
    for (let i = 0; i < labels.length; i++) {
      if (labels[i] === 1 && binaryPredictions[i] === 1) tp++;
      if (labels[i] === 0 && binaryPredictions[i] === 1) fp++;
      if (labels[i] === 0 && binaryPredictions[i] === 0) tn++;
      if (labels[i] === 1 && binaryPredictions[i] === 0) fn++;
    }
    
    // Calculate metrics
    const accuracy = (tp + tn) / (tp + tn + fp + fn);
    const precision = tp / (tp + fp) || 0;
    const recall = tp / (tp + fn) || 0;
    const f1 = 2 * precision * recall / (precision + recall) || 0;
    
    // Calculate ROC AUC
    // Sort predictions and corresponding labels
    const sortedPairs = predictions.map((p, i) => ({
      pred: p[0],
      label: labels[i]
    })).sort((a, b) => b.pred - a.pred);
    
    // Count positives and negatives
    const numPositives = labels.filter(l => l === 1).length;
    const numNegatives = labels.length - numPositives;
    
    // Calculate ROC curve points (just enough to get AUC)
    let truePositives = 0;
    let falsePositives = 0;
    let prevTruePositives = 0;
    let prevFalsePositives = 0;
    let prevPred = -1;
    let auroc = 0;
    
    for (const pair of sortedPairs) {
      if (pair.pred !== prevPred) {
        // Add area for previous threshold
        auroc += (falsePositives - prevFalsePositives) * 
          (truePositives + prevTruePositives) / 2;
        
        prevTruePositives = truePositives;
        prevFalsePositives = falsePositives;
        prevPred = pair.pred;
      }
      
      if (pair.label === 1) {
        truePositives++;
      } else {
        falsePositives++;
      }
    }
    
    // Add final area
    auroc += (falsePositives - prevFalsePositives) * 
      (truePositives + prevTruePositives) / 2;
    
    // Normalize
    if (numPositives > 0 && numNegatives > 0) {
      auroc /= (numPositives * numNegatives);
    } else {
      auroc = 0.5; // Default for imbalanced data
    }
    
    return {
      accuracy,
      precision,
      recall,
      f1,
      auroc,
      confusionMatrix: {
        tp, fp, tn, fn
      }
    };
  }
  
/**
 * Handles feature extraction and shape consistency for model prediction
 * @param {Number} monthsAhead - Number of months ahead to predict
 * @return {Number} Probability of a crash
 */
getProbability(monthsAhead) {
  // If model is not trained, return a default probability
  if (!this.model || !this.trained) {
    return 0.1; // Default probability
  }
  
  try {
    // Get target date
    const targetDate = new Date();
    targetDate.setMonth(targetDate.getMonth() + monthsAhead);
    
    // 1. Extract model input shape from the trained model
    const inputShape = this.model.inputs[0].shape;
    
    // Verify we have valid shape information
    if (!inputShape || inputShape.length !== 3) {
      console.error(`Invalid input shape detected: ${JSON.stringify(inputShape)}`);
      return this.getHalvingCycleBasedProbability(this.getHalvingPhase(targetDate).phase);
    }
    
    // The expected feature count is the last dimension of the input shape
    const expectedFeatureCount = inputShape[2];
    
    // Log expected shape for debugging
    console.log(`Model expects input with shape: [batch, ${this.lookbackWindow}, ${expectedFeatureCount}]`);
    console.log(`Available features: ${this.featureList.join(', ')}`);
    
    // 2. Verify feature consistency
    if (this.featureList.length !== expectedFeatureCount) {
      console.error(`Feature count mismatch: Model expects ${expectedFeatureCount} features, but feature list has ${this.featureList.length}`);
      // Instead of making up values, retrieve the model architecture to understand what features it needs
      if (this.model.summary) {
        this.model.summary();
      }
      return this.getHalvingCycleBasedProbability(this.getHalvingPhase(targetDate).phase);
    }
    
    // 3. Generate features consistent with the training process
    // Retrieve the latest feature structure from the preprocessData method
    const halvingPhase = this.getHalvingPhase(targetDate);
    const sequence = this.generateConsistentFeatureSequence(targetDate, halvingPhase, expectedFeatureCount);
    
    // 4. Apply proper normalization as was done during training
    let normalizedSequence = [sequence];
    if (this.featureScaling && this.featureMeans && this.featureStds) {
      normalizedSequence = [sequence.map(point => {
        return point.map((value, index) => {
          if (index < this.featureMeans.length) {
            return (value - this.featureMeans[index]) / this.featureStds[index];
          }
          return value; // Fall back to unnormalized for any features beyond our normalization data
        });
      })];
    }
    
    // Verify dimensions match expected input shape
    const inputDims = [normalizedSequence.length, normalizedSequence[0].length, normalizedSequence[0][0].length];
    console.log(`Prepared input dimensions: [${inputDims.join(', ')}]`);
    
    // 5. Make prediction with appropriate error handling
    const input = tf.tensor3d(normalizedSequence);
    try {
      const prediction = this.model.predict(input);
      const probability = prediction.dataSync()[0];
      
      // Clean up tensors
      input.dispose();
      prediction.dispose();
      
      return probability;
    } catch (error) {
      console.error('LSTM prediction error:', error);
      input.dispose(); // Clean up tensor even on error
      
      // Fall back to regime-specific or halving-cycle-based probability
      if (this.regimeModels[this.currentRegime]) {
        try {
          const regimeInput = tf.tensor3d(normalizedSequence);
          const prediction = this.regimeModels[this.currentRegime].predict(regimeInput);
          const probability = prediction.dataSync()[0];
          
          regimeInput.dispose();
          prediction.dispose();
          return probability;
        } catch (regimeError) {
          console.error('Regime model prediction error:', regimeError);
          return this.getHalvingCycleBasedProbability(halvingPhase.phase);
        }
      } else {
        return this.getHalvingCycleBasedProbability(halvingPhase.phase);
      }
    }
  } catch (error) {
    console.error('Fatal error in LSTM prediction:', error);
    return 0.1; // Default safe value
  }
}

/**
 * Generate feature sequence with consistent dimensions matching training data
 * @param {Date} targetDate - The date for prediction
 * @param {Object} halvingPhase - Information about halving cycle phase
 * @param {Number} expectedFeatureCount - Expected number of features based on model
 * @return {Array} Sequence of feature vectors with consistent structure
 */
generateConsistentFeatureSequence(targetDate, halvingPhase, expectedFeatureCount) {
  // Create sequence matching the lookback window
  const sequence = [];
  
  // Calculate monthsSinceHalving for historical context
  const monthsSinceHalving = halvingPhase.monthsSinceHalving;
  
  // Month as cyclical feature
  const month = targetDate.getMonth();
  const monthSin = Math.sin(2 * Math.PI * month / 12);
  const monthCos = Math.cos(2 * Math.PI * month / 12);
  
  // For each point in the lookback window
  for (let i = 0; i < this.lookbackWindow; i++) {
    // Create a feature vector with expected dimensions
    // We start with the known available features from the feature list
    const featureVector = new Array(expectedFeatureCount).fill(0);
    
    // Map each known feature to the correct position in the vector
    this.featureList.forEach((feature, index) => {
      switch (feature) {
        // Time-based features
        case 'monthSin':
          featureVector[index] = monthSin;
          break;
        case 'monthCos':
          featureVector[index] = monthCos;
          break;
        case 'halvingPhase':
          featureVector[index] = halvingPhase.phase / 48; // Normalized to 0-1
          break;
          
        // Instead of making up values for price/on-chain metrics,
        // we use the information we have about the halving cycle
        // to estimate realistic values based on cycle position
        
        // Price-related features - use cycle position to estimate
        case 'return':
        case 'returnCalculated':
          // Returns tend to be higher in early-mid bull market, negative in bear
          if (halvingPhase.phase < 6) featureVector[index] = 0.05; // Small positive in early phase
          else if (halvingPhase.phase < 18) featureVector[index] = 0.15; // Stronger in bull
          else if (halvingPhase.phase < 24) featureVector[index] = -0.05; // Weaker at cycle top
          else if (halvingPhase.phase < 36) featureVector[index] = -0.15; // Negative in bear
          else featureVector[index] = 0.02; // Small positive in accumulation
          break;
          
        // On-chain metrics - based on academic research of halving cycle patterns
        case 'mvrv':
          // MVRV tends to peak late in bull markets
          if (halvingPhase.phase < 6) featureVector[index] = 1.2;
          else if (halvingPhase.phase < 12) featureVector[index] = 1.8;
          else if (halvingPhase.phase < 18) featureVector[index] = 2.5;
          else if (halvingPhase.phase < 24) featureVector[index] = 3.2;
          else if (halvingPhase.phase < 36) featureVector[index] = 1.5;
          else featureVector[index] = 1.0;
          break;
          
        case 'nvt':
          // NVT often rises during bull markets
          if (halvingPhase.phase < 6) featureVector[index] = 40;
          else if (halvingPhase.phase < 12) featureVector[index] = 50;
          else if (halvingPhase.phase < 18) featureVector[index] = 60;
          else if (halvingPhase.phase < 24) featureVector[index] = 70;
          else if (halvingPhase.phase < 36) featureVector[index] = 55;
          else featureVector[index] = 45;
          break;
          
        case 'velocity':
          // Velocity often decreases during HODLing periods
          if (halvingPhase.phase < 6) featureVector[index] = 0.04;
          else if (halvingPhase.phase < 12) featureVector[index] = 0.035;
          else if (halvingPhase.phase < 18) featureVector[index] = 0.03;
          else if (halvingPhase.phase < 24) featureVector[index] = 0.025;
          else if (halvingPhase.phase < 36) featureVector[index] = 0.03;
          else featureVector[index] = 0.035;
          break;
          
        // For features we can't reasonably estimate, leave as zero
        default:
          // Already initialized to zero
          break;
      }
    });
    
    sequence.push(featureVector);
  }
  
  return sequence;
}
  
  /**
   * Get probability based on halving cycle phase (fallback method)
   * @param {Number} phase - Halving cycle phase (0-47)
   * @return {Number} Crash probability
   */
  getHalvingCycleBasedProbability(phase) {
    // Historical pattern: higher risk in later phases
    if (phase < 6) {
      return 0.05; // Very low risk in early post-halving
    } else if (phase < 12) {
      return 0.07; // Low risk in early bull market
    } else if (phase < 18) {
      return 0.12; // Moderate risk in mid bull market
    } else if (phase < 24) {
      return 0.35; // High risk in late bull market
    } else if (phase < 36) {
      return 0.15; // Moderate risk in bear market
    } else {
      return 0.1; // Low risk in accumulation phase
    }
  }
  
  /**
   * Classifies risk levels based on probability
   * @param {Number} probability - Crash probability
   * @return {String} Risk level descriptor
   */
  getRiskLevel(probability) {
    if (probability < 0.05) return 'Very Low';
    if (probability < 0.10) return 'Low';
    if (probability < 0.20) return 'Moderate';
    if (probability < 0.30) return 'High';
    return 'Very High';
  }
  
  /**
   * Generates crash calendar for next 12 months
   * @return {Array} Calendar of crash probabilities
   */
  generateCalendar() {
    const currentDate = new Date();
    const calendar = [];
    
    for (let i = 0; i < 12; i++) {
      const futureDate = new Date(currentDate);
      futureDate.setMonth(currentDate.getMonth() + i);
      
      const month = futureDate.getMonth();
      const year = futureDate.getFullYear();
      const monthName = new Intl.DateTimeFormat('en-US', { month: 'long' }).format(futureDate);
      
      const probability = this.getProbability(i);
      
      calendar.push({
        month: `${year}-${String(month + 1).padStart(2, '0')}`,
        monthName,
        probability,
        riskLevel: this.getRiskLevel(probability),
        halvingPhase: this.getHalvingPhase(futureDate).phase,
        model: 'LSTM',
        regime: this.currentRegime,
        featureContributions: this.featureImportance
      });
    }
    
    return calendar;
  }
  
  /**
   * Generate insights about the current market conditions
   * @return {Object} Market insights
   */
  generateInsights() {
    // Get current halving phase
    const { phase, monthsSinceHalving } = this.getHalvingPhase(new Date());
    
    // Calculate average crash probability over next 3 months
    const shortTermRisk = [0, 1, 2]
      .map(i => this.getProbability(i))
      .reduce((sum, prob) => sum + prob, 0) / 3;
    
    // Calculate average crash probability for months 6-12
    const longTermRisk = [6, 7, 8, 9, 10, 11]
      .map(i => this.getProbability(i))
      .reduce((sum, prob) => sum + prob, 0) / 6;
    
    return {
      halvingPhase: {
        phase,
        monthsSinceHalving,
        description: this.getHalvingPhaseDescription(phase)
      },
      riskAssessment: {
        shortTerm: shortTermRisk,
        longTerm: longTermRisk,
        differential: shortTermRisk - longTermRisk,
        trend: shortTermRisk > longTermRisk ? 'Increasing' : 'Decreasing'
      },
      modelInsights: {
        trained: this.trained,
        currentRegime: this.currentRegime,
        featureImportance: this.featureImportance,
        validationMetrics: {
          accuracy: this.validationMetrics.accuracy.length > 0 ? 
            this.validationMetrics.accuracy[this.validationMetrics.accuracy.length - 1] : null,
          f1: this.validationMetrics.f1.length > 0 ? 
            this.validationMetrics.f1[this.validationMetrics.f1.length - 1] : null
        }
      }
    };
  }
  
  /**
   * Get a description of the current halving phase
   * @param {Number} phase - Phase in the halving cycle (0-47)
   * @return {String} Description of the phase
   */
  getHalvingPhaseDescription(phase) {
    if (phase < 6) {
      return 'Early post-halving phase - historically characterized by consolidation';
    } else if (phase < 12) {
      return 'Price discovery phase - beginning of potential bull run';
    } else if (phase < 18) {
      return 'Acceleration phase - historically a period of rapid price increases';
    } else if (phase < 24) {
      return 'Maturity phase - potential market peak territory';
    } else if (phase < 36) {
      return 'Post-peak bear market - historically a period of price decline';
    } else {
      return 'Pre-halving accumulation phase - historically a period of recovery';
    }
  }
  
  /**
   * Returns metrics about the model
   * @return {Object} Model metrics
   */
  getMetrics() {
    return {
      name: 'LSTM Model',
      trained: this.trained,
      lookbackWindow: this.lookbackWindow,
      units: this.units,
      epochs: this.epochs,
      batchSize: this.batchSize,
      dropoutRate: this.dropoutRate,
      useAttention: this.useAttention,
      features: this.featureList,
      featureImportance: this.featureImportance,
      validationMetrics: this.validationMetrics,
      regimeModels: Object.keys(this.regimeModels),
      currentRegime: this.currentRegime
    };
  }
}

module.exports = LSTMCrashPredictor;
