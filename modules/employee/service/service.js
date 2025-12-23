const { odooHelpers } = require("../../../config/odoo.js");
const formatLwfDeductions = (lwfDeductions) => {
  if (!lwfDeductions || !Array.isArray(lwfDeductions)) {
    return [];
  }
  return lwfDeductions.map((deduction) => {
    return [
      0,
      0,
      {
        month: deduction.month || false,
        year: deduction.year || false,
        amount: deduction.amount || 0.0,
        employer_amount: deduction.employer_amount || 0.0,
        status: deduction.status || "draft",
        payment_date: deduction.payment_date || false,
      },
    ];
  });
};
const ATTENDANCE_POLICY_FIELDS = [
  "id",
  "name",
  "type",
  "early_type",
  "day_after",
  "grace_minutes",
  "no_pay_minutes",
  "half_day_minutes",
  "early_grace_minutes",
  "late_beyond_days",
  "late_beyond_time",
  "absent_if",
];

const createEmployeeService = async (data) => {
  try {
    const model = "hr.employee";

    const lwf_deductions = formatLwfDeductions(data.lwf_deduction_ids);

    const values = {
      name: data.name,
      name_of_site: data.name_of_site,
      birthday: data.birthday,
      gender: data.gender,
      country_id: data.country_id,
      work_phone: data.work_phone,
      email: data.email,
      private_email: data.private_email,
      present_address: data.present_address,
      permanent_address: data.permanent_address,
      pin_code: data.pin_code,
      district_id: data.district_id || null,
      state_id: data.state_id || null,
      emergency_contact_name: data.emergency_contact_name,
      emergency_contact_relation: data.emergency_contact_relation,
      emergency_contact_mobile: data.emergency_contact_mobile,
      emergency_contact_address: data.emergency_contact_address,
      cd_employee_num: data.cd_employee_num || null,
      religion: data.religion || null,
      mobile_phone: data.mobile_phone || null,
      marital: data.marital || null,

      father_name: data.father_name || null,
      work_email: data.work_email || null,

      address_id: data.address_id || null,
      attendance_policy_id: data.attendance_policy_id || null,
      resource_calendar_id: data.resource_calendar_id || null,
      shift_roster_id: data.shift_roster_id || null,
      department_id: data.department_id || null,
      job_id: data.job_id || null,
      work_location_id: data.work_location_id || null,

      employee_category: data.employee_category || null,
      employment_type: data.employment_type || null,

      is_geo_tracking: data.is_geo_tracking || false,
      aadhaar_number: data.aadhaar_number || null,
      pan_number: data.pan_number || null,
      voter_id: data.voter_id || null,
      passport_id: data.passport_id || null,
      uan_number: data.uan_number || null,
      esi_number: data.esi_number || null,
      category: data.category || null,
      employee_password: data.employee_password || null,
      grade_band: data.grade_band || null,
      joining_date: data.joining_date || null,
      group_company_joining_date: data.group_company_joining_date || null,
      confirmation_date: data.confirmation_date || null,
      probation_period: data.probation_period || 0,
      week_off: data.week_off || null,
      pin: data.pin || null,
      barcode: data.barcode || null,
      resignation_date: data.resignation_date || null,

      official_email: data.official_email || null,
      reporting_manager_id: data.reporting_manager_id || null,
      attendance_capture_mode: data.attendance_capture_mode || null,
      hold_status: data.hold_status || false,
      hold_remarks: data.hold_remarks || null,
      bank_account_id: data.bank_account_id || null,
      notice_period_days: data.notice_period_days || 0,

      salary_grade_id: data.salary_grade_id || null,
      pt_tax_eligible: data.pt_tax_eligible || false,
      wage: data.wage || 0.0,
      basic_salary: data.basic_salary || 0.0,
      hra: data.hra || 0.0,
      conveyance_allowance: data.conveyance_allowance || 0.0,
      special_allowance: data.special_allowance || 0.0,
      gross_monthly_salary: data.gross_monthly_salary || 0.0,
      bonus_performance_pay: data.bonus_performance_pay || 0.0,
      driving_license: data.driving_license || null,
      upload_passbook: data.upload_passbook || null,
      user_id: data.user_id,
      company_id: data.company_id,
      is_lapse_allocation: data.is_lapse_allocation || false,
      blood_group: data.blood_group || null,
      name_of_post_graduation: data.name_of_post_graduation || "",
      name_of_any_other_education: data.name_of_any_other_education || "",
      total_experiance: data.total_experiance || "",
      date_of_marriage: data.date_of_marriage || "",
      head_of_department_id: data.head_of_department_id || null,
      bussiness_type_id: data.bussiness_type_id || null,
      business_location_id: data.business_location_id || null,
      type_of_sepration: data.type_of_sepration || false,

      lwf_deduction_ids: lwf_deductions,
      image_1920: data.image_1920 || null,
    };

    console.log("Creating employee with values:", values);
    const employeeId = await odooHelpers.create(model, values);

    return employeeId;
  } catch (error) {
    console.error("Odoo create employee error:", error);
    throw error;
  }
};

const deleteEmployeeService = async (id) => {
  const model = "hr.employee";
  return await odooHelpers.unlink(model, [id]);
};

const readEmployeeService = async (value = null, fields = []) => {
  const model = "hr.employee";

  if (value) {
    const domain = isNaN(value)
      ? [["employee_code", "=", value]]
      : [["id", "=", Number(value)]];

    const result = await odooHelpers.searchRead(model, domain, fields);
    return result[0] || null;
  }

  return await odooHelpers.searchRead(model, [], fields);
};

const updateEmployeeService = async (id, data) => {
  try {
    const model = "hr.employee";

    const validFields = [
      "name",
      "name_of_site",
      "birthday",
      "gender",
      "country_id",
      "work_phone",
      "email",
      "private_email",
      "present_address",
      "permanent_address",
      "pin_code",
      "district_id",
      "state_id",
      "emergency_contact_name",
      "emergency_contact_relation",
      "emergency_contact_mobile",
      "emergency_contact_address",
      "cd_employee_num",
      "religion",
      "mobile_phone",
      "marital",
      "father_name",
      "work_email",
      "address_id",
      "attendance_policy_id",
      "resource_calendar_id",
      "shift_roster_id",
      "department_id",
      "job_id",
      "work_location_id",
      "employee_category",
      "employment_type",
      "is_geo_tracking",
      "aadhaar_number",
      "pan_number",
      "voter_id",
      "passport_id",
      "uan_number",
      "esi_number",
      "category",
      "employee_password",
      "grade_band",
      "joining_date",
      "group_company_joining_date",
      "confirmation_date",
      "probation_period",
      "week_off",
      "pin",
      "barcode",
      "resignation_date",
      "official_email",
      "reporting_manager_id",
      "attendance_capture_mode",
      "hold_status",
      "hold_remarks",
      "bank_account_id",
      "notice_period_days",
      "salary_grade_id",
      "pt_tax_eligible",
      "wage",
      "basic_salary",
      "hra",
      "conveyance_allowance",
      "special_allowance",
      "gross_monthly_salary",
      "bonus_performance_pay",
      "driving_license",
      "upload_passbook",
      "user_id",
      "is_lapse_allocation",
      "blood_group",
      "name_of_post_graduation",
      "name_of_any_other_education",
      "total_experiance",
      "date_of_marriage",
      "head_of_department_id",
      "bussiness_type_id",
      "business_location_id",
      "type_of_sepration",
      "lwf_deduction_ids",
      "lwf_state_id",
      "image_1920",
    ];

    const values = {};
    for (const field of validFields) {
      if (data[field] !== undefined) {
        values[field] = data[field];
      }
    }

    if (data.lwf_deduction_ids) {
      values.lwf_deduction_ids = formatLwfDeductions(data.lwf_deduction_ids);
    }

    if (data.blood_group !== undefined) {
      values.blood_group = data.blood_group || false;
    }

    console.log(`Updating employee ${id} with values:`, values);
    return await odooHelpers.write(model, id, values);
  } catch (error) {
    console.error("Odoo update employee error:", error);
    throw error;
  }
};



const createBusinessTypeService = async (data) => {
  try {
    const model = "business.type";

    const values = {
      name: data.name,
      client_id: data.client_id, // 👈 client mapping
    };

    console.log("Creating business type with values:", values);

    const businessTypeId = await odooHelpers.create(model, values);

    return businessTypeId;
  } catch (error) {
    console.error("Odoo create business type error:", error);
    throw error;
  }
};



const readBusinessTypeService = async (client_id, id = null, fields = []) => {
  try {
    const model = "business.type";

    const domain = [["client_id", "=", client_id]];

    if (id) {
      domain.push(["id", "=", Number(id)]);
      const result = await odooHelpers.searchRead(model, domain, fields);
      return result[0] || null;
    }

    return await odooHelpers.searchRead(model, domain, fields);
  } catch (error) {
    console.error("Odoo read business type error:", error);
    throw error;
  }
};



const updateBusinessTypeService = async (client_id, id, data) => {
  try {
    const model = "business.type";

    // 🔎 Ownership check
    const record = await odooHelpers.searchRead(
      model,
      [["id", "=", id], ["client_id", "=", client_id]],
      ["id"],
      1
    );

    if (!record.length) {
      return false;
    }

    const values = {};

    if (data.name !== undefined) {
      values.name = data.name;
    }

    if (Object.keys(values).length === 0) {
      throw new Error("No fields to update");
    }

    return await odooHelpers.write(model, id, values);
  } catch (error) {
    console.error("Odoo update business type error:", error);
    throw error;
  }
};



const deleteBusinessTypeService = async (client_id, id) => {
  try {
    const model = "business.type";

    // 🔎 Ownership check
    const record = await odooHelpers.searchRead(
      model,
      [["id", "=", id], ["client_id", "=", client_id]],
      ["id"],
      1
    );

    if (!record.length) {
      return false;
    }

    return await odooHelpers.unlink(model, [id]);
  } catch (error) {
    console.error("Odoo delete business type error:", error);
    throw error;
  }
};


const createBusinessLocationService = async (client_id, data) => {
  try {
    const model = "business.location";

    const values = {
      name: data.name,
      parent_id: data.parent_id || false,
      client_id,
    };

    return await odooHelpers.create(model, values);
  } catch (error) {
    console.error("Odoo create business location error:", error);
    throw error;
  }
};



const readBusinessLocationService = async (
  client_id,
  id = null,
  fields = []
) => {
  try {
    const model = "business.location";

    const domain = [["client_id", "=", client_id]];

    if (id) {
      domain.push(["id", "=", Number(id)]);
      const result = await odooHelpers.searchRead(model, domain, fields);
      return result[0] || null;
    }

    return await odooHelpers.searchRead(model, domain, fields);
  } catch (error) {
    console.error("Odoo read business location error:", error);
    throw error;
  }
};



const updateBusinessLocationService = async (client_id, id, data) => {
  try {
    const model = "business.location";

    // 🔎 Ownership check
    const record = await odooHelpers.searchRead(
      model,
      [["id", "=", id], ["client_id", "=", client_id]],
      ["id"],
      1
    );

    if (!record.length) {
      return false;
    }

    const values = {};

    if (data.name !== undefined) {
      values.name = data.name;
    }

    if (data.parent_id !== undefined) {
      values.parent_id = data.parent_id
        ? parseInt(data.parent_id)
        : false;
    }

    if (!Object.keys(values).length) {
      throw new Error("No fields to update");
    }

    return await odooHelpers.write(model, id, values);
  } catch (error) {
    console.error("Odoo update business location error:", error);
    throw error;
  }
};



const deleteBusinessLocationService = async (client_id, id) => {
  try {
    const model = "business.location";

    const record = await odooHelpers.searchRead(
      model,
      [["id", "=", id], ["client_id", "=", client_id]],
      ["id"],
      1
    );

    if (!record.length) {
      return false;
    }

    return await odooHelpers.unlink(model, [id]);
  } catch (error) {
    console.error("Odoo delete business location error:", error);
    throw error;
  }
};

const createAttendancePolicyService = async (data) => {
  try {
    const model = "attendance.policy";

    const finalType = data.type || "regular";

    const values = {
      name: data.name,
      type: finalType,
      early_type: finalType, // ✅ AUTO SAME AS TYPE

      day_after: data.day_after || 0,
      grace_minutes: data.grace_minutes || 0,
      no_pay_minutes: data.no_pay_minutes || 0,
      half_day_minutes: data.half_day_minutes || 0,
      early_grace_minutes: data.early_grace_minutes || 0,
      late_beyond_days: data.late_beyond_days || 0,
      late_beyond_time: data.late_beyond_time || 0,
      absent_if: data.absent_if || false,
    };

    console.log("Creating attendance policy with values:", values);
    const policyId = await odooHelpers.create(model, values);

    return policyId;
  } catch (error) {
    console.error("Odoo create attendance policy error:", error);
    throw error;
  }
};


const readAttendancePolicyService = async (id = null, fields = []) => {
  try {
    const model = "attendance.policy";

    const finalFields =
      fields && fields.length ? fields : ATTENDANCE_POLICY_FIELDS;

    if (id) {
      const domain = [["id", "=", Number(id)]];
      const result = await odooHelpers.searchRead(model, domain, finalFields);
      return result[0] || null;
    }

    return await odooHelpers.searchRead(model, [], finalFields);
  } catch (error) {
    console.error("Odoo read attendance policy error:", error);
    throw error;
  }
};


const updateAttendancePolicyService = async (id, data) => {
  try {
    const model = "attendance.policy";

    const validFields = [
      "name",
      "type",
      "early_type",
      "day_after",
      "grace_minutes",
      "no_pay_minutes",
      "half_day_minutes",
      "early_grace_minutes",
      "late_beyond_days",
      "late_beyond_time",
      "absent_if",
    ];

    const values = {};

    for (const field of validFields) {
      if (data[field] !== undefined) {
        values[field] = data[field];
      }
    }

    if (Object.keys(values).length === 0) {
      throw new Error("No fields to update");
    }

    console.log(`Updating attendance policy ${id} with values:`, values);
    return await odooHelpers.write(model, id, values);
  } catch (error) {
    console.error("Odoo update attendance policy error:", error);
    throw error;
  }
};

const deleteAttendancePolicyService = async (id) => {
  try {
    const model = "attendance.policy";
    return await odooHelpers.unlink(model, [id]);
  } catch (error) {
    console.error("Odoo delete attendance policy error:", error);
    throw error;
  }
};

module.exports = {
  createEmployeeService,
  deleteEmployeeService,
  readEmployeeService,
  updateEmployeeService,
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
};
