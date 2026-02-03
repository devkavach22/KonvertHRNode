const express = require("express");
const router = express.Router();
const apiController = require("../controllers/api.controller");
const authenticate = require("../middleware/auth.middleware");
const contactController = require("../controllers/contact.controller");
const bankController = require("../controllers/bankController");
const productController = require("../controllers/product.controller");
const companyController = require("../controllers/company.controller");
const invoiceController = require("../controllers/invoice.controller");
const {
  registerEmployeeDevice,
} = require("../controllers/MobileAppVarification");
const multer = require("multer");
const upload = multer({ storage: multer.memoryStorage() });
const CheckInandCheckout = require("../controllers/checkin.controller");
const PayrollController = require("../../modules/Payroll/Payroll.controller");
const LeaveController = require("../../modules/LeaveModule/Leave.controller");
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
  "/Marketing/pageLogin",
  authenticate,
  apiController.loginMarketingPage.bind(apiController)
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
router.get("/tags", authenticate, apiController.getTags.bind(apiController));
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

router.post(
  "/Payment",
  authenticate,
  invoiceController.createSubscription.bind(invoiceController)
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
  "/admin/updateattendances/:id",
  authenticate,
  apiController.updateAdminAttendance.bind(apiController)
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
  "/employee/attendance",
  authenticate,
  apiController.getEmployeeAttendanceComplete.bind(apiController)
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
  "/create/work-entry-type",
  authenticate,
  apiController.createWorkEntryType.bind(apiController)
);
router.get(
  "/work-entry-types",
  apiController.getWorkEntryTypes.bind(apiController)
);

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

router.put(
  '/update/workingSchedules/:calendar_id',
  authenticate,
  apiController.updateWorkingSchedule.bind(apiController)
);

router.delete(
  '/delete/workingSchedules/:calendar_id',
  authenticate,
  apiController.deleteWorkingSchedule.bind(apiController)
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
router.get(
  "/contract-types",
  apiController.getHrContractTypes.bind(apiController)
);

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
router.get(
  "/branch",
  authenticate,
  apiController.getPartners.bind(apiController)
);

router.put(
  "/branch/:id",
  authenticate,
  apiController.updatePartner.bind(apiController)
);
router.delete(
  "/branch/:id",
  authenticate,
  apiController.deletePartner.bind(apiController)
);

router.post(
  "/create/geoLocation",
  authenticate,
  apiController.createGeoLocation.bind(apiController)
);
router.get(
  "/geoLocation",
  apiController.getAllGeoLocations.bind(apiController)
);
router.put(
  "/geoLocation/:id",
  authenticate,
  apiController.updateGeoLocation.bind(apiController)
);
router.delete(
  "/geoLocation/:id",
  authenticate,
  apiController.deleteGeoLocation.bind(apiController)
);

router.post(
  "/create/regularization",
  authenticate,
  apiController.createAttendanceRegularization.bind(apiController)
);
router.get(
  "/regularization",
  authenticate,
  apiController.getAttendanceRegularization.bind(apiController)
);
router.put(
  "/regularization/:id",
  authenticate,
  apiController.updateAttendanceRegularization.bind(apiController)
);

router.post(
  "/admin/approve",
  authenticate,
  apiController.approveAttendanceRegularization.bind(apiController)
);
router.post(
  "/admin/reject",
  authenticate,
  apiController.rejectAttendanceRegularization.bind(apiController)
);

router.get(
  "/admin/requests",
  authenticate,
  apiController.getAllApprovalRequests.bind(apiController)
);

router.post(
  "/create/regcategory",
  authenticate,
  apiController.createRegCategory.bind(apiController)
);
router.get(
  "/regcategories",
  authenticate,
  apiController.getRegCategories.bind(apiController)
);
router.put(
  "/regcategories/:id",
  authenticate,
  apiController.updateRegCategory.bind(apiController)
);
router.delete(
  "/regcategories/:id",
  authenticate,
  apiController.deleteRegCategory.bind(apiController)
);

// Salary
router.post(
  "/create/structure-type",
  authenticate,
  PayrollController.createStructureType.bind(PayrollController)
);
router.get(
  "/structure-types",
  authenticate,
  PayrollController.getStructureTypes.bind(PayrollController)
);

router.put(
  "/structure-type/:struct_type_id",
  authenticate,
  PayrollController.updateStructureType.bind(PayrollController)
);
router.delete(
  "/structure-type/:struct_type_id",
  authenticate,
  PayrollController.deleteStructureType.bind(PayrollController)
);
router.post(
  "/create/Input-Type",
  authenticate,
  PayrollController.createInputType.bind(PayrollController)
);
router.put(
  "/input-type/:input_type_id",
  authenticate,
  PayrollController.updateInputType.bind(PayrollController)
);
router.delete(
  "/input-type/:input_type_id",
  authenticate,
  PayrollController.deleteInputType.bind(PayrollController)
);

router.get(
  "/Input-Type",
  authenticate,
  PayrollController.getInputTypes.bind(PayrollController)
);
router.post(
  "/create/salary-rule-category",
  authenticate,
  PayrollController.createSalaryRuleCategory.bind(PayrollController)
);
router.get(
  "/salary-rule-categories",
  authenticate,
  PayrollController.getSalaryRuleCategories.bind(PayrollController)
);
router.put(
  "/salary-rule-category/:category_id",
  authenticate,
  PayrollController.updateSalaryRuleCategory.bind(PayrollController)
);

router.post(
  "/create/salary-rule",
  authenticate,
  PayrollController.createSalaryRule.bind(PayrollController)
);
router.get(
  "/salary-rules",
  authenticate,
  PayrollController.getSalaryRules.bind(PayrollController)
);
router.post(
  "/employee/Contract",
  authenticate,
  PayrollController.createContracts.bind(PayrollController)
);
router.get(
  "/employee/Contract",
  authenticate,
  PayrollController.getContracts.bind(PayrollController)
);

router.get(
  "/groups",
  authenticate,
  apiController.getGroupList.bind(apiController)
);

router.get(
  "/groups/users",
  authenticate,
  apiController.getGroupUsers.bind(apiController)
);

router.post(
  "/create/leave-type",
  authenticate,
  LeaveController.createLeaveType.bind(LeaveController)
);

router.get(
  "/leave-type",
  authenticate,
  LeaveController.getLeaveTypes.bind(LeaveController)
);

router.post(
  "/create/leave-allocate",
  authenticate,
  LeaveController.createLeaveAllocation.bind(LeaveController)
);

router.get(
  "/leave-allocate",
  authenticate,
  LeaveController.getLeaveAllocation.bind(LeaveController)
);

router.post(
  "/create/leave-request",
  authenticate,
  LeaveController.createLeaveRequest.bind(LeaveController)
);

router.get(
  "/leave-request",
  authenticate,
  LeaveController.getLeaveRequest.bind(LeaveController)
);

router.get(
  "/admin/leave-dashboard",
  authenticate,
  LeaveController.getAdminLeave.bind(LeaveController)
);

router.post(
  "/create/salary-structure",
  authenticate,
  PayrollController.createSalaryStructure.bind(PayrollController)
);

router.get(
  "/salary-structure",
  authenticate,
  PayrollController.getSalaryStructure.bind(PayrollController)
);

router.post(
  "/create/public-holiday",
  authenticate,
  LeaveController.createPublicHoliday.bind(LeaveController)
);

router.get(
  "/public-holiday",
  authenticate,
  LeaveController.getPublicHoliday.bind(LeaveController)
);

router.post(
  "/create/accural-plan",
  authenticate,
  LeaveController.createAccrualPlan.bind(LeaveController)
);

router.get(
  "/accural-plan",
  authenticate,
  LeaveController.getAccrualPlan.bind(LeaveController)
);

router.post(
  "/create/mandatory-days",
  authenticate,
  LeaveController.createMandatoryDays.bind(LeaveController)
);

router.get(
  "/mandatory-days",
  authenticate,
  LeaveController.getMandatoryDays.bind(LeaveController)
);

router.put(
  "/leave-type/:id",
  authenticate,
  LeaveController.updateLeaveType.bind(LeaveController)
);

router.delete(
  "/leave-type/:id",
  authenticate,
  LeaveController.deleteLeaveType.bind(LeaveController)
);

router.put(
  "/leave-allocation/:id",
  authenticate,
  LeaveController.updateLeaveAllocation.bind(LeaveController)
);

router.delete(
  "/leave-allocation/:id",
  authenticate,
  LeaveController.deleteLeaveAllocation.bind(LeaveController)
);

router.put(
  "/leave-request/:id",
  authenticate,
  LeaveController.updateLeaveRequest.bind(LeaveController)
);

router.delete(
  "/leave-request/:id",
  authenticate,
  LeaveController.deleteLeaveRequest.bind(LeaveController)
);

router.put(
  "/public-holiday/:id",
  authenticate,
  LeaveController.updatePublicHoliday.bind(LeaveController)
);

router.delete(
  "/public-holiday/:id",
  authenticate,
  LeaveController.deletePublicHoliday.bind(LeaveController)
);

router.put(
  "/accural-plan/:id",
  authenticate,
  LeaveController.updateAccrualPlan.bind(LeaveController)
);

router.delete(
  "/accural-plan/:id",
  authenticate,
  LeaveController.deleteAccrualPlan.bind(LeaveController)
);

router.put(
  "/mandatory-days/:id",
  authenticate,
  LeaveController.updateMandatoryDays.bind(LeaveController)
);

router.delete(
  "/mandatory-days/:id",
  authenticate,
  LeaveController.deleteMandatoryDays.bind(LeaveController)
);
router.post(
  "/leave-allocation/action",
  authenticate,
  LeaveController.updateAllocationStatus.bind(LeaveController)
);

router.post(
  "/send-otp",
  authenticate,
  apiController.sendOtp.bind(apiController)
);

router.post(
  "/verify-otp",
  authenticate,
  apiController.verifyOtp.bind(apiController)
);

router.put(
  "/updateUserContact/:contact_id",
  authenticate,
  apiController.updateUserContact.bind(apiController)
);

router.get(
  "/getUserContacts",
  authenticate,
  apiController.getUserContacts.bind(apiController)
);

router.get(
  "/getCustomerSubscriptions",
  authenticate,
  productController.getCustomerSubscriptions.bind(productController)
);
router.post(
  "/downloadInvoicePDF",
  authenticate,
  productController.downloadInvoicePDF.bind(productController)
);

// router.get(
//   "/getCustomerSubscriptions",
//   authenticate,
//   productController.getCustomerSubscriptions.bind(productController)
// );
router.get(
  "/getClientLeaveDashboardCount",
  authenticate,
  apiController.getClientLeaveDashboardCount.bind(apiController)
);



router.post(
  "/create/paySlip",
  authenticate,
  PayrollController.createPayslip.bind(PayrollController)
);

router.post(
  "/compute/payslip/:id",
  authenticate,
  PayrollController.computePayslip.bind(PayrollController)
);

router.post(
  "/confirm/payslip/:id",
  authenticate,
  PayrollController.confirmPayslip.bind(PayrollController)
);

router.post(
  "/mark-paid/payslip/:id",
  authenticate,
  PayrollController.markPayslipAsPaid.bind(PayrollController)
);
router.post(
  "/create/PayslipBatch",
  authenticate,
  PayrollController.createPayslipBatch.bind(PayrollController)
);

router.post(
  "/generatePayslips",
  authenticate,
  PayrollController.generatePayslips.bind(PayrollController)
);

router.post(
  "/printPayslip",
  authenticate,
  PayrollController.downloadPayslipPDF.bind(PayrollController)
);

router.post(
  "/print/Payslip",
  authenticate,
  PayrollController.downloadPayslipPDFMobile.bind(PayrollController)
);

router.get(
  "/employee/attendance/export/excel",
  authenticate,
  apiController.exportEmployeeAttendanceExcel.bind(apiController)
);

router.get(
  "/employee/attendance/export/pdf",
  authenticate,
  apiController.exportEmployeeAttendancePDF.bind(apiController)
);
router.put(
  "/update/salary-rule/:id",
  authenticate,
  PayrollController.updateSalaryRule.bind(PayrollController)
);
module.exports = router;
