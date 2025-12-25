const odooService = require("../services/odoo.service");
exports.registerEmployeeDevice = async (req, res) => {
  console.log("Mobile API Called")
  try {
      const {
      random_code_for_reg,
      device_platform,
      device_unique_id,
      device_id,
      device_name,
      ip_address,
      system_version,
    } = req.body;
    
    if (!random_code_for_reg) {
      return res.status(200).json({ 
        success: false,
        status: "error",  
        errorMessage: "random_code_for_reg is required",
        successMessage: "",
        statuscode: 400,
      });
    }
    
    console.log("🔍 Searching employee with code:", random_code_for_reg);
    
    const employee = await odooService.searchRead(
      "hr.employee",
      [["random_code_for_reg", "=", random_code_for_reg]],
      ["id"]
    );
    
    console.log("🔎 Employee search result:", employee);
    
    if (!employee.length) {
      return res.status(200).json({ 
        success: false,
        status: "error", 
        errorMessage: `No employee found for code: ${random_code_for_reg}`,
        successMessage: "",
        statuscode: 404,
      });
    }
    
    const employeeId = employee[0].id;
    console.log("✅ Employee ID found:", employeeId);
    
    const updateValues = {
      device_platform,
      device_unique_id,
      device_id,
      device_name,
      ip_address,
      system_version,
      random_code_for_reg,
    };
    
    Object.keys(updateValues).forEach(
      (key) => updateValues[key] === undefined && delete updateValues[key]
    );
    
    console.log("📝 Updating in Odoo…");
    await odooService.write("hr.employee", [employeeId], updateValues);
    console.log("✔ Write Success. Fetching updated employee...");
    
    const updatedEmployee = await odooService.searchRead(
      "hr.employee",
      [["id", "=", employeeId]],
      ["private_email", "latitude", "longitude", "work_phone", "employee_code"]
    );
    
    console.log("📤 Final Response Data:", updatedEmployee[0]);
    
    return res.status(200).json({
      success: true,
      status: "success", 
      errorMessage: "",
      successMessage: "Employee code verification completed successfully",
      statuscode: 200,
      data: updatedEmployee[0],
    });
    
  } catch (error) {
    console.error("🔥 Error updating employee device:", error);
    return res.status(500).json({ 
      success: false,
      status: "error",  
      errorMessage: error.message || "Server Error",
      successMessage: "",
      statuscode: 500,
    });
  }
};


