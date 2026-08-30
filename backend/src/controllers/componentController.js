const {
    getAllComponents,
    getComponentById
} = require("../services/componentService");

const {
    calculateDynamicAnomaly
} = require("../services/anomalyService");

const {
    predictComponent168h
} = require("../services/driftService");

const {
    evaluateSafetySlope
} = require("../services/safetyService");

const {
    calculateFinalRisk
} = require("../services/riskService");

const {
    generateExplanation
} = require("../services/explanationService");

async function fetchAllComponents(req, res) {
    try {
        const components =
            await getAllComponents();

        res.json({
            success: true,
            count: components.length,
            data: components
        });

    } catch (error) {
        console.error(
            "Error fetching components:",
            error
        );

        res.status(500).json({
            success: false,
            message:
                "Failed to fetch components",
            error:
                error.message
        });
    }
}

async function fetchComponent(req, res) {
    try {
        const { id } = req.params;

        // =====================================================
        // COMPONENT
        // =====================================================

        const component =
            await getComponentById(id);

        if (!component) {
            return res.status(404).json({
                success: false,
                message:
                    `Component ${id} not found`
            });
        }

        // =====================================================
        // MODULE A
        // Dynamic anomaly detection
        // =====================================================

        const anomaly =
            await calculateDynamicAnomaly(
                component
            );

        // =====================================================
        // MODULE B
        // Predict 168h from early data
        // =====================================================

        const drift =
            await predictComponent168h(id);

        // =====================================================
        // SAFETY SLOPE
        // =====================================================

        const safety =
            await evaluateSafetySlope({
                lotId:
                    drift.peerPopulation.lotId,

                temperatureC:
                    drift.peerPopulation.temperatureC,

                value24h:
                    drift.inputs.value24h,

                predicted168h:
                    drift.prediction
                        .predicted168h
            });

        // =====================================================
        // FINAL RISK
        // =====================================================

        const risk =
            calculateFinalRisk({
                anomaly,
                drift,
                safety
            });

        // =====================================================
        // EXPLAINABILITY
        // =====================================================

        const explanation =
            generateExplanation({
                component,
                anomaly,
                drift,
                safety,
                risk
            });

        // =====================================================
        // RESPONSE
        // =====================================================

        res.json({
            success: true,

            data: {
                ...component,

                moduleA:
                    anomaly,

                moduleB: {
                    ...drift,
                    safety
                },

                finalRisk:
                    risk,

                explainability:
                    explanation
            }
        });

    } catch (error) {
        console.error(
            "Error analyzing component:",
            error
        );

        res.status(500).json({
            success: false,
            message:
                "Failed to analyze component",
            error:
                error.message
        });
    }
}

module.exports = {
    fetchAllComponents,
    fetchComponent
};

