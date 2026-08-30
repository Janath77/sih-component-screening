function generateExplanation({
    component,
    anomaly,
    drift,
    safety,
    risk
}) {
    const explanations = [];

    // =========================================================
    // MODULE A — Dynamic anomaly explanation
    // =========================================================

    const anomalyScore =
        Number(anomaly.anomalyScore || 0);

    const zScore =
        Number(anomaly.zScore || 0);

    const componentValue =
        Number(anomaly.componentValue || 0);

    const groupMean =
        Number(anomaly.baseline?.mean || 0);

    const groupStd =
        Number(
            anomaly.baseline?.standardDeviation || 0
        );

    if (anomalyScore >= 0.85) {
        explanations.push({
            type: "ANOMALY",
            severity: "CRITICAL",
            title: "Critical dynamic anomaly",
            message:
                `The ${component.parameter_name} value of ` +
                `${componentValue.toFixed(3)} ${component.unit || "µA"} ` +
                `is significantly different from the ` +
                `${component.lot_id} / ${component.temperature_c}°C ` +
                `peer population.`
        });
    } else if (anomalyScore >= 0.70) {
        explanations.push({
            type: "ANOMALY",
            severity: "HIGH",
            title: "Significant dynamic anomaly",
            message:
                `The component deviates significantly from ` +
                `its lot-temperature peer population.`
        });
    } else if (anomalyScore >= 0.40) {
        explanations.push({
            type: "ANOMALY",
            severity: "MODERATE",
            title: "Moderate dynamic deviation",
            message:
                `The component shows a measurable deviation ` +
                `from its local peer baseline.`
        });
    } else {
        explanations.push({
            type: "ANOMALY",
            severity: "LOW",
            title: "Within peer baseline",
            message:
                `The component remains within the expected ` +
                `dynamic range of its peer population.`
        });
    }

    // Explain Z-score separately when meaningful.
    if (
        Math.abs(zScore) >= 2 &&
        groupStd > 0
    ) {
        const direction =
            zScore > 0
                ? "above"
                : "below";

        explanations.push({
            type: "BASELINE",
            severity: "HIGH",
            title: "Peer-group deviation",
            message:
                `The component is ${Math.abs(zScore).toFixed(2)}σ ` +
                `${direction} the peer-group mean ` +
                `(${groupMean.toFixed(3)}).`
        });
    }

    // =========================================================
    // MODULE B — Early drift explanation
    // =========================================================

    const earlyDriftRate =
        Number(
            drift.drift?.earlyDriftRate || 0
        );

    const predictedDriftRate =
        Number(
            drift.drift?.predictedDriftRate || 0
        );

    const predicted168h =
        Number(
            drift.prediction?.predicted168h || 0
        );

    const value24h =
        Number(
            drift.inputs?.value24h || 0
        );

    if (
        earlyDriftRate > 0
    ) {
        explanations.push({
            type: "EARLY_DRIFT",
            severity:
                earlyDriftRate > 0.05
                    ? "HIGH"
                    : "MODERATE",
            title: "Positive early drift detected",
            message:
                `The measurement increased by ` +
                `${earlyDriftRate.toFixed(4)} ` +
                `${component.unit || "µA"}/h ` +
                `between 0h and 24h.`
        });
    } else if (
        earlyDriftRate < 0
    ) {
        explanations.push({
            type: "EARLY_DRIFT",
            severity: "LOW",
            title: "Negative early drift detected",
            message:
                `The measurement decreased during the ` +
                `0h → 24h interval.`
        });
    } else {
        explanations.push({
            type: "EARLY_DRIFT",
            severity: "LOW",
            title: "Stable early measurement",
            message:
                `There is negligible change between 0h and 24h.`
        });
    }

    // =========================================================
    // SAFETY SLOPE
    // =========================================================

    const safetySlope =
        Number(
            safety.safetySlope || 0
        );

    const slopeRatio =
        Number(
            safety.slopeRatio || 0
        );

    if (
        safety.status ===
        "EXCEEDS_SAFETY_SLOPE"
    ) {
        explanations.push({
            type: "SAFETY",
            severity:
                safety.severity || "HIGH",
            title: "Safety slope exceeded",
            message:
                `The predicted future drift rate ` +
                `(${predictedDriftRate.toFixed(4)} ` +
                `${component.unit || "µA"}/h) exceeds the ` +
                `healthy-population safety slope ` +
                `(${safetySlope.toFixed(4)} ` +
                `${component.unit || "µA"}/h).`
        });

        if (slopeRatio > 1) {
            explanations.push({
                type: "SAFETY_RATIO",
                severity:
                    safety.severity || "HIGH",
                title: "Elevated trajectory risk",
                message:
                    `The predicted drift rate is ` +
                    `${slopeRatio.toFixed(2)}× the dynamic ` +
                    `healthy-population safety threshold.`
            });
        }
    } else {
        explanations.push({
            type: "SAFETY",
            severity: "LOW",
            title: "Within safety trajectory",
            message:
                `The predicted future drift remains within ` +
                `the dynamically calculated healthy-population ` +
                `safety envelope.`
        });
    }

    // =========================================================
    // PREDICTED 168h
    // =========================================================

    explanations.push({
        type: "PREDICTION",
        severity: "INFO",
        title: "168h forecast generated",
        message:
            `Using information available by 24h, the model ` +
            `forecasts a 168h value of ` +
            `${predicted168h.toFixed(3)} ` +
            `${component.unit || "µA"}.`
    });

    // =========================================================
    // FINAL DECISION EXPLANATION
    // =========================================================

    if (risk.decision === "REJECT") {
        explanations.push({
            type: "DECISION",
            severity: "CRITICAL",
            title: "Early rejection recommended",
            message:
                `The combined screening evidence indicates ` +
                `that this component should be rejected before ` +
                `completion of the full burn-in cycle.`
        });
    } else if (
        risk.decision === "INVESTIGATE"
    ) {
        explanations.push({
            type: "DECISION",
            severity: "HIGH",
            title: "Investigation recommended",
            message:
                `The component shows sufficient evidence of risk ` +
                `to require QA investigation.`
        });
    } else if (
        risk.decision === "MONITOR"
    ) {
        explanations.push({
            type: "DECISION",
            severity: "MODERATE",
            title: "Additional monitoring recommended",
            message:
                `The component is not immediately rejected, ` +
                `but its trajectory warrants additional monitoring.`
        });
    } else {
        explanations.push({
            type: "DECISION",
            severity: "LOW",
            title: "Component passes screening",
            message:
                `No significant evidence currently indicates ` +
                `that the component should be rejected.`
        });
    }

    // =========================================================
    // Summary
    // =========================================================

    const criticalCount =
        explanations.filter(
            (item) =>
                item.severity === "CRITICAL"
        ).length;

    const highCount =
        explanations.filter(
            (item) =>
                item.severity === "HIGH"
        ).length;

    let summary;

    if (risk.decision === "REJECT") {
        summary =
            "Component shows multiple indicators of elevated failure risk.";
    } else if (
        risk.decision === "INVESTIGATE"
    ) {
        summary =
            "Component requires engineering or QA investigation.";
    } else if (
        risk.decision === "MONITOR"
    ) {
        summary =
            "Component shows moderate indicators that should be monitored.";
    } else {
        summary =
            "Component remains within the current screening envelope.";
    }

    return {
        summary,

        evidence: {
            total:
                explanations.length,

            critical:
                criticalCount,

            high:
                highCount
        },

        explanations
    };
}

module.exports = {
    generateExplanation
};

