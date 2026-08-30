import { useEffect, useMemo, useState } from "react";
import {
    Activity,
    BarChart3,
    Database,
    Layers3,
    ShieldAlert,
    TrendingUp
} from "lucide-react";

import {
    ResponsiveContainer,
    BarChart,
    Bar,
    CartesianGrid,
    XAxis,
    YAxis,
    Tooltip,
    Legend,
    PieChart,
    Pie,
    Cell
} from "recharts";

import {
    getDashboard,
    getAnalytics
} from "../services/api";

const OUTCOME_COLORS = {
    Pass: "#49d99a",
    Monitor: "#f0bd57",
    Investigate: "#ff956f",
    Fail: "#ff5f6d"
};

function Analytics() {
    const [dashboard, setDashboard] = useState(null);
    const [analytics, setAnalytics] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        loadAnalytics();
    }, []);

    async function loadAnalytics() {
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
            console.error(err);

            setError(
                "Unable to load analytics. Make sure the backend is running."
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
                String(item.outcome).toLowerCase()
            ] = Number(item.count || 0);
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

    const atRisk =
        monitor +
        investigate +
        fail;

    const passRate =
        total > 0
            ? (pass / total) * 100
            : 0;

    const riskRate =
        total > 0
            ? (atRisk / total) * 100
            : 0;

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
            analytics?.lotTemperatureGroups || []
        ).map((item) => ({
            name:
                `${item.lotId} / ${item.temperatureC}°C`,
            value:
                Number(
                    item.average168h || 0
                ),
            count:
                Number(
                    item.componentCount || 0
                )
        }));

    const behaviorData =
        (
            dashboard?.behaviorClasses || []
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
                <h2>Loading Analytics</h2>
                <p>
                    Reading population data...
                </p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="screen-center">
                <ShieldAlert size={45} />

                <h2>
                    Analytics unavailable
                </h2>

                <p>
                    {error}
                </p>

                <button
                    className="primary-button"
                    onClick={loadAnalytics}
                >
                    Retry
                </button>
            </div>
        );
    }

    return (
        <div className="simple-page analytics-page">

            <div className="simple-header">

                <div className="brand-mark">
                    <BarChart3 size={24} />
                </div>

                <div>
                    <div className="eyebrow">
                        POPULATION ANALYTICS
                    </div>

                    <h1>
                        Screening Analytics
                    </h1>

                    <p>
                        Explore outcome distribution,
                        peer populations, behavior
                        classes and 168h measurements.
                    </p>
                </div>

                <button
                    className="refresh-button analytics-refresh"
                    onClick={loadAnalytics}
                >
                    <Activity size={16} />
                    Refresh
                </button>

            </div>

            <section className="analytics-kpi-grid">

                <AnalyticsCard
                    icon={<Layers3 size={20} />}
                    label="TOTAL COMPONENTS"
                    value={total}
                    note="Screening population"
                />

                <AnalyticsCard
                    icon={<TrendingUp size={20} />}
                    label="PASS RATE"
                    value={`${passRate.toFixed(1)}%`}
                    note={`${pass} components`}
                    type="success"
                />

                <AnalyticsCard
                    icon={<ShieldAlert size={20} />}
                    label="AT-RISK RATE"
                    value={`${riskRate.toFixed(1)}%`}
                    note={`${atRisk} components`}
                    type="danger"
                />

                <AnalyticsCard
                    icon={<Database size={20} />}
                    label="LOTS"
                    value={
                        dashboard?.lots?.length || 0
                    }
                    note="Distinct screening lots"
                />

            </section>

            <section className="analytics-grid">

                <div className="panel">

                    <div className="panel-title">

                        <div>
                            <h2>
                                Outcome Distribution
                            </h2>

                            <p>
                                Recorded component
                                outcome distribution
                            </p>
                        </div>

                        <BarChart3 size={20} />

                    </div>

                    <div className="analytics-chart">

                        <ResponsiveContainer
                            width="100%"
                            height="100%"
                        >
                            <BarChart
                                data={outcomeData}
                            >
                                <CartesianGrid
                                    stroke="#213049"
                                    strokeDasharray="3 3"
                                />

                                <XAxis
                                    dataKey="name"
                                    tick={{
                                        fill: "#7e91aa"
                                    }}
                                    axisLine={{
                                        stroke: "#273750"
                                    }}
                                    tickLine={false}
                                />

                                <YAxis
                                    tick={{
                                        fill: "#7e91aa"
                                    }}
                                    axisLine={false}
                                    tickLine={false}
                                />

                                <Tooltip
                                    contentStyle={{
                                        background:
                                            "#101c2d",
                                        border:
                                            "1px solid #2b3b55",
                                        borderRadius:
                                            "10px",
                                        color: "#eaf1ff"
                                    }}
                                />

                                <Bar
                                    dataKey="count"
                                    radius={[
                                        6,
                                        6,
                                        0,
                                        0
                                    ]}
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
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>

                    </div>

                </div>

                <div className="panel">

                    <div className="panel-title">

                        <div>
                            <h2>
                                Screening Profile
                            </h2>

                            <p>
                                Population outcome mix
                            </p>
                        </div>

                        <Activity size={20} />

                    </div>

                    <div className="analytics-pie">

                        <ResponsiveContainer
                            width="100%"
                            height="100%"
                        >
                            <PieChart>

                                <Pie
                                    data={outcomeData}
                                    dataKey="count"
                                    nameKey="name"
                                    innerRadius={62}
                                    outerRadius={103}
                                    paddingAngle={3}
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
                                            "#101c2d",
                                        border:
                                            "1px solid #2b3b55",
                                        borderRadius:
                                            "10px"
                                    }}
                                />

                                <Legend
                                    wrapperStyle={{
                                        color: "#8fa2bb",
                                        fontSize: "11px"
                                    }}
                                />

                            </PieChart>
                        </ResponsiveContainer>

                    </div>

                </div>

            </section>

            <section className="panel">

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

                    <Activity size={20} />

                </div>

                <div className="analytics-chart analytics-chart-tall">

                    <ResponsiveContainer
                        width="100%"
                        height="100%"
                    >
                        <BarChart
                            data={lotTemperatureData}
                        >
                            <CartesianGrid
                                stroke="#213049"
                                strokeDasharray="3 3"
                            />

                            <XAxis
                                dataKey="name"
                                tick={{
                                    fill: "#7e91aa",
                                    fontSize: 10
                                }}
                                axisLine={{
                                    stroke: "#273750"
                                }}
                                tickLine={false}
                            />

                            <YAxis
                                tick={{
                                    fill: "#7e91aa"
                                }}
                                axisLine={false}
                                tickLine={false}
                            />

                            <Tooltip
                                contentStyle={{
                                    background:
                                        "#101c2d",
                                    border:
                                        "1px solid #2b3b55",
                                    borderRadius:
                                        "10px"
                                }}
                            />

                            <Bar
                                dataKey="value"
                                name="Average 168h"
                                fill="#6473ff"
                                radius={[
                                    6,
                                    6,
                                    0,
                                    0
                                ]}
                            />

                        </BarChart>
                    </ResponsiveContainer>

                </div>

                <div className="population-analysis-grid">

                    {lotTemperatureData.map(
                        (item) => (
                            <div
                                className="population-analysis-card"
                                key={item.name}
                            >
                                <span>
                                    {item.name}
                                </span>

                                <strong>
                                    {item.value.toFixed(
                                        3
                                    )}
                                </strong>

                                <small>
                                    {item.count} components
                                </small>
                            </div>
                        )
                    )}

                </div>

            </section>

            <section className="panel">

                <div className="panel-title">

                    <div>
                        <h2>
                            Behavioral Classification
                        </h2>

                        <p>
                            Component behavior classes
                        </p>
                    </div>

                    <ShieldAlert size={20} />

                </div>

                <div className="analytics-chart analytics-chart-tall">

                    <ResponsiveContainer
                        width="100%"
                        height="100%"
                    >
                        <BarChart
                            data={behaviorData}
                            layout="vertical"
                            margin={{
                                left: 25,
                                right: 20
                            }}
                        >

                            <CartesianGrid
                                stroke="#213049"
                                strokeDasharray="3 3"
                            />

                            <XAxis
                                type="number"
                                tick={{
                                    fill: "#7e91aa"
                                }}
                                axisLine={false}
                                tickLine={false}
                            />

                            <YAxis
                                type="category"
                                dataKey="name"
                                width={125}
                                tick={{
                                    fill: "#7e91aa",
                                    fontSize: 10
                                }}
                                axisLine={false}
                                tickLine={false}
                            />

                            <Tooltip
                                contentStyle={{
                                    background:
                                        "#101c2d",
                                    border:
                                        "1px solid #2b3b55",
                                    borderRadius:
                                        "10px"
                                }}
                            />

                            <Bar
                                dataKey="count"
                                fill="#7a66ff"
                                radius={[
                                    0,
                                    6,
                                    6,
                                    0
                                ]}
                            />

                        </BarChart>
                    </ResponsiveContainer>

                </div>

            </section>

            <section className="analytics-insight">

                <div className="analytics-insight-icon">
                    <ShieldAlert size={23} />
                </div>

                <div>

                    <span>
                        SYSTEM INTERPRETATION
                    </span>

                    <h2>
                        {
                            getInterpretation(
                                passRate,
                                riskRate,
                                investigate,
                                fail
                            )
                        }
                    </h2>

                    <p>
                        Population analytics summarize
                        the recorded dataset. For a
                        component-level AI decision,
                        use Individual Check or Batch
                        Screening.
                    </p>

                </div>

            </section>

        </div>
    );
}

function AnalyticsCard({
    icon,
    label,
    value,
    note,
    type = ""
}) {
    return (
        <div
            className={
                `analytics-kpi-card ${type}`
            }
        >
            <div className="analytics-kpi-icon">
                {icon}
            </div>

            <span>
                {label}
            </span>

            <strong>
                {value}
            </strong>

            <small>
                {note}
            </small>
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

function getInterpretation(
    passRate,
    riskRate,
    investigate,
    fail
) {
    if (fail > investigate) {
        return "The population contains a significant number of failed components.";
    }

    if (riskRate >= 30) {
        return "A substantial portion of the population requires additional screening attention.";
    }

    if (passRate >= 70) {
        return "Most components remain within the recorded screening outcome population.";
    }

    return "The population shows a mixed screening profile requiring closer analysis.";
}

export default Analytics;
