const express = require("express");
const {
  createEmployee,
  getEmployees,
  updateEmployee,
  deleteEmployee,
  createBusinessType,
  updateBusinessType,
  deleteBusinessType,
  createBusinessLocation,
  updateBusinessLocation,
  deleteBusinessLocation,
  getAllBusinessTypes,
  getBusinessTypeById,
  getAllBusinessLocations,
  getBusinessLocationById,
  createAttendancePolicy,
  updateAttendancePolicy,
  deleteAttendancePolicy,
  getAllAttendancePolicies,
  getAttendancePolicyById,
  getEmployeeDashboard,
  createExpense,
  getExpense,
  updateExpense,
  createCalendarEvent,
  getCalendarEvent,
  createExpenseCategory,
  getExpenseCategories
} = require("../controller/controller.js");
const authenticate = require("../../../Masters/middleware/auth.middleware.js");
const multer = require("multer");
const upload = multer({ storage: multer.memoryStorage() });

const router = express.Router();
router.post(
  "/create/business-type",
  authenticate,
  createBusinessType
);

router.get(
  "/business-types",
  authenticate,
  getAllBusinessTypes
);

router.get(
  "/business-types/:id",
  authenticate,
  getBusinessTypeById
);

router.put("/business-type/:id", authenticate, updateBusinessType);
router.delete("/business-type/:id", authenticate, deleteBusinessType);

router.post("/create/business-location", authenticate, createBusinessLocation);
router.get("/business-locations", authenticate, getAllBusinessLocations);
router.get("/business-locations/:id", authenticate, getBusinessLocationById);
router.put("/business-location/:id", authenticate, updateBusinessLocation);
router.delete("/business-location/:id", authenticate, deleteBusinessLocation);

router.post("/create/attendance-policy", authenticate, createAttendancePolicy);
router.get("/attendance-policies", authenticate, getAllAttendancePolicies);
router.put("/attendance-policy/:id", authenticate, updateAttendancePolicy);
router.delete("/attendance-policy/:id", authenticate, deleteAttendancePolicy);


router.post(
  "/create/employee",
  authenticate,
  createEmployee
);

router.put(
  "/:id",
  authenticate,
  updateEmployee
);

router.get("/employees", authenticate, getEmployees);
router.delete('/:id', deleteEmployee);
router.get("/employee-dashboard",authenticate,getEmployeeDashboard);

router.post("/create/expense",authenticate, upload.single("attachment"),createExpense);
router.get("/expense",authenticate,getExpense);
router.put("/update-expense/:id",authenticate,updateExpense);
router.post("/create/calendar",authenticate,createCalendarEvent);
router.get("/calendar",authenticate,getCalendarEvent);
router.post("/create/expense-categroy",authenticate,createExpenseCategory);
router.get("/expense-category",authenticate,getExpenseCategories);
module.exports = router;