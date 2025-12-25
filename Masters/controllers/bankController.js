const odooService = require("../services/odoo.service");
const { getClientFromRequest } = require("../services/plan.helper");
class BankController {
  async createBank(req, res) {
    try {
      const { name, bic, swift_code, micr_code, phone, street, email } =
        req.body;
      if (!name || name.trim() === "") {
        return res.status(400).json({
          status: "error",
          message: "Bank name is required",
        });
      }
      const { client_id } = await getClientFromRequest(req);
      const existing = await odooService.searchRead(
        "res.bank",
        [
          ["name", "=", name.trim()],
          ["client_id", "=", client_id],
        ],
        ["id"],
        1
      );

      if (existing.length) {
        return res.status(409).json({
          status: "error",
          message: `Bank with name '${name}' already exists for this client`,
        });
      }
      const data = {
        name: name.trim(),
        bic: bic || "",
        swift_code: swift_code || "",
        micr_code: micr_code || "",
        phone: phone || "",
        street: street || "",
        client_id,
        email,
      };
      const id = await odooService.create("res.bank", data);
      return res.status(201).json({
        status: "success",
        message: "Bank created successfully",
        bank: { id, ...data },
      });
    } catch (error) {
      console.error("Create Bank Error:", error);
      return res.status(error.status || 500).json({
        status: "error",
        message: error.message || "Failed to create bank",
      });
    }
  }

  async getAllBanks(req, res) {
    try {
      const { client_id } = await getClientFromRequest(req);
      const banks = await odooService.searchRead(
        "res.bank",
        [["client_id", "=", client_id]],
        [
          "id",
          "name",
          "bic",
          "swift_code",
          "micr_code",
          "phone",
          "email",
          "street",
        ]
      );

      return res.status(200).json({
        status: "success",
        banks,
      });
    } catch (error) {
      console.error("Get Banks Error:", error);

      return res.status(error.status || 500).json({
        status: "error",
        message: error.message || "Failed to fetch banks",
      });
    }
  }

  async updateBank(req, res) {
    try {
      const { id } = req.params;
      const { name, bic, swift_code, micr_code, phone, street } = req.body;
      const { client_id } = await getClientFromRequest(req);
      if (!name || name.trim() === "") {
        return res.status(400).json({
          status: "error",
          message: "Bank name is required",
        });
      }
      const existingBank = await odooService.searchRead(
        "res.bank",
        [
          ["id", "=", parseInt(id)],
          ["client_id", "=", client_id],
        ],
        ["id"]
      );

      if (!existingBank.length) {
        return res.status(404).json({
          status: "error",
          message: "Bank not found or does not belong to your client",
        });
      }
      const duplicate = await odooService.searchRead(
        "res.bank",
        [
          ["name", "=", name.trim()],
          ["client_id", "=", client_id],
          ["id", "!=", parseInt(id)],
        ],
        ["id"],
        1
      );

      if (duplicate.length) {
        return res.status(409).json({
          status: "error",
          message: `Bank with name '${name}' already exists for this client`,
        });
      }
      const data = {
        name: name.trim(),
        bic: bic || "",
        swift_code: swift_code || "",
        micr_code: micr_code || "",
        phone: phone || "",
        street: street || "",
      };

      await odooService.write("res.bank", [parseInt(id)], data);

      return res.status(200).json({
        status: "success",
        message: "Bank updated successfully",
      });
    } catch (error) {
      console.error("Update Bank Error:", error);
      return res.status(error.status || 500).json({
        status: "error",
        message: error.message || "Failed to update bank",
      });
    }
  }

  async deleteBank(req, res) {
    try {
      const { id } = req.params;
      const { client_id } = await getClientFromRequest(req);
      const existingBank = await odooService.searchRead(
        "res.bank",
        [
          ["id", "=", parseInt(id)],
          ["client_id", "=", client_id],
        ],
        ["id"]
      );
      if (!existingBank.length) {
        return res.status(404).json({
          status: "error",
          message: "Bank not found or does not belong to your client",
        });
      }
      await odooService.unlink("res.bank", [parseInt(id)]);
      return res.status(200).json({
        status: "success",
        message: "Bank deleted successfully",
      });
    } catch (error) {
      console.error("Delete Bank Error:", error);
      return res.status(error.status || 500).json({
        status: "error",
        message: error.message || "Failed to delete bank",
      });
    }
  }


async createBankAccount(req, res) {
  try {
    const {
      bank_name,
      partner_name,
      acc_number,
      bank_swift_code,
      bank_iafc_code,
      currency,
    } = req.body;

    // ❌ Required validation
    if (!partner_name || !acc_number) {
      return res.status(400).json({
        status: "error",
        message: "partner_name and acc_number are required",
      });
    }

    // 🔑 CLIENT CHECK
    const { client_id } = await getClientFromRequest(req);

    // 🔎 CHECK IF ACCOUNT NUMBER ALREADY EXISTS
    const existingAccounts = await odooService.searchRead(
      "res.partner.bank",
      [["acc_number", "=", acc_number.trim()]],
      ["id"],
      1
    );

    if (existingAccounts.length) {
      return res.status(400).json({
        status: "error",
        message: `Bank account with number '${acc_number}' already exists`,
      });
    }

    // 🔎 LOOKUP BANK BY NAME + CLIENT
    let bank_id = false;
    if (bank_name) {
      const bankRecords = await odooService.searchRead(
        "res.bank",
        [
          ["name", "=", bank_name.trim()],
          ["client_id", "=", client_id],
        ],
        ["id"],
        1
      );

      if (!bankRecords.length) {
        return res.status(404).json({
          status: "error",
          message: `Bank '${bank_name}' not found for your client`,
        });
      }

      bank_id = bankRecords[0].id;
    }

    // 🔎 LOOKUP PARTNER BY NAME
    const partnerRecords = await odooService.searchRead(
      "res.partner",
      [["name", "=", partner_name.trim()]],
      ["id"],
      1
    );

    if (!partnerRecords.length) {
      return res.status(404).json({
        status: "error",
        message: `Partner '${partner_name}' not found`,
      });
    }

    const partner_id = partnerRecords[0].id;

    // 🔎 VALIDATE CURRENCY
    let currency_id = false;
    if (currency) {
      const allowedCurrencies = ["USD", "INR"];
      if (!allowedCurrencies.includes(currency.toUpperCase())) {
        return res.status(400).json({
          status: "error",
          message: `Currency must be one of: ${allowedCurrencies.join(", ")}`,
        });
      }

      const currencyRecords = await odooService.searchRead(
        "res.currency",
        [["name", "=", currency.toUpperCase()]],
        ["id"],
        1
      );

      if (!currencyRecords.length) {
        return res.status(404).json({
          status: "error",
          message: `Currency '${currency}' not found`,
        });
      }

      currency_id = currencyRecords[0].id;
    }

    // ✅ CREATE BANK ACCOUNT
    const data = {
      bank_id: bank_id || false, // optional
      partner_id,
      acc_number,
      bank_swift_code: bank_swift_code || "",
      bank_iafc_code: bank_iafc_code || "",
      currency_id: currency_id || false,
      client_id, // required client linkage
      allow_out_payment: true, // always true
    };

    const id = await odooService.create("res.partner.bank", data);

    return res.status(201).json({
      status: "success",
      message: "Bank account created successfully",
      bank_account: { id, ...data },
    });
  } catch (error) {
    console.error("Create Bank Account Error:", error);
    return res.status(error.status || 500).json({
      status: "error",
      message: error.message || "Failed to create bank account",
    });
  }
}



async getAllBankAccounts(req, res) {
  try {
    // 🔑 Get client ID from request
    const { client_id } = await getClientFromRequest(req);

    // 🔎 Fetch bank accounts for this client
    const bankAccounts = await odooService.searchRead(
      "res.partner.bank",
      [["client_id", "=", client_id]],
      [
        "id",
        "partner_id",
        "acc_number",
        "bank_id",
        "bank_swift_code",
        "bank_iafc_code",
        "currency_id",
        "allow_out_payment",
      ]
    );

    return res.status(200).json({
      status: "success",
      bank_accounts: bankAccounts,
    });
  } catch (error) {
    console.error("Get Bank Accounts Error:", error);

    return res.status(error.status || 500).json({
      status: "error",
      message: error.message || "Failed to fetch bank accounts",
    });
  }
}




async updateBankAccount(req, res) {
  try {
    const { id } = req.params; // bank account ID
    const {
      bank_name,
      partner_name,
      acc_number,
      bank_swift_code,
      bank_iafc_code,
      currency,
      allow_out_payment,
    } = req.body;

    const { client_id } = await getClientFromRequest(req);

    if (!id) {
      return res.status(400).json({
        status: "error",
        message: "Bank account ID is required",
      });
    }

    // 🔎 Check if the bank account exists for this client
    const existingBankAccount = await odooService.searchRead(
      "res.partner.bank",
      [["id", "=", parseInt(id)], ["client_id", "=", client_id]],
      ["id", "acc_number"]
    );

    if (!existingBankAccount.length) {
      return res.status(404).json({
        status: "error",
        message: "Bank account not found or does not belong to your client",
      });
    }

    // 🔎 Check for duplicate account number
    if (acc_number) {
      const duplicate = await odooService.searchRead(
        "res.partner.bank",
        [
          ["acc_number", "=", acc_number.trim()],
          ["client_id", "=", client_id],
          ["id", "!=", parseInt(id)],
        ],
        ["id"],
        1
      );

      if (duplicate.length) {
        return res.status(409).json({
          status: "error",
          message: `Bank account with number '${acc_number}' already exists`,
        });
      }
    }

    // 🔎 Resolve bank_id if bank_name is provided
    let bank_id = false;
    if (bank_name) {
      const bankRecords = await odooService.searchRead(
        "res.bank",
        [["name", "=", bank_name.trim()], ["client_id", "=", client_id]],
        ["id"],
        1
      );

      if (!bankRecords.length) {
        return res.status(404).json({
          status: "error",
          message: `Bank '${bank_name}' not found for your client`,
        });
      }
      bank_id = bankRecords[0].id;
    }

    // 🔎 Resolve partner_id if partner_name is provided
    let partner_id = false;
    if (partner_name) {
      const partnerRecords = await odooService.searchRead(
        "res.partner",
        [["name", "=", partner_name.trim()]],
        ["id"],
        1
      );

      if (!partnerRecords.length) {
        return res.status(404).json({
          status: "error",
          message: `Partner '${partner_name}' not found`,
        });
      }
      partner_id = partnerRecords[0].id;
    }

    // 🔎 Resolve currency_id if provided
    let currency_id = false;
    if (currency) {
      const allowedCurrencies = ["USD", "INR"];
      if (!allowedCurrencies.includes(currency.toUpperCase())) {
        return res.status(400).json({
          status: "error",
          message: `Currency must be one of: ${allowedCurrencies.join(", ")}`,
        });
      }

      const currencyRecords = await odooService.searchRead(
        "res.currency",
        [["name", "=", currency.toUpperCase()]],
        ["id"],
        1
      );

      if (!currencyRecords.length) {
        return res.status(404).json({
          status: "error",
          message: `Currency '${currency}' not found`,
        });
      }
      currency_id = currencyRecords[0].id;
    }

    // ✅ Prepare data object for update
    const data = {
      ...(bank_id && { bank_id }),
      ...(partner_id && { partner_id }),
      ...(acc_number && { acc_number: acc_number.trim() }),
      ...(bank_swift_code && { bank_swift_code }),
      ...(bank_iafc_code && { bank_iafc_code }),
      ...(currency_id && { currency_id }),
      ...(allow_out_payment !== undefined && { allow_out_payment: !!allow_out_payment }),
    };

    // 🔑 Perform update
    await odooService.write("res.partner.bank", [parseInt(id)], data);

    return res.status(200).json({
      status: "success",
      message: "Bank account updated successfully",
      updated_fields: data,
    });
  } catch (error) {
    console.error("Update Bank Account Error:", error);
    return res.status(error.status || 500).json({
      status: "error",
      message: error.message || "Failed to update bank account",
    });
  }
}

async deleteBankAccount(req, res) {
  try {
    const { id } = req.params; // bank account ID
    const { client_id } = await getClientFromRequest(req);

    // 🔎 Check if the bank account exists for this client
    const existingBankAccount = await odooService.searchRead(
      "res.partner.bank",
      [["id", "=", parseInt(id)], ["client_id", "=", client_id]],
      ["id"]
    );

    if (!existingBankAccount.length) {
      return res.status(404).json({
        status: "error",
        message: "Bank account not found or does not belong to your client",
      });
    }

    // 🔑 Delete the bank account
    await odooService.unlink("res.partner.bank", [parseInt(id)]);

    return res.status(200).json({
      status: "success",
      message: "Bank account deleted successfully",
    });
  } catch (error) {
    console.error("Delete Bank Account Error:", error);
    return res.status(error.status || 500).json({
      status: "error",
      message: error.message || "Failed to delete bank account",
    });
  }
}


}

module.exports = new BankController();
