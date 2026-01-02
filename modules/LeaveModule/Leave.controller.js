const { parse } = require("dotenv");
const odooService = require("../../Masters/services/odoo.service");
const { getClientFromRequest } = require("../../Masters/services/plan.helper");

class LeaveController {
    async createLeaveType(req, res) {
  try {
    console.log("API Called createLeaveType");
    console.log(req.body);

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

    const { user_id } = await getClientFromRequest(req);

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
      [["name", "=", name]],
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
      console.log("API Called getLeaveTypes");
      console.log(req.body);

      // Get client context (useful if you need to filter by company/client_id)
      const { user_id } = await getClientFromRequest(req);

      // Define only the fields required by the user
      const fields = [
        "name",                 // Leave Name
        "leave_type_code",      // Leave Type Code
        "leave_category",       // Leave Category
        "leave_validation_type" // Approved By
      ];

      // Fetch from Odoo model 'hr.leave.type'
      // Passing an empty array [] for domain to get all records
      const leaveTypes = await odooService.searchRead(
        "hr.leave.type",
        [], 
        fields
      );

      return res.status(200).json({
        status: "success",
        total: leaveTypes.length,
        data: leaveTypes
      });

    } catch (error) {
      console.error("Get Leave Types Error:", error);
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


  async createLeaveAllocation(req,res) {
    try{
        console.log ("API called for createLeaveAllocation");
        console.log(req.body);
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

        const { user_id } = await getClientFromRequest(req);

        // const leave_type = holiday_status_id || leave_type_id;

        if (!holiday_status_id || !employee_id || !allocation_type || !date_from)
        {
            return res.status(400).json({
                status:"error",
                message:"Required missing fields: holiday_status_id,employee_id,allocation_type,date_from"
            });
        }

        if (!["regular","accural"].includes(allocation_type))
        {
            return res.status(400).json({
                status:"error",
                message:"Invalid allocation type"
            });
        }
        if (allocation_type === "regular" && (!number_of_days || number_of_days <=0))
        {
            return res.status(400).json({
                status:"error",
                message:"Allocation days are required."
            });
        }

        const leaveTypeInfo = await odooService.searchRead(
          "hr.leave.type",
          [["id","=",parseInt(holiday_status_id)]],
          ["name"],
          1
        );

        const leave_type_name = leaveTypeInfo.length > 0 ? leaveTypeInfo[0].name : "Unknown Leave Type";

        const vals = {
            holiday_status_id: parseInt(holiday_status_id),
            employee_id: parseInt(employee_id),
            allocation_type: allocation_type === "accural" ? "accrual" : allocation_type,
            date_from: date_from,
            date_to: date_to || null,
            number_of_days: parseFloat(number_of_days),
            name: description || null,
            state: "confirm",
            create_uid: user_id
        };

        console.log("Leave Allocation Payload:", vals);

        const allocationId = await odooService.create("hr.leave.allocation", vals);

        return res.status(200).json({
            status: "success",
            message:"Leave allocation created successfully",
            data:{
              allocation_id: allocationId,
              leave_type_id: leave_type_name,
              validity_period:{
                from: date_from,
                to: date_to
              }
            }
        });
    }
    catch (error){
        console.error("Create Leave Allocation error:", error);
        return res.status (error.status || 500).json({
            status:"error",
            message: error.message || "Failed to create leave allocation"
        });
    }
  }

  async getLeaveAllocation(req,res) {
    try{
        console.log("API called for getLeaveAllocation");
        console.log(req.body);

        const {
            employee_id,
            leave_type_id,
            date_from,
            date_to,
            status
        } = req.query;

        const domain = [];

        if(employee_id){
            domain.push(["employee_id","=",parseInt (employee_id)]);
        }

        if(leave_type_id){
            domain.push (["holiday_status_id","=",parseInt(leave_type_id)]);
        }

        if(status){
            domain.push(["state","=",status]);
        }

        if(date_from && date_to){   
            domain.push (["date_from",">=",date_from]);
            domain.push (["date_to","<=",date_to]);
        }

        const fields=[
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

        const records = await odooService.searchRead("hr.leave.allocation",domain,fields);

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
    }
    catch (error)
    {
        console.error("Get Leave Allocation error:",error);
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
    if (allocation_type && !["regular", "accural"].includes(allocation_type)) {
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
        allocation_type === "accural" ? "accrual" : allocation_type;

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

  async createLeaveRequest(req,res) {
    try{
      console.log("API called for Leave Request");
      console.log(req.body);

      const {
        employee_id,
        holiday_status_id,
        date_from,
        date_to,
        reason,
      } = req.body;

      const { user_id } = await getClientFromRequest(req);

      if (!employee_id || !holiday_status_id || !date_from || !date_to)
      {
        console.error("Validation error:Missing mandatory fields");
        return res.status(400).json({
          status: "error",
          message: "Require fields missing: employee_id, holiday_status_id,date_from,date_to"
        });
      }

      const empIdInt = parseInt(employee_id);
      const leaveTypeIdInt = parseInt(holiday_status_id);

      const employeeInfo = await odooService.searchRead(
        "hr.employee",
        [["id","=",empIdInt]],
        ["name","department_id","company_id"],
        1
      );

      if(!employeeInfo.length)
      {
        console.error(`Database error: Employee ID ${empIdInt} not found in Odoo.`);
        return res.status(404).json({
          status: "error",
          message: "Employee not found."
        });
      }
      
      const empData = employeeInfo[0];
      const department_name = empData.department_id ? empData.department_id[1] : "No Department Found.";
      const company_name = empData.company_id ? empData.company_id[1] : "No Company Found.";

      const leaveTypeInfo = await odooService.searchRead(
        "hr.leave.type",
        [["id","=",leaveTypeIdInt]],
        ["name"],
        1
      );

      const leave_type_name = leaveTypeInfo.length > 0 ? leaveTypeInfo[0].name : "Unknow Type.";

      console.log(`Resolved context: Employee:${empData.name} | Dept:${department_name} | Company:${company_name} | Leave Type:${leave_type_name}`);

      const vals = {
        employee_id:empIdInt,
        holiday_status_id: leaveTypeIdInt,
        date_from: date_from,
        date_to: date_to,
        name: reason || null,
        create_uid: user_id
      };

      console.log("Payload:",vals);
      const requestId = await odooService.create("hr.leave",vals);
      console.log(`Success: Leave Request ID:${requestId} create in Odoo.`);

      return res.status(200).json({
        status: "sucess",
        message: "Leave request created successfully.",
        data:{
          request_id: requestId,
          empaloyee_name: empData.name,
          leave_type_name: leave_type_name,
          company_name: company_name,
          department_name: department_name,
          validity:{
            from: date_from,
            to: date_to
          },
          reason: reason
        }
      });
    }
    catch (error)
    {
      console.error("Fatal error in create leave request:",error);
      return res.status(error.status || 500 ).json({
        status: "error",
        message: error.message || "Failed to create leave request."
      });
    }
  }

  async getLeaveRequest(req,res) {
    try{
      console.log("API called for getLeaveRequest");
      console.log(req.body);

      const {
        employee_id,
        leave_type_id,
        status,
        date_from,
        date_to
      } = req.query;

      console.log("Query parameters received:", req.query);

      const domain = [];

      if (employee_id){
        domain.push(["employee_id","=",parseInt(employee_id)]);
      }

      if (leave_type_id){
        domain.push(["holiday_status_id","=",parseInt(leave_type_id)]);
      }

      if(status){
        domain.push(["state","=",status]);
      }
      if(date_from && date_to){
        domain.push(["request_date_from",">=", date_from]);
        domain.push(["request_date_to",">=", date_to]);
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

      const records = await odooService.searchRead("hr.leave",domain,fields);

      const data = records.map(rec => ({
        id: rec.id,
        employee_name:rec.employee_id?.[1] || "Unknown Employee",
        leave_type_name:rec.holiday_status_id?.[1] || "Unknown Type",
        department_name: rec.department_id?.[1] || "No Department Found",
        company_name: rec.company_id?.[1] || "No Company Found",
        validity: {
          from:rec.date_from,
          to:rec.date_to
        },
        duration_days: rec.number_of_days,
        reason: rec.name || null,
        status: rec.state,
        requested_on: rec.create_date
      }));

      console.log(`Success:Fetched ${data.length} leave requests from Odoo.`);

      return res.status(200).json({
        status:"success",
        total: data.length,
        data:data
      });
    }
    catch (error){
      console.error("Fatal error in get leave request:",error);
      return res.status(error.status || 500).json({
        status:"error",
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

async getAdminLeave(req, res) {
try {
const {
user_id,
date_from,
date_to,
leave_type_id,
leave_state,
limit = 20,
offset = 0
} = req.query;

if (!user_id) {
return res.status(400).json({
success: false,
message: "user_id is required"
});
}

/* =====================
RESOLVE ADMIN CLIENT
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

/* =====================
DASHBOARD METRICS
===================== */
const [
totalEmployees,
presentEmployees,

// ✅ FIXED: now passing employee_id
pendingRequests,

plannedLeaves,

unplannedLeaves
] = await Promise.all([
odooService.callCustomMethod(
"simple.action",
"get_total_number_of_employee",
[[], client_id]
),
odooService.callCustomMethod(
"simple.action",
"get_total_present_employee",
[client_id]
),

// ✅ FIX HERE
odooService.callCustomMethod(
"simple.action",
"list_of_all_employee_pending_approval_list",
[client_id, false]
),

odooService.searchCount("hr.leave", [
["employee_id.address_id", "=", client_id],
["state", "in", ["validate", "validate1"]]
]),

odooService.callCustomMethod(
"simple.action",
"get_total_no_of_uninformed_employee",
[client_id]
)
]);

/* =====================
LEAVE TABLE
===================== */
const leaveDomain = [
["employee_id.address_id", "=", client_id]
];

if (leave_state)
leaveDomain.push(["state", "=", leave_state]);

if (leave_type_id)
leaveDomain.push(["holiday_status_id", "=", Number(leave_type_id)]);

if (date_from)
leaveDomain.push(["request_date_to", ">=", date_from]);

if (date_to)
leaveDomain.push(["request_date_from", "<=", date_to]);

const leaves = await odooService.searchRead(
"hr.leave",
leaveDomain,
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
"request_date_from desc"
);

const leaveList = leaves.map(l => ({
employee_id: l.employee_id?.[0],
employee_name: l.employee_id?.[1],
leave_type_id: l.holiday_status_id?.[0],
leave_type: l.holiday_status_id?.[1],
from: l.request_date_from,
to: l.request_date_to,
no_of_days: l.number_of_days,
status: l.state
}));

/* =====================
RESPONSE
===================== */
return res.status(200).json({
success: true,
dashboard: {
total_present: `${presentEmployees}/${totalEmployees}`,
planned_leaves: plannedLeaves,
unplanned_leaves: unplannedLeaves,
pending_requests: pendingRequests
},
leaveList,
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
    console.log(req.body);

    const { name, date_from, date_to, work_entry_type_id, calendar_id } = req.body;

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
    console.log(req.body);

    // -----------------------------
    // 1. Get client_id from request
    // -----------------------------
    const { client_id } = await getClientFromRequest(req);

    // -----------------------------
    // 2. Optional filters from query
    // -----------------------------
    const { id, date_from, date_to } = req.query;

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
    console.log(req.body);

    const { id } = req.params;
    const { name, date_from, date_to, work_entry_type_id, calendar_id } = req.body;

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
    console.log(req.body);

    const {
      name,
      carryover_date,
      is_based_on_worked_time,
      accrued_gain_time,
      // company_id
    } = req.body;

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
    console.log(req.body);

    // -----------------------------
    // 1. Get client_id from auth
    // -----------------------------
    const { client_id } = await getClientFromRequest(req);

    // -----------------------------
    // 2. Optional query filters
    // -----------------------------
    const { id, company_id, carryover_date, accrued_gain_time } = req.query;

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
    console.log(req.body);

    const { id } = req.params;
    const {
      name,
      carryover_date,
      is_based_on_worked_time,
      accrued_gain_time,
      // company_id
    } = req.body;

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
    console.log(req.body);

    const { name, start_date, end_date, color, company_id } = req.body;

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
      data: createdDay[0] || null
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
    console.log(req.body);

    // -----------------------------
    // 1. Get client_id from auth
    // -----------------------------
    const { client_id } = await getClientFromRequest(req);

    // -----------------------------
    // 2. Optional Filters
    // -----------------------------
    const { company_id } = req.query;

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
    console.log(req.body);

    const { id } = req.params;
    const { name, start_date, end_date, color, company_id } = req.body;

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

}

module.exports = new LeaveController();