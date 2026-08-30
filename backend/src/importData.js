const fs = require("fs");
const path = require("path");
const csv = require("csv-parser");

const { pool } = require("./config/db");

const csvPath = path.join(__dirname, "data", "dataset.csv");

const REQUIRED_COLUMNS = [
    "component_id",
    "lot_id",
    "device_type",
    "temperature_C",
    "parameter_name",
    "unit",
    "value_0h",
    "value_24h",
    "value_96h",
    "value_168h",
    "outcome",
    "failure_time_h",
    "behavior_class_synthetic_only",
    "data_source"
];

function validateRow(row, rowNumber) {
    for (const column of REQUIRED_COLUMNS) {
        if (!(column in row)) {
            throw new Error(
                `Missing column "${column}" in CSV row ${rowNumber}`
            );
        }
    }

    if (!row.component_id) {
        throw new Error(`Missing component_id at row ${rowNumber}`);
    }

    if (!row.lot_id) {
        throw new Error(`Missing lot_id at row ${rowNumber}`);
    }

    const temperature = Number(row.temperature_C);

    if (!Number.isFinite(temperature)) {
        throw new Error(
            `Invalid temperature_C at row ${rowNumber}`
        );
    }

    const measurements = [
        row.value_0h,
        row.value_24h,
        row.value_96h,
        row.value_168h
    ];

    for (const value of measurements) {
        if (value === "" || !Number.isFinite(Number(value))) {
            throw new Error(
                `Invalid measurement value at row ${rowNumber}`
            );
        }
    }
}

function readCsv() {
    return new Promise((resolve, reject) => {
        const rows = [];

        fs.createReadStream(csvPath)
            .pipe(csv())
            .on("data", (row) => {
                rows.push(row);
            })
            .on("end", () => {
                resolve(rows);
            })
            .on("error", reject);
    });
}

async function importData() {
    let connection;

    try {
        console.log("======================================");
        console.log("SIH COMPONENT DATA IMPORT");
        console.log("======================================");

        console.log(`Reading CSV: ${csvPath}`);

        const rows = await readCsv();

        console.log(`CSV rows found: ${rows.length}`);

        if (rows.length === 0) {
            throw new Error("CSV file is empty.");
        }

        // Validate the complete dataset before inserting anything.
        rows.forEach((row, index) => {
            validateRow(row, index + 2);
        });

        console.log("✅ CSV validation passed.");

        connection = await pool.getConnection();

        await connection.beginTransaction();

        console.log("✅ MySQL transaction started.");

        let componentCount = 0;
        let measurementCount = 0;

        for (const row of rows) {
            const [existing] = await connection.execute(
                `
                SELECT id
                FROM components
                WHERE component_id = ?
                `,
                [row.component_id]
            );

            let componentDbId;

            if (existing.length > 0) {
                componentDbId = existing[0].id;

                await connection.execute(
                    `
                    UPDATE components
                    SET
                        lot_id = ?,
                        temperature_c = ?,
                        parameter_name = ?,
                        behavior_class = ?,
                        outcome = ?
                    WHERE id = ?
                    `,
                    [
                        row.lot_id,
                        Number(row.temperature_C),
                        row.parameter_name,
                        row.behavior_class_synthetic_only || null,
                        row.outcome || null,
                        componentDbId
                    ]
                );
            } else {
                const [componentResult] = await connection.execute(
                    `
                    INSERT INTO components
                    (
                        component_id,
                        lot_id,
                        temperature_c,
                        parameter_name,
                        behavior_class,
                        outcome
                    )
                    VALUES (?, ?, ?, ?, ?, ?)
                    `,
                    [
                        row.component_id,
                        row.lot_id,
                        Number(row.temperature_C),
                        row.parameter_name,
                        row.behavior_class_synthetic_only || null,
                        row.outcome || null
                    ]
                );

                componentDbId = componentResult.insertId;
                componentCount++;
            }

            const measurements = [
                {
                    time: 0,
                    value: Number(row.value_0h)
                },
                {
                    time: 24,
                    value: Number(row.value_24h)
                },
                {
                    time: 96,
                    value: Number(row.value_96h)
                },
                {
                    time: 168,
                    value: Number(row.value_168h)
                }
            ];

            for (const measurement of measurements) {
                await connection.execute(
                    `
                    INSERT INTO measurements
                    (
                        component_id,
                        time_point_hours,
                        measurement_value
                    )
                    VALUES (?, ?, ?)
                    ON DUPLICATE KEY UPDATE
                        measurement_value = VALUES(measurement_value)
                    `,
                    [
                        componentDbId,
                        measurement.time,
                        measurement.value
                    ]
                );

                measurementCount++;
            }
        }

        await connection.commit();

        console.log("======================================");
        console.log("✅ IMPORT COMPLETED");
        console.log("======================================");
        console.log(`New components inserted: ${componentCount}`);
        console.log(`Measurements processed: ${measurementCount}`);
        console.log(`CSV rows processed: ${rows.length}`);
        console.log("======================================");

    } catch (error) {
        if (connection) {
            await connection.rollback();
        }

        console.error("❌ IMPORT FAILED");
        console.error(error.message);

        process.exitCode = 1;
    } finally {
        if (connection) {
            connection.release();
        }

        await pool.end();
    }
}

importData();
