const { pool } = require("../config/db");

const TRAIN_RATIO = 0.8;
const RANDOM_SEED = 42;
const K = 7;

// ============================================================
// Deterministic shuffle
// ============================================================

function seededShuffle(data, seed = RANDOM_SEED) {
    const result = [...data];
    let state = seed;

    function random() {
        state =
            (state * 1664525 + 1013904223) %
            4294967296;

        return state / 4294967296;
    }

    for (let i = result.length - 1; i > 0; i--) {
        const j = Math.floor(random() * (i + 1));

        [result[i], result[j]] =
            [result[j], result[i]];
    }

    return result;
}

// ============================================================
// Statistics
// ============================================================

function mean(values) {
    if (!values.length) {
        return 0;
    }

    return (
        values.reduce(
            (sum, value) => sum + value,
            0
        ) / values.length
    );
}

function standardDeviation(values) {
    if (values.length <= 1) {
        return 1;
    }

    const avg = mean(values);

    const variance =
        values.reduce(
            (sum, value) =>
                sum +
                Math.pow(value - avg, 2),
            0
        ) / values.length;

    return Math.sqrt(variance) || 1;
}

// ============================================================
// Evaluation metrics
// ============================================================

function calculateMAE(actual, predicted) {
    if (!actual.length) {
        return 0;
    }

    return (
        actual.reduce(
            (sum, value, index) =>
                sum +
                Math.abs(
                    value - predicted[index]
                ),
            0
        ) / actual.length
    );
}

function calculateRMSE(actual, predicted) {
    if (!actual.length) {
        return 0;
    }

    const mse =
        actual.reduce(
            (sum, value, index) =>
                sum +
                Math.pow(
                    value - predicted[index],
                    2
                ),
            0
        ) / actual.length;

    return Math.sqrt(mse);
}

function calculateR2(actual, predicted) {
    if (!actual.length) {
        return 0;
    }

    const actualMean = mean(actual);

    let totalSS = 0;
    let residualSS = 0;

    for (let i = 0; i < actual.length; i++) {
        totalSS += Math.pow(
            actual[i] - actualMean,
            2
        );

        residualSS += Math.pow(
            actual[i] - predicted[i],
            2
        );
    }

    if (totalSS === 0) {
        return 0;
    }

    return 1 - residualSS / totalSS;
}

// ============================================================
// Feature engineering
//
// IMPORTANT:
// Only 0h and 24h are used.
//
// Derived features:
//   delta
//   relative change
//   early slope
//   ratio
// ============================================================

function buildFeatures(row) {
    const value0h = Number(row.value0h);
    const value24h = Number(row.value24h);

    const delta =
        value24h - value0h;

    const base =
        Math.max(
            Math.abs(value0h),
            0.000001
        );

    const relativeChange =
        delta / base;

    const earlySlope =
        delta / 24;

    const ratio =
        value24h / base;

    return [
        value0h,
        value24h,
        delta,
        relativeChange,
        earlySlope,
        ratio
    ];
}

// ============================================================
// Retrieve dataset
// ============================================================

async function getTrainingData() {
    const [rows] = await pool.execute(`
        SELECT
            c.component_id,
            c.lot_id,
            c.temperature_c,

            MAX(
                CASE
                    WHEN m.time_point_hours = 0
                    THEN m.measurement_value
                END
            ) AS value_0h,

            MAX(
                CASE
                    WHEN m.time_point_hours = 24
                    THEN m.measurement_value
                END
            ) AS value_24h,

            MAX(
                CASE
                    WHEN m.time_point_hours = 168
                    THEN m.measurement_value
                END
            ) AS value_168h

        FROM components c

        INNER JOIN measurements m
            ON c.id = m.component_id

        GROUP BY
            c.id,
            c.component_id,
            c.lot_id,
            c.temperature_c

        HAVING
            value_0h IS NOT NULL
            AND value_24h IS NOT NULL
            AND value_168h IS NOT NULL

        ORDER BY
            c.component_id
    `);

    return rows.map((row) => ({
        componentId:
            row.component_id,

        lotId:
            row.lot_id,

        temperatureC:
            Number(row.temperature_c),

        value0h:
            Number(row.value_0h),

        value24h:
            Number(row.value_24h),

        value168h:
            Number(row.value_168h)
    }));
}

// ============================================================
// Peer groups
//
// Each model is trained within:
//     same lot + same temperature
//
// This prevents unrelated populations from being mixed.
// ============================================================

function getGroupKey(row) {
    return `${row.lotId}_${row.temperatureC}`;
}

function groupByPeerPopulation(data) {
    const groups = new Map();

    for (const row of data) {
        const key = getGroupKey(row);

        if (!groups.has(key)) {
            groups.set(key, []);
        }

        groups.get(key).push(row);
    }

    return groups;
}

// ============================================================
// Feature scaling
//
// KNN is distance-based, so the variables must be normalized.
// ============================================================

function calculateFeatureScaling(rows) {
    const featureRows =
        rows.map(buildFeatures);

    const featureCount =
        featureRows[0].length;

    const means = [];
    const stds = [];

    for (
        let column = 0;
        column < featureCount;
        column++
    ) {
        const values =
            featureRows.map(
                (row) => row[column]
            );

        means.push(mean(values));
        stds.push(
            standardDeviation(values)
        );
    }

    return {
        means,
        stds
    };
}

function scaleFeatures(features, scaling) {
    return features.map(
        (value, index) =>
            (value - scaling.means[index]) /
            scaling.stds[index]
    );
}

// ============================================================
// KNN REGRESSION
//
// We calculate Euclidean distance and use inverse-distance
// weighting for the nearest neighbors.
// ============================================================

function trainKNN(rows) {
    if (rows.length < 2) {
        throw new Error(
            "Not enough peer samples for KNN regression."
        );
    }

    const scaling =
        calculateFeatureScaling(rows);

    const samples =
        rows.map((row) => ({
            features: scaleFeatures(
                buildFeatures(row),
                scaling
            ),

            target:
                row.value168h
        }));

    return {
        samples,
        scaling,
        k: Math.min(K, samples.length)
    };
}

function euclideanDistance(a, b) {
    let sum = 0;

    for (let i = 0; i < a.length; i++) {
        sum += Math.pow(
            a[i] - b[i],
            2
        );
    }

    return Math.sqrt(sum);
}

function predictKNN(model, row) {
    const rawFeatures =
        buildFeatures(row);

    const features =
        scaleFeatures(
            rawFeatures,
            model.scaling
        );

    const distances =
        model.samples
            .map((sample) => ({
                distance:
                    euclideanDistance(
                        features,
                        sample.features
                    ),

                target:
                    sample.target
            }))
            .sort(
                (a, b) =>
                    a.distance -
                    b.distance
            );

    const neighbors =
        distances.slice(
            0,
            model.k
        );

    // Exact match
    if (
        neighbors.length > 0 &&
        neighbors[0].distance === 0
    ) {
        return neighbors[0].target;
    }

    let weightedSum = 0;
    let totalWeight = 0;

    for (const neighbor of neighbors) {
        const weight =
            1 /
            Math.max(
                neighbor.distance,
                0.000001
            );

        weightedSum +=
            neighbor.target *
            weight;

        totalWeight += weight;
    }

    if (totalWeight === 0) {
        return mean(
            neighbors.map(
                (neighbor) =>
                    neighbor.target
            )
        );
    }

    return (
        weightedSum /
        totalWeight
    );
}

// ============================================================
// Train separate KNN model for every lot-temperature group
// ============================================================

function trainPeerModels(trainingData) {
    const groups =
        groupByPeerPopulation(
            trainingData
        );

    const models = new Map();

    for (
        const [key, rows]
        of groups.entries()
    ) {
        if (rows.length < 2) {
            continue;
        }

        models.set(
            key,
            trainKNN(rows)
        );
    }

    return models;
}

// ============================================================
// Train and evaluate
// ============================================================

async function trainAndEvaluateModel() {
    const dataset =
        await getTrainingData();

    if (dataset.length < 20) {
        throw new Error(
            "Not enough historical data to train the drift model."
        );
    }

    const shuffled =
        seededShuffle(dataset);

    const trainSize =
        Math.floor(
            shuffled.length *
            TRAIN_RATIO
        );

    const trainingData =
        shuffled.slice(
            0,
            trainSize
        );

    const testingData =
        shuffled.slice(trainSize);

    const models =
        trainPeerModels(
            trainingData
        );

    const actual = [];
    const predicted = [];

    for (
        const row of testingData
    ) {
        const key =
            getGroupKey(row);

        const model =
            models.get(key);

        if (!model) {
            continue;
        }

        const prediction =
            predictKNN(
                model,
                row
            );

        actual.push(
            row.value168h
        );

        predicted.push(
            prediction
        );
    }

    if (!actual.length) {
        throw new Error(
            "No test samples could be evaluated."
        );
    }

    return {
        models,

        metrics: {
            trainingSamples:
                trainingData.length,

            testingSamples:
                testingData.length,

            evaluatedSamples:
                actual.length,

            mae:
                calculateMAE(
                    actual,
                    predicted
                ),

            rmse:
                calculateRMSE(
                    actual,
                    predicted
                ),

            r2:
                calculateR2(
                    actual,
                    predicted
                )
        }
    };
}

// ============================================================
// Predict component
// ============================================================

async function predictComponent168h(
    componentId
) {
    const dataset =
        await getTrainingData();

    const component =
        dataset.find(
            (row) =>
                row.componentId ===
                componentId
        );

    if (!component) {
        throw new Error(
            `Component ${componentId} not found.`
        );
    }

    const trainingResult =
        await trainAndEvaluateModel();

    /*
     * For a historical component, use its
     * lot-temperature peer model.
     *
     * Prediction inputs are still ONLY:
     *     0h
     *     24h
     */
    const key =
        getGroupKey(component);

    const peerModel =
        trainingResult.models.get(key);

    if (!peerModel) {
        throw new Error(
            `No trained peer model exists for ${key}.`
        );
    }

    const predicted168h =
        predictKNN(
            peerModel,
            component
        );

    const value0h =
        component.value0h;

    const value24h =
        component.value24h;

    const actual168h =
        component.value168h;

    const earlyDriftRate =
        (value24h - value0h) /
        24;

    const predictedDriftRate =
        (predicted168h - value24h) /
        144;

    const predictionError =
        Math.abs(
            actual168h -
            predicted168h
        );

    return {
        componentId,

        peerPopulation: {
            lotId:
                component.lotId,

            temperatureC:
                component.temperatureC
        },

        inputs: {
            value0h,
            value24h
        },

        derivedFeatures: {
            delta:
                value24h -
                value0h,

            relativeChange:
                (value24h - value0h) /
                Math.max(
                    Math.abs(value0h),
                    0.000001
                ),

            earlyDriftRate
        },

        prediction: {
            predicted168h,
            actual168h,
            predictionError
        },

        drift: {
            earlyDriftRate,
            predictedDriftRate
        },

        metrics:
            trainingResult.metrics,

        model: {
            type:
                "Peer-Group KNN Regression",

            k:
                peerModel.k
        }
    };
}

module.exports = {
    trainAndEvaluateModel,
    predictComponent168h
};

