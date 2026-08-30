const express = require("express");
const cors = require("cors");

const componentRoutes =
    require("./routes/componentRoutes");

const dashboardRoutes =
    require("./routes/dashboardRoutes");

const batchRoutes =
    require("./routes/batchRoutes");

const app =
    express();

// ============================================================
// Middleware
// ============================================================

app.use(
    cors({
        origin:
            "http://localhost:5173"
    })
);

app.use(
    express.json()
);

// ============================================================
// Health
// ============================================================

app.get(
    "/api/health",
    (req, res) => {
        res.json({
            status: "online",
            message:
                "SIH Component Screening API is running"
        });
    }
);

// ============================================================
// Components
// ============================================================

app.use(
    "/api/components",
    componentRoutes
);

// ============================================================
// Dashboard
// ============================================================

app.use(
    "/api/dashboard",
    dashboardRoutes
);

// ============================================================
// Batch Screening
// ============================================================

app.use(
    "/api/batch-screening",
    batchRoutes
);

// ============================================================
// 404
// ============================================================

app.use(
    (req, res) => {
        res.status(404).json({
            success: false,
            message:
                "API endpoint not found"
        });
    }
);

// ============================================================
// Error handler
// ============================================================

app.use(
    (err, req, res, next) => {
        console.error(
            "Server error:",
            err
        );

        res.status(500).json({
            success: false,
            message:
                "Internal server error",
            error:
                err.message
        });
    }
);

module.exports = app;

