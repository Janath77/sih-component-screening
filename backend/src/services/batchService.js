const { Readable } = require("stream");
const csv = require("csv-parser");

const {
    getComponentById
} = require("./componentService");

const {
    calculateDynamicAnomaly
} = require("./anomalyService");

const {
    predictComponent168h
} = require("./driftService");

const {
    evaluateSafetySlope
} = require("./safetyService");

const {
    calculateFinalRisk
} = require("./riskService");

const {
    generateExplanation
} = require("./explanationService");

/*
 * Number of components analyzed at the same time.
 *
 * 6 is intentionally conservative so we don't
 * overload Node.js / MySQL / the ML calculations.
 */
class BatchValidationError extends Error {
    constructor(message) {
        super(message);
        this.name = "BatchValidationError";
        this.statusCode = 400;
    }
}

const MAX_CONCURRENCY = 6;

/*
 * Cache completed component analyses.
 *
 * This is especially useful during the SIH demo:
 * uploading/screening the same dataset again will
 * reuse results already calculated during this run
 * instead of recalculating them.
 */
const analysisCache = new Map();

// ============================================================
// CSV PARSER
// ============================================================

function parseCSV(buffer) {
    return new Promise((resolve, reject) => {
        const rows = [];

        Readable
            .from([buffer])
            .pipe(csv())
            .on("data", (row) => {
                rows.push(row);
            })
            .on("end", () => {
                resolve(rows);
            })
            .on("error", reject);
    });
}

// ============================================================
// COMPONENT ID EXTRACTION
// ============================================================

function getComponentId(row) {
    const possibleFields = [
        "component_id",
        "Component_ID",
        "componentId",
        "COMPONENT_ID",
        "id",
        "ID"
    ];

    for (const field of possibleFields) {
        if (
            row[field] !== undefined &&
            String(row[field]).trim() !== ""
        ) {
            return String(row[field])
                .trim()
                .toUpperCase();
        }
    }

    return null;
}

// ============================================================
// ANALYZE ONE COMPONENT
// ============================================================

async function analyzeOneComponent(componentId) {
    /*
     * Reuse an already-computed result.
     */
    if (analysisCache.has(componentId)) {
        return {
            ...analysisCache.get(componentId),
            cached: true
        };
    }

    try {
        const component =
            await getComponentById(componentId);

        if (!component) {
            const result = {
                componentId,
                success: false,
                error: "Component not found"
            };

            analysisCache.set(
                componentId,
                result
            );

            return result;
        }

        // ----------------------------------------------------
        // MODULE A
        // ----------------------------------------------------

        const anomaly =
            await calculateDynamicAnomaly(
                component
            );

        // ----------------------------------------------------
        // MODULE B
        // ----------------------------------------------------

        const drift =
            await predictComponent168h(
                componentId
            );

        // ----------------------------------------------------
        // SAFETY
        // ----------------------------------------------------

        const peerPopulation =
            drift?.peerPopulation || {};

        const driftInputs =
            drift?.inputs || {};

        const driftPrediction =
            drift?.prediction || {};

        const safety =
            await evaluateSafetySlope({
                lotId:
                    peerPopulation.lotId,

                temperatureC:
                    peerPopulation.temperatureC,

                value24h:
                    driftInputs.value24h,

                predicted168h:
                    driftPrediction.predicted168h
            });

        // ----------------------------------------------------
        // FINAL RISK
        // ----------------------------------------------------

        const risk =
            calculateFinalRisk({
                anomaly,
                drift,
                safety
            });

        // ----------------------------------------------------
        // EXPLANATION
        // ----------------------------------------------------

        const explanation =
            generateExplanation({
                component,
                anomaly,
                drift,
                safety,
                risk
            });

        const result = {
            componentId,

            success: true,

            lotId:
                component.lot_id,

            temperatureC:
                Number(
                    component.temperature_c
                ),

            parameter:
                component.parameter_name,

            behaviorClass:
                component.behavior_class,

            originalOutcome:
                component.outcome,

            moduleA: {
                anomalyScore:
                    Number(
                        anomaly?.anomalyScore || 0
                    ),

                zScore:
                    Number(
                        anomaly?.zScore || 0
                    ),

                robustScore:
                    Number(
                        anomaly?.robustScore || 0
                    ),

                status:
                    anomaly?.status || "UNKNOWN"
            },

            moduleB: {
                value0h:
                    Number(
                        driftInputs.value0h || 0
                    ),

                value24h:
                    Number(
                        driftInputs.value24h || 0
                    ),

                predicted168h:
                    Number(
                        driftPrediction
                            .predicted168h || 0
                    ),

                actual168h:
                    driftPrediction
                        .actual168h ?? null,

                predictionError:
                    driftPrediction
                        .predictionError ?? null
            },

            safety: {
                safetySlope:
                    Number(
                        safety?.safetySlope || 0
                    ),

                predictedSlope:
                    Number(
                        safety?.predictedSlope || 0
                    ),

                slopeRatio:
                    Number(
                        safety?.slopeRatio || 0
                    ),

                status:
                    safety?.status ||
                    "UNKNOWN",

                severity:
                    safety?.severity ||
                    "LOW"
            },

            finalRisk: {
                riskScore:
                    Number(
                        risk?.riskScore || 0
                    ),

                decision:
                    risk?.decision ||
                    "PASS",

                confidence:
                    Number(
                        risk?.confidence || 0
                    )
            },

            explanation:
                explanation?.summary ||
                "No explanation available.",

            cached: false
        };

        analysisCache.set(
            componentId,
            result
        );

        return result;

    } catch (error) {
        console.error(
            `Batch analysis failed for ${componentId}:`,
            error
        );

        return {
            componentId,
            success: false,
            error:
                error.message ||
                "Unknown analysis error"
        };
    }
}

// ============================================================
// CONCURRENT PROCESSOR
// ============================================================

async function processWithConcurrency(
    componentIds
) {
    const results =
        new Array(
            componentIds.length
        );

    let nextIndex = 0;

    async function worker() {
        while (true) {
            const currentIndex =
                nextIndex++;

            if (
                currentIndex >=
                componentIds.length
            ) {
                return;
            }

            const componentId =
                componentIds[currentIndex];

            console.log(
                `[Batch] ${currentIndex + 1}/${componentIds.length} → ${componentId}`
            );

            results[currentIndex] =
                await analyzeOneComponent(
                    componentId
                );
        }
    }

    const workerCount =
        Math.min(
            MAX_CONCURRENCY,
            componentIds.length
        );

    const workers = [];

    for (
        let i = 0;
        i < workerCount;
        i++
    ) {
        workers.push(
            worker()
        );
    }

    await Promise.all(
        workers
    );

    return results;
}

// ============================================================
// ANALYZE BATCH
// ============================================================

async function analyzeBatch(buffer) {
    if (!buffer || !buffer.length) {
        throw new BatchValidationError(
            "The uploaded CSV file is empty."
        );
    }

    const rows =
        await parseCSV(buffer);

    if (!rows.length) {
        throw new BatchValidationError(
            "The uploaded CSV file contains no data rows."
        );
    }

    const headers =
        Object.keys(rows[0] || {});

    const normalizedHeaders =
        headers.map((header) =>
            String(header)
                .trim()
                .toLowerCase()
        );

    if (
        !normalizedHeaders.includes(
            "component_id"
        )
    ) {
        throw new BatchValidationError(
            "Invalid CSV: required column 'component_id' is missing."
        );
    }

    const componentIds =
        rows.map(getComponentId);

    const invalidRows = [];

    rows.forEach((row, index) => {
        const componentId =
            getComponentId(row);

        if (!componentId) {
            invalidRows.push(
                index + 2
            );
        }
    });

    if (invalidRows.length > 0) {
        const preview =
            invalidRows
                .slice(0, 10)
                .join(", ");

        throw new BatchValidationError(
            `Invalid CSV: component_id is missing or blank on row(s): ${preview}${invalidRows.length > 10 ? ", ..." : ""}`
        );
    }

    const uniqueComponentIds = [
        ...new Set(componentIds)
    ];

    if (!uniqueComponentIds.length) {
        throw new BatchValidationError(
            "Invalid CSV: no valid component IDs were found."
        );
    }

    const duplicateCount =
        componentIds.length -
        uniqueComponentIds.length;

    console.log(
        `[BATCH] duplicate component rows = ${duplicateCount}`
    );

    const componentIdsForAnalysis =
        uniqueComponentIds;

    if (!componentIds.length) {
        throw new Error(
            "CSV must contain a component_id column."
        );
    }

    console.log(
        `\n[BATCH] ${rows.length} CSV rows`
    );

    console.log(
        `[BATCH] ${componentIds.length} unique components`
    );

    console.log(
        `[BATCH] concurrency = ${MAX_CONCURRENCY}`
    );

    const startTime =
        Date.now();

    const results =
        await processWithConcurrency(
            componentIdsForAnalysis
        );

    const elapsedSeconds =
        (
            (Date.now() - startTime) /
            1000
        ).toFixed(1);

    const successful =
        results.filter(
            (item) =>
                item &&
                item.success
        );

    const failed =
        results.filter(
            (item) =>
                !item ||
                !item.success
        );

    const cached =
        results.filter(
            (item) =>
                item &&
                item.cached
        );

    const decisions = {
        PASS: 0,
        MONITOR: 0,
        INVESTIGATE: 0,
        REJECT: 0
    };

    successful.forEach(
        (item) => {
            const decision =
                item.finalRisk?.decision;

            if (
                Object.prototype.hasOwnProperty.call(
                    decisions,
                    decision
                )
            ) {
                decisions[decision]++;
            }
        }
    );

    console.log(
        `[BATCH] completed in ${elapsedSeconds}s`
    );

    console.log(
        `[BATCH] successful = ${successful.length}`
    );

    console.log(
        `[BATCH] failed = ${failed.length}`
    );

    console.log(
        `[BATCH] cached = ${cached.length}`
    );

    return {
        totalRows:
            rows.length,

        totalComponents:
            componentIdsForAnalysis.length,

        processed:
            successful.length,

        failed:
            failed.length,

        cached:
            cached.length,

        processingTimeSeconds:
            Number(
                elapsedSeconds
            ),

        decisions,

        results
    };
}

// ============================================================
// CACHE CONTROL
// ============================================================

function clearAnalysisCache() {
    analysisCache.clear();

    console.log(
        "[BATCH] Analysis cache cleared."
    );
}

function getAnalysisCacheSize() {
    return analysisCache.size;
}

// ============================================================
// EXPORTS
// ============================================================

module.exports = {
    analyzeBatch,
    analyzeOneComponent,
    clearAnalysisCache,
    getAnalysisCacheSize
};
