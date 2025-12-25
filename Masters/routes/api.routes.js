const express = require("express");
const router = express.Router();
const apiController = require("../controllers/api.controller");
const authenticate = require("../middleware/auth.middleware");
const contactController = require("../controllers/contact.controller");
const bankController = require("../controllers/bankController");
const productController = require("../controllers/product.controller");
const companyController = require("../controllers/company.controller");
const invoiceController = require("../controllers/invoice.controller");
const { registerEmployeeDevice } = require("../controllers/MobileAppVarification");

const multer = require("multer");
const upload = multer({ storage: multer.memoryStorage() });

const CheckInandCheckout = require("../controllers/checkin.controller");

router.post("/auth", apiController.auth.bind(apiController));

router.post(
  "/lead/create",
  authenticate,
  apiController.createLead.bind(apiController)
);
router.get(
  "/countries",
  authenticate,
  apiController.getCountries.bind(apiController)
);

router.get(
  "/city",
  authenticate,
  apiController.getDistricts.bind(apiController)
);

router.get(
  "/timezones",
  authenticate,
  apiController.getTimezones.bind(apiController)
);

router.post(
  "/check_gstnumber",
  authenticate,
  apiController.checkGstNumber.bind(apiController)
);
router.get(
  "/states",
  authenticate,
  apiController.getStates.bind(apiController)
);
router.post(
  "/user/signup",
  authenticate,
  apiController.createUser.bind(apiController)
);
router.post(
  "/Kavach/signup",
  authenticate,
  apiController.kavachUserCreation.bind(apiController)
);
router.post(
  "/Kavach/login",
  authenticate,
  apiController.kavachLogin.bind(apiController)
);
router.post(
  "/Kavach/forget-password",
  authenticate,
  apiController.kavachForgotPassword.bind(apiController)
);

router.post(
  "/login",
  authenticate,
  apiController.loginUser.bind(apiController)
);

router.post(
  "/forgot-password/request",
  authenticate,
  apiController.sendTempPassword.bind(apiController)
);

router.post(
  "/forgot-password/confirm",
  authenticate,
  apiController.resetPassword.bind(apiController)
);


router.post(
  "/job/create",
  authenticate,
  apiController.createJobPosition.bind(apiController)
);
router.get(
  "/job/list",
  authenticate,
  apiController.getJobPositions.bind(apiController)
);
router.put(
  "/jobs/:job_id",
  authenticate,
  apiController.updateJobPosition.bind(apiController)
);
router.delete(
  "/jobs/:job_id",
  authenticate,
  apiController.deleteJobPosition.bind(apiController)
);

router.post(
  "/create/work-location",
  authenticate,
  apiController.createWorkLocation.bind(apiController)
);
router.get(
  "/work-location",
  authenticate,
  apiController.getWorkLocations.bind(apiController)
);
router.get(
  "/work-location/:id",
  authenticate,
  apiController.getWorkLocation.bind(apiController)
);
router.put(
  "/work-location/:id",
  authenticate,
  apiController.updateWorkLocation.bind(apiController)
);
router.delete(
  "/work-location/:id",
  authenticate,
  apiController.deleteWorkLocation.bind(apiController)
);

router.post(
  "/create/department",
  authenticate,
  apiController.createDepartment.bind(apiController)
);

router.get(
  "/department",
  authenticate,
  apiController.getDepartments.bind(apiController)
);
router.put(
  "/department/:id",
  authenticate,
  apiController.updateDepartment.bind(apiController)
);
router.delete(
  "/department/:id",
  authenticate,
  apiController.deleteDepartment.bind(apiController)
);
router.get(
  "/category/list",
  authenticate,
  contactController.getAllCategories.bind(contactController)
);

router.post(
  "/bank/create",
  authenticate,
  bankController.createBank.bind(bankController)
);
router.get(
  "/bank/list",
  authenticate,
  bankController.getAllBanks.bind(bankController)
);
router.put(
  "/bank/update/:id",
  authenticate,
  bankController.updateBank.bind(bankController)
);
router.delete(
  "/bank/delete/:id",
  authenticate,
  bankController.deleteBank.bind(bankController)
);

router.post(
  "/bank-account/create",
  authenticate,
  bankController.createBankAccount.bind(bankController)
);
router.get(
  "/bank-account/list",
  authenticate,
  bankController.getAllBankAccounts.bind(bankController)
);
router.put(
  "/bank-account/update/:id",
  authenticate,
  bankController.updateBankAccount.bind(bankController)
);
router.delete(
  "/bank-account/delete/:id",
  authenticate,
  bankController.deleteBankAccount.bind(bankController)
);

router.post(
  "/create/Product",
  authenticate,
  productController.createProduct.bind(productController)
);
router.get(
  "/Read/products",
  authenticate,
  productController.getProducts.bind(productController)
);

router.get(
  "/single/product/:id",
  authenticate,
  productController.getProductById.bind(productController)
);

router.put(
  "/product/:id",
  authenticate,
  productController.updateProduct.bind(productController)
);

router.delete(
  "/product/:id",
  authenticate,
  productController.deleteProduct.bind(productController)
);

router.post(
  "/create/tag",
  authenticate,
  apiController.createTag.bind(apiController)
);
router.get(
  "/tags",
  authenticate,
  apiController.getTags.bind(apiController)
);
router.get(
  "/tag/:id",
  authenticate,
  apiController.getTagById.bind(apiController)
);


router.post(
  "/activate/plan",
  authenticate,
  apiController.planActivation.bind(apiController)
);

router.put(
  "/tag/:id",
  authenticate,
 
  apiController.updateTag.bind(apiController)
);
router.delete(
  "/tag/:id",
  authenticate,
  apiController.deleteTag.bind(apiController)
);

// for the Invoice Creation
router.post(
  "/Payment",
  authenticate,
  invoiceController.createInvoiceAndPay.bind(invoiceController)
);

router.post(
  "/invoice/download/",
  authenticate,
  invoiceController.downloadInvoicePDF.bind(invoiceController)
);

router.post(
  "/create/attendance",
  authenticate,
  apiController.createAttendance.bind(apiController)
);

router.get(
  "/admin/attendances",
  authenticate,
  apiController.getAdminAttendances.bind(apiController)
);

router.put(
  "/update/attendance/:id",
  authenticate,
  apiController.updateAttendance.bind(apiController)
);

router.delete(
  "/delete/attendance/:id",
  authenticate,
  apiController.deleteAttendance.bind(apiController)
);

router.get(
  "/attendance",
  authenticate,
  apiController.getAllAttendances.bind(apiController)
);



router.get(
  "/currencies",
  authenticate,
  companyController.getCurrencies.bind(companyController)
);

router.post(
  "/create/country",
  authenticate,
  companyController.createCompany.bind(companyController)
);

router.put(
  "/update/country/:id",
  authenticate,
  companyController.updateCompany.bind(companyController)
);

router.get(
  "/read/compnay/:id",
  authenticate,
  companyController.getCompany.bind(companyController)
);

router.get(
  "/all/companies",
  authenticate,
  companyController.getAllCompanies.bind(companyController)
);

router.put(
  "/archive/company/:id",
  authenticate,
  companyController.archiveCompany.bind(companyController)
);

// Mobile
router.post(
  "/employee/attandence",
  authenticate,
  upload.single("Image"),
  CheckInandCheckout.apiAttendance
);
router.get(
  "/checkin_checkout_status",
  authenticate,
  CheckInandCheckout.apiCheckinCheckout
);

router.get(
  "/user/attendance",
  authenticate,
  CheckInandCheckout.getAllAttendancesMobile
);


router.post(
  "/create/leave",
  authenticate,
  apiController.createLeave.bind(apiController)
);

router.get(
  "/leave/data",
  authenticate,

  apiController.getLeaveData.bind(apiController)
);


router.post(
  "/create/accrual_plan",
  authenticate,
  apiController.createAccrualPlan.bind(apiController)
);
router.get(
  "/accrual_plans",
  authenticate,
  apiController.getAccrualPlans.bind(apiController)
);


router.post(
  "/create/work-entry-type",
  authenticate,
  apiController.createWorkEntryType.bind(apiController)
);
router.get("/work-entry-types", apiController.getWorkEntryTypes.bind(apiController));

router.put(
  "/work-entry-type/:id",
  authenticate,
  apiController.updateWorkEntryType.bind(apiController)
);

router.delete(
  "/work-entry-type/:id",
  authenticate,
  apiController.deleteWorkEntryType.bind(apiController)
);
router.post(
  "/create/WorkingSchedules",
  authenticate,
  apiController.createWorkingSchedule.bind(apiController)
);
router.get(
  "/WorkingSchedules",
  authenticate,
  apiController.getWorkingSchedules.bind(apiController)
);

router.post(
  "/create/skills",
  authenticate,
  apiController.createSkill.bind(apiController)
);
router.delete(
  "/delete/skills/:skill_type_id",
  authenticate,
  apiController.deleteSkill.bind(apiController)
);

router.get("/skills", apiController.getSkills.bind(apiController));

router.put(
  "/skills/:skill_type_id",
  authenticate,
  apiController.updateSkill.bind(apiController)
);
router.post(
  "/create/industries",
  authenticate,
  apiController.createIndustry.bind(apiController)
);

router.get(
  "/industries",
  authenticate,
  apiController.getIndustries.bind(apiController)
);

router.put(
  "/industries/:industry_id",
  authenticate,
  apiController.updateIndustry.bind(apiController)
);

router.delete(
  "/industries/:industry_id",
  authenticate,
  apiController.deleteIndustry.bind(apiController)
);

router.post(
  "/create/ContractType",
  authenticate,
  apiController.createHrContractType.bind(apiController)
);
router.get("/contract-types", apiController.getHrContractTypes.bind(apiController));

router.put(
  "/contract-type/:contract_type_id",
  authenticate,
  apiController.updateHrContractType.bind(apiController)
);

router.delete(
  "/contract-type/:contract_type_id",
  authenticate,
  apiController.deleteHrContractType.bind(apiController)
);
router.get(
  "/shift-rosters",
  authenticate,
  apiController.getShiftRosters.bind(apiController)
);

router.post(
  "/employee/device-register",
  authenticate,
  upload.none(),
  registerEmployeeDevice
);
router.post(
  "/create/branch",
  authenticate,
  apiController.createPartner.bind(apiController)
);
router.get("/branch", authenticate, apiController.getPartners.bind(apiController));

router.put("/branch/:id", authenticate, apiController.updatePartner.bind(apiController));
router.delete("/branch/:id", authenticate, apiController.deletePartner.bind(apiController));

router.post(
  "/create/geoLocation",
  authenticate,
  apiController.createGeoLocation.bind(apiController)
);

router.get("/geoLocation", apiController.getAllGeoLocations.bind(apiController));

module.exports = router;

