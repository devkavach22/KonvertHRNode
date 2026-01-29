const odooService = require("./odoo.service");
// const checkActivePlan = async (partnerId) => {
//   if (!partnerId) {
//     throw new Error("Partner ID is required");
//   }

//   const plan = await odooService.searchRead(
//     "client.plan.details",
//     [
//       ["partner_id", "=", partnerId],
//       ["is_expier", "=", true],
//     ],
//     ["id", "product_id", "start_date", "end_date"],
//     1
//   );

//   if (!plan || plan.length === 0) {
//     return null;
//   }

//   return plan[0];
// };

// const getClientFromRequest = async (req) => {
//   const user_id = req.body?.user_id || req.query?.user_id;
//   const unique_user_id = req.body?.unique_user_id || req.query?.unique_user_id;

//   if (!user_id && !unique_user_id) {
//     throw {
//       status: 400,
//       message: "Either user_id or unique_user_id is required",
//     };
//   }

//   const searchDomain = user_id
//     ? [["id", "=", parseInt(user_id)]]
//     : [["unique_user_id", "=", unique_user_id]];

//   const user = await odooService.searchRead(
//     "res.users",
//     searchDomain,
//     [
//       "partner_id",
//       "is_client_employee_admin",
//       "is_client_employee_user",
//       "id",
//     ],
//     1
//   );

//   if (!user.length) {
//     throw {
//       status: 404,
//       message: "User not found",
//     };
//   }

//   const currentUser = user[0];
//   let client_id = null;

//   if (currentUser.is_client_employee_admin) {
//     if (!currentUser.partner_id || !currentUser.partner_id[0]) {
//       throw {
//         status: 404,
//         message: "Partner not linked for admin user",
//       };
//     }
//     client_id = currentUser.partner_id[0];
//   } else if (currentUser.is_client_employee_user) {
//     const employee = await odooService.searchRead(
//       "hr.employee",
//       [["user_id", "=", currentUser.id]],
//       ["address_id"],
//       1
//     );
//     if (!employee || employee.length === 0 || !employee[0].address_id) {
//       throw {
//         status: 404,
//         message: "Employee record not found or missing address_id",
//       };
//     }
//     client_id = employee[0].address_id[0];
//   } else {
//     throw {
//       status: 403,
//       message: "User is neither admin nor employee",
//     };
//   }
//   const plan = await checkActivePlan(client_id);
//   if (!plan) {
//     throw {
//       status: 403,
//       message: "Your plan has expired. Please renew your subscription.",
//     };
//   }

//   return { client_id, plan, currentUser };
// };
// module.exports = { checkActivePlan, getClientFromRequest };


// helpers/odooHelper.js or utils/odooHelper.js


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

/**
 * Fetch records from Odoo with client filtering
 * @param {string} model - Odoo model name (e.g., 'reg.categories')
 * @param {number} client_id - Client ID for filtering
 * @param {Array} fields - Fields to retrieve
 * @param {Array} additionalFilters - Additional domain filters (optional)
 * @param {number} offset - Offset for pagination (default: 0)
 * @param {number} limit - Limit for pagination (default: 0 - no limit)
 * @param {string} order - Order by clause (default: 'id desc')
 * @returns {Promise<Array>} - Array of records
 */
const fetchOdooRecords = async (
  model,
  client_id,
  fields = [],
  additionalFilters = [],
  offset = 0,
  limit = 0,
  order = "id desc"
) => {
  const domain = [["client_id", "=", client_id], ...additionalFilters];

  return await odooService.searchRead(
    model,
    domain,
    fields,
    offset,
    limit,
    order
  );
};

module.exports = {
  checkActivePlan,
  getClientFromRequest,
  fetchOdooRecords,
};