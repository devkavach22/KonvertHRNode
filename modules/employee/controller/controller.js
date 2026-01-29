// employee.controller.js
const {
  readEmployeeService,
  createBusinessTypeService,
  readBusinessTypeService,
  updateBusinessTypeService,
  deleteBusinessTypeService,
  createBusinessLocationService,
  readBusinessLocationService,
  updateBusinessLocationService,
  deleteBusinessLocationService,
  readAttendancePolicyService,
  updateAttendancePolicyService,
  deleteAttendancePolicyService,
} = require("../service/service.js");

const { odooHelpers } = require("../../../config/odoo.js");
const odooService = require("../../../Masters/services/odoo.service.js");
const {
  getClientFromRequest,
} = require("../../../Masters/services/plan.helper.js");

const createBusinessType = async (req, res) => {
  try {
    const { name } = req.body;

    if (!name || name.trim() === "") {
      return res.status(400).json({
        status: "error",
        message: "Business Type name is required",
      });
    }

    const { client_id } = await getClientFromRequest(req);
    const trimmedName = name.trim();

    const existing = await odooHelpers.searchRead(
      "business.type",
      [["name", "=", trimmedName]],
      ["id"],
      1
    );

    if (existing.length > 0) {
      return res.status(409).json({
        status: "error",
        message: "Business Type with this name already exists",
      });
    }

    const data = {
      name: trimmedName,
      client_id,
    };

    const businessTypeId = await createBusinessTypeService(data);

    return res.status(201).json({
      status: "success",
      message: "Business Type created successfully",
      id: businessTypeId,
    });
  } catch (error) {
    console.error("Error creating business type:", error);

    return res.status(error.status || 500).json({
      status: "error",
      message: error.message || "Failed to create business type",
    });
  }
};

const createBusinessLocation = async (req, res) => {
  try {
    const { name, parent_id } = req.body;

    if (!name || name.trim() === "") {
      return res.status(400).json({
        status: "error",
        message: "Business Location name is required",
      });
    }

    const { client_id } = await getClientFromRequest(req);
    const trimmedName = name.trim();

    const existing = await odooHelpers.searchRead(
      "business.location",
      [["name", "=", trimmedName]],
      ["id"],
      1
    );

    if (existing.length > 0) {
      return res.status(409).json({
        status: "error",
        message: "Business Location with this name already exists",
      });
    }

    const data = {
      name: trimmedName,
      parent_id: parent_id || null,
    };

    if (parent_id) {
      const parentExists = await readBusinessLocationService(
        client_id,
        parseInt(parent_id),
        ["id"]
      );

      if (!parentExists) {
        return res.status(400).json({
          status: "error",
          message: "Parent Business Location does not exist",
        });
      }
    }

    const businessLocationId = await createBusinessLocationService(
      client_id,
      data
    );

    return res.status(201).json({
      status: "success",
      message: "Business Location created successfully",
      id: businessLocationId,
    });
  } catch (error) {
    console.error("Error creating business location:", error);
    return res.status(error.status || 500).json({
      status: "error",
      message: error.message || "Failed to create business location",
    });
  }
};
const getAllBusinessTypes = async (req, res) => {
  try {
    let { fields } = req.query;
    if (fields) {
      fields = fields.split(",");
    }

    const { client_id } = await getClientFromRequest(req);

    const businessTypes = await readBusinessTypeService(
      client_id,
      null,
      fields
    );

    return res.status(200).json({
      status: "success",
      message: "Business Types fetched successfully",
      data: businessTypes,
    });
  } catch (error) {
    console.error("Error fetching business types:", error);
    return res.status(error.status || 500).json({
      status: "error",
      message: error.message || "Failed to fetch business types",
    });
  }
};

const getBusinessTypeById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id || isNaN(id)) {
      return res.status(400).json({
        status: "error",
        message: "Valid Business Type ID is required",
      });
    }

    let { fields } = req.query;
    if (fields) {
      fields = fields.split(",");
    }

    const businessType = await readBusinessTypeService(parseInt(id), fields);

    if (!businessType) {
      return res.status(404).json({
        status: "error",
        message: "Business Type not found",
      });
    }

    return res.status(200).json({
      status: "success",
      message: "Business Type fetched successfully",
      data: businessType,
    });
  } catch (error) {
    console.error("Error fetching business type:", error);
    return res.status(500).json({
      status: "error",
      message: "Failed to fetch business type",
      error: error.message,
    });
  }
};
const updateBusinessType = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id || isNaN(id)) {
      return res.status(400).json({
        status: "error",
        message: "Valid Business Type ID is required",
      });
    }

    const data = { ...req.body };

    if (Object.keys(data).length === 0) {
      return res.status(400).json({
        status: "error",
        message: "No fields to update",
      });
    }

    const { client_id } = await getClientFromRequest(req);

    const isUpdated = await updateBusinessTypeService(
      client_id,
      parseInt(id),
      data
    );

    if (!isUpdated) {
      return res.status(404).json({
        status: "error",
        message: "Business Type not found or access denied",
      });
    }

    return res.status(200).json({
      status: "success",
      message: "Business Type updated successfully",
    });
  } catch (error) {
    console.error("Error updating business type:", error);
    return res.status(error.status || 500).json({
      status: "error",
      message: error.message || "Failed to update business type",
    });
  }
};
const deleteBusinessType = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id || isNaN(id)) {
      return res.status(400).json({
        status: "error",
        message: "Valid Business Type ID is required",
      });
    }

    const { client_id } = await getClientFromRequest(req);

    const deleted = await deleteBusinessTypeService(client_id, parseInt(id));

    if (!deleted) {
      return res.status(404).json({
        status: "error",
        message: "Business Type not found or access denied",
      });
    }

    return res.status(200).json({
      status: "success",
      message: "Business Type deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting business type:", error);
    return res.status(error.status || 500).json({
      status: "error",
      message: error.message || "Failed to delete business type",
    });
  }
};

const getAllBusinessLocations = async (req, res) => {
  try {
    let { fields } = req.query;
    if (fields) {
      fields = fields.split(",");
    }

    const { client_id } = await getClientFromRequest(req);

    const businessLocations = await readBusinessLocationService(
      client_id,
      null,
      fields
    );

    return res.status(200).json({
      status: "success",
      message: "Business Locations fetched successfully",
      data: businessLocations,
    });
  } catch (error) {
    console.error("Error fetching business locations:", error);
    return res.status(error.status || 500).json({
      status: "error",
      message: error.message || "Failed to fetch business locations",
    });
  }
};

const getBusinessLocationById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id || isNaN(id)) {
      return res.status(400).json({
        status: "error",
        message: "Valid Business Location ID is required",
      });
    }

    let { fields } = req.query;
    if (fields) {
      fields = fields.split(",");
    }

    const businessLocation = await readBusinessLocationService(
      parseInt(id),
      fields
    );

    if (!businessLocation) {
      return res.status(404).json({
        status: "error",
        message: "Business Location not found",
      });
    }

    return res.status(200).json({
      status: "success",
      message: "Business Location fetched successfully",
      data: businessLocation,
    });
  } catch (error) {
    console.error("Error fetching business location:", error);
    return res.status(500).json({
      status: "error",
      message: "Failed to fetch business location",
      error: error.message,
    });
  }
};
const updateBusinessLocation = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id || isNaN(id)) {
      return res.status(400).json({
        status: "error",
        message: "Valid Business Location ID is required",
      });
    }

    const data = { ...req.body };

    if (Object.keys(data).length === 0) {
      return res.status(400).json({
        status: "error",
        message: "No fields to update",
      });
    }

    const { client_id } = await getClientFromRequest(req);
    if (data.parent_id) {
      const parentExists = await readBusinessLocationService(
        client_id,
        parseInt(data.parent_id),
        ["id"]
      );

      if (!parentExists) {
        return res.status(400).json({
          status: "error",
          message: "Parent Business Location does not exist",
        });
      }
    }

    const isUpdated = await updateBusinessLocationService(
      client_id,
      parseInt(id),
      data
    );

    if (!isUpdated) {
      return res.status(404).json({
        status: "error",
        message: "Business Location not found or access denied",
      });
    }

    return res.status(200).json({
      status: "success",
      message: "Business Location updated successfully",
    });
  } catch (error) {
    console.error("Error updating business location:", error);
    return res.status(error.status || 500).json({
      status: "error",
      message: error.message || "Failed to update business location",
    });
  }
};

const deleteBusinessLocation = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id || isNaN(id)) {
      return res.status(400).json({
        status: "error",
        message: "Valid Business Location ID is required",
      });
    }

    const { client_id } = await getClientFromRequest(req);

    const deleted = await deleteBusinessLocationService(
      client_id,
      parseInt(id)
    );

    if (!deleted) {
      return res.status(404).json({
        status: "error",
        message: "Business Location not found or access denied",
      });
    }

    return res.status(200).json({
      status: "success",
      message: "Business Location deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting business location:", error);
    return res.status(error.status || 500).json({
      status: "error",
      message: error.message || "Failed to delete business location",
    });
  }
};

const validateAttendancePolicyData = (data, isUpdate = false) => {
  if (!isUpdate && (!data.name || data.name.trim() === "")) {
    return {
      status: 400,
      message: "Attendance Policy name is required",
    };
  }

  if (data.type && !["regular", "accrual"].includes(data.type)) {
    return {
      status: 400,
      message: "Type must be either 'regular' or 'accrual'",
    };
  }

  if (
    data.absent_if &&
    !["in_abs", "out_abs", "in_out_abs"].includes(data.absent_if)
  ) {
    return {
      status: 400,
      message: "Absent If must be 'in_abs', 'out_abs', or 'in_out_abs'",
    };
  }

  const integerFields = [
    "day_after",
    "grace_minutes",
    "no_pay_minutes",
    "half_day_minutes",
    "early_grace_minutes",
    "late_beyond_days",
    "late_beyond_time",
  ];

  for (const field of integerFields) {
    if (data[field] !== undefined) {
      const value = parseInt(data[field], 10);
      if (isNaN(value) || value < 0) {
        return {
          status: 400,
          message: `${field} must be a non-negative integer`,
        };
      }
      data[field] = value;
    }
  }

  return null;
};
const getAllAttendancePolicies = async (req, res) => {
  try {
    const { client_id } = await getClientFromRequest(req);
    const domain = [["client_id", "=", client_id]];
    if (req.query.name) {
      domain.push(["name", "ilike", req.query.name]);
    }

    if (req.query.active !== undefined) {
      const isActive = req.query.active === "true";
      domain.push(["active", "=", isActive]);
    }
    let policies = await odooService.searchRead(
      "attendance.policy",
      domain,
      []
    );
    const removeFields = [
      "create_uid",
      "write_uid",
      "create_date",
      "write_date",
    ];

    policies = policies.map((p) => {
      removeFields.forEach((field) => delete p[field]);
      return p;
    });

    return res.status(200).json({
      status: "success",
      message: "Attendance Policies fetched successfully",
      data: policies,
    });
  } catch (error) {
    console.error("❌ Error fetching attendance policies:", error);
    return res.status(500).json({
      status: "error",
      message: "Failed to fetch attendance policies",
      error: error.message,
    });
  }
};
const createAttendancePolicy = async (req, res) => {
  try {
    console.log("--------------------------------------------------");
    console.log("🚀 API Called: createAttendancePolicy");

    const { client_id } = await getClientFromRequest(req);
    const data = req.body;
    const userIdFromParams = req.query.user_id
      ? parseInt(req.query.user_id)
      : null;

    console.log("user_id from params:", userIdFromParams);
    console.log("client_id:", client_id);

    if (!data.name) {
      return res.status(400).json({
        status: "error",
        message: "Attendance Policy name is required"
      });
    }

    const existing = await odooService.searchRead(
      "attendance.policy",
      [["name", "=", data.name.trim()]],
      ["id"],
      1
    );

    if (existing.length > 0) {
      console.log(`⚠️ Conflict: Policy '${data.name}' already exists`);
      return res.status(409).json({
        status: "error",
        message: "Attendance Policy with this name already exists",
      });
    }

    const vals = {
      name: data.name.trim(),
      type: data.type || "regular",
      early_type: data.type || "regular",
      day_after: data.day_after || 0,
      grace_minutes: data.grace_minutes || 0,
      no_pay_minutes: data.no_pay_minutes || 0,
      half_day_minutes: data.half_day_minutes || 0,
      early_grace_minutes: data.early_grace_minutes || 0,
      late_beyond_days: data.late_beyond_days || 0,
      late_beyond_time: data.late_beyond_time || 0,
      absent_if: data.absent_if || false,
      client_id: client_id,
    };

    const create_uid_value =
      userIdFromParams || (client_id ? parseInt(client_id) : undefined);

    console.log("create_uid will be set to:", create_uid_value);
    console.log("🆕 Creating new policy record...");

    const policyId = await odooHelpers.createWithCustomUid(
      "attendance.policy",
      vals,
      create_uid_value
    );

    console.log(`✅ Success: Policy Created (ID: ${policyId})`);

    return res.status(201).json({
      status: "success",
      message: "Attendance Policy created successfully",
      id: policyId,
      created_by: create_uid_value,
      created_date: new Date().toISOString(),
    });
  } catch (error) {
    console.error("❌ Error in Attendance Policy creation:", error.message);
    return res.status(500).json({
      status: "error",
      message: error.message || "Failed to create policy",
    });
  }
};
const getAttendancePolicyById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id || isNaN(id)) {
      return res.status(400).json({
        status: "error",
        message: "Valid Attendance Policy ID is required",
      });
    }

    let { fields } = req.query;
    if (fields) {
      fields = fields.split(",");
    }

    const policy = await readAttendancePolicyService(parseInt(id), fields);

    if (!policy) {
      return res.status(404).json({
        status: "error",
        message: "Attendance Policy not found",
      });
    }

    return res.status(200).json({
      status: "success",
      message: "Attendance Policy fetched successfully",
      data: policy,
    });
  } catch (error) {
    console.error("Error fetching attendance policy:", error);
    return res.status(500).json({
      status: "error",
      message: "Failed to fetch attendance policy",
      error: error.message,
    });
  }
};

const updateAttendancePolicy = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id || isNaN(id)) {
      return res.status(400).json({
        status: "error",
        message: "Valid Attendance Policy ID is required",
      });
    }

    const data = { ...req.body };

    if (Object.keys(data).length === 0) {
      return res.status(400).json({
        status: "error",
        message: "No fields to update",
      });
    }

    const validationError = validateAttendancePolicyData(data, true);
    if (validationError) {
      return res.status(validationError.status).json({
        status: "error",
        message: validationError.message,
      });
    }

    const isUpdated = await updateAttendancePolicyService(parseInt(id), data);

    if (isUpdated) {
      return res.status(200).json({
        status: "success",
        message: "Attendance Policy updated successfully",
      });
    }

    return res.status(404).json({
      status: "error",
      message: "Attendance Policy not found",
    });
  } catch (error) {
    console.error("Error updating attendance policy:", error);
    return res.status(500).json({
      status: "error",
      message: "Failed to update attendance policy",
      error: error.message,
    });
  }
};
const deleteAttendancePolicy = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id || isNaN(id)) {
      return res.status(400).json({
        status: "error",
        message: "Valid Attendance Policy ID is required",
      });
    }

    const deleted = await deleteAttendancePolicyService(parseInt(id));

    return res.status(200).json({
      status: "success",
      message: "Attendance Policy deleted successfully",
      deleted,
    });
  } catch (error) {
    console.error("Error deleting attendance policy:", error);
    return res.status(500).json({
      status: "error",
      message: "Failed to delete attendance policy",
      error: error.message,
    });
  }
};
const getEmployeeByCode = async (req, res) => {
  try {
    const employee = await readEmployeeService(req.params.code);
    return res.status(200).json({
      message: "Employee fetched successfully",
      data: employee,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Failed to fetch employee",
      error: error.message,
    });
  }
};
const cleanBase64 = (base64String) => {
  if (!base64String || base64String === null) {
    return null;
  }

  try {
    // Remove data URL prefix if present (e.g., "data:image/png;base64,")
    let cleaned = base64String;
    if (cleaned.includes(",")) {
      cleaned = cleaned.split(",")[1];
    }

    // Remove whitespace and newlines
    cleaned = cleaned.replace(/\s/g, "");

    // Validate if it's proper base64
    if (!/^[A-Za-z0-9+/]*={0,2}$/.test(cleaned)) {
      console.error("Invalid base64 format");
      return null;
    }

    // Verify it can be decoded
    Buffer.from(cleaned, "base64");

    return cleaned;
  } catch (error) {
    console.error("Error cleaning base64:", error);
    return null;
  }
};

const createEmployee = async (req, res) => {
  try {
    console.log("createEmployee API Called .........");
    const {
      name,
      father_name,
      gender,
      birthday,
      blood_group,
      private_email,
      present_address,
      permanent_address,
      emergency_contact_name,
      emergency_contact_relation,
      emergency_contact_mobile,
      emergency_contact_address,
      mobile_phone,
      pin_code,
      attendance_policy_id,
      employee_category,
      shift_roster_id,
      resource_calendar_id,
      district_id,
      state_id,
      bussiness_type_id,
      business_location_id,
      job_id,
      department_id,
      work_location_id,
      country_id,
      is_geo_tracking,
      aadhaar_number,
      pan_number,
      voter_id,
      passport_id,
      esi_number,
      category,
      is_uan_number_applicable,
      uan_number,
      cd_employee_num,
      name_of_post_graduation,
      name_of_any_other_education,
      total_experiance,
      religion,
      date_of_marriage,
      probation_period,
      confirmation_date,
      hold_remarks,
      is_lapse_allocation,
      group_company_joining_date,
      week_off,
      grade_band,
      status,
      employee_password,
      hold_status,
      bank_account_id,
      attendance_capture_mode,
      reporting_manager_id,
      head_of_department_id,
      pin,
      type_of_sepration,
      resignation_date,
      notice_period_days,
      joining_date,
      employment_type,
      work_phone,
      marital,
      name_of_site,
      spouse_name,
      driving_license,
      upload_passbook,
      image_1920,
      approvals,
      longitude,
      device_id,
      device_unique_id,
      latitude,
      device_name,
      system_version,
      ip_address,
      device_platform,
      account_number,
      bank_id,
      bank_swift_code,
      bank_iafc_code,
      currency_id,
    } = req.body;

    const cleanedDrivingLicense = cleanBase64(driving_license);
    const cleanedPassbook = cleanBase64(upload_passbook);
    const cleanedImage = cleanBase64(image_1920);

    const requiredFields = {
      name,
      father_name,
      gender,
      birthday,
      blood_group,
      private_email,
      present_address,
      permanent_address,
      emergency_contact_name,
      emergency_contact_relation,
      emergency_contact_mobile,
      is_uan_number_applicable,
      work_phone,
    };

    for (const [field, val] of Object.entries(requiredFields)) {
      if (val === undefined || val === null || val.toString().trim() === "") {
        return res.status(400).json({
          status: "error",
          message: `${field.replace(/_/g, " ")} is required`,
        });
      }
    }

    if (birthday) {
      const birthDate = new Date(birthday);
      const today = new Date();
      let age = today.getFullYear() - birthDate.getFullYear();
      const monthDiff = today.getMonth() - birthDate.getMonth();

      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        age--;
      }

      if (age < 18) {
        return res.status(400).json({
          status: "error",
          message: "Employee must be at least 18 years old",
        });
      }
    }

    // --- PROBATION PERIOD VALIDATION ---
    if (probation_period !== undefined && probation_period !== null && probation_period !== "") {
      const probationValue = parseInt(probation_period);

      if (isNaN(probationValue)) {
        return res.status(400).json({
          status: "error",
          message: "Probation period must be a valid number",
        });
      }

      if (probationValue < 6) {
        return res.status(400).json({
          status: "error",
          message: "Probation period must be minimum 6 months",
        });
      }
    }

    if (is_uan_number_applicable) {
      if (!uan_number)
        return res
          .status(400)
          .json({ status: "error", message: "UAN Number is required" });
      if (!esi_number)
        return res
          .status(400)
          .json({ status: "error", message: "ESI Number is required" });
    }

    if (marital && marital.toLowerCase() === "married") {
      if (!spouse_name || spouse_name.toString().trim() === "") {
        return res.status(400).json({
          status: "error",
          message: "Spouse name is required for married employees",
        });
      }
    }

    // --- BANK ACCOUNT NUMBER VALIDATION ---
    if (account_number) {
      const trimmedAccountNumber = account_number.toString().trim();

      // Check if only numeric
      if (!/^\d+$/.test(trimmedAccountNumber)) {
        return res.status(400).json({
          status: "error",
          message: "Account number should contain only numeric values",
        });
      }

      // Check length (minimum 9, maximum 18)
      if (trimmedAccountNumber.length < 9 || trimmedAccountNumber.length > 18) {
        return res.status(400).json({
          status: "error",
          message: "Account number must be between 9 and 18 digits",
        });
      }

      // Check for duplicate account number with bank_id combination
      if (bank_id) {
        // If bank_id is provided, check for account number + bank_id combination
        const existingAccountWithBank = await odooHelpers.searchRead(
          "res.partner.bank",
          [
            ["acc_number", "=", trimmedAccountNumber],
            ["bank_id", "=", parseInt(bank_id)]
          ],
          ["id", "acc_number", "bank_id"]
        );

        if (existingAccountWithBank.length > 0) {
          console.log("DUPLICATE ACCOUNT NUMBER IN THIS BANK FOUND");
          console.log("Account number:", trimmedAccountNumber);
          console.log("Bank ID:", bank_id);
          console.log("Existing bank account:", existingAccountWithBank[0]);

          return res.status(409).json({
            status: "error",
            message: `Account number in this bank already exists: ${trimmedAccountNumber}`,
          });
        }
      } else {
        // If no bank_id, just check account number alone
        const existingAccount = await odooHelpers.searchRead(
          "res.partner.bank",
          [["acc_number", "=", trimmedAccountNumber]],
          ["id", "acc_number"]
        );

        if (existingAccount.length > 0) {
          console.log("DUPLICATE ACCOUNT NUMBER FOUND");
          console.log("Account number:", trimmedAccountNumber);
          console.log("Existing bank account:", existingAccount[0]);

          return res.status(409).json({
            status: "error",
            message: `Account number already exists: ${trimmedAccountNumber}`,
          });
        }
      }
    }

    const trimmedName = name.trim();
    const trimmedEmail = private_email.trim();

    const existing = await odooHelpers.searchRead(
      "hr.employee",
      [["private_email", "=", trimmedEmail]],
      ["id", "name", "private_email"]
    );

    if (existing.length > 0) {
      console.log("DUPLICATE EMAIL FOUND");
      console.log("Attempting to create with email:", trimmedEmail);
      console.log("Existing employee:", existing[0]);

      return res.status(409).json({
        status: "error",
        message: `Employee already exists with this email: ${trimmedEmail}`,
      });
    }

    // NEW: Unique identification number validation
    const uniqueChecks = [];

    if (aadhaar_number && aadhaar_number.trim() !== "") {
      uniqueChecks.push({
        field: "aadhaar_number",
        value: aadhaar_number.trim(),
        label: "Aadhaar Card"
      });
    }

    if (pan_number && pan_number.trim() !== "") {
      uniqueChecks.push({
        field: "pan_number",
        value: pan_number.trim(),
        label: "PAN Number"
      });
    }

    if (voter_id && voter_id.trim() !== "") {
      uniqueChecks.push({
        field: "voter_id",
        value: voter_id.trim(),
        label: "Voter ID"
      });
    }

    if (passport_id && passport_id.trim() !== "") {
      uniqueChecks.push({
        field: "passport_id",
        value: passport_id.trim(),
        label: "Passport Number"
      });
    }

    if (esi_number && esi_number.trim() !== "") {
      uniqueChecks.push({
        field: "esi_number",
        value: esi_number.trim(),
        label: "ESI Number"
      });
    }

    if (uan_number && uan_number.trim() !== "") {
      uniqueChecks.push({
        field: "uan_number",
        value: uan_number.trim(),
        label: "UAN Number"
      });
    }

    // Check for duplicates
    for (const check of uniqueChecks) {
      const duplicate = await odooHelpers.searchRead(
        "hr.employee",
        [[check.field, "=", check.value]],
        ["id", "name"]
      );

      if (duplicate.length > 0) {
        console.log(`DUPLICATE ${check.label.toUpperCase()} FOUND`);
        console.log(`${check.label}:`, check.value);
        console.log("Existing employee:", duplicate[0]);

        return res.status(409).json({
          status: "error",
          message: `${check.label} already exists for another employee`,
        });
      }
    }

    const { client_id } = await getClientFromRequest(req);
    const userIdFromParams = req.query.user_id
      ? parseInt(req.query.user_id)
      : null;

    console.log("user_id from params:", userIdFromParams);
    console.log("client_id:", client_id);

    let userId = null;
    let employeeId = null;
    let createdBankAccountId = null;

    try {
      console.log("Checking if user already exists with email:", trimmedEmail);
      const existingUser = await odooHelpers.searchRead(
        "res.users",
        [["login", "=", trimmedEmail]],
        ["id", "employee_ids", "partner_id"]
      );

      if (existingUser.length > 0) {
        console.log("User already exists with this email:", existingUser[0]);
        userId = existingUser[0].id;
        const partnerId = existingUser[0].partner_id;
        const partnerIdValue = Array.isArray(partnerId) ? partnerId[0] : partnerId;

        await odooHelpers.write("res.users", userId, {
          is_client_employee_user: true,
        });

        // --- CREATE BANK ACCOUNT IF account_number IS PROVIDED ---
        if (account_number) {
          try {
            console.log("==========================================");
            console.log("CREATING BANK ACCOUNT FOR EXISTING USER");
            console.log("Account number:", account_number);
            console.log("Partner ID (Holder):", partnerIdValue);
            console.log("==========================================");

            const bankAccountData = {
              acc_number: account_number.toString().trim(),
              partner_id: partnerIdValue,
              company_id: 12,
              client_id: client_id ? parseInt(client_id) : undefined,
            };

            // Add optional fields if provided
            if (bank_id) {
              bankAccountData.bank_id = parseInt(bank_id);
            }
            if (bank_swift_code) {
              bankAccountData.bank_swift_code = bank_swift_code;
            }
            if (bank_iafc_code) {
              bankAccountData.bank_iafc_code = bank_iafc_code;
            }
            if (currency_id) {
              bankAccountData.currency_id = parseInt(currency_id);
            }

            createdBankAccountId = await odooHelpers.create(
              "res.partner.bank",
              bankAccountData
            );

            console.log("✓ Bank account created successfully!");
            console.log("✓ Bank account ID:", createdBankAccountId);
            console.log("==========================================");
          } catch (bankCreateError) {
            console.error("==========================================");
            console.error("✗ ERROR creating bank account:", bankCreateError);
            console.error("Error details:", bankCreateError.message);
            console.error("==========================================");

            return res.status(500).json({
              status: "error",
              message: "Failed to create bank account",
              error_details: bankCreateError.message,
            });
          }
        }

        // Update bank account partner_id if bank_account_id is provided
        if (bank_account_id && partnerId) {
          try {
            console.log("BANK ACCOUNT UPDATE PROCESS STARTED");
            console.log("Bank account ID received:", bank_account_id);
            console.log("User's partner_id:", partnerId);

            const bankAccounts = await odooHelpers.searchRead(
              "res.partner.bank",
              [["id", "=", parseInt(bank_account_id)]],
              ["id", "partner_id", "acc_number"]
            );

            console.log("Bank accounts found:", bankAccounts);
            console.log("Number of bank accounts found:", bankAccounts.length);

            if (bankAccounts.length > 0) {
              const bankAccountId = bankAccounts[0].id;
              const oldPartnerId = bankAccounts[0].partner_id;
              const userPartnerId = Array.isArray(partnerId)
                ? partnerId[0]
                : partnerId;

              console.log("Bank account ID to update:", bankAccountId);
              console.log("Old partner_id:", oldPartnerId);
              console.log("New partner_id (user's partner):", userPartnerId);

              await odooHelpers.write("res.partner.bank", bankAccountId, {
                partner_id: userPartnerId,
              });

              console.log("✓ Bank account partner_id SUCCESSFULLY updated!");
              console.log(
                `✓ Bank account ${bankAccountId} partner_id updated from ${oldPartnerId} to ${userPartnerId}`
              );
            } else {
              console.log(
                "✗ ERROR: Bank account with ID",
                bank_account_id,
                "NOT FOUND"
              );
            }
          } catch (bankError) {
            console.error(
              "✗ ERROR updating bank account partner_id:",
              bankError
            );
            console.error("Error details:", bankError.message);
          }
        } else {
          console.log("BANK ACCOUNT UPDATE SKIPPED");
          console.log("bank_account_id provided:", !!bank_account_id);
          console.log("partnerId available:", !!partnerId);
        }

        const data = {
          name: trimmedName,
          father_name,
          gender,
          birthday,
          blood_group,
          private_email: trimmedEmail,
          present_address,
          permanent_address,
          emergency_contact_name,
          emergency_contact_relation,
          emergency_contact_address,
          emergency_contact_mobile,
          mobile_phone,
          pin_code,
          address_id: client_id ? parseInt(client_id) : undefined,
          work_phone,
          marital,
          spouse_name,
          attendance_policy_id: attendance_policy_id
            ? parseInt(attendance_policy_id)
            : undefined,
          employee_category,
          shift_roster_id: shift_roster_id
            ? parseInt(shift_roster_id)
            : undefined,
          resource_calendar_id: resource_calendar_id
            ? parseInt(resource_calendar_id)
            : undefined,
          district_id: district_id ? parseInt(district_id) : undefined,
          state_id: state_id ? parseInt(state_id) : undefined,
          bussiness_type_id: bussiness_type_id
            ? parseInt(bussiness_type_id)
            : undefined,
          business_location_id: business_location_id
            ? parseInt(business_location_id)
            : undefined,
          job_id: job_id ? parseInt(job_id) : undefined,
          department_id: department_id ? parseInt(department_id) : undefined,
          work_location_id: work_location_id
            ? parseInt(work_location_id)
            : undefined,
          country_id: country_id ? parseInt(country_id) : undefined,
          is_geo_tracking: is_geo_tracking ?? false,
          aadhaar_number,
          pan_number,
          voter_id,
          passport_id,
          esi_number,
          category,
          is_uan_number_applicable,
          uan_number,
          cd_employee_num,
          name_of_post_graduation,
          name_of_any_other_education,
          total_experiance,
          religion,
          date_of_marriage,
          probation_period,
          confirmation_date,
          hold_remarks,
          is_lapse_allocation,
          group_company_joining_date,
          week_off,
          grade_band,
          status,
          employee_password,
          hold_status,
          bank_account_id: createdBankAccountId || bank_account_id,
          attendance_capture_mode,
          reporting_manager_id: reporting_manager_id
            ? parseInt(reporting_manager_id)
            : undefined,
          head_of_department_id: head_of_department_id
            ? parseInt(head_of_department_id)
            : undefined,
          pin,
          type_of_sepration,
          resignation_date,
          notice_period_days,
          joining_date,
          employment_type,
          driving_license: cleanedDrivingLicense,
          upload_passbook: cleanedPassbook,
          image_1920: cleanedImage,
          name_of_site: name_of_site ? parseInt(name_of_site) : undefined,
          user_id: userId,
          longitude: longitude || null,
          device_id: device_id || null,
          device_unique_id: device_unique_id || null,
          latitude: latitude || null,
          device_name: device_name || null,
          system_version: system_version || null,
          ip_address: ip_address || null,
          device_platform: device_platform || null,
        };

        const create_uid_value =
          userIdFromParams || (client_id ? parseInt(client_id) : undefined);
        console.log("create_uid will be set to:", create_uid_value);

        employeeId = await odooHelpers.createWithCustomUid(
          "hr.employee",
          data,
          create_uid_value
        );

        console.log("Employee created with ID:", employeeId);

        await odooHelpers.write("res.users", userId, {
          employee_ids: [[4, employeeId]],
        });

        console.log("Linked existing user to new employee");
      } else {
        const userData = {
          name: trimmedName,
          login: trimmedEmail,
          email: trimmedEmail,
          phone: work_phone || "",
          mobile: work_phone || "",
          password: employee_password,
          is_client_employee_user: true,
          first_name: trimmedName, // Employee ka name as first_name
          state_id: state_id ? parseInt(state_id) : undefined,
          city: district_id ? parseInt(district_id) : undefined, // district_id ko city field mein
          country_id: country_id ? parseInt(country_id) : undefined,
        };

        console.log("Creating user with data:", userData);

        userId = await odooHelpers.create("res.users", userData);
        console.log("User created with ID:", userId);

        // Get the partner_id of the newly created user
        const newUser = await odooHelpers.searchRead(
          "res.users",
          [["id", "=", userId]],
          ["partner_id"]
        );

        const partnerId = newUser.length > 0 ? newUser[0].partner_id : null;
        const partnerIdValue = Array.isArray(partnerId) ? partnerId[0] : partnerId;
        console.log("User's partner ID:", partnerId);

        // --- CREATE BANK ACCOUNT IF account_number IS PROVIDED ---
        if (account_number && partnerId) {
          try {
            console.log("==========================================");
            console.log("CREATING BANK ACCOUNT FOR NEW USER");
            console.log("Account number:", account_number);
            console.log("Partner ID (Holder):", partnerIdValue);
            console.log("==========================================");

            const bankAccountData = {
              acc_number: account_number.toString().trim(),
              partner_id: partnerIdValue,
              company_id: 12,
              client_id: client_id ? parseInt(client_id) : undefined,
            };

            // Add optional fields if provided
            if (bank_id) {
              bankAccountData.bank_id = parseInt(bank_id);
            }
            if (bank_swift_code) {
              bankAccountData.bank_swift_code = bank_swift_code;
            }
            if (bank_iafc_code) {
              bankAccountData.bank_iafc_code = bank_iafc_code;
            }
            if (currency_id) {
              bankAccountData.currency_id = parseInt(currency_id);
            }

            createdBankAccountId = await odooHelpers.create(
              "res.partner.bank",
              bankAccountData
            );

            console.log("✓ Bank account created successfully!");
            console.log("✓ Bank account ID:", createdBankAccountId);
            console.log("==========================================");
          } catch (bankCreateError) {
            console.error("==========================================");
            console.error("✗ ERROR creating bank account:", bankCreateError);
            console.error("Error details:", bankCreateError.message);
            console.error("==========================================");

            return res.status(500).json({
              status: "error",
              message: "Failed to create bank account",
              error_details: bankCreateError.message,
            });
          }
        } else {
          console.log("==========================================");
          console.log("BANK ACCOUNT CREATION SKIPPED");
          console.log("account_number provided:", !!account_number);
          console.log("partnerId available:", !!partnerId);
          console.log("==========================================");
        }

        const autoCreatedEmployee = await odooHelpers.searchRead(
          "hr.employee",
          [["user_id", "=", userId]],
          ["id"]
        );

        if (autoCreatedEmployee.length > 0) {
          employeeId = autoCreatedEmployee[0].id;
          console.log("Found auto-created employee with ID:", employeeId);

          const updateData = {
            father_name,
            gender,
            birthday,
            blood_group,
            private_email: trimmedEmail,
            present_address,
            permanent_address,
            emergency_contact_name,
            emergency_contact_relation,
            emergency_contact_address,
            emergency_contact_mobile,
            mobile_phone,
            pin_code,
            address_id: client_id ? parseInt(client_id) : undefined,
            work_phone,
            marital,
            spouse_name,
            attendance_policy_id: attendance_policy_id
              ? parseInt(attendance_policy_id)
              : undefined,
            employee_category,
            shift_roster_id: shift_roster_id
              ? parseInt(shift_roster_id)
              : undefined,
            resource_calendar_id: resource_calendar_id
              ? parseInt(resource_calendar_id)
              : undefined,
            district_id: district_id ? parseInt(district_id) : undefined,
            state_id: state_id ? parseInt(state_id) : undefined,
            bussiness_type_id: bussiness_type_id
              ? parseInt(bussiness_type_id)
              : undefined,
            business_location_id: business_location_id
              ? parseInt(business_location_id)
              : undefined,
            job_id: job_id ? parseInt(job_id) : undefined,
            department_id: department_id ? parseInt(department_id) : undefined,
            work_location_id: work_location_id
              ? parseInt(work_location_id)
              : undefined,
            country_id: country_id ? parseInt(country_id) : undefined,
            is_geo_tracking: is_geo_tracking ?? false,
            aadhaar_number,
            pan_number,
            voter_id,
            passport_id,
            esi_number,
            category,
            is_uan_number_applicable,
            uan_number,
            cd_employee_num,
            name_of_post_graduation,
            name_of_any_other_education,
            total_experiance,
            religion,
            date_of_marriage,
            probation_period,
            confirmation_date,
            hold_remarks,
            is_lapse_allocation,
            group_company_joining_date,
            week_off,
            grade_band,
            status,
            employee_password,
            hold_status,
            bank_account_id: createdBankAccountId || bank_account_id,
            attendance_capture_mode,
            reporting_manager_id: reporting_manager_id
              ? parseInt(reporting_manager_id)
              : undefined,
            head_of_department_id: head_of_department_id
              ? parseInt(head_of_department_id)
              : undefined,
            pin,
            type_of_sepration,
            resignation_date,
            notice_period_days,
            joining_date,
            employment_type,
            driving_license: cleanedDrivingLicense,
            upload_passbook: cleanedPassbook,
            image_1920: cleanedImage,
            name_of_site: name_of_site ? parseInt(name_of_site) : undefined,
            longitude: longitude || null,
            device_id: device_id || null,
            device_unique_id: device_unique_id || null,
            latitude: latitude || null,
            device_name: device_name || null,
            system_version: system_version || null,
            ip_address: ip_address || null,
            device_platform: device_platform || null,
          };

          await odooHelpers.write("hr.employee", employeeId, updateData);
          console.log("Updated employee with all data");
        } else {
          console.error("Auto-created employee not found!");
          return res.status(500).json({
            status: "error",
            message: "Employee auto-creation failed",
          });
        }
      }

      // UPDATED: Handle approvals array of objects
      if (approvals && Array.isArray(approvals) && approvals.length > 0) {
        try {
          console.log("Creating employee approval user details...");

          // Create approval records from the approvals array
          for (let i = 0; i < approvals.length; i++) {
            const approval = approvals[i];

            const approvalData = {
              group_id: parseInt(approval.group_id),
              user_id: parseInt(approval.approval_user_id),
              approval_sequance: parseInt(approval.approval_sequance),
              employee_id: employeeId,
            };

            if (approval.model) {
              approvalData.model = approval.model;
            }

            const approvalId = await odooHelpers.create(
              "employee.approval.user.details",
              approvalData
            );

            console.log(
              `Employee approval user details created with ID: ${approvalId} (Index: ${i})`
            );
          }
        } catch (approvalError) {
          console.error("Error creating approval details:", approvalError);
        }
      }

      try {
        console.log("==========================================");
        console.log("SENDING REGISTRATION CODE EMAIL");
        console.log("Employee ID:", employeeId);
        console.log("==========================================");

        await odooHelpers.callMethod(
          "hr.employee",
          "send_registration_code_email",
          [employeeId]
        );

        console.log("✓ Registration code email sent successfully!");
        console.log("==========================================");
      } catch (emailError) {
        console.error("==========================================");
        console.error("✗ ERROR sending registration code email:", emailError);
        console.error("Error details:", emailError.message);
        console.error("==========================================");
      }

      const create_uid_value =
        userIdFromParams || (client_id ? parseInt(client_id) : undefined);

      return res.status(201).json({
        status: "success",
        message: "Employee and user created successfully",
        id: employeeId,
        user_id: userId,
        bank_account_id: createdBankAccountId || bank_account_id || null,
        created_by: create_uid_value,
        created_date: new Date().toISOString(),
      });
    } catch (userError) {
      console.error("Error in user/employee creation:", userError);

      return res.status(500).json({
        status: "error",
        message: userError.message || "Failed to create employee and user",
        error_details: userError,
      });
    }
  } catch (error) {
    console.error("Error creating employee:", error);
    return res.status(error.status || 500).json({
      status: "error",
      message: error.message || "Failed to create employee",
    });
  }
};
// const createEmployee = async (req, res) => {
//   try {
//     console.log("createEmployee API Called .........");
//     const {
//       name,
//       father_name,
//       gender,
//       birthday,
//       blood_group,
//       private_email,
//       present_address,
//       permanent_address,
//       emergency_contact_name,
//       emergency_contact_relation,
//       emergency_contact_mobile,
//       emergency_contact_address,
//       mobile_phone,
//       pin_code,
//       attendance_policy_id,
//       employee_category,
//       shift_roster_id,
//       resource_calendar_id,
//       district_id,
//       state_id,
//       bussiness_type_id,
//       business_location_id,
//       job_id,
//       department_id,
//       work_location_id,
//       country_id,
//       is_geo_tracking,
//       aadhaar_number,
//       pan_number,
//       voter_id,
//       passport_id,
//       esi_number,
//       category,
//       is_uan_number_applicable,
//       uan_number,
//       cd_employee_num,
//       name_of_post_graduation,
//       name_of_any_other_education,
//       total_experiance,
//       religion,
//       date_of_marriage,
//       probation_period,
//       confirmation_date,
//       hold_remarks,
//       is_lapse_allocation,
//       group_company_joining_date,
//       week_off,
//       grade_band,
//       status,
//       employee_password,
//       hold_status,
//       bank_account_id,
//       attendance_capture_mode,
//       reporting_manager_id,
//       head_of_department_id,
//       pin,
//       type_of_sepration,
//       resignation_date,
//       notice_period_days,
//       joining_date,
//       employment_type,
//       work_phone,
//       marital,
//       name_of_site,
//       spouse_name,
//       driving_license,
//       upload_passbook,
//       image_1920,
//       approvals,
//       longitude,
//       device_id,
//       device_unique_id,
//       latitude,
//       device_name,
//       system_version,
//       ip_address,
//       device_platform,
//       account_number,
//       bank_id,
//       bank_swift_code,
//       bank_iafc_code,
//       currency_id,
//     } = req.body;

//     const cleanedDrivingLicense = cleanBase64(driving_license);
//     const cleanedPassbook = cleanBase64(upload_passbook);
//     const cleanedImage = cleanBase64(image_1920);

//     const requiredFields = {
//       name,
//       father_name,
//       gender,
//       birthday,
//       blood_group,
//       private_email,
//       present_address,
//       permanent_address,
//       emergency_contact_name,
//       emergency_contact_relation,
//       emergency_contact_mobile,
//       is_uan_number_applicable,
//       work_phone,
//     };

//     for (const [field, val] of Object.entries(requiredFields)) {
//       if (val === undefined || val === null || val.toString().trim() === "") {
//         return res.status(400).json({
//           status: "error",
//           message: `${field.replace(/_/g, " ")} is required`,
//         });
//       }
//     }

//     if (birthday) {
//       const birthDate = new Date(birthday);
//       const today = new Date();
//       let age = today.getFullYear() - birthDate.getFullYear();
//       const monthDiff = today.getMonth() - birthDate.getMonth();

//       if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
//         age--;
//       }

//       if (age < 18) {
//         return res.status(400).json({
//           status: "error",
//           message: "Employee must be at least 18 years old",
//         });
//       }
//     }

//     if (is_uan_number_applicable) {
//       if (!uan_number)
//         return res
//           .status(400)
//           .json({ status: "error", message: "UAN Number is required" });
//       if (!esi_number)
//         return res
//           .status(400)
//           .json({ status: "error", message: "ESI Number is required" });
//     }

//     if (marital && marital.toLowerCase() === "married") {
//       if (!spouse_name || spouse_name.toString().trim() === "") {
//         return res.status(400).json({
//           status: "error",
//           message: "Spouse name is required for married employees",
//         });
//       }
//     }

//     // --- CURRENCY CODE TO ID CONVERSION ---
//     let resolvedCurrencyId = null;
//     if (currency_id) {
//       const currencyCode = currency_id.toString().toUpperCase();

//       if (currencyCode !== "INR" && currencyCode !== "USD") {
//         return res.status(400).json({
//           status: "error",
//           message: "Currency must be either INR or USD",
//         });
//       }

//       try {
//         const currencyRecords = await odooHelpers.searchRead(
//           "res.currency",
//           [["name", "=", currencyCode]],
//           ["id", "name"]
//         );

//         if (currencyRecords.length > 0) {
//           resolvedCurrencyId = currencyRecords[0].id;
//           console.log(`Currency ${currencyCode} resolved to ID: ${resolvedCurrencyId}`);
//         } else {
//           return res.status(400).json({
//             status: "error",
//             message: `Currency ${currencyCode} not found in system`,
//           });
//         }
//       } catch (currencyError) {
//         console.error("Error resolving currency:", currencyError);
//         return res.status(500).json({
//           status: "error",
//           message: "Failed to resolve currency",
//         });
//       }
//     }

//     // --- BANK ACCOUNT NUMBER VALIDATION ---
//     if (account_number) {
//       const trimmedAccountNumber = account_number.toString().trim();

//       // Check if only numeric
//       if (!/^\d+$/.test(trimmedAccountNumber)) {
//         return res.status(400).json({
//           status: "error",
//           message: "Account number should contain only numeric values",
//         });
//       }

//       // Check length (minimum 9, maximum 18)
//       if (trimmedAccountNumber.length < 9 || trimmedAccountNumber.length > 18) {
//         return res.status(400).json({
//           status: "error",
//           message: "Account number must be between 9 and 18 digits",
//         });
//       }

//       // Check for duplicate account number
//       const existingAccount = await odooHelpers.searchRead(
//         "res.partner.bank",
//         [["acc_number", "=", trimmedAccountNumber]],
//         ["id", "acc_number"]
//       );

//       if (existingAccount.length > 0) {
//         console.log("DUPLICATE ACCOUNT NUMBER FOUND");
//         console.log("Account number:", trimmedAccountNumber);
//         console.log("Existing bank account:", existingAccount[0]);

//         return res.status(409).json({
//           status: "error",
//           message: `Account number already exists: ${trimmedAccountNumber}`,
//         });
//       }
//     }

//     const trimmedName = name.trim();
//     const trimmedEmail = private_email.trim();

//     const existing = await odooHelpers.searchRead(
//       "hr.employee",
//       [["private_email", "=", trimmedEmail]],
//       ["id", "name", "private_email"]
//     );

//     if (existing.length > 0) {
//       console.log("DUPLICATE EMAIL FOUND");
//       console.log("Attempting to create with email:", trimmedEmail);
//       console.log("Existing employee:", existing[0]);

//       return res.status(409).json({
//         status: "error",
//         message: `Employee already exists with this email: ${trimmedEmail}`,
//       });
//     }

//     // NEW: Unique identification number validation
//     const uniqueChecks = [];

//     if (aadhaar_number && aadhaar_number.trim() !== "") {
//       uniqueChecks.push({
//         field: "aadhaar_number",
//         value: aadhaar_number.trim(),
//         label: "Aadhaar Card"
//       });
//     }

//     if (pan_number && pan_number.trim() !== "") {
//       uniqueChecks.push({
//         field: "pan_number",
//         value: pan_number.trim(),
//         label: "PAN Number"
//       });
//     }

//     if (voter_id && voter_id.trim() !== "") {
//       uniqueChecks.push({
//         field: "voter_id",
//         value: voter_id.trim(),
//         label: "Voter ID"
//       });
//     }

//     if (passport_id && passport_id.trim() !== "") {
//       uniqueChecks.push({
//         field: "passport_id",
//         value: passport_id.trim(),
//         label: "Passport Number"
//       });
//     }

//     if (esi_number && esi_number.trim() !== "") {
//       uniqueChecks.push({
//         field: "esi_number",
//         value: esi_number.trim(),
//         label: "ESI Number"
//       });
//     }

//     if (uan_number && uan_number.trim() !== "") {
//       uniqueChecks.push({
//         field: "uan_number",
//         value: uan_number.trim(),
//         label: "UAN Number"
//       });
//     }

//     // Check for duplicates
//     for (const check of uniqueChecks) {
//       const duplicate = await odooHelpers.searchRead(
//         "hr.employee",
//         [[check.field, "=", check.value]],
//         ["id", "name"]
//       );

//       if (duplicate.length > 0) {
//         console.log(`DUPLICATE ${check.label.toUpperCase()} FOUND`);
//         console.log(`${check.label}:`, check.value);
//         console.log("Existing employee:", duplicate[0]);

//         return res.status(409).json({
//           status: "error",
//           message: `${check.label} already exists for another employee`,
//         });
//       }
//     }

//     const { client_id } = await getClientFromRequest(req);
//     const userIdFromParams = req.query.user_id
//       ? parseInt(req.query.user_id)
//       : null;

//     console.log("user_id from params:", userIdFromParams);
//     console.log("client_id:", client_id);

//     let userId = null;
//     let employeeId = null;
//     let createdBankAccountId = null;

//     try {
//       console.log("Checking if user already exists with email:", trimmedEmail);
//       const existingUser = await odooHelpers.searchRead(
//         "res.users",
//         [["login", "=", trimmedEmail]],
//         ["id", "employee_ids", "partner_id"]
//       );

//       if (existingUser.length > 0) {
//         console.log("User already exists with this email:", existingUser[0]);
//         userId = existingUser[0].id;
//         const partnerId = existingUser[0].partner_id;
//         const partnerIdValue = Array.isArray(partnerId) ? partnerId[0] : partnerId;

//         await odooHelpers.write("res.users", userId, {
//           is_client_employee_user: true,
//         });

//         // --- CREATE BANK ACCOUNT IF account_number IS PROVIDED ---
//         if (account_number) {
//           try {
//             console.log("==========================================");
//             console.log("CREATING BANK ACCOUNT FOR EXISTING USER");
//             console.log("Account number:", account_number);
//             console.log("Partner ID (Holder):", partnerIdValue);
//             console.log("==========================================");

//             const bankAccountData = {
//               acc_number: account_number.toString().trim(),
//               partner_id: partnerIdValue,
//               company_id: 12,
//               client_id: client_id ? parseInt(client_id) : undefined,
//             };

//             // Add optional fields if provided
//             if (bank_id) {
//               bankAccountData.bank_id = parseInt(bank_id);
//             }
//             if (bank_swift_code) {
//               bankAccountData.bank_swift_code = bank_swift_code;
//             }
//             if (bank_iafc_code) {
//               bankAccountData.bank_iafc_code = bank_iafc_code;
//             }
//             if (resolvedCurrencyId) {
//               bankAccountData.currency_id = resolvedCurrencyId;
//             }

//             createdBankAccountId = await odooHelpers.create(
//               "res.partner.bank",
//               bankAccountData
//             );

//             console.log("✓ Bank account created successfully!");
//             console.log("✓ Bank account ID:", createdBankAccountId);
//             console.log("==========================================");
//           } catch (bankCreateError) {
//             console.error("==========================================");
//             console.error("✗ ERROR creating bank account:", bankCreateError);
//             console.error("Error details:", bankCreateError.message);
//             console.error("==========================================");

//             return res.status(500).json({
//               status: "error",
//               message: "Failed to create bank account",
//               error_details: bankCreateError.message,
//             });
//           }
//         }

//         // Update bank account partner_id if bank_account_id is provided
//         if (bank_account_id && partnerId) {
//           try {
//             console.log("BANK ACCOUNT UPDATE PROCESS STARTED");
//             console.log("Bank account ID received:", bank_account_id);
//             console.log("User's partner_id:", partnerId);

//             const bankAccounts = await odooHelpers.searchRead(
//               "res.partner.bank",
//               [["id", "=", parseInt(bank_account_id)]],
//               ["id", "partner_id", "acc_number"]
//             );

//             console.log("Bank accounts found:", bankAccounts);
//             console.log("Number of bank accounts found:", bankAccounts.length);

//             if (bankAccounts.length > 0) {
//               const bankAccountId = bankAccounts[0].id;
//               const oldPartnerId = bankAccounts[0].partner_id;
//               const userPartnerId = Array.isArray(partnerId)
//                 ? partnerId[0]
//                 : partnerId;

//               console.log("Bank account ID to update:", bankAccountId);
//               console.log("Old partner_id:", oldPartnerId);
//               console.log("New partner_id (user's partner):", userPartnerId);

//               await odooHelpers.write("res.partner.bank", bankAccountId, {
//                 partner_id: userPartnerId,
//               });

//               console.log("✓ Bank account partner_id SUCCESSFULLY updated!");
//               console.log(
//                 `✓ Bank account ${bankAccountId} partner_id updated from ${oldPartnerId} to ${userPartnerId}`
//               );
//             } else {
//               console.log(
//                 "✗ ERROR: Bank account with ID",
//                 bank_account_id,
//                 "NOT FOUND"
//               );
//             }
//           } catch (bankError) {
//             console.error(
//               "✗ ERROR updating bank account partner_id:",
//               bankError
//             );
//             console.error("Error details:", bankError.message);
//           }
//         } else {
//           console.log("BANK ACCOUNT UPDATE SKIPPED");
//           console.log("bank_account_id provided:", !!bank_account_id);
//           console.log("partnerId available:", !!partnerId);
//         }

//         const data = {
//           name: trimmedName,
//           father_name,
//           gender,
//           birthday,
//           blood_group,
//           private_email: trimmedEmail,
//           present_address,
//           permanent_address,
//           emergency_contact_name,
//           emergency_contact_relation,
//           emergency_contact_address,
//           emergency_contact_mobile,
//           mobile_phone,
//           pin_code,
//           address_id: client_id ? parseInt(client_id) : undefined,
//           work_phone,
//           marital,
//           spouse_name,
//           attendance_policy_id: attendance_policy_id
//             ? parseInt(attendance_policy_id)
//             : undefined,
//           employee_category,
//           shift_roster_id: shift_roster_id
//             ? parseInt(shift_roster_id)
//             : undefined,
//           resource_calendar_id: resource_calendar_id
//             ? parseInt(resource_calendar_id)
//             : undefined,
//           district_id: district_id ? parseInt(district_id) : undefined,
//           state_id: state_id ? parseInt(state_id) : undefined,
//           bussiness_type_id: bussiness_type_id
//             ? parseInt(bussiness_type_id)
//             : undefined,
//           business_location_id: business_location_id
//             ? parseInt(business_location_id)
//             : undefined,
//           job_id: job_id ? parseInt(job_id) : undefined,
//           department_id: department_id ? parseInt(department_id) : undefined,
//           work_location_id: work_location_id
//             ? parseInt(work_location_id)
//             : undefined,
//           country_id: country_id ? parseInt(country_id) : undefined,
//           is_geo_tracking: is_geo_tracking ?? false,
//           aadhaar_number,
//           pan_number,
//           voter_id,
//           passport_id,
//           esi_number,
//           category,
//           is_uan_number_applicable,
//           uan_number,
//           cd_employee_num,
//           name_of_post_graduation,
//           name_of_any_other_education,
//           total_experiance,
//           religion,
//           date_of_marriage,
//           probation_period,
//           confirmation_date,
//           hold_remarks,
//           is_lapse_allocation,
//           group_company_joining_date,
//           week_off,
//           grade_band,
//           status,
//           employee_password,
//           hold_status,
//           bank_account_id: createdBankAccountId || bank_account_id,
//           attendance_capture_mode,
//           reporting_manager_id: reporting_manager_id
//             ? parseInt(reporting_manager_id)
//             : undefined,
//           head_of_department_id: head_of_department_id
//             ? parseInt(head_of_department_id)
//             : undefined,
//           pin,
//           type_of_sepration,
//           resignation_date,
//           notice_period_days,
//           joining_date,
//           employment_type,
//           driving_license: cleanedDrivingLicense,
//           upload_passbook: cleanedPassbook,
//           image_1920: cleanedImage,
//           name_of_site: name_of_site ? parseInt(name_of_site) : undefined,
//           user_id: userId,
//           longitude: longitude || null,
//           device_id: device_id || null,
//           device_unique_id: device_unique_id || null,
//           latitude: latitude || null,
//           device_name: device_name || null,
//           system_version: system_version || null,
//           ip_address: ip_address || null,
//           device_platform: device_platform || null,
//         };

//         const create_uid_value =
//           userIdFromParams || (client_id ? parseInt(client_id) : undefined);
//         console.log("create_uid will be set to:", create_uid_value);

//         employeeId = await odooHelpers.createWithCustomUid(
//           "hr.employee",
//           data,
//           create_uid_value
//         );

//         console.log("Employee created with ID:", employeeId);

//         await odooHelpers.write("res.users", userId, {
//           employee_ids: [[4, employeeId]],
//         });

//         console.log("Linked existing user to new employee");
//       } else {
//         const userData = {
//           name: trimmedName,
//           login: trimmedEmail,
//           email: trimmedEmail,
//           phone: work_phone || "",
//           mobile: work_phone || "",
//           password: employee_password,
//           is_client_employee_user: true,
//         };

//         console.log("Creating user with data:", userData);

//         userId = await odooHelpers.create("res.users", userData);
//         console.log("User created with ID:", userId);

//         // Get the partner_id of the newly created user
//         const newUser = await odooHelpers.searchRead(
//           "res.users",
//           [["id", "=", userId]],
//           ["partner_id"]
//         );

//         const partnerId = newUser.length > 0 ? newUser[0].partner_id : null;
//         const partnerIdValue = Array.isArray(partnerId) ? partnerId[0] : partnerId;
//         console.log("User's partner ID:", partnerId);

//         // --- CREATE BANK ACCOUNT IF account_number IS PROVIDED ---
//         if (account_number && partnerId) {
//           try {
//             console.log("==========================================");
//             console.log("CREATING BANK ACCOUNT FOR NEW USER");
//             console.log("Account number:", account_number);
//             console.log("Partner ID (Holder):", partnerIdValue);
//             console.log("==========================================");

//             const bankAccountData = {
//               acc_number: account_number.toString().trim(),
//               partner_id: partnerIdValue,
//               company_id: 12,
//               client_id: client_id ? parseInt(client_id) : undefined,
//             };

//             // Add optional fields if provided
//             if (bank_id) {
//               bankAccountData.bank_id = parseInt(bank_id);
//             }
//             if (bank_swift_code) {
//               bankAccountData.bank_swift_code = bank_swift_code;
//             }
//             if (bank_iafc_code) {
//               bankAccountData.bank_iafc_code = bank_iafc_code;
//             }
//             if (resolvedCurrencyId) {
//               bankAccountData.currency_id = resolvedCurrencyId;
//             }

//             createdBankAccountId = await odooHelpers.create(
//               "res.partner.bank",
//               bankAccountData
//             );

//             console.log("✓ Bank account created successfully!");
//             console.log("✓ Bank account ID:", createdBankAccountId);
//             console.log("==========================================");
//           } catch (bankCreateError) {
//             console.error("==========================================");
//             console.error("✗ ERROR creating bank account:", bankCreateError);
//             console.error("Error details:", bankCreateError.message);
//             console.error("==========================================");

//             return res.status(500).json({
//               status: "error",
//               message: "Failed to create bank account",
//               error_details: bankCreateError.message,
//             });
//           }
//         } else {
//           console.log("==========================================");
//           console.log("BANK ACCOUNT CREATION SKIPPED");
//           console.log("account_number provided:", !!account_number);
//           console.log("partnerId available:", !!partnerId);
//           console.log("==========================================");
//         }

//         const autoCreatedEmployee = await odooHelpers.searchRead(
//           "hr.employee",
//           [["user_id", "=", userId]],
//           ["id"]
//         );

//         if (autoCreatedEmployee.length > 0) {
//           employeeId = autoCreatedEmployee[0].id;
//           console.log("Found auto-created employee with ID:", employeeId);

//           const updateData = {
//             father_name,
//             gender,
//             birthday,
//             blood_group,
//             private_email: trimmedEmail,
//             present_address,
//             permanent_address,
//             emergency_contact_name,
//             emergency_contact_relation,
//             emergency_contact_address,
//             emergency_contact_mobile,
//             mobile_phone,
//             pin_code,
//             address_id: client_id ? parseInt(client_id) : undefined,
//             work_phone,
//             marital,
//             spouse_name,
//             attendance_policy_id: attendance_policy_id
//               ? parseInt(attendance_policy_id)
//               : undefined,
//             employee_category,
//             shift_roster_id: shift_roster_id
//               ? parseInt(shift_roster_id)
//               : undefined,
//             resource_calendar_id: resource_calendar_id
//               ? parseInt(resource_calendar_id)
//               : undefined,
//             district_id: district_id ? parseInt(district_id) : undefined,
//             state_id: state_id ? parseInt(state_id) : undefined,
//             bussiness_type_id: bussiness_type_id
//               ? parseInt(bussiness_type_id)
//               : undefined,
//             business_location_id: business_location_id
//               ? parseInt(business_location_id)
//               : undefined,
//             job_id: job_id ? parseInt(job_id) : undefined,
//             department_id: department_id ? parseInt(department_id) : undefined,
//             work_location_id: work_location_id
//               ? parseInt(work_location_id)
//               : undefined,
//             country_id: country_id ? parseInt(country_id) : undefined,
//             is_geo_tracking: is_geo_tracking ?? false,
//             aadhaar_number,
//             pan_number,
//             voter_id,
//             passport_id,
//             esi_number,
//             category,
//             is_uan_number_applicable,
//             uan_number,
//             cd_employee_num,
//             name_of_post_graduation,
//             name_of_any_other_education,
//             total_experiance,
//             religion,
//             date_of_marriage,
//             probation_period,
//             confirmation_date,
//             hold_remarks,
//             is_lapse_allocation,
//             group_company_joining_date,
//             week_off,
//             grade_band,
//             status,
//             employee_password,
//             hold_status,
//             bank_account_id: createdBankAccountId || bank_account_id,
//             attendance_capture_mode,
//             reporting_manager_id: reporting_manager_id
//               ? parseInt(reporting_manager_id)
//               : undefined,
//             head_of_department_id: head_of_department_id
//               ? parseInt(head_of_department_id)
//               : undefined,
//             pin,
//             type_of_sepration,
//             resignation_date,
//             notice_period_days,
//             joining_date,
//             employment_type,
//             driving_license: cleanedDrivingLicense,
//             upload_passbook: cleanedPassbook,
//             image_1920: cleanedImage,
//             name_of_site: name_of_site ? parseInt(name_of_site) : undefined,
//             longitude: longitude || null,
//             device_id: device_id || null,
//             device_unique_id: device_unique_id || null,
//             latitude: latitude || null,
//             device_name: device_name || null,
//             system_version: system_version || null,
//             ip_address: ip_address || null,
//             device_platform: device_platform || null,
//           };

//           await odooHelpers.write("hr.employee", employeeId, updateData);
//           console.log("Updated employee with all data");
//         } else {
//           console.error("Auto-created employee not found!");
//           return res.status(500).json({
//             status: "error",
//             message: "Employee auto-creation failed",
//           });
//         }
//       }

//       // UPDATED: Handle approvals array of objects
//       if (approvals && Array.isArray(approvals) && approvals.length > 0) {
//         try {
//           console.log("Creating employee approval user details...");

//           // Create approval records from the approvals array
//           for (let i = 0; i < approvals.length; i++) {
//             const approval = approvals[i];

//             const approvalData = {
//               group_id: parseInt(approval.group_id),
//               user_id: parseInt(approval.approval_user_id),
//               approval_sequance: parseInt(approval.approval_sequance),
//               employee_id: employeeId,
//             };

//             if (approval.model) {
//               approvalData.model = approval.model;
//             }

//             const approvalId = await odooHelpers.create(
//               "employee.approval.user.details",
//               approvalData
//             );

//             console.log(
//               `Employee approval user details created with ID: ${approvalId} (Index: ${i})`
//             );
//           }
//         } catch (approvalError) {
//           console.error("Error creating approval details:", approvalError);
//         }
//       }

//       try {
//         console.log("==========================================");
//         console.log("SENDING REGISTRATION CODE EMAIL");
//         console.log("Employee ID:", employeeId);
//         console.log("==========================================");

//         await odooHelpers.callMethod(
//           "hr.employee",
//           "send_registration_code_email",
//           [employeeId]
//         );

//         console.log("✓ Registration code email sent successfully!");
//         console.log("==========================================");
//       } catch (emailError) {
//         console.error("==========================================");
//         console.error("✗ ERROR sending registration code email:", emailError);
//         console.error("Error details:", emailError.message);
//         console.error("==========================================");
//       }

//       const create_uid_value =
//         userIdFromParams || (client_id ? parseInt(client_id) : undefined);

//       return res.status(201).json({
//         status: "success",
//         message: "Employee and user created successfully",
//         id: employeeId,
//         user_id: userId,
//         bank_account_id: createdBankAccountId || bank_account_id || null,
//         created_by: create_uid_value,
//         created_date: new Date().toISOString(),
//       });
//     } catch (userError) {
//       console.error("Error in user/employee creation:", userError);

//       return res.status(500).json({
//         status: "error",
//         message: userError.message || "Failed to create employee and user",
//         error_details: userError,
//       });
//     }
//   } catch (error) {
//     console.error("Error creating employee:", error);
//     return res.status(error.status || 500).json({
//       status: "error",
//       message: error.message || "Failed to create employee",
//     });
//   }
// };
const getEmployees = async (req, res) => {
  try {
    const { client_id, currentUser } = await getClientFromRequest(req);
    console.log("API Called get");

    let employeeSearchDomain;

    if (
      currentUser.is_client_employee_user &&
      !currentUser.is_client_employee_admin
    ) {
      employeeSearchDomain = [
        ["address_id", "=", client_id],
        ["user_id", "=", currentUser.id],
      ];
    } else {
      employeeSearchDomain = [["address_id", "=", client_id]];
    }

    const employeeIds = await odooHelpers.searchRead(
      "hr.employee",
      employeeSearchDomain,
      ["id"]
    );

    const employees = [];
    for (let emp of employeeIds) {
      try {
        const employeeData = await odooHelpers.searchRead(
          "hr.employee",
          [["id", "=", emp.id]],
          [
            "id", "name", "father_name", "gender", "birthday", "blood_group",
            "private_email", "present_address", "permanent_address",
            "emergency_contact_name", "emergency_contact_relation",
            "emergency_contact_mobile", "emergency_contact_address",
            "mobile_phone", "pin_code", "work_phone", "marital", "spouse_name",
            "attendance_policy_id", "employee_category", "shift_roster_id",
            "resource_calendar_id", "district_id", "state_id", "bussiness_type_id",
            "business_location_id", "job_id", "department_id", "work_location_id",
            "country_id", "is_geo_tracking", "aadhaar_number", "pan_number",
            "voter_id", "passport_id", "esi_number", "category",
            "is_uan_number_applicable", "uan_number", "cd_employee_num",
            "name_of_post_graduation", "name_of_any_other_education",
            "total_experiance", "religion", "date_of_marriage", "probation_period",
            "confirmation_date", "hold_remarks", "is_lapse_allocation",
            "group_company_joining_date", "week_off", "grade_band", "status",
            "employee_password", "hold_status", "bank_account_id",
            "attendance_capture_mode", "reporting_manager_id",
            "head_of_department_id", "barcode", "pin", "type_of_sepration",
            "resignation_date", "notice_period_days", "joining_date",
            "employment_type", "user_id", "driving_license", "upload_passbook",
            "image_1920", "name_of_site", "longitude", "device_id",
            "device_unique_id", "latitude", "device_name", "system_version",
            "ip_address", "device_platform", "random_code_for_reg",
          ]
        );

        if (employeeData.length > 0) {
          const employee = employeeData[0];

          // --- CLEANUP: false/null ko empty string se replace karein ---
          Object.keys(employee).forEach((key) => {
            if (employee[key] === false || employee[key] === null) {
              employee[key] = "";
            }
          });

          // Fetch approval details - Added 'model' field
          const approvalDetails = await odooHelpers.searchRead(
            "employee.approval.user.details",
            [["employee_id", "=", employee.id]],
            ["group_id", "user_id", "approval_sequance", "model"]
          );

          // Transform approval details into array of objects
          if (approvalDetails.length > 0) {
            employee.approvals = approvalDetails.map(approval => ({
              group_id: Array.isArray(approval.group_id) ? approval.group_id[0] : approval.group_id || "",
              approval_user_id: Array.isArray(approval.user_id) ? approval.user_id[0] : approval.user_id || "",
              approval_sequance: approval.approval_sequance || "",
              model: approval.model || ""
            }));
          } else {
            employee.approvals = [];
          }

          // --- FETCH BANK ACCOUNT DETAILS ---
          if (employee.bank_account_id && Array.isArray(employee.bank_account_id) && employee.bank_account_id.length > 0) {
            try {
              const bankAccountId = employee.bank_account_id[0];
              const bankAccountData = await odooHelpers.searchRead(
                "res.partner.bank",
                [["id", "=", bankAccountId]],
                ["acc_number", "bank_id", "bank_swift_code", "bank_iafc_code", "currency_id", "partner_id", "company_id", "client_id"]
              );

              if (bankAccountData.length > 0) {
                const bankAccount = bankAccountData[0];
                employee.bank_account_details = {
                  account_number: bankAccount.acc_number || "",
                  bank_id: Array.isArray(bankAccount.bank_id) ? bankAccount.bank_id[0] : bankAccount.bank_id || "",
                  bank_name: Array.isArray(bankAccount.bank_id) ? bankAccount.bank_id[1] : "",
                  bank_swift_code: bankAccount.bank_swift_code || "",
                  bank_iafc_code: bankAccount.bank_iafc_code || "",
                  currency_id: Array.isArray(bankAccount.currency_id) ? bankAccount.currency_id[0] : bankAccount.currency_id || "",
                  currency_name: Array.isArray(bankAccount.currency_id) ? bankAccount.currency_id[1] : "",
                  partner_id: Array.isArray(bankAccount.partner_id) ? bankAccount.partner_id[0] : bankAccount.partner_id || "",
                  company_id: Array.isArray(bankAccount.company_id) ? bankAccount.company_id[0] : bankAccount.company_id || "",
                  client_id: Array.isArray(bankAccount.client_id) ? bankAccount.client_id[0] : bankAccount.client_id || "",
                };
              } else {
                employee.bank_account_details = {};
              }
            } catch (bankError) {
              console.error(`Error fetching bank account for employee ${employee.id}:`, bankError);
              employee.bank_account_details = {};
            }
          } else {
            employee.bank_account_details = {};
          }

          employees.push(employee);
        }
      } catch (empError) {
        console.error(`Error fetching employee ${emp.id}:`, empError);
      }
    }

    return res.status(200).json({
      status: "success",
      count: employees.length,
      data: employees,
    });
  } catch (error) {
    console.error("Error fetching employees:", error);
    return res.status(error.status || 500).json({
      status: "error",
      message: error.message || "Failed to fetch employees",
    });
  }
};
const getEmployeeById = async (req, res) => {
  try {
    const { client_id } = await getClientFromRequest(req);
    const { id } = req.params;
    console.log(`API Called: Get Employee ID ${id}`);

    const employeeData = await odooHelpers.searchRead(
      "hr.employee",
      [
        ["id", "=", parseInt(id)],
        ["address_id", "=", client_id],
      ],
      [
        "id", "name", "father_name", "gender", "birthday", "blood_group",
        "private_email", "present_address", "permanent_address",
        "emergency_contact_name", "emergency_contact_relation",
        "emergency_contact_mobile", "emergency_contact_address",
        "mobile_phone", "pin_code", "work_phone", "marital", "spouse_name",
        "attendance_policy_id", "employee_category", "shift_roster_id",
        "resource_calendar_id", "district_id", "state_id", "bussiness_type_id",
        "business_location_id", "job_id", "department_id", "work_location_id",
        "country_id", "is_geo_tracking", "aadhaar_number", "pan_number",
        "voter_id", "passport_id", "esi_number", "category",
        "is_uan_number_applicable", "uan_number", "cd_employee_num",
        "name_of_post_graduation", "name_of_any_other_education",
        "total_experiance", "religion", "date_of_marriage", "probation_period",
        "confirmation_date", "hold_remarks", "is_lapse_allocation",
        "group_company_joining_date", "week_off", "grade_band", "status",
        "employee_password", "hold_status", "bank_account_id",
        "attendance_capture_mode", "reporting_manager_id",
        "head_of_department_id", "barcode", "pin", "type_of_sepration",
        "resignation_date", "notice_period_days", "joining_date",
        "employment_type", "user_id", "driving_license", "upload_passbook",
        "image_1920", "name_of_site", "longitude", "device_id",
        "device_unique_id", "latitude", "device_name", "system_version",
        "ip_address", "device_platform", "random_code_for_reg",
      ]
    );

    if (!employeeData || employeeData.length === 0) {
      return res.status(404).json({
        status: "error",
        message: "No employee found",
      });
    }

    const employee = employeeData[0];

    // Cleanup logic
    Object.keys(employee).forEach((key) => {
      if (employee[key] === false || employee[key] === null) {
        employee[key] = "";
      }
    });

    // Fetch approval details
    const approvalDetails = await odooHelpers.searchRead(
      "employee.approval.user.details",
      [["employee_id", "=", employee.id]],
      ["group_id", "user_id", "approval_sequance", "model"]
    );

    // Transform approval details into array of objects
    if (approvalDetails.length > 0) {
      employee.approvals = approvalDetails.map(approval => ({
        group_id: Array.isArray(approval.group_id) ? approval.group_id[0] : approval.group_id || "",
        approval_user_id: Array.isArray(approval.user_id) ? approval.user_id[0] : approval.user_id || "",
        approval_sequance: approval.approval_sequance || "",
        model: approval.model || ""
      }));
    } else {
      employee.approvals = [];
    }

    // --- FETCH BANK ACCOUNT DETAILS ---
    if (employee.bank_account_id && Array.isArray(employee.bank_account_id) && employee.bank_account_id.length > 0) {
      try {
        const bankAccountId = employee.bank_account_id[0];
        const bankAccountData = await odooHelpers.searchRead(
          "res.partner.bank",
          [["id", "=", bankAccountId]],
          ["acc_number", "bank_id", "bank_swift_code", "bank_iafc_code", "currency_id", "partner_id", "company_id", "client_id"]
        );

        if (bankAccountData.length > 0) {
          const bankAccount = bankAccountData[0];
          employee.bank_account_details = {
            account_number: bankAccount.acc_number || "",
            bank_id: Array.isArray(bankAccount.bank_id) ? bankAccount.bank_id[0] : bankAccount.bank_id || "",
            bank_name: Array.isArray(bankAccount.bank_id) ? bankAccount.bank_id[1] : "",
            bank_swift_code: bankAccount.bank_swift_code || "",
            bank_iafc_code: bankAccount.bank_iafc_code || "",
            currency_id: Array.isArray(bankAccount.currency_id) ? bankAccount.currency_id[0] : bankAccount.currency_id || "",
            currency_name: Array.isArray(bankAccount.currency_id) ? bankAccount.currency_id[1] : "",
            partner_id: Array.isArray(bankAccount.partner_id) ? bankAccount.partner_id[0] : bankAccount.partner_id || "",
            company_id: Array.isArray(bankAccount.company_id) ? bankAccount.company_id[0] : bankAccount.company_id || "",
            client_id: Array.isArray(bankAccount.client_id) ? bankAccount.client_id[0] : bankAccount.client_id || "",
          };
        } else {
          employee.bank_account_details = {};
        }
      } catch (bankError) {
        console.error(`Error fetching bank account for employee ${employee.id}:`, bankError);
        employee.bank_account_details = {};
      }
    } else {
      employee.bank_account_details = {};
    }

    return res.status(200).json({
      status: "success",
      data: employee,
    });
  } catch (error) {
    console.error("Error fetching employee by ID:", error);
    return res.status(error.status || 500).json({
      status: "error",
      message: error.message || "Failed to fetch employee",
    });
  }
};
// const updateEmployee = async (req, res) => {
//   try {
//     const { id } = req.params;

//     if (!id) {
//       return res.status(400).json({
//         status: "error",
//         message: "Employee ID is required",
//       });
//     }

//     const {
//       name,
//       father_name,
//       gender,
//       birthday,
//       blood_group,
//       private_email,
//       present_address,
//       permanent_address,
//       emergency_contact_name,
//       emergency_contact_relation,
//       emergency_contact_mobile,
//       emergency_contact_address,
//       mobile_phone,
//       pin_code,
//       attendance_policy_id,
//       employee_category,
//       shift_roster_id,
//       resource_calendar_id,
//       district_id,
//       state_id,
//       bussiness_type_id,
//       business_location_id,
//       job_id,
//       department_id,
//       work_location_id,
//       country_id,
//       is_geo_tracking,
//       aadhaar_number,
//       pan_number,
//       voter_id,
//       passport_id,
//       esi_number,
//       category,
//       is_uan_number_applicable,
//       uan_number,
//       cd_employee_num,
//       name_of_post_graduation,
//       name_of_any_other_education,
//       total_experiance,
//       religion,
//       date_of_marriage,
//       probation_period,
//       confirmation_date,
//       hold_remarks,
//       is_lapse_allocation,
//       group_company_joining_date,
//       week_off,
//       grade_band,
//       status,
//       employee_password,
//       hold_status,
//       bank_account_id,
//       attendance_capture_mode,
//       reporting_manager_id,
//       head_of_department_id,
//       barcode,
//       pin,
//       type_of_sepration,
//       resignation_date,
//       notice_period_days,
//       joining_date,
//       employment_type,
//       work_phone,
//       marital,
//       driving_license,
//       upload_passbook,
//       image_1920,
//       spouse_name,
//       name_of_site,
//       approvals,
//       longitude,
//       device_id,
//       device_unique_id,
//       latitude,
//       device_name,
//       system_version,
//       ip_address,
//       device_platform,
//       account_number,
//     } = req.body;

//     const existingEmployee = await odooHelpers.searchRead(
//       "hr.employee",
//       [["id", "=", parseInt(id)]],
//       ["id", "name", "private_email", "user_id"]
//     );

//     if (existingEmployee.length === 0) {
//       return res.status(404).json({
//         status: "error",
//         message: "Employee not found",
//       });
//     }

//     const currentEmployee = existingEmployee[0];

//     // UPDATED: Only check for duplicates if email is actually being changed
//     if (private_email !== undefined) {
//       const trimmedEmail = private_email.trim();

//       // Only check if the new email is different from current email
//       if (trimmedEmail !== currentEmployee.private_email) {
//         const duplicate = await odooHelpers.searchRead(
//           "hr.employee",
//           [
//             "&",
//             ["id", "!=", parseInt(id)],
//             ["private_email", "=", trimmedEmail]
//           ],
//           ["id", "name", "private_email"]
//         );

//         if (duplicate.length > 0) {
//           console.log("==========================================");
//           console.log("DUPLICATE EMAIL FOUND DURING UPDATE");
//           console.log("Attempting to update with email:", trimmedEmail);
//           console.log("Existing employee:", duplicate[0]);
//           console.log("==========================================");

//           return res.status(409).json({
//             status: "error",
//             message: `Another employee already exists with this email: ${trimmedEmail}`,
//           });
//         }
//       }
//     }

//     // UPDATED: Check for unique identification numbers only if they're being changed
//     const uniqueChecks = [];

//     if (aadhaar_number !== undefined && aadhaar_number.trim() !== "") {
//       uniqueChecks.push({
//         field: "aadhaar_number",
//         value: aadhaar_number.trim(),
//         label: "Aadhaar Card"
//       });
//     }

//     if (pan_number !== undefined && pan_number.trim() !== "") {
//       uniqueChecks.push({
//         field: "pan_number",
//         value: pan_number.trim(),
//         label: "PAN Number"
//       });
//     }

//     if (voter_id !== undefined && voter_id.trim() !== "") {
//       uniqueChecks.push({
//         field: "voter_id",
//         value: voter_id.trim(),
//         label: "Voter ID"
//       });
//     }

//     if (passport_id !== undefined && passport_id.trim() !== "") {
//       uniqueChecks.push({
//         field: "passport_id",
//         value: passport_id.trim(),
//         label: "Passport Number"
//       });
//     }

//     if (esi_number !== undefined && esi_number.trim() !== "") {
//       uniqueChecks.push({
//         field: "esi_number",
//         value: esi_number.trim(),
//         label: "ESI Number"
//       });
//     }

//     if (uan_number !== undefined && uan_number.trim() !== "") {
//       uniqueChecks.push({
//         field: "uan_number",
//         value: uan_number.trim(),
//         label: "UAN Number"
//       });
//     }

//     // Check for duplicates (excluding current employee)
//     for (const check of uniqueChecks) {
//       const duplicate = await odooHelpers.searchRead(
//         "hr.employee",
//         [
//           "&",
//           ["id", "!=", parseInt(id)],
//           [check.field, "=", check.value]
//         ],
//         ["id", "name"]
//       );

//       if (duplicate.length > 0) {
//         console.log("==========================================");
//         console.log(`DUPLICATE ${check.label.toUpperCase()} FOUND`);
//         console.log(`${check.label}:`, check.value);
//         console.log("Existing employee:", duplicate[0]);
//         console.log("==========================================");

//         return res.status(409).json({
//           status: "error",
//           message: `${check.label} already exists for another employee`,
//         });
//       }
//     }

//     if (is_uan_number_applicable === true) {
//       if (!uan_number && !currentEmployee.uan_number) {
//         return res.status(400).json({
//           status: "error",
//           message: "UAN Number is required",
//         });
//       }
//       if (!esi_number && !currentEmployee.esi_number) {
//         return res.status(400).json({
//           status: "error",
//           message: "ESI Number is required",
//         });
//       }
//     }

//     const { client_id } = await getClientFromRequest(req);
//     const userIdFromParams = req.query.user_id
//       ? parseInt(req.query.user_id)
//       : null;

//     console.log("user_id from params (for write_uid):", userIdFromParams);
//     console.log("client_id:", client_id);

//     const data = {};

//     if (name !== undefined) data.name = name.trim();
//     if (father_name !== undefined) data.father_name = father_name;
//     if (gender !== undefined) data.gender = gender;
//     if (birthday !== undefined) data.birthday = birthday;
//     if (blood_group !== undefined) data.blood_group = blood_group;
//     if (private_email !== undefined) data.private_email = private_email.trim();
//     if (present_address !== undefined) data.present_address = present_address;
//     if (permanent_address !== undefined)
//       data.permanent_address = permanent_address;
//     if (emergency_contact_name !== undefined)
//       data.emergency_contact_name = emergency_contact_name;
//     if (emergency_contact_relation !== undefined)
//       data.emergency_contact_relation = emergency_contact_relation;
//     if (emergency_contact_address !== undefined)
//       data.emergency_contact_address = emergency_contact_address;
//     if (emergency_contact_mobile !== undefined)
//       data.emergency_contact_mobile = emergency_contact_mobile;
//     if (mobile_phone !== undefined) data.mobile_phone = mobile_phone;
//     if (pin_code !== undefined) data.pin_code = pin_code;

//     if (client_id) {
//       data.address_id = parseInt(client_id);
//     }
//     if (work_phone !== undefined) data.work_phone = work_phone;
//     if (marital !== undefined) data.marital = marital;
//     if (spouse_name !== undefined) data.spouse_name = spouse_name;
//     if (attendance_policy_id !== undefined)
//       data.attendance_policy_id = parseInt(attendance_policy_id);
//     if (employee_category !== undefined)
//       data.employee_category = employee_category;
//     if (shift_roster_id !== undefined)
//       data.shift_roster_id = parseInt(shift_roster_id);
//     if (resource_calendar_id !== undefined)
//       data.resource_calendar_id = parseInt(resource_calendar_id);
//     if (district_id !== undefined) data.district_id = parseInt(district_id);
//     if (state_id !== undefined) data.state_id = parseInt(state_id);
//     if (bussiness_type_id !== undefined)
//       data.bussiness_type_id = parseInt(bussiness_type_id);
//     if (business_location_id !== undefined)
//       data.business_location_id = parseInt(business_location_id);
//     if (job_id !== undefined) data.job_id = parseInt(job_id);
//     if (department_id !== undefined)
//       data.department_id = parseInt(department_id);
//     if (work_location_id !== undefined)
//       data.work_location_id = parseInt(work_location_id);
//     if (country_id !== undefined) data.country_id = parseInt(country_id);
//     if (is_geo_tracking !== undefined) data.is_geo_tracking = is_geo_tracking;
//     if (aadhaar_number !== undefined) data.aadhaar_number = aadhaar_number;
//     if (pan_number !== undefined) data.pan_number = pan_number;
//     if (voter_id !== undefined) data.voter_id = voter_id;
//     if (passport_id !== undefined) data.passport_id = passport_id;
//     if (esi_number !== undefined) data.esi_number = esi_number;
//     if (category !== undefined) data.category = category;
//     if (is_uan_number_applicable !== undefined)
//       data.is_uan_number_applicable = is_uan_number_applicable;
//     if (uan_number !== undefined) data.uan_number = uan_number;
//     if (cd_employee_num !== undefined) data.cd_employee_num = cd_employee_num;
//     if (name_of_post_graduation !== undefined)
//       data.name_of_post_graduation = name_of_post_graduation;
//     if (name_of_any_other_education !== undefined)
//       data.name_of_any_other_education = name_of_any_other_education;
//     if (total_experiance !== undefined)
//       data.total_experiance = total_experiance;
//     if (religion !== undefined) data.religion = religion;
//     if (date_of_marriage !== undefined)
//       data.date_of_marriage = date_of_marriage;
//     if (probation_period !== undefined)
//       data.probation_period = probation_period;
//     if (confirmation_date !== undefined)
//       data.confirmation_date = confirmation_date;
//     if (hold_remarks !== undefined) data.hold_remarks = hold_remarks;
//     if (is_lapse_allocation !== undefined)
//       data.is_lapse_allocation = is_lapse_allocation;
//     if (group_company_joining_date !== undefined)
//       data.group_company_joining_date = group_company_joining_date;
//     if (week_off !== undefined) data.week_off = week_off;
//     if (grade_band !== undefined) data.grade_band = grade_band;
//     if (status !== undefined) data.status = status;
//     if (employee_password !== undefined)
//       data.employee_password = employee_password;
//     if (hold_status !== undefined) data.hold_status = hold_status;
//     if (bank_account_id !== undefined) data.bank_account_id = bank_account_id;
//     if (attendance_capture_mode !== undefined)
//       data.attendance_capture_mode = attendance_capture_mode;
//     if (reporting_manager_id !== undefined)
//       data.reporting_manager_id = parseInt(reporting_manager_id);
//     if (head_of_department_id !== undefined)
//       data.head_of_department_id = parseInt(head_of_department_id);
//     if (barcode !== undefined) data.barcode = barcode;
//     if (pin !== undefined) data.pin = pin;
//     if (type_of_sepration !== undefined)
//       data.type_of_sepration = type_of_sepration;
//     if (resignation_date !== undefined)
//       data.resignation_date = resignation_date;
//     if (notice_period_days !== undefined)
//       data.notice_period_days = notice_period_days;
//     if (joining_date !== undefined) data.joining_date = joining_date;
//     if (employment_type !== undefined) data.employment_type = employment_type;
//     if (driving_license !== undefined) data.driving_license = driving_license;
//     if (upload_passbook !== undefined) data.upload_passbook = upload_passbook;
//     if (image_1920 !== undefined) data.image_1920 = image_1920;
//     if (name_of_site !== undefined) data.name_of_site = parseInt(name_of_site);
//     if (longitude !== undefined) data.longitude = longitude;
//     if (device_id !== undefined) data.device_id = device_id;
//     if (device_unique_id !== undefined) data.device_unique_id = device_unique_id;
//     if (latitude !== undefined) data.latitude = latitude;
//     if (device_name !== undefined) data.device_name = device_name;
//     if (system_version !== undefined) data.system_version = system_version;
//     if (ip_address !== undefined) data.ip_address = ip_address;
//     if (device_platform !== undefined) data.device_platform = device_platform;

//     await odooHelpers.write("hr.employee", parseInt(id), data);
//     console.log("Employee updated with ID:", id);

//     const write_uid_value =
//       userIdFromParams || (client_id ? parseInt(client_id) : undefined);
//     console.log("write_uid will be set to:", write_uid_value);

//     if (write_uid_value) {
//       try {
//         const tableName = "hr_employee";

//         await odooHelpers.updateAuditFields(
//           tableName,
//           [parseInt(id)],
//           null,
//           write_uid_value
//         );

//         console.log(
//           `Successfully updated write_uid to ${write_uid_value} for employee ${id}`
//         );
//       } catch (auditError) {
//         console.error("Failed to update write_uid:", auditError.message);
//       }
//     }

//     // UPDATED: Handle approvals array
//     if (approvals && Array.isArray(approvals) && approvals.length > 0) {
//       try {
//         console.log("Updating employee approval user details...");

//         const existingApprovals = await odooHelpers.searchRead(
//           "employee.approval.user.details",
//           [["employee_id", "=", parseInt(id)]],
//           ["id"]
//         );

//         if (existingApprovals.length > 0) {
//           const approvalIds = existingApprovals.map(a => a.id);
//           await odooHelpers.unlink("employee.approval.user.details", approvalIds);
//           console.log(`Deleted ${approvalIds.length} existing approval records`);
//         }

//         // Create approval records from the approvals array
//         for (let i = 0; i < approvals.length; i++) {
//           const approval = approvals[i];

//           const approvalData = {
//             group_id: parseInt(approval.group_id),
//             user_id: parseInt(approval.approval_user_id),
//             approval_sequance: parseInt(approval.approval_sequance),
//             employee_id: parseInt(id),
//           };

//           if (approval.model) {
//             approvalData.model = approval.model;
//           }

//           const approvalId = await odooHelpers.create(
//             "employee.approval.user.details",
//             approvalData
//           );

//           console.log(
//             `Employee approval user details created with ID: ${approvalId} (Index: ${i})`
//           );
//         }
//       } catch (approvalError) {
//         console.error("Error updating approval details:", approvalError);
//       }
//     }

//     let userUpdateStatus = null;
//     if (private_email && currentEmployee.user_id) {
//       try {
//         const trimmedEmail = private_email.trim();
//         const updateUserData = {
//           login: trimmedEmail,
//           email: trimmedEmail,
//         };

//         if (name) updateUserData.name = name.trim();
//         if (work_phone) updateUserData.phone = work_phone;
//         if (mobile_phone) updateUserData.mobile = mobile_phone;

//         await odooHelpers.write(
//           "res.users",
//           currentEmployee.user_id,
//           updateUserData
//         );
//         console.log("User updated with ID:", currentEmployee.user_id);
//         userUpdateStatus = "updated";
//       } catch (userError) {
//         console.error("Error updating user:", userError);
//         userUpdateStatus = "failed";
//       }
//     }

//     return res.status(200).json({
//       status: "success",
//       message: "Employee updated successfully",
//       id: parseInt(id),
//       user_id: currentEmployee.user_id,
//       updated_by: write_uid_value
//     });
//   } catch (error) {
//     console.error("Error updating employee:", error);
//     return res.status(error.status || 500).json({
//       status: "error",
//       message: error.message || "Failed to update employee",
//     });
//   }
// };

const updateEmployee = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        status: "error",
        message: "Employee ID is required",
      });
    }

    const {
      name,
      father_name,
      gender,
      birthday,
      blood_group,
      private_email,
      present_address,
      permanent_address,
      emergency_contact_name,
      emergency_contact_relation,
      emergency_contact_mobile,
      emergency_contact_address,
      mobile_phone,
      pin_code,
      attendance_policy_id,
      employee_category,
      shift_roster_id,
      resource_calendar_id,
      district_id,
      state_id,
      bussiness_type_id,
      business_location_id,
      job_id,
      department_id,
      work_location_id,
      country_id,
      is_geo_tracking,
      aadhaar_number,
      pan_number,
      voter_id,
      passport_id,
      esi_number,
      category,
      is_uan_number_applicable,
      uan_number,
      cd_employee_num,
      name_of_post_graduation,
      name_of_any_other_education,
      total_experiance,
      religion,
      date_of_marriage,
      probation_period,
      confirmation_date,
      hold_remarks,
      is_lapse_allocation,
      group_company_joining_date,
      week_off,
      grade_band,
      status,
      employee_password,
      hold_status,
      bank_account_id,
      attendance_capture_mode,
      reporting_manager_id,
      head_of_department_id,
      barcode,
      pin,
      type_of_sepration,
      resignation_date,
      notice_period_days,
      joining_date,
      employment_type,
      work_phone,
      marital,
      driving_license,
      upload_passbook,
      image_1920,
      spouse_name,
      name_of_site,
      approvals,
      longitude,
      device_id,
      device_unique_id,
      latitude,
      device_name,
      system_version,
      ip_address,
      device_platform,
      account_number,
      bank_id,
      bank_swift_code,
      bank_iafc_code,
      currency_id,
    } = req.body;

    // Fetch existing employee with all unique fields
    const existingEmployee = await odooHelpers.searchRead(
      "hr.employee",
      [["id", "=", parseInt(id)]],
      ["id", "name", "private_email", "user_id", "aadhaar_number", "pan_number",
        "voter_id", "passport_id", "esi_number", "uan_number", "bank_account_id"]
    );

    if (existingEmployee.length === 0) {
      return res.status(404).json({
        status: "error",
        message: "Employee not found",
      });
    }

    const currentEmployee = existingEmployee[0];

    // Only check for duplicates if email is actually being changed
    if (private_email !== undefined) {
      const trimmedEmail = private_email.trim();

      // Only check if the new email is different from current email
      if (trimmedEmail !== currentEmployee.private_email) {
        const duplicate = await odooHelpers.searchRead(
          "hr.employee",
          [
            "&",
            ["id", "!=", parseInt(id)],
            ["private_email", "=", trimmedEmail]
          ],
          ["id", "name", "private_email"]
        );

        if (duplicate.length > 0) {
          console.log("==========================================");
          console.log("DUPLICATE EMAIL FOUND DURING UPDATE");
          console.log("Attempting to update with email:", trimmedEmail);
          console.log("Existing employee:", duplicate[0]);
          console.log("==========================================");

          return res.status(409).json({
            status: "error",
            message: `Another employee already exists with this email: ${trimmedEmail}`,
          });
        }
      }
    }

    // Check for unique identification numbers ONLY if they're being changed
    const uniqueChecks = [];

    // Only check if aadhaar_number is provided AND different from current value
    if (aadhaar_number !== undefined && aadhaar_number.trim() !== "" &&
      aadhaar_number.trim() !== currentEmployee.aadhaar_number) {
      uniqueChecks.push({
        field: "aadhaar_number",
        value: aadhaar_number.trim(),
        label: "Aadhaar Card"
      });
    }

    if (pan_number !== undefined && pan_number.trim() !== "" &&
      pan_number.trim() !== currentEmployee.pan_number) {
      uniqueChecks.push({
        field: "pan_number",
        value: pan_number.trim(),
        label: "PAN Number"
      });
    }

    if (voter_id !== undefined && voter_id.trim() !== "" &&
      voter_id.trim() !== currentEmployee.voter_id) {
      uniqueChecks.push({
        field: "voter_id",
        value: voter_id.trim(),
        label: "Voter ID"
      });
    }

    if (passport_id !== undefined && passport_id.trim() !== "" &&
      passport_id.trim() !== currentEmployee.passport_id) {
      uniqueChecks.push({
        field: "passport_id",
        value: passport_id.trim(),
        label: "Passport Number"
      });
    }

    if (esi_number !== undefined && esi_number.trim() !== "" &&
      esi_number.trim() !== currentEmployee.esi_number) {
      uniqueChecks.push({
        field: "esi_number",
        value: esi_number.trim(),
        label: "ESI Number"
      });
    }

    if (uan_number !== undefined && uan_number.trim() !== "" &&
      uan_number.trim() !== currentEmployee.uan_number) {
      uniqueChecks.push({
        field: "uan_number",
        value: uan_number.trim(),
        label: "UAN Number"
      });
    }

    // Check for duplicates (excluding current employee)
    for (const check of uniqueChecks) {
      const duplicate = await odooHelpers.searchRead(
        "hr.employee",
        [
          "&",
          ["id", "!=", parseInt(id)],
          [check.field, "=", check.value]
        ],
        ["id", "name"]
      );

      if (duplicate.length > 0) {
        console.log("==========================================");
        console.log(`DUPLICATE ${check.label.toUpperCase()} FOUND`);
        console.log(`${check.label}:`, check.value);
        console.log("Existing employee:", duplicate[0]);
        console.log("==========================================");

        return res.status(409).json({
          status: "error",
          message: `${check.label} already exists for another employee`,
        });
      }
    }

    if (is_uan_number_applicable === true) {
      if (!uan_number && !currentEmployee.uan_number) {
        return res.status(400).json({
          status: "error",
          message: "UAN Number is required",
        });
      }
      if (!esi_number && !currentEmployee.esi_number) {
        return res.status(400).json({
          status: "error",
          message: "ESI Number is required",
        });
      }
    }

    // --- CURRENCY CODE TO ID CONVERSION ---
    let resolvedCurrencyId = null;
    if (currency_id) {
      const currencyCode = currency_id.toString().toUpperCase();

      if (currencyCode !== "INR" && currencyCode !== "USD") {
        return res.status(400).json({
          status: "error",
          message: "Currency must be either INR or USD",
        });
      }

      try {
        const currencyRecords = await odooHelpers.searchRead(
          "res.currency",
          [["name", "=", currencyCode]],
          ["id", "name"]
        );

        if (currencyRecords.length > 0) {
          resolvedCurrencyId = currencyRecords[0].id;
          console.log(`Currency ${currencyCode} resolved to ID: ${resolvedCurrencyId}`);
        } else {
          return res.status(400).json({
            status: "error",
            message: `Currency ${currencyCode} not found in system`,
          });
        }
      } catch (currencyError) {
        console.error("Error resolving currency:", currencyError);
        return res.status(400).json({
          status: "error",
          message: "Failed to resolve currency",
        });
      }
    }

    // --- BANK ACCOUNT HANDLING ---
    let updatedBankAccountId = null;

    // If account_number is provided, handle bank account creation/update
    if (account_number) {
      const trimmedAccountNumber = account_number.toString().trim();

      // Validate account number format
      if (!/^\d+$/.test(trimmedAccountNumber)) {
        return res.status(400).json({
          status: "error",
          message: "Account number should contain only numeric values",
        });
      }

      if (trimmedAccountNumber.length < 9 || trimmedAccountNumber.length > 18) {
        return res.status(400).json({
          status: "error",
          message: "Account number must be between 9 and 18 digits",
        });
      }

      // Get employee's user_id to fetch partner_id
      const employeeUser = await odooHelpers.searchRead(
        "hr.employee",
        [["id", "=", parseInt(id)]],
        ["user_id"]
      );

      if (employeeUser.length > 0 && employeeUser[0].user_id) {
        const userId = Array.isArray(employeeUser[0].user_id)
          ? employeeUser[0].user_id[0]
          : employeeUser[0].user_id;

        const userDetails = await odooHelpers.searchRead(
          "res.users",
          [["id", "=", userId]],
          ["partner_id"]
        );

        if (userDetails.length > 0) {
          const partnerId = userDetails[0].partner_id;
          const partnerIdValue = Array.isArray(partnerId) ? partnerId[0] : partnerId;

          const { client_id } = await getClientFromRequest(req);

          // Check if employee already has a bank account
          if (currentEmployee.bank_account_id) {
            const existingBankAccountId = Array.isArray(currentEmployee.bank_account_id)
              ? currentEmployee.bank_account_id[0]
              : currentEmployee.bank_account_id;

            try {
              console.log("==========================================");
              console.log("UPDATING EXISTING BANK ACCOUNT");
              console.log("Bank Account ID:", existingBankAccountId);
              console.log("==========================================");

              const bankUpdateData = {
                acc_number: trimmedAccountNumber,
                partner_id: partnerIdValue,
              };

              if (bank_id) bankUpdateData.bank_id = parseInt(bank_id);
              if (bank_swift_code) bankUpdateData.bank_swift_code = bank_swift_code;
              if (bank_iafc_code) bankUpdateData.bank_iafc_code = bank_iafc_code;
              if (resolvedCurrencyId) bankUpdateData.currency_id = resolvedCurrencyId;

              await odooHelpers.write("res.partner.bank", existingBankAccountId, bankUpdateData);
              updatedBankAccountId = existingBankAccountId;

              console.log("✓ Bank account updated successfully!");
              console.log("==========================================");
            } catch (bankUpdateError) {
              console.error("✗ ERROR updating bank account:", bankUpdateError);
              return res.status(500).json({
                status: "error",
                message: "Failed to update bank account",
                error_details: bankUpdateError.message,
              });
            }
          } else {
            // Create new bank account
            // Check for duplicate account number first
            const existingAccount = await odooHelpers.searchRead(
              "res.partner.bank",
              [["acc_number", "=", trimmedAccountNumber]],
              ["id", "acc_number"]
            );

            if (existingAccount.length > 0) {
              return res.status(409).json({
                status: "error",
                message: `Account number already exists: ${trimmedAccountNumber}`,
              });
            }

            try {
              console.log("==========================================");
              console.log("CREATING NEW BANK ACCOUNT FOR EMPLOYEE");
              console.log("Account number:", trimmedAccountNumber);
              console.log("Partner ID:", partnerIdValue);
              console.log("==========================================");

              const bankAccountData = {
                acc_number: trimmedAccountNumber,
                partner_id: partnerIdValue,
                company_id: 12,
                client_id: client_id ? parseInt(client_id) : undefined,
              };

              if (bank_id) bankAccountData.bank_id = parseInt(bank_id);
              if (bank_swift_code) bankAccountData.bank_swift_code = bank_swift_code;
              if (bank_iafc_code) bankAccountData.bank_iafc_code = bank_iafc_code;
              if (resolvedCurrencyId) bankAccountData.currency_id = resolvedCurrencyId;

              updatedBankAccountId = await odooHelpers.create(
                "res.partner.bank",
                bankAccountData
              );

              console.log("✓ Bank account created successfully!");
              console.log("✓ Bank account ID:", updatedBankAccountId);
              console.log("==========================================");
            } catch (bankCreateError) {
              console.error("✗ ERROR creating bank account:", bankCreateError);
              return res.status(500).json({
                status: "error",
                message: "Failed to create bank account",
                error_details: bankCreateError.message,
              });
            }
          }
        }
      }
    }

    const { client_id } = await getClientFromRequest(req);
    const userIdFromParams = req.query.user_id
      ? parseInt(req.query.user_id)
      : null;

    console.log("user_id from params (for write_uid):", userIdFromParams);
    console.log("client_id:", client_id);

    const data = {};

    if (name !== undefined) data.name = name.trim();
    if (father_name !== undefined) data.father_name = father_name;
    if (gender !== undefined) data.gender = gender;
    if (birthday !== undefined) data.birthday = birthday;
    if (blood_group !== undefined) data.blood_group = blood_group;
    if (private_email !== undefined) data.private_email = private_email.trim();
    if (present_address !== undefined) data.present_address = present_address;
    if (permanent_address !== undefined)
      data.permanent_address = permanent_address;
    if (emergency_contact_name !== undefined)
      data.emergency_contact_name = emergency_contact_name;
    if (emergency_contact_relation !== undefined)
      data.emergency_contact_relation = emergency_contact_relation;
    if (emergency_contact_address !== undefined)
      data.emergency_contact_address = emergency_contact_address;
    if (emergency_contact_mobile !== undefined)
      data.emergency_contact_mobile = emergency_contact_mobile;
    if (mobile_phone !== undefined) data.mobile_phone = mobile_phone;
    if (pin_code !== undefined) data.pin_code = pin_code;

    if (client_id) {
      data.address_id = parseInt(client_id);
    }
    if (work_phone !== undefined) data.work_phone = work_phone;
    if (marital !== undefined) data.marital = marital;
    if (spouse_name !== undefined) data.spouse_name = spouse_name;
    if (attendance_policy_id !== undefined)
      data.attendance_policy_id = parseInt(attendance_policy_id);
    if (employee_category !== undefined)
      data.employee_category = employee_category;
    if (shift_roster_id !== undefined)
      data.shift_roster_id = parseInt(shift_roster_id);
    if (resource_calendar_id !== undefined)
      data.resource_calendar_id = parseInt(resource_calendar_id);
    if (district_id !== undefined) data.district_id = parseInt(district_id);
    if (state_id !== undefined) data.state_id = parseInt(state_id);
    if (bussiness_type_id !== undefined)
      data.bussiness_type_id = parseInt(bussiness_type_id);
    if (business_location_id !== undefined)
      data.business_location_id = parseInt(business_location_id);
    if (job_id !== undefined) data.job_id = parseInt(job_id);
    if (department_id !== undefined)
      data.department_id = parseInt(department_id);
    if (work_location_id !== undefined)
      data.work_location_id = parseInt(work_location_id);
    if (country_id !== undefined) data.country_id = parseInt(country_id);
    if (is_geo_tracking !== undefined) data.is_geo_tracking = is_geo_tracking;
    if (aadhaar_number !== undefined) data.aadhaar_number = aadhaar_number;
    if (pan_number !== undefined) data.pan_number = pan_number;
    if (voter_id !== undefined) data.voter_id = voter_id;
    if (passport_id !== undefined) data.passport_id = passport_id;
    if (esi_number !== undefined) data.esi_number = esi_number;
    if (category !== undefined) data.category = category;
    if (is_uan_number_applicable !== undefined)
      data.is_uan_number_applicable = is_uan_number_applicable;
    if (uan_number !== undefined) data.uan_number = uan_number;
    if (cd_employee_num !== undefined) data.cd_employee_num = cd_employee_num;
    if (name_of_post_graduation !== undefined)
      data.name_of_post_graduation = name_of_post_graduation;
    if (name_of_any_other_education !== undefined)
      data.name_of_any_other_education = name_of_any_other_education;
    if (total_experiance !== undefined)
      data.total_experiance = total_experiance;
    if (religion !== undefined) data.religion = religion;
    if (date_of_marriage !== undefined)
      data.date_of_marriage = date_of_marriage;
    if (probation_period !== undefined)
      data.probation_period = probation_period;
    if (confirmation_date !== undefined)
      data.confirmation_date = confirmation_date;
    if (hold_remarks !== undefined) data.hold_remarks = hold_remarks;
    if (is_lapse_allocation !== undefined)
      data.is_lapse_allocation = is_lapse_allocation;
    if (group_company_joining_date !== undefined)
      data.group_company_joining_date = group_company_joining_date;
    if (week_off !== undefined) data.week_off = week_off;
    if (grade_band !== undefined) data.grade_band = grade_band;
    if (status !== undefined) data.status = status;
    if (employee_password !== undefined)
      data.employee_password = employee_password;
    if (hold_status !== undefined) data.hold_status = hold_status;

    // Use updated bank account ID if created/updated, otherwise use provided value
    if (updatedBankAccountId) {
      data.bank_account_id = updatedBankAccountId;
    } else if (bank_account_id !== undefined) {
      data.bank_account_id = bank_account_id;
    }

    if (attendance_capture_mode !== undefined)
      data.attendance_capture_mode = attendance_capture_mode;
    if (reporting_manager_id !== undefined)
      data.reporting_manager_id = parseInt(reporting_manager_id);
    if (head_of_department_id !== undefined)
      data.head_of_department_id = parseInt(head_of_department_id);
    if (barcode !== undefined) data.barcode = barcode;
    if (pin !== undefined) data.pin = pin;
    if (type_of_sepration !== undefined)
      data.type_of_sepration = type_of_sepration;
    if (resignation_date !== undefined)
      data.resignation_date = resignation_date;
    if (notice_period_days !== undefined)
      data.notice_period_days = notice_period_days;
    if (joining_date !== undefined) data.joining_date = joining_date;
    if (employment_type !== undefined) data.employment_type = employment_type;
    if (driving_license !== undefined) data.driving_license = driving_license;
    if (upload_passbook !== undefined) data.upload_passbook = upload_passbook;
    if (image_1920 !== undefined) data.image_1920 = image_1920;
    if (name_of_site !== undefined) data.name_of_site = parseInt(name_of_site);
    if (longitude !== undefined) data.longitude = longitude;
    if (device_id !== undefined) data.device_id = device_id;
    if (device_unique_id !== undefined) data.device_unique_id = device_unique_id;
    if (latitude !== undefined) data.latitude = latitude;
    if (device_name !== undefined) data.device_name = device_name;
    if (system_version !== undefined) data.system_version = system_version;
    if (ip_address !== undefined) data.ip_address = ip_address;
    if (device_platform !== undefined) data.device_platform = device_platform;

    await odooHelpers.write("hr.employee", parseInt(id), data);
    console.log("Employee updated with ID:", id);

    const write_uid_value =
      userIdFromParams || (client_id ? parseInt(client_id) : undefined);
    console.log("write_uid will be set to:", write_uid_value);

    if (write_uid_value) {
      try {
        const tableName = "hr_employee";

        await odooHelpers.updateAuditFields(
          tableName,
          [parseInt(id)],
          null,
          write_uid_value
        );

        console.log(
          `Successfully updated write_uid to ${write_uid_value} for employee ${id}`
        );
      } catch (auditError) {
        console.error("Failed to update write_uid:", auditError.message);
      }
    }

    // Handle approvals array
    if (approvals && Array.isArray(approvals) && approvals.length > 0) {
      try {
        console.log("Updating employee approval user details...");

        const existingApprovals = await odooHelpers.searchRead(
          "employee.approval.user.details",
          [["employee_id", "=", parseInt(id)]],
          ["id"]
        );

        if (existingApprovals.length > 0) {
          const approvalIds = existingApprovals.map(a => a.id);
          await odooHelpers.unlink("employee.approval.user.details", approvalIds);
          console.log(`Deleted ${approvalIds.length} existing approval records`);
        }

        // Create approval records from the approvals array
        for (let i = 0; i < approvals.length; i++) {
          const approval = approvals[i];

          const approvalData = {
            group_id: parseInt(approval.group_id),
            user_id: parseInt(approval.approval_user_id),
            approval_sequance: parseInt(approval.approval_sequance),
            employee_id: parseInt(id),
          };

          if (approval.model) {
            approvalData.model = approval.model;
          }

          const approvalId = await odooHelpers.create(
            "employee.approval.user.details",
            approvalData
          );

          console.log(
            `Employee approval user details created with ID: ${approvalId} (Index: ${i})`
          );
        }
      } catch (approvalError) {
        console.error("Error updating approval details:", approvalError);
      }
    }

    let userUpdateStatus = null;
    if (private_email && currentEmployee.user_id) {
      try {
        const trimmedEmail = private_email.trim();
        const updateUserData = {
          login: trimmedEmail,
          email: trimmedEmail,
        };

        if (name) updateUserData.name = name.trim();
        if (work_phone) updateUserData.phone = work_phone;
        if (mobile_phone) updateUserData.mobile = mobile_phone;

        // Extract user_id if it's an array [id] or use directly if it's a number
        const userId = Array.isArray(currentEmployee.user_id)
          ? currentEmployee.user_id[0]
          : currentEmployee.user_id;

        if (userId) {
          await odooHelpers.write(
            "res.users",
            userId,
            updateUserData
          );
          console.log("User updated with ID:", userId);
          userUpdateStatus = "updated";
        }
      } catch (userError) {
        console.error("Error updating user:", userError);
        userUpdateStatus = "failed";
      }
    }

    return res.status(200).json({
      status: "success",
      message: "Employee updated successfully",
      id: parseInt(id),
      user_id: currentEmployee.user_id,
      bank_account_id: updatedBankAccountId || currentEmployee.bank_account_id || null,
      updated_by: write_uid_value
    });
  } catch (error) {
    console.error("Error updating employee:", error);
    return res.status(error.status || 500).json({
      status: "error",
      message: error.message || "Failed to update employee",
    });
  }
};

const deleteEmployee = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        status: "error",
        message: "Employee ID is required",
      });
    }

    const { client_id } = await getClientFromRequest(req);

    const existingEmployee = await odooHelpers.searchRead(
      "hr.employee",
      [["id", "=", parseInt(id)]],
      ["id", "name", "user_id"]
    );

    if (existingEmployee.length === 0) {
      return res.status(404).json({
        status: "error",
        message: "Employee not found",
      });
    }

    const employee = existingEmployee[0];

    /** 🔥 STEP 1 — Soft delete employee */
    await odooHelpers.write("hr.employee", parseInt(id), { active: false });

    /** 🔥 STEP 2 — Soft delete linked user (optional) */
    let userDeleteStatus = null;

    if (employee.user_id) {
      try {
        await odooHelpers.write("res.users", employee.user_id, {
          active: false,
        });
        userDeleteStatus = "soft-deleted";
      } catch (err) {
        console.error("User soft delete failed:", err);
        userDeleteStatus = "failed";
      }
    }

    return res.status(200).json({
      status: "success",
      message: "Employee soft deleted successfully",
      id: parseInt(id),
      user_id: employee.user_id,
      user_delete_status: userDeleteStatus,
    });
  } catch (error) {
    console.error("Error deleting employee:", error);
    return res.status(error.status || 500).json({
      status: "error",
      message: error.message || "Failed to delete employee",
    });
  }
};
const getEmployeeDashboard = async (req, res) => {
  try {
    console.log("===== [START] EMPLOYEE DASHBOARD (SCOPED) =====");
    console.log("Trace: Incoming Request Query:", JSON.stringify(req.query, null, 2));

    const {
      user_id,
      leave_type_id,
      state,
      date_from,
      date_to,
      limit = 10,
      offset = 0,
    } = req.query;

    /* ───────── VALIDATION ───────── */
    if (!user_id) {
      console.error("Validation Error: user_id is missing from request");
      return res.status(400).json({
        success: false,
        errorMessage: "user_id is required",
      });
    }

    /* ───────── STEP 1: RESOLVE ODOO USER ───────── */
    console.log(`Trace: Searching Odoo User (res.users) for ID: ${user_id}`);
    const user = await odooService.searchRead(
      "res.users",
      [["id", "=", Number(user_id)]],
      ["partner_id"],
      1
    );

    if (!user || user.length === 0) {
      console.error(`Error: Odoo user with ID ${user_id} does not exist`);
      throw new Error("Odoo user record not found");
    }

    const partnerId = user[0]?.partner_id?.[0];
    console.log(`Trace: Resolved Partner ID: ${partnerId}`);

    /* ───────── STEP 2: RESOLVE EMPLOYEE LINKED TO USER ───────── */
    // We prioritize the direct link via 'user_id' field on the employee record
    console.log(`Trace: Searching hr.employee linked to user_id: ${user_id}`);
    let employeeRecord = await odooService.searchRead(
      "hr.employee",
      [["user_id", "=", Number(user_id)]],
      ["id", "name", "address_id"],
      1
    );

    // Fallback: search by address_id (partner) if user_id link isn't explicitly set
    if (!employeeRecord || employeeRecord.length === 0) {
      console.log(`Trace: Direct user_id link not found. Falling back to search by address_id: ${partnerId}`);
      employeeRecord = await odooService.searchRead(
        "hr.employee",
        [["address_id", "=", partnerId]],
        ["id", "name", "address_id"],
        1
      );
    }

    if (!employeeRecord || employeeRecord.length === 0) {
      console.error(`Error: No employee record found for user_id: ${user_id}`);
      throw new Error("Root employee not found. Please ensure the user is correctly linked to an Employee profile.");
    }

    const targetEmployeeId = employeeRecord[0].id;
    const employeeName = employeeRecord[0].name;
    console.log(`Trace: Target Employee Resolved -> Name: ${employeeName}, ID: ${targetEmployeeId}`);

    /* ───────── STEP 3: LEAVE TYPES CATEGORIZATION ───────── */
    console.log("Trace: Fetching Leave Types for mapping...");
    const leaveTypes = await odooService.searchRead(
      "hr.leave.type",
      [],
      ["id", "name"]
    );

    const leaveTypeCategoryMap = {};
    leaveTypes.forEach((t) => {
      const name = t.name ? t.name.toLowerCase() : "";
      if (name.includes("annual")) leaveTypeCategoryMap[t.id] = "annual";
      else if (name.includes("medical")) leaveTypeCategoryMap[t.id] = "medical";
      else if (name.includes("casual")) leaveTypeCategoryMap[t.id] = "casual";
      else leaveTypeCategoryMap[t.id] = "other";
    });

    /* ───────── STEP 4: FETCH DATA FOR SPECIFIC EMPLOYEE ───────── */
    console.log(`Trace: Fetching Allocations for Employee ID: ${targetEmployeeId}`);
    const allocations = await odooService.searchRead(
      "hr.leave.allocation",
      [
        ["employee_id", "=", targetEmployeeId],
        ["state", "=", "validate"],
      ],
      ["holiday_status_id", "number_of_days"]
    );

    console.log(`Trace: Fetching Approved Leaves for Employee ID: ${targetEmployeeId}`);
    const approvedLeaves = await odooService.searchRead(
      "hr.leave",
      [
        ["employee_id", "=", targetEmployeeId],
        ["state", "=", "validate"],
      ],
      ["holiday_status_id", "number_of_days"]
    );

    /* ───────── STEP 5: CALCULATE CARD TOTALS ───────── */
    const cards = {
      annual: { leave_type: "Annual Leave", total: 0, used: 0, remaining: 0 },
      medical: { leave_type: "Medical Leave", total: 0, used: 0, remaining: 0 },
      casual: { leave_type: "Casual Leave", total: 0, used: 0, remaining: 0 },
      other: { leave_type: "Other Leave", total: 0, used: 0, remaining: 0 },
    };

    allocations.forEach((a) => {
      const typeId = a.holiday_status_id?.[0];
      const category = leaveTypeCategoryMap[typeId] || "other";
      cards[category].total += (a.number_of_days || 0);
    });

    approvedLeaves.forEach((l) => {
      const typeId = l.holiday_status_id?.[0];
      const category = leaveTypeCategoryMap[typeId] || "other";
      cards[category].used += (l.number_of_days || 0);
    });

    Object.values(cards).forEach((c) => {
      c.remaining = c.total - c.used;
    });

    console.log("Trace: Card calculations completed.");

    /* ───────── STEP 6: TABLE DATA (LEAVE HISTORY) ───────── */
    let domain = [["employee_id", "=", targetEmployeeId]];

    if (leave_type_id) domain.push(["holiday_status_id", "=", Number(leave_type_id)]);
    if (state) domain.push(["state", "=", state]);
    if (date_from) domain.push(["request_date_from", ">=", date_from]);
    if (date_to) domain.push(["request_date_to", "<=", date_to]);

    console.log(`Trace: Fetching history for employee. Domain: ${JSON.stringify(domain)}`);
    const totalCount = await odooService.searchCount("hr.leave", domain);

    const leaves = await odooService.searchRead(
      "hr.leave",
      domain,
      [
        "id",
        "employee_id",
        "holiday_status_id",
        "request_date_from",
        "request_date_to",
        "number_of_days",
        "state",
      ],
      Number(offset),
      Number(limit),
      "request_date_from desc"
    );

    const tableData = leaves.map((l) => ({
      id: l.id,
      employee_id: l.employee_id?.[0] || null,
      employee_name: l.employee_id?.[1] || "Unknown",
      leave_type_id: l.holiday_status_id?.[0] || null,
      leave_type: l.holiday_status_id?.[1] || "Unknown",
      from: l.request_date_from,
      to: l.request_date_to,
      no_of_days: l.number_of_days,
      status: l.state,
    }));

    console.log(`Trace: Dashboard successfully built for ${employeeName}`);
    console.log("===== [SUCCESS] EMPLOYEE DASHBOARD END =====");

    return res.status(200).json({
      success: true,
      cards: Object.values(cards),
      tableData,
      meta: {
        total: totalCount,
        limit: Number(limit),
        offset: Number(offset),
      },
    });

  } catch (error) {
    console.error("❌ Employee Dashboard Controller Error:", error);
    return res.status(500).json({
      success: false,
      errorMessage: error.message || "Failed to load dashboard data.",
    });
  }
};
const createExpense = async (req, res) => {
  try {
    const user_id = req.body.user_id || req.query.user_id;
    let {
      name,
      product_id,
      account_id,
      total_amount_currency,
      payment_mode,
      date,
      attachment,
      fileName,
      other_expense_ids,
    } = req.body;

    const auto_create_report = true;
    const auto_submit_to_manager = true;

    // ───────── 1. RESOLVE CLIENT ─────────
    const { client_id } = await getClientFromRequest(req);

    if (!client_id) {
      return res
        .status(400)
        .json({ status: "error", message: "client_id not found" });
    }

    // ───────── 2. NORMALIZE IDS ─────────
    product_id = typeof product_id === "object" ? product_id?.id : product_id;

    // ✨ SET DEFAULT ACCOUNT_ID IF NOT PROVIDED
    if (!account_id) {
      account_id = 920; // Default account_id
      console.log("💡 Using default account_id: 920");
    } else {
      account_id = typeof account_id === "object" ? account_id?.id : account_id;
    }

    // ───────── 3. VALIDATIONS ─────────
    const missingFields = [];

    if (!user_id) missingFields.push("user_id");
    if (!name) missingFields.push("name");
    if (!product_id) missingFields.push("product_id");
    if (!total_amount_currency) missingFields.push("total_amount_currency");
    if (!payment_mode) missingFields.push("payment_mode");

    if (missingFields.length > 0) {
      return res
        .status(400)
        .json({
          status: "error",
          message: "Missing required fields",
          missing_fields: missingFields
        });
    }

    // ───────── 4. USER FETCH ─────────
    const user = await odooService.searchRead(
      "res.users",
      [["id", "=", Number(user_id)]],
      ["partner_id", "company_id"],
      0,
      1
    );

    if (!user.length) {
      return res
        .status(400)
        .json({ status: "error", message: "Invalid user_id" });
    }

    const partnerId = user[0].partner_id?.[0];

    // ───────── 5. EMPLOYEE FETCH ─────────
    let employee = await odooService.searchRead(
      "hr.employee",
      [["user_id", "=", Number(user_id)]],
      ["id", "company_id"],
      0,
      1
    );

    if (!employee.length && partnerId) {
      employee = await odooService.searchRead(
        "hr.employee",
        [["address_id", "=", partnerId]],
        ["id", "company_id"],
        0,
        1
      );
    }

    if (!employee.length) {
      return res
        .status(400)
        .json({ status: "error", message: "Employee not found" });
    }

    const employee_id = employee[0].id;
    const companyId = employee[0].company_id?.[0] || user[0].company_id?.[0];

    // ───────── 6. CREATE EXPENSE ─────────
    const vals = {
      name,
      employee_id: Number(employee_id),
      product_id: Number(product_id),
      account_id: Number(account_id),
      payment_mode,
      total_amount_currency: Number(total_amount_currency),
      date: date || new Date().toISOString().split("T")[0],
      company_id: companyId,
    };

    const expenseId = await odooService.create("hr.expense", vals, client_id);
    // ───────── 7. ATTACHMENT ─────────
    let attachmentId = null;
    if (attachment && fileName) {
      const base64Data = attachment.split(",").pop();
      attachmentId = await odooService.create(
        "ir.attachment",
        {
          name: fileName,
          datas: base64Data,
          type: "binary",
          res_model: "hr.expense",
          res_id: Number(expenseId),
          company_id: companyId,
        },
        client_id
      );
      console.log("📎 Attachment created with ID:", attachmentId);
    }

    // ───────── 8. AUTO CREATE REPORT (OPTIONAL) ─────────
    let sheetId = null;
    let sheetState = null;

    if (auto_create_report) {
      console.log("🔄 Auto-creating expense report...");

      // Combine current expense with other_expense_ids if provided
      const expenseIdsForReport = [expenseId];
      if (other_expense_ids && Array.isArray(other_expense_ids)) {
        expenseIdsForReport.push(...other_expense_ids.map(Number));
      }

      console.log("📋 Expenses to include in report:", expenseIdsForReport);

      try {
        const reportResult = await odooService.callCustomMethod(
          "hr.expense",
          "action_submit_expenses",
          [expenseIdsForReport]
        );

        console.log("📊 Report created:", JSON.stringify(reportResult, null, 2));

        // Fetch created sheet ID
        if (reportResult && reportResult.res_id) {
          sheetId = reportResult.res_id;
        } else {
          const sheets = await odooService.searchRead(
            "hr.expense.sheet",
            [["expense_line_ids", "in", expenseIdsForReport]],
            ["id", "name", "state"],
            0,
            1,
            "id desc"
          );

          if (sheets.length > 0) {
            sheetId = sheets[0].id;
            sheetState = sheets[0].state;
          }
        }

        console.log("📄 Sheet created with ID:", sheetId);

      } catch (reportError) {
        console.error("⚠️ Failed to create report:", reportError.message);
        // Don't fail the entire request, just log the error
      }
    }

    // ───────── 9. AUTO SUBMIT TO MANAGER (OPTIONAL) ─────────
    let finalSheetState = sheetState;

    if (auto_submit_to_manager && sheetId) {
      console.log("🔄 Auto-submitting expense sheet to manager...");

      try {
        const submitResult = await odooService.callCustomMethod(
          "hr.expense.sheet",
          "action_submit_sheet",
          [[Number(sheetId)]]
        );

        console.log("📤 Sheet submitted:", JSON.stringify(submitResult, null, 2));

        // Fetch updated state
        const updatedSheets = await odooService.searchRead(
          "hr.expense.sheet",
          [["id", "=", Number(sheetId)]],
          ["id", "name", "state"],
          0,
          1
        );

        if (updatedSheets.length > 0) {
          finalSheetState = updatedSheets[0].state;
        }

        console.log("✅ Sheet state updated to:", finalSheetState);

      } catch (submitError) {
        console.error("⚠️ Failed to submit to manager:", submitError.message);
      }
    } else if (auto_submit_to_manager && !sheetId) {
      console.warn("⚠️ Cannot submit to manager: No sheet created. Set auto_create_report=true first.");
    }

    // ───────── 10. BUILD RESPONSE ─────────
    const responseData = {
      expense_id: expenseId,
      attachment_id: attachmentId,
    };

    if (auto_create_report) {
      responseData.sheet_id = sheetId;
      responseData.sheet_state = finalSheetState || sheetState || "draft";
    }

    return res.status(201).json({
      status: "success",
      message: "Expense created successfully",
      data: responseData
    });

  } catch (error) {
    return res.status(500).json({
      status: "error",
      message: error.message || "Failed to create expense",
    });
  }
};

// const createExpense = async (req, res) => {
//   try {
//     console.log("══════════════════════════════════════");
//     console.log("🚀 API CALLED → CREATE EXPENSE");

//     const user_id = req.body.user_id || req.query.user_id; // This is 3138
//     console.log("👤 Resolved user_id:", user_id);

//     let {
//       name,
//       product_id,
//       account_id,
//       total_amount_currency,
//       payment_mode,
//       date,
//       attachment,
//       fileName,
//     } = req.body;

//     // ───────── 1. RESOLVE CLIENT ─────────
//     const { client_id } = await getClientFromRequest(req);

//     if (!client_id) {
//       return res
//         .status(400)
//         .json({ status: "error", message: "client_id not found" });
//     }

//     // ───────── 2. NORMALIZE IDS ─────────
//     product_id = typeof product_id === "object" ? product_id?.id : product_id;
//     account_id = typeof account_id === "object" ? account_id?.id : account_id;

//     // ───────── 3. VALIDATIONS ─────────
//     if (
//       !user_id ||
//       !name ||
//       !product_id ||
//       !account_id ||
//       !total_amount_currency ||
//       !payment_mode
//     ) {
//       return res
//         .status(400)
//         .json({ status: "error", message: "Missing required fields" });
//     }

//     // ───────── 4. USER FETCH ─────────
//     const user = await odooService.searchRead(
//       "res.users",
//       [["id", "=", Number(user_id)]],
//       ["partner_id", "company_id"],
//       0,
//       1
//     );

//     if (!user.length) {
//       return res
//         .status(400)
//         .json({ status: "error", message: "Invalid user_id" });
//     }

//     const partnerId = user[0].partner_id?.[0];

//     // ───────── 5. EMPLOYEE FETCH ─────────
//     let employee = await odooService.searchRead(
//       "hr.employee",
//       [["user_id", "=", Number(user_id)]],
//       ["id", "company_id"],
//       0,
//       1
//     );

//     if (!employee.length && partnerId) {
//       employee = await odooService.searchRead(
//         "hr.employee",
//         [["address_id", "=", partnerId]],
//         ["id", "company_id"],
//         0,
//         1
//       );
//     }

//     if (!employee.length) {
//       return res
//         .status(400)
//         .json({ status: "error", message: "Employee not found" });
//     }

//     const employee_id = employee[0].id; // This is 17565
//     const companyId = employee[0].company_id?.[0] || user[0].company_id?.[0];

//     // ───────── 6. CREATE EXPENSE ─────────
//     const vals = {
//       name,
//       employee_id: Number(employee_id),
//       product_id: Number(product_id),
//       account_id: Number(account_id),
//       payment_mode,
//       total_amount_currency: Number(total_amount_currency),
//       date: date || new Date().toISOString().split("T")[0],
//       company_id: companyId,
//     };

//     const expenseId = await odooService.create("hr.expense", vals, client_id);

//     // ───────── 7. ATTACHMENT (FIXED) ─────────
//     if (attachment && fileName) {
//       // FIX 1: Ensure we only send the base64 part
//       const base64Data = attachment.split(",").pop();

//       // FIX 2: Create attachment with explicit mapping
//       const attachmentId = await odooService.create(
//         "ir.attachment",
//         {
//           name: fileName,
//           datas: base64Data,
//           type: "binary",
//           res_model: "hr.expense",
//           res_id: Number(expenseId), // Ensure this is a number
//           company_id: companyId, // Ensure it belongs to the same company
//         },
//         client_id
//       );

//       // FIX 3: Removed the 'write' to attachment_ids.
//       // In Odoo, setting res_model/res_id on the attachment is enough to link it.
//       // Writing to hr.expense sometimes triggers a re-check of the user context, causing your error.
//     }

//     return res.status(201).json({
//       status: "success",
//       message: "Expense created successfully",
//       expense_id: expenseId,
//     });
//   } catch (error) {
//     console.error("❌ CREATE EXPENSE ERROR:", error);
//     return res.status(500).json({
//       status: "error",
//       message: error.message || "Failed to create expense",
//     });
//   }
// };

// const getExpense = async (req, res) => {
//   try {
//     console.log("══════════════════════════════════════");
//     console.log("🚀 API CALLED → FETCH EXPENSES");

//     // 1. Resolve User and Client
//     const user_id = req.query.user_id || req.body?.user_id;
//     const { client_id } = await getClientFromRequest(req);

//     if (!client_id || !user_id) {
//       return res.status(400).json({
//         status: "error",
//         message: "client_id or user_id not found"
//       });
//     }

//     console.log(`👤 User: ${user_id} | 🏢 Client: ${client_id}`);

//     // 2. Fetch User to get partner_id (Odoo models use partner_id for linking)
//     const userData = await odooService.searchRead(
//       "res.users",
//       [["id", "=", Number(user_id)]],
//       ["partner_id"]
//     );

//     let partnerId = (userData.length && userData[0].partner_id) ? userData[0].partner_id[0] : null;

//     // 3. Fetch Employee - Domain adjustment
//     // Odoo mein search domain array of arrays hota hai. 
//     // Hum user_id se search kar rahe hain, client_id (address_id) ka filter zaruri hai 
//     // taaki sirf wahi employee dikhe jo us client ka ho.
//     let employeeData = await odooService.searchRead(
//       "hr.employee",
//       [
//         ["user_id", "=", Number(user_id)],
//         ["address_id", "=", Number(client_id)]
//       ],
//       ["id", "name"]
//     );

//     // Alternative lookup agar user_id link na ho (Work Address context)
//     if (!employeeData.length && partnerId) {
//       console.log("⚠️ No employee via user_id. Trying partner_id/address lookup...");
//       employeeData = await odooService.searchRead(
//         "hr.employee",
//         [
//           ["address_id", "=", Number(client_id)],
//           "|",
//           ["work_contact_id", "=", partnerId],
//           ["name", "=", userData[0]?.name]
//         ],
//         ["id", "name"]
//       );
//     }

//     if (!employeeData.length) {
//       console.error("❌ Employee not found for user 3145 in client 17565");
//       return res.status(404).json({
//         status: "error",
//         message: "Employee not found for this user in this company context"
//       });
//     }

//     const employee_id = employeeData[0].id;
//     console.log("👨‍💼 Found Employee ID:", employee_id);

//     // 4. Fetch Expenses
//     const expenses = await odooService.searchRead(
//       "hr.expense",
//       [["employee_id", "=", employee_id]],
//       [
//         "id", "name", "product_id", "account_id", "payment_mode",
//         "total_amount", "state", "date", "currency_id"
//       ],
//       0, // offset
//       80 // limit (aap limit set kar sakte hain)
//     );

//     if (!expenses || expenses.length === 0) {
//       return res.status(200).json({
//         status: "success",
//         message: "No expenses found",
//         data: []
//       });
//     }

//     // 5. Fetch Attachments
//     const expenseIds = expenses.map(exp => exp.id);
//     const attachments = await odooService.searchRead(
//       "ir.attachment",
//       [
//         ["res_model", "=", "hr.expense"],
//         ["res_id", "in", expenseIds]
//       ],
//       ["id", "name", "datas", "mimetype", "res_id"]
//     );

//     // 6. Merge & Cleanup (Removing Odoo 'false' values)
//     const finalData = expenses.map(exp => {
//       // Attachment mapping
//       const expAttachments = attachments
//         .filter(att => att.res_id === exp.id)
//         .map(att => ({
//           id: att.id,
//           name: att.name,
//           mimetype: att.mimetype,
//           base64: att.datas || ""
//         }));

//       // Cleanup Odoo 'false' booleans to ""
//       Object.keys(exp).forEach(key => {
//         if (exp[key] === false) exp[key] = "";
//         // Handling Many2one arrays (e.g. [id, name] -> name)
//         if (Array.isArray(exp[key]) && exp[key].length === 2) {
//           // Agar aapko sirf name chahiye: exp[key] = exp[key][1];
//         }
//       });

//       return {
//         ...exp,
//         attachment_ids: expAttachments
//       };
//     });

//     console.log(`✅ Successfully fetched ${finalData.length} expenses`);
//     return res.status(200).json({
//       status: "success",
//       count: finalData.length,
//       data: finalData
//     });

//   } catch (error) {
//     console.error("❌ GET EXPENSE ERROR:", error);
//     return res.status(500).json({
//       status: "error",
//       message: error.message || "Internal Server Error"
//     });
//   }
// };

const getExpense = async (req, res) => {
  try {
    console.log("══════════════════════════════════════");
    console.log("🚀 API CALLED → FETCH EXPENSES");

    const user_id = req.query.user_id || req.body?.user_id;
    const { client_id } = await getClientFromRequest(req);

    if (!client_id || !user_id) {
      return res.status(400).json({
        status: "error",
        message: "client_id or user_id not found"
      });
    }

    const userData = await odooService.searchRead(
      "res.users",
      [["id", "=", Number(user_id)]],
      ["partner_id", "is_client_employee_admin"]
    );

    if (!userData.length) {
      return res.status(404).json({
        status: "error",
        message: "User not found"
      });
    }

    const isAdmin = userData[0].is_client_employee_admin || false;
    let partnerId = (userData[0].partner_id) ? userData[0].partner_id[0] : null;

    let employeeIds = [];

    if (isAdmin) {
      const allEmployees = await odooService.searchRead(
        "hr.employee",
        [["address_id", "=", Number(client_id)]],
        ["id", "name"]
      );

      if (!allEmployees.length) {
        return res.status(404).json({
          status: "error",
          message: "No employees found for this client"
        });
      }
      employeeIds = allEmployees.map(emp => emp.id);
    } else {
      let employeeData = await odooService.searchRead(
        "hr.employee",
        [["user_id", "=", Number(user_id)], ["address_id", "=", Number(client_id)]],
        ["id", "name"]
      );

      if (!employeeData.length && partnerId) {
        employeeData = await odooService.searchRead(
          "hr.employee",
          [["address_id", "=", Number(client_id)], "|", ["work_contact_id", "=", partnerId], ["name", "=", userData[0]?.name]],
          ["id", "name"]
        );
      }

      if (!employeeData.length) {
        return res.status(404).json({
          status: "error",
          message: "Employee not found"
        });
      }
      employeeIds = [employeeData[0].id];
    }

    // 4. Fetch Expenses
    const expenses = await odooService.searchRead(
      "hr.expense",
      [["employee_id", "in", employeeIds]],
      [
        "id", "name", "product_id", "account_id", "payment_mode",
        "total_amount", "state", "date", "currency_id", "employee_id",
        "sheet_id"
      ],
      0,
      80
    );

    if (!expenses || expenses.length === 0) {
      return res.status(200).json({
        status: "success",
        data: [],
        meta: { is_admin: isAdmin, total_employees: employeeIds.length, client_id: client_id }
      });
    }

    // 5. Fetch Attachments
    const expenseIds = expenses.map(exp => exp.id);
    const attachments = await odooService.searchRead(
      "ir.attachment",
      [["res_model", "=", "hr.expense"], ["res_id", "in", expenseIds]],
      ["id", "name", "datas", "mimetype", "res_id"]
    );

    // 6. ENRICH DATA: Add RejectedReason only when state is 'refused'
    const finalData = await Promise.all(expenses.map(async (exp) => {

      const expAttachments = attachments
        .filter(att => att.res_id === exp.id)
        .map(att => ({
          id: att.id,
          name: att.name,
          mimetype: att.mimetype,
          base64: att.datas || ""
        }));

      // Cleanup Odoo 'false' values
      Object.keys(exp).forEach(key => {
        if (exp[key] === false) exp[key] = "";
      });

      // Prepare basic record
      let record = {
        ...exp,
        employee_name: exp.employee_id ? exp.employee_id[1] : "",
        attachment_ids: expAttachments
      };

      // ✅ LOGIC: Add RejectedReason only if state is 'refused'
      if (exp.state === "refused") {
        try {
          const sheetId = exp.sheet_id ? exp.sheet_id[0] : null;

          if (sheetId) {
            const approvalRecords = await odooService.searchRead(
              "approval.request",
              [["hr_expense_id", "=", sheetId]],
              ["reason"]
            );

            if (approvalRecords && approvalRecords.length > 0) {
              record.RejectedReason = approvalRecords[0].reason || "No reason specified";
            } else {
              record.RejectedReason = "";
            }
          }
        } catch (err) {
          console.error(`Error fetching reason for expense ${exp.id}:`, err);
          record.RejectedReason = "Reason could not be retrieved";
        }
      }

      return record;
    }));

    return res.status(200).json({
      status: "success",
      count: finalData.length,
      data: finalData,
      meta: { is_admin: isAdmin, total_employees: employeeIds.length, client_id: client_id }
    });

  } catch (error) {
    console.error("❌ GET EXPENSE ERROR:", error);
    return res.status(500).json({ status: "error", message: error.message });
  }
};

const updateExpense = async (req, res) => {
  try {
    console.log("API called for Expense Update");

    // 1. Get Expense ID from URL Parameter
    const expense_id = req.params.id;

    // 2. Get User ID from Body or Query (Still needed to find the employee)
    const user_id = req.body.user_id || req.query.user_id;

    const {
      name,
      product_id,
      account_id,
      total_amount_currency,
      payment_mode,
      date,
      attachment,
      fileName,
    } = req.body;

    // ───────── 3. RESOLVE CLIENT ─────────
    const { client_id } = await getClientFromRequest(req);
    if (!client_id)
      return res
        .status(400)
        .json({ status: "error", message: "client_id not found" });

    // ───────── 4. VALIDATIONS ─────────
    if (!expense_id)
      return res
        .status(400)
        .json({ status: "error", message: "Missing expense ID in URL" });
    if (!user_id)
      return res
        .status(400)
        .json({ status: "error", message: "Missing user_id in body or query" });

    // ───────── 5. USER → EMPLOYEE LOOKUP ─────────
    // We search by user_id directly to avoid the "Employee not found" error
    const employee = await odooService.searchRead(
      "hr.employee",
      [["user_id", "=", Number(user_id)]],
      ["id", "name"],
      1
    );

    if (!employee.length) {
      return res.status(404).json({
        status: "error",
        message: "Employee not found for this user.",
      });
    }

    const employee_id = employee[0].id;

    // ───────── 6. VERIFY OWNERSHIP ─────────
    // Check if the expense exists AND belongs to this employee
    const existingExpense = await odooService.searchRead(
      "hr.expense",
      [
        ["id", "=", Number(expense_id)],
        ["employee_id", "=", employee_id], // Security Check
      ],
      ["id", "state"],
      1
    );

    if (!existingExpense.length) {
      return res.status(404).json({
        status: "error",
        message: "Expense not found or you do not have permission to edit it.",
      });
    }

    // ───────── 7. UPDATE FIELDS ─────────
    const vals = {};
    if (name) vals.name = name;
    if (product_id) vals.product_id = product_id;
    if (account_id) vals.account_id = account_id;
    if (total_amount_currency)
      vals.total_amount_currency = total_amount_currency;
    if (payment_mode) vals.payment_mode = payment_mode;
    if (date) vals.date = date;

    if (Object.keys(vals).length > 0) {
      await odooService.write("hr.expense", Number(expense_id), vals);
    }

    // ───────── 8. HANDLE NEW ATTACHMENT ─────────
    if (attachment && fileName) {
      try {
        const attachmentId = await odooService.create("ir.attachment", {
          name: fileName,
          datas: attachment.replace(/^data:.*;base64,/, ""),
          type: "binary",
          res_model: "hr.expense",
          res_id: Number(expense_id),
          mimetype: "application/octet-stream",
        });

        await odooService.write("hr.expense", Number(expense_id), {
          attachment_ids: [[4, attachmentId]],
        });
      } catch (attachError) {
        console.error("❌ Attachment update failed:", attachError);
      }
    }

    // ───────── 9. FETCH UPDATED DATA ─────────
    const updatedExpenseArr = await odooService.searchRead(
      "hr.expense",
      [["id", "=", Number(expense_id)]],
      [
        "id",
        "name",
        "employee_id",
        "product_id",
        "account_id",
        "payment_mode",
        "total_amount_currency",
        "state",
        "date",
      ],
      1
    );

    const directAttachments = await odooService.searchRead(
      "ir.attachment",
      [
        ["res_model", "=", "hr.expense"],
        ["res_id", "=", Number(expense_id)],
      ],
      ["id", "name", "local_url"]
    );

    const finalData = updatedExpenseArr[0];
    finalData.attachment_ids = directAttachments.map((att) => ({
      id: att.id,
      name: att.name,
      url: att.local_url,
    }));

    return res.status(200).json({
      status: "success",
      message: "Expense updated successfully",
      data: finalData,
    });
  } catch (error) {
    console.error("❌ Update Expense Error:", error);
    return res.status(500).json({
      status: "error",
      message: error.message || "Failed to update expense",
    });
  }
};
const createCalendarEvent = async (req, res) => {
  try {
    console.log("API called for Calendar Event creation");

    // 1. Get user_id (Accept from Body or Query)
    const user_id = req.body.user_id || req.query.user_id;

    const {
      name,
      start, // Expected format: "dd/mm/yyyy HH:MM:SS" or ISO
      stop, // Expected format: "dd/mm/yyyy HH:MM:SS" or ISO
      location,
      duration,
      description,
      privacy, // ✅ Added: 'public', 'private', or 'confidential'
    } = req.body;

    console.log(req.body);

    // ───────── 1. RESOLVE CLIENT ─────────
    const { client_id } = await getClientFromRequest(req);
    if (!client_id)
      return res
        .status(400)
        .json({ status: "error", message: "client_id not found" });

    // ───────── 2. VALIDATIONS ─────────
    const missingFields = [];
    if (!user_id) missingFields.push("user_id");
    if (!name) missingFields.push("name");
    if (!start) missingFields.push("start");
    if (!stop) missingFields.push("stop");

    if (missingFields.length) {
      return res.status(400).json({
        status: "error",
        message: `Missing fields: ${missingFields.join(", ")}`,
      });
    }

    // ───────── 3. RESOLVE USER (Preserved Logic) ─────────
    // We search res.users by ID to get the partner_id and verify existence
    const user = await odooService.searchRead(
      "res.users",
      [["id", "=", Number(user_id)]],
      ["partner_id", "name", "login", "email"],
      1
    );

    if (!user.length) {
      return res
        .status(404)
        .json({ status: "error", message: "User not found" });
    }

    const userData = user[0];
    // const userPartnerId = userData.partner_id ? userData.partner_id[0] : null; // (Not used, but available)

    // ───────── 4. PARSE DATES ─────────
    // Helper to convert "dd/mm/yyyy HH:MM:SS" to Odoo's preferred ISO format.
    const parseToOdooTime = (dateStr) => {
      if (dateStr && dateStr.includes("/")) {
        const [datePart, timePart] = dateStr.split(" ");
        const [day, month, year] = datePart.split("/");
        return `${year}-${month}-${day} ${timePart}`;
      }
      return dateStr; // Return as-is if already in a suitable format
    };

    const formattedStart = parseToOdooTime(start);
    const formattedStop = parseToOdooTime(stop);

    // ───────── 5. CREATE CALENDAR EVENT ─────────
    const eventVals = {
      name: name,
      start: formattedStart,
      stop: formattedStop,
      location: location,
      duration: duration,
      description: description || "",
      user_id: Number(user_id),
      privacy: privacy, // ✅ Added: Passes 'public', 'private', or 'confidential' string
    };

    console.log("Creating Calendar Event:", eventVals);
    const eventId = await odooService.create("calendar.event", eventVals);

    // ───────── 6. FETCH CREATED EVENT FOR RESPONSE ─────────
    const createdEventArr = await odooService.searchRead(
      "calendar.event",
      [["id", "=", eventId]],
      // ✅ Added 'privacy', removed 'partner_ids' and 'alarm_ids'
      [
        "id",
        "name",
        "start",
        "stop",
        "location",
        "duration",
        "description",
        "privacy",
        "user_id",
      ],
      1
    );

    const event = createdEventArr[0];

    // Format Response
    const responseData = {
      event_id: event.id,
      name: event.name,
      start: event.start,
      stop: event.stop,
      location: event.location,
      duration: event.duration,
      description: event.description,
      privacy: event.privacy, // ✅ Added to response
      user_id: {
        name: userData.name,
        email: userData.email || userData.login,
      },
    };

    return res.status(200).json({
      success: true,
      successMessage: "Calendar event created successfully",
      errorMessage: "",
      statusCode: 200,
      data: responseData,
    });
  } catch (error) {
    console.error("❌ Create Calendar Event Error:", error);
    return res.status(500).json({
      success: false,
      successMessage: "",
      errorMessage: `Internal server error: ${error.message}`,
      statusCode: 500,
    });
  }
};

const getCalendarEvent = async (req, res) => {
  try {
    console.log("API called for Fetching Calendar Events");

    // 1. Get user_id (Accepting from Query or Body)
    const user_id = req.query.user_id || req.body.user_id;

    // ───────── 1. RESOLVE CLIENT ─────────
    const { client_id } = await getClientFromRequest(req);
    if (!client_id)
      return res
        .status(400)
        .json({ status: "error", message: "client_id not found" });

    // ───────── 2. VALIDATIONS ─────────
    if (!user_id) {
      return res
        .status(400)
        .json({ status: "error", message: "Missing user_id" });
    }

    // ───────── 3. RESOLVE USER (Preserved Logic) ─────────
    // We search res.users by ID to verify existence and get basic details
    // This matches the logic used in createCalendarEvent
    const user = await odooService.searchRead(
      "res.users",
      [["id", "=", Number(user_id)]],
      ["id", "name", "login", "email"],
      1
    );

    if (!user.length) {
      return res
        .status(404)
        .json({ status: "error", message: "User not found" });
    }
    const userData = user[0];

    // ───────── 4. FETCH CALENDAR EVENTS ─────────
    // Fetch events where the creator (user_id) matches our user
    const events = await odooService.searchRead(
      "calendar.event",
      [["user_id", "=", Number(user_id)]],
      [
        "id",
        "name",
        "start",
        "stop",
        "location",
        "duration",
        "description",
        "privacy", // ✅ Added privacy field
        "user_id",
      ]
    );

    if (!events || events.length === 0) {
      return res.status(200).json({
        success: true,
        successMessage: "No calendar events found",
        data: [],
      });
    }

    // ───────── 5. FORMAT RESPONSE ─────────
    // Map the Odoo response to your cleaner JSON structure
    const result = events.map((event) => ({
      event_id: event.id,
      name: event.name,
      start: event.start,
      stop: event.stop,
      location: event.location,
      duration: event.duration,
      description: event.description || "",
      privacy: event.privacy, // ✅ Returns 'public', 'private', or 'confidential'
      user_id: {
        name: userData.name,
        email: userData.email || userData.login,
      },
    }));

    return res.status(200).json({
      success: true,
      successMessage: "Calendar events fetched successfully",
      errorMessage: "",
      statusCode: 200,
      data: result,
    });
  } catch (error) {
    console.error("❌ Get Calendar Event Error:", error);
    return res.status(500).json({
      success: false,
      successMessage: "",
      errorMessage: `Internal server error: ${error.message}`,
      statusCode: 500,
    });
  }
};

const getExpenseCategories = async (req, res) => {
  try {
    console.log("══════════════════════════════════════");
    console.log("🚀 API CALLED → FETCH EXPENSE CATEGORIES");
    console.log("📥 Request Query:", req.query);
    console.log("📥 Request Body:", req.body);

    // ───────── 1. RESOLVE CLIENT ─────────
    console.log("🔍 Resolving client from request...");
    const { client_id } = await getClientFromRequest(req);
    console.log("🏢 Resolved client_id:", client_id);

    if (!client_id) {
      console.error("❌ client_id not found");
      return res.status(400).json({
        status: "error",
        message: "client_id not found",
      });
    }

    // ───────── 2. PREPARE SEARCH DOMAIN ─────────
    const domain = [
      ["can_be_expensed", "=", true],
      ["client_id", "=", client_id],
    ];

    if (req.query.search) {
      domain.push(["name", "ilike", req.query.search]);
    }

    // ───────── 3. DEFINE FIELDS ─────────
    const fields = [
      "id",
      "name",
      "standard_price",
      "default_code",
      "categ_id",
      "property_account_expense_id",
      "expense_policy",
      "description",
    ];

    // ───────── 4. FETCH CATEGORIES ─────────
    console.log("🔄 Fetching expense categories (product.product)...");
    console.log("🔍 Search Domain:", JSON.stringify(domain));

    const categories = await odooService.searchRead(
      "product.product",
      domain,
      fields,
      0,
      0,
      null,
      client_id
    );

    console.log("📄 Raw categories fetched:", categories.length);

    if (!categories || categories.length === 0) {
      return res.status(200).json({
        status: "success",
        message: "No expense categories found",
        count: 0,
        data: [],
      });
    }

    // ───────── 5. PROPER DUPLICATION HANDLING (ODOO-CORRECT) ─────────
    /**
     * Deduplicate based on:
     * - Product Name
     * - Category
     * - Expense Account
     *
     * This prevents duplicates caused by variants or overlapping rules.
     */
    const uniqueMap = new Map();

    for (const item of categories) {
      const categoryId = Array.isArray(item.categ_id)
        ? item.categ_id[0]
        : "null";
      const expenseAccountId = Array.isArray(item.property_account_expense_id)
        ? item.property_account_expense_id[0]
        : "null";

      const uniqueKey = `${item.name}__${categoryId}__${expenseAccountId}`;

      if (!uniqueMap.has(uniqueKey)) {
        uniqueMap.set(uniqueKey, item);
      }
    }

    const uniqueCategories = Array.from(uniqueMap.values());

    console.log(
      `🧹 Duplicates removed: ${categories.length - uniqueCategories.length}`
    );

    // ───────── 6. FORMAT DATA ─────────
    const finalData = uniqueCategories.map((item) => ({
      id: item.id,
      name: item.name,
      cost: item.standard_price,
      reference: item.default_code || "",
      category_name: Array.isArray(item.categ_id) ? item.categ_id[1] : null,
      category_id: Array.isArray(item.categ_id) ? item.categ_id[0] : null,
      expense_account_name: Array.isArray(item.property_account_expense_id)
        ? item.property_account_expense_id[1]
        : null,
      expense_account_id: Array.isArray(item.property_account_expense_id)
        ? item.property_account_expense_id[0]
        : null,
      re_invoice_policy: item.expense_policy,
      description: item.description || "",
    }));

    console.log("✅ Expense categories fetched successfully");
    console.log("══════════════════════════════════════");

    return res.status(200).json({
      status: "success",
      message: "Expense categories retrieved successfully",
      count: finalData.length,
      data: finalData,
    });
  } catch (error) {
    console.error("❌ GET EXPENSE CATEGORIES ERROR:", error);
    return res.status(500).json({
      status: "error",
      message: error.message || "Failed to fetch expense categories",
    });
  }
};

const createExpenseCategory = async (req, res) => {
  try {
    console.log("------------------------------------------------");
    console.log("🚀 API Called: createExpenseCategory");
    console.log("📥 Request Body:", JSON.stringify(req.body, null, 2));

    const {
      name,
      cost,
      reference,
      category_name,
      description,
      expense_account_name, // Expense Account (property_account_expense_id)
      sales_tax_names,
      purchase_tax_names,
      re_invoice_policy,
    } = req.body;

    // ───────── 1️⃣ FETCH CLIENT CONTEXT ─────────
    console.log("🔍 Fetching client context from request...");
    const context = await getClientFromRequest(req);

    console.log("📄 Raw context:", JSON.stringify(context, null, 2));

    if (!context) {
      throw new Error("Client context is null or undefined");
    }

    const { user_id, client_id } = context;
    console.log(
      `✅ Context resolved → user_id: ${user_id}, client_id: ${client_id}`
    );

    if (!client_id) {
      throw new Error("Invalid client context: client_id missing");
    }

    // ───────── 2️⃣ VALIDATION ─────────
    console.log("🧪 Validating input...");
    if (!name) {
      return res.status(400).json({
        status: "error",
        message: "Expense Category name is required",
      });
    }
    console.log("✅ Validation passed");

    // ───────── 3️⃣ DUPLICATE CHECK (CLIENT SCOPED) ─────────
    console.log("🔄 Checking for duplicate expense category...");
    const existingProduct = await odooService.searchRead(
      "product.product",
      [
        ["name", "=", name],
        ["can_be_expensed", "=", true],
        ["client_id", "=", client_id],
      ],
      ["id"],
      1,
      client_id
    );

    console.log("📄 Duplicate check result:", existingProduct);

    if (existingProduct.length) {
      return res.status(409).json({
        status: "error",
        message: "An expense category with this name already exists.",
      });
    }

    // ───────── 4️⃣ RESOLVE PRODUCT CATEGORY ─────────
    let categ_id;
    if (category_name) {
      console.log(`🔍 Resolving product category: ${category_name}`);
      const category = await odooService.searchRead(
        "product.category",
        [["name", "=", category_name]],
        ["id"],
        1,
        client_id
      );

      if (category.length) {
        categ_id = category[0].id;
        console.log("✅ Product category resolved:", categ_id);
      }
    }

    // ───────── 5️⃣ RESOLVE EXPENSE ACCOUNT (AS PER IMAGE) ─────────
    let property_account_expense_id;
    if (expense_account_name) {
      console.log(`🔍 Resolving Expense Account: ${expense_account_name}`);
      const account = await odooService.searchRead(
        "account.account",
        [["name", "=", expense_account_name]],
        ["id"],
        1,
        client_id
      );

      if (account.length) {
        property_account_expense_id = account[0].id;
        console.log(
          "✅ Expense Account resolved:",
          property_account_expense_id
        );
      } else {
        console.warn("⚠️ Expense Account name provided but not found");
      }
    } else {
      console.log(
        "ℹ️ Expense Account not provided → Odoo will use Product Category default (as per UI behavior)"
      );
    }

    // ───────── 6️⃣ RESOLVE SALES TAXES ─────────
    let taxes_id = [[6, 0, []]];
    if (Array.isArray(sales_tax_names) && sales_tax_names.length) {
      const taxIds = [];
      for (const taxName of sales_tax_names) {
        const tax = await odooService.searchRead(
          "account.tax",
          [
            ["name", "=", taxName],
            ["type_tax_use", "=", "sale"],
          ],
          ["id"],
          1,
          client_id
        );
        if (tax.length) taxIds.push(tax[0].id);
      }
      if (taxIds.length) taxes_id = [[6, 0, taxIds]];
    }

    // ───────── 7️⃣ RESOLVE PURCHASE TAXES ─────────
    let supplier_taxes_id = [[6, 0, []]];
    if (Array.isArray(purchase_tax_names) && purchase_tax_names.length) {
      const taxIds = [];
      for (const taxName of purchase_tax_names) {
        const tax = await odooService.searchRead(
          "account.tax",
          [
            ["name", "=", taxName],
            ["type_tax_use", "=", "purchase"],
          ],
          ["id"],
          1,
          client_id
        );
        if (tax.length) taxIds.push(tax[0].id);
      }
      if (taxIds.length) supplier_taxes_id = [[6, 0, taxIds]];
    }

    // ───────── 8️⃣ CONSTRUCT FINAL PAYLOAD ─────────
    const vals = {
      name,
      can_be_expensed: true,
      type: "service",
      standard_price: cost || 0,
      default_code: reference || null,
      description: description || null,
      expense_policy: re_invoice_policy || "no",
      taxes_id,
      supplier_taxes_id,
      client_id,
    };

    // ✅ Only include if explicitly resolved
    if (categ_id) vals.categ_id = categ_id;
    if (property_account_expense_id) {
      vals.property_account_expense_id = property_account_expense_id;
    }

    // create_uid only if available
    if (user_id) {
      vals.create_uid = user_id;
    }

    console.log("📦 Final Odoo Payload:", JSON.stringify(vals, null, 2));

    // ───────── 9️⃣ CREATE PRODUCT (EXPENSE CATEGORY) ─────────
    const productId = await odooService.create(
      "product.product",
      vals,
      client_id
    );

    console.log("✅ Expense Category Created. ID:", productId);

    return res.status(201).json({
      status: "success",
      message: "Expense category created successfully",
      data: {
        id: productId,
        name,
      },
    });
  } catch (error) {
    console.error("❌ ERROR in createExpenseCategory");
    console.error("Message:", error.message);
    console.error("Stack:", error.stack);

    return res.status(error.status || 500).json({
      status: "error",
      message: error.message || "Failed to create expense category",
    });
  }
};

const getExpenseAccounts = async (req, res) => {
  try {
    console.log("------------------------------------------------");
    console.log("API Called: getExpenseAccounts");

    // 1. Read user_id safely (GET request compatible)
    const user_id = req.query?.user_id || req.body?.user_id || req.user_id;

    if (!user_id) {
      return res.status(400).json({
        status: "error",
        message: "user_id is required",
      });
    }

    console.log(`Resolved user_id: ${user_id}`);

    // 2. Fetch company_id from res.users
    console.log(`Fetching company_id for user_id: ${user_id}`);

    const userRecords = await odooService.searchRead(
      "res.users",
      [["id", "=", Number(user_id)]],
      ["company_id"],
      0,
      1,
      null,
      Number(user_id)
    );

    if (!userRecords || userRecords.length === 0) {
      return res.status(404).json({
        status: "error",
        message: "User not found in Odoo",
      });
    }

    const company_id = userRecords[0].company_id
      ? userRecords[0].company_id[0]
      : null;

    if (!company_id) {
      return res.status(400).json({
        status: "error",
        message: "Company not assigned to this user",
      });
    }

    console.log(`Resolved company_id: ${company_id}`);

    // 3. Define domain (company-specific)
    const domain = [["company_ids", "=", company_id]];

    // 4. Define fields (XML-RPC safe)
    const fields = ["code", "name", "account_type", "reconcile", "currency_id"];

    console.log("Fetching expense accounts...");

    // 5. Fetch accounts
    const records = await odooService.searchRead(
      "account.account",
      domain,
      fields,
      0,
      0,
      null,
      Number(user_id)
    );

    console.log(`Accounts found: ${records?.length || 0}`);

    // 6. Map response
    const data = records.map((rec) => ({
      id: rec.id,
      code: rec.code,
      name: rec.name,
      type: rec.account_type,
      allow_reconciliation: rec.reconcile,
      currency_id: rec.currency_id ? rec.currency_id[0] : null,
      currency_name: rec.currency_id ? rec.currency_id[1] : null,
    }));

    return res.status(200).json({
      status: "success",
      total: data.length,
      data,
    });
  } catch (error) {
    console.error("❌ Get Accounts Error:", error);
    return res.status(500).json({
      status: "error",
      message: error.message || "Failed to fetch accounts",
    });
  }
};

// ───────── GET SALES TAXES ─────────
const getSalesTaxes = async (req, res) => {
  try {
    console.log("------------------------------------------------");
    console.log("API Called: getSalesTaxes");

    // 1. Set System Auth ID explicitly (UID 2 = Admin)
    const SYSTEM_ADMIN_ID = 2;

    // 2. Define Search Domain
    // We filter for 'sale' to get only Sales Taxes
    const domain = [["type_tax_use", "=", "sale"]];

    // 3. Define Fields (Based on your screenshots)
    const fields = [
      "name", // Tax Name
      "description", // Description
      "type_tax_use", // Tax Type (sale/purchase)
      "tax_scope", // Tax Scope (service/goods)
      "invoice_label", // Label on Invoices
      "active", // Active Status
    ];

    console.log(`Fetching Sales Taxes using System ID: ${SYSTEM_ADMIN_ID}...`);

    // 4. Fetch Data from Odoo
    const records = await odooService.searchRead(
      "account.tax",
      domain,
      fields,
      0, // Offset
      0, // Limit
      null, // Order
      SYSTEM_ADMIN_ID
    );

    console.log(`Sales Taxes found: ${records ? records.length : 0}`);

    // 5. Map Data
    const data = records.map((rec) => ({
      id: rec.id,
      name: rec.name,
      description: rec.description || "",
      type: rec.type_tax_use, // 'sale'
      scope: rec.tax_scope, // 'service' or 'consu'
      label_on_invoice: rec.invoice_label,
      is_active: rec.active,
    }));

    return res.status(200).json({
      status: "success",
      total: data.length,
      data,
    });
  } catch (error) {
    console.error("❌ Get Sales Taxes Error:", error);
    return res.status(500).json({
      status: "error",
      message: error.message || "Failed to fetch sales taxes",
    });
  }
};

// ───────── GET PURCHASE TAXES ─────────
const getPurchaseTaxes = async (req, res) => {
  try {
    console.log("------------------------------------------------");
    console.log("API Called: getPurchaseTaxes");

    const SYSTEM_ADMIN_ID = 2;

    // 2. Define Search Domain
    // We filter for 'purchase' to get only Purchase Taxes
    const domain = [["type_tax_use", "=", "purchase"]];

    // 3. Define Fields (Same fields as Sales Tax)
    const fields = [
      "name",
      "description",
      "type_tax_use",
      "tax_scope",
      "invoice_label",
      "active",
    ];

    console.log(
      `Fetching Purchase Taxes using System ID: ${SYSTEM_ADMIN_ID}...`
    );

    // 4. Fetch Data from Odoo
    const records = await odooService.searchRead(
      "account.tax",
      domain,
      fields,
      0,
      0,
      null,
      SYSTEM_ADMIN_ID
    );

    console.log(`Purchase Taxes found: ${records ? records.length : 0}`);

    const data = records.map((rec) => ({
      id: rec.id,
      name: rec.name,
      description: rec.description || "",
      type: rec.type_tax_use, // 'purchase'
      scope: rec.tax_scope, // 'service' or 'consu'
      label_on_invoice: rec.invoice_label,
      is_active: rec.active,
    }));

    return res.status(200).json({
      status: "success",
      total: data.length,
      data,
    });
  } catch (error) {
    console.error("❌ Get Purchase Taxes Error:", error);
    return res.status(500).json({
      status: "error",
      message: error.message || "Failed to fetch purchase taxes",
    });
  }
};

const getProductCategory = async (req, res) => {
  try {
    console.log("------------------------------------------------");
    console.log("API Called: getProductCategory");

    // 1. Set System Auth ID explicitly (UID 2 = Admin)
    const SYSTEM_ADMIN_ID = 2;

    // 2. Define Search Domain
    // Fetch all categories (no filter)
    const domain = [];

    // 3. Define Fields
    // Based on your screenshot, the primary field is 'display_name'
    const fields = [
      "display_name", // "All / Expenses"
      "parent_id", // Parent Category (Standard for hierarchy)
    ];

    console.log(
      `Fetching Product Categories using System ID: ${SYSTEM_ADMIN_ID}...`
    );

    // 4. Fetch Data from Odoo
    const records = await odooService.searchRead(
      "product.category", //
      domain,
      fields,
      0,
      0,
      null,
      SYSTEM_ADMIN_ID
    );

    console.log(`Categories found: ${records ? records.length : 0}`);

    // 5. Map Data
    const data = records.map((rec) => ({
      id: rec.id,
      name: rec.display_name, // The full hierarchical name (e.g., "All / Sales")

      // Handle Parent Category (Many2one: [id, name])
      parent_id: rec.parent_id ? rec.parent_id[0] : null,
      parent_name: rec.parent_id ? rec.parent_id[1] : null,
    }));

    return res.status(200).json({
      status: "success",
      total: data.length,
      data,
    });
  } catch (error) {
    console.error("❌ Get Product Category Error:", error);
    return res.status(500).json({
      status: "error",
      message: error.message || "Failed to fetch product categories",
    });
  }
};

const getEmployeesBasicInfo = async (req, res) => {
  try {
    const { client_id, currentUser } = await getClientFromRequest(req);
    console.log("API Called - Get Employees Basic Info");

    let employeeSearchDomain;

    if (
      currentUser.is_client_employee_user &&
      !currentUser.is_client_employee_admin
    ) {
      employeeSearchDomain = [
        ["address_id", "=", client_id],
        ["user_id", "=", currentUser.id],
      ];
    } else {
      employeeSearchDomain = [["address_id", "=", client_id]];
    }

    const employeeData = await odooHelpers.searchRead(
      "hr.employee",
      employeeSearchDomain,
      ["id", "name", "job_id", "reporting_manager_id"]
    );
    const formattedEmployees = employeeData.map((employee) => ({
      id: employee.id,
      name: employee.name,
      job_position: employee.job_id ? employee.job_id[1] : null,
      reporting_manager: employee.reporting_manager_id
        ? employee.reporting_manager_id[1]
        : null,
    }));

    return res.status(200).json({
      status: "success",
      count: formattedEmployees.length,
      data: formattedEmployees,
    });
  } catch (error) {
    console.error("Error fetching employees basic info:", error);
    return res.status(error.status || 500).json({
      status: "error",
      message: error.message || "Failed to fetch employees basic info",
    });
  }
};

const createExpenseReport = async (req, res) => {
  try {
    console.log("══════════════════════════════════════");
    console.log("🚀 API CALLED → CREATE EXPENSE REPORT");

    const { expense_ids } = req.body;
    const user_id = req.body.user_id || req.query.user_id;

    if (!expense_ids || !Array.isArray(expense_ids) || expense_ids.length === 0) {
      return res.status(400).json({
        status: "error",
        message: "expense_ids array is required"
      });
    }

    if (!user_id) {
      return res.status(400).json({
        status: "error",
        message: "user_id is required"
      });
    }

    const { client_id } = await getClientFromRequest(req);
    if (!client_id) {
      return res.status(400).json({
        status: "error",
        message: "client_id not found"
      });
    }

    console.log(`👤 User: ${user_id} | 🏢 Client: ${client_id}`);
    console.log(`📋 Expense IDs to submit: ${expense_ids.join(", ")}`);

    const expenses = await odooService.searchRead(
      "hr.expense",
      [["id", "in", expense_ids.map(Number)]],
      ["id", "name", "employee_id", "state"],
      0,
      expense_ids.length
    );

    if (expenses.length !== expense_ids.length) {
      return res.status(404).json({
        status: "error",
        message: "One or more expense IDs not found"
      });
    }

    const nonDraftExpenses = expenses.filter(exp => exp.state !== "draft");
    if (nonDraftExpenses.length > 0) {
      return res.status(400).json({
        status: "error",
        message: "All expenses must be in draft state",
        non_draft_expenses: nonDraftExpenses.map(e => ({ id: e.id, state: e.state }))
      });
    }

    // ───────── CHECK ATTACHMENT REQUIREMENT (OPTIONAL) ─────────
    // Odoo condition: nb_attachment >= 1 or sheet_id
    // Making attachment check optional as per requirement

    // Uncomment below if you want to enforce mandatory attachment
    /*
    for (const expense of expenses) {
      const attachments = await odooService.searchRead(
        "ir.attachment",
        [
          ["res_model", "=", "hr.expense"],
          ["res_id", "=", expense.id]
        ],
        ["id"]
      );

      if (attachments.length === 0) {
        return res.status(400).json({
          status: "error",
          message: `Expense "${expense.name}" (ID: ${expense.id}) requires at least 1 attachment`,
          expense_id: expense.id
        });
      }
    }
    */

    console.log("✅ All validations passed. Calling action_submit_expenses...");

    const result = await odooService.callCustomMethod(
      "hr.expense",
      "action_submit_expenses",
      [expense_ids.map(Number)]
    );

    console.log("📊 Method Result:", JSON.stringify(result, null, 2));

    // ───────── FETCH CREATED SHEET ID ─────────
    let sheetId = null;
    let sheetState = null;

    // The result might contain the sheet ID, or we need to fetch it
    if (result && result.res_id) {
      sheetId = result.res_id;
    } else {
      // Fetch the sheet created for these expenses
      const sheets = await odooService.searchRead(
        "hr.expense.sheet",
        [["expense_line_ids", "in", expense_ids.map(Number)]],
        ["id", "name", "state"],
        0,
        1,
        "id desc"
      );

      if (sheets.length > 0) {
        sheetId = sheets[0].id;
        sheetState = sheets[0].state;
      }
    }

    return res.status(200).json({
      status: "success",
      message: "Expense report created successfully",
      data: {
        sheet_id: sheetId,
        sheet_state: sheetState || "draft",
        expense_ids: expense_ids,
        result: result
      }
    });

  } catch (error) {
    console.error("❌ CREATE EXPENSE REPORT ERROR:", error);
    console.error("🔥 Error Stack:", error.stack);
    return res.status(500).json({
      status: "error",
      message: error.message || "Failed to create expense report"
    });
  }
};
const submitExpenseSheetToManager = async (req, res) => {
  try {
    console.log("══════════════════════════════════════");
    console.log("🚀 API CALLED → SUBMIT EXPENSE SHEET TO MANAGER");

    const { sheet_id } = req.body;
    const user_id = req.body.user_id || req.query.user_id;

    if (!sheet_id) {
      return res.status(400).json({
        status: "error",
        message: "sheet_id is required"
      });
    }

    if (!user_id) {
      return res.status(400).json({
        status: "error",
        message: "user_id is required"
      });
    }

    const { client_id } = await getClientFromRequest(req);
    if (!client_id) {
      return res.status(400).json({
        status: "error",
        message: "client_id not found"
      });
    }

    console.log(`👤 User: ${user_id} | 🏢 Client: ${client_id}`);
    console.log(`📄 Sheet ID to submit: ${sheet_id}`);

    const sheets = await odooService.searchRead(
      "hr.expense.sheet",
      [["id", "=", Number(sheet_id)]],
      ["id", "name", "employee_id", "state", "expense_line_ids"],
      0,
      1
    );

    if (!sheets.length) {
      return res.status(404).json({
        status: "error",
        message: `Expense sheet with ID ${sheet_id} not found`
      });
    }

    const sheet = sheets[0];

    if (sheet.state !== "draft") {
      return res.status(400).json({
        status: "error",
        message: `Expense sheet must be in draft state. Current state: ${sheet.state}`,
        current_state: sheet.state
      });
    }

    console.log("✅ Sheet validation passed. Calling action_submit_sheet...");

    const result = await odooService.callCustomMethod(
      "hr.expense.sheet",
      "action_submit_sheet",
      [[Number(sheet_id)]]
    );

    console.log("📊 Method Result:", JSON.stringify(result, null, 2));

    // ───────── FETCH UPDATED SHEET STATE ─────────
    const updatedSheets = await odooService.searchRead(
      "hr.expense.sheet",
      [["id", "=", Number(sheet_id)]],
      ["id", "name", "state", "employee_id"],
      0,
      1
    );

    const updatedState = updatedSheets.length > 0 ? updatedSheets[0].state : null;

    return res.status(200).json({
      status: "success",
      message: "Expense sheet submitted to manager successfully",
      data: {
        sheet_id: sheet_id,
        previous_state: "draft",
        current_state: updatedState || "submit",
        employee_id: sheet.employee_id,
        result: result
      }
    });

  } catch (error) {
    console.error("❌ SUBMIT EXPENSE SHEET ERROR:", error);
    console.error("🔥 Error Stack:", error.stack);
    return res.status(500).json({
      status: "error",
      message: error.message || "Failed to submit expense sheet to manager"
    });
  }
};

const updateExpenseCategory = async (req, res) => {
  try {
    const id = req.params.id || req.body.id;
    const user_id = req.query.user_id || req.body.user_id;
    const {
      name,
      cost,
      reference,
      category_name,
      description,
      expense_account_name,
      sales_tax_names,
      purchase_tax_names,
      re_invoice_policy,
    } = req.body;

    if (!id || !user_id) {
      return res.status(400).json({
        status: "error",
        message: "Expense Category ID and User ID are required",
      });
    }

    // ───────── 1️⃣ FETCH CLIENT CONTEXT ─────────
    const context = await getClientFromRequest(req);
    const client_id = context.client_id;


    // ───────── 2️⃣ VERIFY RECORD EXISTENCE ─────────
    const debugRecord = await odooService.searchRead(
      "product.product",
      [["id", "=", parseInt(id)], ["client_id", "=", client_id]],
      ["id", "name", "client_id"],
      1
    );

    if (debugRecord.length === 0) {
      return res.status(404).json({
        status: "error",
        message: "Record not found for this client.",
      });
    }

    const updateVals = {};
    if (name) updateVals.name = name;
    if (cost !== undefined) updateVals.standard_price = parseFloat(cost);
    if (reference !== undefined) updateVals.default_code = reference;
    if (description !== undefined) updateVals.description = description;
    if (re_invoice_policy) updateVals.expense_policy = re_invoice_policy;


    await odooService.write(
      "product.product",
      [parseInt(id)],
      updateVals,
      null
    );
    return res.status(200).json({
      status: "success",
      message: "Expense category updated successfully",
      updated_id: id
    });

  } catch (error) {
    console.error("❌ EXCEPTION in updateExpenseCategory:", error.message);
    return res.status(500).json({
      status: "error",
      message: error.message || "Internal Server Error",
    });
  }
};
const deleteExpenseCategory = async (req, res) => {
  try {
    console.log("------------------------------------------------");
    console.log("🗑️ API Called: deleteExpenseCategory");

    const id = req.params.id;
    const user_id = (req.query && req.query.user_id) || (req.body && req.body.user_id);

    // ✅ User ID missing check
    if (!user_id) {
      return res.status(400).json({
        status: "error",
        message: "User ID not found in query or body",
      });
    }

    if (!id) {
      return res.status(400).json({
        status: "error",
        message: "Expense Category ID is required",
      });
    }

    const context = await getClientFromRequest(req);
    const client_id = context ? context.client_id : null;

    if (!client_id) {
      return res.status(404).json({
        status: "error",
        message: "Client context not found for this user",
      });
    }

    // ✅ Ownership verify karein
    const existingRecord = await odooService.searchRead(
      "product.product",
      [["id", "=", parseInt(id)], ["client_id", "=", client_id]],
      ["id"],
      1
    );

    if (existingRecord.length === 0) {
      return res.status(404).json({
        status: "error",
        message: "Expense category not found .",
      });
    }

    // ───────── EXECUTE DELETE ─────────
    await odooService.unlink("product.product", [parseInt(id)], null);

    return res.status(200).json({
      status: "success",
      message: "Expense category deleted successfully",
      deleted_id: id
    });

  } catch (error) {
    console.error("❌ ODOO ERROR:", error.message);

    // ✅ Check for specific Odoo Foreign Key Constraints (fkey)
    const errMsg = error.message;

    if (errMsg.includes("account_move_line_product_id_fkey") || errMsg.includes("Journal Item")) {
      return res.status(409).json({ // 409 Conflict best rehta hai Linked records ke liye
        status: "error",
        message: "Sorry, you cannot delete this product because it is already linked to Journal Items.",
      });
    }

    if (errMsg.includes("hr_expense_product_id_fkey") || errMsg.includes("hr.expense")) {
      return res.status(409).json({
        status: "error",
        message: "Sorry, you cannot delete this Expense  because it is linked to existing Employee Expenses",
      });
    }

    if (errMsg.includes("Access Denied")) {
      return res.status(403).json({
        status: "error",
        message: "Access Denied: You do not have permission to delete this record.",
      });
    }

    // Default Error agar kuch naya aaye
    return res.status(400).json({
      status: "error",
      message: `Odoo Restriction: ${errMsg.split('\n')[0]}`,
    });
  }
};
module.exports = {
  updateExpenseCategory,
  createEmployee,
  updateEmployee,
  getEmployees,
  getEmployeeById,
  deleteEmployee,
  getEmployeeByCode,
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
  getExpenseCategories,
  getExpenseAccounts,
  getProductCategory,
  getPurchaseTaxes,
  getSalesTaxes,
  getEmployeesBasicInfo,
  createExpenseReport,
  submitExpenseSheetToManager,
  deleteExpenseCategory
};
