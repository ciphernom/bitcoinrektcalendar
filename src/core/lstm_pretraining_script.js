// lstm_pretraining_script.js

const tf = require('@tensorflow/tfjs-node');
const fetch = require('node-fetch'); // Ensure node-fetch v2 is installed for require, or use ESM for v3+
const fs = require('fs');
const path = require('path');
const moment = require('moment'); // Not strictly used in this script's logic now but LSTMCrashPredictor might use it

// Adjust the path if your files are located elsewhere
const CrashDetector = require('./crash-detector'); // Assuming crash-detector.js is in the same directory
const LSTMCrashPredictor = require('./lstm-crash-predictor'); // Assuming lstm-crash-predictor.js is in the same directory

const COINMETRICS_BTC_CSV_URL = 'https://raw.githubusercontent.com/coinmetrics/data/master/csv/btc.csv';
const MODEL_SAVE_PATH = 'file://./lstm_trained_model_daily_10pct_robust_final'; // Path for the saved model
const MODEL_ARTIFACTS_DIR = './lstm_trained_model_daily_10pct_robust_final';
const NORMALIZATION_PARAMS_PATH = path.join(MODEL_ARTIFACTS_DIR, 'normalization_params_daily_10pct_robust_final.json');


function processDailyDataForLSTM(csvText) {
    console.log("Processing CSV for daily LSTM features with robustness checks...");
    const lines = csvText.trim().split('\n');
    const headers = lines[0].split(',');

    const timeIndex = headers.indexOf('time');
    const priceIndex = headers.indexOf('PriceUSD');
    // Field names from btc.csv that LSTMCrashPredictor.preprocessData might use
    const mvrvIndex = headers.indexOf('CapMVRVCur');
    const nvtIndex = headers.indexOf('NVTAdj');
    const velocityIndex = headers.indexOf('VelCur1yr'); // LSTMCrashPredictor might map this to 'velocity'

    if (timeIndex === -1 || priceIndex === -1) {
        throw new Error('CSV format is not as expected. "time" or "PriceUSD" column missing.');
    }

    const dailyFeatureData = [];
    const rawDataPoints = [];

    // First pass: parse all data points and filter out invalid prices early
    for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',');
        const dateString = values[timeIndex];
        const price = parseFloat(values[priceIndex]);

        if (dateString && !isNaN(price) && price > 0) { // Ensure price is a valid positive number
            rawDataPoints.push({
                date: new Date(dateString),
                price: price,
                // Pass on-chain metrics as parsed; LSTMCrashPredictor.preprocessData MUST handle nulls
                CapMVRVCur: mvrvIndex !== -1 && values[mvrvIndex] ? parseFloat(values[mvrvIndex]) : null,
                NVTAdj: nvtIndex !== -1 && values[nvtIndex] ? parseFloat(values[nvtIndex]) : null,
                VelCur1yr: velocityIndex !== -1 && values[velocityIndex] ? parseFloat(values[velocityIndex]) : null
            });
        } else if (dateString && (isNaN(price) || price <= 0)) {
            // console.warn(`Skipping data point due to invalid price: Date ${dateString}, Price ${values[priceIndex]}`);
        }
    }

    // Sort by date to ensure correct return calculation sequence
    rawDataPoints.sort((a, b) => a.date - b.date);

    let previousPrice = null;
    for (const daily of rawDataPoints) {
        let dailyReturn = 0; // Default to 0 if no previous price or previous price is invalid

        // Calculate daily return if previousPrice is valid and positive
        if (previousPrice !== null && previousPrice > 0) {
            dailyReturn = (daily.price - previousPrice) / previousPrice;
        }

        // Each object in `dailyFeatureData` will be processed by LSTMCrashPredictor.preprocessData
        // LSTMCrashPredictor.preprocessData is responsible for:
        // - Creating sequences.
        // - Extracting its defined set of features from these fields (e.g., its own 'return' calc, sin/cos month, etc.).
        // - CRITICALLY: Imputing any 'null' on-chain metrics (CapMVRVCur, NVTAdj, VelCur1yr) to a number (e.g., 0).
        // - CRITICALLY: Ensuring no division by zero if it calculates features like (price / startPrice) - 1.
        const featurePoint = {
            date: daily.date,
            price: daily.price,         // Current day's price (LSTMCrashPredictor might use as 'endPrice')
            startPrice: previousPrice,  // Previous day's price (LSTMCrashPredictor might use as 'startPrice')
            return: dailyReturn,        // The daily return for labeling by LSTMCrashPredictor.
                                        // Also a potential feature for LSTMCrashPredictor.
            CapMVRVCur: daily.CapMVRVCur, // Passed as is; LSTMCrashPredictor must handle null.
            NVTAdj: daily.NVTAdj,          // Passed as is; LSTMCrashPredictor must handle null.
            VelCur1yr: daily.VelCur1yr     // Passed as is; LSTMCrashPredictor must handle null.
        };

        // Only add data points where 'startPrice' (previousPrice) was available.
        // This skips the very first point in rawDataPoints, ensuring 'return' and 'startPrice' are meaningful.
        if (previousPrice !== null) {
            dailyFeatureData.push(featurePoint);
        }
        previousPrice = daily.price; // Update previousPrice for the next iteration
    }

    if (dailyFeatureData.length === 0 && rawDataPoints.length > 0) {
        console.warn("No daily feature data points were generated. This might be due to all prices being invalid or only one valid data point existing after filtering.");
    } else {
        console.log(`Processed ${dailyFeatureData.length} daily feature data points for LSTM (daily returns calculated).`);
    }
    return dailyFeatureData;
}


async function pretrainLSTM() {
    try {
        console.log(`Fetching Bitcoin data from ${COINMETRICS_BTC_CSV_URL}...`);
        const response = await fetch(COINMETRICS_BTC_CSV_URL);
        if (!response.ok) {
            throw new Error(`Failed to fetch Bitcoin data: ${response.statusText}`);
        }
        const csvText = await response.text();
        console.log('Data fetched successfully.');

        const dailyFeatureData = processDailyDataForLSTM(csvText);

        const desiredLookbackWindowDays = 60;
        const newThresholdDaily = -0.10; // Targeting 10% daily drops

        // Ensure enough data for sequence generation and train/validation split
        // (N - lookback) sequences. We need enough for tf.model.fit to work with validationSplit.
        // A very rough minimum: (lookbackWindow + ~10 for train sequences) + (lookbackWindow + ~3 for val sequences)
        // Or simply, ensure enough sequences: e.g., total_sequences * 0.2 > 1 for validation.
        // Let's say we need at least 20 usable sequences after forming them.
        if (dailyFeatureData.length < desiredLookbackWindowDays + 20) {
            console.error(`Not enough daily data to train the LSTM model. Need at least ${desiredLookbackWindowDays + 20} daily records to form sufficient sequences, got ${dailyFeatureData.length}.`);
            return;
        }

        const lstmPredictor = new LSTMCrashPredictor({
            threshold: newThresholdDaily,
            lookbackWindow: desiredLookbackWindowDays,
            epochs: 50,
            batchSize: 32,
            learningRate: 0.001, // If loss=nan persists, first check data, then try 0.0001
            units: 64,
            dropoutRate: 0.2,
            useAttention: true,    //
            featureScaling: true   //
        });

        console.log(`Starting LSTM model training with daily data...`);
        console.log(`Targeting daily drops <= ${newThresholdDaily * 100}%`);
        console.log(`Using a lookback window of ${desiredLookbackWindowDays} days.`);

        // The LSTMCrashPredictor's `update` and internal `preprocessData` methods
        // MUST be correctly modified to handle this `dailyFeatureData` structure.
        await lstmPredictor.update(dailyFeatureData, []); // Second arg (onChainData) is empty as it's integrated

        if (lstmPredictor.trained && lstmPredictor.model) {
            console.log("LSTM Model training completed.");

            if (!fs.existsSync(MODEL_ARTIFACTS_DIR)) {
                fs.mkdirSync(MODEL_ARTIFACTS_DIR, { recursive: true });
            }

            await lstmPredictor.model.save(MODEL_SAVE_PATH);
            console.log(`Trained LSTM model saved to ${MODEL_SAVE_PATH}`);

            if (lstmPredictor.featureScaling && lstmPredictor.featureMeans && lstmPredictor.featureStds) {
                const normalizationParams = {
                    featureMeans: lstmPredictor.featureMeans,
                    featureStds: lstmPredictor.featureStds,
                    featureList: lstmPredictor.featureList // Ensure LSTMCrashPredictor correctly populates this
                };
                fs.writeFileSync(NORMALIZATION_PARAMS_PATH, JSON.stringify(normalizationParams, null, 2));
                console.log(`Normalization parameters saved to ${NORMALIZATION_PARAMS_PATH}`);
            }

            if (Object.keys(lstmPredictor.featureImportance).length > 0) {
                console.log("Calculated Feature Importance (relative contribution after perturbation):");
                const sortedImportance = Object.entries(lstmPredictor.featureImportance)
                    .sort(([,a],[,b]) => Math.abs(b) - Math.abs(a));

                for (const [feature, importance] of sortedImportance) {
                    console.log(`  ${feature}: ${importance.toFixed(4)}`);
                }
            } else {
                console.log("Feature importance was not calculated or is empty. This often indicates the model did not learn effectively or the calculation method needs review.");
            }
            if (lstmPredictor.validationMetrics) { // Assuming LSTMCrashPredictor stores these
                const lastIndex = lstmPredictor.validationMetrics.accuracy.length - 1;
                if (lastIndex >= 0) {
                    console.log("Last recorded validation metrics from LSTMCrashPredictor:");
                    console.log(`  Accuracy: ${lstmPredictor.validationMetrics.accuracy[lastIndex]?.toFixed(4)}`);
                    console.log(`  Precision: ${lstmPredictor.validationMetrics.precision[lastIndex]?.toFixed(4)}`);
                    console.log(`  Recall: ${lstmPredictor.validationMetrics.recall[lastIndex]?.toFixed(4)}`);
                    console.log(`  F1-Score: ${lstmPredictor.validationMetrics.f1[lastIndex]?.toFixed(4)}`);
                    console.log(`  AUROC: ${lstmPredictor.validationMetrics.auroc[lastIndex]?.toFixed(4)}`);
                }
            }

        } else {
            console.error("LSTM Model training did not complete successfully, or the model was not available after training. Check for errors during the .update() call.");
        }

    } catch (error) {
        console.error("Error during LSTM pre-training:", error);
        if (error.stack) {
            console.error(error.stack);
        }
    }
}

pretrainLSTM();
