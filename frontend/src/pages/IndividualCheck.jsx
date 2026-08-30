import { useState } from "react";
import {
    Activity,
    AlertTriangle,
    CheckCircle2,
    Search,
    ShieldAlert,
    ShieldCheck,
    XCircle,
    Gauge,
    BrainCircuit
} from "lucide-react";

import {
    ResponsiveContainer,
    LineChart,
    Line,
    CartesianGrid,
    XAxis,
    YAxis,
    Tooltip,
    ReferenceLine
} from "recharts";

import { getComponent } from "../services/api";

function IndividualCheck() {
    const [componentId, setComponentId] =
        useState("");

    const [component, setComponent] =
        useState(null);

    const [loading, setLoading] =
        useState(false);

    const [error, setError] =
        useState("");

    async function handleAnalyze(event) {
        event.preventDefault();

        const id =
            componentId.trim().toUpperCase();

        if (!id) {
            setError("Enter a component ID.");
            return;
        }

        try {
            setLoading(true);
            setError("");
            setComponent(null);

            const response =
                await getComponent(id);

            setComponent(response.data);
        } catch (err) {
            console.error(err);

            setError(
                "Component not found or analysis failed."
            );
        } finally {
            setLoading(false);
        }
    }

    const measurements =
        component?.measurements || [];

    const moduleA =
        component?.moduleA || {};

    const moduleB =
        component?.moduleB || {};

    const safety =
        moduleB?.safety || {};

    const finalRisk =
        component?.finalRisk || {};

    const explanation =
        component?.explainability || {};

    const chartData =
        measurements.map((item) => ({
            time:
                `${item.time_point_hours}h`,
            value:
                Number(
                    item.measurement_value
                )
        }));

    /*
     * Add predicted 168h as a second point
     * only when it differs from / is useful
     * for visual comparison.
     */
    const predictedValue =
        Number(
            moduleB?.prediction?.predicted168h
        );

    const hasPrediction =
        Number.isFinite(predictedValue);

    const trajectoryData = [
        ...chartData
    ];

    if (
        hasPrediction &&
        chartData.length > 0
    ) {
        const actual168hExists =
            chartData.some(
                (item) =>
                    item.time === "168h"
            );

        if (actual168hExists) {
            trajectoryData.push({
                time: "AI 168h",
                value: predictedValue,
                predicted: true
            });
        }
    }

    return (
        <div className="simple-page">

            {/* =================================================
                HEADER
            ================================================= */}

            <div className="simple-header">

                <div className="brand-mark">
                    <BrainCircuit size={24} />
                </div>

                <div>
                    <div className="eyebrow">
                        EARLY SCREENING / AI ANALYSIS
                    </div>

                    <h1>
                        Individual Component
                        Screening
                    </h1>

                    <p>
                        Dynamic anomaly detection,
                        168h drift prediction and
                        explainable risk assessment.
                    </p>
                </div>

            </div>

            {/* =================================================
                SEARCH
            ================================================= */}

            <form
                className="search-panel"
                onSubmit={handleAnalyze}
            >
                <Search size={19} />

                <input
                    value={componentId}
                    onChange={(event) =>
                        setComponentId(
                            event.target.value
                        )
                    }
                    placeholder="Enter component ID — e.g. C00309"
                />

                <button
                    type="submit"
                    className="primary-button"
                    disabled={loading}
                >
                    <Search size={16} />

                    {loading
                        ? "Analyzing..."
                        : "Analyze Component"}
                </button>
            </form>

            {/* =================================================
                ERROR
            ================================================= */}

            {error && (
                <div className="error-box">
                    <AlertTriangle size={18} />
                    <span>{error}</span>
                </div>
            )}

            {/* =================================================
                RESULTS
            ================================================= */}

            {component && (
                <>

                    {/* =========================================
                        COMPONENT IDENTITY
                    ========================================= */}

                    <section className="detail-grid">

                        <InfoCard
                            label="Component"
                            value={
                                component.component_id
                            }
                        />

                        <InfoCard
                            label="Lot"
                            value={
                                component.lot_id
                            }
                        />

                        <InfoCard
                            label="Temperature"
                            value={
                                `${component.temperature_c}°C`
                            }
                        />

                        <InfoCard
                            label="Parameter"
                            value={
                                component.parameter_name
                            }
                        />

                    </section>

                    {/* =========================================
                        FINAL DECISION
                    ========================================= */}

                    <section
                        className={
                            `decision-banner ` +
                            getDecisionClass(
                                finalRisk.decision
                            )
                        }
                    >

                        <DecisionIcon
                            decision={
                                finalRisk.decision
                            }
                        />

                        <div className="decision-content">

                            <span>
                                FINAL AI SCREENING
                                DECISION
                            </span>

                            <strong>
                                {
                                    finalRisk.decision ||
                                    "N/A"
                                }
                            </strong>

                            <p>
                                Combined risk score:{" "}
                                <b>
                                    {
                                        finalRisk.riskScore ??
                                        0
                                    }
                                </b>
                            </p>

                        </div>

                        <div className="decision-side">

                            <span>
                                AI STATUS
                            </span>

                            <strong>
                                {
                                    finalRisk.decision ===
                                    "PASS"
                                        ? "WITHIN CURRENT ENVELOPE"
                                        : "REVIEW REQUIRED"
                                }
                            </strong>

                        </div>

                    </section>

                    {/* =========================================
                        TRAJECTORY
                    ========================================= */}

                    <section className="detail-section">

                        <div className="panel-title">

                            <div>
                                <h2>
                                    Burn-In Trajectory
                                </h2>

                                <p>
                                    Recorded measurements
                                    and model forecast
                                </p>
                            </div>

                            <Activity size={20} />

                        </div>

                        <div className="large-chart">

                            <ResponsiveContainer
                                width="100%"
                                height="100%"
                            >
                                <LineChart
                                    data={
                                        trajectoryData
                                    }
                                >

                                    <CartesianGrid
                                        strokeDasharray="3 3"
                                    />

                                    <XAxis
                                        dataKey="time"
                                    />

                                    <YAxis />

                                    <Tooltip />

                                    <Line
                                        type="monotone"
                                        dataKey="value"
                                        strokeWidth={3}
                                        dot
                                    />

                                    {hasPrediction && (
                                        <ReferenceLine
                                            y={
                                                predictedValue
                                            }
                                            strokeDasharray="6 6"
                                        />
                                    )}

                                </LineChart>
                            </ResponsiveContainer>

                        </div>

                        <div className="trajectory-note">
                            <span>
                                Solid line = measured data
                            </span>

                            <span>
                                AI forecast ={" "}
                                {
                                    hasPrediction
                                        ? predictedValue.toFixed(3)
                                        : "N/A"
                                }
                            </span>
                        </div>

                    </section>

                    {/* =========================================
                        MEASUREMENTS
                    ========================================= */}

                    <section className="detail-section">

                        <div className="panel-title">

                            <div>
                                <h2>
                                    Burn-In Checkpoints
                                </h2>

                                <p>
                                    Recorded values at
                                    standard screening
                                    intervals
                                </p>
                            </div>

                            <Gauge size={20} />

                        </div>

                        <div className="measurement-grid">

                            {measurements.map(
                                (measurement) => (
                                    <div
                                        className="measurement-card"
                                        key={
                                            measurement.time_point_hours
                                        }
                                    >

                                        <span>
                                            {
                                                measurement.time_point_hours
                                            }h
                                        </span>

                                        <strong>
                                            {
                                                Number(
                                                    measurement.measurement_value
                                                ).toFixed(3)
                                            }
                                        </strong>

                                        <small>
                                            {
                                                measurement.time_point_hours ===
                                                24
                                                    ? "Early checkpoint"
                                                    : measurement.time_point_hours ===
                                                      168
                                                    ? "Final checkpoint"
                                                    : "Recorded"
                                            }
                                        </small>

                                    </div>
                                )
                            )}

                        </div>

                    </section>

                    {/* =========================================
                        MODULE A + MODULE B
                    ========================================= */}

                    <section className="analysis-grid">

                        {/* MODULE A */}

                        <section className="detail-section analysis-card">

                            <div className="module-heading">

                                <div className="module-badge">
                                    A
                                </div>

                                <div>
                                    <h2>
                                        Dynamic Anomaly
                                    </h2>

                                    <p>
                                        Peer-relative
                                        screening
                                    </p>
                                </div>

                                <ShieldAlert
                                    size={21}
                                />

                            </div>

                            <MetricRow
                                label="Anomaly Score"
                                value={
                                    formatNumber(
                                        moduleA.anomalyScore
                                    )
                                }
                            />

                            <MetricRow
                                label="Z-Score"
                                value={
                                    formatNumber(
                                        moduleA.zScore
                                    )
                                }
                            />

                            <MetricRow
                                label="Robust Score"
                                value={
                                    formatNumber(
                                        moduleA.robustScore
                                    )
                                }
                            />

                            <MetricRow
                                label="Peer Mean"
                                value={
                                    formatNumber(
                                        moduleA
                                            ?.baseline
                                            ?.mean
                                    )
                                }
                            />

                            <MetricRow
                                label="Peer Population"
                                value={
                                    moduleA
                                        ?.peerGroup
                                        ?.sampleCount ||
                                    moduleA
                                        ?.sampleCount ||
                                    "N/A"
                                }
                            />

                            <StatusChip
                                label={
                                    moduleA.status ||
                                    "NORMAL"
                                }
                            />

                        </section>

                        {/* MODULE B */}

                        <section className="detail-section analysis-card">

                            <div className="module-heading">

                                <div className="module-badge module-badge-b">
                                    B
                                </div>

                                <div>
                                    <h2>
                                        Drift Predictor
                                    </h2>

                                    <p>
                                        Early 168h
                                        forecast
                                    </p>
                                </div>

                                <Activity
                                    size={21}
                                />

                            </div>

                            <MetricRow
                                label="Value 0h"
                                value={
                                    formatNumber(
                                        moduleB
                                            ?.inputs
                                            ?.value0h
                                    )
                                }
                            />

                            <MetricRow
                                label="Value 24h"
                                value={
                                    formatNumber(
                                        moduleB
                                            ?.inputs
                                            ?.value24h
                                    )
                                }
                            />

                            <MetricRow
                                label="Predicted 168h"
                                value={
                                    formatNumber(
                                        moduleB
                                            ?.prediction
                                            ?.predicted168h
                                    )
                                }
                            />

                            <MetricRow
                                label="Predicted Drift"
                                value={
                                    formatNumber(
                                        moduleB
                                            ?.drift
                                            ?.predictedDriftRate,
                                        5
                                    )
                                }
                            />

                            <MetricRow
                                label="Model MAE"
                                value={
                                    formatNumber(
                                        moduleB
                                            ?.metrics
                                            ?.mae,
                                        3
                                    )
                                }
                            />

                            <MetricRow
                                label="Test R²"
                                value={
                                    formatNumber(
                                        moduleB
                                            ?.metrics
                                            ?.r2,
                                        3
                                    )
                                }
                            />

                        </section>

                    </section>

                    {/* =========================================
                        SAFETY SLOPE
                    ========================================= */}

                    <section className="detail-section">

                        <div className="panel-title">

                            <div>
                                <h2>
                                    Dynamic Safety Slope
                                </h2>

                                <p>
                                    Healthy peer-population
                                    trajectory boundary
                                </p>
                            </div>

                            <ShieldCheck size={21} />

                        </div>

                        <div className="result-grid">

                            <InfoCard
                                label="Healthy Safety Slope"
                                value={
                                    formatNumber(
                                        safety.safetySlope,
                                        5
                                    )
                                }
                            />

                            <InfoCard
                                label="Predicted Slope"
                                value={
                                    formatNumber(
                                        safety.predictedSlope,
                                        5
                                    )
                                }
                            />

                            <InfoCard
                                label="Slope Ratio"
                                value={
                                    formatNumber(
                                        safety.slopeRatio,
                                        3
                                    )
                                }
                            />

                            <InfoCard
                                label="Severity"
                                value={
                                    safety.severity ||
                                    "LOW"
                                }
                            />

                        </div>

                        <div className="safety-status-row">

                            <div>
                                <span>
                                    SAFETY ASSESSMENT
                                </span>

                                <strong>
                                    {
                                        safety.status ||
                                        "N/A"
                                    }
                                </strong>
                            </div>

                            <div>
                                <span>
                                    HEALTHY PEERS
                                </span>

                                <strong>
                                    {
                                        safety.peerSampleCount ||
                                        "N/A"
                                    }
                                </strong>
                            </div>

                        </div>

                    </section>

                    {/* =========================================
                        EXPLAINABILITY
                    ========================================= */}

                    <section className="detail-section">

                        <div className="panel-title">

                            <div>
                                <h2>
                                    AI Explainability
                                </h2>

                                <p>
                                    Why the screening
                                    engine reached its
                                    conclusion
                                </p>
                            </div>

                            <BrainCircuit size={21} />

                        </div>

                        <div className="summary-box">

                            <strong>
                                AI Assessment
                            </strong>

                            <p>
                                {
                                    explanation.summary ||
                                    "No explanation available."
                                }
                            </p>

                        </div>

                        <div className="explanation-list">

                            {(
                                explanation.explanations ||
                                []
                            ).map(
                                (item, index) => (
                                    <div
                                        className={
                                            `explanation-item ` +
                                            getExplanationClass(
                                                item.severity
                                            )
                                        }
                                        key={index}
                                    >

                                        <div className="explanation-icon">
                                            {
                                                getExplanationIcon(
                                                    item.severity
                                                )
                                            }
                                        </div>

                                        <div>

                                            <div className="explanation-heading">

                                                <strong>
                                                    {
                                                        item.title
                                                    }
                                                </strong>

                                                <span>
                                                    {
                                                        item.severity
                                                    }
                                                </span>

                                            </div>

                                            <p>
                                                {
                                                    item.message
                                                }
                                            </p>

                                        </div>

                                    </div>
                                )
                            )}

                        </div>

                    </section>

                    {/* =========================================
                        JUDGE SUMMARY
                    ========================================= */}

                    <section className="judge-summary">

                        <div>
                            <span>
                                SCREENING SUMMARY
                            </span>

                            <h2>
                                {
                                    getJudgeHeadline(
                                        finalRisk.decision
                                    )
                                }
                            </h2>

                            <p>
                                Decision is based on
                                peer-relative anomaly
                                evidence, early
                                trajectory behaviour
                                and predicted future
                                drift.
                            </p>
                        </div>

                        <div className="judge-summary-badge">
                            {
                                finalRisk.decision ||
                                "N/A"
                            }
                        </div>

                    </section>

                </>
            )}

        </div>
    );
}

function InfoCard({
    label,
    value
}) {
    return (
        <div className="detail-card">
            <span>
                {label}
            </span>

            <strong>
                {value ?? "N/A"}
            </strong>
        </div>
    );
}

function MetricRow({
    label,
    value
}) {
    return (
        <div className="population-row">

            <span>
                {label}
            </span>

            <strong>
                {value ?? "N/A"}
            </strong>

        </div>
    );
}

function StatusChip({
    label
}) {
    return (
        <div className="result-status">

            <span>
                Detection Status
            </span>

            <strong>
                {label}
            </strong>

        </div>
    );
}

function DecisionIcon({
    decision
}) {
    if (
        decision === "REJECT"
    ) {
        return (
            <XCircle size={36} />
        );
    }

    if (
        decision === "INVESTIGATE"
    ) {
        return (
            <AlertTriangle
                size={36}
            />
        );
    }

    if (
        decision === "MONITOR"
    ) {
        return (
            <AlertTriangle
                size={36}
            />
        );
    }

    return (
        <CheckCircle2
            size={36}
        />
    );
}

function getDecisionClass(decision) {
    switch (decision) {
        case "REJECT":
            return "decision-reject";

        case "INVESTIGATE":
            return "decision-investigate";

        case "MONITOR":
            return "decision-monitor";

        default:
            return "decision-pass";
    }
}

function getExplanationClass(
    severity
) {
    switch (severity) {
        case "CRITICAL":
            return "explanation-critical";

        case "HIGH":
            return "explanation-high";

        case "MODERATE":
            return "explanation-moderate";

        default:
            return "explanation-low";
    }
}

function getExplanationIcon(
    severity
) {
    if (severity === "CRITICAL") {
        return (
            <XCircle size={18} />
        );
    }

    if (severity === "HIGH") {
        return (
            <AlertTriangle
                size={18}
            />
        );
    }

    return (
        <CheckCircle2 size={18} />
    );
}

function formatNumber(
    value,
    decimals = 3
) {
    const number =
        Number(value);

    if (!Number.isFinite(number)) {
        return "N/A";
    }

    return number.toFixed(
        decimals
    );
}

function getJudgeHeadline(
    decision
) {
    switch (decision) {
        case "REJECT":
            return "Early rejection recommended";

        case "INVESTIGATE":
            return "Engineering investigation recommended";

        case "MONITOR":
            return "Continue enhanced monitoring";

        default:
            return "Component remains within the current screening envelope";
    }
}

export default IndividualCheck;