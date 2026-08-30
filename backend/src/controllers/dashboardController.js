const {
    getDashboardSummary,
    getAnalytics
} = require("../services/dashboardService");

async function fetchDashboard(
    req,
    res
) {
    try {
        const dashboard =
            await getDashboardSummary();

        res.json({
            success: true,
            data: dashboard
        });

    } catch (error) {
        console.error(
            "Dashboard error:",
            error
        );

        res.status(500).json({
            success: false,
            message:
                "Failed to load dashboard",
            error:
                error.message
        });
    }
}

async function fetchAnalytics(
    req,
    res
) {
    try {
        const analytics =
            await getAnalytics();

        res.json({
            success: true,
            data: analytics
        });

    } catch (error) {
        console.error(
            "Analytics error:",
            error
        );

        res.status(500).json({
            success: false,
            message:
                "Failed to load analytics",
            error:
                error.message
        });
    }
}

module.exports = {
    fetchDashboard,
    fetchAnalytics
};

