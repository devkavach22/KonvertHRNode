const { parse } = require("dotenv");
const odooService = require("../../Masters/services/odoo.service");
const { getClientFromRequest } = require("../../Masters/services/plan.helper");

class LeaveController {
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

      const { user_id, client_id } = await getClientFromRequest(req);

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

      /* ---------------- DUPLICATE CHECK ---------------- */
      const existing = await odooService.searchRead(
        "hr.leave.type",
        [["name", "=", name], ["client_id", "=", client_id]],
        ["id"],
        1
      );

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
      const leaveTypeId = await odooService.create("hr.leave.type", vals);

      return res.status(200).json({
        status: "success",
        message: "Leave type created successfully",
        leave_type_id: leaveTypeId
      });

    } catch (error) {
      console.error("Create Leave Type Error:", error);

      return res.status(error.status || 500).json({
        status: "error",
        message: error.message || "Failed to create leave type"
      });
    }
  }
  async getLeaveTypes(req, res) {
    try {
      console.log("------------------------------------------------");
      console.log("API Called: getLeaveTypes");
      console.log("Request Body:", JSON.stringify(req.body, null, 2));

      // Get client context
      console.log("Attempting to get client context from request...");
      const { user_id, client_id } = await getClientFromRequest(req);
      console.log(`Context Retrieved - User ID: ${user_id}, Client ID: ${client_id}`);

      // Define fields
      const fields = [
        "name",                 // Leave Name
        "leave_type_code",      // Leave Type Code
        "leave_category",       // Leave Category
        "leave_validation_type" // Approved By
      ];
      console.log("Fields defined for search:", fields);

      // Fetch from Odoo model 'hr.leave.type'
      console.log(`Calling odooService.searchRead for model 'hr.leave.type' with Client ID: ${client_id}...`);

      const leaveTypes = await odooService.searchRead(
        "hr.leave.type",
        [],
        fields,
        user_id,
        client_id
      );

      console.log("Odoo Service call successful.");
      console.log(`Total Leave Types Found: ${leaveTypes ? leaveTypes.length : 0}`);
      console.log("Leave Types Data:", JSON.stringify(leaveTypes, null, 2));

      console.log("Sending success response to client...");
      return res.status(200).json({
        status: "success",
        total: leaveTypes.length,
        data: leaveTypes
      });

    } catch (error) {
      console.error("!!! ERROR in getLeaveTypes !!!");
      console.error("Error Message:", error.message);
      console.error("Error Stack:", error.stack);

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
  async createLeaveAllocation(req, res) {
    try {
      console.log("------------------------------------------------");
      console.log("API Called: createLeaveAllocation");
      console.log("Request Body:", JSON.stringify(req.body, null, 2));

      const {
        holiday_status_id,
        // leave_type_id,
        employee_id,
        allocation_type,
        date_from,
        date_to,
        number_of_days,
        description
      } = req.body;

      // 1. Fetch Context & Debug Logs
      console.log("Fetching client context from request...");
      const context = await getClientFromRequest(req);

      // LOG THE RAW CONTEXT to check for undefined user_id issues
      console.log("DEBUG: Raw context object:", JSON.stringify(context, null, 2));

      if (!context) {
        throw new Error("Client context is null or undefined");
      }

      // 2. Destructure with client_id
      const { user_id, client_id } = context;
      console.log(`Context Extracted - User ID: ${user_id}, Client ID: ${client_id}`);

      // Validation Checks
      console.log("Starting Input Validation...");

      if (!holiday_status_id || !employee_id || !allocation_type || !date_from) {
        console.warn("Validation Failed: Missing required fields");
        return res.status(400).json({
          status: "error",
          message: "Required missing fields: holiday_status_id,employee_id,allocation_type,date_from"
        });
      }

      if (!["regular", "accrual"].includes(allocation_type)) {
        console.warn(`Validation Failed: Invalid allocation_type '${allocation_type}'`);
        return res.status(400).json({
          status: "error",
          message: "Invalid allocation type"
        });
      }

      if (allocation_type === "regular" && (!number_of_days || number_of_days <= 0)) {
        console.warn("Validation Failed: Invalid number_of_days for regular allocation");
        return res.status(400).json({
          status: "error",
          message: "Allocation days are required."
        });
      }

      console.log("Validation Passed.");

      // Fetch Leave Type Name
      console.log(`Fetching Leave Type Name for ID: ${holiday_status_id} with Client ID: ${client_id}...`);

      // 3. Pass client_id to searchRead
      const leaveTypeInfo = await odooService.searchRead(
        "hr.leave.type",
        [["id", "=", parseInt(holiday_status_id)]],
        ["name"],
        1,
        client_id // Passed client_id
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
        number_of_days: parseFloat(number_of_days),
        name: description || null,
        state: "confirm",
        create_uid: user_id
      };

      console.log("Constructed Odoo Payload:", JSON.stringify(vals, null, 2));
      console.log(`Attempting to create record in 'hr.leave.allocation' for Client ID: ${client_id}...`);

      // 4. Create Record passing client_id
      const allocationId = await odooService.create(
        "hr.leave.allocation",
        vals,
        client_id // Passed client_id
      );

      console.log(`Odoo Create Success! New Allocation ID: ${allocationId}`);

      return res.status(200).json({
        status: "success",
        message: "Leave allocation created successfully",
        data: {
          allocation_id: allocationId,
          leave_type_id: leave_type_name,
          validity_period: {
            from: date_from,
            to: date_to
          }
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
      console.log("------------------------------------------------");
      console.log("API Called: getLeaveAllocation");
      console.log("Query Params:", JSON.stringify(req.query, null, 2));

      // 1. Fetch Context & Debug Logs
      console.log("Fetching client context from request...");
      const context = await getClientFromRequest(req);

      // LOG THE RAW CONTEXT
      console.log("DEBUG: Raw context object:", JSON.stringify(context, null, 2));

      if (!context) {
        throw new Error("Client context is null or undefined");
      }

      // 2. Destructure with client_id
      const { user_id, client_id } = context;
      console.log(`Context Extracted - User ID: ${user_id}, Client ID: ${client_id}`);

      // 3. Extract Filters from Query
      const {
        employee_id,
        holiday_status_id,
        state,
        limit = 10,
        offset = 0
      } = req.query;

      // 4. Construct Odoo Domain (Search Filters)
      const domain = [];

      if (employee_id) {
        domain.push(["employee_id", "=", parseInt(employee_id)]);
      }

      if (holiday_status_id) {
        domain.push(["holiday_status_id", "=", parseInt(holiday_status_id)]);
      }

      if (state) {
        domain.push(["state", "=", state]);
      }

      console.log("Constructed Odoo Domain:", JSON.stringify(domain, null, 2));

      // 5. Define Fields to Retrieve
      const fields = [
        "id",
        "name",
        "holiday_status_id",
        "employee_id",
        "allocation_type",
        "number_of_days",
        "date_from",
        "date_to",
        "state"
      ];

      console.log(`Fetching allocations from 'hr.leave.allocation' for Client ID: ${client_id}...`);

      // 6. Call Odoo Service with client_id
      const allocations = await odooService.searchRead(
        "hr.leave.allocation",
        domain,
        fields,
        parseInt(limit),
        parseInt(offset),
        null,
        client_id
      );

      // ✅ ADDED: CLEAR COUNT LOG PER CLIENT
      console.log(
        `✅ Leave Allocation Count for Client ID ${client_id}: ${allocations.length}`
      );

      console.log(`Odoo Search Success! Retrieved ${allocations.length} records.`);

      // 7. Send Response
      return res.status(200).json({
        status: "success",
        message: "Leave allocations retrieved successfully",
        data: {
          count: allocations.length,
          allocations: allocations
        }
      });

    } catch (error) {
      console.error("!!! ERROR in getLeaveAllocation !!!");
      console.error("Error Message:", error.message);
      console.error("Error Stack:", error.stack);

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

  // Old createLeaveRequest
  // async createLeaveRequest(req,res) {
  //   try{
  //     console.log("API called for Leave Request");
  //     // console.log(req.body);

  //     const {
  //       employee_id,
  //       holiday_status_id,
  //       date_from,
  //       date_to,
  //       reason,
  //     } = req.body;
  //     console.log(req.body);

  //     const { user_id } = await getClientFromRequest(req);

  //     if (!employee_id || !holiday_status_id || !date_from || !date_to)
  //     {
  //       console.error("Validation error:Missing mandatory fields");
  //       return res.status(400).json({
  //         status: "error",
  //         message: "Require fields missing: employee_id, holiday_status_id,date_from,date_to"
  //       });
  //     }

  //     const empIdInt = parseInt(employee_id);
  //     const leaveTypeIdInt = parseInt(holiday_status_id);

  //     const employeeInfo = await odooService.searchRead(
  //       "hr.employee",
  //       [["id","=",empIdInt]],
  //       ["name","department_id","company_id"],
  //       1
  //     );

  //     if(!employeeInfo.length)
  //     {
  //       console.error(`Database error: Employee ID ${empIdInt} not found in Odoo.`);
  //       return res.status(404).json({
  //         status: "error",
  //         message: "Employee not found."
  //       });
  //     }

  //     const empData = employeeInfo[0];
  //     const department_name = empData.department_id ? empData.department_id[1] : "No Department Found.";
  //     const company_name = empData.company_id ? empData.company_id[1] : "No Company Found.";

  //     const leaveTypeInfo = await odooService.searchRead(
  //       "hr.leave.type",
  //       [["id","=",leaveTypeIdInt]],
  //       ["name"],
  //       1
  //     );

  //     const leave_type_name = leaveTypeInfo.length > 0 ? leaveTypeInfo[0].name : "Unknow Type.";

  //     console.log(`Resolved context: Employee:${empData.name} | Dept:${department_name} | Company:${company_name} | Leave Type:${leave_type_name}`);

  //     const vals = {
  //       employee_id:empIdInt,
  //       holiday_status_id: leaveTypeIdInt,
  //       date_from: date_from,
  //       date_to: date_to,
  //       name: reason || null,
  //       create_uid: user_id
  //     };

  //     console.log("Payload:",vals);
  //     const requestId = await odooService.create("hr.leave",vals);
  //     console.log(`Success: Leave Request ID:${requestId} create in Odoo.`);

  //     return res.status(200).json({
  //       status: "sucess",
  //       message: "Leave request created successfully.",
  //       data:{
  //         request_id: requestId,
  //         empaloyee_name: empData.name,
  //         leave_type_name: leave_type_name,
  //         company_name: company_name,
  //         department_name: department_name,
  //         validity:{
  //           from: date_from,
  //           to: date_to
  //         },
  //         reason: reason
  //       }
  //     });
  //   }
  //   catch (error)
  //   {
  //     console.error("Fatal error in create leave request:",error);
  //     return res.status(error.status || 500 ).json({
  //       status: "error",
  //       message: error.message || "Failed to create leave request."
  //     });
  //   }
  // }

  // New createLeaveRequest
  async createLeaveRequest(req, res) {
    try {
      console.log("========== CREATE LEAVE REQUEST API START ==========");
      console.log("Incoming Request Body:", JSON.stringify(req.body, null, 2));
      console.log("Incoming Request Query:", JSON.stringify(req.query, null, 2));

      const {
        holiday_status_id,
        date_from,
        date_to,
        reason,
      } = req.body;

      /* ───────── 1. GET USER ID ───────── */
      const rawUserId = req.body.user_id ?? req.query.user_id;
      const user_id = Number(rawUserId);

      console.log("Resolved raw user_id:", rawUserId);
      console.log("Parsed numeric user_id:", user_id);

      if (
        rawUserId === undefined ||
        rawUserId === null ||
        rawUserId === "" ||
        Number.isNaN(user_id) ||
        user_id <= 0
      ) {
        console.error("❌ user_id missing in request");
        return res.status(400).json({
          status: "error",
          message: "user_id is required"
        });
      }

      /* ───────── 2. REQUIRED FIELD VALIDATION ───────── */
      if (!holiday_status_id || !date_from || !date_to) {
        console.error("❌ Validation failed - missing required fields", {
          holiday_status_id,
          date_from,
          date_to
        });
        return res.status(400).json({
          status: "error",
          message: "Require fields missing: holiday_status_id, date_from, date_to"
        });
      }

      const leaveTypeIdInt = parseInt(holiday_status_id);
      console.log("Parsed Leave Type ID:", leaveTypeIdInt);

      /* ───────── 3. FETCH USER → COMPANY ───────── */
      console.log("Fetching user company from Odoo...");
      const userInfo = await odooService.searchRead(
        "res.users",
        [["id", "=", user_id]],
        ["company_id"],
        1
      );

      console.log("User Info Response:", userInfo);

      if (!userInfo.length || !userInfo[0].company_id) {
        console.error(`❌ Company not found for user_id ${user_id}`);
        return res.status(404).json({
          status: "error",
          message: "User company not found."
        });
      }

      const companyId = userInfo[0].company_id[0];
      console.log("Resolved companyId:", companyId);

      /* ───────── 4. FETCH EMPLOYEE USING COMPANY_ID ───────── */
      console.log("Fetching employee using company_id...");
      const employeeInfo = await odooService.searchRead(
        "hr.employee",
        [["user_id", "=", user_id]],
        ["id", "name", "department_id", "company_id", "user_id"],
        1
      );

      console.log("Employee Info Response:", employeeInfo);

      if (!employeeInfo.length) {
        console.error(`❌ Employee not found for company_id ${companyId}`);
        return res.status(404).json({
          status: "error",
          message: "Employee not linked with this user."
        });
      }

      const empData = employeeInfo[0];
      const empIdInt = empData.id;

      const department_name = empData.department_id
        ? empData.department_id[1]
        : "No Department Found.";

      const company_name = empData.company_id
        ? empData.company_id[1]
        : "No Company Found.";

      console.log("Resolved Employee Details:", {
        empIdInt,
        empName: empData.name,
        department_name,
        company_name
      });

      /* ───────── 5. FETCH LEAVE TYPE ───────── */
      console.log("Fetching leave type...");
      const leaveTypeInfo = await odooService.searchRead(
        "hr.leave.type",
        [["id", "=", leaveTypeIdInt]],
        ["name"],
        1
      );

      console.log("Leave Type Response:", leaveTypeInfo);

      const leave_type_name =
        leaveTypeInfo.length > 0 ? leaveTypeInfo[0].name : "Unknown Type.";

      console.log(
        `Context Resolved → Employee:${empData.name} | Dept:${department_name} | Company:${company_name} | Leave Type:${leave_type_name}`
      );

      /* ───────── 6. CREATE LEAVE REQUEST ───────── */
      const vals = {
        employee_id: empIdInt,
        holiday_status_id: leaveTypeIdInt,
        date_from: date_from,
        date_to: date_to,
        name: reason || null,
        create_uid: user_id
      };

      console.log("Leave Creation Payload:", JSON.stringify(vals, null, 2));
      console.log("Attempting to create leave in Odoo...");

      const requestId = await odooService.create("hr.leave", vals);

      console.log(`✅ Leave Request Created Successfully. Request ID: ${requestId}`);

      /* ───────── 7. RESPONSE ───────── */
      return res.status(200).json({
        status: "success",
        message: "Leave request created successfully.",
        data: {
          request_id: requestId,
          employee_name: empData.name,
          leave_type_name: leave_type_name,
          company_name: company_name,
          department_name: department_name,
          validity: {
            from: date_from,
            to: date_to
          },
          reason: reason
        }
      });

    } catch (error) {
      console.error("========== CREATE LEAVE REQUEST FAILED ==========");

      // Get raw message from Odoo
      const rawError = error?.message || "";

      // Check if it's an overlap error
      if (rawError.includes("overlaps with this period")) {
        console.error("❌ Leave overlap detected");

        // Clean the message: Remove "XML-RPC fault: " and extract the conflict details
        const cleanConflictInfo = rawError.replace("XML-RPC fault: ", "").trim();

        return res.status(409).json({
          status: "error",
          // Combine user's requested dates with Odoo's conflict info
          message: `Your requested leave (${req.body.date_from} to ${req.body.date_to}) conflicts with an existing entry.`,
          conflict_details: cleanConflictInfo,
          error_type: "LEAVE_OVERLAP",
          requested_dates: {
            from: req.body.date_from,
            to: req.body.date_to
          }
        });
      }

      return res.status(error.status || 500).json({
        status: "error",
        message: error.message || "Failed to create leave request."
      });
    }
  }



  async getLeaveRequest(req, res) {
    try {
      console.log("API called for getLeaveRequest");
      // console.log(req.body);

      const {
        employee_id,
        leave_type_id,
        status,
        date_from,
        date_to
      } = req.query;
      console.log(req.query);

      console.log("Query parameters received:", req.query);

      const domain = [];

      if (employee_id) {
        domain.push(["employee_id", "=", parseInt(employee_id)]);
      }

      if (leave_type_id) {
        domain.push(["holiday_status_id", "=", parseInt(leave_type_id)]);
      }

      if (status) {
        domain.push(["state", "=", status]);
      }
      if (date_from && date_to) {
        domain.push(["request_date_from", ">=", date_from]);
        domain.push(["request_date_to", ">=", date_to]);
      }

      const fields = [
        "employee_id",
        "holiday_status_id",
        "department_id",
        "company_id",
        "date_from",
        "date_to",
        "number_of_days",
        "name",
        "state",
        "create_date"
      ];

      const records = await odooService.searchRead("hr.leave", domain, fields);

      const data = records.map(rec => ({
        id: rec.id,
        employee_name: rec.employee_id?.[1] || "Unknown Employee",
        leave_type_name: rec.holiday_status_id?.[1] || "Unknown Type",
        department_name: rec.department_id?.[1] || "No Department Found",
        company_name: rec.company_id?.[1] || "No Company Found",
        validity: {
          from: rec.date_from,
          to: rec.date_to
        },
        duration_days: rec.number_of_days,
        reason: rec.name || null,
        status: rec.state,
        requested_on: rec.create_date
      }));

      console.log(`Success:Fetched ${data.length} leave requests from Odoo.`);

      return res.status(200).json({
        status: "success",
        total: data.length,
        data: data
      });
    }
    catch (error) {
      console.error("Fatal error in get leave request:", error);
      return res.status(error.status || 500).json({
        status: "error",
        message: error.message || "Failed to fetch leave requests"
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
  // New Admin Leave Dashboard 
  async getAdminLeave(req, res) {
    try {
      const { user_id, limit = 20, offset = 0 } = req.query;

      if (!user_id) {
        return res.status(400).json({
          success: false,
          message: "user_id is required"
        });
      }

      /* =====================
         RESOLVE CLIENT
      ===================== */
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

      /* =====================
         DASHBOARD METRICS
      ===================== */
      const [
        presentToday,
        plannedLeavesCount,
        absentUnplannedCount,
        pendingApprovalsCount
      ] = await Promise.all([

        odooService.callCustomMethod(
          "simple.action",
          "get_total_present_employee",
          [client_id]
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

      /* =====================
         LEAVE TABLE DATA
      ===================== */

      // Planned Leaves
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

      // Pending Approvals
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

      // Absent / Unplanned (SAFE NORMALIZATION)
      let absentUnplannedRaw = await odooService.callCustomMethod(
        "simple.action",
        "get_total_no_of_uninformed_employee",
        [client_id]
      );

      // 🔑 FORCE ARRAY SHAPE
      if (!Array.isArray(absentUnplannedRaw)) {
        absentUnplannedRaw = absentUnplannedRaw ? [absentUnplannedRaw] : [];
      }

      /* =====================
         NORMALIZER
      ===================== */
      const normalizeLeave = (l) => ({
        employee_id: l.employee_id?.[0] || l.employee_id || null,
        employee_name: l.employee_id?.[1] || l.employee_name || null,
        leave_type: l.holiday_status_id?.[1] || l.leave_type || "Unplanned Absence",
        from: l.request_date_from || l.from || today,
        to: l.request_date_to || l.to || today,
        number_of_days: l.number_of_days || 1,
        status: l.state || "absent"
      });

      /* =====================
         RESPONSE
      ===================== */
      return res.status(200).json({
        success: true,
        dashboard: {
          present_today: presentToday,
          planned_leaves: plannedLeavesCount,
          absent_unplanned: absentUnplannedCount,
          pending_approvals: pendingApprovalsCount
        },
        tables: {
          planned_leaves: plannedLeavesTable.map(normalizeLeave),
          pending_approvals: pendingApprovalsTable.map(normalizeLeave),
          absent_unplanned: absentUnplannedRaw.map(normalizeLeave)
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

  // Old Admin Leave Dashboard
  // async getAdminLeave(req, res) {
  //   try {
  //     const {
  //       user_id,
  //       date_from,
  //       date_to,
  //       limit = 100,
  //       offset = 0,
  //       leave_type_id,
  //       leave_state
  //     } = req.query;
  //     console.log(req.query);

  //     if (!user_id) {
  //       return res.status(400).json({
  //         success: false,
  //         status: "error",
  //         errorMessage: "user_id is required",
  //       });
  //     }

  //     console.log("🔍 Admin Attendance Fetch - user_id:", user_id);

  //     const partner = await odooService.searchRead(
  //       "res.users",
  //       [["id", "=", parseInt(user_id)]],
  //       ["id", "partner_id"]
  //     );

  //     if (!partner.length) {
  //       return res.status(404).json({
  //         success: false,
  //         status: "error",
  //         errorMessage: `Partner not found for user_id: ${user_id}`,
  //       });
  //     }

  //     const partnerId = partner[0].partner_id?.[0];

  //     const adminEmployee = await odooService.searchRead(
  //       "hr.employee",
  //       [["address_id", "=", partnerId]],
  //       ["id", "address_id"]
  //     );

  //     if (!adminEmployee.length) {
  //       return res.status(404).json({
  //         success: false,
  //         status: "error",
  //         errorMessage: `Employee not found for partner ${partnerId}`,
  //       });
  //     }

  //     const client_id = adminEmployee[0].address_id?.[0];
  //     console.log(client_id, "✔ client_id");

  //     const totalEmployees = await odooService.callCustomMethod(
  //       "simple.action",
  //       "get_total_number_of_employee",
  //       [[], client_id]
  //     );

  //     const Presentemployee = await odooService.callCustomMethod(
  //       "simple.action",
  //       "get_total_present_employee",
  //       [client_id]
  //     );

  //     const TotalLateemployee = await odooService.callCustomMethod(
  //       "simple.action",
  //       "get_total_no_of_late_employee",
  //       [client_id]
  //     );

  //     const Ununiformendemployee = await odooService.callCustomMethod(
  //       "simple.action",
  //       "get_total_no_of_uninformed_employee",
  //       [client_id]
  //     );

  //     const pendingRequests = await odooService.searchCount("hr.leave", [
  //       ["employee_id.address_id", "=", client_id],
  //       ["state", "=", "confirm"]
  //     ]);

  //     const plannedLeaves = await odooService.searchCount("hr.leave", [
  //       ["employee_id.address_id", "=", client_id],
  //       ["state", "=", "validate"]
  //     ]);

  //     const TodayAbsetEmployee = await odooService.callCustomMethod(
  //       "simple.action",
  //       "get_employees_no_attendance_today",
  //       [client_id]
  //     );

  //     const ApprovedLeaveOfEmployee = await odooService.callCustomMethod(
  //       "simple.action",
  //       "get_total_no_of_permited_employee",
  //       [client_id]
  //     );
  //     console.log("Employee Who took Permision : ", ApprovedLeaveOfEmployee)

  //     const allEmployees = await odooService.searchRead(
  //       "hr.employee",
  //       [["address_id", "=", client_id]],
  //       ["id", "name", "job_id"]
  //     );

  //     if (!allEmployees.length) {
  //       return res.status(404).json({
  //         success: false,
  //         status: "error",
  //         errorMessage: "No employees found for this client_id",
  //       });
  //     }
  //     const employeeMap = {};
  //     allEmployees.forEach(emp => {
  //       employeeMap[emp.id] = {
  //         job_id: emp.job_id || null,
  //         job_name: emp.job_id ? emp.job_id[1] : null,
  //       };
  //     });

  //     const employeeIds = allEmployees.map(e => e.id);
  //     let domain = [["employee_id", "in", employeeIds]];
  //     if (date_from) domain.push(["check_in", ">=", date_from]);
  //     if (date_to) domain.push(["check_in", "<=", date_to]);

  //     const FIELDS = [
  //       "employee_id",
  //       "check_in",
  //       "checkin_lat",
  //       "checkin_lon",
  //       "check_out",
  //       "checkout_lat",
  //       "checkout_lon",
  //       "worked_hours",
  //       "early_out_minutes",
  //       "overtime_hours",
  //       "is_early_out",
  //       "validated_overtime_hours",
  //       "is_late_in",
  //       "late_time_display",
  //       "status_code",
  //     ];
  //     const attendances = await odooService.searchRead(
  //       "hr.attendance",
  //       domain,
  //       FIELDS,
  //       parseInt(offset),
  //       parseInt(limit),
  //       "check_in desc"
  //     );

  //     const attendanceMap = {};
  //     attendances.forEach(a => {
  //       const empId = a.employee_id?.[0];
  //       attendanceMap[empId] = a;
  //     });

  //     const finalData = allEmployees.map(emp => {
  //       const att = attendanceMap[emp.id];

  //       return {
  //         id: att?.id || null,
  //         employee_id: [emp.id, emp.name],

  //         check_in: att?.check_in || null,
  //         checkin_lat: att?.checkin_lat || null,
  //         checkin_lon: att?.checkin_lon || null,

  //         check_out: att?.check_out || null,
  //         checkout_lat: att?.checkout_lat || null,
  //         checkout_lon: att?.checkout_lon || null,

  //         worked_hours: att?.worked_hours || null,
  //         early_out_minutes: att?.early_out_minutes || null,
  //         overtime_hours: att?.overtime_hours || null,
  //         validated_overtime_hours: att?.validated_overtime_hours || null,

  //         is_late_in: att?.is_late_in || null,
  //         late_time_display: att?.late_time_display || null,
  //         is_early_out: att?.is_early_out || null,
  //         status_code: att?.status_code || null,

  //         job_id: emp.job_id || null,
  //         job_name: emp.job_id ? emp.job_id[1] : null,
  //       };
  //     });
  //     let leaveDomain = [["employee_id.address_id", "=", client_id]];

  //     if (leave_state)
  //       leaveDomain.push(["state", "=", leave_state]);

  //     if (leave_type_id)
  //       leaveDomain.push(["holiday_status_id", "=", parseInt(leave_type_id)]);

  //     if (date_from)
  //       leaveDomain.push(["request_date_from", ">=", date_from]);

  //     if (date_to)
  //       leaveDomain.push(["request_date_to", "<=", date_to]);

  //     const leaveTableRaw = await odooService.searchRead(
  //       "hr.leave",
  //       leaveDomain,
  //       [
  //         "employee_id",
  //         "holiday_status_id",
  //         "request_date_from",
  //         "request_date_to",
  //         "number_of_days",
  //         "state",
  //       ],
  //       parseInt(offset),
  //       parseInt(limit),
  //       "request_date_from desc"
  //     );

  //     const leaveTable = leaveTableRaw.map(l => ({
  //       employee_id: l.employee_id?.[0],
  //       employee_name: l.employee_id?.[1],
  //       leave_type_id: l.holiday_status_id?.[0],
  //       leave_type: l.holiday_status_id?.[1],
  //       from: l.request_date_from,
  //       to: l.request_date_to,
  //       no_of_days: l.number_of_days,
  //       status: l.state,
  //     }));
  //     return res.status(200).json({
  //       success: true,
  //       status: "success",
  //       successMessage: "Admin attendance records fetched",
  //       data: finalData,
  //       leaveTable,
  //       meta: {
  //         total: finalData.length,
  //         leave_total: leaveTable.length,
  //         limit: parseInt(limit),
  //         offset: parseInt(offset),
  //         admin_partner_id: partnerId,
  //         admin_address_id: client_id,
  //         TotalEmployee: totalEmployees,
  //         Presentemployee: Presentemployee,
  //         TotalLateemployee: TotalLateemployee,
  //         Ununiformendemployee: Ununiformendemployee,
  //         TodayAbsetEmployee: TodayAbsetEmployee,
  //         ApprovedLeaveOfEmployee: ApprovedLeaveOfEmployee,
  //         pendingRequests: pendingRequests,
  //         plannedLeaves: plannedLeaves
  //       },
  //     });

  //   } catch (error) {
  //     console.error("🔥 Admin Attendance Error:", error);
  //     return res.status(500).json({
  //       success: false,
  //       status: "error",
  //       errorMessage: error.message || "Failed to fetch admin attendance",
  //     });
  //   }
  // }

  async createPublicHoliday(req, res) {
    try {
      console.log("API called for Public Holiday creation");
      // console.log(req.body);

      const { name, date_from, date_to, work_entry_type_id, calendar_id } = req.body;
      console.log(req.body);

      // -----------------------------
      // 1. Mandatory Validation
      // -----------------------------
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

      // -----------------------------
      // 2. Get Client ID
      // -----------------------------
      const { client_id } = await getClientFromRequest(req);

      // -----------------------------
      // 3. Validate Work Entry Type (Global)
      // -----------------------------
      let valid_work_entry_type_id = false;
      if (work_entry_type_id) {
        const workEntryType = await odooService.searchRead(
          "hr.work.entry.type",
          [["id", "=", work_entry_type_id]],
          ["id", "name"],
          1
        );
        if (!workEntryType.length) {
          return res.status(400).json({ status: "error", message: "Invalid work_entry_type_id" });
        }
        valid_work_entry_type_id = work_entry_type_id;
      }

      // -----------------------------
      // 4. Validate Calendar (Client Specific)
      // -----------------------------
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

      // -----------------------------
      // 5. Payload
      // -----------------------------
      const vals = {
        name,
        date_from,
        date_to,
        client_id,
        work_entry_type_id: valid_work_entry_type_id || false,
        calendar_id: valid_calendar_id || false,
      };

      console.log("Payload sending to Odoo:", vals);

      // -----------------------------
      // 6. Create Holiday
      // -----------------------------
      const holidayId = await odooService.create("resource.calendar.leaves", vals);

      // -----------------------------
      // 7. Fetch Created Holiday for proper response
      // -----------------------------
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
      // console.log(req.body);

      const { id } = req.params;
      const { name, date_from, date_to, work_entry_type_id, calendar_id } = req.body;
      console.log(req.body);

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
       * 2. Validate Relations
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
       * 3. Payload
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
       * 4. Update
       * ----------------------------- */
      await odooService.write(
        "resource.calendar.leaves",
        parseInt(id),
        vals
      );

      /* -----------------------------
       * 5. Fetch Updated Record
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
      // console.log(req.body);

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
      // console.log(req.body);

      const { name, start_date, end_date, color, company_id } = req.body;
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
      if (!start_date) missingFields.push("start_date");
      if (!end_date) missingFields.push("end_date");
      if (!company_id) missingFields.push("company_id");

      if (missingFields.length) {
        return res.status(400).json({
          status: "error",
          message: `Missing required fields: ${missingFields.join(", ")}`
        });
      }

      // -----------------------------
      // 3. Validate Company (Many2one)
      // -----------------------------
      const company = await odooService.searchRead(
        "res.company",
        [["id", "=", Number(company_id)]],
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
      // 4. Validate Client (Many2one)
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
      // 5. Construct Payload
      // -----------------------------
      const vals = {
        client_id,
        name,
        start_date,
        end_date,
        company_id,
        color: color || false // optional
      };

      console.log("Payload sending to Odoo:", vals);

      // -----------------------------
      // 6. Create Mandatory Day
      // -----------------------------
      const mandatoryDayId = await odooService.create(
        "hr.leave.mandatory.day",
        vals
      );

      // -----------------------------
      // 7. Fetch Created Record
      // -----------------------------
      const createdDay = await odooService.searchRead(
        "hr.leave.mandatory.day",
        [["id", "=", mandatoryDayId]],
        ["id", "name", "client_id", "start_date", "end_date", "color", "company_id"]
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
      // console.log(req.body);

      const { id } = req.params;
      const { name, start_date, end_date, color, company_id } = req.body;
      console.log(req.body);

      /* -----------------------------
       * 1. Get client_id
       * ----------------------------- */
      const { client_id } = await getClientFromRequest(req);

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
       * 3. Validate Company (if provided)
       * ----------------------------- */
      if (company_id !== undefined) {
        const company = await odooService.searchRead(
          "res.company",
          [["id", "=", company_id]],
          ["id"],
          1
        );

        if (!company.length) {
          return res.status(400).json({
            status: "error",
            message: "Invalid company_id"
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
      if (company_id !== undefined) vals.company_id = company_id;
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
        ["id", "name", "client_id", "start_date", "end_date", "color", "company_id"]
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


}

module.exports = new LeaveController();