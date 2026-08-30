const { pool } = require("../config/db");

function calculateMean(values) {
    if (values.length === 0) return 0;

    return (
        values.reduce((sum, value) => sum + value, 0) /
        values.length
    );
}

function calculateStandardDeviation(values, mean) {
    if (values.length <= 1) return 0;

    const variance =
        values.reduce((sum, value) => {
            return sum + Math.pow(value - mean, 2);
        }, 0) / values.length;

    return Math.sqrt(variance);
}

function calculateMedian(values) {
    if (values.length === 0) return 0;

    const sorted = [...values].sort((a, b) => a - b);

    const middle = Math.floor(sorted.length / 2);

    if (sorted.length % 2 === 0) {
        return (sorted[middle - 1] + sorted[middle]) / 2;
    }

    return sorted[middle];
}

function calculateMAD(values, median) {
    if (values.length === 0) return 0;

    const deviations = values.map((value) =>
        Math.abs(value - median)
    );

    return calculateMedian(deviations);
}

async function getPeerGroup(component) {
    const [rows] = await pool.execute(
        `
        SELECT
            c.id,
            c.component_id,
            m.time_point_hours,
            m.measurement_value
        FROM components c
        JOIN measurements m
            ON c.id = m.component_id
        WHERE
            c.lot_id = ?
            AND c.temperature_c = ?
            AND c.parameter_name = ?
        ORDER BY
            c.component_id,
            m.time_point_hours
        `,
        [
            component.lot_id,
            component.temperature_c,
            component.parameter_name
        ]
    );

    return rows;
}

async function calculateDynamicAnomaly(component) {
    const peerRows = await getPeerGroup(component);

    if (peerRows.length === 0) {
        throw new Error("No peer group found for component.");
    }

    // Use the latest measurement (168h) for the primary
    // population comparison.
    const latestValues = peerRows
        .filter((row) => row.time_point_hours === 168)
        .map((row) => Number(row.measurement_value));

    const componentLatestValue = Number(
        component.measurements.find(
            (m) => Number(m.time_point_hours) === 168
        )?.measurement_value
    );

    const mean = calculateMean(latestValues);

    const standardDeviation = calculateStandardDeviation(
        latestValues,
        mean
    );

    const median = calculateMedian(latestValues);

    const mad = calculateMAD(latestValues, median);

    let zScore = 0;

    if (standardDeviation > 0) {
        zScore =
            (componentLatestValue - mean) /
            standardDeviation;
    }

    let robustScore = 0;

    if (mad > 0) {
        robustScore =
            (componentLatestValue - median) /
            (1.4826 * mad);
    }

    // Convert deviation into a bounded anomaly score.
    const zComponent = Math.min(
        Math.abs(zScore) / 3,
        1
    );

    const robustComponent = Math.min(
        Math.abs(robustScore) / 3,
        1
    );

    const anomalyScore =
        0.6 * zComponent +
        0.4 * robustComponent;

    let status = "NORMAL";

    if (anomalyScore >= 0.85) {
        status = "CRITICAL";
    } else if (anomalyScore >= 0.70) {
        status = "INVESTIGATE";
    } else if (anomalyScore >= 0.40) {
        status = "MONITOR";
    }

    return {
        peerGroup: {
            lotId: component.lot_id,
            temperatureC: component.temperature_c,
            parameter: component.parameter_name,
            sampleCount: latestValues.length
        },

        componentValue: componentLatestValue,

        baseline: {
            mean,
            standardDeviation,
            median,
            mad
        },

        zScore,
        robustScore,

        anomalyScore,

        status
    };
}

module.exports = {
    calculateDynamicAnomaly
};

