const {
    analyzeBatch,
    ValidationError
} = require("../services/batchService");

async function screenBatch(
    req,
    res
) {
    try {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                message:
                    "Please upload a CSV file."
            });
        }

        const result =
            await analyzeBatch(
                req.file.buffer
            );

        res.json({
            success: true,
            data: result
        });

    } catch (error) {
        console.error(
            "Batch screening error:",
            error
        );

        if (
            error instanceof ValidationError ||
            error.statusCode === 400
        ) {
            return res.status(400).json({
                success: false,
                message:
                    error.message
            });
        }

        return res.status(500).json({
            success: false,
            message:
                "Batch screening failed",
            error:
                error.message ||
                "Unknown server error"
        });
    }
}

module.exports = {
    screenBatch
};

