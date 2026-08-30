const express = require("express");

const {
    fetchAllComponents,
    fetchComponent
} = require("../controllers/componentController");

const router = express.Router();

router.get("/", fetchAllComponents);

router.get("/:id", fetchComponent);

module.exports = router;

