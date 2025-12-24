require("dotenv").config();
const express = require("express");
const cors = require("cors");
const apiRoutes = require("./Module2/routes/api.routes");
const employeeRoutes = require("./modules/employee/routes/routes");
const app = express();
const PORT = process.env.PORT || 4000;


app.use(cors());
app.use(express.json({ limit: "200mb" }));
app.use(express.urlencoded({ limit: "200mb", extended: true }));
app.use("/api", apiRoutes);
app.use("/employee", employeeRoutes);



app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ status: "error", message: "Internal Server Error" });
});

app.listen(PORT, "0.0.0.0",() => {
  console.log(`Server is running on port ${PORT}`);
});


