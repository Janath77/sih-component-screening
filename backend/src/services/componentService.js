const { pool } = require("../config/db");

async function getAllComponents() {
    const [rows] = await pool.execute(`
        SELECT
            id,
            component_id,
            lot_id,
            temperature_c,
            parameter_name,
            behavior_class,
            outcome,
            created_at
        FROM components
        ORDER BY component_id
    `);

    return rows;
}

async function getComponentById(componentId) {
    const [componentRows] = await pool.execute(
        `
        SELECT
            id,
            component_id,
            lot_id,
            temperature_c,
            parameter_name,
            behavior_class,
            outcome,
            created_at
        FROM components
        WHERE component_id = ?
        `,
        [componentId]
    );

    if (componentRows.length === 0) {
        return null;
    }

    const component = componentRows[0];

    const [measurements] = await pool.execute(
        `
        SELECT
            time_point_hours,
            measurement_value
        FROM measurements
        WHERE component_id = ?
        ORDER BY time_point_hours
        `,
        [component.id]
    );

    return {
        ...component,
        measurements
    };
}

module.exports = {
    getAllComponents,
    getComponentById
};

