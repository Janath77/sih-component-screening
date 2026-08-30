import { useMemo, useState } from "react";
import {
    AlertTriangle,
    CheckCircle2,
    ChevronDown,
    FileSpreadsheet,
    Search,
    ShieldAlert,
    Upload,
    XCircle
} from "lucide-react";

function BatchUpload() {
    const [file, setFile] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [results, setResults] = useState(null);
    const [search, setSearch] = useState("");
    const [filter, setFilter] = useState("ALL");

    function handleFileChange(event) {
        if (loading) {
            return;
        }

        const selectedFile =
            event.target.files &&
            event.target.files[0]
                ? event.target.files[0]
                : null;

        setError("");
        setResults(null);

        if (!selectedFile) {
            setFile(null);
            return;
        }

        const isCSV =
            selectedFile.name
                .toLowerCase()
                .endsWith(".csv");

        if (!isCSV) {
            setError(
                "Please select a CSV file."
            );
            setFile(null);
            return;
        }

        if (selectedFile.size === 0) {
            setError(
                "The selected CSV file is empty."
            );
            setFile(null);
            return;
        }

        if (
            selectedFile.size >
            10 * 1024 * 1024
        ) {
            setError(
                "The CSV file is larger than the 10 MB limit."
            );
            setFile(null);
            return;
        }

        setFile(selectedFile);
    }

    async function handleUpload() {
        if (loading) {
            return;
        }

        if (!file) {
            setError(
                "Please select a CSV file first."
            );
            return;
        }

        try {
            setLoading(true);
            setError("");
            setResults(null);

            const formData = new FormData();

            formData.append(
                "file",
                file
            );

            const response =
                await fetch(
                    "http://localhost:5000/api/batch-screening/screen",
                    {
                        method: "POST",
                        body: formData
                    }
                );

            let data;

            try {
                data =
                    await response.json();
            } catch {
                throw new Error(
                    "The server returned an invalid response."
                );
            }

            if (!response.ok) {
                throw new Error(
                    data.message ||
                    data.error ||
                    "Batch screening failed."
                );
            }

            if (
                !data.data ||
                !Array.isArray(
                    data.data.results
                )
            ) {
                throw new Error(
                    "The server returned an incomplete screening result."
                );
            }

            setResults(
                data.data
            );

        } catch (err) {
            console.error(
                "Batch screening error:",
                err
            );

            setError(
                err.message ||
                "Unable to complete batch screening."
            );
        } finally {
            setLoading(false);
        }
    }

    const allResults =
        results?.results || [];

    const filteredResults =
        useMemo(() => {
            const query =
                search
                    .trim()
                    .toLowerCase();

            return allResults.filter(
                (item) => {
                    const componentId =
                        String(
                            item.componentId ||
                            ""
                        ).toLowerCase();

                    const lotId =
                        String(
                            item.lotId ||
                            ""
                        ).toLowerCase();

                    const decision =
                        String(
                            item.finalRisk
                                ?.decision ||
                            ""
                        );

                    const matchesSearch =
                        query === "" ||
                        componentId.includes(
                            query
                        ) ||
                        lotId.includes(
                            query
                        );

                    const matchesFilter =
                        filter === "ALL" ||
                        decision === filter;

                    return (
                        matchesSearch &&
                        matchesFilter
                    );
                }
            );
        }, [
            allResults,
            search,
            filter
        ]);

    return (
        <div className="simple-page batch-page">

            <div className="simple-header">

                <div className="brand-mark">
                    <Upload size={24} />
                </div>

                <div>
                    <div className="eyebrow">
                        POPULATION SCREENING
                    </div>

                    <h1>
                        Batch Component Screening
                    </h1>

                    <p>
                        Upload a CSV and run the
                        complete AI screening pipeline.
                    </p>
                </div>

            </div>

            <section className="upload-panel">

                <div className="upload-icon-large">
                    <FileSpreadsheet size={40} />
                </div>

                <h2>
                    Upload Screening Dataset
                </h2>

                <p>
                    Select a CSV containing
                    component IDs.
                </p>

                <label
                    className={
                        `upload-dropzone ${
                            loading
                                ? "upload-disabled"
                                : ""
                        }`
                    }
                >
                    {loading ? (
                        <div className="upload-processing-icon">
                            <span className="button-spinner" />
                        </div>
                    ) : (
                        <Upload size={25} />
                    )}

                    <strong>
                        {loading
                            ? "Screening in progress..."
                            : file
                                ? file.name
                                : "Choose CSV file"}
                    </strong>

                    <span>
                        {loading
                            ? "Please wait. Do not submit another file."
                            : file
                                ? `${(
                                    file.size /
                                    1024
                                ).toFixed(1)} KB`
                                : "Maximum size: 10 MB"}
                    </span>

                    <input
                        type="file"
                        accept=".csv,text/csv"
                        onChange={
                            handleFileChange
                        }
                        disabled={loading}
                        hidden
                    />
                </label>

                {file && !loading && (
                    <button
                        type="button"
                        className="primary-button batch-run-button"
                        onClick={
                            handleUpload
                        }
                        disabled={loading}
                    >
                        <ShieldAlert size={17} />
                        Run AI Screening
                    </button>
                )}

                {loading && (
                    <div className="batch-progress">

                        <div className="batch-progress-title">
                            <span>
                                AI analysis in progress
                            </span>

                            <span>
                                Please wait
                            </span>
                        </div>

                        <div className="progress-bar">
                            <div className="progress-fill" />
                        </div>

                        <span>
                            Running anomaly detection,
                            drift prediction, safety
                            analysis and risk classification.
                        </span>

                    </div>
                )}

            </section>

            {error && (
                <div className="batch-error">

                    <AlertTriangle size={18} />

                    <span>
                        {error}
                    </span>

                </div>
            )}

            {results && (
                <>

                    <section className="batch-summary-grid">

                        <BatchStat
                            label="CSV ROWS"
                            value={
                                results.totalRows
                            }
                            icon={
                                <FileSpreadsheet
                                    size={19}
                                />
                            }
                        />

                        <BatchStat
                            label="COMPONENTS"
                            value={
                                results.totalComponents
                            }
                            icon={
                                <ShieldAlert
                                    size={19}
                                />
                            }
                        />

                        <BatchStat
                            label="PROCESSED"
                            value={
                                results.processed
                            }
                            icon={
                                <CheckCircle2
                                    size={19}
                                />
                            }
                            type="success"
                        />

                        <BatchStat
                            label="FAILED"
                            value={
                                results.failed
                            }
                            icon={
                                <XCircle
                                    size={19}
                                />
                            }
                            type="critical"
                        />

                    </section>

                    <section className="batch-decision-grid">

                        <DecisionCard
                            label="PASS"
                            value={
                                results
                                    .decisions
                                    ?.PASS || 0
                            }
                            type="pass"
                        />

                        <DecisionCard
                            label="MONITOR"
                            value={
                                results
                                    .decisions
                                    ?.MONITOR || 0
                            }
                            type="monitor"
                        />

                        <DecisionCard
                            label="INVESTIGATE"
                            value={
                                results
                                    .decisions
                                    ?.INVESTIGATE ||
                                0
                            }
                            type="investigate"
                        />

                        <DecisionCard
                            label="REJECT"
                            value={
                                results
                                    .decisions
                                    ?.REJECT || 0
                            }
                            type="reject"
                        />

                    </section>

                    <section className="detail-section batch-results-section">

                        <div className="panel-title batch-table-header">

                            <div>
                                <h2>
                                    Screening Results
                                </h2>

                                <p>
                                    AI-generated
                                    component-level
                                    screening results
                                </p>
                            </div>

                            <div className="batch-controls">

                                <div className="batch-search">

                                    <Search
                                        size={16}
                                    />

                                    <input
                                        type="text"
                                        value={search}
                                        onChange={(
                                            event
                                        ) =>
                                            setSearch(
                                                event
                                                    .target
                                                    .value
                                            )
                                        }
                                        placeholder="Search component or lot"
                                    />

                                </div>

                                <div className="filter-select">

                                    <select
                                        value={filter}
                                        onChange={(
                                            event
                                        ) =>
                                            setFilter(
                                                event
                                                    .target
                                                    .value
                                            )
                                        }
                                    >
                                        <option value="ALL">
                                            All Decisions
                                        </option>

                                        <option value="PASS">
                                            Pass
                                        </option>

                                        <option value="MONITOR">
                                            Monitor
                                        </option>

                                        <option value="INVESTIGATE">
                                            Investigate
                                        </option>

                                        <option value="REJECT">
                                            Reject
                                        </option>
                                    </select>

                                    <ChevronDown
                                        size={15}
                                    />

                                </div>

                            </div>

                        </div>

                        <div className="batch-table-wrapper">

                            <table className="batch-table">

                                <thead>
                                    <tr>
                                        <th>
                                            COMPONENT
                                        </th>

                                        <th>
                                            LOT
                                        </th>

                                        <th>
                                            TEMP.
                                        </th>

                                        <th>
                                            ANOMALY
                                        </th>

                                        <th>
                                            PRED. 168H
                                        </th>

                                        <th>
                                            SAFETY
                                        </th>

                                        <th>
                                            RISK
                                        </th>

                                        <th>
                                            DECISION
                                        </th>
                                    </tr>
                                </thead>

                                <tbody>

                                    {filteredResults.length === 0 ? (
                                        <tr>
                                            <td
                                                colSpan="8"
                                                className="empty-table"
                                            >
                                                No components found.
                                            </td>
                                        </tr>
                                    ) : (
                                        filteredResults.map(
                                            (item) => (
                                                <tr
                                                    key={
                                                        item.componentId
                                                    }
                                                >

                                                    <td>
                                                        <a
                                                            href={`/component/${item.componentId}`}
                                                            className="component-link"
                                                        >
                                                            {
                                                                item.componentId
                                                            }
                                                        </a>
                                                    </td>

                                                    <td>
                                                        {
                                                            item.lotId
                                                        }
                                                    </td>

                                                    <td>
                                                        {
                                                            item.temperatureC
                                                        }°C
                                                    </td>

                                                    <td>
                                                        {
                                                            formatNumber(
                                                                item
                                                                    .moduleA
                                                                    ?.anomalyScore,
                                                                3
                                                            )
                                                        }
                                                    </td>

                                                    <td>
                                                        {
                                                            formatNumber(
                                                                item
                                                                    .moduleB
                                                                    ?.predicted168h,
                                                                3
                                                            )
                                                        }
                                                    </td>

                                                    <td>
                                                        <SafetyBadge
                                                            status={
                                                                item
                                                                    .safety
                                                                    ?.status
                                                            }
                                                        />
                                                    </td>

                                                    <td>
                                                        <strong>
                                                            {
                                                                item
                                                                    .finalRisk
                                                                    ?.riskScore ??
                                                                0
                                                            }
                                                        </strong>
                                                    </td>

                                                    <td>
                                                        <DecisionBadge
                                                            decision={
                                                                item
                                                                    .finalRisk
                                                                    ?.decision
                                                            }
                                                        />
                                                    </td>

                                                </tr>
                                            )
                                        )
                                    )}

                                </tbody>

                            </table>

                        </div>

                        <div className="table-footer">

                            Showing{" "}

                            <strong>
                                {
                                    filteredResults.length
                                }
                            </strong>

                            {" "}of{" "}

                            <strong>
                                {
                                    allResults.length
                                }
                            </strong>

                            {" "}processed components

                        </div>

                    </section>
                </>
            )}

        </div>
    );
}

function BatchStat({
    label,
    value,
    icon,
    type = ""
}) {
    return (
        <div
            className={
                `batch-stat ${type}`
            }
        >
            <div className="batch-stat-icon">
                {icon}
            </div>

            <span>
                {label}
            </span>

            <strong>
                {Number(
                    value || 0
                ).toLocaleString()}
            </strong>
        </div>
    );
}

function DecisionCard({
    label,
    value,
    type
}) {
    return (
        <div
            className={
                `decision-card decision-card-${type}`
            }
        >
            <span>
                {label}
            </span>

            <strong>
                {Number(
                    value || 0
                ).toLocaleString()}
            </strong>
        </div>
    );
}

function DecisionBadge({
    decision
}) {
    if (decision === "REJECT") {
        return (
            <span className="decision-badge reject">
                <XCircle size={13} />
                REJECT
            </span>
        );
    }

    if (decision === "INVESTIGATE") {
        return (
            <span className="decision-badge investigate">
                <AlertTriangle size={13} />
                INVESTIGATE
            </span>
        );
    }

    if (decision === "MONITOR") {
        return (
            <span className="decision-badge monitor">
                <AlertTriangle size={13} />
                MONITOR
            </span>
        );
    }

    return (
        <span className="decision-badge pass">
            <CheckCircle2 size={13} />
            PASS
        </span>
    );
}

function SafetyBadge({
    status
}) {
    if (
        status ===
        "EXCEEDS_SAFETY_SLOPE"
    ) {
        return (
            <span className="safety-bad">
                EXCEEDED
            </span>
        );
    }

    return (
        <span className="safety-good">
            WITHIN RANGE
        </span>
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

export default BatchUpload;

