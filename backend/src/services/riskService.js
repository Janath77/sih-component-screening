function calculateFinalRisk({
    anomaly,
    drift,
    safety
}) {
    let decision = "PASS";

    let riskScore = 0;

    const reasons = [];

    // --------------------------------------------------
    // Module A contribution
    // --------------------------------------------------

    if (anomaly.anomalyScore >= 0.85) {
        riskScore += 50;

        reasons.push(
            "Dynamic anomaly score is critically high."
        );
    } else if (anomaly.anomalyScore >= 0.70) {
        riskScore += 35;

        reasons.push(
            "Component is a significant outlier within its peer group."
        );
    } else if (anomaly.anomalyScore >= 0.40) {
        riskScore += 20;

        reasons.push(
            "Component shows moderate deviation from its peer baseline."
        );
    }

    // --------------------------------------------------
    // Safety-slope contribution
    // --------------------------------------------------

    if (
        safety.status ===
        "EXCEEDS_SAFETY_SLOPE"
    ) {
        if (safety.severity === "CRITICAL") {
            riskScore += 50;
        } else if (safety.severity === "HIGH") {
            riskScore += 40;
        } else {
            riskScore += 25;
        }

        reasons.push(
            "Predicted 168h drift exceeds the dynamic safety slope."
        );
    }

    // --------------------------------------------------
    // Prediction contribution
    // --------------------------------------------------

    if (
        drift.prediction.predictionError !== null &&
        drift.prediction.predictionError > 10
    ) {
        reasons.push(
            "Historical prediction error is relatively high; confidence should be reduced."
        );
    }

    // --------------------------------------------------
    // Final classification
    // --------------------------------------------------

    if (riskScore >= 75) {
        decision = "REJECT";
    } else if (riskScore >= 50) {
        decision = "INVESTIGATE";
    } else if (riskScore >= 25) {
        decision = "MONITOR";
    } else {
        decision = "PASS";
    }

    // --------------------------------------------------
    // Confidence
    // --------------------------------------------------

    let confidence = 1 - (
        riskScore / 100
    );

    confidence = Math.max(
        0,
        Math.min(
            1,
            confidence
        )
    );

    return {
        riskScore,
        decision,
        confidence,
        reasons
    };
}

module.exports = {
    calculateFinalRisk
};

