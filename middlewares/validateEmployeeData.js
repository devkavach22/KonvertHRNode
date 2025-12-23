/**
 * Validates employee data fields
 * @param {Object} data
 * @param {boolean} isUpdate
 * @returns {Object|null}
 */
export const validateEmployeeData = (data, isUpdate = false) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const mobileRegex = /^[6-9]\d{9}$/;
  const pinCodeRegex = /^\d{6}$/;
  const aadhaarRegex = /^\d{12}$/;
  const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
  const voterIdRegex = /^[A-Z]{3}[0-9]{7}$/;
  const passportRegex = /^[A-Z]{1}[0-9]{7,8}$/;
  const esiRegex = /^\d{17}$/;
  const uanRegex = /^\d{12}$/;

  if (!isUpdate) {
    const requiredFields = [
      { field: "name", message: "Employee Name is required" },
      { field: "name_of_site", message: "Name Of Site is required" },
      { field: "birthday", message: "Date of Birth is required" },
      { field: "gender", message: "Gender is required" },
      { field: "country_id", message: "Country is required" },
      { field: "work_phone", message: "Primary Mobile Number is required" },
      { field: "email", message: "Email is required" },
      { field: "private_email", message: "Personal Email is required" },
      { field: "present_address", message: "Present Address is required" },
      { field: "permanent_address", message: "Permanent Address is required" },
      { field: "pin_code", message: "Pin Code is required" },
      {
        field: "emergency_contact_name",
        message: "Emergency Contact Person Name is required",
      },
      {
        field: "emergency_contact_relation",
        message: "Relation with Employee is required",
      },
      {
        field: "emergency_contact_mobile",
        message: "Emergency Contact Mobile Number is required",
      },
      {
        field: "emergency_contact_address",
        message: "Emergency Contact Address is required",
      },
      { field: "aadhaar_number", message: "Aadhaar Number is required" },
      { field: "pan_number", message: "PAN Number is required" },
      { field: "voter_id", message: "Voter ID is required" },
      { field: "passport_id", message: "Passport Number is required" },
      { field: "esi_number", message: "ESI Number is required" },
    ];

    for (const { field, message } of requiredFields) {
      if (!data[field]) {
        return { status: 400, message };
      }
    }
  }

  if (
    data.name !== undefined &&
    (typeof data.name !== "string" || data.name.trim() === "")
  ) {
    return { status: 400, message: "Employee Name must be a non-empty string" };
  }

  if (
    data.pin_code !== undefined &&
    !pinCodeRegex.test(data.pin_code.toString())
  ) {
    return { status: 400, message: "Invalid Pin Code. Must be 6 digits" };
  }

  if (
    data.present_address !== undefined &&
    data.present_address.trim().length < 10
  ) {
    return {
      status: 400,
      message: "Present Address must be at least 10 characters long",
    };
  }

  if (
    data.permanent_address !== undefined &&
    data.permanent_address.trim().length < 10
  ) {
    return {
      status: 400,
      message: "Permanent Address must be at least 10 characters long",
    };
  }

  if (
    data.emergency_contact_name !== undefined &&
    data.emergency_contact_name.trim().length < 2
  ) {
    return {
      status: 400,
      message:
        "Emergency Contact Person Name must be at least 2 characters long",
    };
  }

  if (
    data.emergency_contact_relation !== undefined &&
    data.emergency_contact_relation.trim().length < 2
  ) {
    return {
      status: 400,
      message: "Relation with Employee must be at least 2 characters long",
    };
  }

  if (
    data.emergency_contact_mobile !== undefined &&
    !mobileRegex.test(data.emergency_contact_mobile)
  ) {
    return {
      status: 400,
      message:
        "Invalid Emergency Contact Mobile Number. Must be 10 digits starting with 6-9",
    };
  }

  if (
    data.emergency_contact_address !== undefined &&
    data.emergency_contact_address.trim().length < 10
  ) {
    return {
      status: 400,
      message: "Emergency Contact Address must be at least 10 characters long",
    };
  }

  if (data.birthday !== undefined) {
    const birthDate = new Date(data.birthday);
    const today = new Date();

    if (isNaN(birthDate.getTime())) {
      return {
        status: 400,
        message: "Invalid Date of Birth format. Use YYYY-MM-DD",
      };
    }
    if (birthDate >= today) {
      return { status: 400, message: "Date of Birth must be in the past" };
    }

    const age = today.getFullYear() - birthDate.getFullYear();
    if (age < 18) {
      return { status: 400, message: "Employee must be at least 18 years old" };
    }
  }

  if (data.work_phone !== undefined && !mobileRegex.test(data.work_phone)) {
    return {
      status: 400,
      message:
        "Invalid Primary Mobile Number. Must be 10 digits starting with 6-9",
    };
  }

  if (
    data.mobile_phone !== undefined &&
    data.mobile_phone &&
    !mobileRegex.test(data.mobile_phone)
  ) {
    return {
      status: 400,
      message:
        "Invalid Secondary Contact Number. Must be 10 digits starting with 6-9",
    };
  }

  const emailFields = [
    "email",
    "private_email",
    "official_email",
    "work_email",
  ];
  for (const field of emailFields) {
    if (
      data[field] !== undefined &&
      data[field] &&
      !emailRegex.test(data[field])
    ) {
      return {
        status: 400,
        message: `Invalid ${field.replace(/_/g, " ")} format`,
      };
    }
  }

  if (
    data.aadhaar_number !== undefined &&
    !aadhaarRegex.test(data.aadhaar_number)
  ) {
    return {
      status: 400,
      message: "Invalid Aadhaar Number. Must be 12 digits",
    };
  }

  if (data.pan_number !== undefined && !panRegex.test(data.pan_number)) {
    return {
      status: 400,
      message: "Invalid PAN Number format. Must be in format: ABCDE1234F",
    };
  }

  if (data.voter_id !== undefined && !voterIdRegex.test(data.voter_id)) {
    return {
      status: 400,
      message: "Invalid Voter ID format. Must be in format: ABC1234567",
    };
  }

  if (data.passport_id !== undefined && !passportRegex.test(data.passport_id)) {
    return {
      status: 400,
      message:
        "Invalid Passport Number format. Must be in format: A1234567 or A12345678",
    };
  }

  if (data.esi_number !== undefined && !esiRegex.test(data.esi_number)) {
    return { status: 400, message: "Invalid ESI Number. Must be 17 digits" };
  }

  if (
    data.uan_number !== undefined &&
    data.uan_number &&
    !uanRegex.test(data.uan_number)
  ) {
    return { status: 400, message: "Invalid UAN Number. Must be 12 digits" };
  }

  if (
    data.gender !== undefined &&
    !["male", "female", "other"].includes(data.gender)
  ) {
    return {
      status: 400,
      message: "Invalid gender. Must be: male, female, or other",
    };
  }

  if (
    data.marital !== undefined &&
    data.marital &&
    !["single", "married", "cohabitant", "widower", "divorced"].includes(
      data.marital
    )
  ) {
    return {
      status: 400,
      message:
        "Invalid marital status. Must be: single, married, cohabitant, widower, or divorced",
    };
  }

  if (
    data.employee_category !== undefined &&
    data.employee_category &&
    !["staff", "contract", "intern"].includes(data.employee_category)
  ) {
    return {
      status: 400,
      message: "Invalid employee_category. Must be: staff, contract, or intern",
    };
  }

  if (
    data.category !== undefined &&
    data.category &&
    !["general", "sc", "st", "obc", "others"].includes(data.category)
  ) {
    return {
      status: 400,
      message: "Invalid category. Must be: general, sc, st, obc, or others",
    };
  }

  if (
    data.employment_type !== undefined &&
    data.employment_type &&
    !["permanent", "fixed_term", "temporary"].includes(data.employment_type)
  ) {
    return {
      status: 400,
      message:
        "Invalid employment_type. Must be: permanent, fixed_term, or temporary",
    };
  }

  // Date validations
  const dateFields = [
    "joining_date",
    "group_company_joining_date",
    "confirmation_date",
    "resignation_date",
  ];

  for (const field of dateFields) {
    if (data[field] !== undefined && data[field]) {
      const date = new Date(data[field]);
      if (isNaN(date.getTime())) {
        return {
          status: 400,
          message: `Invalid ${field.replace(/_/g, " ")} format. Use YYYY-MM-DD`,
        };
      }

      if (field === "joining_date" || field === "resignation_date") {
        const today = new Date();
        if (date > today) {
          return {
            status: 400,
            message: `${field.replace(/_/g, " ")} cannot be in the future`,
          };
        }
      }
    }
  }

  // Integer validations
  if (data.probation_period !== undefined && data.probation_period !== null) {
    const probation = Number(data.probation_period);
    if (!Number.isInteger(probation) || probation < 0) {
      return {
        status: 400,
        message: "Probation Period (months) must be a non-negative integer",
      };
    }
    data.probation_period = probation;
  }

  if (
    data.notice_period_days !== undefined &&
    data.notice_period_days !== null
  ) {
    const noticeDays = Number(data.notice_period_days);
    if (!Number.isInteger(noticeDays) || noticeDays < 0) {
      return {
        status: 400,
        message: "Notice Period (Days) must be a non-negative integer",
      };
    }
    data.notice_period_days = noticeDays;
  }

  // ID validations
  const idFields = [
    "reporting_manager_id",
    "bank_account_id",
    "user_id",
    "salary_grade_id",
  ];
  for (const field of idFields) {
    if (data[field] !== undefined && data[field]) {
      const id = Number(data[field]);
      if (!Number.isInteger(id) || id <= 0) {
        return {
          status: 400,
          message: `${field.replace(/_/g, " ")} must be a positive integer`,
        };
      }
    }
  }

  // Boolean validations
  if (data.hold_status !== undefined && typeof data.hold_status !== "boolean") {
    return {
      status: 400,
      message: "Hold Status must be a boolean (true or false)",
    };
  }

  if (
    data.pt_tax_eligible !== undefined &&
    typeof data.pt_tax_eligible !== "boolean"
  ) {
    return {
      status: 400,
      message:
        "Eligible for Professional Tax must be a boolean (true or false)",
    };
  }

  if (data.name_of_post_graduation !== undefined) {
    data.name_of_post_graduation = data.name_of_post_graduation || "";
  }
  if (data.name_of_any_other_education !== undefined) {
    data.name_of_any_other_education = data.name_of_any_other_education || "";
  }
  if (data.total_experiance !== undefined) {
    data.total_experiance = data.total_experiance || "";
  }
  if (data.date_of_marriage !== undefined) {
    data.date_of_marriage = data.date_of_marriage || "";
  }

  if (
    data.type_of_sepration !== undefined &&
    data.type_of_sepration &&
    !["voluntary", "involuntary", "absconding", "retirement"].includes(
      data.type_of_sepration
    )
  ) {
    return {
      status: 400,
      message:
        "Invalid type_of_sepration. Must be: voluntary, involuntary, absconding, or retirement",
    };
  }

  const validModes = ["qr", "biometric", "mobile"];
  if (
    data.attendance_capture_mode !== undefined &&
    data.attendance_capture_mode &&
    !validModes.includes(data.attendance_capture_mode)
  ) {
    return {
      status: 400,
      message: `Invalid attendance_capture_mode. Must be one of: ${validModes.join(
        ", "
      )}`,
    };
  }

  // Monetary fields validation
  const monetaryFields = [
    "wage",
    "basic_salary",
    "hra",
    "conveyance_allowance",
    "special_allowance",
    "gross_monthly_salary",
    "bonus_performance_pay",
  ];

  for (const field of monetaryFields) {
    if (data[field] !== undefined && data[field] !== null) {
      const amount = Number(data[field]);
      if (isNaN(amount) || amount < 0) {
        return {
          status: 400,
          message: `${
            field.charAt(0).toUpperCase() + field.slice(1).replace(/_/g, " ")
          } must be a non-negative number`,
        };
      }
      data[field] = amount;
    }
  }

  return null;
};

export const validateEmployee = (isUpdate = false) => {
  return (req, res, next) => {
    const validationError = validateEmployeeData(req.body, isUpdate);

    if (validationError) {
      return res.status(validationError.status).json({
        message: validationError.message,
      });
    }

    next();
  };
};
