const express = require("express");
const multer = require("multer");

const {
    screenBatch
} = require("../controllers/batchController");

const router =
    express.Router();

const upload =
    multer({
        storage:
            multer.memoryStorage(),

        limits: {
            fileSize:
                10 * 1024 * 1024
        },

        fileFilter:
            (req, file, cb) => {
                const isCSV =
                    file.mimetype ===
                        "text/csv" ||
                    file.originalname
                        .toLowerCase()
                        .endsWith(".csv");

                if (!isCSV) {
                    return cb(
                        new Error(
                            "Only CSV files are allowed."
                        )
                    );
                }

                cb(null, true);
            }
    });

router.post(
    "/screen",
    upload.single("file"),
    screenBatch
);

module.exports =
    router;

    