const mysql = require("mysql2/promise");
require("dotenv").config();

const pool = mysql.createPool({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,

    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

async function testDatabaseConnection() {
    try {
        const connection = await pool.getConnection();

        console.log("✅ MySQL database connected successfully");

        connection.release();
    } catch (error) {
        console.error("❌ MySQL connection failed:");
        console.error(error.message);

        process.exit(1);
    }
}

module.exports = {
    pool,
    testDatabaseConnection
};
