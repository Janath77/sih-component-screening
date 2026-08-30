import { useEffect, useMemo, useState } from "react";
import {
    Activity,
    AlertTriangle,
    BarChart3,
    CheckCircle2,
    Database,
    FileSearch,
    Layers3,
    ShieldAlert,
    Upload,
    XCircle
} from "lucide-react";

import {
    ResponsiveContainer,
    PieChart,
    Pie,
    Cell,
    Tooltip,
    BarChart,
    Bar,
    CartesianGrid,
    XAxis,
    YAxis
} from "recharts";

import { Link } from "react-router-dom";

import {
    getDashboard,
    getAnalytics
} from "../services/api";

const OUTCOME_COLORS = {
    Pass: "#4bd99a",
    Monitor: "#f0bd57",
    Investigate: "#ff9672",
    Fail: "#ff606d"
};

function Dashboard() {
    const [dashboard, setDashboard] =
        useState(null);

    const [analytics, setAnalytics] =
        useState(null);

    const [loading, setLoading] =
        useState(true);

    const [error, setError] =
        useState("");

    useEffect(() => {
        loadDashboard();
    }, []);

    async function loadDashboard() {
        try {
            setLoading(true);
            setError("");

            const [
                dashboardResponse,
                analyticsResponse
            ] = await Promise.all([
                getDashboard(),
                getAnalytics()
            ]);

            setDashboard(
                dashboardResponse.data
            );

            setAnalytics(
                analyticsResponse.data
            );
        } catch (err) {
            console.error(
                "Dashboard error:",
                err
            );

            setError(
                "Unable to load dashboard data."
            );
        } finally {
            setLoading(false);
        }
    }

    const outcomeMap = useMemo(() => {
        const map = {};

        (
            dashboard?.outcomes || []
        ).forEach((item) => {
            map[
                String(item.outcome)
                    .toLowerCase()
            ] = Number(
                item.count || 0
            );
        });

        return map;
    }, [dashboard]);

    const total =
        Number(
            dashboard?.totalComponents || 0
        );

    const pass =
        outcomeMap.pass || 0;

    const monitor =
        outcomeMap.monitor || 0;

    const investigate =
        outcomeMap.investigate || 0;

    const fail =
        outcomeMap.fail || 0;

    const outcomeData = [
        {
            name: "Pass",
            count: pass
        },
        {
            name: "Monitor",
            count: monitor
        },
        {
            name: "Investigate",
            count: investigate
        },
        {
            name: "Fail",
            count: fail
        }
    ];

    const lotTemperatureData =
        (
            analytics?.lotTemperatureGroups ||
            []
        ).map((item) => ({
            name:
                `${item.lotId} / ${item.temperatureC}°C`,
            value:
                Number(
                    item.average168h || 0
                )
        }));

    const behaviorData =
        (
            dashboard?.behaviorClasses ||
            []
        ).map((item) => ({
            name:
                formatLabel(
                    item.behavior
                ),
            count:
                Number(
                    item.count || 0
                )
        }));

    if (loading) {
        return (
            <div className="screen-center">
                <div className="loader" />

                <h2>
                    Loading dashboard
                </h2>

                <p>
                    Reading screening population...
                </p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="screen-center">

                <AlertTriangle size={40} />

                <h2>
                    Dashboard unavailable
                </h2>

                <p>
                    {error}
                </p>

                <button
                    className="primary-button"
                    onClick={loadDashboard}
                >
                    Retry
                </button>

            </div>
        );
    }

    return (
        <div className="simple-page dashboard-page">

            {/* =================================================
                HEADER
            ================================================= */}

            <div className="simple-header dashboard-header">

                <div className="brand-mark">
                    <ShieldAlert size={23} />
                </div>

                <div>

                    <div className="eyebrow">
                        SPACE / HIGH-RELIABILITY
                    </div>

                    <h1>
                        Burn-In & Screening Intelligence
                    </h1>

                    <p>
                        AI-driven anomaly detection,
                        predictive component screening
                        and explainable risk analysis.
                    </p>

                </div>

                <button
                    className="refresh-button"
                    onClick={loadDashboard}
                >
                    <Activity size={15} />
                    Refresh
                </button>

            </div>

            {/* =================================================
                KPI CARDS
            ================================================= */}

            <section className="stats-grid">

                <StatCard
                    label="TOTAL COMPONENTS"
                    value={total}
                    icon={
                        <Layers3 size={19} />
                    }
                />

                <StatCard
                    label="PASS"
                    value={pass}
                    icon={
                        <CheckCircle2 size={19} />
                    }
                    type="success"
                />

                <StatCard
                    label="MONITOR"
                    value={monitor}
                    icon={
                        <AlertTriangle size={19} />
                    }
                    type="warning"
                />

                <StatCard
                    label="INVESTIGATE"
                    value={investigate}
                    icon={
                        <ShieldAlert size={19} />
                    }
                    type="danger"
                />

                <StatCard
                    label="FAIL"
                    value={fail}
                    icon={
                        <XCircle size={19} />
                    }
                    type="critical"
                />

            </section>

            {/* =================================================
                MAIN ANALYTICS
            ================================================= */}

            <section className="content-grid">

                {/* OUTCOME */}

                <div className="panel">

                    <div className="panel-title">

                        <div>
                            <h2>
                                Screening Outcome
                            </h2>

                            <p>
                                Current population
                                distribution
                            </p>
                        </div>

                        <BarChart3 size={19} />

                    </div>

                    <div className="pie-wrapper">

                        <ResponsiveContainer
                            width="100%"
                            height="100%"
                        >
                            <PieChart>

                                <Pie
                                    data={outcomeData}
                                    dataKey="count"
                                    nameKey="name"
                                    innerRadius={74}
                                    outerRadius={108}
                                    paddingAngle={3}
                                    stroke="#0b1422"
                                    strokeWidth={3}
                                >

                                    {outcomeData.map(
                                        (item) => (
                                            <Cell
                                                key={
                                                    item.name
                                                }
                                                fill={
                                                    OUTCOME_COLORS[
                                                        item.name
                                                    ]
                                                }
                                            />
                                        )
                                    )}

                                </Pie>

                                <Tooltip
                                    contentStyle={{
                                        background:
                                            "#111d2f",
                                        border:
                                            "1px solid #2b3b55",
                                        borderRadius:
                                            "10px",
                                        color:
                                            "#eef3ff"
                                    }}
                                />

                            </PieChart>
                        </ResponsiveContainer>

                        <div className="pie-center">
                            <strong>
                                {total}
                            </strong>

                            <span>
                                Components
                            </span>
                        </div>

                    </div>

                    <div className="legend">

                        {outcomeData.map(
                            (item) => (
                                <div
                                    className="legend-row"
                                    key={
                                        item.name
                                    }
                                >
                                    <span>
                                        {item.name}
                                    </span>

                                    <strong
                                        style={{
                                            color:
                                                OUTCOME_COLORS[
                                                    item.name
                                                ]
                                        }}
                                    >
                                        {item.count}
                                    </strong>
                                </div>
                            )
                        )}

                    </div>

                </div>

                {/* POPULATION */}

                <div className="panel">

                    <div className="panel-title">

                        <div>
                            <h2>
                                Population Snapshot
                            </h2>

                            <p>
                                Screening
                                configuration
                            </p>
                        </div>

                        <Database size={19} />

                    </div>

                    <div className="population-row">
                        <span>
                            Screening Lots
                        </span>

                        <strong>
                            {
                                dashboard?.lots
                                    ?.length || 0
                            }
                        </strong>
                    </div>

                    <div className="population-row">
                        <span>
                            Lot × Temperature
                        </span>

                        <strong>
                            {
                                analytics
                                    ?.lotTemperatureGroups
                                    ?.length || 0
                            }
                        </strong>
                    </div>

                    <div className="section-label">
                        BEHAVIOR CLASSES
                    </div>

                    <div className="behavior-list">

                        {behaviorData.map(
                            (item) => (
                                <div
                                    className="behavior-row"
                                    key={
                                        item.name
                                    }
                                >
                                    <span>
                                        {item.name}
                                    </span>

                                    <strong>
                                        {item.count}
                                    </strong>
                                </div>
                            )
                        )}

                    </div>

                </div>

            </section>

            {/* =================================================
                LOT / TEMP
            ================================================= */}

            <section className="panel dashboard-wide-panel">

                <div className="panel-title">

                    <div>
                        <h2>
                            Lot × Temperature Analysis
                        </h2>

                        <p>
                            Average 168h measurement
                            by screening population
                        </p>
                    </div>

                    <Activity size={19} />

                </div>

                <div className="large-chart">

                    <ResponsiveContainer
                        width="100%"
                        height="100%"
                    >
                        <BarChart
                            data={
                                lotTemperatureData
                            }
                            margin={{
                                top: 10,
                                right: 10,
                                left: 0,
                                bottom: 4
                            }}
                        >

                            <CartesianGrid
                                stroke="#24334a"
                                strokeDasharray="3 3"
                            />

                            <XAxis
                                dataKey="name"
                                tick={{
                                    fill: "#7487a2",
                                    fontSize: 10
                                }}
                                axisLine={{
                                    stroke: "#2a3952"
                                }}
                                tickLine={false}
                            />

                            <YAxis
                                tick={{
                                    fill: "#7487a2",
                                    fontSize: 10
                                }}
                                axisLine={false}
                                tickLine={false}
                            />

                            <Tooltip
                                contentStyle={{
                                    background:
                                        "#111d2f",
                                    border:
                                        "1px solid #2b3b55",
                                    borderRadius:
                                        "10px"
                                }}
                            />

                            <Bar
                                dataKey="value"
                                fill="#6878ff"
                                radius={[
                                    7,
                                    7,
                                    0,
                                    0
                                ]}
                                maxBarSize={55}
                            />

                        </BarChart>
                    </ResponsiveContainer>

                </div>

            </section>

            {/* =================================================
                QUICK ACTIONS
            ================================================= */}

            <section className="quick-grid">

                <Link
                    to="/individual-check"
                    className="quick-card"
                >
                    <div className="quick-icon">
                        <FileSearch size={19} />
                    </div>

                    <div>
                        <strong>
                            Individual Check
                        </strong>

                        <span>
                            Analyze one component.
                        </span>
                    </div>
                </Link>

                <Link
                    to="/batch-screening"
                    className="quick-card"
                >
                    <div className="quick-icon">
                        <Upload size={19} />
                    </div>

                    <div>
                        <strong>
                            Batch Screening
                        </strong>

                        <span>
                            Upload and screen a CSV.
                        </span>
                    </div>
                </Link>

                <Link
                    to="/analytics"
                    className="quick-card"
                >
                    <div className="quick-icon">
                        <BarChart3 size={19} />
                    </div>

                    <div>
                        <strong>
                            Advanced Analytics
                        </strong>

                        <span>
                            Explore screening trends.
                        </span>
                    </div>
                </Link>

            </section>

        </div>
    );
}

function StatCard({
    label,
    value,
    icon,
    type = ""
}) {
    return (
        <div
            className={
                `stat-card ${type}`
            }
        >

            <div className="stat-icon">
                {icon}
            </div>

            <span className="stat-label">
                {label}
            </span>

            <strong className="stat-number">
                {Number(
                    value || 0
                ).toLocaleString()}
            </strong>

        </div>
    );
}

function formatLabel(value) {
    if (!value) {
        return "Unknown";
    }

    return String(value)
        .replaceAll("_", " ")
        .replace(
            /\b\w/g,
            (char) =>
                char.toUpperCase()
        );
}

export default Dashboard;