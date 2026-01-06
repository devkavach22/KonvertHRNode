require("dotenv").config();
const express = require("express");
const cors = require("cors");
const apiRoutes = require("./Masters/routes/api.routes");
const employeeRoutes = require("./modules/employee/routes/routes");
const app = express();
const PORT = process.env.PORT || 4000;

const allowedOrigins = [
  "https://konverthr-marketing.onrender.com/",
];

app.use(
  cors({
    origin: allowedOrigins,
    credentials: true
  })
);

app.use(cors());
app.use(express.json({ limit: "200mb" }));
app.use(express.urlencoded({ limit: "200mb", extended: true }));
app.use("/api", apiRoutes);
app.use("/employee", employeeRoutes);



app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ status: "error", message: "Internal Server Error" });
});

app.get("/", (req, res) => {
  res.status(200).json({
    status: "success",
    message: "Welcome to the API Server 🚀",
    serverTime: new Date()
  });
});

app.get("/health", (req, res) => {
  res.status(200).json({
    status: "ok",
    message: "Server is healthy",
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  });
});
app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server is running on port ${PORT}`);
});




