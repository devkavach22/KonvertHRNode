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
  createAttendancePolicyService,
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

const createAttendancePolicy = async (req, res) => {
  try {
    const data = { ...req.body };

    const validationError = validateAttendancePolicyData(data, false);
    if (validationError) {
      return res.status(validationError.status).json({
        status: "error",
        message: validationError.message,
      });
    }

    const policyId = await createAttendancePolicyService(data);

    return res.status(201).json({
      status: "success",
      message: "Attendance Policy created successfully",
      id: policyId,
    });
  } catch (error) {
    console.error("Error creating attendance policy:", error);
    return res.status(500).json({
      status: "error",
      message: "Failed to create attendance policy",
      error: error.message,
    });
  }
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
      group_id,
      approval_user_id,
      approval_sequance,
      longitude,
      device_id,
      device_unique_id,
      latitude,
      device_name,
      system_version,
      ip_address,
      device_platform,
      account_number,
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

    const trimmedName = name.trim();
    const trimmedEmail = private_email.trim();

    const existing = await odooHelpers.searchRead(
      "hr.employee",
      ["|", ["name", "=", trimmedName], ["private_email", "=", trimmedEmail]],
      ["id"]
    );

    if (existing.length > 0) {
      return res.status(409).json({
        status: "error",
        message: "Employee already exists",
      });
    }

    const { client_id } = await getClientFromRequest(req);
    const userIdFromParams = req.query.user_id
      ? parseInt(req.query.user_id)
      : null;

    console.log("user_id from params:", userIdFromParams);
    console.log("client_id:", client_id);

    let userId = null;
    let employeeId = null;

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

        await odooHelpers.write("res.users", userId, {
          is_client_employee_user: true,
        });

        // Update bank account partner_id if bank_account_id is provided
        if (bank_account_id && partnerId) {
          try {
            console.log("==========================================");
            console.log("BANK ACCOUNT UPDATE PROCESS STARTED");
            console.log("Bank account ID received:", bank_account_id);
            console.log("User's partner_id:", partnerId);
            console.log("==========================================");

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
              console.log("==========================================");
            } else {
              console.log(
                "✗ ERROR: Bank account with ID",
                bank_account_id,
                "NOT FOUND"
              );
              console.log("==========================================");
            }
          } catch (bankError) {
            console.error("==========================================");
            console.error(
              "✗ ERROR updating bank account partner_id:",
              bankError
            );
            console.error("Error details:", bankError.message);
            console.error("==========================================");
          }
        } else {
          console.log("==========================================");
          console.log("BANK ACCOUNT UPDATE SKIPPED");
          console.log("bank_account_id provided:", !!bank_account_id);
          console.log("partnerId available:", !!partnerId);
          console.log("==========================================");
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
          bank_account_id,
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
          mobile: mobile_phone || "",
          is_client_employee_user: true,
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
        console.log("User's partner ID:", partnerId);

        // Update bank account partner_id if account_number is provided
        if (account_number && partnerId) {
          try {
            console.log("==========================================");
            console.log("BANK ACCOUNT UPDATE PROCESS STARTED");
            console.log("Account number received:", account_number);
            console.log("User's partner_id:", partnerId);
            console.log("==========================================");

            const bankAccounts = await odooHelpers.searchRead(
              "res.partner.bank",
              [["acc_number", "=", account_number]],
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
              console.log("==========================================");
            } else {
              console.log(
                "✗ ERROR: Bank account with account number",
                account_number,
                "NOT FOUND"
              );
              console.log("==========================================");
            }
          } catch (bankError) {
            console.error("==========================================");
            console.error(
              "✗ ERROR updating bank account partner_id:",
              bankError
            );
            console.error("Error details:", bankError.message);
            console.error("==========================================");
          }
        } else {
          console.log("==========================================");
          console.log("BANK ACCOUNT UPDATE SKIPPED");
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
            bank_account_id,
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

      if (group_id && approval_user_id && approval_sequance !== undefined) {
        try {
          console.log("Creating employee approval user details...");
          const approvalData = {
            group_id: parseInt(group_id),
            user_id: parseInt(approval_user_id),
            approval_sequance: parseInt(approval_sequance),
            employee_id: employeeId,
          };

          const approvalId = await odooHelpers.create(
            "employee.approval.user.details",
            approvalData
          );

          console.log(
            "Employee approval user details created with ID:",
            approvalId
          );
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
            "id",
            "name",
            "father_name",
            "gender",
            "birthday",
            "blood_group",
            "private_email",
            "present_address",
            "permanent_address",
            "emergency_contact_name",
            "emergency_contact_relation",
            "emergency_contact_mobile",
            "emergency_contact_address",
            "mobile_phone",
            "pin_code",
            "work_phone",
            "marital",
            "spouse_name",
            "attendance_policy_id",
            "employee_category",
            "shift_roster_id",
            "resource_calendar_id",
            "district_id",
            "state_id",
            "bussiness_type_id",
            "business_location_id",
            "job_id",
            "department_id",
            "work_location_id",
            "country_id",
            "is_geo_tracking",
            "aadhaar_number",
            "pan_number",
            "voter_id",
            "passport_id",
            "esi_number",
            "category",
            "is_uan_number_applicable",
            "uan_number",
            "cd_employee_num",
            "name_of_post_graduation",
            "name_of_any_other_education",
            "total_experiance",
            "religion",
            "date_of_marriage",
            "probation_period",
            "confirmation_date",
            "hold_remarks",
            "is_lapse_allocation",
            "group_company_joining_date",
            "week_off",
            "grade_band",
            "status",
            "employee_password",
            "hold_status",
            "bank_account_id",
            "attendance_capture_mode",
            "reporting_manager_id",
            "head_of_department_id",
            "barcode",
            "pin",
            "type_of_sepration",
            "resignation_date",
            "notice_period_days",
            "joining_date",
            "employment_type",
            "user_id",
            "driving_license",
            "upload_passbook",
            "image_1920",
            "name_of_site",
            "longitude",
            "device_id",
            "device_unique_id",
            "latitude",
            "device_name",
            "system_version",
            "ip_address",
            "device_platform",
          ]
        );

        if (employeeData.length > 0) {
          const employee = employeeData[0];
          const approvalDetails = await odooHelpers.searchRead(
            "employee.approval.user.details",
            [["employee_id", "=", employee.id]],
            ["group_id", "user_id", "approval_sequance"]
          );

          if (approvalDetails.length > 0) {
            employee.group_id = approvalDetails[0].group_id;
            employee.approval_user_id = approvalDetails[0].user_id;
            employee.approval_sequance = approvalDetails[0].approval_sequance;
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

    // Fetch the employee that matches the ID and the client_id
    const employeeData = await odooHelpers.searchRead(
      "hr.employee",
      [
        ["id", "=", parseInt(id)],
        ["address_id", "=", client_id]
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
        "ip_address", "device_platform"
      ]
    );

    // If array is empty, the employee does not exist or doesn't belong to this client
    if (!employeeData || employeeData.length === 0) {
      return res.status(404).json({
        status: "error",
        message: "No employee found",
      });
    }

    const employee = employeeData[0];

    // Fetch extra approval details for this specific employee
    const approvalDetails = await odooHelpers.searchRead(
      "employee.approval.user.details",
      [["employee_id", "=", employee.id]],
      ["group_id", "user_id", "approval_sequance"]
    );

    if (approvalDetails.length > 0) {
      employee.group_id = approvalDetails[0].group_id;
      employee.approval_user_id = approvalDetails[0].user_id;
      employee.approval_sequance = approvalDetails[0].approval_sequance;
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
    } = req.body;

    const existingEmployee = await odooHelpers.searchRead(
      "hr.employee",
      [["id", "=", parseInt(id)]],
      ["id", "private_email", "user_id"]
    );

    if (existingEmployee.length === 0) {
      return res.status(404).json({
        status: "error",
        message: "Employee not found",
      });
    }

    const currentEmployee = existingEmployee[0];

    if (name || private_email) {
      const trimmedName = name?.trim();
      const trimmedEmail = private_email?.trim();

      let duplicateCheckDomain = [];
      if (trimmedName && trimmedEmail) {
        duplicateCheckDomain = [
          "&",
          ["id", "!=", parseInt(id)],
          "|",
          ["name", "=", trimmedName],
          ["private_email", "=", trimmedEmail],
        ];
      } else if (trimmedName) {
        duplicateCheckDomain = [
          "&",
          ["id", "!=", parseInt(id)],
          ["name", "=", trimmedName],
        ];
      } else if (trimmedEmail) {
        duplicateCheckDomain = [
          "&",
          ["id", "!=", parseInt(id)],
          ["private_email", "=", trimmedEmail],
        ];
      }

      if (duplicateCheckDomain.length > 0) {
        const duplicate = await odooHelpers.searchRead(
          "hr.employee",
          duplicateCheckDomain,
          ["id"]
        );

        if (duplicate.length > 0) {
          return res.status(409).json({
            status: "error",
            message:
              "Another employee with the same name or email already exists",
          });
        }
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
    if (bank_account_id !== undefined) data.bank_account_id = bank_account_id;
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

        await odooHelpers.write(
          "res.users",
          currentEmployee.user_id,
          updateUserData
        );
        console.log("User updated with ID:", currentEmployee.user_id);
        userUpdateStatus = "updated";
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
      updated_by: write_uid_value,
      user_update_status: userUpdateStatus,
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
    console.log("===== EMPLOYEE DASHBOARD START =====");
    console.log("Request Params:", req.query);

    const {
      user_id,
      leave_type_id,
      state,
      date_from,
      date_to,
      limit = 10,
      offset = 0,
      use_mock = false
    } = req.query;

    /* ───────── MOCK RESPONSE ───────── */
    if (use_mock === "true") {
      return res.status(200).json({
        success: true,
        cards: [
          { leave_type: "Annual Leave", total: 12, used: 5, remaining: 7 },
          { leave_type: "Medical Leave", total: 10, used: 4, remaining: 6 },
          { leave_type: "Casual Leave", total: 6, used: 1, remaining: 5 },
          { leave_type: "Other Leave", total: 4, used: 2, remaining: 2 }
        ],
        tableData: [],
        meta: { total: 0, limit: Number(limit), offset: Number(offset) }
      });
    }

    /* ───────── VALIDATION ───────── */
    if (!user_id) {
      return res.status(400).json({
        success: false,
        errorMessage: "user_id is required"
      });
    }

    /* ───────── RESOLVE ROOT EMPLOYEE ───────── */
    const user = await odooService.searchRead(
      "res.users",
      [["id", "=", Number(user_id)]],
      ["partner_id"],
      1
    );

    const partnerId = user?.[0]?.partner_id?.[0];
    if (!partnerId) throw new Error("Partner not found for user");

    const rootEmployee = await odooService.searchRead(
      "hr.employee",
      [["address_id", "=", partnerId]],
      ["id", "name", "address_id"],
      1
    );

    if (!rootEmployee.length) throw new Error("Root employee not found");

    const rootEmployeeId = rootEmployee[0].id;
    const clientId = rootEmployee[0].address_id[0];

    console.log("Root Employee ID:", rootEmployeeId);
    console.log("Resolved Client ID:", clientId);

    /* ───────── RESOLVE ALL EMPLOYEES UNDER CLIENT ───────── */
    const employees = await odooService.searchRead(
      "hr.employee",
      [["address_id", "=", clientId]],
      ["id", "name"]
    );

    const employeeIds = employees.map(e => e.id);

    console.log("Resolved Employee IDs:", employeeIds);

    /* ───────── LEAVE TYPES ───────── */
    const leaveTypes = await odooService.searchRead(
      "hr.leave.type",
      [],
      ["id", "name"]
    );

    /* ───────── CARD DATA ───────── */
    const allocations = await odooService.searchRead(
      "hr.leave.allocation",
      [
        ["employee_id", "in", employeeIds],
        ["state", "=", "validate"]
      ],
      ["holiday_status_id", "number_of_days"]
    );

    const approvedLeaves = await odooService.searchRead(
      "hr.leave",
      [
        ["employee_id", "in", employeeIds],
        ["state", "=", "validate"]
      ],
      ["holiday_status_id", "number_of_days"]
    );

    const cards = {
      annual: { leave_type: "Annual Leave", total: 0, used: 0, remaining: 0 },
      medical: { leave_type: "Medical Leave", total: 0, used: 0, remaining: 0 },
      casual: { leave_type: "Casual Leave", total: 0, used: 0, remaining: 0 },
      other: { leave_type: "Other Leave", total: 0, used: 0, remaining: 0 }
    };

    const leaveTypeCategoryMap = {};
    leaveTypes.forEach(t => {
      const name = t.name.toLowerCase();
      if (name.includes("annual")) leaveTypeCategoryMap[t.id] = "annual";
      else if (name.includes("medical")) leaveTypeCategoryMap[t.id] = "medical";
      else if (name.includes("casual")) leaveTypeCategoryMap[t.id] = "casual";
      else leaveTypeCategoryMap[t.id] = "other";
    });

    allocations.forEach(a => {
      const category = leaveTypeCategoryMap[a.holiday_status_id?.[0]] || "other";
      cards[category].total += a.number_of_days;
    });

    approvedLeaves.forEach(l => {
      const category = leaveTypeCategoryMap[l.holiday_status_id?.[0]] || "other";
      cards[category].used += l.number_of_days;
    });

    Object.values(cards).forEach(c => {
      c.remaining = c.total - c.used;
    });

    console.log("Cards:", Object.values(cards));

    /* ───────── TABLE DOMAIN ───────── */
    let domain = [["employee_id", "in", employeeIds]];

    if (leave_type_id)
      domain.push(["holiday_status_id", "=", Number(leave_type_id)]);
    if (state)
      domain.push(["state", "=", state]);
    if (date_from)
      domain.push(["request_date_from", ">=", date_from]);
    if (date_to)
      domain.push(["request_date_to", "<=", date_to]);

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
        "state"
      ],
      Number(offset),
      Number(limit),
      "request_date_from desc"
    );

    const tableData = leaves.map(l => ({
      id: l.id,
      employee_id: l.employee_id?.[0],
      employee_name: l.employee_id?.[1],
      leave_type_id: l.holiday_status_id?.[0],
      leave_type: l.holiday_status_id?.[1],
      from: l.request_date_from,
      to: l.request_date_to,
      no_of_days: l.number_of_days,
      status: l.state
    }));

    console.log("Table rows:", tableData.length);
    console.log("===== EMPLOYEE DASHBOARD END =====");

    return res.status(200).json({
      success: true,
      cards: Object.values(cards),
      tableData,
      meta: {
        total: totalCount,
        limit: Number(limit),
        offset: Number(offset)
      }
    });

  } catch (error) {
    console.error("❌ Employee Dashboard Error:", error);
    return res.status(500).json({
      success: false,
      errorMessage: error.message
    });
  }
};

const createExpense = async (req, res) => {
  try {
    console.log("══════════════════════════════════════");
    console.log("🚀 API CALLED → CREATE EXPENSE");

    const user_id = req.body.user_id || req.query.user_id; // This is 3138
    console.log("👤 Resolved user_id:", user_id);

    let {
      name,
      product_id,
      account_id,
      total_amount_currency,
      payment_mode,
      date,
      attachment,
      fileName,
    } = req.body;

    // ───────── 1. RESOLVE CLIENT ─────────
    const { client_id } = await getClientFromRequest(req);

    if (!client_id) {
      return res.status(400).json({ status: "error", message: "client_id not found" });
    }

    // ───────── 2. NORMALIZE IDS ─────────
    product_id = typeof product_id === "object" ? product_id?.id : product_id;
    account_id = typeof account_id === "object" ? account_id?.id : account_id;

    // ───────── 3. VALIDATIONS ─────────
    if (!user_id || !name || !product_id || !account_id || !total_amount_currency || !payment_mode) {
      return res.status(400).json({ status: "error", message: "Missing required fields" });
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
      return res.status(400).json({ status: "error", message: "Invalid user_id" });
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
      return res.status(400).json({ status: "error", message: "Employee not found" });
    }

    const employee_id = employee[0].id; // This is 17565
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

    // ───────── 7. ATTACHMENT (FIXED) ─────────
    if (attachment && fileName) {
      // FIX 1: Ensure we only send the base64 part
      const base64Data = attachment.split(",").pop();

      // FIX 2: Create attachment with explicit mapping
      const attachmentId = await odooService.create(
        "ir.attachment",
        {
          name: fileName,
          datas: base64Data,
          type: "binary",
          res_model: "hr.expense",
          res_id: Number(expenseId), // Ensure this is a number
          company_id: companyId,     // Ensure it belongs to the same company
        },
        client_id
      );

      // FIX 3: Removed the 'write' to attachment_ids. 
      // In Odoo, setting res_model/res_id on the attachment is enough to link it.
      // Writing to hr.expense sometimes triggers a re-check of the user context, causing your error.
    }

    return res.status(201).json({
      status: "success",
      message: "Expense created successfully",
      expense_id: expenseId,
    });

  } catch (error) {
    console.error("❌ CREATE EXPENSE ERROR:", error);
    return res.status(500).json({
      status: "error",
      message: error.message || "Failed to create expense",
    });
  }
};

const getExpense = async (req, res) => {
  try {
    console.log("══════════════════════════════════════");
    console.log("🚀 API CALLED → FETCH EXPENSES");
    console.log("📥 Request Query:", req.query);
    console.log("📥 Request Body:", req.body);

    // ───────── 1. GET USER ID ─────────
    const user_id = req.query.user_id || req.body.user_id;
    console.log("👤 Resolved user_id:", user_id);

    // ───────── 2. RESOLVE CLIENT ─────────
    console.log("🔍 Resolving client from request...");
    const { client_id } = await getClientFromRequest(req);
    console.log("🏢 Resolved client_id:", client_id);

    if (!client_id) {
      console.error("❌ client_id not found");
      return res.status(400).json({
        status: "error",
        message: "client_id not found"
      });
    }

    if (!user_id) {
      console.error("❌ Missing user_id");
      return res.status(400).json({
        status: "error",
        message: "Missing user_id"
      });
    }

    // ───────── 3. FETCH USER (user_id → partner_id) ─────────
    console.log("🔄 Fetching user from res.users...");
    const user = await odooService.searchRead(
      "res.users",
      [["id", "=", Number(user_id)]],
      ["partner_id"],
      1,
      client_id
    );

    console.log("📄 User result:", user);

    if (!user.length || !user[0].partner_id) {
      console.error("❌ Invalid user_id or partner_id missing");
      return res.status(400).json({
        status: "error",
        message: "Invalid user_id or Partner not found"
      });
    }

    const partnerId = user[0].partner_id[0];
    console.log("🔗 Resolved partner_id:", partnerId);

    // ───────── 4. FETCH EMPLOYEE ─────────
    let employee = [];

    console.log("🔄 Attempt 1: Fetch employee using user_id...");
    employee = await odooService.searchRead(
      "hr.employee",
      [["user_id", "=", Number(user_id)]],
      ["id", "name", "company_id"],
      1,
      client_id
    );

    if (!employee.length) {
      console.log("⚠️ No employee via user_id. Trying partner_id...");
      employee = await odooService.searchRead(
        "hr.employee",
        [["address_id", "=", partnerId]],
        ["id", "name", "company_id"],
        1,
        client_id
      );
    }

    console.log("📄 Employee result:", employee);

    if (!employee.length) {
      console.error("❌ Employee not found for user");
      return res.status(400).json({
        status: "error",
        message: "Employee not found for this user"
      });
    }

    const employee_id = employee[0].id;
    console.log("👨‍💼 Final resolved employee_id:", employee_id);

    // ───────── 5. FETCH EXPENSES ─────────
    console.log("🔄 Fetching expenses for employee_id:", employee_id);
    const expenses = await odooService.searchRead(
      "hr.expense",
      [["employee_id", "=", employee_id]],
      [
        "id",
        "name",
        "product_id",
        "account_id",
        "payment_mode",
        "total_amount_currency",
        "state",
        "date",
        "currency_id"
      ],
      0,
      0,
      null,
      client_id
    );

    console.log("📄 Expenses fetched:", expenses.length);

    if (!expenses || expenses.length === 0) {
      return res.status(200).json({
        status: "success",
        message: "No expenses found",
        data: []
      });
    }

    // ───────── 6. FETCH ATTACHMENTS (BASE64 FIX) ─────────
    const expenseIds = expenses.map(exp => exp.id);
    console.log("📎 Fetching attachments for expense IDs:", expenseIds);

    const attachments = await odooService.searchRead(
      "ir.attachment",
      [
        ["res_model", "=", "hr.expense"],
        ["res_id", "in", expenseIds]
      ],
      [
        "id",
        "name",
        "datas", // ✅ BASE64 DATA
        "mimetype",
        "res_id"
      ],
      0,
      0,
      null,
      client_id
    );

    console.log("📎 Attachments fetched:", attachments.length);

    // ───────── 7. MERGE EXPENSE + BASE64 ATTACHMENTS ─────────
    const finalData = expenses.map(exp => {
      const expAttachments = attachments
        .filter(att => att.res_id === exp.id)
        .map(att => ({
          id: att.id,
          name: att.name,
          mimetype: att.mimetype,
          base64: att.datas // ✅ RETURN BASE64
        }));

      return {
        ...exp,
        attachment_ids: expAttachments
      };
    });

    console.log("✅ Expenses fetched successfully");
    console.log("══════════════════════════════════════");

    return res.status(200).json({
      status: "success",
      message: "Expenses fetched successfully",
      data: finalData
    });

  } catch (error) {
    console.error("❌ GET EXPENSE ERROR:", error);
    return res.status(500).json({
      status: "error",
      message: error.message || "Failed to fetch expenses"
    });
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

    // 5. Map Data
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
module.exports = {
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
};
