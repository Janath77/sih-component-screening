const { pool } = require("../config/db");

async function getDashboardSummary() {
    const [totalRows] = await pool.execute(`
        SELECT COUNT(*) AS total
        FROM components
    `);

    const [outcomeRows] = await pool.execute(`
        SELECT
            outcome,
            COUNT(*) AS count
        FROM components
        GROUP BY outcome
        ORDER BY count DESC
    `);

    const [lotRows] = await pool.execute(`
        SELECT
            lot_id,
            COUNT(*) AS component_count
        FROM components
        GROUP BY lot_id
        ORDER BY lot_id
    `);

    const [temperatureRows] = await pool.execute(`
        SELECT
            temperature_c,
            COUNT(*) AS component_count
        FROM components
        GROUP BY temperature_c
        ORDER BY temperature_c
    `);

    const [behaviorRows] = await pool.execute(`
        SELECT
            behavior_class,
            COUNT(*) AS count
        FROM components
        GROUP BY behavior_class
        ORDER BY count DESC
    `);

    return {
        totalComponents:
            Number(totalRows[0].total),

        outcomes:
            outcomeRows.map((row) => ({
                outcome:
                    row.outcome,
                count:
                    Number(row.count)
            })),

        lots:
            lotRows.map((row) => ({
                lotId:
                    row.lot_id,
                componentCount:
                    Number(row.component_count)
            })),

        temperatures:
            temperatureRows.map((row) => ({
                temperatureC:
                    Number(row.temperature_c),
                componentCount:
                    Number(row.component_count)
            })),

        behaviorClasses:
            behaviorRows.map((row) => ({
                behavior:
                    row.behavior_class,
                count:
                    Number(row.count)
            }))
    };
}

async function getAnalytics() {
    const [groupRows] = await pool.execute(`
        SELECT
            lot_id,
            temperature_c,
            COUNT(*) AS component_count,

            AVG(
                (
                    SELECT
                        measurement_value
                    FROM measurements m
                    WHERE
                        m.component_id = c.id
                        AND m.time_point_hours = 168
                )
            ) AS avg_168h

        FROM components c

        GROUP BY
            lot_id,
            temperature_c

        ORDER BY
            lot_id,
            temperature_c
    `);

    return {
        lotTemperatureGroups:
            groupRows.map((row) => ({
                lotId:
                    row.lot_id,

                temperatureC:
                    Number(row.temperature_c),

                componentCount:
                    Number(row.component_count),

                average168h:
                    Number(
                        row.avg_168h || 0
                    )
            }))
    };
}

module.exports = {
    getDashboardSummary,
    getAnalytics
};


