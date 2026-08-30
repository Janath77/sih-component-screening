import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import {
    Activity,
    AlertTriangle,
    CheckCircle2,
    ChevronLeft,
    BrainCircuit,
    ShieldAlert,
    ShieldCheck,
    XCircle
} from "lucide-react";

import {
    ResponsiveContainer,
    LineChart,
    Line,
    CartesianGrid,
    XAxis,
    YAxis,
    Tooltip
} from "recharts";

import { getComponent } from "../services/api";

function ComponentDetail() {
    const { id } = useParams();

    const [component, setComponent] =
        useState(null);

    const [loading, setLoading] =
        useState(true);

    const [error, setError] =
        useState("");

    useEffect(() => {
        loadComponent();
    }, [id]);

    async function loadComponent() {
        try {
            setLoading(true);
            setError("");

            const response =
                await getComponent(id);

            setComponent(
                response.data
            );
        } catch (err) {
            console.error(
                "Component detail error:",
                err
            );

            setError(
                "Unable to load component analysis."
            );
        } finally {
            setLoading(false);
        }
    }

    if (loading) {
        return (
            <div className="screen-center">
                <div className="loader" />

                <h2>
                    Loading Component
                </h2>

                <p>
                    Running screening analysis...
                </p>
            </div>
        );
    }

    if (error || !component) {
        return (
            <div className="screen-center">

                <AlertTriangle
                    size={42}
                />

                <h2>
                    Component unavailable
                </h2>

                <p>
                    {error}
                </p>

                <Link
                    to="/batch-screening"
                    className="primary-button"
                >
                    Back to Batch Screening
                </Link>

            </div>
        );
    }

    const measurements =
        component.measurements || [];

    const moduleA =
        component.moduleA || {};

    const moduleB =
        component.moduleB || {};

    const safety =
        moduleB.safety ||
        component.safety ||
        {};

    const finalRisk =
        component.finalRisk || {};

    const explanation =
        component.explainability ||
        {};

    const chartData =
        measurements.map(
            (item) => ({
                time:
                    `${item.time_point_hours}h`,
                value:
                    Number(
                        item.measurement_value
                    )
            })
        );

    const decision =
        finalRisk.decision ||
        component.outcome ||
        "N/A";

    return (
        <div className="simple-page component-detail-page">

            {/* =================================================
                BACK
            ================================================= */}

            <Link
                to="/batch-screening"
                className="back-link"
            >
                <ChevronLeft size={16} />
                Back to Batch Screening
            </Link>

            {/* =================================================
                HEADER
            ================================================= */}

            <div className="simple-header">

                <div className="brand-mark">
                    <BrainCircuit size={24} />
                </div>

                <div>

                    <div className="eyebrow">
                        COMPONENT AI ANALYSIS
                    </div>

                    <h1>
                        {component.component_id}
                    </h1>

                    <p>
                        Detailed burn-in trajectory,
                        anomaly detection, drift
                        prediction and safety analysis.
                    </p>

                </div>

            </div>

            {/* =================================================
                IDENTITY
            ================================================= */}

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

            {/* =================================================
                FINAL DECISION
            ================================================= */}

            <section
                className={
                    `decision-banner ` +
                    getDecisionClass(
                        decision
                    )
                }
            >

                <DecisionIcon
                    decision={decision}
                />

                <div className="decision-content">

                    <span>
                        FINAL AI SCREENING DECISION
                    </span>

                    <strong>
                        {decision}
                    </strong>

                    <p>
                        Risk score:{" "}
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
                        CONFIDENCE
                    </span>

                    <strong>
                        {
                            finalRisk.confidence ??
                            "N/A"
                        }
                    </strong>

                </div>

            </section>

            {/* =================================================
                TRAJECTORY
            ================================================= */}

            <section className="detail-section">

                <div className="panel-title">

                    <div>
                        <h2>
                            Burn-In Trajectory
                        </h2>

                        <p>
                            Component behaviour across
                            0h, 24h, 96h and 168h
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
                            data={chartData}
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

                        </LineChart>
                    </ResponsiveContainer>

                </div>

            </section>

            {/* =================================================
                MEASUREMENTS
            ================================================= */}

            <section className="detail-section">

                <div className="panel-title">

                    <div>
                        <h2>
                            Burn-In Measurements
                        </h2>

                        <p>
                            Recorded screening
                            checkpoints
                        </p>
                    </div>

                    <Activity size={20} />

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

                            </div>
                        )
                    )}

                </div>

            </section>

            {/* =================================================
                AI MODULES
            ================================================= */}

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
                                anomaly detection
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
                        label="Status"
                        value={
                            moduleA.status ||
                            "N/A"
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
                                prediction
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
                                    ?.mae
                            )
                        }
                    />

                </section>

            </section>

            {/* =================================================
                SAFETY
            ================================================= */}

            <section className="detail-section">

                <div className="panel-title">

                    <div>
                        <h2>
                            Dynamic Safety Assessment
                        </h2>

                        <p>
                            Comparison against
                            healthy peer trajectory
                        </p>
                    </div>

                    <ShieldCheck size={21} />

                </div>

                <div className="result-grid">

                    <InfoCard
                        label="Safety Slope"
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
                            SAFETY STATUS
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
                            DECISION
                        </span>

                        <strong>
                            {decision}
                        </strong>
                    </div>

                </div>

            </section>

            {/* =================================================
                EXPLAINABILITY
            ================================================= */}

            <section className="detail-section">

                <div className="panel-title">

                    <div>
                        <h2>
                            Explainability
                        </h2>

                        <p>
                            Evidence supporting the
                            screening decision
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

                {explanation.explanations &&
                    explanation.explanations.length >
                        0 && (
                        <div className="explanation-list">

                            {explanation.explanations.map(
                                (
                                    item,
                                    index
                                ) => (
                                    <div
                                        className="explanation-item"
                                        key={index}
                                    >

                                        <div className="explanation-icon">

                                            {item.severity ===
                                            "CRITICAL" ? (
                                                <XCircle
                                                    size={18}
                                                />
                                            ) : item.severity ===
                                              "HIGH" ? (
                                                <AlertTriangle
                                                    size={18}
                                                />
                                            ) : (
                                                <CheckCircle2
                                                    size={18}
                                                />
                                            )}

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
                    )}

            </section>

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

function DecisionIcon({
    decision
}) {
    if (decision === "REJECT") {
        return (
            <XCircle size={36} />
        );
    }

    if (
        decision === "INVESTIGATE"
    ) {
        return (
            <AlertTriangle size={36} />
        );
    }

    if (decision === "MONITOR") {
        return (
            <AlertTriangle size={36} />
        );
    }

    return (
        <CheckCircle2 size={36} />
    );
}

function getDecisionClass(
    decision
) {
    if (decision === "REJECT") {
        return "decision-reject";
    }

    if (
        decision === "INVESTIGATE"
    ) {
        return "decision-investigate";
    }

    if (decision === "MONITOR") {
        return "decision-monitor";
    }

    return "decision-pass";
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

export default ComponentDetail;

