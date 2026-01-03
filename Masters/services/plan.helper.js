const odooService = require("./odoo.service");
const checkActivePlan = async (partnerId) => {
  if (!partnerId) {
    throw new Error("Partner ID is required");
  }

  const plan = await odooService.searchRead(
    "client.plan.details",
    [
      ["partner_id", "=", partnerId],
      ["is_expier", "=", true],
    ],
    ["id", "product_id", "start_date", "end_date"],
    1
  );

  if (!plan || plan.length === 0) {
    return null;
  }

  return plan[0];
};

const getClientFromRequest = async (req) => {
  const user_id = req.body?.user_id || req.query?.user_id;
  const unique_user_id = req.body?.unique_user_id || req.query?.unique_user_id;

  if (!user_id && !unique_user_id) {
    throw {
      status: 400,
      message: "Either user_id or unique_user_id is required",
    };
  }

  const searchDomain = user_id
    ? [["id", "=", parseInt(user_id)]]
    : [["unique_user_id", "=", unique_user_id]];

  const user = await odooService.searchRead(
    "res.users",
    searchDomain,
    [
      "partner_id",
      "is_client_employee_admin",
      "is_client_employee_user",
      "id",
    ],
    1
  );

  if (!user.length) {
    throw {
      status: 404,
      message: "User not found",
    };
  }

  const currentUser = user[0];
  let client_id = null;

  if (currentUser.is_client_employee_admin) {
    if (!currentUser.partner_id || !currentUser.partner_id[0]) {
      throw {
        status: 404,
        message: "Partner not linked for admin user",
      };
    }
    client_id = currentUser.partner_id[0];
  } else if (currentUser.is_client_employee_user) {
    const employee = await odooService.searchRead(
      "hr.employee",
      [["user_id", "=", currentUser.id]],
      ["address_id"],
      1
    );
    if (!employee || employee.length === 0 || !employee[0].address_id) {
      throw {
        status: 404,
        message: "Employee record not found or missing address_id",
      };
    }
    client_id = employee[0].address_id[0];
  } else {
    throw {
      status: 403,
      message: "User is neither admin nor employee",
    };
  }
  const plan = await checkActivePlan(client_id);
  if (!plan) {
    throw {
      status: 403,
      message: "Your plan has expired. Please renew your subscription.",
    };
  }

  return { client_id, plan, currentUser };
};
module.exports = { checkActivePlan, getClientFromRequest };

