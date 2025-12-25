const odooService = require("../services/odoo.service");
const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader) {
      return res.status(401).json({
        status: "error",
        message: "Authorization header missing",
      });
    }
    const token = authHeader.replace("Bearer ", "").trim();
    
    if (!token) {
      return res.status(401).json({
        status: "error",
        message: "Invalid authorization format. Use: Bearer <token>",
      });
    }
    const tokenRecords = await odooService.searchRead(
      "api.auth.token",
      [["token", "=", token]],
      ["id", "user_name", "expiry"],
      1
    );

    if (!tokenRecords || tokenRecords.length === 0) {
      return res.status(404).json({
        status: "error",
        message: "Token not found. Please generate a new token",
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
    
    if (error.message && error.message.includes('Odoo')) {
      return res.status(503).json({
        status: "error",
        message: "Authentication service temporarily unavailable",
      });
    }
    
    return res.status(500).json({
      status: "error",
      message: "Internal server error during authentication",
      ...(process.env.NODE_ENV === 'development' && { error: error.message }),
    });
  }
};

module.exports = authenticate;