const odooService = require("../services/odoo.service");
const authenticate = async (req, res, next) => {
    try {
        const token = req.headers.authorization?.trim();

        if (!token) {
            return res.status(401).json({
                status: "error",
                message: "Authorization token missing",
            });
        }
        const tokenRecords = await odooService.searchRead(
            "api.auth.token",
            [["token", "=", token]],
            ["id", "user_name", "expiry"],
            1
        );

        if (!tokenRecords || tokenRecords.length === 0) {
            return res.status(401).json({
                status: "error",
                message: "Invalid token",
            });
        }

        const tokenRecord = tokenRecords[0];
        const isValid = await odooService.execute(
            "api.auth.token",
            "is_valid",
            [tokenRecord.id]
        );

        if (!isValid) {
            return res.status(401).json({
                status: "error",
                message: "Token expired. Please generate a new token",
            });
        }

        req.user = {
            user_name: tokenRecord.user_name,
            token_id: tokenRecord.id,
        };

        next();
    } catch (error) {
        console.error("Authentication error:", error);
        return res.status(500).json({
            status: "error",
            message: "Internal server error during authentication",
        });
    }
};

module.exports = authenticate;
