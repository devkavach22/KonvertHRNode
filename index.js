/**
* =====================================================
* 1️⃣ LOAD ENV FILE FIRST (ABSOLUTELY FIRST)
* =====================================================
*/
const fs = require("fs");
const dotenv = require("dotenv");

// Determine environment file path
// For local: uses .env by default
// For PM2: pass ENV_FILE=/path/to/custom.env
const ENV_PATH = process.env.ENV_FILE || ".env";

// Check if env file exists
if (!fs.existsSync(ENV_PATH)) {
  throw new Error(`❌ Env file not found: ${ENV_PATH}`);
}

// Load environment variables
dotenv.config({ path: ENV_PATH });
console.log(`✅ Environment loaded from ${ENV_PATH}`);

/**
* =====================================================
* 2️⃣ VALIDATE REQUIRED ENV VARIABLES
* =====================================================
*/
if (!process.env.PORT) {
  throw new Error("❌ PORT is not defined in env file");
}
if (!process.env.ODOO_URL) {
  throw new Error("❌ ODOO_URL is not defined in env file");
}

const PORT = Number(process.env.PORT);

/**
* =====================================================
* 3️⃣ LOAD APPLICATION MODULES
* =====================================================
*/
const express = require("express");
const cors = require("cors");
const apiRoutes = require("./Masters/routes/api.routes");
const employeeRoutes = require("./modules/employee/routes/routes");

const app = express();

/**
* =====================================================
* 4️⃣ MIDDLEWARES
* =====================================================
*/
app.use(
  cors({
    origin: true,
    credentials: true
  })
);
app.use(express.json({ limit: "200mb" }));
app.use(express.urlencoded({ limit: "200mb", extended: true }));

/**
* =====================================================
* 5️⃣ ROUTES
* =====================================================
*/
app.use("/api", apiRoutes);
app.use("/employee", employeeRoutes);

/**
* =====================================================
* 6️⃣ ROOT ENDPOINT
* =====================================================
*/
app.get("/", (req, res) => {
  res.status(200).json({
    status: "success",
    service: "KonvertHR Node API",
    environment: process.env.NODE_ENV || "unknown",
    port: PORT,
    serverTime: new Date().toISOString()
  });
});

/**
* =====================================================
* 7️⃣ HEALTH CHECK ENDPOINT
* =====================================================
*/
app.get("/health", (req, res) => {
  res.status(200).json({
    status: "ok",
    uptime: process.uptime(),
    memoryUsage: process.memoryUsage().rss,
    timestamp: new Date().toISOString()
  });
});

/**
* =====================================================
* 8️⃣ GLOBAL ERROR HANDLER
* =====================================================
*/
app.use((err, req, res, next) => {
  console.error("❌ Unhandled Error:", err);
  res.status(500).json({
    status: "error",
    message: "Internal Server Error"
  });
});

/**
* =====================================================
* 9️⃣ START SERVER
* =====================================================
*/
app.listen(PORT, "0.0.0.0", () => {
  console.log(
    `🚀 ${process.env.NODE_ENV || "app"} server running on port ${PORT}`
  );
});