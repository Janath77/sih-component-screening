const { pool } = require("../config/db");

// ------------------------------------------------------------
// Percentile
// ------------------------------------------------------------

function percentile(values, percentileValue) {
    if (!values.length) {
        return 0;
    }

    const sorted = [...values].sort(
        (a, b) => a - b
    );

    const position =
        (percentileValue / 100) *
        (sorted.length - 1);

    const lower =
        Math.floor(position);

    const upper =
        Math.ceil(position);

    if (lower === upper) {
        return sorted[lower];
    }

    const weight =
        position - lower;

    return (
        sorted[lower] +
        weight *
        (sorted[upper] - sorted[lower])
    );
}

// ------------------------------------------------------------
// Healthy peer data
//
// Healthy population:
//     healthy
//     noisy_healthy
//
// Peer definition:
//     same lot + same temperature
// ------------------------------------------------------------

async function getHealthyPeerSlopes(
    lotId,
    temperatureC
) {
    const [rows] =
        await pool.execute(
            `
            SELECT
                c.component_id,

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

            WHERE
                c.lot_id = ?
                AND c.temperature_c = ?
                AND c.behavior_class IN (
                    'healthy',
                    'noisy_healthy'
                )

            GROUP BY
                c.id,
                c.component_id

            HAVING
                value_24h IS NOT NULL
                AND value_168h IS NOT NULL
            `,
            [
                lotId,
                temperatureC
            ]
        );

    const slopes =
        rows.map((row) => {
            return (
                Number(row.value_168h) -
                Number(row.value_24h)
            ) / 144;
        });

    return {
        slopes,
        sampleCount: rows.length
    };
}

// ------------------------------------------------------------
// Calculate dynamic safety slope
// ------------------------------------------------------------

async function calculateSafetySlope(
    lotId,
    temperatureC
) {
    const peer =
        await getHealthyPeerSlopes(
            lotId,
            temperatureC
        );

    if (peer.sampleCount < 5) {
        throw new Error(
            `Insufficient healthy peer data for ${lotId}/${temperatureC}°C`
        );
    }

    const safetySlope =
        percentile(
            peer.slopes,
            95
        );

    const medianSlope =
        percentile(
            peer.slopes,
            50
        );

    const meanSlope =
        peer.slopes.reduce(
            (sum, value) =>
                sum + value,
            0
        ) / peer.slopes.length;

    return {
        lotId,
        temperatureC,

        sampleCount:
            peer.sampleCount,

        meanSlope,

        medianSlope,

        safetySlope,

        percentile:
            95
    };
}

// ------------------------------------------------------------
// Evaluate predicted future drift
// ------------------------------------------------------------

async function evaluateSafetySlope({
    lotId,
    temperatureC,
    value24h,
    predicted168h
}) {
    const safety =
        await calculateSafetySlope(
            lotId,
            temperatureC
        );

    const predictedSlope =
        (
            predicted168h -
            value24h
        ) / 144;

    const excess =
        predictedSlope -
        safety.safetySlope;

    const ratio =
        safety.safetySlope === 0
            ? 0
            : predictedSlope /
              safety.safetySlope;

    let status = "WITHIN_SAFE_RANGE";

    if (
        predictedSlope >
        safety.safetySlope
    ) {
        status = "EXCEEDS_SAFETY_SLOPE";
    }

    let severity = "LOW";

    if (ratio >= 1.5) {
        severity = "CRITICAL";
    } else if (ratio >= 1.25) {
        severity = "HIGH";
    } else if (ratio > 1) {
        severity = "MODERATE";
    }

    return {
        safetySlope:
            safety.safetySlope,

        healthyMeanSlope:
            safety.meanSlope,

        healthyMedianSlope:
            safety.medianSlope,

        peerSampleCount:
            safety.sampleCount,

        predictedSlope,

        slopeExcess:
            excess,

        slopeRatio:
            ratio,

        status,

        severity
    };
}

module.exports = {
    calculateSafetySlope,
    evaluateSafetySlope
};

