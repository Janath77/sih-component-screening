const app = require("./app");
const { testDatabaseConnection } = require("./config/db");
require("dotenv").config();

const PORT = process.env.PORT || 5000;

async function startServer() {
    await testDatabaseConnection();

    app.listen(PORT, () => {
        console.log(`🚀 Server running at http://localhost:${PORT}`);
    });
}

startServer();