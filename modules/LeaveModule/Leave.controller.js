const { parse } = require("dotenv");
const odooService = require("../../Masters/services/odoo.service");
const { getClientFromRequest } = require("../../Masters/services/plan.helper");

class LeaveController {
  // async createLeaveType(req, res) {
  //   try {
  //     console.log("API Called createLeaveType");

  //     const {
  //       name,

  //       // Approval
  //       leave_validation_type,
  //       allocation_validation_type,

  //       // Allocation behavior
  //       requires_allocation,
  //       employee_requests,

  //       // Officers
  //       responsible_ids,

  //       // Meta
  //       leave_type_code,
  //       leave_category,
  //       request_unit,

  //       // Flags
  //       include_public_holidays_in_duration,
  //       overtime_deductible,
  //       is_earned_leave
  //     } = req.body;
  //     console.log(req.body);

  //     const { user_id, client_id } = await getClientFromRequest(req);

  //     /* ---------------- REQUIRED ---------------- */
  //     if (!name) {
  //       return res.status(400).json({
  //         status: "error",
  //         message: "name is required"
  //       });
  //     }

  //     /* ---------------- VALIDATIONS ---------------- */
  //     const approvalTypes = ["no_validation", "hr", "manager", "both"];
  //     const yesNo = ["yes", "no"];
  //     const categories = ["statutory", "non_statutory", "custom"];
  //     const requestUnits = ["day", "half_day", "hour"];

  //     if (leave_validation_type && !approvalTypes.includes(leave_validation_type)) {
  //       return res.status(400).json({ status: "error", message: "Invalid leave_validation_type" });
  //     }

  //     if (allocation_validation_type && !approvalTypes.includes(allocation_validation_type)) {
  //       return res.status(400).json({ status: "error", message: "Invalid allocation_validation_type" });
  //     }

  //     if (requires_allocation && !yesNo.includes(requires_allocation)) {
  //       return res.status(400).json({ status: "error", message: "Invalid requires_allocation" });
  //     }

  //     if (employee_requests && !yesNo.includes(employee_requests)) {
  //       return res.status(400).json({ status: "error", message: "Invalid employee_requests" });
  //     }

  //     if (leave_category && !categories.includes(leave_category)) {
  //       return res.status(400).json({ status: "error", message: "Invalid leave_category" });
  //     }

  //     if (request_unit && !requestUnits.includes(request_unit)) {
  //       return res.status(400).json({ status: "error", message: "Invalid request_unit" });
  //     }

  //     /* ---------------- DUPLICATE CHECK ---------------- */
  //     const existing = await odooService.searchRead(
  //       "hr.leave.type",
  //       [["name", "=", name], ["client_id", "=", client_id]],
  //       ["id"],
  //       1
  //     );

  //     if (existing.length) {
  //       return res.status(409).json({
  //         status: "error",
  //         message: `Leave type '${name}' already exists`
  //       });
  //     }

  //     /* ---------------- PAYLOAD ---------------- */
  //     const vals = {
  //       name,
  //       client_id,
  //       leave_validation_type: leave_validation_type || "no_validation",
  //       allocation_validation_type: allocation_validation_type || "no_validation",

  //       requires_allocation: requires_allocation || "yes",
  //       employee_requests: employee_requests || "no",

  //       leave_type_code: leave_type_code || null,
  //       leave_category: leave_category || "custom",
  //       request_unit: request_unit || "day",

  //       include_public_holidays_in_duration: Boolean(include_public_holidays_in_duration),
  //       overtime_deductible: Boolean(overtime_deductible),
  //       is_earned_leave: Boolean(is_earned_leave),

  //       active: true,
  //       create_uid: user_id
  //     };

  //     /* ---------------- MANY2MANY ---------------- */
  //     if (Array.isArray(responsible_ids)) {
  //       vals.responsible_ids = [[6, 0, responsible_ids]];
  //     }

  //     console.log("Leave Type Payload:", vals);

  //     /* ---------------- CREATE ---------------- */
  //     const leaveTypeId = await odooService.create("hr.leave.type", vals);

  //     return res.status(200).json({
  //       status: "success",
  //       message: "Leave type created successfully",
  //       leave_type_id: leaveTypeId
  //     });

  //   } catch (error) {
  //     console.error("Create Leave Type Error:", error);

  //     return res.status(error.status || 500).json({
  //       status: "error",
  //       message: error.message || "Failed to create leave type"
  //     });
  //   }
  // }
  async createLeaveType(req, res) {
    try {
      console.log("API Called createLeaveType");

      const {
        name,

        // Approval
        leave_validation_type,
        allocation_validation_type,

        // Allocation behavior
        requires_allocation,
        employee_requests,

        // Officers
        responsible_ids,

        // Meta
        leave_type_code,
        leave_category,
        request_unit,

        // Flags
        include_public_holidays_in_duration,
        overtime_deductible,
        is_earned_leave
      } = req.body;
      console.log(req.body);

      let user_id, client_id;
      try {
        const clientData = await getClientFromRequest(req);
        user_id = clientData.user_id;
        client_id = clientData.client_id;
      } catch (authError) {
        console.error("Auth error:", authError);
        return res.status(400).json({
          status: "error",
          message: authError.message || "Either user_id or unique_user_id is required"
        });
      }

      /* ---------------- REQUIRED ---------------- */
      if (!name) {
        return res.status(400).json({
          status: "error",
          message: "name is required"
        });
      }

      /* ---------------- VALIDATIONS ---------------- */
      const approvalTypes = ["no_validation", "hr", "manager", "both"];
      const yesNo = ["yes", "no"];
      const categories = ["statutory", "non_statutory", "custom"];
      const requestUnits = ["day", "half_day", "hour"];

      if (leave_validation_type && !approvalTypes.includes(leave_validation_type)) {
        return res.status(400).json({
          status: "error",
          message: `Invalid leave_validation_type: '${leave_validation_type}'. Allowed values: ${approvalTypes.join(', ')}`
        });
      }

      if (allocation_validation_type && !approvalTypes.includes(allocation_validation_type)) {
        return res.status(400).json({
          status: "error",
          message: `Invalid allocation_validation_type: '${allocation_validation_type}'. Allowed values: ${approvalTypes.join(', ')}`
        });
      }

      if (requires_allocation && !yesNo.includes(requires_allocation)) {
        return res.status(400).json({
          status: "error",
          message: `Invalid requires_allocation: '${requires_allocation}'. Allowed values: ${yesNo.join(', ')}`
        });
      }

      if (employee_requests && !yesNo.includes(employee_requests)) {
        return res.status(400).json({
          status: "error",
          message: `Invalid employee_requests: '${employee_requests}'. Allowed values: ${yesNo.join(', ')}`
        });
      }

      if (leave_category && !categories.includes(leave_category)) {
        return res.status(400).json({
          status: "error",
          message: `Invalid leave_category: '${leave_category}'. Allowed values: ${categories.join(', ')}`
        });
      }

      if (request_unit && !requestUnits.includes(request_unit)) {
        return res.status(400).json({
          status: "error",
          message: `Invalid request_unit: '${request_unit}'. Allowed values: ${requestUnits.join(', ')}`
        });
      }

      // Validate responsible_ids if provided
      if (responsible_ids !== undefined && !Array.isArray(responsible_ids)) {
        return res.status(400).json({
          status: "error",
          message: "responsible_ids must be an array of user IDs"
        });
      }

      if (Array.isArray(responsible_ids) && responsible_ids.some(id => typeof id !== 'number')) {
        return res.status(400).json({
          status: "error",
          message: "All responsible_ids must be valid numbers"
        });
      }

      /* ---------------- DUPLICATE CHECK ---------------- */
      let existing;
      try {
        existing = await odooService.searchRead(
          "hr.leave.type",
          [["name", "=", name], ["client_id", "=", client_id]],
          ["id"],
          1
        );
      } catch (searchError) {
        console.error("Error checking duplicate leave type:", searchError);
        return res.status(400).json({
          status: "error",
          message: "Failed to check for duplicate leave type"
        });
      }

      if (existing.length) {
        return res.status(409).json({
          status: "error",
          message: `Leave type '${name}' already exists`
        });
      }

      /* ---------------- PAYLOAD ---------------- */
      const vals = {
        name,
        client_id,
        leave_validation_type: leave_validation_type || "no_validation",
        allocation_validation_type: allocation_validation_type || "no_validation",

        requires_allocation: requires_allocation || "yes",
        employee_requests: employee_requests || "no",

        leave_type_code: leave_type_code || null,
        leave_category: leave_category || "custom",
        request_unit: request_unit || "day",

        include_public_holidays_in_duration: Boolean(include_public_holidays_in_duration),
        overtime_deductible: Boolean(overtime_deductible),
        is_earned_leave: Boolean(is_earned_leave),

        active: true,
        create_uid: user_id
      };

      /* ---------------- MANY2MANY ---------------- */
      if (Array.isArray(responsible_ids)) {
        vals.responsible_ids = [[6, 0, responsible_ids]];
      }

      console.log("Leave Type Payload:", vals);

      /* ---------------- CREATE ---------------- */
      let leaveTypeId;
      try {
        leaveTypeId = await odooService.create("hr.leave.type", vals);
      } catch (createError) {
        console.error("Odoo Create Error:", createError);

        const errorMessage = createError.message || createError.faultString || "Unknown error";

        // Duplicate name constraint (in case race condition)
        if (errorMessage.includes("duplicate") ||
          errorMessage.includes("already exists") ||
          errorMessage.includes("unique constraint")) {
          return res.status(409).json({
            status: "error",
            message: `Leave type '${name}' already exists`
          });
        }

        // Access Denied
        if (errorMessage.includes("Access Denied") ||
          errorMessage.includes("AccessError") ||
          errorMessage.includes("access rights")) {
          return res.status(403).json({
            status: "error",
            message: "Access Denied: You don't have permission to create leave types"
          });
        }

        // Required field missing (Odoo constraint)
        if (errorMessage.includes("required") ||
          errorMessage.includes("cannot be empty") ||
          errorMessage.includes("null value")) {
          return res.status(400).json({
            status: "error",
            message: "Missing required field in Odoo: " + errorMessage
          });
        }

        // Invalid field value
        if (errorMessage.includes("invalid") ||
          errorMessage.includes("not valid") ||
          errorMessage.includes("ValidationError")) {
          return res.status(400).json({
            status: "error",
            message: "Invalid field value: " + errorMessage
          });
        }

        // Foreign key constraint (invalid responsible_ids, client_id, etc.)
        if (errorMessage.includes("foreign key") ||
          errorMessage.includes("does not exist") ||
          errorMessage.includes("not found")) {
          return res.status(400).json({
            status: "error",
            message: "Invalid reference: One or more IDs are invalid"
          });
        }

        // Wrong credentials
        if (errorMessage.includes("password") ||
          errorMessage.includes("credentials") ||
          errorMessage.includes("authentication")) {
          return res.status(401).json({
            status: "error",
            message: "Invalid credentials"
          });
        }

        // Generic XML-RPC fault
        if (createError.faultCode) {
          return res.status(400).json({
            status: "error",
            message: errorMessage,
            code: createError.faultCode
          });
        }

        // Default case - return 400 for Odoo business logic errors
        return res.status(400).json({
          status: "error",
          message: errorMessage || "Failed to create leave type"
        });
      }

      return res.status(200).json({
        status: "success",
        message: "Leave type created successfully",
        leave_type_id: leaveTypeId
      });

    } catch (error) {
      console.error("Create Leave Type Error:", error);

      // Only return 500 for actual server errors
      return res.status(500).json({
        status: "error",
        message: "Internal server error. Please contact support."
      });
    }
  }
  // async getLeaveTypes(req, res) {
  //   try {
  //     console.log("------------------------------------------------");
  //     console.log("API Called: getLeaveTypes");
  //     console.log("Request Body:", JSON.stringify(req.body, null, 2));
  //     console.log("Request Query:", JSON.stringify(req.query, null, 2));

  //     // -----------------------------
  //     // 1. Get client context from request
  //     // -----------------------------
  //     console.log("Attempting to get client context from request...");
  //     const context = await getClientFromRequest(req);
  //     const user_id = req.query.user_id ? parseInt(req.query.user_id) : context.user_id;
  //     const { client_id } = context;

  //     console.log(`Context Retrieved - User ID: ${user_id}, Client ID: ${client_id}`);

  //     if (!client_id) {
  //       console.error("❌ Client ID missing from auth context");
  //       return res.status(400).json({
  //         status: "error",
  //         message: "client_id is required"
  //       });
  //     }

  //     // -----------------------------
  //     // 2. Fetch employee info
  //     // -----------------------------
  //     console.log("Fetching employee info for user_id:", user_id);
  //     const employeeInfo = await odooService.searchRead(
  //       "hr.employee",
  //       [["user_id", "=", user_id]],
  //       ["id", "name"]
  //     );

  //     if (!employeeInfo.length) {
  //       console.error(`❌ Employee not found for user_id ${user_id}`);
  //       return res.status(404).json({
  //         status: "error",
  //         message: "Employee not linked with this user."
  //       });
  //     }

  //     const employeeId = employeeInfo[0].id;
  //     console.log(`✅ Employee ID: ${employeeId}`);

  //     // -----------------------------
  //     // 3. Fetch allocated leave types for this employee
  //     // -----------------------------
  //     console.log("Fetching leave allocations for employee:", employeeId);
  //     const allocations = await odooService.searchRead(
  //       "hr.leave.allocation",
  //       [
  //         ["employee_id", "=", employeeId],
  //         ["state", "=", "validate"] // Only validated allocations
  //       ],
  //       ["holiday_status_id"]
  //     );

  //     console.log(`Found ${allocations.length} validated allocations`);

  //     if (allocations.length === 0) {
  //       console.log("No allocations found for this employee");
  //       return res.status(200).json({
  //         status: "success",
  //         total: 0,
  //         data: [],
  //         message: "No leave types allocated to this employee"
  //       });
  //     }

  //     // Extract unique leave type IDs
  //     const leaveTypeIds = [...new Set(allocations.map(a => a.holiday_status_id[0]))];
  //     console.log("Leave Type IDs with allocations:", leaveTypeIds);

  //     // -----------------------------
  //     // 4. Define fields to fetch
  //     // -----------------------------
  //     const fields = [
  //       "name",                 // Leave Name
  //       "leave_type_code",      // Leave Type Code
  //       "leave_category",       // Leave Category
  //       "leave_validation_type" // Approved By
  //     ];
  //     console.log("Fields defined for search:", fields);

  //     // -----------------------------
  //     // 5. Domain (client scoped + allocated leave types only)
  //     // -----------------------------
  //     const domain = [
  //       ["client_id", "=", client_id],
  //       ["id", "in", leaveTypeIds] // Only leave types that are allocated
  //     ];
  //     console.log("Odoo Domain:", JSON.stringify(domain));

  //     // -----------------------------
  //     // 6. Fetch from Odoo
  //     // -----------------------------
  //     console.log(`Calling odooService.searchRead for model 'hr.leave.type' with client_id: ${client_id}...`);
  //     const leaveTypes = await odooService.searchRead(
  //       "hr.leave.type",
  //       domain,
  //       fields
  //     );

  //     console.log("Odoo Service call successful.");
  //     console.log(`Total Leave Types Found: ${leaveTypes ? leaveTypes.length : 0}`);
  //     console.log("Leave Types Data:", JSON.stringify(leaveTypes, null, 2));

  //     // -----------------------------
  //     // 7. Send Response
  //     // -----------------------------
  //     console.log("Sending success response to client...");
  //     return res.status(200).json({
  //       status: "success",
  //       total: leaveTypes.length,
  //       data: leaveTypes
  //     });
  //   } catch (error) {
  //     console.error("!!! ERROR in getLeaveTypes !!!");
  //     console.error("Error Message:", error.message);
  //     console.error("Error Stack:", error.stack);
  //     return res.status(error.status || 500).json({
  //       status: "error",
  //       message: error.message || "Failed to fetch leave types"
  //     });
  //   }
  // }

  async getLeaveTypes(req, res) {
    try {
      console.log("------------------------------------------------");
      console.log("API Called: getLeaveTypes");
      console.log("Request Body:", JSON.stringify(req.body, null, 2));
      console.log("Request Query:", JSON.stringify(req.query, null, 2));

      // -----------------------------
      // 1. Get client context from request
      // -----------------------------
      console.log("Attempting to get client context from request...");
      const context = await getClientFromRequest(req);
      const user_id = req.query.user_id ? parseInt(req.query.user_id) : context.user_id;
      const { client_id } = context;

      console.log(`Context Retrieved - User ID: ${user_id}, Client ID: ${client_id}`);

      if (!client_id) {
        console.error("❌ Client ID missing from auth context");
        return res.status(400).json({
          status: "error",
          message: "client_id is required"
        });
      }

      // -----------------------------
      // 2. Fetch employee info & Admin check
      // -----------------------------
      console.log("Fetching employee info for user_id:", user_id);
      // Added 'is_client_employee_admin' in the fields to check admin status
      const employeeInfo = await odooService.searchRead(
        "hr.employee",
        [["user_id", "=", user_id]],
        ["id", "name", "is_client_employee_admin"]
      );

      if (!employeeInfo.length) {
        console.error(`❌ Employee not found for user_id ${user_id}`);
        return res.status(404).json({
          status: "error",
          message: "Employee not linked with this user."
        });
      }

      const employeeId = employeeInfo[0].id;
      const isAdmin = employeeInfo[0].is_client_employee_admin === true;
      console.log(`✅ Employee ID: ${employeeId}, Is Admin: ${isAdmin}`);

      let leaveTypeIds = [];

      // -----------------------------
      // 3. Fetch allocated leave types (Only for non-admins)
      // -----------------------------
      if (!isAdmin) {
        console.log("Fetching leave allocations for employee:", employeeId);
        const allocations = await odooService.searchRead(
          "hr.leave.allocation",
          [
            ["employee_id", "=", employeeId],
            ["state", "=", "validate"]
          ],
          ["holiday_status_id"]
        );

        console.log(`Found ${allocations.length} validated allocations`);

        if (allocations.length === 0) {
          console.log("No allocations found for this employee");
          return res.status(200).json({
            status: "success",
            total: 0,
            data: [],
            message: "No leave types allocated to this employee"
          });
        }

        // Extract unique leave type IDs
        leaveTypeIds = [...new Set(allocations.map(a => a.holiday_status_id[0]))];
        console.log("Leave Type IDs with allocations:", leaveTypeIds);
      } else {
        console.log("User is Admin, skipping allocation check to show all types.");
      }

      // -----------------------------
      // 4. Define fields to fetch
      // -----------------------------
      const fields = [
        "name",
        "leave_type_code",
        "leave_category",
        "leave_validation_type"
      ];

      // -----------------------------
      // 5. Domain (Dynamic based on Admin status)
      // -----------------------------
      let domain = [["client_id", "=", client_id]];

      // Agar admin nahi hai, tabhi ID filter lagao
      if (!isAdmin) {
        domain.push(["id", "in", leaveTypeIds]);
      }

      console.log("Odoo Domain:", JSON.stringify(domain));

      // -----------------------------
      // 6. Fetch from Odoo
      // -----------------------------
      console.log(`Calling odooService.searchRead for model 'hr.leave.type' with client_id: ${client_id}...`);
      const leaveTypes = await odooService.searchRead(
        "hr.leave.type",
        domain,
        fields
      );

      console.log("Odoo Service call successful.");
      return res.status(200).json({
        status: "success",
        total: leaveTypes.length,
        data: leaveTypes
      });

    } catch (error) {
      console.error("!!! ERROR in getLeaveTypes !!!");
      console.error("Error Message:", error.message);
      return res.status(error.status || 500).json({
        status: "error",
        message: error.message || "Failed to fetch leave types"
      });
    }
  }
  async updateLeaveType(req, res) {
    try {
      console.log("API Called updateLeaveType");

      const { id } = req.params;
      const {
        name,

        // Approval
        leave_validation_type,
        allocation_validation_type,

        // Allocation behavior
        requires_allocation,
        employee_requests,

        // Officers
        responsible_ids,

        // Meta
        leave_type_code,
        leave_category,
        request_unit,

        // Flags
        include_public_holidays_in_duration,
        overtime_deductible,
        is_earned_leave,
        active
      } = req.body;
      console.log(req.body);

      const { user_id } = await getClientFromRequest(req);

      /* ---------------- VALIDATIONS ---------------- */
      const approvalTypes = ["no_validation", "hr", "manager", "both"];
      const yesNo = ["yes", "no"];
      const categories = ["statutory", "non_statutory", "custom"];
      const requestUnits = ["day", "half_day", "hour"];

      if (leave_validation_type && !approvalTypes.includes(leave_validation_type)) {
        return res.status(400).json({ status: "error", message: "Invalid leave_validation_type" });
      }

      if (allocation_validation_type && !approvalTypes.includes(allocation_validation_type)) {
        return res.status(400).json({ status: "error", message: "Invalid allocation_validation_type" });
      }

      if (requires_allocation && !yesNo.includes(requires_allocation)) {
        return res.status(400).json({ status: "error", message: "Invalid requires_allocation" });
      }

      if (employee_requests && !yesNo.includes(employee_requests)) {
        return res.status(400).json({ status: "error", message: "Invalid employee_requests" });
      }

      if (leave_category && !categories.includes(leave_category)) {
        return res.status(400).json({ status: "error", message: "Invalid leave_category" });
      }

      if (request_unit && !requestUnits.includes(request_unit)) {
        return res.status(400).json({ status: "error", message: "Invalid request_unit" });
      }

      /* ---------------- CHECK EXISTENCE ---------------- */
      const existing = await odooService.searchRead(
        "hr.leave.type",
        [["id", "=", Number(id)]],
        ["id"],
        1
      );

      if (!existing.length) {
        return res.status(404).json({
          status: "error",
          message: "Leave type not found"
        });
      }

      /* ---------------- PAYLOAD ---------------- */
      const vals = {
        write_uid: user_id
      };

      if (name !== undefined) vals.name = name;
      if (leave_validation_type !== undefined) vals.leave_validation_type = leave_validation_type;
      if (allocation_validation_type !== undefined) vals.allocation_validation_type = allocation_validation_type;
      if (requires_allocation !== undefined) vals.requires_allocation = requires_allocation;
      if (employee_requests !== undefined) vals.employee_requests = employee_requests;
      if (leave_type_code !== undefined) vals.leave_type_code = leave_type_code;
      if (leave_category !== undefined) vals.leave_category = leave_category;
      if (request_unit !== undefined) vals.request_unit = request_unit;
      if (active !== undefined) vals.active = Boolean(active);

      if (include_public_holidays_in_duration !== undefined) {
        vals.include_public_holidays_in_duration = Boolean(include_public_holidays_in_duration);
      }

      if (overtime_deductible !== undefined) {
        vals.overtime_deductible = Boolean(overtime_deductible);
      }

      if (is_earned_leave !== undefined) {
        vals.is_earned_leave = Boolean(is_earned_leave);
      }

      /* ---------------- MANY2MANY ---------------- */
      if (Array.isArray(responsible_ids)) {
        vals.responsible_ids = [[6, 0, responsible_ids]];
      }

      console.log("Update Leave Type Payload:", vals);

      /* ---------------- UPDATE ---------------- */
      await odooService.write("hr.leave.type", Number(id), vals);

      return res.status(200).json({
        status: "success",
        message: "Leave type updated successfully"
      });

    } catch (error) {
      console.error("Update Leave Type Error:", error);
      return res.status(error.status || 500).json({
        status: "error",
        message: error.message || "Failed to update leave type"
      });
    }
  }

  async deleteLeaveType(req, res) {
    try {
      console.log("API Called deleteLeaveType");

      const { id } = req.params;
      const { user_id } = await getClientFromRequest(req);

      /* ---------------- CHECK EXISTENCE ---------------- */
      const existing = await odooService.searchRead(
        "hr.leave.type",
        [["id", "=", Number(id)]],
        ["id", "active"],
        1
      );

      if (!existing.length) {
        return res.status(404).json({
          status: "error",
          message: "Leave type not found"
        });
      }

      /* ---------------- SOFT DELETE ---------------- */
      await odooService.write("hr.leave.type", Number(id), {
        active: false,
        write_uid: user_id
      });

      return res.status(200).json({
        status: "success",
        message: "Leave type deleted successfully"
      });

    } catch (error) {
      console.error("Delete Leave Type Error:", error);
      return res.status(error.status || 500).json({
        status: "error",
        message: error.message || "Failed to delete leave type"
      });
    }
  }
  // async createLeaveAllocation(req, res) {
  //   try {
  //     console.log("------------------------------------------------");
  //     console.log("API Called: createLeaveAllocation");
  //     console.log("Request Body:", JSON.stringify(req.body, null, 2));

  //     const {
  //       holiday_status_id,
  //       employee_id,
  //       allocation_type,
  //       date_from,
  //       date_to,
  //       number_of_days,
  //       description,
  //       accrual_plan_id // <-- Added for accrual allocation
  //     } = req.body;

  //     // 1. Fetch Context & Debug Logs
  //     console.log("Fetching client context from request...");
  //     const context = await getClientFromRequest(req);

  //     console.log("DEBUG: Raw context object:", JSON.stringify(context, null, 2));

  //     if (!context) {
  //       throw new Error("Client context is null or undefined");
  //     }

  //     const { user_id, client_id } = context;
  //     console.log(`Context Extracted - User ID: ${user_id}, Client ID: ${client_id}`);

  //     // Validation Checks
  //     console.log("Starting Input Validation...");

  //     if (!holiday_status_id || !employee_id || !allocation_type || !date_from) {
  //       console.warn("Validation Failed: Missing required fields");
  //       return res.status(400).json({
  //         status: "error",
  //         message: "Required missing fields: holiday_status_id, employee_id, allocation_type, date_from"
  //       });
  //     }

  //     if (!["regular", "accrual"].includes(allocation_type)) {
  //       console.warn(`Validation Failed: Invalid allocation_type '${allocation_type}'`);
  //       return res.status(400).json({
  //         status: "error",
  //         message: "Invalid allocation type"
  //       });
  //     }

  //     // For regular allocation, number_of_days is required
  //     if (allocation_type === "regular" && (!number_of_days || number_of_days <= 0)) {
  //       console.warn("Validation Failed: Invalid number_of_days for regular allocation");
  //       return res.status(400).json({
  //         status: "error",
  //         message: "Allocation days are required for regular allocation."
  //       });
  //     }

  //     // For accrual allocation, accrual_plan_id is required
  //     if (allocation_type === "accrual" && !accrual_plan_id) {
  //       console.warn("Validation Failed: accrual_plan_id is required for accrual allocation");
  //       return res.status(400).json({
  //         status: "error",
  //         message: "Accrual Plan is required for accrual allocation."
  //       });
  //     }

  //     console.log("Validation Passed.");

  //     // Fetch Leave Type Name
  //     console.log(`Fetching Leave Type Name for ID: ${holiday_status_id} with Client ID: ${client_id}...`);

  //     const leaveTypeInfo = await odooService.searchRead(
  //       "hr.leave.type",
  //       [["id", "=", parseInt(holiday_status_id)]],
  //       ["name"],
  //       1,
  //       client_id
  //     );

  //     console.log("Leave Type Info Retrieved:", JSON.stringify(leaveTypeInfo, null, 2));

  //     const leave_type_name = leaveTypeInfo.length > 0 ? leaveTypeInfo[0].name : "Unknown Leave Type";
  //     console.log("Resolved Leave Type Name:", leave_type_name);

  //     // Prepare Payload
  //     const vals = {
  //       holiday_status_id: parseInt(holiday_status_id),
  //       employee_id: parseInt(employee_id),
  //       allocation_type: allocation_type === "accrual" ? "accrual" : allocation_type,
  //       date_from: date_from,
  //       date_to: date_to || null,
  //       number_of_days: allocation_type === "regular" ? parseFloat(number_of_days) : 0, // 0 for accrual
  //       name: description || null,
  //       state: "confirm",
  //       create_uid: user_id,
  //       accrual_plan_id: allocation_type === "accrual" ? parseInt(accrual_plan_id) : null // <-- Add accrual plan
  //     };

  //     console.log("Constructed Odoo Payload:", JSON.stringify(vals, null, 2));
  //     console.log(`Attempting to create record in 'hr.leave.allocation' for Client ID: ${client_id}...`);

  //     const allocationId = await odooService.create(
  //       "hr.leave.allocation",
  //       vals,
  //       client_id
  //     );

  //     console.log(`Odoo Create Success! New Allocation ID: ${allocationId}`);

  //     return res.status(200).json({
  //       status: "success",
  //       message: "Leave allocation created successfully",
  //       data: {
  //         allocation_id: allocationId,
  //         leave_type_id: leave_type_name,
  //         validity_period: {
  //           from: date_from,
  //           to: date_to
  //         },
  //         accrual_plan_id: allocation_type === "accrual" ? accrual_plan_id : null
  //       }
  //     });

  //   } catch (error) {
  //     console.error("!!! ERROR in createLeaveAllocation !!!");
  //     console.error("Error Message:", error.message);
  //     console.error("Error Stack:", error.stack);

  //     return res.status(error.status || 500).json({
  //       status: "error",
  //       message: error.message || "Failed to create leave allocation"
  //     });
  //   }
  // }


  async createLeaveAllocation(req, res) {
    try {
      console.log("------------------------------------------------");
      console.log("API Called: createLeaveAllocation");

      const {
        holiday_status_id,
        employee_id,
        allocation_type,
        date_from,
        date_to,
        number_of_days,
        description,
        accrual_plan_id
      } = req.body;

      // 1. Fetch Context & Debug Logs
      console.log("Fetching client context from request...");
      const context = await getClientFromRequest(req);

      console.log("DEBUG: Raw context object:", JSON.stringify(context, null, 2));

      if (!context) {
        throw new Error("Client context is null or undefined");
      }

      const { user_id, client_id } = context;
      console.log(`Context Extracted - User ID: ${user_id}, Client ID: ${client_id}`);

      // Validation Checks
      if (!holiday_status_id || !employee_id || !allocation_type || !date_from) {
        return res.status(400).json({
          status: "error",
          message: "Missing required fields: holiday_status_id, employee_id, allocation_type, or date_from"
        });
      }

      if (!["regular", "accrual"].includes(allocation_type)) {
        return res.status(400).json({
          status: "error",
          message: "Invalid allocation type"
        });
      }

      // For regular allocation, number_of_days is required
      if (allocation_type === "regular" && (!number_of_days || number_of_days <= 0)) {
        console.warn("Validation Failed: Invalid number_of_days for regular allocation");
        return res.status(400).json({
          status: "error",
          message: "Allocation days are required for regular allocation."
        });
      }

      // For accrual allocation, accrual_plan_id is required
      if (allocation_type === "accrual" && !accrual_plan_id) {
        console.warn("Validation Failed: accrual_plan_id is required for accrual allocation");
        return res.status(400).json({
          status: "error",
          message: "Accrual Plan is required for accrual allocation."
        });
      }

      // Fetch Leave Type Name
      console.log(`Fetching Leave Type Name for ID: ${holiday_status_id} with Client ID: ${client_id}...`);

      const leaveTypeInfo = await odooService.searchRead(
        "hr.leave.type",
        [["id", "=", parseInt(holiday_status_id)]],
        ["name"],
        1,
        client_id
      );

      console.log("Leave Type Info Retrieved:", JSON.stringify(leaveTypeInfo, null, 2));

      const leave_type_name = leaveTypeInfo.length > 0 ? leaveTypeInfo[0].name : "Unknown Leave Type";
      console.log("Resolved Leave Type Name:", leave_type_name);

      // Prepare Payload
      const vals = {
        holiday_status_id: parseInt(holiday_status_id),
        employee_id: parseInt(employee_id),
        allocation_type: allocation_type === "accrual" ? "accrual" : allocation_type,
        date_from: date_from,
        date_to: date_to || null,
        number_of_days: allocation_type === "regular" ? parseFloat(number_of_days) : 0,
        name: description || null,
        state: "confirm",
        create_uid: user_id,
        accrual_plan_id: allocation_type === "accrual" ? parseInt(accrual_plan_id) : null
      };

      const allocationId = await odooService.create(
        "hr.leave.allocation",
        vals,
        client_id
      );

      console.log(`Odoo Create Success! New Allocation ID: ${allocationId}`);

      return res.status(200).json({
        status: "success",
        message: "Leave allocation created successfully",
        data: {
          allocation_id: allocationId,
          leave_type_id: holiday_status_id,
          validity_period: { from: date_from, to: date_to },
          accrual_plan_id: allocation_type === "accrual" ? accrual_plan_id : null
        }
      });

    } catch (error) {
      console.error("!!! ERROR in createLeaveAllocation !!!");
      console.error("Error Message:", error.message);
      console.error("Error Stack:", error.stack);

      return res.status(error.status || 500).json({
        status: "error",
        message: error.message || "Failed to create leave allocation"
      });
    }
  }

  async getLeaveAllocation(req, res) {
    try {
      console.log("API called for getLeaveAllocation");

      // -----------------------------
      // 1. Get client_id and user_id from auth
      // -----------------------------
      const context = await getClientFromRequest(req);
      const { client_id } = context;
      const user_id = req.query.user_id ? parseInt(req.query.user_id) : context.user_id;

      console.log("Resolved client_id:", client_id);
      console.log("Resolved user_id:", user_id);

      if (!client_id) {
        return res.status(400).json({
          status: "error",
          message: "client_id is required"
        });
      }

      // -----------------------------
      // 2. Check if user is employee (not admin)

      // -----------------------------
      console.log("Checking user permissions...");
      const userData = await odooService.searchRead(
        "res.users",
        [["id", "=", user_id]],
        ["is_client_employee_admin", "is_client_employee_user"]
      );

      if (!userData || userData.length === 0) {
        return res.status(404).json({
          status: "error",
          message: "User not found"
        });
      }

      const user = userData[0];
      let employeeId = null;

      // If regular employee (not admin), get their employee_id
      if (user.is_client_employee_user && !user.is_client_employee_admin) {
        console.log("User is regular employee. Fetching employee info...");

        const employeeInfo = await odooService.searchRead(
          "hr.employee",
          [["user_id", "=", user_id]],
          ["id"]
        );

        if (!employeeInfo.length) {
          console.error(`❌ Employee not found for user_id ${user_id}`);
          return res.status(404).json({
            status: "error",
            message: "Employee not linked with this user."
          });
        }

        employeeId = employeeInfo[0].id;
        console.log(`✅ Employee ID: ${employeeId}`);
      }

      // -----------------------------
      // 3. Optional query filters
      // -----------------------------
      const {
        employee_id,
        leave_type_id,
        date_from,
        date_to,
        status
      } = req.query;

      // -----------------------------
      // 4. Domain (CLIENT SCOPED)
      // -----------------------------
      const domain = [["client_id", "=", client_id]];

      // If regular employee, only show their allocations
      if (employeeId) {
        domain.push(["employee_id", "=", employeeId]);
        console.log("Filtering allocations for employee:", employeeId);
      }
      // If admin and employee_id filter provided, use that
      else if (employee_id) {
        domain.push(["employee_id", "=", Number(employee_id)]);
        console.log("Admin filtering by employee_id:", employee_id);
      }
      // Otherwise admin sees all (no employee_id filter)

      if (leave_type_id) {
        domain.push(["holiday_status_id", "=", Number(leave_type_id)]);
      }
      if (status) {
        domain.push(["state", "=", status]);
      }
      if (date_from) {
        domain.push(["date_from", ">=", date_from]);
      }
      if (date_to) {
        domain.push(["date_to", "<=", date_to]);
      }

      console.log("Final Odoo Domain:", JSON.stringify(domain));

      // -----------------------------
      // 5. Fields
      // -----------------------------
      const fields = [
        "employee_id",
        "holiday_status_id",
        "allocation_type",
        "date_from",
        "date_to",
        "number_of_days",
        "name",
        "state",
        "create_uid",
        "create_date"
      ];

      const records = await odooService.searchRead(
        "hr.leave.allocation",
        domain,
        fields
      );

      console.log(`Fetched ${records.length} allocation records`);

      // -----------------------------
      // 6. Response formatting
      // -----------------------------
      const data = records.map(rec => ({
        id: rec.id,
        employee_id: rec.employee_id?.[0],
        employee_name: rec.employee_id?.[1],
        leave_type_id: rec.holiday_status_id?.[0],
        leave_type_name: rec.holiday_status_id?.[1],
        date_from: rec.date_from,
        date_to: rec.date_to,
        status: rec.state,
        allocation_type: rec.allocation_type,
        number_of_days: rec.number_of_days,
        description: rec.name || null,
        created_by: rec.create_uid?.[0] || null,
        created_on: rec.create_date
      }));

      return res.status(200).json({
        status: "success",
        total: data.length,
        data
      });
    } catch (error) {
      console.error("Get Leave Allocation error:", error);
      return res.status(error.status || 500).json({
        status: "error",
        message: error.message || "Failed to fetch leave allocations"
      });
    }
  }


  async updateLeaveAllocation(req, res) {
    try {
      console.log("API called for updateLeaveAllocation");

      const { id } = req.params;
      const {
        holiday_status_id,
        employee_id,
        allocation_type,
        date_from,
        date_to,
        number_of_days,
        description,
        state
      } = req.body;
      console.log(req.body);

      const { user_id } = await getClientFromRequest(req);

      /* ---------------- CHECK EXISTENCE ---------------- */
      const existing = await odooService.searchRead(
        "hr.leave.allocation",
        [["id", "=", parseInt(id)]],
        ["id", "state"],
        1
      );

      if (!existing.length) {
        return res.status(404).json({
          status: "error",
          message: "Leave allocation not found"
        });
      }

      /* ---------------- VALIDATIONS ---------------- */
      if (allocation_type && !["regular", "accrual"].includes(allocation_type)) {
        return res.status(400).json({
          status: "error",
          message: "Invalid allocation type"
        });
      }

      if (
        allocation_type === "regular" &&
        number_of_days !== undefined &&
        number_of_days <= 0
      ) {
        return res.status(400).json({
          status: "error",
          message: "Allocation days must be greater than zero"
        });
      }

      /* ---------------- PAYLOAD ---------------- */
      const vals = {
        write_uid: user_id
      };

      if (holiday_status_id !== undefined)
        vals.holiday_status_id = parseInt(holiday_status_id);

      if (employee_id !== undefined)
        vals.employee_id = parseInt(employee_id);

      if (allocation_type !== undefined)
        vals.allocation_type =
          allocation_type === "accrual" ? "accrual" : allocation_type;

      if (date_from !== undefined)
        vals.date_from = date_from;

      if (date_to !== undefined)
        vals.date_to = date_to;

      if (number_of_days !== undefined)
        vals.number_of_days = parseFloat(number_of_days);

      if (description !== undefined)
        vals.name = description;

      if (state !== undefined)
        vals.state = state;

      console.log("Update Leave Allocation Payload:", vals);

      /* ---------------- UPDATE ---------------- */
      await odooService.write(
        "hr.leave.allocation",
        parseInt(id),
        vals
      );

      return res.status(200).json({
        status: "success",
        message: "Leave allocation updated successfully"
      });

    } catch (error) {
      console.error("Update Leave Allocation Error:", error);
      return res.status(error.status || 500).json({
        status: "error",
        message: error.message || "Failed to update leave allocation"
      });
    }
  }

  async deleteLeaveAllocation(req, res) {
    try {
      console.log("API called for deleteLeaveAllocation");

      const { id } = req.params;
      const { user_id } = await getClientFromRequest(req);

      /* ---------------- CHECK EXISTENCE ---------------- */
      const existing = await odooService.searchRead(
        "hr.leave.allocation",
        [["id", "=", parseInt(id)]],
        ["id", "state"],
        1
      );

      if (!existing.length) {
        return res.status(404).json({
          status: "error",
          message: "Leave allocation not found"
        });
      }

      /* ---------------- CANCEL (SOFT DELETE) ---------------- */
      await odooService.write(
        "hr.leave.allocation",
        parseInt(id),
        {
          state: "refuse",
          write_uid: user_id
        }
      );

      return res.status(200).json({
        status: "success",
        message: "Leave allocation deleted successfully"
      });

    } catch (error) {
      console.error("Delete Leave Allocation Error:", error);
      return res.status(error.status || 500).json({
        status: "error",
        message: error.message || "Failed to delete leave allocation"
      });
    }
  }
  // New createLeaveRequest
  // async createLeaveRequest(req, res) {
  //   try {
  //     console.log("========== CREATE LEAVE REQUEST API START ==========");
  //     console.log("Incoming Request Body:", JSON.stringify(req.body, null, 2));
  //     console.log("Incoming Request Query:", JSON.stringify(req.query, null, 2));

  //     const { holiday_status_id, date_from, date_to, reason } = req.body;

  //     /* ───────── 1. GET USER ID ───────── */
  //     const rawUserId = req.body.user_id ?? req.query.user_id;
  //     const user_id = Number(rawUserId);

  //     if (!rawUserId || Number.isNaN(user_id) || user_id <= 0) {
  //       return res.status(400).json({
  //         status: "error",
  //         message: "user_id is required"
  //       });
  //     }

  //     /* ───────── 2. REQUIRED FIELD VALIDATION ───────── */
  //     if (!holiday_status_id || !date_from || !date_to) {
  //       return res.status(400).json({
  //         status: "error",
  //         message: "Require fields missing: holiday_status_id, date_from, date_to"
  //       });
  //     }

  //     const leaveTypeIdInt = parseInt(holiday_status_id);

  //     /* ───────── 3. FETCH USER → COMPANY ───────── */
  //     const userInfo = await odooService.searchRead(
  //       "res.users",
  //       [["id", "=", user_id]],
  //       ["company_id"],
  //       1
  //     );

  //     if (!userInfo.length || !userInfo[0].company_id) {
  //       return res.status(404).json({
  //         status: "error",
  //         message: "User company not found."
  //       });
  //     }

  //     /* ───────── 4. FETCH EMPLOYEE ───────── */
  //     const employeeInfo = await odooService.searchRead(
  //       "hr.employee",
  //       [["user_id", "=", user_id]],
  //       ["id", "name", "department_id", "company_id"],
  //       1
  //     );

  //     if (!employeeInfo.length) {
  //       return res.status(404).json({
  //         status: "error",
  //         message: "Employee not linked with this user."
  //       });
  //     }

  //     const empData = employeeInfo[0];
  //     const empIdInt = empData.id;

  //     const department_name = empData.department_id
  //       ? empData.department_id[1]
  //       : "No Department Found";

  //     const company_name = empData.company_id
  //       ? empData.company_id[1]
  //       : "No Company Found";

  //     /* ───────── 5. FETCH LEAVE TYPE ───────── */
  //     const leaveTypeInfo = await odooService.searchRead(
  //       "hr.leave.type",
  //       [["id", "=", leaveTypeIdInt]],
  //       ["name"],
  //       1
  //     );

  //     const leave_type_name =
  //       leaveTypeInfo.length ? leaveTypeInfo[0].name : "Unknown Type";

  //     /* ───────── 6. CREATE LEAVE REQUEST ───────── */
  //     const vals = {
  //       employee_id: empIdInt,
  //       holiday_status_id: leaveTypeIdInt,
  //       request_date_from: date_from,
  //       request_date_to: date_to,
  //       name: reason || false,
  //       create_uid: user_id
  //     };

  //     console.log("Leave Creation Payload:", vals);

  //     const leaveId = await odooService.create("hr.leave", vals);
  //     console.log(`✅ Leave created. ID: ${leaveId}`);

  //     /* ───────── 7. AUTO SUBMIT (UI BUTTON LOGIC) ───────── */
  //     try {
  //       console.log("Calling make_approval_request...");
  //       await odooService.callMethod(
  //         "hr.leave",
  //         "make_approval_request",
  //         [[leaveId]]
  //       );
  //       console.log("✅ Leave submit executed");
  //     } catch (submitError) {
  //       const msg = (submitError?.message || "").toLowerCase();

  //       // Check for allocation error
  //       if (msg.includes("allocation") || msg.includes("you do not have any allocation")) {
  //         return res.status(400).json({
  //           status: "error",
  //           message: "You don't have any allocation for this time off type"
  //         });
  //       }

  //       // ODOO KNOWN BEHAVIOR (TYPO SAFE)
  //       if (
  //         msg.includes("already") &&
  //         (msg.includes("generated") || msg.includes("genrated"))
  //       ) {
  //         console.log("ℹ️ Approval request already generated by Odoo (safe to ignore)");
  //       } else {
  //         console.error("❌ Unexpected submit error:", submitError.message);
  //         return res.status(500).json({
  //           status: "error",
  //           message: "Leave created but submit failed",
  //           details: submitError.message
  //         });
  //       }
  //     }

  //     /* ───────── 8. SUCCESS RESPONSE ───────── */
  //     return res.status(200).json({
  //       status: "success",
  //       message: "Leave request created and submitted successfully.",
  //       data: {
  //         request_id: leaveId,
  //         employee_name: empData.name,
  //         leave_type_name,
  //         company_name,
  //         department_name,
  //         validity: {
  //           from: date_from,
  //           to: date_to
  //         },
  //         reason
  //       }
  //     });

  //   } catch (error) {
  //     console.error("========== CREATE LEAVE REQUEST FAILED ==========");

  //     const rawError = error?.message || "";

  //     // Check for allocation error
  //     if (rawError.includes("allocation") || rawError.includes("You do not have any allocation")) {
  //       return res.status(400).json({
  //         status: "error",
  //         message: "You don't have any allocation for this time off type"
  //       });
  //     }

  //     // Check for overlap error
  //     if (rawError.includes("overlaps with this period")) {
  //       return res.status(409).json({
  //         status: "error",
  //         message: `Your requested leave (${req.body.date_from} to ${req.body.date_to}) conflicts with an existing entry.`,
  //         error_type: "LEAVE_OVERLAP"
  //       });
  //     }

  //     return res.status(error.status || 500).json({
  //       status: "error",
  //       message: error.message || "Failed to create leave request."
  //     });
  //   }
  // }
  // async createLeaveRequest(req, res) {
  //   try {
  //     console.log("========== CREATE LEAVE REQUEST API START ==========");
  //     console.log("Incoming Request Body:", JSON.stringify(req.body, null, 2));
  //     console.log("Incoming Request Query:", JSON.stringify(req.query, null, 2));

  //     const { holiday_status_id, date_from, date_to, reason } = req.body;

  //     /* ───────── 1. GET USER ID ───────── */
  //     const rawUserId = req.body.user_id ?? req.query.user_id;
  //     const user_id = Number(rawUserId);

  //     if (!rawUserId || Number.isNaN(user_id) || user_id <= 0) {
  //       return res.status(400).json({
  //         status: "error",
  //         message: "user_id is required"
  //       });
  //     }

  //     /* ───────── 2. REQUIRED FIELD VALIDATION ───────── */
  //     if (!holiday_status_id || !date_from || !date_to) {
  //       return res.status(400).json({
  //         status: "error",
  //         message: "Require fields missing: holiday_status_id, date_from, date_to"
  //       });
  //     }

  //     const leaveTypeIdInt = parseInt(holiday_status_id);

  //     /* ───────── 3. FETCH USER → COMPANY ───────── */
  //     const userInfo = await odooService.searchRead(
  //       "res.users",
  //       [["id", "=", user_id]],
  //       ["company_id"],
  //       1
  //     );

  //     if (!userInfo.length || !userInfo[0].company_id) {
  //       return res.status(404).json({
  //         status: "error",
  //         message: "User company not found."
  //       });
  //     }

  //     /* ───────── 4. FETCH EMPLOYEE ───────── */
  //     const employeeInfo = await odooService.searchRead(
  //       "hr.employee",
  //       [["user_id", "=", user_id]],
  //       ["id", "name", "department_id", "company_id"],
  //       1
  //     );

  //     if (!employeeInfo.length) {
  //       return res.status(404).json({
  //         status: "error",
  //         message: "Employee not linked with this user."
  //       });
  //     }

  //     const empData = employeeInfo[0];
  //     const empIdInt = empData.id;

  //     const department_name = empData.department_id
  //       ? empData.department_id[1]
  //       : "No Department Found";

  //     const company_name = empData.company_id
  //       ? empData.company_id[1]
  //       : "No Company Found";

  //     /* ───────── 5. FETCH LEAVE TYPE ───────── */
  //     const leaveTypeInfo = await odooService.searchRead(
  //       "hr.leave.type",
  //       [["id", "=", leaveTypeIdInt]],
  //       ["name"],
  //       1
  //     );

  //     const leave_type_name =
  //       leaveTypeInfo.length ? leaveTypeInfo[0].name : "Unknown Type";

  //     /* ───────── 5.1. CHECK FUTURE DATE FOR SICK/MEDICAL LEAVE ───────── */
  //     const leaveTypeNameLower = leave_type_name.toLowerCase().replace(/\s+/g, '');
  //     const isSickOrMedical =
  //       leaveTypeNameLower.includes('sickleave') ||
  //       leaveTypeNameLower.includes('medicalleave');

  //     if (isSickOrMedical) {
  //       const today = new Date();
  //       today.setHours(0, 0, 0, 0);
  //       const requestFromDate = new Date(date_from);
  //       requestFromDate.setHours(0, 0, 0, 0);

  //       if (requestFromDate > today) {
  //         return res.status(400).json({
  //           status: "error",
  //           message: `You can't apply ${leave_type_name} for future dates.`
  //         });
  //       }
  //     }

  //     /* ───────── 6. CREATE LEAVE REQUEST ───────── */
  //     const vals = {
  //       employee_id: empIdInt,
  //       holiday_status_id: leaveTypeIdInt,
  //       request_date_from: date_from,
  //       request_date_to: date_to,
  //       name: reason || false,
  //       create_uid: user_id
  //     };

  //     console.log("Leave Creation Payload:", vals);

  //     const leaveId = await odooService.create("hr.leave", vals);
  //     console.log(`✅ Leave created. ID: ${leaveId}`);

  //     /* ───────── 7. AUTO SUBMIT (UI BUTTON LOGIC) ───────── */
  //     try {
  //       console.log("Calling make_approval_request...");
  //       await odooService.callMethod(
  //         "hr.leave",
  //         "make_approval_request",
  //         [[leaveId]]
  //       );
  //       console.log("✅ Leave submit executed");
  //     } catch (submitError) {
  //       const msg = (submitError?.message || "").toLowerCase();

  //       // Check for allocation error
  //       if (msg.includes("allocation") || msg.includes("you do not have any allocation")) {
  //         return res.status(400).json({
  //           status: "error",
  //           message: "You don't have any allocation for this time off type"
  //         });
  //       }

  //       // ODOO KNOWN BEHAVIOR (TYPO SAFE)
  //       if (
  //         msg.includes("already") &&
  //         (msg.includes("generated") || msg.includes("genrated"))
  //       ) {
  //         console.log("ℹ️ Approval request already generated by Odoo (safe to ignore)");
  //       } else {
  //         console.error("❌ Unexpected submit error:", submitError.message);
  //         return res.status(500).json({
  //           status: "error",
  //           message: "Leave created but submit failed",
  //           details: submitError.message
  //         });
  //       }
  //     }

  //     /* ───────── 8. SUCCESS RESPONSE ───────── */
  //     return res.status(200).json({
  //       status: "success",
  //       message: "Leave request created and submitted successfully.",
  //       data: {
  //         request_id: leaveId,
  //         employee_name: empData.name,
  //         leave_type_name,
  //         company_name,
  //         department_name,
  //         validity: {
  //           from: date_from,
  //           to: date_to
  //         },
  //         reason
  //       }
  //     });

  //   } catch (error) {
  //     console.error("========== CREATE LEAVE REQUEST FAILED ==========");

  //     const rawError = error?.message || "";

  //     // Check for allocation error
  //     if (rawError.includes("allocation") || rawError.includes("You do not have any allocation")) {
  //       return res.status(400).json({
  //         status: "error",
  //         message: "You don't have any allocation for this time off type"
  //       });
  //     }

  //     // Check for overlap error
  //     if (rawError.includes("overlaps with this period")) {
  //       return res.status(409).json({
  //         status: "error",
  //         message: `Already applied for this date`,
  //         error_type: "LEAVE_OVERLAP"
  //       });
  //     }

  //     return res.status(error.status || 500).json({
  //       status: "error",
  //       message: error.message || "Failed to create leave request."
  //     });
  //   }
  // }

  async getLeaveRequest(req, res) {
    try {
      console.log("========== GET LEAVE REQUEST API START ==========");
      console.log("Incoming Request Query:", JSON.stringify(req.query, null, 2));

      /* ───────── 1. GET CONTEXT ───────── */
      const context = await getClientFromRequest(req);
      const user_id = req.query.user_id ? parseInt(req.query.user_id) : context.user_id;

      console.log(`Resolved user_id: ${user_id}`);

      /* ───────── 2. CHECK USER FLAGS ───────── */
      console.log("Checking user permissions...");
      const userData = await odooService.searchRead(
        "res.users",
        [["id", "=", user_id]],
        ["is_client_employee_admin", "is_client_employee_user"]
      );

      if (!userData || userData.length === 0) {
        return res.status(404).json({
          status: "error",
          message: "User not found"
        });
      }

      const user = userData[0];
      let domain = [];
      let employeeInfo = null;

      /* ───────── 3. BUILD DOMAIN BASED ON USER TYPE ───────── */
      if (user.is_client_employee_user) {
        console.log("User is regular employee. Fetching own leave requests.");

        // Fetch employee linked to this user
        employeeInfo = await odooService.searchRead(
          "hr.employee",
          [["user_id", "=", user_id]],
          ["id", "name", "department_id", "company_id"]
        );

        if (!employeeInfo.length) {
          console.error(`❌ Employee not found for user_id ${user_id}`);
          return res.status(404).json({
            status: "error",
            message: "Employee not linked with this user."
          });
        }

        // Filter by employee_id
        domain.push(["employee_id", "=", employeeInfo[0].id]);

      } else if (user.is_client_employee_admin) {
        console.log("User is Admin. Fetching based on filters.");

        // Admin can filter by specific employee or see all
        if (req.query.employee_id) {
          const empId = parseInt(req.query.employee_id);
          domain.push(["employee_id", "=", empId]);

          // Fetch that specific employee's info for response
          employeeInfo = await odooService.searchRead(
            "hr.employee",
            [["id", "=", empId]],
            ["id", "name", "department_id", "company_id"]
          );
        }
        // If no employee_id filter, admin sees all (we won't fetch specific employee info)
      }

      /* ───────── 4. ADD CLIENT_ID & OPTIONAL FILTERS ───────── */
      domain.push(["client_id", "=", context.client_id]);

      // Optional date filters
      if (req.query.date_from && req.query.date_to) {
        domain.push(["date_from", ">=", req.query.date_from]);
        domain.push(["date_to", "<=", req.query.date_to]);
      }

      // Optional leave type filter
      if (req.query.holiday_status_id) {
        domain.push(["holiday_status_id", "=", parseInt(req.query.holiday_status_id)]);
      }

      // Optional status filter
      if (req.query.state) {
        domain.push(["state", "=", req.query.state]);
      }

      console.log("Final Search Domain:", JSON.stringify(domain));

      /* ───────── 5. FETCH LEAVE REQUESTS ───────── */
      console.log("Fetching leave requests from Odoo...");
      const leaveRequests = await odooService.searchRead(
        "hr.leave",
        domain,
        [
          "id",
          "name",
          "employee_id",
          "holiday_status_id",
          "date_from",
          "date_to",
          "number_of_days",
          "state",
          "create_date"
        ]
      );

      console.log(`Fetched ${leaveRequests.length} leave records`);

      /* ───────── 6. FORMAT RESPONSE ───────── */
      const responseData = leaveRequests.map(lr => ({
        request_id: lr.id,
        employee_id: lr.employee_id?.[0] || null,
        employee_name: lr.employee_id?.[1] || null,
        leave_type_id: lr.holiday_status_id?.[0] || null,
        leave_type_name: lr.holiday_status_id?.[1] || "Unknown",
        from: lr.date_from,
        to: lr.date_to,
        days: lr.number_of_days,
        status: lr.state,
        reason: lr.name || null,
        created_on: lr.create_date
      }));

      /* ───────── 7. BUILD RESPONSE ───────── */
      const response = {
        status: "success",
        message: "Leave requests fetched successfully.",
        total_records: responseData.length,
        data: responseData
      };

      // Include employee info only if we have it (regular user or admin filtering by specific employee)
      if (employeeInfo && employeeInfo.length > 0) {
        const empData = employeeInfo[0];
        response.employee = {
          id: empData.id,
          name: empData.name,
          department: empData.department_id?.[1] || null,
          company: empData.company_id?.[1] || null
        };
      }

      console.log("========== GET LEAVE REQUEST SUCCESS ==========");
      return res.status(200).json(response);

    } catch (error) {
      console.error("========== GET LEAVE REQUEST FAILED ==========");
      console.error(error);
      return res.status(error.status || 500).json({
        status: "error",
        message: error.message || "Failed to fetch leave requests."
      });
    }
  }

  async updateLeaveRequest(req, res) {
    try {
      console.log("API called for updateLeaveRequest");

      const { id } = req.params;
      const {
        employee_id,
        holiday_status_id,
        date_from,
        date_to,
        reason,
        state
      } = req.body;
      console.log(req.body);

      const { user_id } = await getClientFromRequest(req);

      /* ---------------- CHECK EXISTENCE ---------------- */
      const existing = await odooService.searchRead(
        "hr.leave",
        [["id", "=", parseInt(id)]],
        ["id", "state"],
        1
      );

      if (!existing.length) {
        return res.status(404).json({
          status: "error",
          message: "Leave request not found"
        });
      }

      /* ---------------- VALIDATIONS ---------------- */
      if (state && !["draft", "confirm", "validate", "refuse", "cancel"].includes(state)) {
        return res.status(400).json({
          status: "error",
          message: "Invalid state value"
        });
      }

      /* ---------------- PAYLOAD ---------------- */
      const vals = {
        write_uid: user_id
      };

      if (employee_id !== undefined)
        vals.employee_id = parseInt(employee_id);

      if (holiday_status_id !== undefined)
        vals.holiday_status_id = parseInt(holiday_status_id);

      if (date_from !== undefined)
        vals.date_from = date_from;

      if (date_to !== undefined)
        vals.date_to = date_to;

      if (reason !== undefined)
        vals.name = reason;

      if (state !== undefined)
        vals.state = state;

      console.log("Update Leave Request Payload:", vals);

      /* ---------------- UPDATE ---------------- */
      await odooService.write(
        "hr.leave",
        parseInt(id),
        vals
      );

      return res.status(200).json({
        status: "success",
        message: "Leave request updated successfully"
      });

    } catch (error) {
      console.error("Update Leave Request Error:", error);
      return res.status(error.status || 500).json({
        status: "error",
        message: error.message || "Failed to update leave request"
      });
    }
  }

  async deleteLeaveRequest(req, res) {
    try {
      console.log("API called for deleteLeaveRequest");

      const { id } = req.params;
      const { user_id } = await getClientFromRequest(req);

      /* ---------------- CHECK EXISTENCE ---------------- */
      const existing = await odooService.searchRead(
        "hr.leave",
        [["id", "=", parseInt(id)]],
        ["id", "state"],
        1
      );

      if (!existing.length) {
        return res.status(404).json({
          status: "error",
          message: "Leave request not found"
        });
      }

      /* ---------------- CANCEL REQUEST ---------------- */
      await odooService.write(
        "hr.leave",
        parseInt(id),
        {
          state: "cancel",
          write_uid: user_id
        }
      );

      return res.status(200).json({
        status: "success",
        message: "Leave request deleted successfully"
      });

    } catch (error) {
      console.error("Delete Leave Request Error:", error);
      return res.status(error.status || 500).json({
        status: "error",
        message: error.message || "Failed to delete leave request"
      });
    }
  }
  // async getAdminLeave(req, res) {
  //   try {
  //     const { user_id, limit = 20, offset = 0 } = req.query;

  //     if (!user_id) {
  //       return res.status(400).json({
  //         success: false,
  //         message: "user_id is required"
  //       });
  //     }

  //     /* =====================
  //        RESOLVE CLIENT
  //     ===================== */
  //     const user = await odooService.searchRead(
  //       "res.users",
  //       [["id", "=", Number(user_id)]],
  //       ["partner_id"],
  //       1
  //     );

  //     if (!user.length) throw new Error("User not found");

  //     const partnerId = user[0].partner_id[0];

  //     const adminEmployee = await odooService.searchRead(
  //       "hr.employee",
  //       [["address_id", "=", partnerId]],
  //       ["address_id"],
  //       1
  //     );

  //     if (!adminEmployee.length)
  //       throw new Error("Admin employee not found");

  //     const client_id = adminEmployee[0].address_id[0];
  //     const today = new Date().toISOString().split("T")[0];

  //     /* =====================
  //        DASHBOARD METRICS
  //     ===================== */
  //     const [
  //       presentTodayCount,
  //       plannedLeavesCount,
  //       absentUnplannedCount,
  //       pendingApprovalsCount
  //     ] = await Promise.all([

  //       odooService.callCustomMethod(
  //         "simple.action",
  //         "get_total_present_employee",
  //         [[], false, false, client_id]
  //       ),

  //       odooService.searchCount("hr.leave", [
  //         ["employee_id.address_id", "=", client_id],
  //         ["state", "=", "validate"],
  //         ["request_date_from", ">", today]
  //       ]),

  //       odooService.callCustomMethod(
  //         "simple.action",
  //         "get_total_no_of_uninformed_employee",
  //         [client_id]
  //       ),

  //       odooService.searchCount("hr.leave", [
  //         ["employee_id.address_id", "=", client_id],
  //         ["state", "=", "confirm"]
  //       ])
  //     ]);

  //     /* =====================
  //        LEAVE TABLE DATA
  //     ===================== */

  //     // Present Today - Get attendance records for today
  //     const presentTodayTable = await odooService.searchRead(
  //       "hr.attendance",
  //       [
  //         ["employee_id.address_id", "=", client_id],
  //         ["check_in", ">=", `${today} 00:00:00`],
  //         ["check_in", "<=", `${today} 23:59:59`]
  //       ],
  //       ["employee_id", "check_in", "check_out"],
  //       Number(offset),
  //       Number(limit),
  //       "check_in desc"
  //     );

  //     // Planned Leaves
  //     const plannedLeavesTable = await odooService.searchRead(
  //       "hr.leave",
  //       [
  //         ["employee_id.address_id", "=", client_id],
  //         ["state", "=", "validate"],
  //         ["request_date_from", ">", today]
  //       ],
  //       [
  //         "employee_id",
  //         "holiday_status_id",
  //         "request_date_from",
  //         "request_date_to",
  //         "number_of_days",
  //         "state"
  //       ],
  //       Number(offset),
  //       Number(limit),
  //       "request_date_from asc"
  //     );

  //     // Pending Approvals
  //     const pendingApprovalsTable = await odooService.searchRead(
  //       "hr.leave",
  //       [
  //         ["employee_id.address_id", "=", client_id],
  //         ["state", "=", "confirm"]
  //       ],
  //       [
  //         "employee_id",
  //         "holiday_status_id",
  //         "request_date_from",
  //         "request_date_to",
  //         "number_of_days",
  //         "state"
  //       ],
  //       Number(offset),
  //       Number(limit),
  //       "request_date_from asc"
  //     );

  //     // Absent / Unplanned (SAFE NORMALIZATION)
  //     let absentUnplannedRaw = await odooService.callCustomMethod(
  //       "simple.action",
  //       "get_total_no_of_uninformed_employee",
  //       [client_id]
  //     );

  //     // 🔑 FORCE ARRAY SHAPE
  //     if (!Array.isArray(absentUnplannedRaw)) {
  //       absentUnplannedRaw = absentUnplannedRaw ? [absentUnplannedRaw] : [];
  //     }

  //     /* =====================
  //        NORMALIZERS
  //     ===================== */
  //     const normalizeLeave = (l) => ({
  //       employee_id: l.employee_id?.[0] || l.employee_id || null,
  //       employee_name: l.employee_id?.[1] || l.employee_name || null,
  //       leave_type: l.holiday_status_id?.[1] || l.leave_type || "Unplanned Absence",
  //       from: l.request_date_from || l.from || today,
  //       to: l.request_date_to || l.to || today,
  //       number_of_days: l.number_of_days || 1,
  //       status: l.state || "absent"
  //     });

  //     const normalizePresent = (p) => ({
  //       employee_id: p.employee_id?.[0] || p.employee_id || null,
  //       employee_name: p.employee_id?.[1] || p.employee_name || null,
  //       check_in: p.check_in || null,
  //       check_out: p.check_out || null,
  //       status: "present"
  //     });

  //     /* =====================
  //        RESPONSE
  //     ===================== */
  //     return res.status(200).json({
  //       success: true,
  //       dashboard: {
  //         present_today: presentTodayCount,
  //         planned_leaves: plannedLeavesCount,
  //         absent_unplanned: absentUnplannedCount,
  //         pending_approvals: pendingApprovalsCount
  //       },
  //       tables: {
  //         present_today: presentTodayTable.map(normalizePresent),
  //         planned_leaves: plannedLeavesTable.map(normalizeLeave),
  //         pending_approvals: pendingApprovalsTable.map(normalizeLeave),
  //         absent_unplanned: absentUnplannedRaw.map(normalizeLeave)
  //       },
  //       meta: {
  //         client_id,
  //         limit: Number(limit),
  //         offset: Number(offset)
  //       }
  //     });

  //   } catch (error) {
  //     console.error("❌ Admin Leave Dashboard Error:", error);
  //     return res.status(500).json({
  //       success: false,
  //       message: error.message
  //     });
  //   }
  // }

  async getAdminLeave(req, res) {
    try {
      const { user_id, limit = 20, offset = 0 } = req.query;

      if (!user_id) {
        return res.status(400).json({
          success: false,
          message: "user_id is required"
        });
      }
      const convertToIST = (utcDatetime) => {
        if (!utcDatetime) return null;

        const utcDate = new Date(utcDatetime + ' UTC');
        const istDate = new Date(utcDate.getTime() + (5.5 * 60 * 60 * 1000));

        return istDate.toISOString().replace('T', ' ').substring(0, 19);
      };
      const user = await odooService.searchRead(
        "res.users",
        [["id", "=", Number(user_id)]],
        ["partner_id"],
        1
      );

      if (!user.length) throw new Error("User not found");

      const partnerId = user[0].partner_id[0];

      const adminEmployee = await odooService.searchRead(
        "hr.employee",
        [["address_id", "=", partnerId]],
        ["address_id"],
        1
      );

      if (!adminEmployee.length)
        throw new Error("Admin employee not found");

      const client_id = adminEmployee[0].address_id[0];
      const today = new Date().toISOString().split("T")[0];
      const [
        presentTodayCount,
        plannedLeavesCount,
        absentUnplannedCount,
        pendingApprovalsCount
      ] = await Promise.all([

        odooService.callCustomMethod(
          "simple.action",
          "get_total_present_employee",
          [[], false, false, client_id]
        ),

        odooService.searchCount("hr.leave", [
          ["employee_id.address_id", "=", client_id],
          ["state", "=", "validate"],
          ["request_date_from", ">", today]
        ]),

        odooService.callCustomMethod(
          "simple.action",
          "get_total_no_of_uninformed_employee",
          [client_id]
        ),

        odooService.searchCount("hr.leave", [
          ["employee_id.address_id", "=", client_id],
          ["state", "=", "confirm"]
        ])
      ]);
      const presentTodayTable = await odooService.searchRead(
        "hr.attendance",
        [
          ["employee_id.address_id", "=", client_id],
          ["check_in", ">=", `${today} 00:00:00`],
          ["check_in", "<=", `${today} 23:59:59`]
        ],
        ["employee_id", "check_in", "check_out"],
        Number(offset),
        Number(limit),
        "check_in desc"
      );
      const plannedLeavesTable = await odooService.searchRead(
        "hr.leave",
        [
          ["employee_id.address_id", "=", client_id],
          ["state", "=", "validate"],
          ["request_date_from", ">", today]
        ],
        [
          "employee_id",
          "holiday_status_id",
          "request_date_from",
          "request_date_to",
          "number_of_days",
          "state"
        ],
        Number(offset),
        Number(limit),
        "request_date_from asc"
      );
      const pendingApprovalsTable = await odooService.searchRead(
        "hr.leave",
        [
          ["employee_id.address_id", "=", client_id],
          ["state", "=", "confirm"]
        ],
        [
          "employee_id",
          "holiday_status_id",
          "request_date_from",
          "request_date_to",
          "number_of_days",
          "state"
        ],
        Number(offset),
        Number(limit),
        "request_date_from asc"
      );
      const allEmployees = await odooService.searchRead(
        "hr.employee",
        [["address_id", "=", client_id]],
        ["id", "name"]
      );
      const presentEmployeeIds = presentTodayTable.map(p => p.employee_id[0]);
      const onLeaveToday = await odooService.searchRead(
        "hr.leave",
        [
          ["employee_id.address_id", "=", client_id],
          ["state", "=", "validate"],
          ["request_date_from", "<=", today],
          ["request_date_to", ">=", today]
        ],
        ["employee_id"]
      );
      const onLeaveEmployeeIds = onLeaveToday.map(l => l.employee_id[0]);
      const pendingLeaveToday = await odooService.searchRead(
        "hr.leave",
        [
          ["employee_id.address_id", "=", client_id],
          ["state", "=", "confirm"],
          ["request_date_from", "<=", today],
          ["request_date_to", ">=", today]
        ],
        ["employee_id"]
      );

      const pendingLeaveEmployeeIds = pendingLeaveToday.map(l => l.employee_id[0]);
      const absentUnplannedRaw = allEmployees
        .filter(emp =>
          !presentEmployeeIds.includes(emp.id) &&
          !onLeaveEmployeeIds.includes(emp.id) &&
          !pendingLeaveEmployeeIds.includes(emp.id)
        )
        .map(emp => ({
          employee_id: emp.id,
          employee_name: emp.name,
          from: today,
          to: today,
          number_of_days: 1,
          leave_type: "Unplanned Absence",
          state: "absent"
        }));
      const normalizeLeave = (l) => ({
        employee_id: l.employee_id?.[0] || l.employee_id || null,
        employee_name: l.employee_id?.[1] || l.employee_name || null,
        leave_type: l.holiday_status_id?.[1] || l.leave_type || "Unplanned Absence",
        from: l.request_date_from || l.from || today,
        to: l.request_date_to || l.to || today,
        number_of_days: l.number_of_days || 1,
        status: l.state || "absent"
      });

      const normalizePresent = (p) => ({
        employee_id: p.employee_id?.[0] || p.employee_id || null,
        employee_name: p.employee_id?.[1] || p.employee_name || null,
        check_in: convertToIST(p.check_in),
        check_out: convertToIST(p.check_out),
        status: "present"
      });

      const normalizeAbsent = (a) => ({
        employee_id: a.employee_id || null,
        employee_name: a.employee_name || null,
        leave_type: a.leave_type || "Unplanned Absence",
        from: a.from || today,
        to: a.to || today,
        number_of_days: a.number_of_days || 1,
        status: a.state || "absent"
      });
      return res.status(200).json({
        success: true,
        dashboard: {
          present_today: presentTodayCount,
          planned_leaves: plannedLeavesCount,
          absent_unplanned: absentUnplannedCount,
          pending_approvals: pendingApprovalsCount
        },
        tables: {
          present_today: presentTodayTable.map(normalizePresent),
          planned_leaves: plannedLeavesTable.map(normalizeLeave),
          pending_approvals: pendingApprovalsTable.map(normalizeLeave),
          absent_unplanned: absentUnplannedRaw.map(normalizeAbsent)
        },
        meta: {
          client_id,
          limit: Number(limit),
          offset: Number(offset)
        }
      });

    } catch (error) {
      console.error("❌ Admin Leave Dashboard Error:", error);
      return res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }
  async createPublicHoliday(req, res) {
    try {
      console.log("API called for Public Holiday creation");
      const { name, date_from, date_to, work_entry_type_id, calendar_id } = req.body;
      console.log(req.body);

      const missingFields = [];
      if (!name) missingFields.push("name (Reason)");
      if (!date_from) missingFields.push("date_from (Start Date)");
      if (!date_to) missingFields.push("date_to (End Date)");

      if (missingFields.length) {
        return res.status(400).json({
          status: "error",
          message: `Missing required fields: ${missingFields.join(", ")}`
        });
      }

      const dateTimeRegex = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/;

      if (!dateTimeRegex.test(date_from)) {
        return res.status(400).json({
          status: "error",
          message: "Invalid date_from format. Expected format: YYYY-MM-DD HH:MM:SS (e.g., 2026-02-05 00:00:00)"
        });
      }

      if (!dateTimeRegex.test(date_to)) {
        return res.status(400).json({
          status: "error",
          message: "Invalid date_to format. Expected format: YYYY-MM-DD HH:MM:SS (e.g., 2026-02-05 23:59:59)"
        });
      }

      let client_id;
      try {
        const clientData = await getClientFromRequest(req);
        client_id = clientData.client_id;

        if (!client_id) {
          return res.status(400).json({
            status: "error",
            message: "Either user_id or unique_user_id is required"
          });
        }
      } catch (authError) {
        return res.status(400).json({
          status: "error",
          message: authError.message || "Either user_id or unique_user_id is required"
        });
      }

      // ✅ UPDATED: Check for exact duplicate (same client_id, name, and dates)
      const exactDuplicate = await odooService.searchRead(
        "resource.calendar.leaves",
        [
          ["client_id", "=", client_id],
          ["name", "=", name],
          ["date_from", "=", date_from],
          ["date_to", "=", date_to]
        ],
        ["id", "name", "date_from", "date_to"],
        1
      );

      if (exactDuplicate.length) {
        return res.status(409).json({
          status: "error",
          message: "This holiday already exists with your client"
        });
      }

      const calendarFilter = calendar_id ? ["calendar_id", "=", parseInt(calendar_id)] : ["calendar_id", "=", false];

      const overlappingHolidays = await odooService.searchRead(
        "resource.calendar.leaves",
        [
          ["client_id", "=", client_id],
          calendarFilter,
          ["date_from", "<", date_to],
          ["date_to", ">", date_from]
        ],
        ["id", "name", "date_from", "date_to"]
      );

      console.log("Found overlapping holidays:", overlappingHolidays);

      if (overlappingHolidays.length > 0) {
        return res.status(409).json({
          status: "error",
          message: `A public holiday already exists during this period: "${overlappingHolidays[0].name}" (${overlappingHolidays[0].date_from} to ${overlappingHolidays[0].date_to})`
        });
      }

      let valid_work_entry_type_id = false;
      if (work_entry_type_id) {
        const workEntryType = await odooService.searchRead(
          "hr.work.entry.type",
          [["id", "=", work_entry_type_id]],
          ["id", "name"],
          1
        );

        if (!workEntryType.length) {
          return res.status(400).json({
            status: "error",
            message: "Invalid work_entry_type_id"
          });
        }
        valid_work_entry_type_id = work_entry_type_id;
      }

      let valid_calendar_id = false;
      if (calendar_id) {
        const calendar = await odooService.searchRead(
          "resource.calendar",
          [["id", "=", calendar_id]],
          ["id", "name"],
          1
        );

        if (!calendar.length) {
          return res.status(400).json({
            status: "error",
            message: "Invalid calendar_id (Working Hours)",
          });
        }
        valid_calendar_id = calendar_id;
      }

      const vals = {
        name,
        date_from,
        date_to,
        client_id,
        work_entry_type_id: valid_work_entry_type_id || false,
        calendar_id: valid_calendar_id || false,
      };

      console.log("Payload sending to Odoo:", vals);

      const holidayId = await odooService.create("resource.calendar.leaves", vals);

      const createdHoliday = await odooService.searchRead(
        "resource.calendar.leaves",
        [["id", "=", holidayId]],
        ["id", "name", "date_from", "date_to", "work_entry_type_id", "calendar_id"]
      );

      return res.status(201).json({
        status: "success",
        message: "Public holiday created successfully",
        data: createdHoliday[0] || null,
      });

    } catch (error) {
      console.error("❌ Create Public Holiday Error:", error);

      if (error.message && error.message.includes("cannot overlap")) {
        return res.status(409).json({
          status: "error",
          message: "A public holiday already exists during this Date"
        });
      }

      if (error.message && error.message.includes("does not match format")) {
        return res.status(400).json({
          status: "error",
          message: "Invalid date format. Expected format: YYYY-MM-DD HH:MM:SS"
        });
      }

      return res.status(500).json({
        status: "error",
        message: error.message || "Failed to create public holiday",
      });
    }
  }
  async getPublicHoliday(req, res) {
    try {
      console.log("API called for fetching Public Holidays");
      // console.log(req.body);

      // -----------------------------
      // 1. Get client_id from request
      // -----------------------------
      const { client_id } = await getClientFromRequest(req);

      // -----------------------------
      // 2. Optional filters from query
      // -----------------------------
      const { id, date_from, date_to } = req.query;
      console.log(req.query);

      const domain = [["client_id", "=", client_id]];

      if (id) {
        domain.push(["id", "=", parseInt(id)]);
      }

      if (date_from) {
        domain.push(["date_from", ">=", date_from]);
      }

      if (date_to) {
        domain.push(["date_to", "<=", date_to]);
      }

      // -----------------------------
      // 3. Fields to fetch
      // -----------------------------
      const fields = [
        "id",
        "name",
        "date_from",
        "date_to",
        "work_entry_type_id",
        "calendar_id",
      ];

      // -----------------------------
      // 4. Fetch from Odoo
      // -----------------------------
      const holidays = await odooService.searchRead(
        "resource.calendar.leaves",
        domain,
        fields
      );



      // -----------------------------
      // 5. Return response
      // -----------------------------
      return res.status(200).json({
        status: "success",
        count: holidays.length,
        data: holidays,
      });

    } catch (error) {
      console.error("❌ Get Public Holiday Error:", error);
      return res.status(500).json({
        status: "error",
        message: error.message || "Failed to fetch public holidays",
      });
    }
  }

  async updatePublicHoliday(req, res) {
    try {
      console.log("API called for updatePublicHoliday");
      const { id } = req.params;
      const { name, date_from, date_to, work_entry_type_id, calendar_id } = req.body;
      console.log(req.body);

      /* -----------------------------
       * 1. Validate Date Format (if provided)
       * ----------------------------- */
      const dateTimeRegex = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/;

      if (date_from !== undefined && !dateTimeRegex.test(date_from)) {
        return res.status(400).json({
          status: "error",
          message: "Invalid date_from format. Expected format: YYYY-MM-DD HH:MM:SS (e.g., 2026-02-05 00:00:00)"
        });
      }

      if (date_to !== undefined && !dateTimeRegex.test(date_to)) {
        return res.status(400).json({
          status: "error",
          message: "Invalid date_to format. Expected format: YYYY-MM-DD HH:MM:SS (e.g., 2026-02-05 23:59:59)"
        });
      }

      /* -----------------------------
       * 2. Check Existence
       * ----------------------------- */
      const existing = await odooService.searchRead(
        "resource.calendar.leaves",
        [["id", "=", parseInt(id)]],
        ["id"],
        1
      );

      if (!existing.length) {
        return res.status(404).json({
          status: "error",
          message: "Public holiday not found"
        });
      }

      /* -----------------------------
       * 3. Validate Relations
       * ----------------------------- */
      let valid_work_entry_type_id = false;
      if (work_entry_type_id) {
        const workEntryType = await odooService.searchRead(
          "hr.work.entry.type",
          [["id", "=", work_entry_type_id]],
          ["id"],
          1
        );

        if (!workEntryType.length) {
          return res.status(400).json({
            status: "error",
            message: "Invalid work_entry_type_id"
          });
        }
        valid_work_entry_type_id = work_entry_type_id;
      }

      let valid_calendar_id = false;
      if (calendar_id) {
        const calendar = await odooService.searchRead(
          "resource.calendar",
          [["id", "=", calendar_id]],
          ["id"],
          1
        );

        if (!calendar.length) {
          return res.status(400).json({
            status: "error",
            message: "Invalid calendar_id (Working Hours)"
          });
        }
        valid_calendar_id = calendar_id;
      }

      /* -----------------------------
       * 4. Payload
       * ----------------------------- */
      const vals = {};
      if (name !== undefined) vals.name = name;
      if (date_from !== undefined) vals.date_from = date_from;
      if (date_to !== undefined) vals.date_to = date_to;
      if (work_entry_type_id !== undefined)
        vals.work_entry_type_id = valid_work_entry_type_id || false;
      if (calendar_id !== undefined)
        vals.calendar_id = valid_calendar_id || false;

      console.log("Update Payload:", vals);

      /* -----------------------------
       * 5. Update
       * ----------------------------- */
      await odooService.write(
        "resource.calendar.leaves",
        parseInt(id),
        vals
      );

      /* -----------------------------
       * 6. Fetch Updated Record
       * ----------------------------- */
      const updatedHoliday = await odooService.searchRead(
        "resource.calendar.leaves",
        [["id", "=", parseInt(id)]],
        ["id", "name", "date_from", "date_to", "work_entry_type_id", "calendar_id"]
      );

      return res.status(200).json({
        status: "success",
        message: "Public holiday updated successfully",
        data: updatedHoliday[0] || null
      });

    } catch (error) {
      console.error("❌ Update Public Holiday Error:", error);

      // Check if it's a validation error from Odoo
      if (error.message && error.message.includes("does not match format")) {
        return res.status(400).json({
          status: "error",
          message: "Invalid date format. Expected format: YYYY-MM-DD HH:MM:SS"
        });
      }

      return res.status(500).json({
        status: "error",
        message: error.message || "Failed to update public holiday"
      });
    }
  }

  async deletePublicHoliday(req, res) {
    try {
      console.log("API called for deletePublicHoliday");

      const { id } = req.params;

      /* -----------------------------
       * 1. Check Existence
       * ----------------------------- */
      const existing = await odooService.searchRead(
        "resource.calendar.leaves",
        [["id", "=", parseInt(id)]],
        ["id"],
        1
      );

      if (!existing.length) {
        return res.status(404).json({
          status: "error",
          message: "Public holiday not found"
        });
      }

      /* -----------------------------
       * 2. Hard Delete
       * ----------------------------- */
      await odooService.unlink(
        "resource.calendar.leaves",
        parseInt(id)
      );

      return res.status(200).json({
        status: "success",
        message: "Public holiday deleted successfully"
      });

    } catch (error) {
      console.error("❌ Delete Public Holiday Error:", error);
      return res.status(500).json({
        status: "error",
        message: error.message || "Failed to delete public holiday"
      });
    }
  }

  async createAccrualPlan(req, res) {
    try {
      console.log("API called for Accrual Plan creation");
      // console.log(req.body);

      const {
        name,
        carryover_date,
        is_based_on_worked_time,
        accrued_gain_time,
        // company_id
      } = req.body;
      console.log(req.body);

      // -----------------------------
      // 1. Get client_id from auth
      // -----------------------------
      const { client_id } = await getClientFromRequest(req);

      // -----------------------------
      // 2. Mandatory Validation
      // -----------------------------
      const missingFields = [];
      if (!name) missingFields.push("name");
      if (!carryover_date) missingFields.push("carryover_date");
      if (!accrued_gain_time) missingFields.push("accrued_gain_time");
      // if (!company_id) missingFields.push("company_id");

      if (missingFields.length) {
        return res.status(400).json({
          status: "error",
          message: `Missing required fields: ${missingFields.join(", ")}`
        });
      }

      // -----------------------------
      // 3. Validate Company (Many2one)
      // -----------------------------
      // const company = await odooService.searchRead(
      //   "res.company",
      //   [["id", "=", company_id]],
      //   ["id", "name"],
      //   1
      // );

      // if (!company.length) {
      //   return res.status(400).json({
      //     status: "error",
      //     message: "Invalid company_id"
      //   });
      // }

      // -----------------------------
      // 4. Validate Selection Fields
      // -----------------------------
      const validCarryOver = ["year_start", "allocation", "other"];
      if (!validCarryOver.includes(carryover_date)) {
        return res.status(400).json({
          status: "error",
          message: "Invalid carryover_date"
        });
      }

      const validAccruedGain = ["start", "end"];
      if (!validAccruedGain.includes(accrued_gain_time)) {
        return res.status(400).json({
          status: "error",
          message: "Invalid accrued_gain_time"
        });
      }

      // -----------------------------
      // 5. Boolean Field
      // -----------------------------
      const basedOnWorkedTime = !!is_based_on_worked_time;

      // -----------------------------
      // 6. Construct Payload
      // -----------------------------
      const vals = {
        client_id,
        name,
        carryover_date,
        is_based_on_worked_time: basedOnWorkedTime,
        accrued_gain_time,
        // company_id
      };

      console.log("Payload sending to Odoo:", vals);

      // -----------------------------
      // 7. Create Accrual Plan
      // -----------------------------
      const planId = await odooService.create("hr.leave.accrual.plan", vals);

      // Fetch created record
      const createdPlan = await odooService.searchRead(
        "hr.leave.accrual.plan",
        [["id", "=", planId]],
        ["id", "name", "client_id", "carryover_date", "is_based_on_worked_time", "accrued_gain_time", "company_id"]
      );

      return res.status(201).json({
        status: "success",
        message: "Accrual plan created successfully",
        data: createdPlan[0] || null
      });

    } catch (error) {
      console.error("❌ Create Accrual Plan Error:", error);
      return res.status(500).json({
        status: "error",
        message: error.message || "Failed to create accrual plan"
      });
    }
  }

  async getAccrualPlan(req, res) {
    try {
      console.log("API called for fetching Accrual Plans");

      // -----------------------------
      // 1. Get client_id from auth
      // -----------------------------
      const { client_id } = await getClientFromRequest(req);

      // -----------------------------
      // 2. Optional query filters
      // -----------------------------
      const { id, company_id, carryover_date, accrued_gain_time } = req.query;
      console.log(req.query);

      const domain = [["client_id", "=", client_id]];

      if (id) {
        domain.push(["id", "=", parseInt(id)]);
      }

      if (company_id) {
        domain.push(["company_id", "=", parseInt(company_id)]);
      }

      if (carryover_date) {
        domain.push(["carryover_date", "=", carryover_date]);
      }

      if (accrued_gain_time) {
        domain.push(["accrued_gain_time", "=", accrued_gain_time]);
      }

      // -----------------------------
      // 3. Fields to fetch
      // -----------------------------
      const fields = [
        "id",
        "name",
        "client_id",
        "carryover_date",
        "is_based_on_worked_time",
        "accrued_gain_time",
        "company_id"
      ];

      // -----------------------------
      // 4. Fetch from Odoo
      // -----------------------------
      const plans = await odooService.searchRead(
        "hr.leave.accrual.plan",
        domain,
        fields
      );

      // -----------------------------
      // 5. Return response
      // -----------------------------
      return res.status(200).json({
        status: "success",
        count: plans.length,
        data: plans
      });

    } catch (error) {
      console.error("❌ Get Accrual Plan Error:", error);
      return res.status(500).json({
        status: "error",
        message: error.message || "Failed to fetch accrual plans"
      });
    }
  }

  async updateAccrualPlan(req, res) {
    try {
      console.log("API called for updateAccrualPlan");
      // console.log(req.body);

      const { id } = req.params;
      const {
        name,
        carryover_date,
        is_based_on_worked_time,
        accrued_gain_time,
        // company_id
      } = req.body;
      console.log(req.body);

      /* -----------------------------
       * 1. Get client_id
       * ----------------------------- */
      const { client_id } = await getClientFromRequest(req);

      /* -----------------------------
       * 2. Check Existence
       * ----------------------------- */
      const existing = await odooService.searchRead(
        "hr.leave.accrual.plan",
        [
          ["id", "=", parseInt(id)],
          ["client_id", "=", client_id]
        ],
        ["id"],
        1
      );

      if (!existing.length) {
        return res.status(404).json({
          status: "error",
          message: "Accrual plan not found"
        });
      }

      /* -----------------------------
       * 3. Validate Selection Fields
       * ----------------------------- */
      const validCarryOver = ["year_start", "allocation", "other"];
      if (carryover_date && !validCarryOver.includes(carryover_date)) {
        return res.status(400).json({
          status: "error",
          message: "Invalid carryover_date"
        });
      }

      const validAccruedGain = ["start", "end"];
      if (accrued_gain_time && !validAccruedGain.includes(accrued_gain_time)) {
        return res.status(400).json({
          status: "error",
          message: "Invalid accrued_gain_time"
        });
      }

      /* -----------------------------
       * 4. Construct Payload
       * ----------------------------- */
      const vals = {};

      if (name !== undefined) vals.name = name;
      if (carryover_date !== undefined) vals.carryover_date = carryover_date;
      if (accrued_gain_time !== undefined) vals.accrued_gain_time = accrued_gain_time;
      if (is_based_on_worked_time !== undefined)
        vals.is_based_on_worked_time = !!is_based_on_worked_time;

      // if (company_id !== undefined) vals.company_id = company_id;

      console.log("Update Payload:", vals);

      /* -----------------------------
       * 5. Update Record
       * ----------------------------- */
      await odooService.write(
        "hr.leave.accrual.plan",
        parseInt(id),
        vals
      );

      /* -----------------------------
       * 6. Fetch Updated Record
       * ----------------------------- */
      const updatedPlan = await odooService.searchRead(
        "hr.leave.accrual.plan",
        [["id", "=", parseInt(id)]],
        ["id", "name", "client_id", "carryover_date", "is_based_on_worked_time", "accrued_gain_time", "company_id"]
      );

      return res.status(200).json({
        status: "success",
        message: "Accrual plan updated successfully",
        data: updatedPlan[0] || null
      });

    } catch (error) {
      console.error("❌ Update Accrual Plan Error:", error);
      return res.status(500).json({
        status: "error",
        message: error.message || "Failed to update accrual plan"
      });
    }
  }

  async deleteAccrualPlan(req, res) {
    try {
      console.log("API called for deleteAccrualPlan");

      const { id } = req.params;
      const { client_id } = await getClientFromRequest(req);

      /* -----------------------------
       * 1. Check Existence
       * ----------------------------- */
      const existing = await odooService.searchRead(
        "hr.leave.accrual.plan",
        [
          ["id", "=", parseInt(id)],
          ["client_id", "=", client_id]
        ],
        ["id"],
        1
      );

      if (!existing.length) {
        return res.status(404).json({
          status: "error",
          message: "Accrual plan not found"
        });
      }

      /* -----------------------------
       * 2. Hard Delete
       * ----------------------------- */
      await odooService.unlink(
        "hr.leave.accrual.plan",
        parseInt(id)
      );

      return res.status(200).json({
        status: "success",
        message: "Accrual plan deleted successfully"
      });

    } catch (error) {
      console.error("❌ Delete Accrual Plan Error:", error);
      return res.status(500).json({
        status: "error",
        message: error.message || "Failed to delete accrual plan"
      });
    }
  }


  async createMandatoryDays(req, res) {
    try {
      console.log("API called for Mandatory Day creation");
      const { name, start_date, end_date, color } = req.body;
      console.log(req.body);

      // -----------------------------
      // 1. Get client_id from auth
      // -----------------------------
      let client_id;
      try {
        const clientData = await getClientFromRequest(req);
        client_id = clientData.client_id;

        if (!client_id) {
          return res.status(400).json({
            status: "error",
            message: "Either user_id or unique_user_id is required"
          });
        }
      } catch (authError) {
        return res.status(400).json({
          status: "error",
          message: authError.message || "Either user_id or unique_user_id is required"
        });
      }

      // -----------------------------
      // 2. Assign company_id from backend
      // -----------------------------
      const company_id = 12;

      // -----------------------------
      // 3. Mandatory Validation
      // -----------------------------
      const missingFields = [];
      if (!name) missingFields.push("name");
      if (!start_date) missingFields.push("start_date");
      if (!end_date) missingFields.push("end_date");

      if (missingFields.length) {
        return res.status(400).json({
          status: "error",
          message: `Missing required fields: ${missingFields.join(", ")}`
        });
      }

      // -----------------------------
      // 4. Check for Duplicate (client_id + name)
      // -----------------------------
      const existingDay = await odooService.searchRead(
        "hr.leave.mandatory.day",
        [
          ["client_id", "=", client_id],
          ["name", "=", name]
        ],
        ["id", "name"],
        1
      );

      if (existingDay.length) {
        return res.status(409).json({
          status: "error",
          message: "Mandatory day with this name already exists for this client"
        });
      }

      // -----------------------------
      // 5. Validate Company (Many2one)
      // -----------------------------
      const company = await odooService.searchRead(
        "res.company",
        [["id", "=", company_id]],
        ["id", "name"],
        1
      );

      if (!company.length) {
        return res.status(400).json({
          status: "error",
          message: "Invalid company_id"
        });
      }

      // -----------------------------
      // 6. Validate Client (Many2one)
      // -----------------------------
      const client = await odooService.searchRead(
        "res.partner",
        [["id", "=", client_id]],
        ["id", "name"],
        1
      );

      if (!client.length) {
        return res.status(400).json({
          status: "error",
          message: "Invalid client_id"
        });
      }

      // -----------------------------
      // 7. Construct Payload
      // -----------------------------
      const vals = {
        client_id,
        name,
        start_date,
        end_date,
        company_id,
        color: color || false
      };

      console.log("Payload sending to Odoo:", vals);

      // -----------------------------
      // 8. Create Mandatory Day
      // -----------------------------
      const mandatoryDayId = await odooService.create(
        "hr.leave.mandatory.day",
        vals
      );

      // -----------------------------
      // 9. Fetch Created Record
      // -----------------------------
      const createdDay = await odooService.searchRead(
        "hr.leave.mandatory.day",
        [["id", "=", mandatoryDayId]],
        ["id", "name", "start_date", "end_date", "color"]
      );

      return res.status(201).json({
        status: "success",
        message: "Mandatory day created successfully",
        data: createdDay[0]
      });

    } catch (error) {
      console.error("❌ Create Mandatory Day Error:", error);
      return res.status(500).json({
        status: "error",
        message: error.message || "Failed to create mandatory day"
      });
    }
  }
  async getMandatoryDays(req, res) {
    try {
      console.log("API called for Get Mandatory Days");
      // console.log(req.body);

      // -----------------------------
      // 1. Get client_id from auth
      // -----------------------------
      const { client_id } = await getClientFromRequest(req);

      // -----------------------------
      // 2. Optional Filters
      // -----------------------------
      const { company_id } = req.query;
      console.log(req.query);

      const domain = [
        ["client_id", "=", client_id]
      ];

      if (company_id) {
        domain.push(["company_id", "=", parseInt(company_id)]);
      }

      // -----------------------------
      // 3. Fetch Mandatory Days
      // -----------------------------
      const mandatoryDays = await odooService.searchRead(
        "hr.leave.mandatory.day",
        domain,
        [
          "id",
          "name",
          "start_date",
          "end_date",
          "color",
          "client_id",
          "company_id"
        ]
      );

      // -----------------------------
      // 4. Response
      // -----------------------------
      return res.status(200).json({
        status: "success",
        count: mandatoryDays.length,
        data: mandatoryDays.map(day => ({
          id: day.id,
          name: day.name,
          start_date: day.start_date,
          end_date: day.end_date,
          color: day.color || false,
          client_id: day.client_id || false,
          company_id: day.company_id || false
        }))
      });

    } catch (error) {
      console.error("❌ Get Mandatory Days Error:", error);
      return res.status(500).json({
        status: "error",
        message: error.message || "Failed to fetch mandatory days"
      });
    }
  }
  async updateMandatoryDays(req, res) {
    try {
      console.log("API called for updateMandatoryDays");
      const { id } = req.params;
      const { name, start_date, end_date, color } = req.body;
      console.log(req.body);
      let client_id;
      try {
        const clientData = await getClientFromRequest(req);
        client_id = clientData.client_id;

        if (!client_id) {
          return res.status(400).json({
            status: "error",
            message: "Either user_id or unique_user_id is required"
          });
        }
      } catch (authError) {
        return res.status(400).json({
          status: "error",
          message: authError.message || "Either user_id or unique_user_id is required"
        });
      }

      /* -----------------------------
       * 2. Check Existence (Client Isolation)
       * ----------------------------- */
      const existing = await odooService.searchRead(
        "hr.leave.mandatory.day",
        [
          ["id", "=", parseInt(id)],
          ["client_id", "=", client_id]
        ],
        ["id"],
        1
      );

      if (!existing.length) {
        return res.status(404).json({
          status: "error",
          message: "Mandatory day not found"
        });
      }

      /* -----------------------------
       * 3. Check for Duplicate Name (if name is being updated)
       * ----------------------------- */
      if (name !== undefined) {
        const duplicateCheck = await odooService.searchRead(
          "hr.leave.mandatory.day",
          [
            ["id", "!=", parseInt(id)],
            ["client_id", "=", client_id],
            ["name", "=", name]
          ],
          ["id"],
          1
        );

        if (duplicateCheck.length) {
          return res.status(409).json({
            status: "error",
            message: "Mandatory day with this name already exists for this client"
          });
        }
      }

      /* -----------------------------
       * 4. Construct Payload
       * ----------------------------- */
      const vals = {};
      if (name !== undefined) vals.name = name;
      if (start_date !== undefined) vals.start_date = start_date;
      if (end_date !== undefined) vals.end_date = end_date;
      if (color !== undefined) vals.color = color || false;

      console.log("Update Payload:", vals);

      /* -----------------------------
       * 5. Update Record
       * ----------------------------- */
      await odooService.write(
        "hr.leave.mandatory.day",
        parseInt(id),
        vals
      );

      /* -----------------------------
       * 6. Fetch Updated Record
       * ----------------------------- */
      const updatedDay = await odooService.searchRead(
        "hr.leave.mandatory.day",
        [["id", "=", parseInt(id)]],
        ["id", "name", "start_date", "end_date", "color"]
      );

      return res.status(200).json({
        status: "success",
        message: "Mandatory day updated successfully",
        data: updatedDay[0] || null
      });

    } catch (error) {
      console.error("❌ Update Mandatory Day Error:", error);
      return res.status(500).json({
        status: "error",
        message: error.message || "Failed to update mandatory day"
      });
    }
  }
  async deleteMandatoryDays(req, res) {
    try {
      console.log("API called for deleteMandatoryDays");

      const { id } = req.params;
      const { client_id } = await getClientFromRequest(req);

      /* -----------------------------
       * 1. Check Existence
       * ----------------------------- */
      const existing = await odooService.searchRead(
        "hr.leave.mandatory.day",
        [
          ["id", "=", parseInt(id)],
          ["client_id", "=", client_id]
        ],
        ["id"],
        1
      );

      if (!existing.length) {
        return res.status(404).json({
          status: "error",
          message: "Mandatory day not found"
        });
      }

      /* -----------------------------
       * 2. Hard Delete
       * ----------------------------- */
      await odooService.unlink(
        "hr.leave.mandatory.day",
        parseInt(id)
      );

      return res.status(200).json({
        status: "success",
        message: "Mandatory day deleted successfully"
      });

    } catch (error) {
      console.error("❌ Delete Mandatory Day Error:", error);
      return res.status(500).json({
        status: "error",
        message: error.message || "Failed to delete mandatory day"
      });
    }
  }

  async adminLeaveWorkflowAction(req, res) {
    try {
      console.log("API called for Admin Leave Workflow Action");

      const { holiday_status_id, action } = req.body;

      if (!holiday_status_id || !action) {
        return res.status(400).json({
          success: false,
          message: "holiday_status_id and action are required"
        });
      }

      /* =====================
      ACTION → ODOO METHOD
      ===================== */
      const ACTION_METHOD_MAP = {
        // confirm: "action_confirm", // Submit / Ready to approve
        approve: "action_approve", // Approve
        refuse: "action_refuse", // Refuse
        reset: "action_reset_confirm" // Reset to draft
      };

      const methodName = ACTION_METHOD_MAP[action];

      if (!methodName) {
        return res.status(400).json({
          success: false,
          message: "Invalid action. Allowed: confirm, approve, refuse, reset"
        });
      }

      /* =====================
      CALL ODOO WORKFLOW
      ===================== */
      await odooService.callMethod(
        "hr.leave",
        methodName,
        [[Number(holiday_status_id)]]
      );

      /* =====================
      FETCH UPDATED STATE
      ===================== */
      const updatedLeave = await odooService.searchRead(
        "hr.leave",
        [["id", "=", Number(holiday_status_id)]],
        ["state"],
        1
      );

      return res.status(200).json({
        success: true,
        message: `Leave request ${action} successfully`,
        holiday_status_id,
        state: updatedLeave?.[0]?.state
      });

    } catch (error) {
      console.error("❌ Admin Leave Workflow Error:", error);
      return res.status(500).json({
        success: false,
        message: error.message || "Failed to update leave request"
      });
    }
  };


  async updateAllocationStatus(req, res) {
    try {
      console.log("------------------------------------------------");
      console.log("API Called: updateAllocationStatus");
      console.log("Request Body:", JSON.stringify(req.body, null, 2));

      // 1. Extract inputs
      const { allocation_id, action } = req.body;

      // 2. Fetch Client Context (client_id is crucial for Odoo connection)
      console.log("Fetching client context...");
      const context = await getClientFromRequest(req);
      console.log("DEBUG: Raw context object:", JSON.stringify(context, null, 2));

      if (!context) {
        throw new Error("Client context is null or undefined");
      }

      const { user_id, client_id } = context;
      console.log(`Context Extracted - User ID: ${user_id}, Client ID: ${client_id}`);

      // 3. Validate Inputs
      if (!allocation_id) {
        return res.status(400).json({
          status: "error",
          message: "Missing required field: allocation_id"
        });
      }

      if (!["approve", "refuse", "set_to_confirm"].includes(action)) {
        return res.status(400).json({
          status: "error",
          message: "Invalid action. Allowed values: 'approve', 'refuse'"
        });
      }

      // 4. Map Action to Odoo Method
      // 'approve' -> calls 'action_approve'
      // 'refuse' -> calls 'action_refuse'
      let odooMethod = "";
      if (action === "approve") {
        odooMethod = "action_approve";
      }
      else if (action === "refuse") {
        odooMethod = "action_refuse";
      } else if (action === "set_to_confirm") {
        odooMethod = "action_set_to_confirm";
      }

      console.log(`Mapping action '${action}' to Odoo method '${odooMethod}'`);

      // 5. Execute the Action
      console.log(`Executing '${odooMethod}' for Allocation ID: ${allocation_id} with Client ID: ${client_id}...`);

      // Using execute_kw to trigger the button's method
      await odooService.execute(
        "hr.leave.allocation",
        odooMethod,
        [[parseInt(allocation_id)]], // IDs must be an array (e.g., [19180])
        {},
        user_id
      );

      console.log("Odoo Method Execution Successful.");

      // 6. Fetch Updated Record to return new Status
      console.log("Fetching updated status from Odoo...");
      const updatedRecord = await odooService.searchRead(
        "hr.leave.allocation",
        [["id", "=", parseInt(allocation_id)]],
        ["id", "state", "name"],
        1,
        user_id
      );

      const newState = updatedRecord.length > 0 ? updatedRecord[0].state : "unknown";
      console.log(`New State for Allocation ${allocation_id}: ${newState}`);

      return res.status(200).json({
        status: "success",
        message: `Allocation ${action}d successfully.`,
        data: {
          allocation_id: allocation_id,
          new_status: newState, // Should change from 'confirm' to 'validate' (Approved)
          action_performed: action
        }
      });

    } catch (error) {
      console.error("!!! ERROR in updateAllocationStatus !!!");
      console.error("Error Message:", error.message);

      return res.status(error.status || 500).json({
        status: "error",
        message: error.message || `Failed to ${req.body.action} allocation`
      });
    }
  }

async createLeaveRequest(req, res) {
    try {
      console.log("========== CREATE LEAVE REQUEST API START ==========");
      console.log("Incoming Request Body:", JSON.stringify(req.body, null, 2));
      console.log("Incoming Request Query:", JSON.stringify(req.query, null, 2));

      const { holiday_status_id, date_from, date_to, reason } = req.body;

      /* ───────── 1. GET USER ID ───────── */
      const rawUserId = req.body.user_id ?? req.query.user_id;
      const user_id = Number(rawUserId);

      if (!rawUserId || Number.isNaN(user_id) || user_id <= 0) {
        return res.status(400).json({
          status: "error",
          message: "user_id is required"
        });
      }

      /* ───────── 2. REQUIRED FIELD VALIDATION ───────── */
      if (!holiday_status_id || !date_from || !date_to) {
        return res.status(400).json({
          status: "error",
          message: "Require fields missing: holiday_status_id, date_from, date_to"
        });
      }

      const leaveTypeIdInt = parseInt(holiday_status_id);

      /* ───────── 3. FETCH USER → COMPANY ───────── */
      const userInfo = await odooService.searchRead(
        "res.users",
        [["id", "=", user_id]],
        ["company_id"],
        1
      );

      if (!userInfo.length || !userInfo[0].company_id) {
        return res.status(404).json({
          status: "error",
          message: "User company not found."
        });
      }

      /* ───────── 4. FETCH EMPLOYEE ───────── */
      const employeeInfo = await odooService.searchRead(
        "hr.employee",
        [["user_id", "=", user_id]],
        ["id", "name", "department_id", "company_id", "in_probation", "probation_end"],
        1
      );

      if (!employeeInfo.length) {
        return res.status(404).json({
          status: "error",
          message: "Employee not linked with this user."
        });
      }

      const empData = employeeInfo[0];
      const empIdInt = empData.id;

      /* ───────── 4.1. CHECK PROBATION PERIOD ───────── */
      if (empData.in_probation === true) {
        const probationEndDate = empData.probation_end;
        return res.status(400).json({
          status: "error",
          message: `You are in probation period so you can't apply for leave. Your probation ends on ${probationEndDate}.`
        });
      }

      const department_name = empData.department_id
        ? empData.department_id[1]
        : "No Department Found";

      const company_name = empData.company_id
        ? empData.company_id[1]
        : "No Company Found";

      /* ───────── 5. FETCH LEAVE TYPE ───────── */
      const leaveTypeInfo = await odooService.searchRead(
        "hr.leave.type",
        [["id", "=", leaveTypeIdInt]],
        ["name"],
        1
      );

      const leave_type_name =
        leaveTypeInfo.length ? leaveTypeInfo[0].name : "Unknown Type";

      /* ───────── 5.1. CHECK FUTURE DATE FOR SICK/MEDICAL LEAVE ───────── */
      const leaveTypeNameLower = leave_type_name.toLowerCase().replace(/\s+/g, '');
      const isSickOrMedical = 
        leaveTypeNameLower.includes('sickleave') || 
        leaveTypeNameLower.includes('medicalleave');

      if (isSickOrMedical) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const requestFromDate = new Date(date_from);
        requestFromDate.setHours(0, 0, 0, 0);

        if (requestFromDate > today) {
          return res.status(400).json({
            status: "error",
            message: `You can't apply ${leave_type_name} for future dates.`
          });
        }
      }

      /* ───────── 6. CREATE LEAVE REQUEST ───────── */
      const vals = {
        employee_id: empIdInt,
        holiday_status_id: leaveTypeIdInt,
        request_date_from: date_from,
        request_date_to: date_to,
        name: reason || false,
        create_uid: user_id
      };

      console.log("Leave Creation Payload:", vals);

      const leaveId = await odooService.create("hr.leave", vals);
      console.log(`✅ Leave created. ID: ${leaveId}`);

      /* ───────── 7. AUTO SUBMIT (UI BUTTON LOGIC) ───────── */
      try {
        console.log("Calling make_approval_request...");
        await odooService.callMethod(
          "hr.leave",
          "make_approval_request",
          [[leaveId]]
        );
        console.log("✅ Leave submit executed");
      } catch (submitError) {
        const msg = (submitError?.message || "").toLowerCase();

        // Check for allocation error
        if (msg.includes("allocation") || msg.includes("you do not have any allocation")) {
          return res.status(400).json({
            status: "error",
            message: "You don't have any allocation for this time off type"
          });
        }

        // ODOO KNOWN BEHAVIOR (TYPO SAFE)
        if (
          msg.includes("already") &&
          (msg.includes("generated") || msg.includes("genrated"))
        ) {
          console.log("ℹ️ Approval request already generated by Odoo (safe to ignore)");
        } else {
          console.error("❌ Unexpected submit error:", submitError.message);
          return res.status(500).json({
            status: "error",
            message: "Leave created but submit failed",
            details: submitError.message
          });
        }
      }

      /* ───────── 8. SUCCESS RESPONSE ───────── */
      return res.status(200).json({
        status: "success",
        message: "Leave request created and submitted successfully.",
        data: {
          request_id: leaveId,
          employee_name: empData.name,
          leave_type_name,
          company_name,
          department_name,
          validity: {
            from: date_from,
            to: date_to
          },
          reason
        }
      });

    } catch (error) {
      console.error("========== CREATE LEAVE REQUEST FAILED ==========");

      const rawError = error?.message || "";

      // Check for allocation error
      if (rawError.includes("allocation") || rawError.includes("You do not have any allocation")) {
        return res.status(400).json({
          status: "error",
          message: "You don't have any allocation for this time off type"
        });
      }

      // Check for overlap error
      if (rawError.includes("overlaps with this period")) {
        return res.status(409).json({
          status: "error",
          message: `Already requested for this date.`,
          error_type: "LEAVE_OVERLAP"
        });
      }

      return res.status(error.status || 500).json({
        status: "error",
        message: error.message || "Failed to create leave request."
      });
    }
  }
}

module.exports = new LeaveController();