const express = require("express");

const {
    fetchDashboard,
    fetchAnalytics
} = require("../controllers/dashboardController");

const router = express.Router();

router.get(
    "/",
    fetchDashboard
);

router.get(
    "/analytics",
    fetchAnalytics
);

module.exports = router;

